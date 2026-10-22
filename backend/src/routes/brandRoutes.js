import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import upload from '../middleware/upload.js';
import * as c from '../controllers/brandController.js';

const router = Router();

router.use(protect);

// Multipart requests carry a file; JSON requests carry text or a URL.
const optionalUpload = (req, res, next) => (req.is('multipart/form-data') ? upload(req, res, next) : next());

router.post('/', c.createBrand);
router.get('/', c.getBrands);
router.get('/:id', c.getBrand);
router.patch('/:id', c.updateBrand);
router.delete('/:id', c.deleteBrand);

router.post('/:id/sources', optionalUpload, c.addSource);
router.get('/:id/sources', c.getSources);
router.get('/:id/sources/:sourceId', c.getSource);
router.delete('/:id/sources/:sourceId', c.deleteSource);

router.post('/:id/learn', c.learn);
router.get('/:id/observations', c.getObservations);

router.get('/:id/rules', c.getRules);
router.post('/:id/rules', c.createRule);
router.patch('/:id/rules/:ruleId', c.updateRule);
router.delete('/:id/rules/:ruleId', c.deleteRule);

export default router;
