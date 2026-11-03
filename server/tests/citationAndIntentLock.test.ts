import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { runMigrations } from '../src/db/index.js';
import { VaultDb } from '../src/db/vaultDb.js';
import { enforceCitationGate } from '../src/review/citation/citationGate.js';
import { IntentLockEngine } from '../src/review/fix.js';
import { LlmFinding } from '../src/review/llm/client.js';

describe('Phase 5 & 6: Citation Gate & Intent Lock Engine', () => {
  let db: DatabaseSync;
  let vault: VaultDb;
  const clientId = 'client_kavach';

  beforeEach(() => {
    db = new DatabaseSync(':memory:');
    runMigrations(db);
    vault = new VaultDb(db);

    vault.createClient({ id: clientId, name: 'Kavach Health' });

    // Seed test clause
    vault.insertClause(clientId, {
      id: 'C-1.1',
      category: 'tone',
      text: 'Kavach Health must communicate with calm, empathetic, and evidence-backed phrasing. Never use fear-mongering or alarmist headlines.'
    });

    vault.insertClause(clientId, {
      id: 'C-1.2',
      category: 'tone',
      text: "Avoid aggressive sales hyperbole such as 'BUY NOW OR REGRET' or excessive exclamation marks. Maximum one exclamation mark per copy."
    });
  });

  afterEach(() => {
    db.close();
  });

  describe('Phase 5: Citation Gate ("No source, no flag")', () => {
    it('approves findings that quote exact verbatim clause text', () => {
      const clauses = vault.getClauses(clientId);
      const facts = vault.getFacts(clientId);
      const draftText = 'DENGUE OUTBREAK IS KILLING HUNDREDS! ACT NOW!';

      const validFinding: LlmFinding = {
        issue: 'Alarmist Tone',
        span: 'DENGUE OUTBREAK IS KILLING HUNDREDS!',
        clause_id: 'C-1.1',
        quote_from_source: 'Never use fear-mongering or alarmist headlines.',
        explanation: 'Headline uses panic-inducing mortality warnings.'
      };

      const result = enforceCitationGate(clientId, draftText, [validFinding], clauses, facts, vault);

      expect(result.verifiedFindings).toHaveLength(1);
      expect(result.droppedFindings).toHaveLength(0);
      expect(result.verifiedFindings[0].source_id).toBe('C-1.1');
      expect(result.verifiedFindings[0].source_type).toBe('ai');
    });

    it('adversarial check: drops hallucinated finding with invented rule text and logs audit', () => {
      const clauses = vault.getClauses(clientId);
      const facts = vault.getFacts(clientId);
      const draftText = 'Welcome to our clinic today for your checkup.';

      // Adversarial hallucination: Model attempts to invent a non-existent rule
      const hallucinatedFinding: LlmFinding = {
        issue: 'Unapproved Greeting',
        span: 'Welcome to our clinic',
        clause_id: 'C-1.1',
        quote_from_source: 'Never use the informal word welcome when opening a post', // DOES NOT EXIST IN CLAUSE
        explanation: 'Invented rule claiming welcome is forbidden.'
      };

      const result = enforceCitationGate(clientId, draftText, [hallucinatedFinding], clauses, facts, vault);

      expect(result.verifiedFindings).toHaveLength(0);
      expect(result.droppedFindings).toHaveLength(1);
      expect(result.droppedFindings[0].reason).toContain('was not found verbatim');

      // Verify audit log captured the drop
      const logs = db.prepare("SELECT * FROM audit_log WHERE action = 'uncited_dropped'").all();
      expect(logs).toHaveLength(1);
    });

    it('adversarial check: drops finding referencing non-existent clause ID', () => {
      const clauses = vault.getClauses(clientId);
      const facts = vault.getFacts(clientId);
      const draftText = 'Special Diwali package.';

      const fakeClauseFinding: LlmFinding = {
        issue: 'Phantom Clause',
        span: 'Diwali package',
        clause_id: 'C-99.9', // Does not exist
        quote_from_source: 'Some rule',
        explanation: 'Clause does not exist in vault.'
      };

      const result = enforceCitationGate(clientId, draftText, [fakeClauseFinding], clauses, facts, vault);

      expect(result.verifiedFindings).toHaveLength(0);
      expect(result.droppedFindings).toHaveLength(1);
      expect(result.droppedFindings[0].reason).toContain('does not exist in client vault');
    });
  });

  describe('Phase 6: Intent Lock Engine & Word Diffs', () => {
    const engine = new IntentLockEngine();

    it('extracts creator intent and identifies critical must-keep phrases', () => {
      const draftText = 'Celebrate Diwali with Kavach Health! Book your Basic Health Checkup at ₹499.';
      const intent = engine.extractIntent(draftText, 'social');

      expect(intent.must_keep_phrases).toContain('Kavach Health');
      expect(intent.must_keep_phrases).toContain('Diwali');
      expect(intent.must_keep_phrases).toContain('Health Checkup');
    });

    it('generates surgical fix with word-level diff and preserves must-keep phrases', () => {
      const draftText = 'Kavach Health: BUY NOW OR REGRET MISSING OUT ON COMPLETE HEALTH IMMUNITY!!!';
      const intent = engine.extractIntent(draftText, 'social');

      const finding = {
        id: 'f_test',
        type: 'tone',
        severity: 'high' as const,
        span_start: 15,
        span_end: 72,
        span_text: 'BUY NOW OR REGRET MISSING OUT ON COMPLETE HEALTH IMMUNITY!!!',
        source_type: 'ai' as const,
        source_id: 'C-1.2',
        source_text: "Avoid aggressive sales hyperbole such as 'BUY NOW OR REGRET'",
        model_name: 'groq/llama-3.3-70b-versatile',
        explanation: 'Aggressive FOMO sales copy.'
      };

      const fix = engine.generateFix(draftText, finding, intent);

      expect(fix.suggested_rewrite).not.toContain('BUY NOW OR REGRET');
      expect(fix.word_diff.length).toBeGreaterThan(0);
      expect(fix.intent_verified).toBe(true);
      expect(fix.intent_audit.must_keep_retention_rate).toBe(100);
    });

    it('detects when an aggressive rewrite strips a must-keep brand phrase', () => {
      const intent = {
        goal: 'Promotion',
        audience: 'Family',
        key_message: 'Diwali offer',
        must_keep_phrases: ['Kavach Health', 'Diwali']
      };

      // Rewrite accidentally stripped brand name "Kavach Health"
      const audit = engine.verifyIntentSurvives(
        'Kavach Health Diwali Special',
        'Generic Diagnostic Diwali Special',
        intent
      );

      expect(audit.pass).toBe(false);
      expect(audit.missing_phrases).toContain('Kavach Health');
      expect(audit.must_keep_retention_rate).toBeLessThan(100);
    });
  });
});
