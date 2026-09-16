/**
 * DenaNeya v2.0 - Super Admin Merchant Governance Controller
 * File: apps/api/src/controllers/adminMerchantController.js
 *
 * Implements:
 * 1. GET /api/admin/merchants: Searchable, paginated directory of platform merchants
 * 2. GET /api/admin/merchants/:id: Comprehensive merchant profile, brands, and hardware devices
 * 3. PUT /api/admin/merchants/:id/status: Merchant status toggling (active, suspended, blocked) with audit trail
 * 4. POST /api/admin/merchants/:id/adjust-credits: Atomic credit balance adjustment with mandatory reason
 */

import dbPkg from '@denaneya/database';

const { getDatabase, createAdminAuditLog, createCreditAuditLog } = dbPkg;

/**
 * GET /api/admin/merchants
 */
export async function getMerchants(req, res) {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const offset = (page - 1) * limit;
    const search = req.query.search ? req.query.search.trim() : '';
    const status = req.query.status ? req.query.status.trim() : '';

    const db = getDatabase();
    const conditions = ["u.role = 'merchant'"];
    const params = [];

    if (search) {
      conditions.push('(u.name LIKE ? OR u.email LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    if (status) {
      conditions.push('u.status = ?');
      params.push(status);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const countRow = await db.get(
      `SELECT COUNT(*) as total FROM users u ${whereClause}`,
      params
    );
    const total = Number(countRow?.total || 0);

    const listSql = `
      SELECT 
        u.id, u.name, u.email, u.role, u.credits, u.status, u.avatar_url,
        u.created_at, u.updated_at,
        COUNT(DISTINCT b.id) AS brands_count,
        COUNT(DISTINCT d.id) AS devices_count
      FROM users u
      LEFT JOIN brands b ON b.user_id = u.id
      LEFT JOIN devices d ON d.brand_id = b.id
      ${whereClause}
      GROUP BY u.id
      ORDER BY u.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const rowsRes = await db.query(listSql, [...params, limit, offset]);
    const merchants = (rowsRes.rows || []).map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      role: m.role,
      credits: Number(m.credits || 0),
      status: m.status,
      avatarUrl: m.avatar_url || null,
      brandsCount: Number(m.brands_count || 0),
      devicesCount: Number(m.devices_count || 0),
      createdAt: m.created_at,
      updatedAt: m.updated_at
    }));

    return res.status(200).json({
      success: true,
      merchants,
      data: merchants,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1
      }
    });
  } catch (err) {
    console.error('[getMerchants Error]:', err.message);
    return res.status(500).json({
      success: false,
      code: 'MERCHANT_FETCH_FAILED',
      message: 'Failed to retrieve merchant directory.'
    });
  }
}

/**
 * GET /api/admin/merchants/:id
 */
export async function getMerchantById(req, res) {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const user = await db.get(
      'SELECT id, name, email, role, credits, status, avatar_url, created_at, updated_at FROM users WHERE id = ?',
      [id]
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        code: 'MERCHANT_NOT_FOUND',
        message: 'Merchant not found.'
      });
    }

    const brandsRes = await db.query(
      'SELECT id, brand_name, brand_slug, api_key, webhook_url, status, created_at FROM brands WHERE user_id = ?',
      [id]
    );
    const brands = brandsRes.rows || [];

    let devices = [];
    if (brands.length > 0) {
      const brandIds = brands.map((b) => `'${b.id}'`).join(',');
      const devRes = await db.query(
        `SELECT id, brand_id, device_name, device_model, sim1_operator, sim2_operator, battery_level, status, last_sync_at
         FROM devices WHERE brand_id IN (${brandIds})`
      );
      devices = devRes.rows || [];
    }

    const merchant = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      credits: Number(user.credits || 0),
      status: user.status,
      avatarUrl: user.avatar_url || null,
      brands,
      devices,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    };

    return res.status(200).json({
      success: true,
      merchant,
      data: merchant
    });
  } catch (err) {
    console.error('[getMerchantById Error]:', err.message);
    return res.status(500).json({
      success: false,
      code: 'MERCHANT_FETCH_FAILED',
      message: 'Failed to retrieve merchant details.'
    });
  }
}

/**
 * PUT /api/admin/merchants/:id/status (or PATCH)
 */
export async function updateMerchantStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    const allowed = ['active', 'suspended', 'blocked'];
    if (!status || !allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_MERCHANT_STATUS',
        message: `Invalid merchant status. Permitted values: ${allowed.join(', ')}`
      });
    }

    const db = getDatabase();
    const user = await db.get('SELECT id, name, email, status FROM users WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({
        success: false,
        code: 'MERCHANT_NOT_FOUND',
        message: 'Merchant account not found.'
      });
    }

    await db.query(
      'UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, id]
    );

    // Audit log
    await createAdminAuditLog(db, {
      adminId: req.user.id,
      action: 'UPDATE_MERCHANT_STATUS',
      targetType: 'user',
      targetId: id,
      details: {
        previousStatus: user.status,
        newStatus: status,
        reason: reason || 'Super admin status modification'
      },
      ipAddress: req.ip || req.headers['x-forwarded-for'] || null,
      userAgent: req.headers['user-agent'] || null
    });

    return res.status(200).json({
      success: true,
      message: `Merchant status successfully updated to '${status}'.`,
      merchant: {
        id,
        status
      }
    });
  } catch (err) {
    console.error('[updateMerchantStatus Error]:', err.message);
    return res.status(500).json({
      success: false,
      code: 'STATUS_UPDATE_FAILED',
      message: 'Failed to update merchant account status.'
    });
  }
}

/**
 * POST /api/admin/merchants/:id/adjust-credits
 */
export async function adjustMerchantCredits(req, res) {
  try {
    const { id } = req.params;
    const { amount, reason } = req.body;

    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      return res.status(400).json({
        success: false,
        code: 'REASON_REQUIRED',
        message: 'Administrative reason is strictly mandatory for credit adjustments.'
      });
    }

    if (amount === undefined || typeof amount !== 'number' || !Number.isInteger(amount) || amount === 0) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_AMOUNT',
        message: 'Adjustment amount must be a non-zero integer.'
      });
    }

    const db = getDatabase();
    const user = await db.get('SELECT id, name, email, credits FROM users WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({
        success: false,
        code: 'MERCHANT_NOT_FOUND',
        message: 'Merchant account not found.'
      });
    }

    const currentCredits = Number(user.credits || 0);
    if (currentCredits + amount < 0) {
      return res.status(400).json({
        success: false,
        code: 'INSUFFICIENT_CREDITS',
        message: `Credit adjustment of ${amount} would drive balance below zero (current: ${currentCredits}).`
      });
    }

    const newCredits = currentCredits + amount;
    await db.query(
      'UPDATE users SET credits = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newCredits, id]
    );

    // Record credit audit log
    await createCreditAuditLog(db, {
      userId: id,
      adminId: req.user.id,
      deltaCredits: amount,
      previousCredits: currentCredits,
      newCredits,
      reason: reason.trim()
    });

    // Record general admin audit log
    await createAdminAuditLog(db, {
      adminId: req.user.id,
      action: 'ADJUST_MERCHANT_CREDITS',
      targetType: 'user',
      targetId: id,
      details: {
        previousCredits: currentCredits,
        deltaCredits: amount,
        newCredits,
        reason: reason.trim()
      },
      ipAddress: req.ip || req.headers['x-forwarded-for'] || null,
      userAgent: req.headers['user-agent'] || null
    });

    return res.status(200).json({
      success: true,
      message: `Successfully adjusted credits by ${amount > 0 ? '+' : ''}${amount}.`,
      previousCredits: currentCredits,
      newCredits,
      adjustment: amount
    });
  } catch (err) {
    console.error('[adjustMerchantCredits Error]:', err.message);
    return res.status(500).json({
      success: false,
      code: 'CREDIT_ADJUSTMENT_FAILED',
      message: 'Failed to adjust merchant credit balance.'
    });
  }
}

export default {
  getMerchants,
  getMerchantById,
  updateMerchantStatus,
  adjustMerchantCredits
};
