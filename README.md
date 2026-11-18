# ContentIQ

Sign up, then add content in one of three ways: upload a PDF, DOCX or TXT file, enter a public website
URL, or paste text. Each item is saved to your account and listed in Documents.

**Stack:** MongoDB · Express · React (Vite + Tailwind) · Node.js

## Limits

- Files: PDF, DOCX or TXT, up to 5 MB
- Extracted text: up to 20,000 characters (set `MAX_TEXT_CHARS` in `backend/.env` to change it)

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

Check that the backend and MongoDB are up: open `http://localhost:5000/api/health`.

## Tests

```powershell
cd backend
npm test
```
