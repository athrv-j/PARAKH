import { VaultDb, FactRecord } from '../db/vaultDb.js';

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

export interface AutoLinkResult {
  draft_version_id: string;
  total_claims_found: number;
  linked_count: number;
  unmatched_count: number;
  linked_claims: Array<{
    claim_span: string;
    matched_fact_id: string;
    matched_fact_label: string;
    link_method: 'exact_value' | 'numeric_match' | 'date_match' | 'label_keyword';
    confidence: 'high' | 'medium' | 'low';
  }>;
  unmatched_claims: string[];
}

export interface ExpiringFactsResult {
  client_id: string;
  expiring_within_days: number;
  expiring_facts: Array<{
    fact_id: string;
    label: string;
    value: string;
    valid_until: string;
    days_remaining: number;
    linked_drafts_count: number;
    affected_draft_titles: string[];
  }>;
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

  /**
   * Automatic Claim-to-Fact Extraction and Linking (Improvement 3)
   * Scans draft text for pricing, dates, percentages, codes, and promotional terms,
   * automatically links them to approved brand vault facts, and records links in `fact_links`.
   */
  autoLinkClaimsToFacts(
    clientId: string,
    draftVersionId: string,
    draftText: string
  ): AutoLinkResult {
    const db = (this.vault as any).db;
    const facts = this.vault.getFacts(clientId);

    const linkedClaims: AutoLinkResult['linked_claims'] = [];
    const unmatchedClaims: string[] = [];
    const seenFactIds = new Set<string>();

    // 1. Regex candidate claim extractions
    const priceRegex = /(?:₹|Rs\.?|INR)\s*[\d,]+(?:\.\d+)?/gi;
    const percentRegex = /\b\d+(?:\.\d+)?\s*%/g;
    const dateRegex = /\b(?:\d{4}-\d{2}-\d{2}|\d{1,2}(?:st|nd|rd|th)?\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember))\s+\d{4})\b/gi;
    const codeRegex = /\b[A-Z]{2,}-[A-Z0-9]+(?:-[A-Z0-9]+)*\b/g;

    const extractedMatches: Array<{ text: string; type: 'price' | 'percent' | 'date' | 'code' }> = [];

    let m: RegExpExecArray | null;
    while ((m = priceRegex.exec(draftText)) !== null) {
      extractedMatches.push({ text: m[0].trim(), type: 'price' });
    }
    while ((m = percentRegex.exec(draftText)) !== null) {
      extractedMatches.push({ text: m[0].trim(), type: 'percent' });
    }
    while ((m = dateRegex.exec(draftText)) !== null) {
      extractedMatches.push({ text: m[0].trim(), type: 'date' });
    }
    while ((m = codeRegex.exec(draftText)) !== null) {
      extractedMatches.push({ text: m[0].trim(), type: 'code' });
    }

    // Helper: normalize numeric amounts (e.g. "₹899" -> "899")
    const normalizeDigits = (val: string) => val.replace(/[^\d.]/g, '');

    // 2. Match extracted claims against client facts
    for (const match of extractedMatches) {
      const matchDigits = normalizeDigits(match.text);
      let matchedFact: FactRecord | undefined;
      let method: AutoLinkResult['linked_claims'][0]['link_method'] = 'exact_value';
      let confidence: AutoLinkResult['linked_claims'][0]['confidence'] = 'high';

      // Check exact value match
      matchedFact = facts.find(f =>
        f.value.toLowerCase().trim() === match.text.toLowerCase().trim() ||
        draftText.includes(f.value)
      );

      if (matchedFact) {
        method = 'exact_value';
        confidence = 'high';
      } else if (match.type === 'price' && matchDigits) {
        // Numeric match
        matchedFact = facts.find(f => normalizeDigits(f.value) === matchDigits);
        if (matchedFact) {
          method = 'numeric_match';
          confidence = 'high';
        }
      } else if (match.type === 'date') {
        // Date match against valid_until
        matchedFact = facts.find(f => {
          if (!f.valid_until) return false;
          return f.valid_until.includes(match.text) || match.text.includes(f.valid_until);
        });
        if (matchedFact) {
          method = 'date_match';
          confidence = 'high';
        }
      } else if (match.type === 'code') {
        matchedFact = facts.find(f => f.value.includes(match.text) || match.text.includes(f.value));
        if (matchedFact) {
          method = 'exact_value';
          confidence = 'high';
        }
      }

      if (matchedFact && !seenFactIds.has(matchedFact.id)) {
        seenFactIds.add(matchedFact.id);
        linkedClaims.push({
          claim_span: match.text,
          matched_fact_id: matchedFact.id,
          matched_fact_label: matchedFact.label,
          link_method: method,
          confidence
        });

        // Persist into fact_links if draftVersionId is provided
        if (draftVersionId) {
          const existing = db.prepare(`
            SELECT id FROM fact_links WHERE client_id = ? AND draft_version_id = ? AND fact_id = ?
          `).get(clientId, draftVersionId, matchedFact.id);

          if (!existing) {
            this.linkClaimToFact(clientId, draftVersionId, matchedFact.id, match.text);
          }
        }
      } else if (!matchedFact) {
        if (!unmatchedClaims.includes(match.text)) {
          unmatchedClaims.push(match.text);
        }
      }
    }

    // 3. Fallback: check if any fact values or labels appear directly in draft text
    for (const fact of facts) {
      if (seenFactIds.has(fact.id)) continue;

      if (draftText.includes(fact.value)) {
        seenFactIds.add(fact.id);
        linkedClaims.push({
          claim_span: fact.value,
          matched_fact_id: fact.id,
          matched_fact_label: fact.label,
          link_method: 'exact_value',
          confidence: 'high'
        });

        if (draftVersionId) {
          const existing = db.prepare(`
            SELECT id FROM fact_links WHERE client_id = ? AND draft_version_id = ? AND fact_id = ?
          `).get(clientId, draftVersionId, fact.id);
          if (!existing) {
            this.linkClaimToFact(clientId, draftVersionId, fact.id, fact.value);
          }
        }
      } else {
        // Label keyword match (e.g. fact label "Diwali Wellness Camp" -> draft contains "Diwali Wellness")
        const labelWords = fact.label.split(/\s+/).filter(w => w.length > 4);
        const hasKeywordMatch = labelWords.some(w => draftText.toLowerCase().includes(w.toLowerCase()));
        if (hasKeywordMatch && fact.valid_until && draftText.includes(fact.valid_until)) {
          seenFactIds.add(fact.id);
          linkedClaims.push({
            claim_span: fact.valid_until,
            matched_fact_id: fact.id,
            matched_fact_label: fact.label,
            link_method: 'date_match',
            confidence: 'medium'
          });

          if (draftVersionId) {
            const existing = db.prepare(`
              SELECT id FROM fact_links WHERE client_id = ? AND draft_version_id = ? AND fact_id = ?
            `).get(clientId, draftVersionId, fact.id);
            if (!existing) {
              this.linkClaimToFact(clientId, draftVersionId, fact.id, fact.valid_until);
            }
          }
        }
      }
    }

    return {
      draft_version_id: draftVersionId,
      total_claims_found: extractedMatches.length,
      linked_count: linkedClaims.length,
      unmatched_count: unmatchedClaims.length,
      linked_claims: linkedClaims,
      unmatched_claims: unmatchedClaims
    };
  }

  /**
   * Proactive Expiring Facts Radar (Improvement 3)
   * Detects facts expiring within N days or already expired, calculates
   * the blast radius across dependent drafts, and flags action required.
   */
  getExpiringFacts(clientId: string, withinDays = 30): ExpiringFactsResult {
    const db = (this.vault as any).db;
    const now = new Date();
    const thresholdDate = new Date(now.getTime() + withinDays * 24 * 60 * 60 * 1000);
    const thresholdIso = thresholdDate.toISOString().split('T')[0];

    const facts = db.prepare(`
      SELECT id, label, value, valid_until
      FROM facts
      WHERE client_id = ? AND valid_until IS NOT NULL AND valid_until <= ?
      ORDER BY valid_until ASC
    `).all(clientId, thresholdIso) as FactRecord[];

    const expiringFacts: ExpiringFactsResult['expiring_facts'] = [];

    for (const f of facts) {
      if (!f.valid_until) continue;
      const validUntilDate = new Date(f.valid_until);
      const diffMs = validUntilDate.getTime() - now.getTime();
      const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      // Calculate blast radius via dry run
      const ripple = this.propagateFactChange(clientId, f.id, {}, true);

      expiringFacts.push({
        fact_id: f.id,
        label: f.label,
        value: f.value,
        valid_until: f.valid_until,
        days_remaining: daysRemaining,
        linked_drafts_count: ripple.affected_items_count,
        affected_draft_titles: ripple.affected_drafts.map(d => d.draft_title)
      });
    }

    return {
      client_id: clientId,
      expiring_within_days: withinDays,
      expiring_facts: expiringFacts
    };
  }
}
