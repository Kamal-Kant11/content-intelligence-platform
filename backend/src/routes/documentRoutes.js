import { Router } from 'express';
import { deleteDocument, getDocumentAnalysis, getDocumentFile, getDocumentLines, getDocumentScores, getDocumentText, listDocuments, uploadDocument } from '../controllers/documentController.js';
import { protect } from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = Router();

router.use(protect);

router.get('/', listDocuments);
router.post('/upload', upload, uploadDocument);
router.get('/:id/file', getDocumentFile);
router.get('/:id/text', getDocumentText);
router.get('/:id/analysis', getDocumentAnalysis);
router.get('/:id/scores', getDocumentScores);
router.get('/:id/lines', getDocumentLines);
router.delete('/:id', deleteDocument);

export default router;
