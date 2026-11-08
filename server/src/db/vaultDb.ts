import { DatabaseSync } from 'node:sqlite';
import { getDatabase } from './index.js';

export class ClientVaultViolationError extends Error {
  constructor(message = 'ClientVaultViolationError: Query helper requires an explicit, non-empty clientId') {
    super(message);
    this.name = 'ClientVaultViolationError';
  }
}

function assertClientId(clientId: unknown): asserts clientId is string {
  if (typeof clientId !== 'string' || !clientId.trim()) {
    throw new ClientVaultViolationError();
  }
}

export interface ClientRecord {
  id: string;
  name: string;
  created_at?: string;
}

export interface ClauseRecord {
  id: string;
  client_id: string;
  version: number;
  category: string;
  text: string;
  is_active?: number;
  created_at?: string;
}

export interface TermRecord {
  id: string;
  client_id: string;
  term: string;
  type: 'preferred' | 'banned';
  replacement?: string | null;
  created_at?: string;
}

export interface FactRecord {
  id: string;
  client_id: string;
  label: string;
  value: string;
  valid_from?: string | null;
  valid_until?: string | null;
  created_at?: string;
}

export interface AssetRecord {
  id: string;
  client_id: string;
  kind: string;
  palette_values?: string | null;
  notes?: string | null;
  created_at?: string;
}

export interface DraftRecord {
  id: string;
  client_id: string;
  title: string;
  channel: string;
  status: 'draft' | 'in_review' | 'changes_requested' | 'approved';
  author: string;
  created_at?: string;
}

export interface FindingRecord {
  id: string;
  version_id: string;
  client_id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  span_start: number;
  span_end: number;
  span_text: string;
  source_type: 'rule' | 'ai' | 'precedent';
  source_id?: string | null;
  source_text: string;
  model_name?: string | null;
  explanation: string;
  suggested_fix?: string | null;
  status: 'pending' | 'accepted' | 'dismissed' | 'exception_requested';
  created_at?: string;
}

export interface PrecedentRecord {
  id: string;
  client_id: string;
  clause_id: string;
  finding_id?: string | null;
  decision: string;
  reason: string;
  scope: string;
  expiry?: string | null;
  decided_by: string;
  embedding?: string | null;
  created_at?: string;
}

/**
 * Vault-Safe DB Helpers
 * Every helper interacting with client-scoped tables enforces non-empty clientId.
 */
export class VaultDb {
  private db: DatabaseSync;

  constructor(db?: DatabaseSync) {
    this.db = db || getDatabase();
  }

  // --- Clients (Global administration) ---
  createClient(client: ClientRecord): void {
    const stmt = this.db.prepare('INSERT OR REPLACE INTO clients (id, name) VALUES (?, ?)');
    stmt.run(client.id, client.name);
  }

  getClient(id: string): ClientRecord | undefined {
    return this.db.prepare('SELECT * FROM clients WHERE id = ?').get(id) as unknown as ClientRecord | undefined;
  }

  listClients(): ClientRecord[] {
    return this.db.prepare('SELECT * FROM clients ORDER BY name ASC').all() as unknown as ClientRecord[];
  }

