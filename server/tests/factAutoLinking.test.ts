/**
 * Improvement 3: Automatic Claim-to-Fact Linking for Fact Ripple
 * Tests:
 *  - Automated extraction of numeric pricing, dates, and codes
 *  - Auto-linking to approved brand facts in VaultDb
 *  - Persistence into `fact_links`
 *  - Expiring Facts Radar with blast radius computation
 *  - Dry-run vs live ripple propagation
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { VaultDb } from '../src/db/vaultDb.js';
import { FactRippleEngine } from '../src/facts/factRipple.js';

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS clients (id TEXT PRIMARY KEY, name TEXT);
  CREATE TABLE IF NOT EXISTS facts (
    id TEXT PRIMARY KEY, client_id TEXT, label TEXT, value TEXT,
    valid_from TEXT, valid_until TEXT, created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS drafts (
    id TEXT PRIMARY KEY, client_id TEXT, title TEXT,
    channel TEXT DEFAULT 'social', status TEXT DEFAULT 'draft', author TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS draft_versions (
    id TEXT PRIMARY KEY, draft_id TEXT, client_id TEXT,
    version_num INTEGER DEFAULT 1, text_content TEXT, file_path TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS fact_links (
    id TEXT PRIMARY KEY, client_id TEXT NOT NULL,
    draft_version_id TEXT NOT NULL, fact_id TEXT NOT NULL,
    claim_span TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY, client_id TEXT, actor TEXT, action TEXT,
    target TEXT, details TEXT, created_at TEXT DEFAULT (datetime('now'))
  );
`;

const CLIENT_ID = 'client_test_fact_ripple';

let db: DatabaseSync;
let vault: VaultDb;
let ripple: FactRippleEngine;

beforeAll(() => {
  db = new DatabaseSync(':memory:');
  SCHEMA.split(';').filter(s => s.trim()).forEach(sql => db.exec(sql + ';'));

  vault = new VaultDb(db as any);
  ripple = new FactRippleEngine(vault);

  // 1. Seed Client
  vault.createClient({ id: CLIENT_ID, name: 'Kavach Healthcare Test' });

  // 2. Seed Approved Brand Facts
  vault.insertFact(CLIENT_ID, {
    id: 'FACT-01',
    label: 'Basic Health Package Price',
    value: '₹499',
    valid_from: '2026-01-01',
    valid_until: '2026-12-31'
  });

  vault.insertFact(CLIENT_ID, {
    id: 'FACT-02',
    label: 'Diwali Wellness Camp Price',
    value: '₹899',
    valid_from: '2026-10-01',
    valid_until: '2026-11-20' // Soon-to-expire
  });

  vault.insertFact(CLIENT_ID, {
    id: 'FACT-03',
    label: 'NABL Certification Code',
    value: 'NABL-MC-2026-441',
    valid_from: '2025-01-01',
    valid_until: '2027-01-01'
  });

  // 3. Seed Drafts
  vault.insertDraft(CLIENT_ID, {
    id: 'draft-reel-01',
    title: 'Instagram Reel: Care Check',
    channel: 'social',
    status: 'draft',
    author: 'creator@agency.com'
  });
  vault.insertDraftVersion(CLIENT_ID, {
    id: 'dv-reel-01',
    draft_id: 'draft-reel-01',
    version_num: 1,
    text_content: 'Get our full checkup for only ₹499 this week!'
  });

  vault.insertDraft(CLIENT_ID, {
    id: 'draft-email-02',
    title: 'Diwali Special Offer Email',
    channel: 'email',
    status: 'draft',
    author: 'campaign@agency.com'
  });
  vault.insertDraftVersion(CLIENT_ID, {
    id: 'dv-email-02',
    draft_id: 'draft-email-02',
    version_num: 1,
    text_content: 'Celebrate Diwali with our ₹899 wellness camp package. Valid until 2026-11-20.'
  });
});

afterAll(() => {
  db.close();
});

// =====================================================================
// TEST SUITE: autoLinkClaimsToFacts
// =====================================================================
describe('FactRipple — autoLinkClaimsToFacts (Improvement 3)', () => {
  it('automatically extracts numeric price and links to matching fact', () => {
    const text = 'Checkup package available at ₹499 for all citizens.';
    const result = ripple.autoLinkClaimsToFacts(CLIENT_ID, 'dv-reel-01', text);

    expect(result.linked_count).toBeGreaterThanOrEqual(1);
    const link = result.linked_claims.find(l => l.matched_fact_id === 'FACT-01');
    expect(link).toBeDefined();
    expect(link!.claim_span).toContain('499');
    expect(link!.confidence).toBe('high');
  });

  it('automatically extracts date claim and links to valid_until date fact', () => {
    const text = 'Don’t miss our Diwali package at ₹899, valid until 2026-11-20!';
    const result = ripple.autoLinkClaimsToFacts(CLIENT_ID, 'dv-email-02', text);

    expect(result.linked_count).toBeGreaterThanOrEqual(1);
    const priceLink = result.linked_claims.find(l => l.matched_fact_id === 'FACT-02');
    expect(priceLink).toBeDefined();
    expect(priceLink!.claim_span).toContain('899');
  });

  it('automatically extracts certification codes and links to fact', () => {
    const text = 'All tests performed under certification NABL-MC-2026-441 in certified labs.';
    const result = ripple.autoLinkClaimsToFacts(CLIENT_ID, 'dv-code-01', text);

    const codeLink = result.linked_claims.find(l => l.matched_fact_id === 'FACT-03');
    expect(codeLink).toBeDefined();
    expect(codeLink!.matched_fact_label).toContain('NABL');
  });

  it('records persistent links in fact_links table', () => {
    const links = (db as any).prepare('SELECT * FROM fact_links WHERE client_id = ?').all(CLIENT_ID) as any[];
    expect(links.length).toBeGreaterThan(0);
    const fact01Link = links.find((l: any) => l.fact_id === 'FACT-01');
    expect(fact01Link).toBeDefined();
    expect(fact01Link.draft_version_id).toBe('dv-reel-01');
  });

  it('correctly tracks unmatched claims when numbers do not match any known fact', () => {
    const text = 'Save an extra ₹9,999 on premium surgeries with 75% cash rebate!';
    const result = ripple.autoLinkClaimsToFacts(CLIENT_ID, 'dv-unknown-01', text);

    expect(result.unmatched_claims.length).toBeGreaterThanOrEqual(1);
    expect(result.unmatched_claims.some(c => c.includes('9,999') || c.includes('75%'))).toBe(true);
  });
});

// =====================================================================
// TEST SUITE: Proactive Expiring Facts Radar & Blast Radius
// =====================================================================
describe('FactRipple — getExpiringFacts & Blast Radius (Improvement 3)', () => {
  it('detects facts expiring within window and reports blast radius', () => {
    // FACT-02 expires on 2026-11-20
    const result = ripple.getExpiringFacts(CLIENT_ID, 60);

    expect(result.client_id).toBe(CLIENT_ID);
    expect(Array.isArray(result.expiring_facts)).toBe(true);
    const expiring = result.expiring_facts.find(f => f.fact_id === 'FACT-02');
    expect(expiring).toBeDefined();
    expect(expiring!.valid_until).toBe('2026-11-20');
    expect(expiring!.linked_drafts_count).toBeGreaterThanOrEqual(1);
  });

  it('dry-run propagation calculates blast radius without altering draft status', () => {
    const beforeDraft = (db as any).prepare('SELECT status FROM drafts WHERE id = ?').get('draft-email-02') as any;

    const dryRunResult = ripple.propagateFactChange(
      CLIENT_ID,
      'FACT-02',
      { value: '₹999' },
      true // dry-run
    );

    expect(dryRunResult.dry_run).toBe(true);
    expect(dryRunResult.affected_items_count).toBeGreaterThanOrEqual(1);
    expect(dryRunResult.affected_drafts.some(d => d.draft_id === 'draft-email-02')).toBe(true);

    const afterDraft = (db as any).prepare('SELECT status FROM drafts WHERE id = ?').get('draft-email-02') as any;
    expect(afterDraft.status).toBe(beforeDraft.status); // Unaltered in dry-run
  });

  it('live propagation applies changes and updates draft status to changes_requested', () => {
    const liveResult = ripple.propagateFactChange(
      CLIENT_ID,
      'FACT-02',
      { value: '₹1,099' },
      false // live
    );

    expect(liveResult.dry_run).toBe(false);
    expect(liveResult.new_value).toBe('₹1,099');

    const updatedFact = (db as any).prepare('SELECT value FROM facts WHERE id = ?').get('FACT-02') as any;
    expect(updatedFact.value).toBe('₹1,099');

    const updatedDraft = (db as any).prepare('SELECT status FROM drafts WHERE id = ?').get('draft-email-02') as any;
    expect(updatedDraft.status).toBe('changes_requested');
  });
});
