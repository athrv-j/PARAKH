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

const router = Router();
const vault = new VaultDb();
const groqClient = new GroqReviewClient();
const intentLock = new IntentLockEngine();
const workflow = new DraftWorkflowService(vault);
const caseLaw = new BrandCaseLawService(vault);
const ripple = new FactRippleEngine(vault);
const debuggerService = new GuidelineDebuggerService(vault);

// List drafts for a client vault
router.get('/clients/:id/drafts', (req: Request, res: Response) => {
  try {
    const clientId = req.params.id as string;
    const db = (vault as any).db;
    const drafts = db.prepare(`
      SELECT d.*, dv.id as version_id, dv.version_num, dv.text_content
      FROM drafts d
      LEFT JOIN draft_versions dv ON d.id = dv.draft_id
      WHERE d.client_id = ?
      ORDER BY d.created_at DESC
    `).all(clientId);

    res.json({ drafts });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create and dynamically review a new draft
router.post('/clients/:id/drafts', async (req: Request, res: Response) => {
  try {
    const clientId = req.params.id as string;
    const { title, channel, text, author } = req.body;

    if (!title || !text) {
      res.status(400).json({ error: 'Title and text content are required' });
      return;
    }

    // 1. Create Draft record in SQLite / DB
    const { draftId, versionId } = workflow.createDraft(clientId, {
      title,
      channel: channel || 'social',
      author: author || 'Creator',
      initialText: text
    });

    // 2. Fetch Client Guidelines, Terms & Facts
    const clauses = vault.getClauses(clientId, true);
    const facts = vault.getFacts(clientId);

    // 3. Run Deterministic Checks
    const deterministicFindings = runDeterministicChecks(clientId, text, vault);

    // 4. Run LLM Checks with Citation Gate
    const rawAiFindings = await groqClient.checkToneAndMessaging(text, clauses, facts);
    const gateResult = enforceCitationGate(clientId, text, rawAiFindings, clauses, facts, vault);

    // 5. Combine and apply Intent Lock fixes
    const combinedFindings = [...deterministicFindings, ...gateResult.verifiedFindings];
    const intent = intentLock.extractIntent(text, channel || 'social');

    const processedFindings = combinedFindings.map(f => {
      const fix = intentLock.generateFix(text, f, intent);
      const findingId = `find_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

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
        status: 'pending' as const
      };
    });

    res.status(201).json({
      success: true,
      draft: {
        id: draftId,
        version_id: versionId,
        title,
        channel: channel || 'social',
        text,
        findings: processedFindings
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get Guideline Debugger Ambiguity Report
router.get('/clients/:id/debugger', (req: Request, res: Response) => {
  try {
    const clientId = req.params.id as string;
    const reports = debuggerService.analyzeClauseAmbiguity(clientId);
    res.json({ reports });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Accept Guideline Rewrite
router.post('/clients/:id/debugger/accept', (req: Request, res: Response) => {
  try {
    const clientId = req.params.id as string;
    const { clauseId, newText, acceptedBy } = req.body;
    const updated = debuggerService.acceptRewrite(clientId, clauseId, newText, acceptedBy || 'Brand Manager');
    res.json({ success: true, clause: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get Fact Ripple Graph
router.get('/clients/:id/facts/graph', (req: Request, res: Response) => {
  try {
    const clientId = req.params.id as string;
    const facts = vault.getFacts(clientId);
    res.json({ facts });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Propagate Fact Ripple
router.post('/clients/:id/facts/ripple', (req: Request, res: Response) => {
  try {
    const clientId = req.params.id as string;
    const { factId, value, valid_until, dryRun } = req.body;
    const result = ripple.propagateFactChange(clientId, factId, { value, valid_until }, Boolean(dryRun));
    res.json({ success: true, result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
