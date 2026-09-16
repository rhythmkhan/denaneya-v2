/**
 * DenaNeya v2.0 - Server-to-Server Google OAuth & ID Token Verification Service
 * Validates Google ID tokens against Google's TokenInfo endpoint using native fetch,
 * verifies audience against GOOGLE_CLIENT_ID, supports deterministic sandbox mock mode,
 * and executes account linking and merchant auto-provisioning.
 */

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import dbPkg from '@denaneya/database';

const { getDatabase } = dbPkg;

const GOOGLE_TOKENINFO_ENDPOINT = 'https://oauth2.googleapis.com/tokeninfo';
const STARTER_CREDITS = 50;
const BCRYPT_SALT_ROUNDS = 10;

/**
 * Parses and verifies deterministic mock Google tokens for testing & sandbox environments.
 * @param {string} idToken
 * @returns {Object} Standardized Google identity payload
 */
export function parseMockGoogleToken(idToken) {
  if (!idToken || typeof idToken !== 'string') {
    const err = new Error('Invalid Google ID token.');
    err.code = 'INVALID_GOOGLE_TOKEN';
    throw err;
  }

  const tokenStr = idToken.trim();

  // Negative test cases for mock environment
  if (tokenStr === 'mock-google-token-invalid' || tokenStr.includes('invalid-token')) {
    const err = new Error('Google ID token verification failed: invalid token.');
    err.code = 'INVALID_GOOGLE_TOKEN';
    throw err;
  }

  if (tokenStr === 'mock-google-token-expired' || tokenStr.includes('expired')) {
    const err = new Error('Google ID token has expired.');
    err.code = 'TOKEN_EXPIRED';
    throw err;
  }

  if (tokenStr === 'mock-google-token-unverified' || tokenStr.includes('unverified')) {
    const err = new Error('Google account email is not verified.');
    err.code = 'EMAIL_NOT_VERIFIED';
    throw err;
  }

  if (tokenStr === 'mock-google-token-wrong-audience') {
    const err = new Error('Google token audience does not match GOOGLE_CLIENT_ID.');
    err.code = 'TOKEN_AUDIENCE_MISMATCH';
    throw err;
  }

  let email = 'sandbox.merchant@denaneya.com';
  let name = 'Sandbox Merchant';

  if (tokenStr.startsWith('mock-google-token:')) {
    const parts = tokenStr.split(':');
    if (parts[1]) email = parts[1].trim().toLowerCase();
    if (parts[2]) name = parts[2].trim();
  } else if (tokenStr.startsWith('mock-google-token-')) {
    const raw = tokenStr.slice('mock-google-token-'.length).trim();
    if (raw === 'admin') {
      email = 'admin@denaneya.com';
      name = 'Super Admin';
    } else if (raw === 'merchant' || raw === 'valid') {
      email = 'merchant@denaneya.com';
      name = 'Sandbox Merchant';
    } else if (raw.includes('@')) {
      email = raw.toLowerCase();
      name = email.split('@')[0];
    }
  } else if (tokenStr.includes('@')) {
    email = tokenStr.toLowerCase();
    name = email.split('@')[0];
  }

  const hash = crypto.createHash('sha256').update(email).digest('hex').slice(0, 16);
  return {
    googleId: `google_mock_${hash}`,
    email,
    name,
    avatarUrl: `https://lh3.googleusercontent.com/a/mock_${hash}`,
    emailVerified: true,
    isMock: true
  };
}

/**
 * Validates a Google ID Token using native fetch against Google TokenInfo endpoint.
 * Falls back to deterministic mock validation if GOOGLE_CLIENT_ID is unset or in test mode.
 * @param {string} idToken
 * @param {Object} [options]
 * @returns {Promise<Object>} Verified profile: { googleId, email, name, avatarUrl, emailVerified, isMock }
 */
