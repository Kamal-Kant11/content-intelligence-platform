import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import multer from 'multer';
import { config } from '../config/config.js';

const ALLOWED = {
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.txt': 'text/plain',
};

fs.mkdirSync(config.uploadDir, { recursive: true });

// Saved under a random name inside the private uploads folder.
const storage = multer.diskStorage({
  destination: config.uploadDir,
  filename: (_req, file, cb) => cb(null, crypto.randomUUID() + path.extname(file.originalname).toLowerCase()),
});

function fileFilter(_req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED[ext] !== file.mimetype) {
    const err = new Error('Only PDF, DOCX and TXT files are allowed.');
    err.status = 400;
    return cb(err);
  }
  cb(null, true);
}

export default multer({ storage, fileFilter, limits: { fileSize: config.maxFileSize, files: 1 } }).single('file');
