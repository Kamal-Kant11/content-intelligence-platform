# AI Content Assurance Platform

Checks whether content is **well-written** (Content Quality) and **right for the brand** (Brand Intelligence), proposes an optimized version, and lets a person approve, reject or edit every change block by block.

**Stack:** MongoDB · Express · React (Vite + Tailwind) · Node.js. All intelligence runs **locally**: deterministic engines plus small models you train yourself. No external AI API is called. See [backend/ml/README.md](backend/ml/README.md).

```text
Paste / Write / File / URL ─► Extract ─► Normalize ─► Blocks ─► Document
                                                                   │
                     ┌──────── Analysis ◄──────────────────────────┘
                     │  grammar · readability · structure · vocabulary   (rules)
                     │  voice / tone                                     (tone model)
                     │  brand rules                                      (approved by a person)
                     │  claims vs. approved sources                      (claim model + keyword search)
                     ▼
                 Findings ─► Score (app-owned) ─► Optimization ─► Block review ─► currentContent
```

## Setup

You need Node.js 20+ and MongoDB (local, or MongoDB Atlas).

```bash
# 1. Backend
cd backend
npm install
cp .env.example .env        # Windows: copy .env.example .env   then edit MONGODB_URI and JWT_SECRET
npm run train               # optional: the trained models are already in ml/models
npm run dev                 # http://localhost:5000

# 2. Frontend (new terminal)
cd frontend
npm install
npm run dev                 # http://localhost:5173  (proxies /api to :5000)
```

Check it's running: `GET http://localhost:5000/api/health` returns the database status and the loaded models.

## How to use it

1. **Documents → New Content**: write, paste, upload (PDF/DOCX/TXT) or import a URL.
2. **Analyze**: you get a score out of 100, a breakdown by category, and findings per block.
3. **Sections**: every heading starts a section with its own score; findings are shown under each block.
4. **Optimize**: proposed changes are built from the findings.
5. **Review**: changes are grouped by section. Approve, reject or edit each block (or a whole section), then **Apply**. `originalContent` is never changed; `currentContent` holds the accepted version.
6. **Download**: the updated document in the same format you uploaded (or DOCX / PDF / TXT / Markdown), one section, the original, or a change report.
7. **Brands**: add sources (guidelines, approved content), select **Learn**, then accept or reject the suggested rules. Pick the brand on a document and analyze again to get voice, rule and claim findings.

## Project structure

```text
backend/
  ml/
    data/*.jsonl            labelled training data (edit these to improve the models)
    models/*.json           trained models, loaded at startup
    train.js                npm run train
  src/
    app.js / server.js      Express app / startup (DB, migration, models, listen)
    config/config.js        env settings + MongoDB connection
    routes/ controllers/    HTTP only: thin
    services/               orchestration: document, analysis, optimization, brand, extraction, model
    intelligence/           the actual logic, no Express/Mongo, unit-tested
      normalize.js          normalization + block parsing
      content_quality/      grammar, readability, structure, vocabulary
      brand/                voice, rules, extraction (learning), ruleGeneration, ruleConfig
      claims/analysis.js    claim detection + evidence comparison
      scoring/scorer.js     findings -> score
      rewrite/rewriter.js   findings -> proposed text
      pipeline.js           runs every engine
    ml/naiveBayes.js        the classifier
    models/                 Mongoose: User, Document, Analysis, Optimization, Brand, Source, Observation, Rule
  tests/                    node --test (unit + API integration)
frontend/src/
  pages/                    Dashboard, NewDocument, DocumentView, ReviewPage, Brands, BrandView, Models, auth pages
  components/ api/ context/ utils/
```

## Key design decisions (from the product spec)

- **Blocks live inside the Document.** There is no Block collection or API. Blocks are created during normalization, never by analysis.
- **No Version model.** `originalContent` is immutable (enforced in the model); `currentContent` is the latest accepted state.
- **One Finding shape** for every engine: `category, severity, message, text, suggestion, confidence, blockId` (+ `ruleId`, `source: deterministic|model`, `evidence`).
- **Finding ≠ suggestion ≠ optimization.** Findings explain the problem, the suggestion says what to do, and the optimization is a separate reviewed proposal.
- **The score is application-owned:** `100 − 20·critical − 5·warning − 1·info`, weighted by confidence.
- **Source → Observation → Rule → Finding** stay separate. Observations are `explicit` (the guideline says it) or `inferred` (the system noticed it) and keep their evidence. Rules start as `suggested` and only `active` + enabled rules affect analysis.
- **Deterministic first.** Models are used only where rules can't judge (tone, claim detection).
- **Cost control:** an analysis is cached by a hash of the content, brand knowledge, engine version and model versions.

