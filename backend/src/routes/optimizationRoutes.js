import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import * as c from '../controllers/optimizationController.js';

const router = Router();

router.use(protect);

router.get('/:id', c.getOptimization);
router.post('/:id/review', c.reviewChanges); // several changes at once
router.patch('/:id/changes/:changeId', c.reviewChange); // one change
router.post('/:id/apply', c.applyOptimization);
router.get('/:id/report', c.exportReport); // ?format=docx|pdf|txt|md

export default router;
