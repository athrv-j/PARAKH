# Parakh (परख) — Production Readiness Audit Report

> **Document Version**: 1.0.0  
> **Date**: November 7, 2026  
> **Audited Workspace**: `e:\Parakh`  
> **Scope**: Full monorepo (`server`, `web`, `sample-data`, build & test pipelines)  
> **Status**: Comprehensive Technical Security & Architecture Review  
> **Verdict**: **NOT PRODUCTION READY (Prototype / Hackathon Showcase Stage)**

---

## Table of Contents

1. [Executive Summary & Readiness Scorecard](#1-executive-summary--readiness-scorecard)
2. [Category Deep-Dive Audits](#2-category-deep-dive-audits)
   - [2.1 Authentication & Authorization on Every API Route](#21-authentication--authorization-on-every-api-route)
   - [2.2 Client-Vault Isolation (Database vs UI)](#22-client-vault-isolation-database-vs-ui)
   - [2.3 Input Validation](#23-input-validation)
   - [2.4 File Upload Safety](#24-file-upload-safety)
   - [2.5 Secrets in Repository & Git History](#25-secrets-in-repository--git-history)
   - [2.6 Error Handling & Information Leakage](#26-error-handling--information-leakage)
   - [2.7 Rate Limiting & Resource Throttling](#27-rate-limiting--resource-throttling)
   - [2.8 Logging, Observability & Auditing](#28-logging-observability--auditing)
   - [2.9 Automated Tests & Test Coverage](#29-automated-tests--test-coverage)
   - [2.10 Continuous Integration (CI)](#210-continuous-integration-ci)
   - [2.11 Deployment Configuration & Infrastructure](#211-deployment-configuration--infrastructure)
3. [Threat Modeling & Attack Surfaces](#3-threat-modeling--attack-surfaces)
4. [Prioritized Fix Plan & Effort Estimates](#4-prioritized-fix-plan--effort-estimates)
5. [Target Production Architecture Specification](#5-target-production-architecture-specification)

---

## 1. Executive Summary & Readiness Scorecard

Parakh (परख) is architecturally sophisticated in its domain logic—featuring an automated Citation Gate, Intent-Lock surgical rewriters, a Brand Case Law precedent engine, and a dual-layer SQLite/Supabase schema with database-level `client_id` assertions.

However, the codebase currently functions as a **single-tenant local prototype / demo system**. It lacks boundary protections: API endpoints are unauthenticated, role authorizations are claimed via unverified request bodies, rate limiting is absent, error handlers leak raw exception messages, and there is no automated CI pipeline.

### Audit Scorecard

| # | Audit Item | Status | Risk Level | Primary Evidence Files |
|---|:---|:---:|:---:|:---|
| 1 | **Authentication & Authorization** | ❌ **FAIL** | **CRITICAL** | [`server/src/routes/review.ts`](file:///e:/Parakh/server/src/routes/review.ts), [`server/src/routes/clients.ts`](file:///e:/Parakh/server/src/routes/clients.ts), [`server/src/privacy/middleware.ts`](file:///e:/Parakh/server/src/privacy/middleware.ts) |
| 2 | **Client-Vault Isolation** | ⚠️ **PARTIAL** | **HIGH** | [`server/src/db/vaultDb.ts`](file:///e:/Parakh/server/src/db/vaultDb.ts), [`server/src/db/schema.sql`](file:///e:/Parakh/server/src/db/schema.sql), [`server/src/routes/clients.ts`](file:///e:/Parakh/server/src/routes/clients.ts) |
| 3 | **Input Validation** | ⚠️ **PARTIAL** | **MEDIUM** | [`server/src/routes/review.ts`](file:///e:/Parakh/server/src/routes/review.ts), [`server/src/routes/clients.ts`](file:///e:/Parakh/server/src/routes/clients.ts), [`server/src/review/llm/client.ts`](file:///e:/Parakh/server/src/review/llm/client.ts) |
| 4 | **File Upload Safety** | ⚠️ **PARTIAL** | **HIGH** | [`server/src/routes/clients.ts`](file:///e:/Parakh/server/src/routes/clients.ts), [`server/src/services/importer.ts`](file:///e:/Parakh/server/src/services/importer.ts) |
| 5 | **Secrets in Repository** | ✅ **PASS** | **LOW** | [`.gitignore`](file:///e:/Parakh/.gitignore), [`.env.example`](file:///e:/Parakh/.env.example), [`web/src/components/AuthModal.tsx`](file:///e:/Parakh/web/src/components/AuthModal.tsx) |
| 6 | **Error Handling** | ❌ **FAIL** | **HIGH** | [`server/src/index.ts`](file:///e:/Parakh/server/src/index.ts), [`server/src/routes/review.ts`](file:///e:/Parakh/server/src/routes/review.ts), [`web/src/main.tsx`](file:///e:/Parakh/web/src/main.tsx) |
| 7 | **Rate Limiting** | ❌ **FAIL** | **HIGH** | [`server/src/index.ts`](file:///e:/Parakh/server/src/index.ts), [`server/package.json`](file:///e:/Parakh/server/package.json) |
| 8 | **Logging & Observability** | ⚠️ **PARTIAL** | **MEDIUM** | [`server/src/db/vaultDb.ts`](file:///e:/Parakh/server/src/db/vaultDb.ts), [`server/src/index.ts`](file:///e:/Parakh/server/src/index.ts) |
| 9 | **Automated Tests** | ⚠️ **PARTIAL** | **MEDIUM** | [`server/tests/`](file:///e:/Parakh/server/tests/), [`web/package.json`](file:///e:/Parakh/web/package.json) |
| 10 | **Continuous Integration (CI)** | ❌ **FAIL** | **HIGH** | Repository root (No `.github/workflows` directory) |
| 11 | **Deployment Configuration** | ⚠️ **PARTIAL** | **HIGH** | [`server/src/index.ts`](file:///e:/Parakh/server/src/index.ts), [`package.json`](file:///e:/Parakh/package.json), [`.env.example`](file:///e:/Parakh/.env.example) |

**Totals**: **1 PASS**, **6 PARTIAL**, **4 FAIL**

---

## 2. Category Deep-Dive Audits

---

### 2.1 Authentication & Authorization on Every API Route
*Rating*: ❌ **FAIL** | *Risk*: **CRITICAL**

#### Findings
1. **Zero Route Guards or Authentication Middleware**:
   - In [`server/src/index.ts`](file:///e:/Parakh/server/src/index.ts#L25-L27) and [`server/src/routes/index.ts`](file:///e:/Parakh/server/src/routes/index.ts#L8-L10), all routes under `/api/clients` and `/api/review` are mounted without session validation, Bearer token extraction, or JWT verification.
   - Any unauthenticated HTTP client can invoke administrative, mutation, and read endpoints:
     - `POST /api/review/seed-showcase`: Unauthenticated database mutation.
     - `POST /api/clients`: Unauthenticated tenant creation.
     - `POST /api/clients/:id/knowledge`: Unauthenticated guideline import and clause overwriting.
     - `POST /api/review/clients/:id/debugger/accept`: Unauthenticated guideline rewriting.
     - `POST /api/review/clients/:id/facts/ripple`: Unauthenticated fact modifications.
     - `POST /api/review/clients/:id/drafts/:draftId/status`: Unauthenticated draft approvals.

2. **Self-Declared Authorization / Role Spoofing**:
   - In [`server/src/routes/review.ts#L254-L274`](file:///e:/Parakh/server/src/routes/review.ts#L254-L274) (`/findings/:findingId/resolve`) and [`#L312-L323`](file:///e:/Parakh/server/src/routes/review.ts#L312-L323) (`/drafts/:draftId/status`):
     ```typescript
     const { status, role, actorName } = req.body;
     workflow.transitionStatus(clientId, draftId, status, role || 'reviewer', actorName || 'Brand Reviewer');
     ```
   - The user role (`role`, `userRole`) and identity (`actorName`, `decidedBy`) are read directly from `req.body` without verifying against a cryptographic token (JWT) or server-side session. A user with the `creator` role can simply transmit `{ "role": "reviewer" }` or `{ "role": "manager" }` to unilaterally approve their own drafts and bypass multi-tier governance controls.

3. **Orphaned Vault Middleware**:
   - [`server/src/privacy/middleware.ts`](file:///e:/Parakh/server/src/privacy/middleware.ts#L17-L30) defines `requireClientVault(req, res, next)`. However, search across the codebase confirms this middleware is **never imported or registered** on any Express router.

#### Recommended Remediation
- Install and configure JWT verification middleware (e.g. Supabase Auth JWT verification via `@supabase/supabase-js` or `jsonwebtoken`).
- Extract the verified user ID from `req.user.sub` or token payload.
- Query user permissions from the database (`users.role`, `users.client_access`) before granting access to route handlers.
- Enforce Role-Based Access Control (RBAC) middleware per endpoint:
  - `POST /clients/:id/knowledge` -> Requires `manager` role.
  - `POST /clients/:id/drafts/:draftId/status` -> Requires `reviewer` or `manager` role.
  - `POST /clients/:id/debugger/accept` -> Requires `manager` role.

---

### 2.2 Client-Vault Isolation (Database vs UI)
*Rating*: ⚠️ **PARTIAL** | *Risk*: **HIGH**

#### Findings
1. **Strengths in Database Layer**:
   - In [`server/src/db/vaultDb.ts#L11-L15`](file:///e:/Parakh/server/src/db/vaultDb.ts#L11-L15), `assertClientId(clientId)` throws `ClientVaultViolationError` if `clientId` is missing or empty.
   - All helper methods in `VaultDb` parameterize queries with `client_id = ?`:
     - `getClauses(clientId)`: `SELECT * FROM clauses WHERE client_id = ? ...`
     - `getFacts(clientId)`: `SELECT * FROM facts WHERE client_id = ? ...`
     - `getDrafts(clientId)`: `SELECT * FROM drafts WHERE client_id = ? ...`
   - In [`server/src/db/schema.sql`](file:///e:/Parakh/server/src/db/schema.sql#L30), all operational tables enforce cascading foreign keys to `clients(id)`.
   - In [`server/src/db/supabase_schema.sql`](file:///e:/Parakh/server/src/db/supabase_schema.sql#L104-L125), full PostgreSQL Row-Level Security (RLS) policies are defined checking `client_id IN (SELECT jsonb_array_elements_text(client_access) FROM users WHERE users.id = auth.uid())`.

2. **Vulnerabilities at API Layer (Insecure Direct Object Reference - IDOR)**:
   - While `VaultDb` prevents accidental mixing of clients within a single function call, the **API layer accepts `:id` from the URL route parameter without checking if the calling user belongs to that client**.
   - For example:
     - User authenticated for `client_kavach` can issue `GET /api/clients/client_vyapar/knowledge` or `GET /api/review/clients/client_vyapar/drafts` and inspect all proprietary guidelines, pricing facts, and drafts of `client_vyapar`.
   - SQLite does not have native Row-Level Security (RLS); tenant isolation in SQLite relies 100% on application-level enforcement. Without a middleware checking `user.client_access.includes(req.params.id)`, client-vault isolation is broken at the HTTP layer.

#### Recommended Remediation
- Mount an active tenant authorization middleware on all `/clients/:id/*` routes:
  ```typescript
  export function authorizeVaultAccess(req: Request, res: Response, next: NextFunction) {
    const requestedVault = req.params.id || req.headers['x-client-id'];
    if (!req.user?.client_access?.includes(requestedVault)) {
      return res.status(403).json({ error: 'VaultAccessDenied', message: 'You do not have access to this client vault.' });
    }
    next();
  }
  ```
- Migrate production deployments to Supabase / PostgreSQL with active Row-Level Security (RLS).

---

### 2.3 Input Validation
*Rating*: ⚠️ **PARTIAL** | *Risk*: **MEDIUM**

#### Findings
1. **Partial Validation Present**:
   - In [`server/src/review/llm/client.ts#L3-L13`](file:///e:/Parakh/server/src/review/llm/client.ts#L3-L13), `Zod` schemas are effectively used to validate structured LLM JSON output (`LlmReviewResponseSchema`).
   - Basic presence checks exist on selected routes (e.g. [`server/src/routes/clients.ts#L25`](file:///e:/Parakh/server/src/routes/clients.ts#L25): `if (!id || !name)` and [`server/src/routes/review.ts#L112`](file:///e:/Parakh/server/src/routes/review.ts#L112): `if (!title || !text)`).

2. **Gaps & Risks**:
   - **No Schema Validation on API Requests**: Neither `zod`, `joi`, nor `express-validator` is used to validate HTTP request payloads (`req.body`, `req.query`, `req.params`).
   - **No String Length Bounds**: A malicious or automated request can submit a 50MB string in `text` or `title` to `POST /api/review/clients/:id/drafts`, forcing the server to run intensive regex and LLM evaluations, resulting in CPU exhaustion and API billing spikes.
   - **Unvalidated Enums**:
     - `POST /api/review/clients/:id/findings/:findingId/resolve`: `decision` is unvalidated against permitted values (`accepted`, `dismissed`, `exception`). Arbitrary strings can be injected.
     - `POST /api/review/clients/:id/drafts/:draftId/status`: `status` is not checked against `('draft' | 'in_review' | 'changes_requested' | 'approved')` at the route boundary.
   - **Identifier Sanitization**: `clientId` (e.g., `req.params.id`) is not validated against a slug pattern `^[a-zA-Z0-9_-]+$`.

#### Recommended Remediation
- Define Zod schemas for every API endpoint:
  ```typescript
  const CreateDraftSchema = z.object({
    title: z.string().min(1).max(200).trim(),
    channel: z.enum(['social', 'email', 'press_release', 'web']),
    text: z.string().min(1).max(50000),
    author: z.string().min(1).max(100).optional()
  });
  ```
- Implement a reusable Express validation middleware that parses and returns structured 400 Bad Request errors on invalid payloads.

---

### 2.4 File Upload Safety
*Rating*: ⚠️ **PARTIAL** | *Risk*: **HIGH**

#### Findings
1. **Current Safeguards**:
   - In [`server/src/routes/clients.ts#L9`](file:///e:/Parakh/server/src/routes/clients.ts#L9), `multer` is configured with an in-memory storage buffer and a 10MB file size limit:
     ```typescript
     const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit
     ```
   - Buffering in memory prevents arbitrary file uploads from persisting executable code into web root directories on the host server.

2. **Critical Vulnerabilities**:
   - **Extension-Only Type Checking**:
     In [`server/src/routes/clients.ts#L68-L70`](file:///e:/Parakh/server/src/routes/clients.ts#L68-L70):
     ```typescript
     const ext = req.file.originalname.split('.').pop()?.toLowerCase();
     const fileType = ext === 'docx' ? 'docx' : 'md';
     contentToParse = await importer.extractText(req.file.buffer, fileType);
     ```
     Validation relies purely on `req.file.originalname`. MIME types (`req.file.mimetype`) and magic bytes (file signatures) are not verified.
   - **Decompression Bomb (Zip Bomb) Vulnerability**:
     `.docx` files are zipped XML archives. `mammoth` processes the zip buffer in memory without zip bomb protection (checking decompressed file ratio or uncompressed payload size). An attacker can craft a 2MB nested zip that expands into gigabytes of XML, exhausting server memory (OOM crash).
   - **No Anti-Virus / Malware Scanning**: Uploaded documents are not scanned before extraction.

#### Recommended Remediation
- Use `file-type` to inspect file magic bytes (e.g. `PK\x03\x04` for docx, UTF-8 text for md).
- Reject files whose MIME type does not match `application/vnd.openxmlformats-officedocument.wordprocessingml.document` or `text/markdown`.
- Limit decompressed stream size in `docx` parsing to prevent memory exhaustion.
- Enforce strict filename sanitization to eliminate path traversal characters (`../`, `..\`).

---

### 2.5 Secrets in Repository & Git History
*Rating*: ✅ **PASS** | *Risk*: **LOW**

#### Findings
1. **Environment Configuration**:
   - [`.gitignore`](file:///e:/Parakh/.gitignore#L10-L14) explicitly excludes `.env`, `.env.local`, `.env.*.local`, `*.log`, and `*.db`.
   - [`.env.example`](file:///e:/Parakh/.env.example) contains only placeholder values (`your_groq_api_key_here`, `parakh_dev_jwt_secret_key_change_in_production_min32chars`).
2. **Git Commit History**:
   - Full git history check (`git log -S "GROQ_API_KEY" -p` and secret scanning) confirms **no live API keys or production secrets have ever been committed to the repository**.
3. **Observation / Advisory (Client-Side Storage)**:
   - In [`web/src/components/AuthModal.tsx#L21-L26`](file:///e:/Parakh/web/src/components/AuthModal.tsx#L21-L26) and [`web/src/lib/supabaseClient.ts#L34-L35`](file:///e:/Parakh/web/src/lib/supabaseClient.ts#L34-L35), user-entered Supabase configuration is written to browser `localStorage` (`parakh_supabase_url`, `parakh_supabase_key`).
   - While `VITE_SUPABASE_ANON_KEY` is designed to be public in Supabase architectures, if a client manager mistakenly pastes their `service_role` key into this modal, that secret becomes exposed to browser extensions and any XSS script.

#### Recommended Remediation
- Disable manual API key configuration in the browser UI for production builds (`import.meta.env.PROD`).
- Enforce standard deployment environment variables injected at build/server start time.

---

### 2.6 Error Handling & Information Leakage
*Rating*: ❌ **FAIL** | *Risk*: **HIGH**

#### Findings
1. **Information Leakage via Unhandled Exceptions**:
   - In [`server/src/index.ts#L47-L50`](file:///e:/Parakh/server/src/index.ts#L47-L50):
     ```typescript
     app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
       console.error('Unhandled server error:', err);
       res.status(500).json({ error: 'InternalServerError', message: err.message });
     });
     ```
   - In [`server/src/routes/clients.ts`](file:///e:/Parakh/server/src/routes/clients.ts#L17) and [`server/src/routes/review.ts`](file:///e:/Parakh/server/src/routes/review.ts#L36):
     ```typescript
     } catch (error: any) {
       res.status(500).json({ error: error.message });
     }
     ```
   - Raw database driver exceptions (e.g. SQLite table names, constraint violations, SQL syntax errors, file paths) are sent directly to client applications in HTTP responses. This exposes system internals to attackers during probe attacks.

2. **HTTP Status Code Flattening**:
   - Almost all failures return HTTP `500 Internal Server Error`, regardless of whether the error is client-caused (400 Bad Request, 404 Not Found, 409 Conflict) or server-caused.
   - For example: Attempting to insert a duplicate client in `POST /api/clients` throws a SQLite unique constraint error and returns `500` instead of `409 Conflict`.

3. **Frontend Resilience**:
   - In [`web/src/App.tsx#L149`](file:///e:/Parakh/web/src/App.tsx#L149), errors trigger blocking browser alerts (`alert(...)`).
   - In [`web/src/main.tsx`](file:///e:/Parakh/web/src/main.tsx), there is **no React Error Boundary**. Any unexpected rendering error in a child component (e.g. malformed finding span or diff) crashes the entire application into an unrecoverable white screen.

#### Recommended Remediation
- Introduce custom application error classes (`NotFoundError`, `ValidationError`, `ConflictError`, `UnauthorizedError`).
- Replace inline try/catches with a centralized Express error-handling middleware that strips stack traces and returns opaque error codes (e.g. `INTERNAL_SERVER_ERROR`, with a unique `requestId`) in non-development environments (`NODE_ENV === 'production'`).
- Wrap the frontend root in a top-level React `ErrorBoundary` component with a recovery fallback UI.

---

### 2.7 Rate Limiting & Resource Throttling
*Rating*: ❌ **FAIL** | *Risk*: **HIGH**

#### Findings
1. **Complete Absence of Rate Limiting**:
   - Neither `express-rate-limit`, Redis-backed rate limiting, nor Cloudflare IP throttling is configured.
   - Package audit of [`server/package.json`](file:///e:/Parakh/server/package.json) confirms no rate limiting package is installed.

2. **High-Cost Attack Surface**:
   - `POST /api/review/clients/:id/drafts`:
     - This endpoint triggers calls to external LLM providers (Groq LLaMA-3.3-70B) and runs compute-intensive deterministic matching loops.
     - An automated script can loop against this endpoint, causing immediate API rate limiting, financial billing depletion, and local server CPU exhaustion.
   - `POST /api/clients/:id/knowledge`:
     - Allows unthrottled 10MB document uploads and document parsing.
   - `POST /api/review/seed-showcase`:
     - Resets and populates the database; callable repeatedly without rate limits.

#### Recommended Remediation
- Install `express-rate-limit`:
  - General API limit: 100 requests per 15-minute window per IP.
  - Review & LLM evaluation limit: 10 requests per minute per IP / tenant.
  - File upload limit: 5 uploads per 10 minutes per IP.
- Deploy an edge reverse proxy (e.g., Cloudflare, AWS WAF, or Nginx) with IP-based rate limiting and DDoS protection.

---

### 2.8 Logging, Observability & Auditing
*Rating*: ⚠️ **PARTIAL** | *Risk*: **MEDIUM**

#### Findings
1. **Existing Database Audit Trail**:
   - [`server/src/db/vaultDb.ts#L288-L295`](file:///e:/Parakh/server/src/db/vaultDb.ts#L288-L295) implements `logAudit(clientId, actor, action, target, details)`.
   - Major business events are logged to the `audit_log` SQLite table:
     - Knowledge import ([`server/src/routes/clients.ts#L80`](file:///e:/Parakh/server/src/routes/clients.ts#L80))
     - Quick-capture precedent creation ([`server/src/routes/review.ts#L299`](file:///e:/Parakh/server/src/routes/review.ts#L299))
     - Finding decisions & status transitions ([`server/src/workflow/draftWorkflow.ts#L143`](file:///e:/Parakh/server/src/workflow/draftWorkflow.ts#L143))
     - Clause rewrite approvals ([`server/src/debugger/guidelineDebugger.ts#L146`](file:///e:/Parakh/server/src/debugger/guidelineDebugger.ts#L146))
     - Fact ripple propagations ([`server/src/facts/factRipple.ts#L122`](file:///e:/Parakh/server/src/facts/factRipple.ts#L122))

2. **Missing Operational & Production Observability**:
   - **No Structured Logger**: Uses unformatted `console.log()` and `console.error()`. No JSON log formatting (Pino, Winston).
   - **No HTTP Access Logging**: Lacks `morgan` or `pino-http`. Incoming requests (IP, route, method, response code, latency) are not logged.
   - **No Distributed Tracing / Request IDs**: Requests do not receive a correlation ID (`x-request-id`), making cross-service tracing impossible in production.
   - **No Metrics or Health Telemetry**: `/api/health` returns static JSON (`status: 'ok'`) without verifying database connectivity, storage availability, or external LLM API health.

#### Recommended Remediation
- Adopt `pino` and `pino-http` for high-performance structured JSON logging.
- Assign an RFC-4122 UUID (`req.id`) to every incoming request and propagate it through logs and responses.
- Upgrade `/api/health` into a comprehensive readiness/liveness probe checking SQLite read/write capability and memory pressure.

---

### 2.9 Automated Tests & Test Coverage
*Rating*: ⚠️ **PARTIAL** | *Risk*: **MEDIUM**

#### Findings
1. **Server-Side Test Strengths**:
   - [`server/tests/`](file:///e:/Parakh/server/tests/) contains **31 comprehensive unit tests** across 7 test suites, all passing (Vitest):
     - `vaultDb.test.ts` (8 tests): Enforces vault isolation and `ClientVaultViolationError`.
     - `privacyAndLeak.test.ts` (4 tests): Verifies regex masking of confidential terms.
     - `workflowAndCaseLaw.test.ts` (5 tests): Tests finding decisions and precedent retrieval.
     - `factRippleAndDebugger.test.ts` (4 tests): Tests fact dependency graphs and ambiguity scoring.
     - `deterministicChecks.test.ts` (2 tests): Benchmarks precision and recall against 40 ground truth drafts.
     - `citationAndIntentLock.test.ts` (6 tests): Validates Citation Gate dropping hallucinated quotes.
     - `importer.test.ts` (2 tests): Tests knowledge extraction.

2. **Major Testing Gaps**:
   - **Zero Frontend Tests**: [`web/package.json`](file:///e:/Parakh/web/package.json) contains **no test dependencies, test scripts, or test files**. Components such as `ReviewWorkspace`, `InteractiveUploadZone`, and `FactRippleBoard` have no unit or integration tests.
   - **No HTTP Route / API Integration Tests**: No tests use `supertest` to verify HTTP status codes, headers, parameter validation, or middleware execution.
   - **No Security / Auth Tests**: Because authentication middleware does not exist, there are no tests verifying unauthorized (401) or forbidden (403) scenarios.
   - **No End-to-End (E2E) Tests**: No Cypress or Playwright test suites to validate user workflows (draft creation -> review -> resolution -> approval).

#### Recommended Remediation
- Add Vitest + `@testing-library/react` to `web` workspace with component tests for core scenes.
- Add Supertest API integration tests in `server/tests/api/` covering all HTTP routes, valid/invalid inputs, and error states.
- Set up Playwright for E2E testing of the complete review workflow.

---

### 2.10 Continuous Integration (CI)
*Rating*: ❌ **FAIL** | *Risk*: **HIGH**

#### Findings
1. **No CI Pipeline Configured**:
   - Inspection of the repository confirms **no `.github/workflows` directory** or any CI configuration (`.gitlab-ci.yml`, `azure-pipelines.yml`, `.circleci`).
   - Pull requests and commits are not automatically checked for TypeScript compilation errors, lint regressions, or test failures.
2. **Missing Quality Gates**:
   - No pre-commit hooks (`husky`, `lint-staged`).
   - No dependency vulnerability scanning (`npm audit` in CI).
   - No automated build verification for the frontend and backend workspaces.

#### Recommended Remediation
- Create `.github/workflows/ci.yml` running on all pull requests and pushes to `main`:
  1. `npm ci`
  2. `npm run build` (verifies TypeScript on both `server` and `web`)
  3. `npm run test:run --workspace=server`
  4. `npm audit --audit-level=high`

---

### 2.11 Deployment Configuration & Infrastructure
*Rating*: ⚠️ **PARTIAL** | *Risk*: **HIGH**

#### Findings
1. **Production Build Capabilities**:
   - Monorepo build script [`package.json#L13`](file:///e:/Parakh/package.json#L13) successfully builds both packages:
     ```bash
     npm run build # runs tsc in server, tsc && vite build in web
     ```
   - In [`server/src/index.ts#L28-L44`](file:///e:/Parakh/server/src/index.ts#L28-L44), Express automatically detects and serves the compiled frontend (`web/dist`), enabling a clean unified full-stack server on a single port.
   - Start script [`server/package.json#L10`](file:///e:/Parakh/server/package.json#L10) runs compiled JavaScript via `node dist/index.js`.

2. **Critical Infrastructure Deficiencies**:
   - **No Containerization**: No `Dockerfile` or `docker-compose.yml`. Builds are environment-dependent.
   - **No Process Management**: No PM2 `ecosystem.config.cjs` or systemd service unit to manage worker clustering, automatic restarts, and memory ceilings.
   - **SQLite in Ephemeral Cloud Environments**:
     [`server/src/db/index.ts`](file:///e:/Parakh/server/src/db/index.ts) defaults to local file `parakh.db`. In modern containerized or serverless hosting (Docker, AWS ECS, Google Cloud Run, Render, Fly.io), local filesystem writes are ephemeral. Restarting a container wipes the SQLite database unless a persistent volume is specifically mounted.
   - **Missing Security Headers**: Express does not use `helmet`. Responses lack Content-Security-Policy (CSP), Strict-Transport-Security (HSTS), X-Frame-Options, and X-Content-Type-Options headers.
   - **Unrestricted CORS**: [`server/src/index.ts#L14`](file:///e:/Parakh/server/src/index.ts#L14) uses `app.use(cors())` with wildcard default settings (`*`), allowing any origin to make cross-origin requests.

#### Recommended Remediation
- Add a multi-stage `Dockerfile` producing a lean, production-grade container.
- Install and configure `helmet` in Express.
- Restrict `cors` to explicitly whitelisted production domain origins.
- Configure persistent volume mounts for `parakh.db` or complete the Supabase/PostgreSQL connection adapter for managed production database hosting.

---

## 3. Threat Modeling & Attack Surfaces

```
                    [ UNTRUSTED INTERNET ]
                               │
            ┌──────────────────┼──────────────────┐
            ▼                  ▼                  ▼
      [ Spoofed Role ]   [ Cross-Vault IDOR ] [ DoS / API Abuse ]
      Body claims role   URL requests another   Unthrottled 50MB
      'reviewer' to      client's knowledge     LLM review drafts
      auto-approve copy  without auth           & 10MB doc uploads
            │                  │                  │
            └──────────────────┼──────────────────┘
                               ▼
               [ PARAKH UNPROTECTED API ROUTES ]
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
   [ SQLite parakh.db ]                  [ External Groq API ]
   • DB enforces client_id                • Spammed requests exhaust
     queries, but API exposes               quotas and incur cost
     all IDs to any caller                • Sensitive text exposed if
   • Uncaught errors return                 masking is bypassed
     database schema internals
```

### Key Attack Vectors

1. **Privilege Escalation & Unauthorized Approvals**:
   - *Vector*: Attacker sends `POST /api/review/clients/client_kavach/drafts/DRAFT-01/status` with payload `{"status": "approved", "role": "reviewer"}`.
   - *Impact*: Bypasses brand manager review policies; non-compliant or illegal marketing materials marked as approved in audit log.

2. **Cross-Tenant Intelligence Theft (IDOR)**:
   - *Vector*: Authenticated client A queries `GET /api/clients/client_B/knowledge`.
   - *Impact*: Immediate exposure of Client B's confidential guideline clauses, strategic positioning rules, pricing facts, and banned vocabulary.

3. **Denial of Service (Resource & Quota Exhaustion)**:
   - *Vector*: Script spams `POST /api/review/clients/:id/drafts` with massive draft text blocks.
   - *Impact*: Groq API account hits rate limits (HTTP 429) and exhausts monetary quotas; Node.js event loop blocks on massive deterministic regex scans.

4. **Information Disclosure via Error Reflection**:
   - *Vector*: Triggering SQL constraint violations or invalid inputs.
   - *Impact*: Server returns stack traces and SQLite error messages revealing internal table names, column structures, and file paths.

---

## 4. Prioritized Fix Plan & Effort Estimates

The remediations are organized into four prioritized engineering phases.

```
Phase 0: Security & Auth (P0) ──► Phase 1: Stability & Validation (P1)
             │                                    │
             ▼                                    ▼
Phase 2: Observability & CI (P2) ──► Phase 3: Cloud & Production Hardening (P3)
```

| Phase | Priority | Scope | Tasks | Est. Effort |
|:---|:---:|:---|:---|:---:|
| **Phase 0** | **P0** | **Authentication & Vault Authorization Gate** | • Add JWT authentication middleware (Supabase Auth / JWT)<br>• Enforce user identity and RBAC per route<br>• Eliminate role spoofing in request bodies<br>• Validate `client_access` on all `/clients/:id` endpoints | **3 - 4 Days** |
| **Phase 1** | **P1** | **Input Validation, Upload Safety & Errors** | • Install Zod and create request validation schemas<br>• Implement MIME type & magic-byte check on file uploads<br>• Add zip bomb limit for docx parsing<br>• Centralized Express error handler (hide internals in prod)<br>• Add React Error Boundary in frontend | **2 - 3 Days** |
| **Phase 2** | **P2** | **Rate Limiting, Observability & CI** | • Install `express-rate-limit` (tiered by endpoint)<br>• Install `pino` and `pino-http` for structured logging<br>• Add request correlation IDs (`x-request-id`)<br>• Create GitHub Actions CI workflow (`.github/workflows/ci.yml`)<br>• Add API integration tests (`supertest`) | **2 - 3 Days** |
| **Phase 3** | **P3** | **Deployment, Security Headers & Containerization** | • Create multi-stage `Dockerfile` and `docker-compose.yml`<br>• Install `helmet` and configure secure CSP/HSTS<br>• Restrict CORS to explicit allowed origins<br>• Configure persistent storage volume for SQLite or migrate to Supabase Postgres | **2 Days** |

**Total Estimated Implementation Effort**: **9 – 12 Engineering Days** (approx. 2 weeks for a 2-person team).

---

## 5. Target Production Architecture Specification

For a production enterprise deployment of Parakh, the recommended architecture transitions from the local single-process model to a hardened multi-tier topology:

```
                            [ USER / ENTERPRISE BROWSER ]
                                          │
                                          ▼ HTTPS / TLS 1.3
                          [ CLOUDFLARE / AWS CLOUDFRONT ]
                          • DDoS Protection & Edge WAF
                          • Edge Rate Limiting (100 req/min)
                          • Strict SSL & Security Headers
                                          │
                                          ▼
                               [ NGINX REVERSE PROXY ]
                          • Reverse Proxy & SSL Termination
                          • Max Request Body Cap (15MB)
                          • Request Correlation ID Injection
                                          │
                        ┌─────────────────┴─────────────────┐
                        ▼                                   ▼
             [ PARAKH WEB (SPA) ]               [ PARAKH API (Node/Express) ]
             • Served from CDN / S3             • Node.js 22 LTS (Clustered)
             • React 18 + Strict CSP            • Helmet + CORS Whitelist
             • Supabase Auth Client             • Zod Validation Middleware
                                                • Pino Structured Logging
                                                            │
                                  ┌─────────────────────────┴─────────────────────────┐
                                  ▼                                                   ▼
                     [ SUPABASE POSTGRESQL ]                               [ GROQ LLM API (External) ]
                     • Row-Level Security (RLS)                            • LLaMA-3.3-70B Versatile
                     • Strict Tenant Isolation via auth.uid()              • PII / Masked Data Only
                     • Connection Pooling (PgBouncer)                      • Circuit Breaker & Fallback
                     • Automated Backups & WAL Archiving
```

---

## Conclusion & Next Steps

Parakh demonstrates exceptional innovation in its core domain—uncompromising brand governance, verbatim citation verification, and memory of past human decisions. 

Addressing the **P0 (Authentication & Vault Authorization)** and **P1 (Input Validation & Error Handling)** items outlined in this audit will elevate the platform from an outstanding hackathon prototype to an enterprise-grade, secure, multi-tenant brand governance platform ready for production deployment.