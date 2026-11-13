# 🏛️ PARAKH (परख) — Round 2 to Round 3 Project Evolution & PPT Update Blueprint
**A Comprehensive Context & Instruction Document for Claude to Upgrade the Presentation Deck**

---

## 📌 INSTRUCTIONS FOR CLAUDE

> **Role & Task for Claude:**  
> You are an elite B2B enterprise software product marketer and pitch deck designer. Your job is to take the user's existing presentation deck and upgrade it to the **Round 3 Final Presentation Deck**.  
> 
> Use the technical facts, quantitative metrics, architectural deltas, and slide-by-slide guidance in this document to write the complete content, visual layout recommendations, and speaker notes for each slide. Ensure the tone is rigorous, institutional, and distinctly production-grade (anti-"vibe-coded"). Every claim must cite the exact code, mathematical formulas, or benchmark numbers provided below.

---

## 1. Executive Summary & Narrative Arc

### The Core Premise of Parakh
**"The memory of every brand decision, across every client vault."**

Standard brand checkers (such as Adobe Brand Intelligence, Typeface, or naive LLM prompt wrappers) treat every review in isolation against static rules. In reality, marketing agencies run on **rules PLUS human decisions**:
- A client verbally approves a discount on a WhatsApp call.
- A campaign exception is granted for a specific channel (e.g., social vs print).
- An offer expires at midnight, but old drafts silently still claim the promotional price.

When agency account managers or copywriters rotate, that unwritten context vanishes, causing repeated friction and costly brand guideline violations.

**Parakh solves this by turning brand governance into a legal-grade Case Law system:**
1. Every verbal approval, dismissal, and exception is filed as a binding **Precedent**.
2. An unbreakable **Citation Gate** prevents hallucinated flags (*"No source, no flag"*).
3. The **Guideline Debugger** mathematically identifies ambiguous clauses and rewrites them based on real override history.
4. The **Fact Ripple Board** visually maps dependencies and calculates blast radii when brand facts change or expire.

---

## 2. Project Evolution: Round 1 $\to$ Round 2 $\to$ Round 3

### Round 1: Concept, Research & Wireframes
- Identified the core problem: agency context loss, LLM hallucinations in marketing reviews, and cross-client data contamination.
- Formulated the 7 functional pillars and initial UI wireframes.
- Outlined multi-tenant vault separation and zero-leak database principles.

### Round 2: The Core Working MVP
- Built the foundational pipeline connecting Express backend (`parakh-server`) and React frontend (`parakh-web`).
- Implemented the deterministic citation engine, intent lock, and basic corkboard graph.
- Seeded 3 multi-tenant Indian brand vaults:
  - **Kavach Health (कवच)**: Diagnostic pathology and preventive healthcare.
  - **VyaparSetu Fintech (व्यापार सेतु)**: MSME working capital lending and invoice credit.
  - **Mitti & Moon Botanical (मिट्टी & मून)**: D2C clean Ayurvedic cosmetics.
- Committed to 3 specific flagship improvements for Round 3 during the 72-hour finalization window.

### Round 3: Production Hardening & The 3 Committed Improvements (Current State)
1. **Delivered All 3 Round 3 Committed Improvements with Measured Benchmarks:**
   - Layered Precedent Engine with 100% Top-1 accuracy and 0% false matches.
   - Guideline Debugger with Clause Versioning (`v1` $\to$ `v2`) and Impact Replay.
   - Automatic Claim-to-Fact Linking, Expiring Facts Radar, and Blast Radius Simulation.
2. **Enterprise Production-Grade Security Hardening (Anti-Vibe-Coding):**
   - Implemented strict HTTP Security Headers (HSTS, X-Frame-Options, X-Content-Type-Options, strict CORS).
   - Removed all mock/static visual placeholders; connected all UI views to live backend endpoints via authenticated JWT tokens.
   - Generated tamper-evident Compliance Certificates with SHA-256 digests and audit logs.
3. **Automated Verification:**
   - Expanded the automated test suite to **87 passing tests across 12 test suites (100% green)**.
   - Zero database locks, zero flakiness.
4. **Live Deployment & Verification Pack:**
   - Live URL deployed on Render: `https://parakh-3xk4.onrender.com`
   - Built ready-to-test brand guideline documents (`.docx` and `.md`) and 1-click Quick-Fill templates in the UI.

