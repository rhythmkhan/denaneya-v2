/**
 * DenaNeya v2.0 - JWT Authentication Middleware
 * Validates 'Authorization: Bearer <token>', protects merchant routes,
 * resolves user context from database, and binds req.user = { id, email, role, credits }.
 * Rejects unauthenticated calls with HTTP 401 (Enforces SEC-TEST-01).
 */

import { verifyToken } from '../utils/token.js';
import dbPkg from '@denaneya/database';

const { getDatabase } = dbPkg;

export async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  // 1. Verify Header Presence & Format
  if (!authHeader || typeof authHeader !== 'string') {
    return res.status(401).json({
      success: false,
      code: 'UNAUTHORIZED',
      message: 'Authentication required. Bearer token missing.'
    });
  }

  const parts = authHeader.trim().split(/\s+/);
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer' || !parts[1]) {
    return res.status(401).json({
      success: false,
      code: 'UNAUTHORIZED',
      message: 'Malformed authorization header. Expected format: Bearer <token>'
    });
  }

  const token = parts[1];

  // 2. Verify Cryptographic Signature & Expiration
  let decoded;
  try {
    decoded = verifyToken(token);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        code: 'TOKEN_EXPIRED',
        message: 'Authentication session expired. Please log in again.'
      });
    }
    return res.status(401).json({
      success: false,
      code: 'INVALID_TOKEN',
      message: 'Invalid or forged authentication token.'
    });
  }

  // 3. Database Verification (Guarantees user exists and status is active)
  try {
    const db = getDatabase();
    const user = await db.get(
      'SELECT id, email, role, credits, status FROM users WHERE id = ?',
      [decoded.id]
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        code: 'USER_NOT_FOUND',
        message: 'The account associated with this token no longer exists.'
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        code: 'ACCOUNT_DEACTIVATED',
        message: 'This user account has been deactivated or suspended.'
      });
    }

    // 4. Attach verified user identity to request context
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      credits: Number(user.credits)
    };

    return next();
  } catch (dbErr) {
    console.error('[authMiddleware] DB Lookup Error:', dbErr.message);
    return res.status(500).json({
      success: false,
      code: 'INTERNAL_ERROR',
      message: 'Failed to verify user credentials.'
    });
  }
}

export default authMiddleware;
