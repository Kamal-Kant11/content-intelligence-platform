import { Router } from 'express';
import { signup, login, logout, getMe } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { loginLimiter } from '../controllers/rateLimiting.js';

const router = Router();

router.post('/register', signup);
router.post('/signup', signup);
router.post('/login',loginLimiter, login);
router.post('/logout', logout);
router.get('/me', protect, getMe);

export default router;
