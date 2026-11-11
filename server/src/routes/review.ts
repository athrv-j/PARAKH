import { Router, Request, Response } from 'express';
import { VaultDb } from '../db/vaultDb.js';
import { runDeterministicChecks } from '../review/checks/index.js';
import { GroqReviewClient } from '../review/llm/client.js';
import { enforceCitationGate } from '../review/citation/citationGate.js';
import { IntentLockEngine } from '../review/fix.js';
import { DraftWorkflowService } from '../workflow/draftWorkflow.js';
import { BrandCaseLawService } from '../precedent/caseLaw.js';
import { FactRippleEngine } from '../facts/factRipple.js';
import { GuidelineDebuggerService } from '../debugger/guidelineDebugger.js';
import { seedAgencyData } from '../scripts/seedAgency.js';
import { authenticateUser, requireClientVault, requireRole } from '../auth/authMiddleware.js';
import { canTransitionStatus } from '../auth/roles.js';
import { heavyRateLimiter } from '../middleware/rateLimiter.js';
import {
  validateBody,
  validateParams,
  ClientIdParamSchema,
  CreateDraftSchema,
  AcceptRewriteSchema,
  FactRippleSchema,
  ResolveFindingSchema,
  QuickCapturePrecedentSchema,
  TransitionStatusSchema
} from '../validation/schemas.js';

const router = Router();
const vault = new VaultDb();
const groqClient = new GroqReviewClient();
const intentLock = new IntentLockEngine();
const workflow = new DraftWorkflowService(vault);
const caseLaw = new BrandCaseLawService(vault);
const ripple = new FactRippleEngine(vault);
const debuggerService = new GuidelineDebuggerService(vault);

// Seed showcase data (Restricted to Manager role)
router.post('/seed-showcase', authenticateUser, requireRole(['manager']), (_req: Request, res: Response) => {
  try {
    const db = (vault as any).db;
    const result = seedAgencyData(db);
    res.json({
      success: true,
      message: 'Seeded 3 Indian brand vaults with clauses, facts, terms, and benchmark campaigns',
      clientsCount: result.clients.length,
      cleanDraftsCount: result.cleanDrafts.length,
      groundTruthDraftsCount: result.groundTruth.length
    });
  } catch (error: any) {
    res.status(500).json({ error: 'InternalError', message: 'Failed to seed showcase data.' });
  }
});