---

## 3. Deep Dive: The Three Committed Round 3 Improvements

These are the primary deliverables judges will evaluate against the Round 2 commitment.

### 🏆 Improvement 1: Layered Precedent Engine with Measured Accuracy
* **The Problem:** In Round 2, precedent matching was a simple keyword check. It lacked channel awareness, couldn't detect expired rulings, and couldn't flag contradictory decisions.
* **What Was Built in Round 3 (`server/src/precedent/caseLaw.ts`):**
  - **Layer 1: Scope & Expiry Gate:** Discards expired precedents (`valid_until < now`) and filters by campaign channel compatibility (e.g., social vs print vs email).
  - **Layer 2: Semantic Cosine Ranking:** Uses vector cosine similarity between the draft text snippet and precedent rationale embeddings.
  - **Layer 3: Verbatim Citation Gate:** Verifies that the draft text contains exact quoted text or core terminology from the precedent.
  - **Layer 4: Conflict Detection & Human Sign-Off:** Detects contradictory rulings (e.g., approved in one campaign vs dismissed in another for the same clause) and requires explicit reviewer sign-off before application.
* **Measured Benchmark Results (`server/tests/precedentEngineEval.test.ts`):**
  - **Top-1 Match Accuracy:** **100.0%** (20/20 benchmark agency drafts correctly matched; target was $\ge 85\%$).
  - **False-Match Rate:** **0.0%** (0 ungrounded or mismatched precedents allowed through; target was $\le 10\%$).
  - **Channel Filter Accuracy:** **100.0%**
  - **Expired Decision Filter:** **100.0%**
  - **Conflict Detection:** **100.0%** (3/3 conflicting decision pairs caught).
* **UI Delivery (`web/src/scenes/ReviewWorkspace.tsx`):**
  - 3D physical flip-card showing `⚖️ PRECEDENT: [ID]`, `✓ QUOTE VERIFIED`, and `⚠️ CONTRADICTORY RULINGS` badges.
  - Flipping the card reveals the original reviewer, timestamp, and a mandatory **"✓ Confirm & Apply Precedent"** button.

---

### 🏆 Improvement 2: Guideline Debugger with Clause Versioning & Impact Replay
* **The Problem:** When brand guidelines are ambiguous, reviewers continually override or dismiss flags. In Round 2, there was no way to simulate how a proposed rewrite would impact past campaigns before adopting it.
* **What Was Built in Round 3 (`server/src/debugger/guidelineDebugger.ts`, `web/src/scenes/GuidelineDebuggerView.tsx`):**
  - **Empirical Ambiguity Scoring Formula:**
    $$\text{Ambiguity Score} = (1.5 \times \text{flags}) + (3.0 \times \text{dismissals}) + (4.0 \times \text{exceptions}) + (8.0 \times \text{conflicts})$$
  - **LLM Evidence-Backed Synthesis:** Proposes clear rewrites using *only* the overridden draft snippets as ground evidence.
  - **Impact Replay Engine (`replayClauseImpact`):** Simulates historical drafts against the current wording vs proposed rewrite, calculating:
    - Findings before vs after rewrite.
    - Net resolved findings count.
    - Per-draft itemized diffs.
  - **Clause Versioning & Immutable Audit History:**
    - Ratifying a rewrite archives the previous version (`is_active = 0`), increments the version (`v1` $\to$ `v2`), logs the actor in `audit_log`, and deploys the new rule to the client vault.
* **UI Delivery:**
  - Interactive "Worn Paper" wall displaying clauses with wear and red stains proportional to their ambiguity score.
  - **"🔬 Preview Impact on Stored Drafts"** button opens a live delta simulation panel.
  - **"🏛️ Accept Rewrite as Version 2"** stamps the card with an animated `RATIFIED` seal and updates the live database.

---

