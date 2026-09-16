/**
 * DenaNeya v2.0 - Server-to-Server (S2S) Header Authentication Middleware
 * File: apps/api/src/middlewares/apiKeyAuth.js
 *
 * Enforces X-API-KEY and X-API-SECRET authentication with constant-time
 * cryptographic comparison, active brand status checking, and zero-secret context binding.
 */

import crypto from 'node:crypto';
import dbPkg from '@denaneya/database';

const { getDatabase } = dbPkg;

export async function apiKeyAuth(req, res, next) {
  try {
    const apiKey =
      req.headers['x-api-key'] ||
      req.headers['X-API-KEY'] ||
      req.headers['x-zinipay-api-key'] ||
      req.headers['X-ZiNiPay-Api-Key'];

    const apiSecret =
      req.headers['x-api-secret'] ||
      req.headers['X-API-SECRET'] ||
      req.headers['x-zinipay-api-secret'];

    if (!apiKey || !apiSecret || typeof apiKey !== 'string' || typeof apiSecret !== 'string') {
      return res.status(401).json({
        statusCode: 401,
        success: false,
        code: 'UNAUTHORIZED',
        message: 'Missing or malformed X-API-KEY or X-API-SECRET header.'
      });
    }

    const trimmedKey = apiKey.trim();
    const trimmedSecret = apiSecret.trim();

    if (trimmedKey.length === 0 || trimmedSecret.length === 0) {
      return res.status(401).json({
        statusCode: 401,
        success: false,
        code: 'UNAUTHORIZED',
        message: 'API Key and Secret must not be empty.'
      });
    }

    const db = getDatabase();

    // Query active brand joined with owner merchant user
    const brand = await db.get(
      `SELECT 
         b.id, b.user_id, b.brand_name, b.brand_slug, b.api_key, b.api_secret,
         b.webhook_url, b.status AS brand_status,
         u.credits AS merchant_credits, u.status AS user_status
       FROM brands b
       JOIN users u ON b.user_id = u.id
       WHERE b.api_key = ? AND b.status = 'active'`,
      [trimmedKey]
    );

    if (!brand) {
      // Mitigate timing side-channels via dummy constant-time comparison
      const dummyBuffer = Buffer.alloc(64, 'a');
      const candidateBuffer = Buffer.from(trimmedSecret.padEnd(64, '0').slice(0, 64));
      crypto.timingSafeEqual(candidateBuffer, dummyBuffer);

      return res.status(401).json({
        statusCode: 401,
        success: false,
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid API credentials.'
      });
    }

    // Verify API secret in constant-time
    const provSecretBuf = Buffer.from(trimmedSecret);
    const expSecretBuf = Buffer.from(brand.api_secret);

    if (
      provSecretBuf.length !== expSecretBuf.length ||
      !crypto.timingSafeEqual(provSecretBuf, expSecretBuf)
    ) {
      return res.status(401).json({
        statusCode: 401,
        success: false,
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid API credentials.'
      });
    }

    if (brand.user_status !== 'active') {
      return res.status(403).json({
        statusCode: 403,
        success: false,
        code: 'ACCOUNT_SUSPENDED',
        message: 'Merchant account is suspended or inactive.'
      });
    }

    // Bind sanitized context to request
    req.brand = {
      id: brand.id,
      user_id: brand.user_id,
      brand_name: brand.brand_name,
      brand_slug: brand.brand_slug,
      api_key: brand.api_key,
      webhook_url: brand.webhook_url
    };

    req.merchant = {
      id: brand.user_id,
      credits: Number(brand.merchant_credits)
    };

    return next();
  } catch (err) {
    console.error('[apiKeyAuth Error]', err.message || err);
    return res.status(500).json({
      statusCode: 500,
      success: false,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to authenticate API credentials.'
    });
  }
}

export default apiKeyAuth;
