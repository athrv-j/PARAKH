import { diffWords } from 'diff';
import { VaultDb, DraftRecord, FindingRecord } from '../db/vaultDb.js';
import { UserRole, DraftStatus, validateStatusTransition, validateFindingDecision, WorkflowPermissionError } from './roles.js';

export interface CreateDraftInput {
  title: string;
  channel: string;
  author: string;
  initialText: string;
}

export interface FindingDecisionInput {
  findingId: string;
  decision: 'accepted' | 'dismissed' | 'exception_requested';
  reason?: string;
  scope?: 'this_campaign' | 'all_content';
  expiry?: string;
  decidedBy: string;
  userRole: UserRole;
}

export class DraftWorkflowService {
  private vault: VaultDb;

  constructor(vault: VaultDb) {
    this.vault = vault;
  }

  /**
   * Creates a new draft and its initial Version 1.
   */
  createDraft(clientId: string, input: CreateDraftInput): { draftId: string; versionId: string } {
    const draftId = `draft_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const versionId = `ver_${draftId}_1`;

    this.vault.insertDraft(clientId, {
      id: draftId,
      title: input.title,
      channel: input.channel,
      status: 'draft',
      author: input.author
    });

    this.vault.insertDraftVersion(clientId, {
      id: versionId,
      draft_id: draftId,
      version_num: 1,
      text_content: input.initialText
    });

    this.vault.logAudit(clientId, input.author, 'create_draft', draftId, {
      title: input.title,
      channel: input.channel
    });

    return { draftId, versionId };
  }

  /**
   * Creates a new immutable revision for a draft with diff tracking.
   */
  createRevision(
    clientId: string,
    draftId: string,
    newText: string,
    author: string,
    role: UserRole
  ): { versionId: string; versionNum: number; diff: any[] } {
    if (role === 'client_viewer') {
      throw new WorkflowPermissionError('Client viewers cannot edit or revise drafts.');
    }

    const db = (this.vault as any).db;
    const draft = db.prepare('SELECT * FROM drafts WHERE client_id = ? AND id = ?').get(clientId, draftId) as DraftRecord | undefined;
    if (!draft) {
      throw new Error(`Draft ${draftId} not found in client vault.`);
    }

    // Get previous latest version
    const prevVersion = db
      .prepare('SELECT * FROM draft_versions WHERE client_id = ? AND draft_id = ? ORDER BY version_num DESC LIMIT 1')
      .get(clientId, draftId) as any;

    const nextVersionNum = prevVersion ? prevVersion.version_num + 1 : 1;
    const versionId = `ver_${draftId}_${nextVersionNum}`;

    this.vault.insertDraftVersion(clientId, {
      id: versionId,
      draft_id: draftId,
      version_num: nextVersionNum,
      text_content: newText
    });

    const diff = prevVersion ? diffWords(prevVersion.text_content, newText) : [];

    this.vault.logAudit(clientId, author, 'create_revision', versionId, {
      version_num: nextVersionNum,
      diff_tokens_count: diff.length
    });

    return { versionId, versionNum: nextVersionNum, diff };
  }

  /**
   * Transitions draft status with strict role check.
   */
  transitionStatus(
    clientId: string,
    draftId: string,
    targetStatus: DraftStatus,
    userRole: UserRole,
    actorName: string
  ): void {
    const db = (this.vault as any).db;
    const draft = db.prepare('SELECT * FROM drafts WHERE client_id = ? AND id = ?').get(clientId, draftId) as DraftRecord | undefined;
    if (!draft) {
      throw new Error(`Draft ${draftId} not found in client vault.`);
    }

    validateStatusTransition(userRole, draft.status, targetStatus);

    // If approving, verify that no unresolved (pending) findings exist on latest version
    if (targetStatus === 'approved') {
      const latestVersion = db
        .prepare('SELECT * FROM draft_versions WHERE client_id = ? AND draft_id = ? ORDER BY version_num DESC LIMIT 1')
        .get(clientId, draftId) as any;

      if (latestVersion) {
        const pendingFindings = db
          .prepare("SELECT COUNT(*) as count FROM findings WHERE client_id = ? AND version_id = ? AND status = 'pending'")
          .get(clientId, latestVersion.id) as { count: number };

        if (pendingFindings && pendingFindings.count > 0) {
          throw new WorkflowPermissionError(
            `Cannot approve draft: ${pendingFindings.count} pending compliance findings must be resolved first.`
          );
        }
      }
    }

    db.prepare('UPDATE drafts SET status = ? WHERE client_id = ? AND id = ?').run(targetStatus, clientId, draftId);

    this.vault.logAudit(clientId, actorName, 'status_transition', draftId, {
      from: draft.status,
      to: targetStatus,
      role: userRole
    });
  }

  /**
   * Adds an inline comment on a specific text span.
   */
  addComment(
    clientId: string,
    versionId: string,
    author: string,
    text: string,
    spanStart?: number,
    spanEnd?: number
  ): string {
    const db = (this.vault as any).db;
    const commentId = `comm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    db.prepare(`
      INSERT INTO comments (id, version_id, client_id, span_start, span_end, author, text)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(commentId, versionId, clientId, spanStart || null, spanEnd || null, author, text);

    this.vault.logAudit(clientId, author, 'add_comment', commentId, { versionId });
    return commentId;
  }

  /**
   * Resolves a finding (Accept fix, Dismiss with reason, or Request exception).
   * Note: No automated override! Human decision is explicitly required.
   */
  resolveFinding(clientId: string, input: FindingDecisionInput): { finding: FindingRecord; precedentCreated?: boolean } {
    validateFindingDecision(input.userRole);

    const db = (this.vault as any).db;
    const finding = db
      .prepare('SELECT * FROM findings WHERE client_id = ? AND id = ?')
      .get(clientId, input.findingId) as FindingRecord | undefined;

    if (!finding) {
      throw new Error(`Finding ${input.findingId} not found.`);
    }

    // Update finding status
    db.prepare('UPDATE findings SET status = ? WHERE client_id = ? AND id = ?').run(
      input.decision,
      clientId,
      input.findingId
    );

    let precedentCreated = false;

    // If dismissed or granted exception, create a Precedent in Brand Case Law!
    if (input.decision === 'dismissed' || input.decision === 'exception_requested') {
      const precedentId = `prec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const clauseId = finding.source_id || 'GENERAL_CLAUSE';
      const reason = input.reason || 'Reviewer approved exception';
      const scope = input.scope || 'all_content';
      const expiry = input.expiry || null;

      this.vault.insertPrecedent(clientId, {
        id: precedentId,
        clause_id: clauseId,
        finding_id: finding.id,
        decision: input.decision,
        reason,
        scope,
        expiry,
        decided_by: input.decidedBy
      });

      precedentCreated = true;
    }

    this.vault.logAudit(clientId, input.decidedBy, 'finding_decision', input.findingId, {
      decision: input.decision,
      reason: input.reason,
      precedentCreated
    });

    const updatedFinding = db.prepare('SELECT * FROM findings WHERE client_id = ? AND id = ?').get(clientId, input.findingId);
    return { finding: updatedFinding, precedentCreated };
  }
}