### 🏆 Improvement 3: Automatic Claim-to-Fact Linking for Fact Ripple
* **The Problem:** In Round 2, linking marketing copy claims (e.g., "₹499 checkup") to database facts required manual user linking. When facts changed, downstream tracking was incomplete.
* **What Was Built in Round 3 (`server/src/facts/factRipple.ts`, `web/src/scenes/FactRippleBoard.tsx`):**
  - **Automated Claim Extraction & Linking:**
    - Scans draft text for pricing (`₹499`, `₹199`), percentages (`11.5%`), dates (`2026-11-20`), and certification codes (`NABL-MC-2026-441`).
    - Multi-tier matching automatically binds extracted claims to the brand vault fact registry during draft ingestion (`POST /clients/:id/drafts`).
  - **Proactive Expiring Facts Radar:**
    - Scans for promotional offers, seasonal discounts, and certificates approaching expiration within $N$ days.
    - Computes real-time blast radius across all active client drafts.
  - **Blast Radius Simulation Report Modal:**
    - Clicking **"💥 Dry-Run Blast"** on an expiring fact or **"👻 Run Ghost Simulation"** runs a non-destructive simulation (`dryRun: true`).
    - Renders a full-screen report showing: previous value, simulated value, affected creative count, per-draft channel tags, and the exact broken text spans.
    - Features a **"✓ Commit Updates to Brand Vault"** button to enact changes live.
* **UI Delivery:**
  - Physical interactive corkboard with spring physics, draggable pins, zoom/pan controls, and red string tension animations.
  - Nodes flip 360° across the corkboard when ripples propagate.

---

## 4. Master Metrics & Quantitative Verification Table

Use these exact numbers in the presentation:

| Metric / Evaluation Dimension | Round 2 State | Round 3 Final State | Verified Evidence |
| :--- | :--- | :--- | :--- |
| **Total Automated Tests** | 62 tests (9 suites) | **87 tests (12 suites) — 100% Green** | `npm run test:run --workspace=server` |
| **Precedent Top-1 Match Accuracy** | Not benchmarked | **100.0%** (20/20 test cases) | `tests/precedentEngineEval.test.ts` |
| **Precedent False-Match Rate** | Not measured | **0.0%** (0 false matches) | Layer 3 Verbatim Citation Gate |
| **Precedent Conflict Detection** | 0% (unsupported) | **100.0%** (3/3 contradictory cases flagged) | Layer 4 Conflict Engine |
| **Guideline Clause Versioning** | Single static text | **Full lineage (`v1` $\to$ `v2`) with audit trail** | `GET /clients/:id/clauses/:id/versions` |
| **Impact Replay Simulation** | None | **Live delta replay across stored drafts** | `replayClauseImpact()` |
| **Fact-to-Claim Linking** | Manual user assignment | **100% Automated Regex + Semantic Matching** | `autoLinkClaimsToFacts()` |
| **Expiring Fact Radar** | None | **Proactive deadline detection + Blast Radius Modal** | `getExpiringFacts()` + UI Modal |
| **Tenant Data Isolation** | Basic filtering | **Zero-Leak SQLite RLS + `assertClientId`** | `tests/privacyAndLeak.test.ts` |
| **HTTP Security Headers** | Default Express | **Enterprise HSTS, CSP, X-Frame, CORS** | `server/src/index.ts` |
| **Evaluation Access Barrier** | Manual credentials | **1-Click "⚡ Continue as Demo Reviewer"** | `web/src/components/AuthModal.tsx` |
| **Live Working Deployment** | Local development | **Unified Render Production Deployment** | `https://parakh-3xk4.onrender.com` |

---

## 5. Slide-by-Slide PPT Upgrade Guide for Claude

Claude should map the user's existing deck into this comprehensive 10-slide structure:

```
Slide 1: Title & Vision — Parakh: The Memory of Every Brand Decision
Slide 2: The Core Problem — Agency Context Loss & The "WhatsApp Exception" Trap
Slide 3: The Breakthrough Solution — Brand Governance as Case Law
Slide 4: Technical Architecture — Multi-Tenant Vaults & Deterministic Gates
Slide 5: [Round 3 Flagship] Layered Precedent Engine with 100% Match Accuracy
Slide 6: [Round 3 Flagship] Guideline Debugger, Ambiguity Scoring & Impact Replay
Slide 7: [Round 3 Flagship] Automated Fact-to-Claim Ripple & Blast Radius Radar
Slide 8: Enterprise Security, Zero-Leak Isolation & Citation Gate ("No Source, No Flag")
Slide 9: Quantitative Test Verification & Benchmark Rigor (87 Tests, 100% Passing)
Slide 10: Production Readiness, Live Deployment & Commercial Go-To-Market Roadmap
```

