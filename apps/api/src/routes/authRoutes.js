/**
 * DenaNeya v2.0 - Authentication Router
 * Mounts register, login, and me endpoints with route-level rate limiting.
 */

import { Router } from 'express';
import { register, login, getMe } from '../controllers/authController.js';
import { authMiddleware } from '../middlewares/auth.js';
import { authLimiter } from '../middlewares/rateLimiter.js';

const router = Router();

// Public auth routes (Protected by authLimiter)
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);

// Protected user profile route
router.get('/me', authMiddleware, getMe);

export default router;
