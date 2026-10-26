import { Router } from 'express';
import {
  analyzeDocument,
  createFromText,
  createFromUpload,
  createFromUrl,
  exportDocument,
  getDocument,
  listDocuments,
  optimizeDocument,
  reviewDocument,
  saveDraft,
} from '../controllers/documentController.js';
import { protect } from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = Router();

router.use(protect);

router.get('/', listDocuments);
router.post('/upload', upload, createFromUpload);
router.post('/from-url', createFromUrl);
router.post('/from-text', createFromText);

router.get('/:id', getDocument);
router.post('/:id/analyze', analyzeDocument);
router.post('/:id/optimize', optimizeDocument);
router.put('/:id/draft', saveDraft);
router.patch('/:id/review', reviewDocument);
router.get('/:id/export', exportDocument);

export default router;