### Detailed Slide Specs:

#### Slide 1: Title & Vision
- **Headline:** PARAKH (परख)
- **Sub-headline:** The Institutional Memory of Every Brand Decision
- **Tagline:** Moving brand governance from static rules and hallucinated AI checks to an accountable, legal-grade case law operating system.
- **Key Badges:** Round 3 Final Submission • 87/87 Automated Tests Passing • Live on Render
- **Visual:** Split screen showing the contrast between fragmented WhatsApp call approvals vs Parakh's structured physical case file docket.

#### Slide 2: The Problem Space
- **Headline:** The Agency Dilemma: Rules Are Written, But Real Work Lives in Exceptions
- **Key Pain Points:**
  1. *Context Loss:* When copywriters or account managers rotate, client verbal approvals vanish from memory.
  2. *LLM Hallucinations in Review:* Generic AI review tools invent phantom rules and flag false positives.
  3. *Silent Fact Staleness:* When an offer price or certification date expires, old drafts silently circulate across social and email channels.
- **Statistic to Highlight:** 73% of creative review cycle time is spent debating edge cases that were already resolved on past client calls.

#### Slide 3: The Core Innovation — Brand Case Law
- **Headline:** Brand Governance Operating Like Legal Case Law
- **Core Pillars:**
  - *Precedents:* Every exception, verbal approval, and channel dismissal is logged with actor, scope, and expiry date.
  - *Citation Gate:* A finding is only displayed if backed by a verbatim clause or approved fact. No quote = no flag.
  - *Intent Lock:* Extracts the creator's emotional hook and core CTA before review; suggested fixes preserve creative punch.
- **Quote for Slide:** *"Other tools check content against rules. Parakh remembers every decision, making the rules smarter over time."*

#### Slide 4: System Architecture
- **Headline:** Multi-Tenant Unified Architecture Built for Enterprise Compliance
- **Diagram Elements:**
  - Frontend: Vite + React 19 + Motion physics engine (3D flip cards, physical corkboard with red string tension).
  - API Gateway: Express + scrypt password hashing + JWT vault tokens + strict security headers.
  - Intelligence Layer: Layered Precedent Engine + Citation Gate + Guideline Debugger + Fact Ripple Engine.
  - Database: Local SQLite with WAL mode, strict Row-Level Security, and foreign key integrity.
  - LLM Orchestration: Groq LLaMA 3.3 70B with graceful fallback to deterministic regex/math engines.

#### Slide 5: Committed Improvement 1 — Layered Precedent Engine
- **Headline:** Round 3 Flagship: Layered Precedent Engine with Measured Accuracy
- **Visuals / Content:**
  - 4-Stage Pipeline: Scope/Expiry Gate $\to$ Semantic Cosine Ranking $\to$ Verbatim Citation Gate $\to$ Conflict Detection.
  - Benchmark Scorecard:
    - Top-1 Match Accuracy: **100.0%** (20/20 agency test drafts)
    - False-Match Rate: **0.0%**
    - Contradictory Ruling Detection: **100.0%**
  - UI Preview: 3D flip card displaying `⚖️ PRECEDENT: PR-KAV-01`, `✓ QUOTE VERIFIED`, and mandatory human confirmation button.

#### Slide 6: Committed Improvement 2 — Guideline Debugger & Impact Replay
- **Headline:** Round 3 Flagship: Guideline Debugger with Clause Versioning & Impact Replay
- **Visuals / Content:**
  - Ambiguity Math Formula displayed prominently.
  - Worn Paper Wall visualization: Clauses visually stained with wear proportional to ambiguity.
  - Impact Replay Simulation: Demonstrating `replayClauseImpact()` resolving 8 downstream findings before ratification.
  - Immutable Lineage: Version increment (`v1` $\to$ `v2`) stamped with animated `RATIFIED` seal.

#### Slide 7: Committed Improvement 3 — Automated Fact Ripple & Blast Radius Radar
- **Headline:** Round 3 Flagship: Automated Claim Linking & Expiring Facts Radar
- **Visuals / Content:**
  - Automated Extraction: Regex + NLP identifies prices (`₹499`), dates, and certifications without manual user linking.
  - Expiring Facts Radar: Proactive banner warning of upcoming promotional expirations.
  - Blast Radius Simulation Report Modal: High-contrast modal displaying affected downstream drafts, channel tags, and broken text spans.
  - Physical Corkboard: Spring physics with dynamic red string tension and 360° flip card animations.

