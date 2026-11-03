import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { runMigrations } from '../src/db/index.js';
import { VaultDb } from '../src/db/vaultDb.js';
import { KnowledgeImporter } from '../src/services/importer.js';

describe('Phase 3: Knowledge Import Engine', () => {
  let db: DatabaseSync;
  let vault: VaultDb;
  let importer: KnowledgeImporter;

  beforeEach(() => {
    db = new DatabaseSync(':memory:');
    runMigrations(db);
    vault = new VaultDb(db);
    importer = new KnowledgeImporter();
    vault.createClient({ id: 'test_brand', name: 'Test Brand Ltd' });
  });

  afterEach(() => {
    db.close();
  });

  it('parses clauses, terms, facts, and color tokens from guideline text', () => {
    const rawDocument = `
# Brand Guidelines for Test Brand

## Tone and Voice
1.1 Always maintain an empathetic, reassuring tone when speaking to consumers.
1.2 Never employ fear-based marketing or threatening urgency tactics.

## Terminology
Banned: cheap -> cost-effective
Preferred: scientifically validated

## Approved Facts
Fact: Starting Package Price = ₹399
Fact: Turnaround Time = Within 12 hours

## Visual Standards
Primary Brand Color: #0E4D48
Accent Color: #FFD60A
Clause 4.1: Maintain high visual contrast on all creative assets.
`;

    const parsed = importer.parseContent(rawDocument);

    expect(parsed.clauses).toHaveLength(3);
    expect(parsed.clauses[0].id).toBe('C-1.1');
    expect(parsed.clauses[0].category).toBe('tone');
    expect(parsed.clauses[0].text).toContain('empathetic, reassuring tone');

    expect(parsed.terms).toHaveLength(2);
    expect(parsed.terms[0]).toEqual({ term: 'cheap', type: 'banned', replacement: 'cost-effective' });
    expect(parsed.terms[1]).toEqual({ term: 'scientifically validated', type: 'preferred' });

    expect(parsed.facts).toHaveLength(2);
    expect(parsed.facts[0]).toEqual({ label: 'Starting Package Price', value: '₹399' });

    expect(parsed.palette).toContain('#0E4D48');
    expect(parsed.palette).toContain('#FFD60A');
  });

  it('imports extracted knowledge into client vault and verifies isolation', async () => {
    const documentText = `
Tone Rules:
C-1.1 Speak with humble authority and clarity.
C-1.2 Never use unverified superlatives like world's best.

Banned: instant magic -> natural formulation
Fact: Standard Delivery = 2 business days
`;

    const result = await importer.importIntoVault('test_brand', documentText, vault);

    console.log(`\nImported into test_brand: ${result.clausesCount} clauses, ${result.termsCount} terms, ${result.factsCount} facts.`);

    expect(result.clausesCount).toBe(2);
    expect(result.termsCount).toBe(1);
    expect(result.factsCount).toBe(1);

    const savedClauses = vault.getClauses('test_brand');
    const savedTerms = vault.getTerms('test_brand');
    const savedFacts = vault.getFacts('test_brand');

    expect(savedClauses).toHaveLength(2);
    expect(savedTerms).toHaveLength(1);
    expect(savedFacts).toHaveLength(1);
    expect(savedClauses[0].text).toBe('Speak with humble authority and clarity.');
  });
});
