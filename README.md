# Parakh (परख)
> **The Memory of Every Brand Decision**  
> An intelligent brand-governance platform for agencies and enterprises that manages client brands, remembers human decisions as case law, and continuously debugs guideline ambiguity.

---

## 🏛️ Architecture Overview

```
                                [ CLIENT / BROWSER ]
                                         │
                    ┌────────────────────┴────────────────────┐
                    ▼                                         ▼
         [ Review Workspace ]                        [ Fact Ripple Board ]
     (Highlighter Sweep, Stamp Slam,             (Interactive SVG Dependency
       Precedent Drawer, Dockets)                   Graph with Spring Motion)
                    │                                         │
                    └────────────────────┬────────────────────┘
                                         │ REST API / JWT Vault Scope
                                         ▼
                     [ PARAKH CORE API (Express + TypeScript) ]
      ┌──────────────────────────────────┴──────────────────────────────────┐
      ▼                                  ▼                                  ▼
[ Vault Middleware ]             [ Review Engine ]               [ Guideline Debugger ]
Strict Client Isolation          Deterministic Checks            Ambiguity Scoring
PII & Confidential Masker        Groq LLaMA-3.3-70B              Overridden Clause Evidence
                                 Citation Gate (Quote Verifier)  Rewrite Proposal Generator
                                 Intent-Lock Rewriter
                                         │
                                         ▼
                              [ BRAND CASE LAW ENGINE ]
                       Local Sentence Embeddings + Cosine Rank
                          Precedent Retrieval & Expiry Sweeper
                                         │
                                         ▼
                         [ SQLite Database (better-sqlite3) ]
```

---

## 🔒 Responsible AI & AI Use Disclosure

As mandated by hackathon guidelines and responsible governance standards, Parakh explicitly discloses every AI model, service, and algorithm used across the platform:

| Component | Technology / Model | Execution Location | Purpose |
| :--- | :--- | :--- | :--- |
| **Tone & Messaging Review** | Groq `llama-3.3-70b-versatile` | External Cloud API | Evaluates nuance, positioning, and tone violations against client clauses. |
| **Citation Verification** | Deterministic Code (AST / Substring) | Local (Server) | **Citation Gate:** Drops any AI finding that cannot be verified verbatim against source guidelines. |
| **Precedent Matching** | Local Transformers.js (`all-MiniLM-L6-v2`) | Local (Server) | Computes 384-d semantic embeddings without transmitting data outside client vault. |
| **Precedent Applicability Check** | Groq `llama-3.3-70b-versatile` | External Cloud API | Validates whether historical precedent applies to current context; requires citation. |
| **Rule Rewrite Proposals** | Groq `llama-3.3-70b-versatile` | External Cloud API | Generates clearer guideline text strictly synthesizing past override examples. |
| **Client Privacy Masking** | Deterministic Regex + Tokenizer | Local (Server) | Masks confidential pricing, names, and emails before calling external LLMs; unmasks in response. |
| **Visual & Contrast Checks** | WCAG 2.1 Formula Math | Local (Server) | Calculates luminance and color contrast mathematically, zero AI hallucinations. |

---

## 🚀 Quick Start

### Prerequisites
- Node.js >= 20.x (Recommended: Node 22+ or 24+)
- npm >= 10.x

### Setup & Run
1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure environment:
   ```bash
   cp .env.example server/.env
   # Add your GROQ_API_KEY inside server/.env
   ```
3. Run development mode:
   ```bash
   npm run dev
   ```
   - Server runs on: `http://localhost:4000`
   - Web app runs on: `http://localhost:5173`

4. Run tests:
   ```bash
   npm run test
   ```
