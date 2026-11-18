import { Router } from 'express';
<<<<<<< HEAD
import { deleteDocument, getDocumentAnalysis, getDocumentFile, getDocumentLines, getDocumentScores, getDocumentText, listDocuments, uploadDocument } from '../controllers/documentController.js';
=======
import { approveDocument, deleteDocument, getDocumentAnalysis, getDocumentFile, getDocumentLines, getDocumentScores, getDocumentText, listDocuments, uploadDocument } from '../controllers/documentController.js';
>>>>>>> bfa39c5c92556a58a6a4353a3094e5a37d68e0e8
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
<<<<<<< HEAD
=======
router.post('/:id/approve', approveDocument);
>>>>>>> bfa39c5c92556a58a6a4353a3094e5a37d68e0e8
router.delete('/:id', deleteDocument);

export default router;
