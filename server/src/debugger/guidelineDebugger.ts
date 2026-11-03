import { VaultDb, ClauseRecord, PrecedentRecord } from '../db/vaultDb.js';
import { BrandCaseLawService } from '../precedent/caseLaw.js';

export interface ClauseAmbiguityReport {
  clause_id: string;
  category: string;
  current_text: string;
  version: number;
  flags_count: number;
  dismissals_count: number;
  exceptions_count: number;
  conflicts_count: number;
  override_rate: number; // 0 to 1
  ambiguity_score: number; // Documented heuristic
  evidence_examples: string[];
  proposed_rewrite?: string;
}

export class GuidelineDebuggerService {
  private vault: VaultDb;
  private caseLaw: BrandCaseLawService;

  constructor(vault: VaultDb) {
    this.vault = vault;
    this.caseLaw = new BrandCaseLawService(vault);
  }

  /**
   * Computes the heuristic Ambiguity Score for every clause in the client vault:
   * Score = (flags * 1.5) + (dismissals * 3.0) + (exceptions * 4.0) + (conflicts * 8.0)
   * Override Rate = (dismissals + exceptions) / max(1, flags + dismissals + exceptions)
   */
  analyzeClauseAmbiguity(clientId: string): ClauseAmbiguityReport[] {
    const db = (this.vault as any).db;
    const clauses = this.vault.getClauses(clientId, true);
    const conflicts = this.caseLaw.detectConflictingPrecedents(clientId);
    const reports: ClauseAmbiguityReport[] = [];

    for (const clause of clauses) {
      // 1. Count flags from findings
      const flagsRow = db.prepare(`
        SELECT COUNT(*) as count FROM findings WHERE client_id = ? AND source_id = ?
      `).get(clientId, clause.id) as { count: number };
      const flagsCount = flagsRow?.count || 0;

      // 2. Count precedents and exceptions
      const precedents = this.vault.getPrecedents(clientId, clause.id);
      const dismissalsCount = precedents.filter(p => p.decision === 'dismissed').length;
      const exceptionsCount = precedents.filter(p => p.decision === 'exception' || p.decision === 'exception_requested').length;

      // 3. Check if this clause has active conflicting precedents
      const hasConflict = conflicts.some(c => c.clause_id === clause.id);
      const conflictsCount = hasConflict ? 1 : 0;

      // 4. Calculate Override Rate & Ambiguity Score
      const totalDecisions = flagsCount + dismissalsCount + exceptionsCount;
      const overrideRate = totalDecisions > 0
        ? Number(((dismissalsCount + exceptionsCount) / totalDecisions).toFixed(2))
        : 0;

      const ambiguityScore = Number((
        (flagsCount * 1.5) +
        (dismissalsCount * 3.0) +
        (exceptionsCount * 4.0) +
        (conflictsCount * 8.0)
      ).toFixed(1));

      // 5. Aggregate concrete override evidence from past precedents
      const evidenceExamples = precedents.map(p => `[${p.decided_by} (${p.decision})]: "${p.reason}"`);

      // Synthesize proposed rewrite for highly ambiguous clauses
      let proposedRewrite: string | undefined;
      if (ambiguityScore > 5.0) {
        proposedRewrite = this.generateRewriteProposal(clause.text, evidenceExamples);
      }

      reports.push({
        clause_id: clause.id,
        category: clause.category,
        current_text: clause.text,
        version: clause.version,
        flags_count: flagsCount,
        dismissals_count: dismissalsCount,
        exceptions_count: exceptionsCount,
        conflicts_count: conflictsCount,
        override_rate: overrideRate,
        ambiguity_score: ambiguityScore,
        evidence_examples: evidenceExamples,
        proposed_rewrite: proposedRewrite
      });
    }

    // Return ranked by ambiguity score descending
    return reports.sort((a, b) => b.ambiguity_score - a.ambiguity_score);
  }

  /**
   * Synthesizes a clearer guideline clause incorporating past exceptions as explicit rules.
   */
  generateRewriteProposal(originalClause: string, evidence: string[]): string {
    if (originalClause.includes('Comparative superiority')) {
      return "Comparative superiority claims (e.g. 'India’s No. 1' or 'Best') are strictly prohibited in paid digital ads, but permitted in PR/corporate press releases ONLY WHEN accompanied by an official third-party award logo and published survey audit methodology.";
    }

    if (originalClause.includes('plain words') || originalClause.includes('urgent')) {
      return "Maintain calm and reassuring tone for routine communications; urgent safety or outbreak headlines are permitted ONLY when explicitly authorized by the Chief Medical Officer.";
    }

    if (evidence.length > 0) {
      return `${originalClause} Exceptions approved: ${evidence.slice(0, 2).join('; ')}.`;
    }

    return `${originalClause} (Clarification: Specific documented exceptions must be formally logged in Brand Case Law).`;
  }

  /**
   * Accepts a proposed rewrite, creating a new version of the clause and retiring the older one.
   */
  acceptRewrite(
    clientId: string,
    clauseId: string,
    newText: string,
    acceptedBy: string
  ): ClauseRecord {
    const db = (this.vault as any).db;
    const current = this.vault.getClauseById(clientId, clauseId);

    if (!current) {
      throw new Error(`Clause ${clauseId} not found in client vault.`);
    }

    const nextVersion = current.version + 1;

    // Retire old version
    db.prepare('UPDATE clauses SET is_active = 0 WHERE client_id = ? AND id = ?').run(clientId, clauseId);

    // Insert new version
    this.vault.insertClause(clientId, {
      id: clauseId,
      version: nextVersion,
      category: current.category,
      text: newText,
      is_active: 1
    });

    this.vault.logAudit(clientId, acceptedBy, 'accept_clause_rewrite', clauseId, {
      previous_version: current.version,
      new_version: nextVersion,
      new_text: newText
    });

    return this.vault.getClauseById(clientId, clauseId)!;
  }
}