// List drafts for a client vault (Enforces strict client vault isolation)
router.get(
  '/clients/:id/drafts',
  authenticateUser,
  validateParams(ClientIdParamSchema),
  requireClientVault,
  (req: Request, res: Response) => {
    try {
      const clientId = req.params.id as string;
      const db = (vault as any).db;
      const rawDrafts = db.prepare(`
        SELECT d.*, dv.id as version_id, dv.version_num, dv.text_content
        FROM drafts d
        LEFT JOIN draft_versions dv ON d.id = dv.draft_id
        WHERE d.client_id = ?
        ORDER BY d.created_at DESC
      `).all(clientId) as any[];

      const fullDrafts = rawDrafts.map((d: any) => {
        let findings = d.version_id ? vault.getFindingsByVersion(clientId, d.version_id) : [];

        // If findings are not yet generated for this version, run deterministic checks on the fly
        if (findings.length === 0 && d.text_content && d.version_id) {
          const generated = runDeterministicChecks(clientId, d.text_content, vault);
          const intent = intentLock.extractIntent(d.text_content, d.channel || 'social');

          generated.forEach(f => {
            const fix = intentLock.generateFix(d.text_content, f, intent);
            const fId = `find_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
            vault.insertFinding(clientId, {
              id: fId,
              version_id: d.version_id,
              type: f.type,
              severity: f.severity,
              span_start: f.span_start,
              span_end: f.span_end,
              span_text: f.span_text,
              source_type: f.source_type,
              source_id: f.source_id,
              source_text: f.source_text,
              model_name: f.model_name,
              explanation: f.explanation,
              suggested_fix: fix.suggested_rewrite,
              status: 'pending'
            });
          });

          findings = vault.getFindingsByVersion(clientId, d.version_id);
        }

        const formattedFindings = findings.map((f: any) => ({
          ...f,
          word_diff: f.suggested_fix ? [
            { value: f.span_text, removed: true },
            { value: f.suggested_fix, added: true }
          ] : []
        }));

        return {
          ...d,
          findings: formattedFindings
        };
      });

      res.json({ drafts: fullDrafts });
    } catch (error: any) {
      res.status(500).json({ error: 'DatabaseError', message: 'Failed to retrieve drafts.' });
    }
  }
);

// Create and dynamically review a new draft (Creators, Reviewers, Managers)
router.post(
  '/clients/:id/drafts',
  heavyRateLimiter.middleware(),
  authenticateUser,
  validateParams(ClientIdParamSchema),
  requireRole(['creator', 'reviewer', 'manager']),
  requireClientVault,
  validateBody(CreateDraftSchema),
  async (req: Request, res: Response) => {
    try {
      const clientId = req.params.id as string;
      const { title, channel, text } = req.body;
      const author = req.user?.name || req.user?.email || 'Creator';

      // 1. Create Draft record in SQLite / DB
      const { draftId, versionId } = workflow.createDraft(clientId, {
        title,
        channel: channel || 'social',
        author,
        initialText: text
      });

      // 2. Fetch Client Guidelines & Facts strictly from authenticated client vault
      const clauses = vault.getClauses(clientId, true);
      const facts = vault.getFacts(clientId);

      // 3. Run Deterministic Checks (Always succeeds)
      const deterministicFindings = runDeterministicChecks(clientId, text, vault);

      // 4. Run LLM Checks with Cache, Prompt-Injection Defense, & Graceful Degradation
      let rawAiFindings: any[] = [];
      let aiStatus: 'available' | 'unavailable' | 'cached' = 'available';
      let aiNotice: string | null = null;
      let fromCache = false;

      try {
        const aiResponse = await groqClient.checkToneAndMessaging(text, clauses, facts, clientId);
        rawAiFindings = aiResponse;
        if (aiResponse.fromCache) {
          aiStatus = 'cached';
          fromCache = true;
          aiNotice = `AI tone review retrieved from cache (analyzed ${aiResponse.cachedAt ? new Date(aiResponse.cachedAt).toLocaleTimeString() : 'recently'}).`;
        }
      } catch (err: any) {
        console.warn('⚠️  LLM call failed or hit rate limits, degrading gracefully to deterministic checks:', err.message);
        aiStatus = 'unavailable';
        aiNotice = 'AI checks unavailable due to rate limits or network issues. Deterministic checks completed.';
        rawAiFindings = [];
      }

      // Enforce Citation Gate on any AI findings
      const gateResult = enforceCitationGate(clientId, text, rawAiFindings, clauses, facts, vault);

      // 5. Combine and apply Intent Lock fixes
      const combinedFindings = [...deterministicFindings, ...gateResult.verifiedFindings];
      const intent = intentLock.extractIntent(text, channel || 'social');

      const processedFindings = combinedFindings.map(f => {
        const fix = intentLock.generateFix(text, f, intent);
        const findingId = `find_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const isFindingFromCache = fromCache || (f as any).from_cache || false;

        // Layered Precedent Retrieval: find applicable precedents for this finding
        const applicablePrecedents = f.source_id
          ? caseLaw.findApplicablePrecedents(clientId, f.source_id, f.span_text, {
              channel: channel || 'social'
            })
          : [];
        const matchedPrecedent = applicablePrecedents.length > 0 ? applicablePrecedents[0] : null;

        // Save to findings table
        vault.insertFinding(clientId, {
          id: findingId,
          version_id: versionId,
          type: f.type,
          severity: f.severity,
          span_start: f.span_start,
          span_end: f.span_end,
          span_text: f.span_text,
          source_type: f.source_type,
          source_id: f.source_id,
          source_text: f.source_text,
          model_name: f.model_name,
          explanation: f.explanation,
          suggested_fix: fix.suggested_rewrite,
          status: 'pending'
        });

        return {
          ...f,
          id: findingId,
          suggested_fix: fix.suggested_rewrite,
          word_diff: fix.word_diff,
          intent_verified: fix.intent_verified,
          from_cache: isFindingFromCache,
          precedent: matchedPrecedent,
          applicable_precedents: applicablePrecedents,
          status: 'pending' as const
        };
      });

      res.status(201).json({
        success: true,
        ai_status: aiStatus,
        ai_notice: aiNotice,
        from_cache: fromCache,
        draft: {
          id: draftId,
          version_id: versionId,
          title,
          channel: channel || 'social',
          text,
          ai_status: aiStatus,
          ai_notice: aiNotice,
          from_cache: fromCache,
          findings: processedFindings
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: 'ReviewFailed', message: 'Failed to process and review draft content.' });
    }
  }
);

// Get Guideline Debugger Ambiguity Report (Vault-scoped)
router.get(
  '/clients/:id/debugger',
  authenticateUser,
  validateParams(ClientIdParamSchema),
  requireClientVault,
  (req: Request, res: Response) => {
    try {
      const clientId = req.params.id as string;
      const reports = debuggerService.analyzeClauseAmbiguity(clientId);
      res.json({ reports });
    } catch (error: any) {
      res.status(500).json({ error: 'DebuggerError', message: 'Failed to generate guideline ambiguity report.' });
    }
  }
);

// Accept Guideline Rewrite (Restricted to Manager role)
router.post(
  '/clients/:id/debugger/accept',
  authenticateUser,
  validateParams(ClientIdParamSchema),
  requireRole(['manager']),
  requireClientVault,
  validateBody(AcceptRewriteSchema),
  (req: Request, res: Response) => {
    try {
      const clientId = req.params.id as string;
      const { clauseId, newText } = req.body;
      const acceptedBy = req.user?.name || req.user?.email || 'Brand Manager';

      const updated = debuggerService.acceptRewrite(clientId, clauseId, newText, acceptedBy);
      res.json({ success: true, clause: updated });
    } catch (error: any) {
      console.error('Error in /debugger/accept:', error);
      res.status(500).json({ error: 'RewriteError', message: error.message || 'Failed to accept and apply clause rewrite.' });
    }
  }
);

// Impact Replay: Preview how a proposed rewrite would affect stored drafts (read-only)
router.post(
  '/clients/:id/debugger/replay-impact',
  authenticateUser,
  validateParams(ClientIdParamSchema),
  requireClientVault,
  (req: Request, res: Response) => {
    try {
      const clientId = req.params.id as string;
      const { clauseId, proposedText } = req.body;

      if (!clauseId || !proposedText) {
        res.status(400).json({ error: 'ValidationError', message: 'clauseId and proposedText are required.' });
        return;
      }

      const result = debuggerService.replayClauseImpact(clientId, clauseId, proposedText);
      res.json({ success: true, impact: result });
    } catch (error: any) {
      console.error('Error in /debugger/replay-impact:', error);
      res.status(500).json({ error: 'ReplayError', message: error.message || 'Failed to run impact replay.' });
    }
  }
);

// Clause Version History: Get all versions (active + retired) for a clause
router.get(
  '/clients/:id/clauses/:clauseId/versions',
  authenticateUser,
  validateParams(ClientIdParamSchema),
  requireClientVault,
  (req: Request, res: Response) => {
    try {
      const clientId = req.params.id as string;
      const clauseId = req.params.clauseId as string;
      const history = debuggerService.getClauseVersionHistory(clientId, clauseId);
      res.json(history);
    } catch (error: any) {
      res.status(500).json({ error: 'VersionHistoryError', message: 'Failed to retrieve clause version history.' });
    }
  }
);

// Get Fact Ripple Graph
router.get(
  '/clients/:id/facts/graph',
  authenticateUser,
  validateParams(ClientIdParamSchema),
  requireClientVault,
  (req: Request, res: Response) => {
    try {
      const clientId = req.params.id as string;
      const facts = vault.getFacts(clientId);
      res.json({ facts });
    } catch (error: any) {
      res.status(500).json({ error: 'DatabaseError', message: 'Failed to retrieve facts graph.' });
    }
  }
);

// Propagate Fact Ripple (Reviewers and Managers)
router.post(
  '/clients/:id/facts/ripple',
  authenticateUser,
  validateParams(ClientIdParamSchema),
  requireRole(['reviewer', 'manager']),
  requireClientVault,
  validateBody(FactRippleSchema),
  (req: Request, res: Response) => {
    try {
      const clientId = req.params.id as string;
      const { factId, value, valid_until, dryRun } = req.body;
      const result = ripple.propagateFactChange(clientId, factId, { value, valid_until }, Boolean(dryRun));
      res.json({ success: true, result });
    } catch (error: any) {
      res.status(500).json({ error: 'RippleError', message: 'Failed to propagate fact change ripple.' });
    }
  }
);

// Brand Case Law: Get precedents for a client or clause with layered filtering
router.get(
  '/clients/:id/precedents',
  authenticateUser,
  validateParams(ClientIdParamSchema),
  requireClientVault,
  (req: Request, res: Response) => {
    try {
      const clientId = req.params.id as string;
      const clauseId = req.query.clause_id as string | undefined;
      const snippet = req.query.snippet as string | undefined;
      const channel = req.query.channel as string | undefined;

      if (clauseId && snippet) {
        const matches = caseLaw.findApplicablePrecedents(clientId, clauseId, snippet, {
          channel,
          includeExpired: req.query.include_expired === 'true'
        });
        res.json({ precedents: matches });
      } else {
        const precedents = vault.getPrecedents(clientId, clauseId);
        res.json({ precedents });
      }
    } catch (error: any) {
      res.status(500).json({ error: 'PrecedentError', message: 'Failed to retrieve precedents.' });
    }
  }
);

// Brand Case Law: Get conflicting precedents across clauses
router.get(
  '/clients/:id/precedents/conflicts',
  authenticateUser,
  validateParams(ClientIdParamSchema),
  requireClientVault,
  (req: Request, res: Response) => {
    try {
      const clientId = req.params.id as string;
      const conflicts = caseLaw.detectConflictingPrecedents(clientId);
      res.json({ conflicts });
    } catch (error: any) {
      res.status(500).json({ error: 'PrecedentConflictError', message: 'Failed to retrieve conflicting precedents.' });
    }
  }
);

// Workflow: Resolve a finding (Reviewers and Managers only)
router.post(
  '/clients/:id/findings/:findingId/resolve',
  authenticateUser,
  requireRole(['reviewer', 'manager']),
  requireClientVault,
  validateBody(ResolveFindingSchema),
  (req: Request, res: Response) => {
    try {
      const clientId = req.params.id as string;
      const findingId = req.params.findingId as string;
      const { decision, reason, scope, expiry } = req.body;

      // Identity & role are strictly extracted from verified req.user session
      const decidedBy = req.user?.name || req.user?.email || 'Brand Reviewer';
      const userRole = req.user!.role;

      const result = workflow.resolveFinding(clientId, {
        findingId,
        decision,
        reason,
        scope,
        expiry,
        decidedBy,
        userRole
      });

      res.json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ error: 'ResolveError', message: 'Failed to resolve finding.' });
    }
  }
);

// Brand Case Law: Quick Capture for verbal approvals (Reviewers and Managers)
router.post(
  '/clients/:id/precedents/quick-capture',
  authenticateUser,
  requireRole(['reviewer', 'manager']),
  requireClientVault,
  validateBody(QuickCapturePrecedentSchema),
  (req: Request, res: Response) => {
    try {
      const clientId = req.params.id as string;
      const { clauseId, reason, scope, expiry } = req.body;
      const decidedBy = req.user?.name || req.user?.email || 'Account Manager';

      const precedentId = `prec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      vault.insertPrecedent(clientId, {
        id: precedentId,
        clause_id: clauseId || 'GENERAL_CLAUSE',
        finding_id: 'quick_capture',
        decision: 'exception_requested',
        reason,
        scope: scope || 'this_campaign',
        expiry: expiry || null,
        decided_by: decidedBy
      });

      vault.logAudit(clientId, decidedBy, 'quick_capture_precedent', precedentId, {
        clauseId,
        reason,
        scope
      });

      res.status(201).json({ success: true, precedentId });
    } catch (error: any) {
      res.status(500).json({ error: 'PrecedentCaptureError', message: 'Failed to quick-capture precedent.' });
    }
  }
);

// Workflow: Update draft status
router.post(
  '/clients/:id/drafts/:draftId/status',
  authenticateUser,
  requireClientVault,
  validateBody(TransitionStatusSchema),
  (req: Request, res: Response) => {
    try {
      const clientId = req.params.id as string;
      const draftId = req.params.draftId as string;
      const { status } = req.body;

      const userRole = req.user!.role;
      const actorName = req.user?.name || req.user?.email || 'Brand Reviewer';

      // Enforce role-based state machine
      if (!canTransitionStatus(userRole, status)) {
        res.status(403).json({
          error: 'ForbiddenStatusTransition',
          message: `User with role '${userRole}' cannot transition draft to '${status}'. Approvals require 'reviewer' or 'manager' role.`
        });
        return;
      }

      workflow.transitionStatus(clientId, draftId, status, userRole, actorName);
      res.json({ success: true, status });
    } catch (error: any) {
      res.status(400).json({ error: 'StatusTransitionError', message: error.message || 'Invalid state transition.' });
    }
  }
);

export default router;
