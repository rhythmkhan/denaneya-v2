/**
 * DenaNeya v2.0 - Super Admin Authorization Guard Middleware
 * Enforces two-tier defense:
 * 1. Cryptographic JWT HS256 signature and expiration check.
 * 2. Live Database Verification: `SELECT id, role, status FROM users WHERE id = ?`.
 * Rejects unauthenticated requests with HTTP 401 UNAUTHORIZED.
 * Rejects deactivated users with HTTP 403 ACCOUNT_DEACTIVATED.
 * Rejects non-superadmin users with HTTP 403 FORBIDDEN_SUPERADMIN_REQUIRED.
 */

import { verifyToken } from '../utils/token.js';
import dbPkg from '@denaneya/database';

const { getDatabase } = dbPkg;

/**
 * Central Super Admin Guard
 */
export async function superAdminGuard(req, res, next) {
  let userId = req.user?.id;
  let tokenRole = req.user?.role;
  let decoded = null;

  // 1. If req.user not already set by upstream middleware, extract and verify Bearer JWT
  if (!userId) {
    const authHeader = req.headers.authorization;
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

    if (decoded.isPreAuth) {
      return res.status(401).json({
        success: false,
        code: 'UNAUTHORIZED',
        message: '2FA challenge token cannot be used for general authorization.'
      });
    }

    userId = decoded.id;
    tokenRole = decoded.role;
  } else if (req.user?.isPreAuth) {
    return res.status(401).json({
      success: false,
      code: 'UNAUTHORIZED',
      message: '2FA challenge token cannot be used for general authorization.'
    });
  }

  // 2. Pre-check token role claim and impersonation boundary
  if (decoded?.isImpersonated || req.user?.isImpersonated) {
    return res.status(403).json({
      success: false,
      code: 'FORBIDDEN_SUPERADMIN_REQUIRED',
      message: 'Impersonated merchant tokens cannot perform super admin actions.'
    });
  }

  if (tokenRole && tokenRole !== 'superadmin') {
    return res.status(403).json({
      success: false,
      code: 'FORBIDDEN_SUPERADMIN_REQUIRED',
      message: 'Access denied: Administrative privileges required.'
    });
  }

  // 3. Live Database Verification (Guarantees zero stale authorization window)
  try {
    const db = getDatabase();
    const user = await db.get(
      'SELECT id, name, email, role, credits, status, two_factor_enabled, avatar_url FROM users WHERE id = ?',
      [userId]
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        code: 'USER_NOT_FOUND',
        message: 'The administrative account associated with this token no longer exists.'
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        code: 'ACCOUNT_DEACTIVATED',
        message: 'This administrative account has been deactivated or suspended.'
      });
    }

    if (user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN_SUPERADMIN_REQUIRED',
        message: 'Access denied: Administrative privileges required.'
      });
    }

    // 4. Attach verified superadmin identity to request context
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      credits: Number(user.credits || 0),
      status: user.status,
      twoFactorEnabled: Boolean(user.two_factor_enabled),
      twoFactorVerified: Boolean(decoded?.twoFactorVerified || req.user?.twoFactorVerified),
      avatarUrl: user.avatar_url || null
    };

    return next();
  } catch (dbErr) {
    console.error('[superAdminGuard] Live DB verification error:', dbErr.message);
    return res.status(500).json({
      success: false,
      code: 'INTERNAL_ERROR',
      message: 'Failed to verify administrative privileges.'
    });
  }
}

/**
 * 2FA Enforcement Middleware for sensitive administrative operations
 */
export function require2FA(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      code: 'UNAUTHORIZED',
      message: 'Authentication required.'
    });
  }

  if (req.user.twoFactorEnabled && !req.user.twoFactorVerified && !req.session2FAVerified) {
    return res.status(403).json({
      success: false,
      code: 'TWO_FACTOR_VERIFICATION_REQUIRED',
      message: 'This administrative operation requires two-factor authentication.'
    });
  }

  return next();
}

/**
 * Network-wide Maintenance Mode Guard
 */
export async function maintenanceGuard(req, res, next) {
  // Routes exempt from maintenance mode: admin, auth, customizer public, health
  const path = req.path || req.originalUrl || '';
  if (
    path.startsWith('/api/admin') ||
    path.startsWith('/api/auth') ||
    path.startsWith('/api/customizer') ||
    path === '/health' ||
    path === '/api/health'
  ) {
    return next();
  }

  // Super Admins bypass maintenance mode
  if (req.user && req.user.role === 'superadmin') {
    return next();
  }

  try {
    const db = getDatabase();
    const setting = await db.get(
      "SELECT value_json FROM system_settings WHERE key_name = 'maintenance_mode'"
    );
    if (setting) {
      const parsed = typeof setting.value_json === 'string'
        ? JSON.parse(setting.value_json)
        : setting.value_json;
      if (parsed && parsed.enabled) {
        // Check IP whitelist
        const forwarded = req.headers['x-forwarded-for'];
        const clientIp = (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : '') || req.ip || req.socket?.remoteAddress || '';
        const allowedIps = parsed.allowedIps || parsed.allowed_ips || [];
        if (allowedIps.includes(clientIp)) {
          return next();
        }

        return res.status(503).json({
          success: false,
          code: 'SERVICE_MAINTENANCE',
          message: parsed.message || 'The platform is currently undergoing scheduled maintenance.'
        });
      }
    }
  } catch (_) {
    // Graceful fallback if system_settings is not yet migrated
  }

  return next();
}

export const requireSuperAdmin = superAdminGuard;
export default superAdminGuard;
