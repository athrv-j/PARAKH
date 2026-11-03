import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { runMigrations } from '../src/db/index.js';
import { VaultDb, ClientVaultViolationError } from '../src/db/vaultDb.js';

describe('Phase 1: Schema and Vault Safety', () => {
  let db: DatabaseSync;
  let vault: VaultDb;

  beforeEach(() => {
    // In-memory isolated database for tests
    db = new DatabaseSync(':memory:');
    runMigrations(db);
    vault = new VaultDb(db);

    // Seed test clients
    vault.createClient({ id: 'client_alpha', name: 'Alpha Corp' });
    vault.createClient({ id: 'client_beta', name: 'Beta Ltd' });
  });

  afterEach(() => {
    db.close();
  });

  describe('Client Isolation Enforcement (Query Helper Throws without clientId)', () => {
    it('throws ClientVaultViolationError when insertClause is called with empty or invalid clientId', () => {
      expect(() => {
        // @ts-expect-error test invalid clientId
        vault.insertClause('', { id: 'C-1', category: 'tone', text: 'Be bold' });
      }).toThrow(ClientVaultViolationError);

      expect(() => {
        // @ts-expect-error test undefined clientId
        vault.insertClause(undefined, { id: 'C-1', category: 'tone', text: 'Be bold' });
      }).toThrow(ClientVaultViolationError);
    });

    it('throws ClientVaultViolationError when getClauses is called without clientId', () => {
      expect(() => {
        // @ts-expect-error test invalid clientId
        vault.getClauses('');
      }).toThrow(ClientVaultViolationError);
    });

    it('throws ClientVaultViolationError when insertFact or getFacts is called without clientId', () => {
      expect(() => {
        // @ts-expect-error test invalid clientId
        vault.insertFact('', { id: 'F-1', label: 'Price', value: '₹999' });
      }).toThrow(ClientVaultViolationError);

      expect(() => {
        // @ts-expect-error test undefined clientId
        vault.getFacts(undefined as any);
      }).toThrow(ClientVaultViolationError);
    });

    it('throws ClientVaultViolationError when insertTerm or getTerms is called without clientId', () => {
      expect(() => {
        // @ts-expect-error test invalid clientId
        vault.insertTerm('', { id: 'T-1', term: 'cheap', type: 'banned', replacement: 'affordable' });
      }).toThrow(ClientVaultViolationError);

      expect(() => {
        // @ts-expect-error test invalid clientId
        vault.getTerms('   ');
      }).toThrow(ClientVaultViolationError);
    });

    it('throws ClientVaultViolationError when findings or precedent methods are called without clientId', () => {
      expect(() => {
        // @ts-expect-error test invalid clientId
        vault.getFindingsByVersion('', 'v-1');
      }).toThrow(ClientVaultViolationError);

      expect(() => {
        // @ts-expect-error test invalid clientId
        vault.getPrecedents('');
      }).toThrow(ClientVaultViolationError);
    });
  });

  describe('Multi-Tenant Data Vault Isolation', () => {
    it('strictly isolates clauses between Client Alpha and Client Beta', () => {
      vault.insertClause('client_alpha', {
        id: 'C-1.1',
        category: 'tone',
        text: 'Always speak with quiet confidence.'
      });

      vault.insertClause('client_beta', {
        id: 'C-1.1',
        category: 'tone',
        text: 'Always shout high energy excitement!'
      });

      const alphaClauses = vault.getClauses('client_alpha');
      const betaClauses = vault.getClauses('client_beta');

      expect(alphaClauses).toHaveLength(1);
      expect(betaClauses).toHaveLength(1);
      expect(alphaClauses[0].text).toBe('Always speak with quiet confidence.');
      expect(betaClauses[0].text).toBe('Always shout high energy excitement!');
    });

    it('versioning works correctly on clauses', () => {
      vault.insertClause('client_alpha', {
        id: 'C-2.0',
        version: 1,
        category: 'claims',
        text: 'Claim 1: 50% discount'
      });

      vault.insertClause('client_alpha', {
        id: 'C-2.0',
        version: 2,
        category: 'claims',
        text: 'Claim 1: Up to 50% discount on select items'
      });

      const latest = vault.getClauseById('client_alpha', 'C-2.0');
      expect(latest).toBeDefined();
      expect(latest?.version).toBe(2);
      expect(latest?.text).toContain('Up to 50% discount');
    });

    it('isolates facts with validity dates', () => {
      vault.insertFact('client_alpha', {
        id: 'F-PROMO',
        label: 'Diwali Offer',
        value: 'Flat 20% off',
        valid_from: '2026-10-15',
        valid_until: '2026-11-05'
      });

      const alphaFacts = vault.getFacts('client_alpha');
      const betaFacts = vault.getFacts('client_beta');

      expect(alphaFacts).toHaveLength(1);
      expect(betaFacts).toHaveLength(0);
      expect(alphaFacts[0].value).toBe('Flat 20% off');
      expect(alphaFacts[0].valid_until).toBe('2026-11-05');
    });
  });
});
