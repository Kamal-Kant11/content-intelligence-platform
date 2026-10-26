# ContentIQ

A simple content quality platform. Add content (file, website or pasted text), check **two parameters**:
**grammar** and **readability**. Then generate an optimized draft, compare it with the original, approve or
reject it, and download the approved version as TXT or DOCX.

**Stack:** MongoDB · Express · React (Vite + Tailwind) · Node.js

| Parameter   | Method                                                                                   |
| ----------- | ---------------------------------------------------------------------------------------- |
| Grammar     | [LanguageTool](https://languagetool.org) server (a rule-based checker, not an ML model)  |
| Readability | Flesch Reading Ease formula (a math formula, not ML), with a built-in syllable counter   |

No LLM API and no trained ML models are used.

## Setup (Windows PowerShell)

You need **Node.js 20+** and **MongoDB** (local, or a MongoDB Atlas connection string).

```powershell
# 1. Backend
cd backend
npm install
Copy-Item .env.example .env
notepad .env                # set MONGODB_URI and a long random JWT_SECRET
npm run dev                 # http://localhost:5000

# 2. Frontend (new terminal)
cd frontend
npm install
npm run dev                 # http://localhost:5173  (proxies /api to :5000)
```

A long random `JWT_SECRET` can be generated with:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Check that everything is running: open `http://localhost:5000/api/health`. It reports `database` and
`grammarService` (LanguageTool) as `up` or `down`.

## LanguageTool (grammar service)

The server is set with `LANGUAGETOOL_URL` in `backend/.env`.

- **Public API (default):** `https://api.languagetool.org`. Nothing to install, but it is rate-limited
  (about 20 requests per minute) and **your text is sent to languagetool.org**.
- **Your own server (recommended for private content):** needs Java 17+.

  ```powershell
  # Download and unzip LanguageTool (about 250 MB)
  Invoke-WebRequest https://languagetool.org/download/LanguageTool-stable.zip -OutFile LanguageTool.zip
  Expand-Archive LanguageTool.zip -DestinationPath .
  cd LanguageTool-*
  java -cp languagetool-server.jar org.languagetool.server.HTTPServer --port 8081
  ```

  Or with Docker: `docker run -d -p 8081:8010 erikvl87/languagetool`.

  Then set `LANGUAGETOOL_URL=http://localhost:8081` in `backend/.env` and restart the backend.

**When LanguageTool is unavailable:** analysis and optimization return **503** with a message that says
what to fix (server not reachable, or rate limit reached). Nothing is saved half-way, and you can retry.
Everything else (history, comparison, approval, downloads) keeps working.

## How it works

1. **Add content.** The New analysis page has three tabs: *Upload File* (PDF/DOCX/TXT, max 5 MB), *Website
   URL* and *Paste Text*. Each one creates a document and shows the extracted text for confirmation.
2. **Analyze.** The same pipeline runs for every input:
   - **Grammar:** every LanguageTool issue with message, rule ID, category, start/end position and
     suggestions. **Score** = `100 − (weighted issues per 1,000 words)`, clamped to 0–100. Grammar,
     spelling and repeated words weigh 2; typos and inconsistencies 1; style and whitespace 0.5. Texts
     under 100 words count as 100 words. *This is our own estimate, not an official LanguageTool score.*
   - **Readability:** raw Flesch Reading Ease `206.835 − 1.015 × words/sentence − 84.6 × syllables/word`,
     display score (raw clamped to 0–100), words, sentences, average sentence length, average word length,
     syllables per word, long sentences (over 25 words) and reading level. Higher means easier.
3. **Optimize.** The original is never changed. The optimized draft is built by:
   - applying LanguageTool fixes **only when there is exactly one suggestion** and the issue is
     mechanical (spelling, grammar, typo, repeated word). Ambiguous fixes are left for you; on the
     comparison page you can apply any suggestion with one click;
   - fixed plain-wording rules (`in order to` → `to`, `utilize` → `use`, `prior to` → `before`, …);
   - splitting sentences over 25 words at `;` or `, and/but/so` when both halves are full clauses.

   The draft is then analyzed again with the same two methods. Scores are whatever is measured, and they
   can stay the same or get worse.
4. **Compare and review.** Original next to the editable optimized text, a scores table with changes,
   highlighted word differences, the list of automatic changes, and the remaining issues. Then:
   - **Approve optimized content** approves exactly the saved version on screen.
   - **Edit and approve** saves your edited text as a new version, analyzes it and approves it.
   - **Reject optimization** keeps the original and approves nothing.

   Editing after approval resets the status to *Awaiting review*.
5. **Download.** TXT or DOCX of the approved version only.

## API

All responses are JSON. Errors are always `{ "message": "..." }` with a matching status code (400
validation, 401 not logged in, 404 not found or not yours, 409 conflict, 413 too large, 502/503 grammar
service). Every `/api/documents` route requires login and only ever returns the caller's own documents.

| Method | Path                                        | Body / query                                     | Notes                                        |
| ------ | ------------------------------------------- | ------------------------------------------------ | -------------------------------------------- |
| GET    | `/api/health`                               |                                                  | `{ status, database, grammarService }`       |
| POST   | `/api/auth/register`                        | `{ name, email, password, confirmPassword }`     | Sets the HTTP-only login cookie (`/signup` also works) |
| POST   | `/api/auth/login`                           | `{ email, password }`                            | Sets the login cookie                        |
| POST   | `/api/auth/logout`                          |                                                  | Clears the cookie                            |
| GET    | `/api/auth/me`                              |                                                  | `{ user }`                                   |
| GET    | `/api/documents`                            |                                                  | `{ documents, stats }` (summaries, no text)  |
| POST   | `/api/documents/upload`                     | multipart: `file`, `title?`                      | PDF, DOCX, TXT; real file type is checked    |
| POST   | `/api/documents/from-url`                   | `{ url, title? }`                                | Public http(s) pages only (SSRF-protected)   |
| POST   | `/api/documents/from-text`                  | `{ text, title? }`                               | Max 20,000 characters (`MAX_TEXT_CHARS`)     |
| GET    | `/api/documents/:id`                        |                                                  | Full document                                |
| POST   | `/api/documents/:id/analyze`                |                                                  | Analyzes the original text                   |
| POST   | `/api/documents/:id/optimize`               |                                                  | New optimized version + its analysis         |
| PUT    | `/api/documents/:id/draft`                  | `{ text }`                                       | Saves an edit as a new version, re-analyzed  |
| PATCH  | `/api/documents/:id/review`                 | `{ action: "approve", versionId }` · `{ action: "edit_approve", text }` · `{ action: "reject" }` | |
| GET    | `/api/documents/:id/export?format=txt\|docx` |                                                  | Approved version only (409 otherwise)        |

A full document looks like:

```jsonc
{
  "document": {
    "id": "…", "title": "…", "sourceType": "file|url|text", "sourceName": "report.pdf",
    "status": "draft|analyzed|awaiting_review|approved|rejected",
    "scores": { "originalGrammar": 72, "originalReadability": 48, "optimizedGrammar": 90, "optimizedReadability": 55 },
    "original": { "text": "…", "analysis": { "grammar": { "score", "issueCount", "issues": [ { "message", "ruleId", "category", "issueType", "start", "end", "text", "suggestions" } ] },
                                             "readability": { "score", "fleschReadingEase", "wordCount", "sentenceCount", "avgSentenceLength", "avgWordLength", "avgSyllablesPerWord", "longSentenceCount", "level" },
                                             "wordCount", "sentenceCount" } },
    "optimized": { "versionId": "…", "source": "optimizer|edit", "text": "…", "analysis": { … }, "changes": [ { "type", "from", "to", "reason" } ] },
    "versions": [ { "id", "source", "createdAt", "grammarScore", "readabilityScore", "wordCount" } ],
    "currentVersionId": "…", "approvedVersionId": "…", "approvedAt": "…"
  }
}
```

## Security notes

- Passwords are hashed with bcrypt (cost 12).
- The JWT is stored in an **HTTP-only, SameSite=Strict** cookie (`Secure` when `NODE_ENV=production` or
  `COOKIE_SECURE=true`).
- **URL input:** only http/https on ports 80/443, no credentials in the URL. Every DNS answer is checked
  at connect time, so localhost, private, link-local (cloud metadata), CGNAT, multicast and reserved
  addresses are blocked, including through redirects. 10 s timeout, 2 MB limit, at most 5 redirects.
- **Uploads:** kept in memory only (never written to disk), 5 MB limit, file signature checked (`%PDF-`,
  DOCX zip), binary "TXT" rejected.
- The original text is immutable in the database. Download filenames contain only the cleaned title.

## Data model

Two Mongoose models:

- **User**: name, email, password hash.
- **Document**: owner, title, source type and name, immutable `originalText`, `originalAnalysis`, a
  `versions` array (each optimized or edited text with its analysis and changes, i.e. the revision
  history), `currentVersionId`, `status`, `approvedVersionId`, `approvedAt`, score summary and
  timestamps. Indexed by `{ user, updatedAt }` and `{ user, status }`.

## Tests

```powershell
cd backend
npm test
```

Unit tests cover grammar scoring and fixes, readability, the optimization rules, PDF/DOCX/TXT/HTML
extraction, SSRF blocking and export. The API tests cover auth, analysis, optimization, approval,
rejection, authorization and export, using a real MongoDB (database `contentiq_test`, dropped afterwards;
skipped if MongoDB is not running) and a small fake LanguageTool, so no internet access is needed.

Try the app with [examples/sample-content.txt](examples/sample-content.txt).

## Limitations

- English only (`LANGUAGETOOL_LANGUAGE`, default `en-US`). The readability formula is for English.
- The grammar score is an internal estimate. The public LanguageTool API finds fewer issues than the
  Premium version.
- Readability rules are deliberately conservative: they cannot understand meaning, so they only make the
  listed substitutions and clause splits. Every change is shown for review.
- Scanned (image-only) PDFs have no text to extract (no OCR). Pages that render their text with
  JavaScript, or that need a login, cannot be read from a URL; use Paste Text instead.
- Documents are limited to 20,000 characters and 50 saved versions each.

## Project structure

```text
backend/
  src/
    app.js / server.js            Express app / startup (DB, listen)
    config/config.js              env settings + MongoDB connection
    analysis/                     grammar.js (LanguageTool + score + fixes), readability.js (Flesch), simplify.js (rules)
    services/                     analysisService (shared pipeline), extractionService, safeFetch (SSRF), exportService
    controllers/ routes/          auth, documents, health
    middleware/                   auth.js (cookie JWT), upload.js (multer, memory)
    models/                       User.js, Document.js
  tests/                          node --test
frontend/src/
  pages/                          Home, Login, Signup, Portal (dashboard), NewContent, DocumentResults, Compare, History
  components/ hooks/ api/ context/ utils/
examples/sample-content.txt
```
