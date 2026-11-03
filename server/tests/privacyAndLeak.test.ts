import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { runMigrations } from '../src/db/index.js';
import { VaultDb } from '../src/db/vaultDb.js';
import { seedAgencyData } from '../src/scripts/seedAgency.js';
import { PrivacyMasker } from '../src/privacy/masker.js';
import { getAboutAiManifest } from '../src/privacy/aboutAi.js';

describe('Phase 11: Privacy & Client Isolation Leak Test Suite', () => {
  let db: DatabaseSync;
  let vault: VaultDb;

  beforeEach(() => {
    db = new DatabaseSync(':memory:');
    runMigrations(db);
    vault = new VaultDb(db);
    seedAgencyData(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('Cross-Vault Leak Prevention', () => {
    it('strict isolation: Client A query helper never retrieves Client B records', () => {
      const kavachClauses = vault.getClauses('client_kavach');
      const vyaparClauses = vault.getClauses('client_vyapar');
      const mittiClauses = vault.getClauses('client_mitti');

      expect(kavachClauses.length).toBeGreaterThan(0);
      expect(vyaparClauses.length).toBeGreaterThan(0);
      expect(mittiClauses.length).toBeGreaterThan(0);

      // Verify no cross-contamination of texts or IDs
      const kavachHasVyapar = kavachClauses.some(c => c.text.includes('VyaparSetu') || c.text.includes('GST Invoice'));
      const vyaparHasMitti = vyaparClauses.some(c => c.text.includes('Mitti & Moon') || c.text.includes('Saffron'));

      expect(kavachHasVyapar).toBe(false);
      expect(vyaparHasMitti).toBe(false);
    });

    it('prompt isolation: LLM prompt context contains only the authenticated client data', () => {
      // Simulate constructing LLM context for Client Kavach
      const clientClauses = vault.getClauses('client_kavach');
      const clientFacts = vault.getFacts('client_kavach');

      const serializedPrompt = JSON.stringify({ clauses: clientClauses, facts: clientFacts });

      // Must NOT contain competitor confidential facts
      expect(serializedPrompt).not.toContain('VyaparSetu');
      expect(serializedPrompt).not.toContain('Mitti & Moon');
      expect(serializedPrompt).not.toContain('Kumkumadi');
      expect(serializedPrompt).not.toContain('ISO/IEC 27001:2022');
    });
  });

  describe('Privacy Masker & Token Restoration', () => {
    const masker = new PrivacyMasker();

    it('masks emails, phone numbers, and confidential terms before external transmission and restores them cleanly', () => {
      const rawText = 'Contact Dr. Anita at anita.roy@kavachhealth.in or +91 98765 43210 regarding confidential internal patient study.';
      const confidentialList = ['confidential internal patient study'];

      const maskedResult = masker.mask(rawText, confidentialList);

      // Verify tokens replaced
      expect(maskedResult.maskedText).not.toContain('anita.roy@kavachhealth.in');
      expect(maskedResult.maskedText).not.toContain('98765');
      expect(maskedResult.maskedText).not.toContain('confidential internal patient study');

      expect(maskedResult.maskedText).toContain('[EMAIL_MASKED_1]');
      expect(maskedResult.maskedText).toContain('[PHONE_MASKED_2]');
      expect(maskedResult.maskedText).toContain('[CONFIDENTIAL_MASKED_3]');

      // Verify clean restoration
      const restored = masker.unmask(maskedResult.maskedText, maskedResult.restoreMap);
      expect(restored).toBe(rawText);
    });
  });

  describe('About AI Transparency Manifest', () => {
    it('supplies full transparency disclosure with model names and zero-hallucination guardrails', () => {
      const manifest = getAboutAiManifest();

      expect(manifest.service).toBe('Parakh Brand Governance AI');
      expect(manifest.models.length).toBeGreaterThanOrEqual(4);

      // Must list Groq llama-3.3-70b-versatile
      const groqDisclosure = manifest.models.find(m => m.service_or_model.includes('llama-3.3-70b'));
      expect(groqDisclosure).toBeDefined();
      expect(groqDisclosure?.masking_applied).toBe(true);

      // Must list Citation Gate deterministic component
      const citationGate = manifest.models.find(m => m.component.includes('Citation Gate'));
      expect(citationGate).toBeDefined();
      expect(citationGate?.execution_environment).toBe('local_server');
    });
  });
});
