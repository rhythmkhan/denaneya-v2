/**
 * DenaNeya v2.0 - Super Admin 2FA & Auth Controller
 * Manages TOTP generation, verification, 2FA login, and backup recovery.
 */

import dbPkg from '@denaneya/database';
import {
  generateSecret,
  generateOtpauthUri,
  generateQRCodeDataUrl,
  generateBackupCodes,
  hashBackupCodes,
  verifyBackupCode,
  verifyTOTP,
  encryptSecret,
  decryptSecret
} from '../services/totpService.js';
import { generateToken, verifyPreAuthToken } from '../utils/token.js';

const { getDatabase } = dbPkg;

const pendingBackupCodes = new Map();

/**
 * POST /api/admin/2fa/generate
 * Generates Base32 secret, QR code Data URL, and 8 single-use backup recovery codes.
 * Access: SuperAdmin (superAdminGuard)
 */
export async function generate2FA(req, res) {
  const userId = req.user.id;
  const db = getDatabase();

  try {
    const user = await db.get('SELECT id, email FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({
        success: false,
        code: 'USER_NOT_FOUND',
        message: 'Administrator account not found.'
      });
    }

    // 1. Generate TOTP secret and recovery codes
    const { secret, formattedSecret } = generateSecret();
    const otpauthUri = generateOtpauthUri(user.email, secret, 'DenaNeya');
    const qrCodeDataUrl = await generateQRCodeDataUrl(otpauthUri);

    const backupCodes = generateBackupCodes(8);
    const hashedBackupCodes = await hashBackupCodes(backupCodes);
    const encryptedSecret = encryptSecret(secret);

    pendingBackupCodes.set(userId, backupCodes);

    // 2. Persist to DB with two_factor_enabled = 0 until verified
    await db.query(
      `UPDATE users
       SET two_factor_secret = ?, two_factor_backup_codes = ?, two_factor_enabled = 0, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [encryptedSecret, JSON.stringify(hashedBackupCodes), userId]
    );

    return res.status(200).json({
      success: true,
      secret,
      formattedSecret,
      otpauthUri,
      otpauthUrl: otpauthUri,
      otpauth_url: otpauthUri,
      qrCode: qrCodeDataUrl,
      qr_code: qrCodeDataUrl,
      qrCodeDataUrl,
      backupCodes,
      backup_codes: backupCodes,
      message: 'Scan the QR code with Google Authenticator and submit the 6-digit code to complete setup. Save your emergency backup codes safely.'
    });
  } catch (err) {
    console.error('[generate2FA Error]:', err.message);
    return res.status(500).json({
      success: false,
      code: '2FA_GENERATION_FAILED',
      message: 'Failed to initialize two-factor authentication.'
    });
  }
}

/**
 * POST /api/admin/2fa/verify
 * Validates initial 6-digit code and activates 2FA on the account, returning 8 backup codes.
 * Access: SuperAdmin (superAdminGuard)
 */
export async function verify2FA(req, res) {
  const code = req.body.code || req.body.token || req.body.otp;
  if (!code || typeof code !== 'string') {
    return res.status(400).json({
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'A 6-digit authentication code is required.'
    });
  }

  const userId = req.user.id;
  const db = getDatabase();

  try {
    const user = await db.get(
      'SELECT id, two_factor_secret, two_factor_enabled FROM users WHERE id = ?',
      [userId]
    );

    if (!user || !user.two_factor_secret) {
      return res.status(400).json({
        success: false,
        code: '2FA_NOT_INITIALIZED',
        message: 'Two-factor secret has not been generated. Please generate a QR code first.'
      });
    }

    const plainSecret = decryptSecret(user.two_factor_secret);
    const result = verifyTOTP(plainSecret, code, { userId: `${user.id}:verify` });

    if (!result.valid) {
      if (result.reason === 'REPLAY_DETECTED') {
        return res.status(400).json({
          success: false,
          code: 'REPLAY_DETECTED',
          message: 'This code has already been used. Please wait 30 seconds for a new code.'
        });
      }
      return res.status(400).json({
        success: false,
        code: 'INVALID_2FA_CODE',
        message: 'Invalid 6-digit authentication code. Please check your authenticator app.'
      });
    }

    // Retrieve cached backup codes or generate fresh if not present
    let backupCodes = pendingBackupCodes.get(user.id);
    if (!backupCodes) {
      backupCodes = generateBackupCodes(8);
      const hashedBackupCodes = await hashBackupCodes(backupCodes);
      await db.query(
        'UPDATE users SET two_factor_enabled = 1, two_factor_backup_codes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [JSON.stringify(hashedBackupCodes), user.id]
      );
    } else {
      await db.query(
        'UPDATE users SET two_factor_enabled = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [user.id]
      );
      pendingBackupCodes.delete(user.id);
    }

    return res.status(200).json({
      success: true,
      message: 'Two-factor authentication successfully verified and enabled.',
      twoFactorEnabled: true,
      two_factor_enabled: true,
      totp_enabled: true,
      backupCodes,
      backup_codes: backupCodes
    });
  } catch (err) {
    console.error('[verify2FA Error]:', err.message);
    return res.status(500).json({
      success: false,
      code: '2FA_VERIFICATION_FAILED',
      message: 'Failed to verify two-factor code.'
    });
  }
}

/**
 * POST /api/admin/auth/login-2fa
 * Completes super admin login using preAuthToken/tempToken and 6-digit TOTP code.
 * Access: Public (rate limited via authLimiter)
 */
export async function login2FA(req, res) {
  const preAuthToken = req.body.preAuthToken || req.body.tempToken || req.body.temp_token;
  const code = req.body.code || req.body.token || req.body.otp;
  if (!preAuthToken || !code) {
    return res.status(400).json({
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'preAuthToken and 6-digit code are required.'
    });
  }

  let decoded;
  try {
    decoded = verifyPreAuthToken(preAuthToken);
  } catch (err) {
    return res.status(401).json({
      success: false,
      code: 'PRE_AUTH_EXPIRED',
      message: '2FA authentication session expired. Please log in again.'
    });
  }

  const db = getDatabase();
  try {
    const user = await db.get(
      'SELECT id, name, email, role, credits, status, two_factor_secret, two_factor_enabled FROM users WHERE id = ?',
      [decoded.id]
    );

    if (!user || user.status !== 'active') {
      return res.status(401).json({
        success: false,
        code: 'UNAUTHORIZED',
        message: 'Account is invalid or inactive.'
      });
    }

    if (user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN_SUPERADMIN_REQUIRED',
        message: 'Administrative privileges required.'
      });
    }

    if (!Boolean(user.two_factor_enabled) || !user.two_factor_secret) {
      return res.status(400).json({
        success: false,
        code: '2FA_NOT_ENABLED',
        message: 'Two-factor authentication is not active on this account.'
      });
    }

    const plainSecret = decryptSecret(user.two_factor_secret);
    const result = verifyTOTP(plainSecret, code, { userId: user.id });

    if (!result.valid) {
      if (result.reason === 'REPLAY_DETECTED') {
        return res.status(401).json({
          success: false,
          code: 'REPLAY_DETECTED',
          message: 'This code was already consumed. Please wait for the next time step.'
        });
      }
      return res.status(401).json({
        success: false,
        code: 'INVALID_2FA_CODE',
        message: 'Invalid two-factor authentication code.'
      });
    }

    // Issue full 24h JWT
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      credits: Number(user.credits || 0),
      twoFactorVerified: true
    });

    return res.status(200).json({
      success: true,
      message: 'Two-factor authentication verified successfully.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        credits: Number(user.credits || 0),
        status: user.status
      }
    });
  } catch (err) {
    console.error('[login2FA Error]:', err.message);
    return res.status(500).json({
      success: false,
      code: 'LOGIN_2FA_FAILED',
      message: 'Failed to complete 2FA authentication.'
    });
  }
}

/**
 * POST /api/admin/auth/login-backup
 * Emergency backup recovery login using preAuthToken and single-use recovery code.
 * Access: Public (rate limited via authLimiter)
 */
export async function loginBackup(req, res) {
  const preAuthToken = req.body.preAuthToken || req.body.tempToken || req.body.temp_token;
  const recoveryCode = req.body.recoveryCode || req.body.backupCode || req.body.backup_code || req.body.code;
  if (!preAuthToken || !recoveryCode) {
    return res.status(400).json({
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'preAuthToken and recoveryCode are required.'
    });
  }

  let decoded;
  try {
    decoded = verifyPreAuthToken(preAuthToken);
  } catch (err) {
    return res.status(401).json({
      success: false,
      code: 'PRE_AUTH_EXPIRED',
      message: 'Recovery session expired. Please log in again.'
    });
  }

  const db = getDatabase();
  try {
    const user = await db.get(
      'SELECT id, name, email, role, credits, status, two_factor_backup_codes, two_factor_enabled FROM users WHERE id = ?',
      [decoded.id]
    );

    if (!user || user.status !== 'active') {
      return res.status(401).json({
        success: false,
        code: 'UNAUTHORIZED',
        message: 'Account is invalid or inactive.'
      });
    }

    if (user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN_SUPERADMIN_REQUIRED',
        message: 'Administrative privileges required.'
      });
    }

    if (!Boolean(user.two_factor_enabled)) {
      return res.status(400).json({
        success: false,
        code: '2FA_NOT_ENABLED',
        message: 'Two-factor authentication is not active on this account.'
      });
    }

    let backupCodes = [];
    try {
      backupCodes = JSON.parse(user.two_factor_backup_codes || '[]');
    } catch (_) {}

    if (!Array.isArray(backupCodes) || backupCodes.length === 0) {
      return res.status(400).json({
        success: false,
        code: 'NO_BACKUP_CODES_REMAINING',
        message: 'No emergency backup recovery codes remain on this account. Contact emergency operations.'
      });
    }

    const match = await verifyBackupCode(recoveryCode, backupCodes);
    if (!match.valid) {
      return res.status(401).json({
        success: false,
        code: 'INVALID_BACKUP_CODE',
        message: 'Invalid emergency backup recovery code.'
      });
    }

    // Atomic Compare-And-Swap (CAS) consumption: single-use code removal
    backupCodes.splice(match.matchedIndex, 1);
    const updateRes = await db.query(
      'UPDATE users SET two_factor_backup_codes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND two_factor_backup_codes = ?',
      [JSON.stringify(backupCodes), user.id, user.two_factor_backup_codes]
    );

    const affectedRows = Number(updateRes?.affectedRows ?? updateRes?.changes ?? 0);
    if (affectedRows === 0) {
      return res.status(401).json({
        success: false,
        code: 'INVALID_BACKUP_CODE',
        message: 'Invalid or already consumed recovery code.'
      });
    }

    // Issue full 24h JWT
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      credits: Number(user.credits || 0),
      twoFactorVerified: true
    });

    return res.status(200).json({
      success: true,
      message: 'Emergency backup recovery login successful.',
      token,
      remainingBackupCodes: backupCodes.length,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        credits: Number(user.credits || 0),
        status: user.status
      }
    });
  } catch (err) {
    console.error('[loginBackup Error]:', err.message);
    return res.status(500).json({
      success: false,
      code: 'LOGIN_BACKUP_FAILED',
      message: 'Emergency recovery login failed.'
    });
  }
}

export default {
  generate2FA,
  verify2FA,
  login2FA,
  loginBackup
};
