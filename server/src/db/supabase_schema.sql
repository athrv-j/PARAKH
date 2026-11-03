-- ============================================================================
-- PARAKH (परख) SUPABASE POSTGRESQL SCHEMA
-- Execute this script in your Supabase SQL Editor: Dashboard -> SQL Editor
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Clients Table (Vault Root)
CREATE TABLE IF NOT EXISTS public.clients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Users Table
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('creator', 'manager', 'reviewer', 'client_viewer')),
    client_access JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Clauses Table (Versioned)
CREATE TABLE IF NOT EXISTS public.clauses (
    id TEXT NOT NULL,
    client_id TEXT NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    version INTEGER NOT NULL DEFAULT 1,
    category TEXT NOT NULL, -- 'tone', 'terminology', 'claims', 'visuals', 'accessibility'
    text TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, client_id, version)
);

CREATE INDEX IF NOT EXISTS idx_supabase_clauses_client ON public.clauses(client_id, is_active);

-- 4. Terms Table
CREATE TABLE IF NOT EXISTS public.terms (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    term TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('preferred', 'banned')),
    replacement TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_supabase_terms_client ON public.terms(client_id);

-- 5. Facts Table
CREATE TABLE IF NOT EXISTS public.facts (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    value TEXT NOT NULL,
    valid_from TIMESTAMPTZ,
    valid_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_supabase_facts_client ON public.facts(client_id);

-- 6. Assets Table
CREATE TABLE IF NOT EXISTS public.assets (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    palette_values JSONB,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_supabase_assets_client ON public.assets(client_id);

-- 7. Drafts Table
CREATE TABLE IF NOT EXISTS public.drafts (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    channel TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'in_review', 'changes_requested', 'approved')),
    author TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_supabase_drafts_client ON public.drafts(client_id);

-- 8. Draft Versions Table
CREATE TABLE IF NOT EXISTS public.draft_versions (
    id TEXT PRIMARY KEY,
    draft_id TEXT NOT NULL REFERENCES public.drafts(id) ON DELETE CASCADE,
    client_id TEXT NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    version_num INTEGER NOT NULL DEFAULT 1,
    text_content TEXT NOT NULL,
    file_path TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_supabase_draft_versions_client ON public.draft_versions(client_id);

-- 9. Findings Table
CREATE TABLE IF NOT EXISTS public.findings (
    id TEXT PRIMARY KEY,
    version_id TEXT NOT NULL REFERENCES public.draft_versions(id) ON DELETE CASCADE,
    client_id TEXT NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK(severity IN ('low', 'medium', 'high', 'critical')),
    span_start INTEGER NOT NULL,
    span_end INTEGER NOT NULL,
    span_text TEXT NOT NULL,
    source_type TEXT NOT NULL CHECK(source_type IN ('rule', 'ai', 'precedent')),
    source_id TEXT,
    source_text TEXT NOT NULL,
    model_name TEXT,
    explanation TEXT NOT NULL,
    suggested_fix TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'dismissed', 'exception_requested')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_supabase_findings_version ON public.findings(version_id, client_id);

-- 10. Comments Table
CREATE TABLE IF NOT EXISTS public.comments (
    id TEXT PRIMARY KEY,
    version_id TEXT NOT NULL REFERENCES public.draft_versions(id) ON DELETE CASCADE,
    client_id TEXT NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    span_start INTEGER,
    span_end INTEGER,
    author TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Decisions Table
CREATE TABLE IF NOT EXISTS public.decisions (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    finding_id TEXT,
    clause_id TEXT NOT NULL,
    decision TEXT NOT NULL CHECK(decision IN ('accepted', 'dismissed', 'exception')),
    reason TEXT NOT NULL,
    scope TEXT NOT NULL CHECK(scope IN ('this_campaign', 'all_content')),
    expiry TIMESTAMPTZ,
    decided_by TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Precedents Table (Brand Case Law Store)
CREATE TABLE IF NOT EXISTS public.precedents (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    clause_id TEXT NOT NULL,
    finding_id TEXT,
    decision TEXT NOT NULL,
    reason TEXT NOT NULL,
    scope TEXT NOT NULL,
    expiry TIMESTAMPTZ,
    decided_by TEXT NOT NULL,
    embedding JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_supabase_precedents_client ON public.precedents(client_id, clause_id);

-- 13. Fact Links Table (Fact Ripple Dependency Graph)
CREATE TABLE IF NOT EXISTS public.fact_links (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    draft_version_id TEXT NOT NULL REFERENCES public.draft_versions(id) ON DELETE CASCADE,
    fact_id TEXT NOT NULL REFERENCES public.facts(id) ON DELETE CASCADE,
    claim_span TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Audit Log Table
CREATE TABLE IF NOT EXISTS public.audit_log (
    id TEXT PRIMARY KEY,
    client_id TEXT,
    actor TEXT NOT NULL,
    action TEXT NOT NULL,
    target TEXT NOT NULL,
    details JSONB,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS) Enablement
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clauses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.precedents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Allow authenticated and service role access
CREATE POLICY "Public read/write access for Parakh API" ON public.clients FOR ALL USING (true);
CREATE POLICY "Public read/write access for Parakh Clauses" ON public.clauses FOR ALL USING (true);
CREATE POLICY "Public read/write access for Parakh Terms" ON public.terms FOR ALL USING (true);
CREATE POLICY "Public read/write access for Parakh Facts" ON public.facts FOR ALL USING (true);
CREATE POLICY "Public read/write access for Parakh Drafts" ON public.drafts FOR ALL USING (true);
CREATE POLICY "Public read/write access for Parakh Findings" ON public.findings FOR ALL USING (true);
CREATE POLICY "Public read/write access for Parakh Precedents" ON public.precedents FOR ALL USING (true);
CREATE POLICY "Public read/write access for Parakh Audit" ON public.audit_log FOR ALL USING (true);