  // --- Clauses ---
  insertClause(clientId: string, clause: Omit<ClauseRecord, 'client_id'>): void {
    assertClientId(clientId);
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO clauses (id, client_id, version, category, text, is_active)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      clause.id,
      clientId,
      clause.version ?? 1,
      clause.category,
      clause.text,
      clause.is_active ?? 1
    );
  }

  getClauses(clientId: string, activeOnly = true): ClauseRecord[] {
    assertClientId(clientId);
    const sql = activeOnly
      ? 'SELECT * FROM clauses WHERE client_id = ? AND is_active = 1 ORDER BY id ASC, version DESC'
      : 'SELECT * FROM clauses WHERE client_id = ? ORDER BY id ASC, version DESC';
    return this.db.prepare(sql).all(clientId) as unknown as ClauseRecord[];
  }

  getClauseById(clientId: string, clauseId: string): ClauseRecord | undefined {
    assertClientId(clientId);
    return this.db
      .prepare('SELECT * FROM clauses WHERE client_id = ? AND id = ? ORDER BY version DESC LIMIT 1')
      .get(clientId, clauseId) as unknown as ClauseRecord | undefined;
  }

  // --- Terms ---
  insertTerm(clientId: string, term: Omit<TermRecord, 'client_id'>): void {
    assertClientId(clientId);
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO terms (id, client_id, term, type, replacement)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(term.id, clientId, term.term, term.type, term.replacement || null);
  }

  getTerms(clientId: string): TermRecord[] {
    assertClientId(clientId);
    return this.db.prepare('SELECT * FROM terms WHERE client_id = ?').all(clientId) as unknown as TermRecord[];
  }

  // --- Facts ---
  insertFact(clientId: string, fact: Omit<FactRecord, 'client_id'>): void {
    assertClientId(clientId);
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO facts (id, client_id, label, value, valid_from, valid_until)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(fact.id, clientId, fact.label, fact.value, fact.valid_from || null, fact.valid_until || null);
  }

  getFacts(clientId: string): FactRecord[] {
    assertClientId(clientId);
    return this.db.prepare('SELECT * FROM facts WHERE client_id = ?').all(clientId) as unknown as FactRecord[];
  }

  // --- Drafts & Draft Versions ---
  insertDraft(clientId: string, draft: Omit<DraftRecord, 'client_id'>): void {
    assertClientId(clientId);
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO drafts (id, client_id, title, channel, status, author)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(draft.id, clientId, draft.title, draft.channel, draft.status, draft.author);
  }

  getDrafts(clientId: string): DraftRecord[] {
    assertClientId(clientId);
    return this.db.prepare('SELECT * FROM drafts WHERE client_id = ? ORDER BY created_at DESC').all(clientId) as unknown as DraftRecord[];
  }

  insertDraftVersion(
    clientId: string,
    version: { id: string; draft_id: string; version_num: number; text_content: string; file_path?: string }
  ): void {
    assertClientId(clientId);
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO draft_versions (id, draft_id, client_id, version_num, text_content, file_path)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(version.id, version.draft_id, clientId, version.version_num, version.text_content, version.file_path || null);
  }

  // --- Findings ---
  insertFinding(clientId: string, finding: Omit<FindingRecord, 'client_id'>): void {
    assertClientId(clientId);
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO findings (
        id, version_id, client_id, type, severity, span_start, span_end, span_text,
        source_type, source_id, source_text, model_name, explanation, suggested_fix, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      finding.id,
      finding.version_id,
      clientId,
      finding.type,
      finding.severity,
      finding.span_start,
      finding.span_end,
      finding.span_text,
      finding.source_type,
      finding.source_id || null,
      finding.source_text,
      finding.model_name || null,
      finding.explanation,
      finding.suggested_fix || null,
      finding.status
    );
  }

  getFindingsByVersion(clientId: string, versionId: string): FindingRecord[] {
    assertClientId(clientId);
    return this.db
      .prepare('SELECT * FROM findings WHERE client_id = ? AND version_id = ? ORDER BY span_start ASC')
      .all(clientId, versionId) as unknown as FindingRecord[];
  }

  // --- Precedents ---
  insertPrecedent(clientId: string, precedent: Omit<PrecedentRecord, 'client_id'>): void {
    assertClientId(clientId);
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO precedents (
        id, client_id, clause_id, finding_id, decision, reason, scope, expiry, decided_by, embedding
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      precedent.id,
      clientId,
      precedent.clause_id,
      precedent.finding_id || null,
      precedent.decision,
      precedent.reason,
      precedent.scope,
      precedent.expiry || null,
      precedent.decided_by,
      precedent.embedding || null
    );
  }

  getPrecedents(clientId: string, clauseId?: string): PrecedentRecord[] {
    assertClientId(clientId);
    if (clauseId) {
      return this.db
        .prepare('SELECT * FROM precedents WHERE client_id = ? AND clause_id = ? ORDER BY created_at DESC')
        .all(clientId, clauseId) as unknown as PrecedentRecord[];
    }
    return this.db
      .prepare('SELECT * FROM precedents WHERE client_id = ? ORDER BY created_at DESC')
      .all(clientId) as unknown as PrecedentRecord[];
  }

  // --- Audit Log ---
  logAudit(clientId: string | null, actor: string, action: string, target: string, details?: Record<string, unknown>): void {
    const stmt = this.db.prepare(`
      INSERT INTO audit_log (id, client_id, actor, action, target, details)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const id = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    stmt.run(id, clientId, actor, action, target, details ? JSON.stringify(details) : null);
  }
}
