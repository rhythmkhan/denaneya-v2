/**
 * DenaNeya v2.0 - Authentication Controller
 * Handles user registration, constant-time login, and user profile retrieval.
 */

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { registerSchema, loginSchema } from '@denaneya/shared';
import dbPkg from '@denaneya/database';
import { generateToken } from '../utils/token.js';

const { getDatabase } = dbPkg;

// Pre-computed static hash used for constant-time comparison on nonexistent emails
const DUMMY_BCRYPT_HASH = '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQmG6W5650h6Wv8Y6xV.2';
const BCRYPT_SALT_ROUNDS = 10;
const STARTER_CREDITS = 50;

/**
 * POST /api/auth/register
 * Registers a new user, hashes password, grants 50 starter credits, auto-provisions a default brand, and returns JWT.
 */
export async function register(req, res) {
  // 1. Validate Input Payload via Zod Schema
  const parseResult = registerSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Invalid registration input.',
      errors: parseResult.error.flatten().fieldErrors
    });
  }

  const { name, email, password } = parseResult.data;
  const normalizedEmail = email.trim().toLowerCase();
  const db = getDatabase();

  try {
    // 2. Check for Existing Email
    const existing = await db.get('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
    if (existing) {
      return res.status(409).json({
        success: false,
        code: 'EMAIL_ALREADY_EXISTS',
        message: 'An account with this email address already exists.'
      });
    }

    // 3. Hash Password (min 10 rounds)
    const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
    const passwordHash = await bcrypt.hash(password, salt);

    // 4. Generate Identifiers
    const userId = `usr_${crypto.randomBytes(12).toString('hex')}`;
    const brandId = `b_${crypto.randomBytes(8).toString('hex')}`;
    const brandSlug = `${name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'brand'}_${crypto.randomBytes(4).toString('hex')}`;
    const apiKey = `dn_live_${crypto.randomBytes(16).toString('hex')}`;
    const apiSecret = crypto.randomBytes(32).toString('hex');
    const webhookSecret = crypto.randomBytes(32).toString('hex');

    // 5. Atomic Insertion: User + Default Brand
    await db.transaction(async (tx) => {
      // Insert User with 50 credits
      await tx.query(
        `INSERT INTO users (id, name, email, password_hash, role, credits, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'merchant', ?, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [userId, name, normalizedEmail, passwordHash, STARTER_CREDITS]
      );

      // Insert Initial Merchant Brand
      await tx.query(
        `INSERT INTO brands (id, user_id, brand_name, brand_slug, api_key, api_secret, webhook_url, webhook_secret, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, NULL, ?, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [brandId, userId, `${name}'s Brand`, brandSlug, apiKey, apiSecret, webhookSecret]
      );
    });

    // 6. Issue 24h JWT
    const token = generateToken({ id: userId, email: normalizedEmail, role: 'merchant', credits: STARTER_CREDITS });

    // 7. Return Sanitized Response (Zero Secret Projection)
    return res.status(201).json({
      success: true,
      message: 'Account registered successfully with 50 starter credits.',
      token,
      user: {
        id: userId,
        name,
        email: normalizedEmail,
        role: 'merchant',
        credits: STARTER_CREDITS,
        status: 'active'
      },
      brand: {
        id: brandId,
        brandName: `${name}'s Brand`,
        brandSlug,
        apiKey
      }
    });
  } catch (err) {
    console.error('[Register Error]:', err.message);
    return res.status(500).json({
      success: false,
      code: 'REGISTRATION_FAILED',
      message: 'Failed to complete user registration.'
    });
  }
}

/**
 * POST /api/auth/login
 * Constant-time password verification, returns 24h JWT.
 */
export async function login(req, res) {
  // 1. Validate Input Payload via Zod Schema
  const parseResult = loginSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Invalid login credentials format.',
      errors: parseResult.error.flatten().fieldErrors
    });
  }

  const { email, password } = parseResult.data;
  const normalizedEmail = email.trim().toLowerCase();
  const db = getDatabase();

  try {
    // 2. Query User
    const user = await db.get(
      'SELECT id, name, email, password_hash, role, credits, status FROM users WHERE email = ?',
      [normalizedEmail]
    );

    // 3. Constant-Time Timing Attack Mitigation
    if (!user) {
      // Execute dummy bcrypt compare to consume uniform CPU time
      await bcrypt.compare(password, DUMMY_BCRYPT_HASH);
      return res.status(401).json({
        success: false,
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.'
      });
    }

    // 4. Verify Password Hash
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.'
      });
    }

    // 5. Verify Account Status
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        code: 'ACCOUNT_DEACTIVATED',
        message: 'Account is deactivated or suspended. Please contact support.'
      });
    }

    // 6. Issue 24h JWT
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      credits: Number(user.credits)
    });

    // 7. Return Sanitized Response (Zero Secret Projection)
    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        credits: Number(user.credits),
        status: user.status
      }
    });
  } catch (err) {
    console.error('[Login Error]:', err.message);
    return res.status(500).json({
      success: false,
      code: 'LOGIN_FAILED',
      message: 'Authentication failed due to a server error.'
    });
  }
}

/**
 * GET /api/auth/me
 * Retrieves current authenticated user profile and owned brands with zero secret projection.
 */
export async function getMe(req, res) {
  const userId = req.user.id;
  const db = getDatabase();

  try {
    const user = await db.get(
      'SELECT id, name, email, role, credits, status, created_at, updated_at FROM users WHERE id = ?',
      [userId]
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        code: 'USER_NOT_FOUND',
        message: 'User profile not found.'
      });
    }

    // Query brands owned by this user (Strictly omit api_secret and webhook_secret)
    const { rows: brands } = await db.query(
      `SELECT id, brand_name, brand_slug, api_key, webhook_url, status, created_at
       FROM brands WHERE user_id = ? AND status != 'deleted' ORDER BY created_at ASC`,
      [userId]
    );

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        credits: Number(user.credits),
        status: user.status,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      },
      brands: brands || []
    });
  } catch (err) {
    console.error('[getMe Error]:', err.message);
    return res.status(500).json({
      success: false,
      code: 'PROFILE_FETCH_FAILED',
      message: 'Failed to retrieve user profile.'
    });
  }
}
