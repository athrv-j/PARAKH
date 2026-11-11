/**
 * Improvement 2: Guideline Debugger with Clause Versioning & Impact Replay
 * Tests the GuidelineDebuggerService for:
 *  - Clause ambiguity scoring
 *  - Impact Replay (before/after finding estimates)
 *  - Clause version history
 *  - acceptRewrite() creating a new version and retiring the old one
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { VaultDb } from '../src/db/vaultDb.js';
import { GuidelineDebuggerService } from '../src/debugger/guidelineDebugger.js';

// ----- Minimal in-memory schema -----
const SCHEMA = `
  CREATE TABLE IF NOT EXISTS clients (id TEXT PRIMARY KEY, name TEXT);
  CREATE TABLE IF NOT EXISTS clauses (
    id TEXT, client_id TEXT, version INTEGER NOT NULL DEFAULT 1,
    category TEXT, text TEXT, is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (id, client_id, version)
  );
  CREATE TABLE IF NOT EXISTS terms (id TEXT PRIMARY KEY, client_id TEXT, term TEXT, type TEXT, replacement TEXT);
  CREATE TABLE IF NOT EXISTS facts (id TEXT PRIMARY KEY, client_id TEXT, label TEXT, value TEXT, valid_from TEXT, valid_until TEXT);
  CREATE TABLE IF NOT EXISTS assets (id TEXT PRIMARY KEY, client_id TEXT, kind TEXT, palette_values TEXT, notes TEXT);
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
  CREATE TABLE IF NOT EXISTS findings (
    id TEXT PRIMARY KEY, version_id TEXT, client_id TEXT, type TEXT,
    severity TEXT DEFAULT 'medium', span_start INTEGER DEFAULT 0, span_end INTEGER DEFAULT 0,
    span_text TEXT DEFAULT '', source_type TEXT DEFAULT 'rule', source_id TEXT,
    source_text TEXT DEFAULT '', model_name TEXT, explanation TEXT DEFAULT '',
    suggested_fix TEXT, status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS precedents (
    id TEXT PRIMARY KEY, client_id TEXT, clause_id TEXT, finding_id TEXT,
    decision TEXT, reason TEXT, scope TEXT, expiry TEXT, decided_by TEXT,
    embedding TEXT, created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY, client_id TEXT, actor TEXT, action TEXT,
    target TEXT, details TEXT, created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, email TEXT UNIQUE, password_hash TEXT,
    name TEXT, role TEXT, client_access TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
`;

const TEST_CLIENT_ID = 'client_test_debugger';

let db: DatabaseSync;
let vault: VaultDb;
let debugger_: GuidelineDebuggerService;

beforeAll(() => {
  db = new DatabaseSync(':memory:');
  SCHEMA.split(';').filter(s => s.trim()).forEach(sql => db.exec(sql + ';'));

  vault = new VaultDb(db as any);
  debugger_ = new GuidelineDebuggerService(vault);

  // Seed a client
  vault.createClient({ id: TEST_CLIENT_ID, name: 'Test Debugger Client' });

  // Insert two clauses (one with high ambiguity potential)
  vault.insertClause(TEST_CLIENT_ID, {
    id: 'CL-01',
    version: 1,
    category: 'claims',
    text: 'All comparative superiority claims must be substantiated with third-party data.',
    is_active: 1
  });
  vault.insertClause(TEST_CLIENT_ID, {
    id: 'CL-02',
    version: 1,
    category: 'tone',
    text: 'Avoid excessive exclamation marks.',
    is_active: 1
  });

  // Insert a draft and draft version
  vault.insertDraft(TEST_CLIENT_ID, {
    id: 'draft-001',
    title: 'Summer Campaign Email',
    channel: 'email',
    status: 'draft',
    author: 'author@test.com'
  });
  vault.insertDraftVersion(TEST_CLIENT_ID, {
    id: 'dv-001',
    draft_id: 'draft-001',
    version_num: 1,
    text_content: "India's No. 1 brand — now offering a 20% discount! Best in class!!!"
  });

  // Insert a finding linked to the draft version
  vault.insertFinding(TEST_CLIENT_ID, {
    id: 'finding-001',
    version_id: 'dv-001',
    type: 'claim_violation',
    severity: 'high',
    span_start: 0,
    span_end: 25,
    span_text: "India's No. 1 brand",
    source_type: 'rule',
    source_id: 'CL-01',
    source_text: 'comparative superiority',
    explanation: 'Unsubstantiated comparative superiority claim.',
    status: 'pending'
  });

  // Insert a precedent for CL-01 (dismissed exception)
  vault.insertPrecedent(TEST_CLIENT_ID, {
    id: 'prec-001',
    clause_id: 'CL-01',
    finding_id: 'finding-001',
    decision: 'dismissed',
    reason: 'Client provided Nielsen survey data.',
    scope: 'this_campaign',
    expiry: null,
    decided_by: 'Brand Manager'
  });
  vault.insertPrecedent(TEST_CLIENT_ID, {
    id: 'prec-002',
    clause_id: 'CL-01',
    finding_id: 'finding-001',
    decision: 'exception_requested',
    reason: 'PR release, not a paid ad.',
    scope: 'one_draft',
    expiry: null,
    decided_by: 'Legal Lead'
  });
});

afterAll(() => {
  db.close();
});

// =====================================================================
// TEST SUITE: analyzeClauseAmbiguity
// =====================================================================
describe('GuidelineDebugger — analyzeClauseAmbiguity', () => {
  it('returns a report for each active clause', () => {
    const reports = debugger_.analyzeClauseAmbiguity(TEST_CLIENT_ID);
    expect(reports.length).toBeGreaterThanOrEqual(2);
  });

  it('computes a non-zero ambiguity score for the clause with precedents', () => {
    const reports = debugger_.analyzeClauseAmbiguity(TEST_CLIENT_ID);
    const cl01 = reports.find(r => r.clause_id === 'CL-01');
    expect(cl01).toBeDefined();
    // 1 dismissed (3.0) + 1 exception_requested (4.0) = 7.0 from precedents alone
    expect(cl01!.ambiguity_score).toBeGreaterThan(0);
  });

  it('reports clause with no precedents has zero override rate', () => {
    const reports = debugger_.analyzeClauseAmbiguity(TEST_CLIENT_ID);
    const cl02 = reports.find(r => r.clause_id === 'CL-02');
    expect(cl02).toBeDefined();
    expect(cl02!.override_rate).toBe(0);
  });

  it('sorts reports in descending ambiguity score order', () => {
    const reports = debugger_.analyzeClauseAmbiguity(TEST_CLIENT_ID);
    for (let i = 1; i < reports.length; i++) {
      expect(reports[i - 1].ambiguity_score).toBeGreaterThanOrEqual(reports[i].ambiguity_score);
    }
  });
});

// =====================================================================
// TEST SUITE: replayClauseImpact
// =====================================================================
describe('GuidelineDebugger — replayClauseImpact (Improvement 2)', () => {
  const explicitProposedText =
    "Comparative superiority claims like 'No. 1' or 'Best' are strictly prohibited " +
    "in paid ads, but permitted ONLY in press releases accompanied by an official audit.";

  const vagueProposedText =
    "Comparative superiority claims should generally be substantiated with data.";

  it('returns a valid ImpactReplayResult object', () => {
    const result = debugger_.replayClauseImpact(TEST_CLIENT_ID, 'CL-01', explicitProposedText);
    expect(result).toHaveProperty('clause_id', 'CL-01');
    expect(result).toHaveProperty('total_drafts_checked');
    expect(result).toHaveProperty('findings_resolved');
    expect(result).toHaveProperty('net_improvement');
    expect(result).toHaveProperty('affected_drafts');
    expect(Array.isArray(result.affected_drafts)).toBe(true);
  });

  it('resolves more findings for explicit scoped rewrites than vague ones', () => {
    const explicitResult = debugger_.replayClauseImpact(TEST_CLIENT_ID, 'CL-01', explicitProposedText);
    const vagueResult = debugger_.replayClauseImpact(TEST_CLIENT_ID, 'CL-01', vagueProposedText);

    // Explicit rewrites (containing ONLY, permitted, accompanied) should resolve more
    expect(explicitResult.findings_resolved).toBeGreaterThanOrEqual(vagueResult.findings_resolved);
  });

  it('net_improvement >= 0 (rewrites do not introduce new findings)', () => {
    const result = debugger_.replayClauseImpact(TEST_CLIENT_ID, 'CL-01', explicitProposedText);
    expect(result.net_improvement).toBeGreaterThanOrEqual(0);
  });

  it('total_drafts_checked is at least 1 (from seeded draft or mock)', () => {
    const result = debugger_.replayClauseImpact(TEST_CLIENT_ID, 'CL-01', explicitProposedText);
    expect(result.total_drafts_checked).toBeGreaterThanOrEqual(1);
  });

  it('affected_drafts rows contain required fields', () => {
    const result = debugger_.replayClauseImpact(TEST_CLIENT_ID, 'CL-01', explicitProposedText);
    for (const draft of result.affected_drafts) {
      expect(draft).toHaveProperty('draft_id');
      expect(draft).toHaveProperty('draft_title');
      expect(draft).toHaveProperty('findings_before');
      expect(draft).toHaveProperty('findings_after');
      expect(draft).toHaveProperty('delta');
    }
  });
});

// =====================================================================
// TEST SUITE: Clause Version History
// =====================================================================
describe('GuidelineDebugger — getClauseVersionHistory (Improvement 2)', () => {
  it('returns version history for a clause', () => {
    const history = debugger_.getClauseVersionHistory(TEST_CLIENT_ID, 'CL-01');
    expect(history.clause_id).toBe('CL-01');
    expect(Array.isArray(history.versions)).toBe(true);
    expect(history.versions.length).toBeGreaterThanOrEqual(1);
  });

  it('version 1 is active initially', () => {
    const history = debugger_.getClauseVersionHistory(TEST_CLIENT_ID, 'CL-01');
    const v1 = history.versions.find(v => v.version === 1);
    expect(v1).toBeDefined();
    expect(v1!.is_active).toBe(true);
  });
});

// =====================================================================
// TEST SUITE: acceptRewrite — Clause Versioning
// =====================================================================
describe('GuidelineDebugger — acceptRewrite + version history (Improvement 2)', () => {
  const newText =
    "Comparative superiority claims ('No. 1', 'Best') are prohibited in paid digital ads; " +
    "permitted ONLY in PR press releases with official third-party audit documentation.";

  it('creates version 2 and retires version 1', () => {
    const updated = debugger_.acceptRewrite(TEST_CLIENT_ID, 'CL-01', newText, 'Brand Manager');
    expect(updated.version).toBe(2);
    expect(updated.text).toBe(newText);
    expect(updated.is_active).toBe(1);
  });

  it('version history now shows 2 versions', () => {
    const history = debugger_.getClauseVersionHistory(TEST_CLIENT_ID, 'CL-01');
    expect(history.versions.length).toBe(2);
  });

  it('version 1 is retired (is_active = false)', () => {
    const history = debugger_.getClauseVersionHistory(TEST_CLIENT_ID, 'CL-01');
    const v1 = history.versions.find(v => v.version === 1);
    expect(v1!.is_active).toBe(false);
  });

  it('version 2 is now active', () => {
    const history = debugger_.getClauseVersionHistory(TEST_CLIENT_ID, 'CL-01');
    const v2 = history.versions.find(v => v.version === 2);
    expect(v2).toBeDefined();
    expect(v2!.is_active).toBe(true);
    expect(v2!.text).toBe(newText);
  });

  it('accepting another rewrite creates version 3', () => {
    const thirdText = 'Version 3 refinement of the comparative superiority rule.';
    const updated = debugger_.acceptRewrite(TEST_CLIENT_ID, 'CL-01', thirdText, 'Legal Lead');
    expect(updated.version).toBe(3);

    const history = debugger_.getClauseVersionHistory(TEST_CLIENT_ID, 'CL-01');
    expect(history.versions.length).toBe(3);
    const v3 = history.versions.find(v => v.version === 3);
    expect(v3!.is_active).toBe(true);
    // v2 should now be retired
    const v2 = history.versions.find(v => v.version === 2);
    expect(v2!.is_active).toBe(false);
  });
});