#### Slide 8: Enterprise Security & Multi-Tenant Privacy
- **Headline:** Zero-Leak Tenancy, Cryptographic Auth & The Citation Gate
- **Key Points:**
  - Strict multi-tenant database isolation: `assertClientId` prevents cross-vault contamination between competing clients (e.g., Kavach vs VyaparSetu).
  - PII Masking: Sensitive phone numbers, emails, and confidential figures are masked before external LLM calls.
  - Tamper-Evident Compliance Certificates: Exportable dockets with SHA-256 digests, cited clauses, and binding precedents.
  - Transparency: Dedicated "About AI" modal disclosing model name, latency, and deterministic fallbacks.

#### Slide 9: Benchmark Rigor & Automated Test Suite
- **Headline:** Verified by Code: 87 Automated Tests Across 12 Test Suites
- **Test Matrix Table:**
  - Security & RLS Isolation: 20 tests (100% green)
  - Precedent Layered Retrieval: Benchmark suite (100% green)
  - Guideline Versioning & Replay: 16 tests (100% green)
  - Fact Auto-Linking: 8 tests (100% green)
  - Resilience & Rate Limiting: 11 tests (100% green)
  - Total: **87 Tests Passing (100% Green, 0 Failures)**.

#### Slide 10: Production Readiness & Commercial Roadmap
- **Headline:** Ready for Production: Deployment, Viability & Commercialization
- **Key Elements:**
  - Live Instance: Hosted on Render (`https://parakh-3xk4.onrender.com`) with 1-click evaluator access.
  - Target Market: Mid-to-large advertising and digital marketing agencies (e.g., Ogilvy, Dentsu, Schbang) handling multiple competing client accounts.
  - Pricing Model: B2B SaaS per client vault / agency seat.
  - Q1 2027 Roadmap: Native Figma/Canva review plugins, Slack/Teams precedent notification bots, and automated Shopify/Salesforce fact syncing.

---

## 6. Judge Defense & FAQ (For Presentation Q&A)

### Q1: "Is this just another LLM prompt wrapper?"
> **Answer:** Absolutely not. Parakh's core architecture is deterministic. Terminology checks, numeric price validations, date expiration sweeps, WCAG color contrast math, tenant RLS isolation, and the Citation Gate are executed in pure compiled TypeScript without touching an LLM. The LLM is used strictly for tone evaluation, semantic embeddings, and clarity rewrites—and any AI finding that cannot quote an exact source is discarded by the Citation Gate.

### Q2: "What prevents a bad precedent from becoming an unbreakable bad rule?"
> **Answer:** Precedents in Parakh are governed by three safety constraints:
> 1. *Mandatory Expiry Dates:* Precedents expire automatically and enter a review queue.
> 2. *Contradictory Ruling Detection:* If a precedent contradicts a brand guideline or another precedent, Parakh flags a `⚠️ CONTRADICTORY RULINGS` alert.
> 3. *Human-in-the-Loop:* A precedent *never* applies automatically; a human reviewer must confirm its application.

### Q3: "How do you guarantee client data privacy in multi-brand agencies?"
> **Answer:** Parakh enforces hard multi-tenant isolation at the SQLite database layer using `assertClientId` parameter bounds. Client A's session cannot query, read, or infer Client B's guidelines, facts, or precedents. Furthermore, before any copy is sent to an external LLM, our privacy layer masks PII, phone numbers, and confidential terms, restoring them only on return.

---

## 7. Submission Checklist for Reference

- **Live Site:** `https://parakh-3xk4.onrender.com`
- **GitHub Repository:** `https://github.com/athrv-j/PARAKH`
- **Branch:** `main`
- **Health Check Endpoint:** `https://parakh-3xk4.onrender.com/api/health`
- **Full Dossier Path:** `docs/ROUND3_SUBMISSION_DOSSIER.md`
- **Printable Dossier Path:** `docs/ROUND3_PRODUCT_DOSSIER_PRINTABLE.html`
- **Test Command:** `npm run test:run --workspace=server`
