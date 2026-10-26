import { Router } from 'express';
import { signup, login, logout, getMe } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.post('/register', signup);
router.post('/signup', signup); // older name, kept for existing clients
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', protect, getMe);

export default router;