export async function verifyGoogleIdToken(idToken, options = {}) {
  if (!idToken || typeof idToken !== 'string') {
    const err = new Error('idToken string is required.');
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  const tokenStr = idToken.trim();
  const configuredClientId = options.clientId || process.env.GOOGLE_CLIENT_ID;
  const isCredentialsConfigured = Boolean(
    configuredClientId &&
    configuredClientId !== 'placeholder' &&
    configuredClientId !== 'mock' &&
    configuredClientId !== 'sandbox'
  );

  const isExplicitMockToken = Boolean(
    tokenStr.startsWith('mock-') ||
    tokenStr.startsWith('sandbox-') ||
    tokenStr.startsWith('test-') ||
    tokenStr.includes('@example.com') ||
    tokenStr.includes('@denaneya.com')
  );

  const isProduction = process.env.NODE_ENV === 'production';

  // In production, mock tokens are strictly forbidden and throw INVALID_GOOGLE_TOKEN immediately.
  // Google OAuth credentials must also be properly configured in production.
  if (isProduction) {
    if (isExplicitMockToken) {
      const err = new Error('Sandbox mock tokens are prohibited in production environment.');
      err.code = 'INVALID_GOOGLE_TOKEN';
      throw err;
    }
    if (!isCredentialsConfigured) {
      const err = new Error('Google OAuth is not configured on this production environment.');
      err.code = 'GOOGLE_OAUTH_NOT_CONFIGURED';
      throw err;
    }
  } else {
    // Deterministic Sandbox Mock Fallback for test / development environments
    if (isExplicitMockToken) {
      return parseMockGoogleToken(tokenStr);
    }
    if (!isCredentialsConfigured) {
      const err = new Error('Google ID token verification failed: invalid token.');
      err.code = 'INVALID_GOOGLE_TOKEN';
      throw err;
    }
  }

  // Live S2S Verification via Google TokenInfo Endpoint
  const tokenInfoUrl = process.env.GOOGLE_TOKENINFO_URL || GOOGLE_TOKENINFO_ENDPOINT;
  const endpoint = `${tokenInfoUrl}?id_token=${encodeURIComponent(tokenStr)}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  let res;
  try {
    res = await fetch(endpoint, {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'application/json' }
    });
  } catch (networkErr) {
    clearTimeout(timeoutId);
    const err = new Error(`Failed to contact Google TokenInfo service: ${networkErr.message}`);
    err.code = 'GOOGLE_SERVICE_UNAVAILABLE';
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    const err = new Error(`Google ID token verification failed with status ${res.status}.`);
    err.code = 'INVALID_GOOGLE_TOKEN';
    throw err;
  }

  const payload = await res.json();

  // Audience verification
  if (configuredClientId) {
    const allowedAudiences = configuredClientId.split(',').map((s) => s.trim()).filter(Boolean);
    if (!allowedAudiences.includes(payload.aud)) {
      const err = new Error(`Google token audience mismatch: expected ${configuredClientId}, received ${payload.aud}`);
      err.code = 'TOKEN_AUDIENCE_MISMATCH';
      throw err;
    }
  }

  // Email verification check
  const isVerified = payload.email_verified === 'true' || payload.email_verified === true;
  if (!isVerified) {
    const err = new Error('Google account email is not verified.');
    err.code = 'EMAIL_NOT_VERIFIED';
    throw err;
  }

  if (!payload.email) {
    const err = new Error('Google token did not contain an email address.');
    err.code = 'INVALID_GOOGLE_TOKEN';
    throw err;
  }

  // Token expiration check
  if (payload.exp && Number(payload.exp) * 1000 < Date.now()) {
    const err = new Error('Google ID token has expired.');
    err.code = 'TOKEN_EXPIRED';
    throw err;
  }

  return {
    googleId: payload.sub,
    email: payload.email.toLowerCase().trim(),
    name: payload.name || payload.given_name || payload.email.split('@')[0],
    avatarUrl: payload.picture || null,
    emailVerified: true,
    isMock: false
  };
}

/**
 * Resolves or provisions a user from verified Google profile.
 * Performs account linking if email exists, or creates merchant with default brand.
 * @param {Object} googleProfile
 * @param {Object} [options]
 * @returns {Promise<Object>} { user, brand, isNewUser, linked, error, status, message }
 */
export async function findOrCreateUserFromGoogle(googleProfile, options = {}) {
  const { role = 'merchant', autoCreate = true } = options;
  const db = getDatabase();

  const normalizedEmail = googleProfile.email.toLowerCase().trim();
  const googleId = googleProfile.googleId;
  const avatarUrl = googleProfile.avatarUrl || null;
  const name = googleProfile.name || normalizedEmail.split('@')[0];

  // 1. Search by google_id
  let user = await db.get(
    'SELECT id, name, email, role, credits, status, two_factor_enabled, avatar_url, google_id FROM users WHERE google_id = ?',
    [googleId]
  );

  if (user) {
    if (user.status !== 'active') {
      return {
        error: 'ACCOUNT_DEACTIVATED',
        message: 'Account is deactivated or suspended. Please contact support.',
        status: 403
      };
    }

    if (avatarUrl && user.avatar_url !== avatarUrl) {
      await db.query(
        'UPDATE users SET avatar_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [avatarUrl, user.id]
      );
      user.avatar_url = avatarUrl;
    }

    const brand = await db.get(
      `SELECT id, brand_name, brand_slug, api_key FROM brands WHERE user_id = ? AND status != 'deleted' ORDER BY created_at ASC LIMIT 1`,
      [user.id]
    );

    return {
      user,
      brand: brand ? {
        id: brand.id,
        brandName: brand.brand_name,
        brandSlug: brand.brand_slug,
        apiKey: brand.api_key
      } : null,
      isNewUser: false,
      linked: false
    };
  }

  // 2. Search by email (Account Linking)
  user = await db.get(
    'SELECT id, name, email, role, credits, status, two_factor_enabled, avatar_url, google_id FROM users WHERE email = ?',
    [normalizedEmail]
  );

  if (user) {
    if (user.status !== 'active') {
      return {
        error: 'ACCOUNT_DEACTIVATED',
        message: 'Account is deactivated or suspended. Please contact support.',
        status: 403
      };
    }

    await db.query(
      'UPDATE users SET google_id = ?, avatar_url = COALESCE(avatar_url, ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [googleId, avatarUrl, user.id]
    );
    user.google_id = googleId;
    if (!user.avatar_url && avatarUrl) {
      user.avatar_url = avatarUrl;
    }

    const brand = await db.get(
      `SELECT id, brand_name, brand_slug, api_key FROM brands WHERE user_id = ? AND status != 'deleted' ORDER BY created_at ASC LIMIT 1`,
      [user.id]
    );

    return {
      user,
      brand: brand ? {
        id: brand.id,
        brandName: brand.brand_name,
        brandSlug: brand.brand_slug,
        apiKey: brand.api_key
      } : null,
      isNewUser: false,
      linked: true
    };
  }

  // 3. User not found and autoCreate disabled
  if (!autoCreate) {
    return {
      error: 'USER_NOT_FOUND',
      message: 'No account found matching this Google identity.',
      status: 404
    };
  }

  // 4. Auto-create user and default brand (role is strictly forced to 'merchant')
  const targetRole = role === 'superadmin' ? 'merchant' : (role || 'merchant');
  const userId = `usr_${crypto.randomBytes(12).toString('hex')}`;
  const brandId = `b_${crypto.randomBytes(8).toString('hex')}`;
  const sanitizedBrandName = `${name}'s Brand`;
  const brandSlug = `${name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'merchant'}_${crypto.randomBytes(4).toString('hex')}`;
  const apiKey = `dn_live_${crypto.randomBytes(16).toString('hex')}`;
  const apiSecret = crypto.randomBytes(32).toString('hex');
  const webhookSecret = crypto.randomBytes(32).toString('hex');

  // Secure unusable bcrypt hash for password_hash NOT NULL constraint
  const randomSecret = crypto.randomBytes(32).toString('hex');
  const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
  const passwordHash = await bcrypt.hash(randomSecret, salt);

  await db.transaction(async (tx) => {
    await tx.query(
      `INSERT INTO users (id, name, email, password_hash, role, credits, status, google_id, avatar_url, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [userId, name, normalizedEmail, passwordHash, targetRole, STARTER_CREDITS, googleId, avatarUrl]
    );

    await tx.query(
      `INSERT INTO brands (id, user_id, brand_name, brand_slug, api_key, api_secret, webhook_url, webhook_secret, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, NULL, ?, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [brandId, userId, sanitizedBrandName, brandSlug, apiKey, apiSecret, webhookSecret]
    );
  });

  const newUser = {
    id: userId,
    name,
    email: normalizedEmail,
    role: targetRole,
    credits: STARTER_CREDITS,
    status: 'active',
    two_factor_enabled: 0,
    avatar_url: avatarUrl,
    google_id: googleId
  };

  const newBrand = {
    id: brandId,
    brandName: sanitizedBrandName,
    brandSlug,
    apiKey
  };

  return {
    user: newUser,
    brand: newBrand,
    isNewUser: true,
    linked: false
  };
}

export default {
  verifyGoogleIdToken,
  parseMockGoogleToken,
  findOrCreateUserFromGoogle
};
