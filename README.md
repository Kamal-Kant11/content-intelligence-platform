# AI Content Assurance Platform — Phase 1

Simple MERN starter: signup, login (JWT token), and private document upload.
No AI analysis yet.

**Stack:** React + Vite + Tailwind · Express · MongoDB (Mongoose) · bcrypt + JWT · Multer

## Folder structure (MVC)

```
backend/src
  config/config.js        only config file (env settings + MongoDB connection)
  models/                 User.js, Document.js
  controllers/            authController.js, documentController.js
  routes/                 authRoutes.js, documentRoutes.js
  middleware/             auth.js (token check), upload.js (multer)
  server.js
frontend/src
  pages/  components/  context/  api/  utils/
```

## Setup

You need Node.js 18+ and MongoDB (local, or a free MongoDB Atlas cluster).

**1. Backend**

```bash
cd backend
npm install
cp .env.example .env      # Windows: copy .env.example .env
```

Edit `backend/.env`:

- `MONGODB_URI` — local: `mongodb://127.0.0.1:27017/ai_content_assurance`
  or Atlas: `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/ai_content_assurance`
- `JWT_SECRET` — any long random string

```bash
npm run dev               # http://localhost:5000
```

**2. Frontend** (new terminal)

```bash
cd frontend
npm install
npm run dev               # http://localhost:5173
```

## How login works

Signup and login return `{ token, user }`. The frontend saves the token in `localStorage` and sends it as
`Authorization: Bearer <token>` on every request. Private routes use `middleware/auth.js` to verify it.
Logout simply deletes the saved token.

## API

| Method | Path | Token | Purpose |
| --- | --- | --- | --- |
| POST | `/api/auth/signup` | no | Create account |
| POST | `/api/auth/login` | no | Log in |
| GET | `/api/auth/me` | yes | Current user |
| POST | `/api/documents/upload` | yes | Upload one file (field `file`: PDF, DOCX or TXT, max 10 MB) |
| GET | `/api/documents` | yes | Your documents |
| GET | `/api/documents/:id` | yes | One of your documents with extracted text |
| DELETE | `/api/documents/:id` | yes | Delete a document |

Every document query is filtered by the logged-in user's id, so users cannot see or delete each other's files.
Uploaded files are stored in `backend/uploads` under random names and are never served publicly.

## Notes

- Scanned (image-only) PDFs have no extractable text; the file is still saved.
- Passwords are stored only as bcrypt hashes.
- localStorage tokens are simple but readable by page scripts; for production consider httpOnly cookies.
