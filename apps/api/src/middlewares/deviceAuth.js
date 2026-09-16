/**
 * DenaNeya v2.0 - Device Authentication Middleware
 * File: apps/api/src/middlewares/deviceAuth.js
 *
 * Responsibilities:
 * 1. Authenticates Android handset synchronization requests via physical device token.
 * 2. Extracts token from 'device-api-key', 'x-device-token', or 'Authorization: Bearer <token>' headers.
 * 3. Validates device existence, device active status, and associated brand status in the database.
 * 4. Binds verified req.device, req.brand, and req.brandId context.
 * 5. Strictly isolates carrier SMS ingestion to the authentic paired hardware.
 */

import dbPkg from '@denaneya/database';

const { getDatabase } = dbPkg;

/**
 * Express middleware for authenticating physical Android sync devices.
 */
export async function deviceAuthMiddleware(req, res, next) {
  try {
    // 1. Extract device token from supported header vectors and request body fallbacks
    const headerToken =
      req.headers['device-api-key'] ||
      req.headers['x-device-token'] ||
      (req.headers.authorization && req.headers.authorization.toLowerCase().startsWith('bearer ')
        ? req.headers.authorization.slice(7).trim()
        : null);

    const bodyToken = req.body?.device_token || req.body?.deviceApiKey || req.body?.deviceKey;
    const rawToken = headerToken || bodyToken;

    if (!rawToken || typeof rawToken !== 'string' || rawToken.trim().length === 0) {
      return res.status(401).json({
        success: false,
        code: 'UNAUTHORIZED_DEVICE',
        message: 'Device authentication required. Missing device-api-key or x-device-token header.'
      });
    }

    const token = rawToken.trim();

    // 2. Query devices joined with brands and users for complete tenant verification
    const db = getDatabase();
    const device = await db.get(
      `SELECT 
         d.id, d.brand_id, d.device_name, d.device_model, d.device_token,
         d.sim1_operator, d.sim2_operator, d.battery_level, d.last_sync_at, d.status,
         b.id AS brand_pk, b.user_id AS brand_user_id, b.brand_name, b.brand_slug, b.status AS brand_status,
         u.status AS user_status
       FROM devices d
       JOIN brands b ON d.brand_id = b.id
       JOIN users u ON b.user_id = u.id
       WHERE d.device_token = ?`,
      [token]
    );

    // 3. Verify device existence
    if (!device) {
      return res.status(401).json({
        success: false,
        code: 'INVALID_DEVICE_TOKEN',
        message: 'Invalid or unrecognized device pairing token.'
      });
    }

    // 4. Verify device operational status
    if (device.status === 'deactivated' || device.status === 'disabled') {
      return res.status(403).json({
        success: false,
        code: 'DEVICE_DEACTIVATED',
        message: 'This device has been deactivated or suspended by the merchant.'
      });
    }

    // 5. Verify merchant account status (Blocked/Suspended)
    if (device.user_status === 'blocked' || device.user_status === 'suspended' || device.user_status === 'deactivated') {
      return res.status(403).json({
        success: false,
        code: 'ACCOUNT_DEACTIVATED',
        message: 'The merchant account associated with this device has been suspended or blocked.'
      });
    }

    // 6. Verify merchant brand status
    if (device.brand_status !== 'active') {
      return res.status(403).json({
        success: false,
        code: 'BRAND_INACTIVE',
        message: 'The merchant brand associated with this device is not active.'
      });
    }

    // 6. Bind zero-secret verified device and brand context to request
    req.device = {
      id: device.id,
      brand_id: device.brand_id,
      device_name: device.device_name,
      device_model: device.device_model,
      sim1_operator: device.sim1_operator,
      sim2_operator: device.sim2_operator,
      battery_level: Number(device.battery_level),
      status: device.status,
      last_sync_at: device.last_sync_at
    };

    req.brand = {
      id: device.brand_id,
      user_id: device.brand_user_id,
      brand_name: device.brand_name,
      brand_slug: device.brand_slug,
      status: device.brand_status
    };

    req.brandId = device.brand_id;

    return next();
  } catch (err) {
    console.error('[deviceAuthMiddleware Error]', err);
    return res.status(500).json({
      success: false,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to authenticate device credentials.'
    });
  }
}

export const authDevice = deviceAuthMiddleware;
export default deviceAuthMiddleware;
