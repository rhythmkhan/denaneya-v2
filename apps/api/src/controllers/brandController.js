/**
 * DenaNeya v2.0 - Brand Management Controller
 * File: apps/api/src/controllers/brandController.js
 *
 * Endpoints:
 * - POST /api/brands (Create new brand with cryptographic secrets)
 * - GET /api/brands (List all merchant/staff brands - zero secrets)
 * - GET /api/brands/:id (Get brand details with masked secrets)
 * - POST /api/brands/:id/rotate-secrets (Rotate compromised keys)
 */

import crypto from 'crypto';
import dbPkg from '@denaneya/database';

const { getDatabase } = dbPkg;

/**
 * Helper to generate cryptographically secure keys.
 */
function generateBrandCredentials() {
  return {
    apiKey: `dn_live_${crypto.randomBytes(24).toString('hex')}`,
    apiSecret: crypto.randomBytes(32).toString('hex'), // Exactly 64 hex characters
    webhookSecret: crypto.randomBytes(32).toString('hex') // Exactly 64 hex characters
  };
}

/**
 * Mask secret string showing prefix and last 4 characters.
 */
function maskSecret(secret, prefix = '') {
  if (!secret) return null;
  const last4 = secret.slice(-4);
  return `${prefix}••••••••••••••••••••••••••••••••${last4}`;
}

/**
 * POST /api/brands
 * Creates a new brand under req.user.id.
 */
export async function createBrand(req, res) {
  try {
    const { name, brand_name, slug, brand_slug, webhook_url } = req.body;
    const finalName = (brand_name || name || '').trim();
    let finalSlug = (brand_slug || slug || '').trim().toLowerCase();

    // 1. Validation
    if (!finalName || finalName.length < 2 || finalName.length > 120) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'Brand name is required (2 to 120 characters).'
      });
    }

    // Auto-generate slug if omitted
    if (!finalSlug) {
      finalSlug = finalName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    }

    // Ensure slug meets regex
    if (!/^[a-z0-9-_]{2,120}$/.test(finalSlug)) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'Brand slug must contain only lowercase letters, numbers, hyphens, and underscores (2-120 chars).'
      });
    }

    const db = getDatabase();

    // 2. Check slug uniqueness
    const existingSlug = await db.get(
      'SELECT id FROM brands WHERE brand_slug = ?',
      [finalSlug]
    );

    if (existingSlug) {
      finalSlug = `${finalSlug}-${crypto.randomBytes(3).toString('hex')}`;
    }

    // 3. Generate cryptographic credentials
    const brandId = `b_${crypto.randomBytes(12).toString('hex')}`;
    const credentials = generateBrandCredentials();
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    // 4. Insert into database
    await db.query(
      `INSERT INTO brands (
         id, user_id, brand_name, brand_slug, api_key, api_secret,
         webhook_url, webhook_secret, status, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
      [
        brandId,
        req.user.id,
        finalName,
        finalSlug,
        credentials.apiKey,
        credentials.apiSecret,
        webhook_url || null,
        credentials.webhookSecret,
        now,
        now
      ]
    );

    // 5. Return created brand with plaintext secrets (ONLY ONCE upon creation)
    return res.status(201).json({
      success: true,
      message: 'Brand created successfully. Please copy and store your API secret securely.',
      brand: {
        id: brandId,
        user_id: req.user.id,
        brand_name: finalName,
        brand_slug: finalSlug,
        api_key: credentials.apiKey,
        api_secret: credentials.apiSecret, // Disclosed ONLY ONCE
        webhook_url: webhook_url || null,
        webhook_secret: credentials.webhookSecret, // Disclosed ONLY ONCE
        status: 'active',
        created_at: now
      }
    });
  } catch (err) {
    console.error('[createBrand Error]', err);
    return res.status(500).json({
      success: false,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to create brand.'
    });
  }
}

/**
 * GET /api/brands
 * Lists all brands owned by or assigned to req.user.id.
 * Zero-secret projection enforced.
 */
export async function listBrands(req, res) {
  try {
    const db = getDatabase();

    // Fetch owned brands
    const ownedResult = await db.query(
      `SELECT 
         id, user_id, brand_name, brand_slug, api_key, webhook_url, status, created_at, updated_at,
         'owner' AS user_role
       FROM brands
       WHERE user_id = ? AND status != 'deleted'
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    // Fetch staff brands
    const staffResult = await db.query(
      `SELECT 
         b.id, b.user_id, b.brand_name, b.brand_slug, b.api_key, b.webhook_url, b.status, b.created_at, b.updated_at,
         'staff' AS user_role
       FROM brands b
       JOIN staff_permissions sp ON b.id = sp.brand_id
       WHERE sp.user_id = ? AND b.status != 'deleted'
       ORDER BY b.created_at DESC`,
      [req.user.id]
    );

    // Merge and deduplicate
    const combined = [...(ownedResult.rows || [])];
    const ownedIds = new Set(combined.map((b) => b.id));

    for (const b of staffResult.rows || []) {
      if (!ownedIds.has(b.id)) {
        combined.push(b);
      }
    }

    return res.status(200).json({
      success: true,
      brands: combined
    });
  } catch (err) {
    console.error('[listBrands Error]', err);
    return res.status(500).json({
      success: false,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to list brands.'
    });
  }
}

