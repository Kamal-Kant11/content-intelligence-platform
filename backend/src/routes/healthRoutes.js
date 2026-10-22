import { Router } from 'express';
import { health, models } from '../controllers/healthController.js';

const router = Router();

router.get('/', health);
router.get('/models', models);

export default router;
