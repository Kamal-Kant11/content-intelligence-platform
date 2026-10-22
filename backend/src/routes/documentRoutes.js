import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import upload from '../middleware/upload.js';
import * as c from '../controllers/documentController.js';

const router = Router();

router.use(protect); // login required; runs before multer so nothing is saved for guests

router.post('/', c.createDocument); // write / paste / url
router.post('/upload', upload, c.uploadDocument); // file
router.get('/', c.getDocuments);
router.get('/:id', c.getDocument);
router.get('/:id/export', c.exportDocument); // ?format=source|docx|pdf|txt|md&version=current|original&section=sec_01
router.patch('/:id', c.updateDocument);
router.delete('/:id', c.deleteDocument);

router.post('/:id/analyze', c.analyzeDocument);
router.get('/:id/analysis', c.getAnalysis);

router.post('/:id/optimize', c.optimizeDocument);
router.get('/:id/optimizations', c.getOptimizations);
router.get('/:id/optimizations/:optimizationId', c.getOptimization);

export default router;