/**
 * GET /api/brands/:id
 * Fetches single brand details with secret masking.
 */
export async function getBrandById(req, res) {
  try {
    const brandId = req.params.id;
    const db = getDatabase();

    // Query brand
    const brand = await db.get(
      `SELECT 
         id, user_id, brand_name, brand_slug, api_key, api_secret,
         webhook_url, webhook_secret, status, created_at, updated_at
       FROM brands
       WHERE id = ? AND status != 'deleted'`,
      [brandId]
    );

    if (!brand) {
      return res.status(404).json({
        success: false,
        code: 'BRAND_NOT_FOUND',
        message: 'Brand not found.'
      });
    }

    // Check ownership or staff access
    let role = null;
    if (brand.user_id === req.user.id) {
      role = 'owner';
    } else {
      const staff = await db.get(
        'SELECT id FROM staff_permissions WHERE user_id = ? AND brand_id = ? LIMIT 1',
        [req.user.id, brand.id]
      );
      if (staff) {
        role = 'staff';
      }
    }

    if (!role) {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'You do not have permission to view this brand.'
      });
    }

    // Return with MASKED secrets
    return res.status(200).json({
      success: true,
      brand: {
        id: brand.id,
        user_id: brand.user_id,
        brand_name: brand.brand_name,
        brand_slug: brand.brand_slug,
        api_key: brand.api_key,
        api_secret_masked: maskSecret(brand.api_secret, 'dn_sec_'),
        webhook_url: brand.webhook_url,
        webhook_secret_masked: maskSecret(brand.webhook_secret, 'whsec_'),
        status: brand.status,
        created_at: brand.created_at,
        updated_at: brand.updated_at,
        role
      }
    });
  } catch (err) {
    console.error('[getBrandById Error]', err);
    return res.status(500).json({
      success: false,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to retrieve brand details.'
    });
  }
}

/**
 * POST /api/brands/:id/rotate-secrets
 * Generates fresh api_secret or webhook_secret for an owned brand.
 */
export async function rotateBrandSecrets(req, res) {
  try {
    const brandId = req.params.id;
    const { rotate_api_secret, rotate_webhook_secret } = req.body || {};
    const db = getDatabase();

    const brand = await db.get(
      `SELECT id, user_id FROM brands WHERE id = ? AND status != 'deleted'`,
      [brandId]
    );

    if (!brand) {
      return res.status(404).json({ success: false, code: 'BRAND_NOT_FOUND', message: 'Brand not found.' });
    }

    // Only direct brand owners may rotate secrets
    if (brand.user_id !== req.user.id) {
      return res.status(403).json({ success: false, code: 'FORBIDDEN', message: 'Only brand owners can rotate cryptographic credentials.' });
    }

    const updates = [];
    const params = [];
    const rotated = {};

    if (rotate_api_secret) {
      const newApiSecret = crypto.randomBytes(32).toString('hex');
      updates.push('api_secret = ?');
      params.push(newApiSecret);
      rotated.api_secret = newApiSecret;
    }

    if (rotate_webhook_secret) {
      const newWebhookSecret = crypto.randomBytes(32).toString('hex');
      updates.push('webhook_secret = ?');
      params.push(newWebhookSecret);
      rotated.webhook_secret = newWebhookSecret;
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, code: 'BAD_REQUEST', message: 'Specify rotate_api_secret and/or rotate_webhook_secret.' });
    }

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    updates.push('updated_at = ?');
    params.push(now);
    params.push(brandId);

    await db.query(
      `UPDATE brands SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    return res.status(200).json({
      success: true,
      message: 'Credentials rotated successfully. Please update your integrations immediately.',
      rotated
    });
  } catch (err) {
    console.error('[rotateBrandSecrets Error]', err);
    return res.status(500).json({ success: false, code: 'INTERNAL_SERVER_ERROR', message: 'Failed to rotate credentials.' });
  }
}
