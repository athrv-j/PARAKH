import { VaultDb, FactRecord, DraftRecord } from '../db/vaultDb.js';

export interface AffectedDraftItem {
  draft_id: string;
  draft_title: string;
  channel: string;
  current_status: string;
  version_id: string;
  claim_span: string;
  action_required: 'needs_update';
}

export interface FactRippleResult {
  fact_id: string;
  label: string;
  previous_value: string;
  new_value?: string;
  previous_valid_until?: string | null;
  new_valid_until?: string | null;
  dry_run: boolean;
  affected_items_count: number;
  affected_drafts: AffectedDraftItem[];
}

export class FactRippleEngine {
  private vault: VaultDb;

  constructor(vault: VaultDb) {
    this.vault = vault;
  }

  /**
   * Links a claim in a draft to a specific fact ID in the dependency graph.
   */
  linkClaimToFact(
    clientId: string,
    draftVersionId: string,
    factId: string,
    claimSpan: string
  ): void {
    const db = (this.vault as any).db;
    const linkId = `flink_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    db.prepare(`
      INSERT INTO fact_links (id, client_id, draft_version_id, fact_id, claim_span)
      VALUES (?, ?, ?, ?, ?)
    `).run(linkId, clientId, draftVersionId, factId, claimSpan);
  }

  /**
   * Computes the ripple impact of updating a fact (e.g. extending an offer deadline or price).
   * Supports dry-run preview before committing changes.
   */
  propagateFactChange(
    clientId: string,
    factId: string,
    update: { value?: string; valid_until?: string },
    isDryRun = false
  ): FactRippleResult {
    const db = (this.vault as any).db;
    const fact = db.prepare('SELECT * FROM facts WHERE client_id = ? AND id = ?').get(clientId, factId) as FactRecord | undefined;

    if (!fact) {
      throw new Error(`Fact ${factId} not found in client vault.`);
    }

    // Query all draft versions linked to this fact
    const linkedRows = db.prepare(`
      SELECT fl.claim_span, fl.draft_version_id, dv.draft_id, d.title as draft_title, d.channel, d.status as current_status
      FROM fact_links fl
      JOIN draft_versions dv ON fl.draft_version_id = dv.id
      JOIN drafts d ON dv.draft_id = d.id
      WHERE fl.client_id = ? AND fl.fact_id = ?
    `).all(clientId, factId) as any[];

    // If no direct link exists yet, search drafts mentioning the fact's value or label (e.g., promotional price/dates)
    if (linkedRows.length === 0) {
      const keyword = fact.value.split(/\s+/)[0]; // e.g. "₹899" or "₹1,499"
      const foundDrafts = db.prepare(`
        SELECT dv.id as draft_version_id, dv.draft_id, d.title as draft_title, d.channel, d.status as current_status, dv.text_content
        FROM draft_versions dv
        JOIN drafts d ON dv.draft_id = d.id
        WHERE dv.client_id = ? AND dv.text_content LIKE ?
      `).all(clientId, `%${keyword}%`) as any[];

      for (const d of foundDrafts) {
        linkedRows.push({
          claim_span: keyword,
          draft_version_id: d.draft_version_id,
          draft_id: d.draft_id,
          draft_title: d.draft_title,
          channel: d.channel,
          current_status: d.current_status
        });
      }
    }

    const affectedDrafts: AffectedDraftItem[] = linkedRows.map(row => ({
      draft_id: row.draft_id,
      draft_title: row.draft_title,
      channel: row.channel,
      current_status: row.current_status,
      version_id: row.draft_version_id,
      claim_span: row.claim_span,
      action_required: 'needs_update'
    }));

    if (!isDryRun) {
      // Apply updates to the fact in SQLite
      if (update.value !== undefined) {
        db.prepare('UPDATE facts SET value = ? WHERE client_id = ? AND id = ?').run(update.value, clientId, factId);
      }
      if (update.valid_until !== undefined) {
        db.prepare('UPDATE facts SET valid_until = ? WHERE client_id = ? AND id = ?').run(update.valid_until, clientId, factId);
      }

      // Mark affected drafts as changes_requested
      for (const item of affectedDrafts) {
        db.prepare("UPDATE drafts SET status = 'changes_requested' WHERE client_id = ? AND id = ?").run(clientId, item.draft_id);
      }

      this.vault.logAudit(clientId, 'fact_ripple_engine', 'propagate_fact_change', factId, {
        dry_run: false,
        affected_count: affectedDrafts.length,
        new_value: update.value,
        new_valid_until: update.valid_until
      });
    }

    return {
      fact_id: fact.id,
      label: fact.label,
      previous_value: fact.value,
      new_value: update.value,
      previous_valid_until: fact.valid_until,
      new_valid_until: update.valid_until,
      dry_run: isDryRun,
      affected_items_count: affectedDrafts.length,
      affected_drafts: affectedDrafts
    };
  }

  /**
   * Sweeper checking for expired facts and notifying dependent content.
   */
  sweepExpiredFacts(clientId: string): { expiredFactsCount: number; flaggedDraftsCount: number } {
    const db = (this.vault as any).db;
    const now = new Date().toISOString().split('T')[0];

    const expiredFacts = db.prepare(`
      SELECT id, label, valid_until FROM facts WHERE client_id = ? AND valid_until IS NOT NULL AND valid_until < ?
    `).all(clientId, now) as FactRecord[];

    let flaggedCount = 0;

    for (const f of expiredFacts) {
      const ripple = this.propagateFactChange(clientId, f.id, {}, false);
      flaggedCount += ripple.affected_items_count;
    }

    return {
      expiredFactsCount: expiredFacts.length,
      flaggedDraftsCount: flaggedCount
    };
  }
}
