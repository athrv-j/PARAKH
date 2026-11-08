-- Parakh Schema (SQLite)
-- Strict Client Vault Isolation: Every operational table has client_id with foreign key constraints.

-- 1. Clients Table (Vault Root)
CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users Table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    password_hash TEXT,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('creator', 'manager', 'reviewer', 'client_viewer')),
    client_access TEXT NOT NULL DEFAULT '["client_kavach","client_vyapar","client_mitti"]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Clauses Table (Versioned)
CREATE TABLE IF NOT EXISTS clauses (
    id TEXT NOT NULL, -- e.g. 'C-4.2'
    client_id TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    category TEXT NOT NULL, -- 'tone', 'terminology', 'claims', 'visuals', 'accessibility'
    text TEXT NOT NULL, -- Verbatim text for citation verification
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id, client_id, version),
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_clauses_client ON clauses(client_id, is_active);

-- 4. Terms Table
CREATE TABLE IF NOT EXISTS terms (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    term TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('preferred', 'banned')),
    replacement TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_terms_client ON terms(client_id);

-- 5. Facts Table
CREATE TABLE IF NOT EXISTS facts (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    label TEXT NOT NULL,
    value TEXT NOT NULL,
    valid_from DATETIME,
    valid_until DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_facts_client ON facts(client_id);

-- 6. Assets Table
CREATE TABLE IF NOT EXISTS assets (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    kind TEXT NOT NULL, -- 'color_palette', 'typography', 'logo', 'imagery'
    palette_values TEXT, -- JSON array of hex colors or token config
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_assets_client ON assets(client_id);

-- 7. Drafts Table
CREATE TABLE IF NOT EXISTS drafts (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    title TEXT NOT NULL,
    channel TEXT NOT NULL, -- 'social', 'email', 'press_release', 'web'
    status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'in_review', 'changes_requested', 'approved')),
    author TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_drafts_client ON drafts(client_id);

-- 8. Draft Versions Table
CREATE TABLE IF NOT EXISTS draft_versions (
    id TEXT PRIMARY KEY,
    draft_id TEXT NOT NULL,
    client_id TEXT NOT NULL,
    version_num INTEGER NOT NULL DEFAULT 1,
    text_content TEXT NOT NULL,
    file_path TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (draft_id) REFERENCES drafts(id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_draft_versions_client ON draft_versions(client_id);

-- 9. Findings Table
CREATE TABLE IF NOT EXISTS findings (
    id TEXT PRIMARY KEY,
    version_id TEXT NOT NULL,
    client_id TEXT NOT NULL,
    type TEXT NOT NULL, -- 'tone', 'terminology', 'messaging', 'visual', 'accessibility', 'unsupported_claim', 'fact_mismatch'
    severity TEXT NOT NULL CHECK(severity IN ('low', 'medium', 'high', 'critical')),
    span_start INTEGER NOT NULL,
    span_end INTEGER NOT NULL,
    span_text TEXT NOT NULL,
    source_type TEXT NOT NULL CHECK(source_type IN ('rule', 'ai', 'precedent')),
    source_id TEXT, -- Clause ID, Fact ID, or Precedent ID
    source_text TEXT NOT NULL, -- Exact quoted evidence
    model_name TEXT, -- Disclosed model or 'rule_engine'
    explanation TEXT NOT NULL,
    suggested_fix TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'dismissed', 'exception_requested')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (version_id) REFERENCES draft_versions(id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_findings_version ON findings(version_id, client_id);

-- 10. Comments Table
CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    version_id TEXT NOT NULL,
    client_id TEXT NOT NULL,
    span_start INTEGER,
    span_end INTEGER,
    author TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (version_id) REFERENCES draft_versions(id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- 11. Decisions Table
CREATE TABLE IF NOT EXISTS decisions (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    finding_id TEXT,
    clause_id TEXT NOT NULL,
    decision TEXT NOT NULL CHECK(decision IN ('accepted', 'dismissed', 'exception')),
    reason TEXT NOT NULL,
    scope TEXT NOT NULL CHECK(scope IN ('this_campaign', 'all_content')),
    expiry DATETIME,
    decided_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- 12. Precedents Table (Brand Case Law Store)
CREATE TABLE IF NOT EXISTS precedents (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    clause_id TEXT NOT NULL,
    finding_id TEXT,
    decision TEXT NOT NULL,
    reason TEXT NOT NULL,
    scope TEXT NOT NULL,
    expiry DATETIME,
    decided_by TEXT NOT NULL,
    embedding TEXT, -- JSON array of floats for local vector matching
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_precedents_client ON precedents(client_id, clause_id);

-- 13. Fact Links (Fact Ripple Dependency Graph)
CREATE TABLE IF NOT EXISTS fact_links (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    draft_version_id TEXT NOT NULL,
    fact_id TEXT NOT NULL,
    claim_span TEXT NOT NULL, -- JSON or serialized span info
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (draft_version_id) REFERENCES draft_versions(id) ON DELETE CASCADE,
    FOREIGN KEY (fact_id) REFERENCES facts(id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_fact_links_fact ON fact_links(fact_id, client_id);

-- 14. Audit Log
CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY,
    client_id TEXT,
    actor TEXT NOT NULL,
    action TEXT NOT NULL,
    target TEXT NOT NULL,
    details TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_log_client ON audit_log(client_id);

-- 15. LLM Response Cache (Resilience & Cost Optimization)
CREATE TABLE IF NOT EXISTS llm_cache (
    key TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    findings TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_llm_cache_client ON llm_cache(client_id);
