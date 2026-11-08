# 📦 Parakh Fictional Indian Brand Sample Dataset

This directory contains realistic, fictional Indian brand datasets built to test, evaluate, and showcase the **Parakh Brand Governance AI Platform**.

---

## 🏢 Included Brand Vaults (100% Fictional)

| Client ID | Brand Name | Sector | Key Assets |
| :--- | :--- | :--- | :--- |
| `client_kavach` | **Kavach Health (कवच)** | Preventive Healthcare & Diagnostics | 25 Clauses, 15 Facts (Checkup pricing, NABL code), Banned terms (`miracle cure`, `cheap tests`), Palette. |
| `client_vyapar` | **VyaparSetu Fintech (व्यापार सेतु)** | MSME Working Capital & B2B GST Invoicing | 25 Clauses, 15 Facts (14 NBFC partners, 11.5% APR floor), Banned terms (`instant cash no kyc`), Palette. |
| `client_mitti` | **Mitti & Moon Botanical (मिट्टी & मून)** | Clean Ayurvedic Skincare & Wellness | 25 Clauses, 15 Facts (PETA vegan certification, Kashmiri saffron), Banned terms (`chemical-free`, `fair skin`), Palette. |

---

## 📂 Directory Layout

```text
sample-data/
├── clients/
│   ├── client_kavach/
│   │   ├── guidelines.md       # 25 numbered clauses (Tone, Terminology, Claims, Visuals, Accessibility)
│   │   ├── guidelines.docx     # Genuine Microsoft Word (.docx) package for binary upload tests
│   │   ├── facts.json          # 15 approved facts with labels, values, and valid_until dates
│   │   ├── terms.csv           # Preferred & banned terminology mappings
│   │   └── palette.json        # Hex colors & WCAG AA contrast rules
│   ├── client_vyapar/          # Guidelines (.md/.docx), facts.json, terms.csv, palette.json
│   └── client_mitti/           # Guidelines (.md/.docx), facts.json, terms.csv, palette.json
├── drafts/                     # 40 deliberate violation & benchmark drafts (.txt and .md)
├── images/
│   ├── sample_clean.svg        # 100% compliant banner (7.4:1 contrast ratio, approved palette)
│   ├── sample_low_contrast.svg # Contrast failure (yellow on white, 1.17:1 ratio)
│   └── sample_off_palette.svg  # Off-palette failure (neon pink & electric lime)
├── ground_truth.json           # 40 annotated benchmark test drafts with ground-truth issues
├── precedents.seed.json        # 15 past decisions (3 conflicting pairs, 1 expired, 8 active)
├── override_log.json           # Ambiguity logs making clauses C-3.2 and C-2.1 ambiguous for Debugger
├── fact_change_scenarios.json  # 4 test scenarios for Fact Ripple shockwave propagation
├── adversarial_prompts.txt     # Citation Gate hallucination traps & cross-tenant leak tests
└── README.md                   # This instruction file
```

---

## 🚀 How to Ingest & Seed This Dataset

### Option 1: Automated Full Monorepo Seed (One Command)
Run the root npm script to automatically populate your SQLite database (`parakh.db`) with all 3 client vaults, 75 clauses, 45 facts, 30 terms, 15 precedents, and 40 drafts:

```bash
npm run seed:sample
```

### Option 2: Upload Guidelines via the Web UI
1. Start the platform: `npm run dev`
2. Open `http://localhost:5173` in your browser.
3. In the top header, click **"+ Ingest Guidelines"**.
4. Switch to the **"Import Guidelines"** tab.
5. Select a client (e.g. *Kavach Health*), choose `sample-data/clients/client_kavach/guidelines.docx` or `guidelines.md`, and click **"Upload & Ingest into Vault"**.
6. The system will extract clauses, facts, and prohibited terms into the active tenant database.

### Option 3: Manual Ingestion via cURL / HTTP API
```bash
# Ingest guidelines for VyaparSetu Fintech
curl -X POST http://localhost:4000/api/clients/client_vyapar/knowledge \
  -F "file=@sample-data/clients/client_vyapar/guidelines.docx"

# Ingest guidelines via direct text paste
curl -X POST http://localhost:4000/api/clients/client_mitti/knowledge \
  -H "Content-Type: application/json" \
  -d '{"text": "Clause C-1.1: Mitti & Moon communicates with poetic botanical reverence.\nFact: Kashmiri Saffron Price = ₹1,850\nBanned: chemical-free -> botanical extracts"}'
```

### Option 4: Run the Benchmark Precision/Recall Evaluation
Evaluate Parakh's deterministic engine against all 40 ground-truth drafts:
```bash
npm run eval --workspace=server
```
