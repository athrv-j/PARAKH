import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { runMigrations } from '../src/db/index.js';
import { VaultDb } from '../src/db/vaultDb.js';
import { seedAgencyData } from '../src/scripts/seedAgency.js';
import { FactRippleEngine } from '../src/facts/factRipple.js';
import { GuidelineDebuggerService } from '../src/debugger/guidelineDebugger.js';

describe('Phase 9 & 10: Fact Ripple Engine and Guideline Debugger', () => {
  let db: DatabaseSync;
  let vault: VaultDb;
  let ripple: FactRippleEngine;
  let debuggerService: GuidelineDebuggerService;

  beforeEach(() => {
    db = new DatabaseSync(':memory:');
    runMigrations(db);
    vault = new VaultDb(db);
    ripple = new FactRippleEngine(vault);
    debuggerService = new GuidelineDebuggerService(vault);

    // Seed agency data
    seedAgencyData(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('Phase 9: Fact Ripple Dependency Graph', () => {
    it('dry-run preview identifies dependent drafts without altering database state', () => {
      // Preview changing Diwali camp price fact F-KAV-02
      const preview = ripple.propagateFactChange(
        'client_kavach',
        'F-KAV-02',
        { value: '₹999', valid_until: '2026-11-20' },
        true // dry run
      );

      expect(preview.dry_run).toBe(true);
      expect(preview.affected_items_count).toBeGreaterThan(0);
      expect(preview.affected_drafts[0].action_required).toBe('needs_update');

      // Verify the fact in the database was NOT changed during dry run
      const factInDb = vault.getFacts('client_kavach').find(f => f.id === 'F-KAV-02');
      expect(factInDb?.value).toBe('₹899');
    });

    it('propagates fact update, modifies database and flips affected draft states to changes_requested', () => {
      const result = ripple.propagateFactChange(
        'client_kavach',
        'F-KAV-02',
        { value: '₹1,099', valid_until: '2026-11-25' },
        false // live execution
      );

      expect(result.dry_run).toBe(false);
      expect(result.affected_items_count).toBeGreaterThan(0);

      // Verify fact in database was updated
      const updatedFact = vault.getFacts('client_kavach').find(f => f.id === 'F-KAV-02');
      expect(updatedFact?.value).toBe('₹1,099');
      expect(updatedFact?.valid_until).toBe('2026-11-25');

      // Verify dependent drafts are marked for changes
      const affectedDraftId = result.affected_drafts[0].draft_id;
      const draftInDb = vault.getDrafts('client_kavach').find(d => d.id === affectedDraftId);
      expect(draftInDb?.status).toBe('changes_requested');
    });
  });

  describe('Phase 10: Guideline Debugger & Ambiguity Ranking', () => {
    it('ranks clauses by heuristic ambiguity score and highlights conflicting precedents', () => {
      const reports = debuggerService.analyzeClauseAmbiguity('client_vyapar');

      expect(reports.length).toBeGreaterThan(0);
      // The top ranked clause should have positive ambiguity score
      const topClause = reports[0];
      expect(topClause.ambiguity_score).toBeGreaterThan(0);

      // Clause C-3.2 (which had conflicting decisions) should be among top ranked
      const conflictedClause = reports.find(r => r.clause_id === 'C-3.2');
      expect(conflictedClause).toBeDefined();
      expect(conflictedClause?.conflicts_count).toBe(1);
      expect(conflictedClause?.evidence_examples.length).toBeGreaterThan(0);
      expect(conflictedClause?.proposed_rewrite).toBeDefined();
    });

    it('accepts clause rewrite proposal and creates an active Version 2', () => {
      const current = vault.getClauseById('client_vyapar', 'C-3.2');
      expect(current?.version).toBe(1);

      const newProposedRule = 'Display APR starting from 11.5% with optional daily equivalent in social captions.';
      const updated = debuggerService.acceptRewrite(
        'client_vyapar',
        'C-3.2',
        newProposedRule,
        'Sneha Kapur, Head of Legal'
      );

      expect(updated.version).toBe(2);
      expect(updated.text).toBe(newProposedRule);

      // Verify old version 1 is no longer in active clauses list
      const activeClauses = vault.getClauses('client_vyapar', true);
      const activeC32 = activeClauses.find(c => c.id === 'C-3.2');
      expect(activeC32?.version).toBe(2);
      expect(activeC32?.text).toBe(newProposedRule);
    });
  });
});
