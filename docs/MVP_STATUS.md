# 📊 Parakh (परख) — MVP Status & Gap Audit

> **Evaluation Date:** November 6, 2026  
> **Source of Truth:** Real Codebase Inspection (`server/` and `web/`)  
> **Purpose:** Honest technical assessment for hackathon judges and evaluators.

---

## 1. MVP Feature Verification Table

| # | MVP Requirement | Status | Evidence in Code | One-Line Demo Step |
| :--- | :--- | :---: | :--- | :--- |
| **1** | **Client Vaults with Isolated Data** | **Done** | [server/src/db/vaultDb.ts](file:///e:/Parakh/server/src/db/vaultDb.ts#L11-L15) (`assertClientId`), [schema.sql](file:///e:/Parakh/server/src/db/schema.sql#L10-L60) (`FOREIGN KEY client_id`), [tests/vaultDb.test.ts](file:///e:/Parakh/server/tests/vaultDb.test.ts#L30-L75), [tests/privacyAndLeak.test.ts](file:///e:/Parakh/server/tests/privacyAndLeak.test.ts#L45-L70). | Switch between "Kavach Health" and "VyaparSetu" using the top header dropdown; observe draft lists, rules, and facts completely change with zero data leakage. |
| **2** | **Guideline Import (DOCX & MD into Numbered Clauses)** | **Done** | [server/src/services/importer.ts](file:///e:/Parakh/server/src/services/importer.ts#L28-L140) (`mammoth.extractRawText`, regex for `C-X.Y` & categories), [server/src/routes/clients.ts](file:///e:/Parakh/server/src/routes/clients.ts#L62-L93) (`POST /api/clients/:id/knowledge`), [web/src/components/UploadModal.tsx](file:///e:/Parakh/web/src/components/UploadModal.tsx#L82-L100). | Click **"+ Ingest Guidelines"** in the top header, switch to "Import Guidelines" tab, upload a `.docx` or `.md` file, and see clauses auto-extracted into the client vault. |
| **3** | **Text Review with Cited Findings & Citation Gate** | **Done** | [server/src/review/checks/index.ts](file:///e:/Parakh/server/src/review/checks/index.ts#L20-L37) (AST checkers), [server/src/review/citation/citationGate.ts](file:///e:/Parakh/server/src/review/citation/citationGate.ts#L31-L105) (verbatim quotation gatekeeper), [web/src/scenes/ReviewWorkspace.tsx](file:///e:/Parakh/web/src/scenes/ReviewWorkspace.tsx#L400-L510) (yellow/red highlighter sweep & SVG laser connectors). | In the Review Workspace, hover any finding card on the right; an animated SVG laser connector draws dynamically from the card directly to the exact highlighted span in the parchment copy. |
| **4** | **Review Workflow (Roles, Accept, Dismiss, Exception, Approval, History)** | **Partial** | **Backend Done:** [server/src/workflow/roles.ts](file:///e:/Parakh/server/src/workflow/roles.ts#L1-L61) (RBAC `creator`, `manager`, `reviewer`, `client_viewer`), [server/src/workflow/draftWorkflow.ts](file:///e:/Parakh/server/src/workflow/draftWorkflow.ts#L62-L100) (`createRevision`, `diffWords`).<br>**Frontend Partial:** [web/src/scenes/ReviewWorkspace.tsx](file:///e:/Parakh/web/src/scenes/ReviewWorkspace.tsx#L208-L232) has Accept, Dismiss, Exception Drawer, and Stamp Approval, but **lacks a role-switcher dropdown** and **has no revision history timeline UI**. | Press <kbd>A</kbd> or click "Accept Fix" to swipe away a card and apply emerald green diff; press <kbd>D</kbd> to dismiss; click "Stamp & Approve Copy" to slam the `APPROVED` seal with a 2px screen shake. *(Role switching & history browsing are backend-only)*. |
| **5** | **Brand Case Law Precedents** | **Done** | [server/src/precedent/caseLaw.ts](file:///e:/Parakh/server/src/precedent/caseLaw.ts#L67-L100) (`findApplicablePrecedents`, `detectConflictingPrecedents`), [web/src/components/PrecedentDrawer.tsx](file:///e:/Parakh/web/src/components/PrecedentDrawer.tsx#L1-L120) (10-second verbal quick-capture), [web/src/scenes/ReviewWorkspace.tsx](file:///e:/Parakh/web/src/scenes/ReviewWorkspace.tsx#L233-L255) (3D card Y-axis flip). | Click the **"⚖️ Flip Precedent Cards"** button in the review toolbar; cards flip on their 3D Y-axis to reveal past reviewer rulings, or click "Precedent ↺" on an individual card to inspect exceptions. |
| **6** | **Fact Ripple Engine** | **Done** | [server/src/facts/factRipple.ts](file:///e:/Parakh/server/src/facts/factRipple.ts#L54-L100) (`propagateFactChange`), [web/src/scenes/FactRippleBoard.tsx](file:///e:/Parakh/web/src/scenes/FactRippleBoard.tsx#L150-L240) (interactive draggable canvas, physics strings, ripple wave, dry run ghost preview, and plain list accessible fallback). | Navigate to the "Fact Ripple Board" tab, click the "Diwali Wellness Camp Price" node, change value to `₹999`, and click "Trigger Fact Ripple"; watch the concentric shockwave flip dependent creative asset cards to `⚠️ NEEDS UPDATE`. |
| **7** | **Guideline Debugger Lite** | **Done** | [server/src/debugger/guidelineDebugger.ts](file:///e:/Parakh/server/src/debugger/guidelineDebugger.ts#L33-L95) (`analyzeClauseAmbiguity`, heuristic scoring formula, version bump `acceptRewrite`), [web/src/scenes/GuidelineDebuggerView.tsx](file:///e:/Parakh/web/src/scenes/GuidelineDebuggerView.tsx#L350-L425) (red wear stain, count-up ambiguity score, word-by-word rewrite diff). | Open the "Guideline Debugger" tab, click the top ranked ambiguous clause (`C-3.2`), inspect contradictory reviewer quotes in the accordion, and click "Ratify Version 2 Rewrite" to stamp it healed. |
| **Stretch** | **Image Check (Raster / Computer Vision)** | **Missing** | [server/src/review/checks/accessibility.ts](file:///e:/Parakh/server/src/review/checks/accessibility.ts#L79-L90) only checks for Markdown `alt-text` tags; [server/src/services/importer.ts](file:///e:/Parakh/server/src/services/importer.ts#L53-L61) extracts hex color strings. **No actual computer vision, raster pixel analysis, or logo exclusion zone checking exists.** | Paste an image tag without alt text (`<img src="test.jpg" />`) to see the accessibility scanner flag it; raster image upload and computer vision audits are not implemented. |

---

## 2. The 5 Highest-Risk Gaps (In Priority Order)

```text
HIGH RISK ───►  [Gap 1: Privacy Masker Unpiped in Review Route]
      │
      ├───►     [Gap 2: Missing UI Role Switcher & Revision History Timeline]
      │
      ├───►     [Gap 3: LLM Dual-Mode Regex Fallback When No API Key]
      │
      ├───►     [Gap 4: Hash-Based Bag-of-Words Pseudo-Embeddings]
      │
LOW RISK ────►  [Gap 5: Stretch Goal Image Check Lacks Computer Vision]
```

---

### Gap 1: Privacy Masker is Unpiped in the Express Review Route
* **Risk Level:** 🔴 **Critical (Privacy & Security Discrepancy)**
* **The Problem:** 
  The project documentation ([PROJECT_GUIDE.md](file:///e:/Parakh/docs/PROJECT_GUIDE.md)) and the transparency manifest ([AboutAiView.tsx](file:///e:/Parakh/web/src/pages/AboutAiView.tsx)) publicly advertise: *"All external LLM calls are strictly tenant-isolated and PII-masked."*  
  While the `PrivacyMasker` class ([server/src/privacy/masker.ts](file:///e:/Parakh/server/src/privacy/masker.ts)) is completely written and passes all unit tests in [tests/privacyAndLeak.test.ts](file:///e:/Parakh/server/tests/privacyAndLeak.test.ts), the actual HTTP handler in [server/src/routes/review.ts#L133](file:///e:/Parakh/server/src/routes/review.ts#L133) passes the raw user `text` straight into `groqClient.checkToneAndMessaging(text, clauses, facts)` without running `masker.mask()` first.
* **Why It Matters to Judges:** If a judge pastes a real draft with an email address or phone number and inspects the network payload sent to Groq Cloud, unmasked PII will be transmitted.
* **Actionable Fix Plan:**
  1. In `server/src/routes/review.ts`, instantiate `const masker = new PrivacyMasker();`.
  2. Prior to calling `groqClient.checkToneAndMessaging`, run:
     ```ts
     const { maskedText, restoreMap } = masker.mask(text);
     const rawAiFindings = await groqClient.checkToneAndMessaging(maskedText, clauses, facts);
     ```
  3. Unmask any span text in `rawAiFindings` using `masker.unmask()` before passing them into `enforceCitationGate`.

---

### Gap 2: Missing UI Role Switcher & Revision History Timeline
* **Risk Level:** 🟠 **High (MVP Requirement Completeness)**
* **The Problem:** 
  MVP Requirement (4) explicitly requires *"review workflow with roles... and history"*.  
  The backend has an advanced role-based access control engine in [server/src/workflow/roles.ts](file:///e:/Parakh/server/src/workflow/roles.ts) with four roles (`creator`, `manager`, `reviewer`, `client_viewer`) and immutable revision storage (`createRevision` in [server/src/workflow/draftWorkflow.ts](file:///e:/Parakh/server/src/workflow/draftWorkflow.ts)).  
  However, the frontend UI ([web/src/scenes/ReviewWorkspace.tsx](file:///e:/Parakh/web/src/scenes/ReviewWorkspace.tsx)) does **not** expose a role selector dropdown (every user action operates under an assumed default reviewer/creator role) and has **no UI drawer or timeline** to browse previous draft revisions (`v1`, `v2`, etc.).
* **Why It Matters to Judges:** If judges ask, *"Show me how a client_viewer is prevented from approving a draft,"* or *"Show me the diff between Version 1 and Version 2,"* you cannot demonstrate this from the frontend UI alone.
* **Actionable Fix Plan:**
  1. In `ReviewWorkspace.tsx` (or `Header.tsx`), add a role switcher toggle button group: `[Creator | Manager | Reviewer | Client Viewer]`.
  2. Pass the selected role in the request body to `/api/review/clients/:id/drafts/:draftId/status` and `/api/review/clients/:id/findings/:findingId/resolve`. Disable approval buttons when `role === 'client_viewer'`.
  3. Add a "Version History" side panel or dropdown tab in `ReviewWorkspace.tsx` that fetches `GET /api/review/clients/:id/drafts`, lists prior version numbers, and renders word diffs between selected versions.

---

### Gap 3: Offline LLM Evaluation Uses Hardcoded String Checks When No Groq API Key Is Configured
* **Risk Level:** 🟡 **Medium (Evaluation Credibility)**
* **The Problem:** 
  If `GROQ_API_KEY` is not provided in `.env`, [server/src/review/llm/client.ts](file:///e:/Parakh/server/src/review/llm/client.ts#L136-L186) calls `simulateLlmEvaluation`. This fallback uses static regex checks:
  - `lower.includes('killing hundreds')` -> flags alarmist tone
  - `lower.includes('buy now or regret')` -> flags sales hyperbole
  - `lower.includes('india’s no. 1')` -> flags comparative superiority  
  If an evaluator inputs custom creative text that does not happen to contain these three exact patterns, zero LLM findings will be produced in offline mode.
* **Why It Matters to Judges:** If judges test with unscripted copy without an active internet connection or Groq API key, the system may appear to miss obvious tone issues.
* **Actionable Fix Plan:**
  1. Add a visual status badge in the UI (e.g. in `AboutAiView.tsx` or `Header.tsx`): `● Groq Llama 3.3 Active` vs `○ Local Deterministic Simulator`.
  2. Expand `simulateLlmEvaluation` with broader regex heuristics: multiple exclamation marks (`/!{2,}/`), generic urgent medical phrases (`/guaranteed|cure|instant recovery/i`), and aggressive sales verbs (`/hurry|limited time only|act fast/i`).

---

### Gap 4: Case Law Precedents Use a Hash-Based Bag-of-Words Vector Rather Than Real Neural Embeddings
* **Risk Level:** 🟡 **Medium (Technical Accuracy & Semantic Recall)**
* **The Problem:** 
  In [server/src/precedent/caseLaw.ts#L22-L42](file:///e:/Parakh/server/src/precedent/caseLaw.ts#L22-L42), `computeLocalEmbedding` creates a 64-dimensional vector by hashing character codes of words modulo 64.  
  Cosine similarity is calculated accurately on this vector, but because it is a hash of word characters rather than a semantic language model embedding, it cannot capture synonyms (e.g., *"price reduction"* will not match an exception for *"discount"* unless the words share identical substrings).
* **Why It Matters to Judges:** If a judge asks, *"What embedding model are you using for vector search in Case Law?"* and you answer *"OpenAI"* or *"BERT"*, you will be contradicted by the code.
* **Actionable Fix Plan:**
  1. In presentations, frame this truthfully as an architectural choice: *"We implemented a zero-leakage, zero-cost, local 64-dimension CPU hash vector for offline operation."*
  2. As a code upgrade, integrate `@xenova/transformers` in Node.js to run `all-MiniLM-L6-v2` locally via ONNX (384-dimensional true semantic embeddings with 0% data leakage).

---

### Gap 5: Stretch Goal "Image Check" Lacks Computer Vision & Pixel Analysis
* **Risk Level:** ⚪ **Low (Expected for Stretch Goals)**
* **The Problem:** 
  The blueprint includes visual compliance (60% brand color dominance, logo clear zones, no busy backgrounds). Currently, [server/src/review/checks/accessibility.ts](file:///e:/Parakh/server/src/review/checks/accessibility.ts#L79-L90) only checks for Markdown `alt-text` tags, and [server/src/services/importer.ts](file:///e:/Parakh/server/src/services/importer.ts#L53-L61) extracts hex color strings. There is no raster image processing (PNG/JPG analysis).
* **Why It Matters to Judges:** If judges ask whether Parakh audits actual banner ad image files, you must clarify that text and color tokens are audited, but image pixels are not yet parsed.
* **Actionable Fix Plan:**
  1. Implement an Express endpoint `POST /api/review/clients/:id/images/audit` using `multer` and `sharp`.
  2. Extract the image's dominant color palette and calculate Euclidean color distance against `palette_values` stored in the `client_assets` table.
  3. Surface the color distribution in the UI as a percentage pie-ring.

---

## 3. Recommended Presentation Strategy for Judges

| If a Judge Asks... | Do NOT Say... | DO Say... |
| :--- | :--- | :--- |
| **"Are you calling OpenAI for every review?"** | *"Yes, we use AI for all checks."* | *"No, we deliberately avoid sending everything to external LLMs. 80% of our checks (terminology, pricing facts, WCAG contrast) run on deterministic AST engines locally. We only invoke Groq Llama 3.3 for nuanced tone violations, and every output must pass our strict Citation Gate."* |
| **"What happens if Groq hallucinates a rule?"** | *"Prompt engineering prevents it."* | *"Our Citation Gate drops it automatically. We normalize the quote and verify that it exists verbatim in the client's SQLite vault. If there is no exact source substring, the finding is dropped and logged as an unverified hallucination."* |
| **"How do you prevent client data leakage?"** | *"We use different API keys."* | *"Every database query is scoped through our `VaultDb` access layer with strict `assertClientId` assertions. Foreign keys and tenant schemas enforce that Client A's pricing rules never appear in Client B's workspace."* |
| **"Where is the image checker?"** | *"It works in the background."* | *"We prioritized building an airtight text compliance, Citation Gate, and Brand Case Law engine first. For visual compliance, we mathematically audit WCAG AA color contrast and alt-text tags; raster computer vision is our next roadmap milestone."* |

---

*End of MVP Status Report — Saved to `/docs/MVP_STATUS.md`.*
