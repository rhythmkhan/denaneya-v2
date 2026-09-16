/**
 * DenaNeya v2.0 - Super Admin Authentication Controller
 * Handles Google OAuth login for superadmin and Super Admin profile retrieval.
 */

import { verifyGoogleIdToken } from '../services/googleAuthService.js';
import { generateToken, generatePreAuthToken } from '../utils/token.js';
import dbPkg from '@denaneya/database';

const { getDatabase } = dbPkg;

/**
 * POST /api/admin/auth/google
 * Super Admin Google OAuth Sign-In.
 * Rejects unlisted or non-superadmin users with HTTP 403 FORBIDDEN_SUPERADMIN_REQUIRED.
 */
export async function adminGoogleLogin(req, res) {
  const idToken = req.body.idToken || req.body.token || req.body.credential;

  if (!idToken || typeof idToken !== 'string') {
    return res.status(400).json({
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'idToken string is required in request body.'
    });
  }

  try {
    // 1. Verify Google ID Token
    const googleProfile = await verifyGoogleIdToken(idToken);

    // 2. Query user in database
    const db = getDatabase();
    const user = await db.get(
      'SELECT id, name, email, password_hash, role, credits, status, two_factor_enabled, avatar_url, google_id FROM users WHERE google_id = ? OR email = ?',
      [googleProfile.googleId, googleProfile.email]
    );

    // 3. Reject if account does not exist (Strict anti-escalation)
    if (!user) {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN_SUPERADMIN_REQUIRED',
        message: 'Access denied: No Super Admin account found with this Google identity.'
      });
    }

    // 4. Reject if account is deactivated
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        code: 'ACCOUNT_DEACTIVATED',
        message: 'Account is deactivated or suspended. Please contact support.'
      });
    }

    // 5. Reject if role is not superadmin
    if (user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN_SUPERADMIN_REQUIRED',
        message: 'Access denied: Administrative privileges required.'
      });
    }

    // 6. Link google_id and avatar if missing
    if (!user.google_id || (!user.avatar_url && googleProfile.avatarUrl)) {
      await db.query(
        'UPDATE users SET google_id = COALESCE(google_id, ?), avatar_url = COALESCE(avatar_url, ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [googleProfile.googleId, googleProfile.avatarUrl, user.id]
      );
      user.google_id = user.google_id || googleProfile.googleId;
      user.avatar_url = user.avatar_url || googleProfile.avatarUrl;
    }

    // 7. Check 2FA requirement
    const is2FAEnabled = Boolean(user.two_factor_enabled);
    if (is2FAEnabled) {
      const preAuthToken = generatePreAuthToken({
        id: user.id,
        email: user.email,
        role: user.role
      });

      return res.status(200).json({
        success: true,
        requires2FA: true,
        requires_2fa: true,
        message: 'Two-factor authentication code required.',
        preAuthToken,
        tempToken: preAuthToken,
        temp_token: preAuthToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    }

    // 8. Issue full 24h admin JWT token
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: 'superadmin',
      credits: Number(user.credits || 0)
    });

    return res.status(200).json({
      success: true,
      message: 'Super Admin authentication successful.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        credits: Number(user.credits || 0),
        status: user.status,
        twoFactorEnabled: false,
        two_factor_enabled: false,
        totp_enabled: false,
        avatarUrl: user.avatar_url || null,
        avatar_url: user.avatar_url || null
      }
    });
  } catch (err) {
    console.error('[adminGoogleLogin Error]:', err.message);
    const statusCode = err.code === 'INVALID_GOOGLE_TOKEN' || err.code === 'TOKEN_EXPIRED' || err.code === 'TOKEN_AUDIENCE_MISMATCH' ? 401 : 500;
    return res.status(statusCode).json({
      success: false,
      code: err.code || 'GOOGLE_AUTH_FAILED',
      message: err.message || 'Failed to authenticate with Google.'
    });
  }
}

/**
 * GET /api/admin/me
 * Retrieves current Super Admin session details with live DB status check.
 */
export async function getAdminMe(req, res) {
  try {
    const db = getDatabase();
    const user = await db.get(
      'SELECT id, name, email, role, credits, status, two_factor_enabled, avatar_url, created_at, updated_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        code: 'USER_NOT_FOUND',
        message: 'Super Admin profile not found.'
      });
    }

    const is2FA = Boolean(user.two_factor_enabled);

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        credits: Number(user.credits || 0),
        status: user.status,
        twoFactorEnabled: is2FA,
        two_factor_enabled: is2FA,
        totp_enabled: is2FA,
        twoFactorVerified: Boolean(req.user.twoFactorVerified),
        avatarUrl: user.avatar_url || null,
        avatar_url: user.avatar_url || null,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      },
      platform: {
        name: 'DenaNeya v2.0',
        environment: process.env.NODE_ENV || 'development',
        version: '2.0.0'
      }
    });
  } catch (err) {
    console.error('[getAdminMe Error]:', err.message);
    return res.status(500).json({
      success: false,
      code: 'PROFILE_FETCH_FAILED',
      message: 'Failed to retrieve Super Admin profile.'
    });
  }
}

export const getAdminProfile = getAdminMe;
export default {
  adminGoogleLogin,
  getAdminMe,
  getAdminProfile
};
