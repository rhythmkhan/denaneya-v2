/**
 * DenaNeya v2.0 - Authentication Router
 * Mounts register, login, google oauth, and me endpoints with route-level rate limiting.
 */

import { Router } from 'express';
import { register, login, getMe, googleVerifyToken, getGoogleAuthUrl } from '../controllers/authController.js';
import { authMiddleware } from '../middlewares/auth.js';
import { authLimiter } from '../middlewares/rateLimiter.js';

const router = Router();

// Public auth routes (Protected by authLimiter)
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);

// Google OAuth verification and login endpoints
router.get('/google/url', getGoogleAuthUrl);
router.post('/google/verify-token', authLimiter, googleVerifyToken);
router.post('/google/login', authLimiter, googleVerifyToken);

// Protected user profile route
router.get('/me', authMiddleware, getMe);

export default router;
