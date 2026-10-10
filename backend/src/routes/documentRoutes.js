import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import upload from '../middleware/upload.js';
import { uploadDocument, getDocuments, getDocument, deleteDocument } from '../controllers/documentController.js';

const router = Router();

router.use(protect); // login required; runs before multer so nothing is saved for guests

router.post('/upload', upload, uploadDocument);
router.get('/', getDocuments);
router.get('/:id', getDocument);
router.delete('/:id', deleteDocument);

export default router;
