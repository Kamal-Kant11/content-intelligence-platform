import path from 'node:path';
import multer from 'multer';
import { config } from '../config/config.js';
import { ALLOWED_EXTENSIONS } from '../services/extractionService.js';
import { badRequest } from '../utils/httpError.js';

// Files are kept in memory only long enough to extract their text; nothing is written to disk.
// The extension is checked here, the real file type (magic bytes) during extraction.
export default multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxFileBytes, files: 1, fields: 5 },
  fileFilter(_req, file, cb) {
    if (!ALLOWED_EXTENSIONS.includes(path.extname(file.originalname).toLowerCase())) {
      return cb(badRequest('Only PDF, DOCX and TXT files are supported.'));
    }
    cb(null, true);
  },
}).single('file');
