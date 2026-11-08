-- ============================================================================
-- PARAKH (परख) SUPABASE POSTGRESQL SCHEMA WITH ROW-LEVEL SECURITY (RLS)
-- Multi-Tenant Isolation & Role-Based Access Control (RBAC)
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
    id TEXT PRIMARY KEY, -- matches auth.uid()
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('creator', 'manager', 'reviewer', 'client_viewer')),
    client_access JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of client_ids user is permitted to view/edit
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Clauses Table (Versioned)
CREATE TABLE IF NOT EXISTS public.clauses (
    id TEXT NOT NULL,
    client_id TEXT NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    version INTEGER NOT NULL DEFAULT 1,
    category TEXT NOT NULL CHECK(category IN ('tone', 'terminology', 'claims', 'visuals', 'accessibility')),
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

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) & ISOLATION FUNCTIONS
-- ============================================================================

-- Function: Returns client IDs user is authorized to access
CREATE OR REPLACE FUNCTION public.get_user_client_access()
RETURNS text[] AS $$
BEGIN
  RETURN ARRAY(
    SELECT jsonb_array_elements_text(client_access)
    FROM public.users
    WHERE public.users.id = auth.uid()::text
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function: Returns user's assigned role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text AS $$
BEGIN
  RETURN (
    SELECT role
    FROM public.users
    WHERE public.users.id = auth.uid()::text
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Enable RLS across all operational tables
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clauses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draft_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.precedents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fact_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- 1. Users policies: users can view their own profile
CREATE POLICY "users_self_select" ON public.users
  FOR SELECT TO authenticated
  USING (id = auth.uid()::text);

-- 2. Clients policies: only authorized clients visible
CREATE POLICY "clients_vault_select" ON public.clients
  FOR SELECT TO authenticated
  USING (id = ANY(public.get_user_client_access()));

CREATE POLICY "clients_manager_insert" ON public.clients
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() = 'manager');

-- 3. Clauses policies: read within client access, managers can write
CREATE POLICY "clauses_vault_select" ON public.clauses
  FOR SELECT TO authenticated
  USING (client_id = ANY(public.get_user_client_access()));

CREATE POLICY "clauses_manager_modify" ON public.clauses
  FOR ALL TO authenticated
  USING (client_id = ANY(public.get_user_client_access()) AND public.get_user_role() = 'manager')
  WITH CHECK (client_id = ANY(public.get_user_client_access()) AND public.get_user_role() = 'manager');

-- 4. Terms, Facts, Assets: read within client access, managers can modify
CREATE POLICY "terms_vault_select" ON public.terms
  FOR SELECT TO authenticated
  USING (client_id = ANY(public.get_user_client_access()));

CREATE POLICY "terms_manager_modify" ON public.terms
  FOR ALL TO authenticated
  USING (client_id = ANY(public.get_user_client_access()) AND public.get_user_role() = 'manager')
  WITH CHECK (client_id = ANY(public.get_user_client_access()) AND public.get_user_role() = 'manager');

CREATE POLICY "facts_vault_select" ON public.facts
  FOR SELECT TO authenticated
  USING (client_id = ANY(public.get_user_client_access()));

CREATE POLICY "facts_manager_modify" ON public.facts
  FOR ALL TO authenticated
  USING (client_id = ANY(public.get_user_client_access()) AND public.get_user_role() = 'manager')
  WITH CHECK (client_id = ANY(public.get_user_client_access()) AND public.get_user_role() = 'manager');

CREATE POLICY "assets_vault_select" ON public.assets
  FOR SELECT TO authenticated
  USING (client_id = ANY(public.get_user_client_access()));

CREATE POLICY "assets_manager_modify" ON public.assets
  FOR ALL TO authenticated
  USING (client_id = ANY(public.get_user_client_access()) AND public.get_user_role() = 'manager')
  WITH CHECK (client_id = ANY(public.get_user_client_access()) AND public.get_user_role() = 'manager');

-- 5. Drafts: isolation by vault, creators can create/edit draft, reviewers/managers can transition
CREATE POLICY "drafts_vault_select" ON public.drafts
  FOR SELECT TO authenticated
  USING (client_id = ANY(public.get_user_client_access()));

CREATE POLICY "drafts_creator_insert" ON public.drafts
  FOR INSERT TO authenticated
  WITH CHECK (
    client_id = ANY(public.get_user_client_access())
    AND public.get_user_role() IN ('creator', 'manager', 'reviewer')
  );

CREATE POLICY "drafts_status_update" ON public.drafts
  FOR UPDATE TO authenticated
  USING (
    client_id = ANY(public.get_user_client_access())
    AND (
      public.get_user_role() IN ('manager', 'reviewer')
      OR (public.get_user_role() = 'creator' AND status = 'draft')
    )
  );

-- 6. Draft versions
CREATE POLICY "draft_versions_vault_select" ON public.draft_versions
  FOR SELECT TO authenticated
  USING (client_id = ANY(public.get_user_client_access()));

CREATE POLICY "draft_versions_insert" ON public.draft_versions
  FOR INSERT TO authenticated
  WITH CHECK (
    client_id = ANY(public.get_user_client_access())
    AND public.get_user_role() IN ('creator', 'manager', 'reviewer')
  );

-- 7. Findings: read within client access, reviewers/managers can resolve
CREATE POLICY "findings_vault_select" ON public.findings
  FOR SELECT TO authenticated
  USING (client_id = ANY(public.get_user_client_access()));

CREATE POLICY "findings_insert" ON public.findings
  FOR INSERT TO authenticated
  WITH CHECK (client_id = ANY(public.get_user_client_access()));

CREATE POLICY "findings_resolve_update" ON public.findings
  FOR UPDATE TO authenticated
  USING (
    client_id = ANY(public.get_user_client_access())
    AND public.get_user_role() IN ('manager', 'reviewer')
  );

-- 8. Decisions & Precedents
CREATE POLICY "precedents_vault_select" ON public.precedents
  FOR SELECT TO authenticated
  USING (client_id = ANY(public.get_user_client_access()));

CREATE POLICY "precedents_reviewer_insert" ON public.precedents
  FOR INSERT TO authenticated
  WITH CHECK (
    client_id = ANY(public.get_user_client_access())
    AND public.get_user_role() IN ('manager', 'reviewer')
  );

CREATE POLICY "decisions_vault_select" ON public.decisions
  FOR SELECT TO authenticated
  USING (client_id = ANY(public.get_user_client_access()));

CREATE POLICY "decisions_reviewer_insert" ON public.decisions
  FOR INSERT TO authenticated
  WITH CHECK (
    client_id = ANY(public.get_user_client_access())
    AND public.get_user_role() IN ('manager', 'reviewer')
  );

-- 9. Fact links & Comments
CREATE POLICY "fact_links_vault_select" ON public.fact_links
  FOR SELECT TO authenticated
  USING (client_id = ANY(public.get_user_client_access()));

CREATE POLICY "comments_vault_select" ON public.comments
  FOR SELECT TO authenticated
  USING (client_id = ANY(public.get_user_client_access()));

CREATE POLICY "comments_insert" ON public.comments
  FOR INSERT TO authenticated
  WITH CHECK (client_id = ANY(public.get_user_client_access()));

-- 10. Audit log: read scoped to user client access, insert open to system
CREATE POLICY "audit_vault_select" ON public.audit_log
  FOR SELECT TO authenticated
  USING (client_id IS NULL OR client_id = ANY(public.get_user_client_access()));

CREATE POLICY "audit_system_insert" ON public.audit_log
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- 11. Backend Service Role Bypass (For background worker / migration maintenance)
CREATE POLICY "service_role_clients" ON public.clients FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_clauses" ON public.clauses FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_terms" ON public.terms FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_facts" ON public.facts FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_assets" ON public.assets FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_drafts" ON public.drafts FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_draft_versions" ON public.draft_versions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_findings" ON public.findings FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_precedents" ON public.precedents FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_audit" ON public.audit_log FOR ALL TO service_role USING (true) WITH CHECK (true);
