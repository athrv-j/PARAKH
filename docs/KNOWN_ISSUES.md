# 📋 Parakh (परख) — Known Issues & Skeptical QA Audit

> **Document Status:** Live QA Audit for Hackathon Round 3  
> **Auditor Perspective:** Skeptical Technical QA & Evaluation Judge  
> **Purpose:** Document all known edge cases, half-built features, error behaviors, and workarounds with 100% honesty.

---

## 1. What Does Not Work Yet (Unfinished & Scoped Out)

| Capability | Current State | How to Avoid / Workaround | Severity |
| :--- | :--- | :--- | :--- |
| **Image & Visual Creative Review** | **Scoped Out / Contrast Only.** Only parses SVG/palette hex codes for mathematical WCAG 2.1 contrast ratios and prohibited colors. No computer vision, OCR, or pixel raster scanning. | Review text copy, press releases, social drafts, and markdown documents. Do not expect JPEG/PNG object detection. | `Low (Declared)` |
| **Video & Audio Review** | **Not Built.** The system explicitly processes text copy and document files. No audio transcription or video frame review. | Evaluate written copy, video scripts, ad transcripts, and captions. | `Low (Declared)` |
| **PDF Guideline Ingestion** | **Not Supported.** The ingestion engine (`mammoth`) parses Microsoft Word (`.docx`) and Markdown (`.md`). Dropping a `.pdf` will attempt plaintext extraction and yield binary artifacts. | Always upload guideline files in `.docx` or `.md` format (samples provided in `/sample-data`). | `Medium` |
| **Guideline Debugger Impact Replay** | **Lite Version (Under Active Delivery in Round 3).** Ranks ambiguous clauses based on past overrides and generates proposed rewrites, but historical draft impact replay is being finalized. | Review the evidence cards and ambiguity scores. Click "Synthesize Revised Rule" to inspect evidence-based rewrites. | `Medium` |
| **Automatic Multi-Tenant Role Switcher** | **Partially Enforced in UI.** Users can sign in as Creator, Reviewer, or Manager with signed JWT tokens. However, the UI does not hide reviewer buttons when logged in as a Creator; all actions are permissible in demo mode. | Use the "Auth / Sign In" modal to inspect authenticated roles. The demo intentionally allows judges to test both Creator and Reviewer actions without switching accounts. | `Low` |

---

## 2. Known Bugs & Edge Behaviors

### Bug 1: Page Refresh Clears Active Draft View
- **What happens:** If a judge runs a review, sees the findings, and presses `F5` / browser refresh, the view resets back to the initial Hero / Gyroscope screen.
- **Why:** The active review session is maintained in client-side React state (`currentDraft`) to enable instant haptic transitions and rubber stamp animations without round-trip latency.
- **How to avoid:** Do not refresh mid-review. To test a new draft, click the Parakh logo or switch tabs; previous drafts remain saved in SQLite (`drafts` table).

### Bug 2: Dropping Binary Files (.docx) into the Direct Text Paste Box
- **What happens:** If a user drops a `.docx` file into the direct copy paste zone on the home screen rather than using the "+ Ingest Guidelines" modal, the browser `FileReader.readAsText()` reads the raw zipped XML binary stream (e.g., `PK...`).
- **Why:** The main hero drop zone is designed for draft copy (`.txt`, `.md`). Structured Word document parsing is handled by the dedicated backend ingestion pipeline.
- **How to avoid:** For guideline documents, click **"+ Ingest Guidelines"** in the top header. For draft copy, paste text directly or drop plaintext `.txt` / `.md` files.

### Bug 3: Rate Limiting Alert on Rapid Consecutive Scans
- **What happens:** If a user clicks the "Run Brand Governance Audit" button 10+ times within 10 seconds, the API returns HTTP 429 (`Rate limit exceeded: 30 requests per minute`).
- **Why:** Enterprise Token-Bucket rate limiting is active to protect backend LLM quotas and database integrity.
- **How to avoid:** Wait 2–3 seconds between audit runs. The button includes a disabled loading state while a scan is in flight.

### Bug 4: Free-Tier LLM Cold Starts & Latency Jitter
- **What happens:** The first review run after server idle can take 4–6 seconds to return tone findings. Subsequent reviews return in ~800ms.
- **Why:** Render free-tier instances sleep on inactivity, and Groq cloud API requests experience cold connection latency.
- **How to avoid:** Look at the Gyroscope radar animation during scans. Parakh's SHA-256 LRU cache ensures identical copy reviews return in under 50ms.

---

## 3. Things That May Confuse a First-Time User

1. **AI vs Code-Based Findings:**
   - Terminology, banned words, numerical pricing, dates, and contrast ratios are **100% deterministic code**. They will produce identical flags on every single run.
   - Tone, positioning, and nuance checks use Groq `llama-3.3-70b-versatile`. Because LLMs are probabilistic, phrasing in tone explanations can vary slightly between runs.
2. **The "Citation Gate" Suppresses Unverified Flags:**
   - If an AI model hallucinates a rule that does not exist verbatim in the client's guidelines, the Citation Gate **drops the finding silently**. This is a safety feature, not a bug.
3. **Demo Data is Fictional Indian Brands:**
   - All three brands (`Kavach Health`, `VyaparSetu`, `Mitti & Moon`) are 100% fictional to protect confidential enterprise data. Use the Brand Vault selector in the header to switch between them.
4. **Mobile & Small Screen Layouts (360px):**
   - On screens narrower than 400px, multi-column diff tables switch to single-column view, and the sticky header collapses into a mobile navigation bar.

---

## 4. How to Test the Full Flow (Step-by-Step for Judges)

To experience the complete, unbroken end-to-end journey in under 3 minutes:

1. **Step 1: Open the Application**
   - URL: [`https://parakh-3xk4.onrender.com`](https://parakh-3xk4.onrender.com)
   - Ensure the vault selector shows `🏢 Kavach Health`.
2. **Step 2: Paste a Deliberate Violation Draft**
   - Click the demo chip: **`🚨 Violation: Unapproved Cure Claim`**.
   - Notice the text auto-populates: *"DENGUE OUTBREAK IN YOUR CITY! Kavach Health offers a 100% guaranteed miracle cure..."*
3. **Step 3: Run the Governance Audit**
   - Click **"Run Brand Governance Audit"**.
   - Watch the Governance Gyroscope transition into a radar sweep with particle streams.
4. **Step 4: Inspect Findings & Citation Gate**
   - Finding 1: Highlights `"miracle cure"` citing `Clause 2.1: Prohibited Vocabulary`. Click **"View Source Citation"** to verify the exact quoted clause.
   - Finding 2: Highlights price discrepancy (`₹199` vs canonical `₹999`).
5. **Step 5: Test Intent Lock & Precedents**
   - Click **"Preview Fix"** on any finding to view the side-by-side word diff preserving creator punch.
   - Click **"Allow Exception"** to log a mock call approval with reason and 30-day expiry.
6. **Step 6: Test Fact Ripple**
   - Switch to the **Fact Ripple Board** tab.
   - Click on the price node `"Full Body Checkup Price: ₹999"`, change it to `₹1,499`, and click **"Calculate Ripple Effect"**.
   - Watch the SVG graph highlight the 3 affected drafts that now require updates.
7. **Step 7: Test Guideline Debugger**
   - Switch to the **Guideline Debugger** tab.
   - Inspect `Clause 3.2` with high ambiguity score. Click **"Synthesize Revised Rule"** to view evidence-based proposed wording.

---
*QA Audit compiled for Parakh Brand Governance Platform — Round 3 Submission.*