## API

All routes except auth and health need `Authorization: Bearer <token>`. Every query is scoped to the logged-in user.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health`, `/api/health/models` | App, DB and model status / model metrics |
| POST | `/api/auth/signup`, `/api/auth/login` | Returns `{ token, user }` |
| GET | `/api/auth/me` | Current user |
| POST | `/api/documents` | `{ title, contentType, sourceType: write\|paste\|url, content \| url, brandId? }` |
| POST | `/api/documents/upload` | multipart `file` (+ `title`, `contentType`, `brandId`) |
| GET / PATCH / DELETE | `/api/documents/:id` | Get / update title, contentType, brandId / delete |
| GET | `/api/documents` | List |
| POST | `/api/documents/:id/analyze` | `{ brandId?, force? }`: run (or reuse cached) analysis |
| GET | `/api/documents/:id/analysis` | Latest analysis (+ `stale`) |
| POST | `/api/documents/:id/optimize` | Create proposed changes from the latest analysis |
| GET | `/api/documents/:id/optimizations[/:optimizationId]` | List / get |
| PATCH | `/api/optimizations/:id/changes/:changeId` | `{ status: approved\|rejected\|edited\|pending, editedText? }` |
| POST | `/api/optimizations/:id/review` | `{ changes: [...] }` bulk review |
| POST | `/api/optimizations/:id/apply` | Assemble final content into `currentContent` |
| GET | `/api/documents/:id/export` | Download. `format=source\|docx\|pdf\|txt\|md` (`source` = same as uploaded), `version=current\|original`, `section=sec_01` |
| GET | `/api/optimizations/:id/report` | Change report (before / after / why, grouped by section). `format=docx\|pdf\|txt\|md` |
| POST / GET | `/api/brands` | Create / list brands |
| GET / PATCH / DELETE | `/api/brands/:id` | Profile (voice, key messages) |
| POST / GET | `/api/brands/:id/sources` | Add (file, `{type:'text'}`, `{type:'url'}`) / list |
| DELETE | `/api/brands/:id/sources/:sourceId` | Remove a source |
| POST | `/api/brands/:id/learn` | Sources → observations → suggested rules → profile |
| GET | `/api/brands/:id/observations` | Observations with evidence |
| GET / POST | `/api/brands/:id/rules` | List (`?status=`) / add a manual (active) rule |
| PATCH / DELETE | `/api/brands/:id/rules/:ruleId` | Accept / reject / edit / enable / delete |

Rule types: `forbidden_term`, `preferred_term`, `required_term`, `sentence_length`, `passive_voice`, `pattern`, `tone`, `claim`, `custom_semantic`.

## Tests

```bash
cd backend
npm test
```

Unit tests cover block parsing, every engine, scoring, the classifier, brand learning, claims and the rewriter. `tests/api.test.js` runs the full flow (signup → document → analyze → optimize → review → apply, plus the brand flow and ownership checks) against a throwaway `ai_content_assurance_test` database. It is skipped if MongoDB isn't running.

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Blank page; browser console shows `504 (Outdated Optimize Dep)` | Vite's dependency cache went stale (packages were installed or removed while `npm run dev` was running) | Stop the frontend and run `npm run dev:fresh` once |
| `Startup failed: Port 5000 is already in use` | Another backend is still running (an old terminal, or a crashed `--watch` run) | Close it, or `netstat -ano \| findstr :5000` then `taskkill /PID <pid> /F` |
| `Startup failed: Cannot connect to MongoDB` | MongoDB service is stopped | Start "MongoDB Server" in Windows Services, or `net start MongoDB` as administrator |
| `Startup failed: Missing MONGODB_URI ...` | No `backend/.env` | `copy .env.example .env` in `backend/` and fill it in. `.env` is found from any folder you start in |
| `npm run dev` says "Waiting for file changes before restarting" | The backend crashed; the real error is printed just above that line | Fix that error, then save any backend file (or restart) |
| Frontend shows "Cannot reach the server" | Backend isn't running on port 5000 | Start the backend; check `http://localhost:5000/api/health` |

## Known limits

- Grammar covers common, high-confidence mistakes, not everything a full grammar checker would catch.
- Passive voice, tone mismatches and unsupported claims are flagged, but the rewriter only applies safe mechanical fixes. Rewording is left to the reviewer through **Edit**.
- The seed training data is small and generic (85% / 91.5% cross-validated accuracy). Add your own examples (see `backend/ml/README.md`).
- `custom_semantic` rules are keyword-triggered. A true semantic check would need a semantic model.
- Uploaded document files stay in `backend/uploads` (private). Brand source files are deleted after their text is extracted.
