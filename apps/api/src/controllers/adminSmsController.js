/**
 * DenaNeya v2.0 - Super Admin Cross-Tenant Carrier SMS Controller
 * File: apps/api/src/controllers/adminSmsController.js
 *
 * Implements:
 * 1. GET /api/admin/sms/stream: Global carrier SMS feed across all brands, handsets, and carriers
 * 2. POST /api/admin/reconcile/manual: Atomic CAS manual reconciliation pairing unmatched SMS to pending invoice
 */

import dbPkg from '@denaneya/database';
import { enqueueWebhookEvent, dispatchSingleWebhook } from '../services/webhookService.js';

const { getDatabase, createAdminAuditLog } = dbPkg;

/**
 * GET /api/admin/sms/stream
 */
export async function getSmsStream(req, res) {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const offset = (page - 1) * limit;

    const trxId = (req.query.trxId || req.query.trx_id || '').trim();
    const brandId = (req.query.brandId || req.query.brand_id || '').trim();
    const channel = (req.query.channel || '').trim();
    const status = (req.query.status || '').trim();
    const sender = (req.query.sender || '').trim();

    const db = getDatabase();
    const conditions = [];
    const params = [];

    if (trxId) {
      conditions.push('UPPER(s.trx_id) LIKE ?');
      params.push(`%${trxId.toUpperCase()}%`);
    }
    if (brandId) {
      conditions.push('s.brand_id = ?');
      params.push(brandId);
    }
    if (channel) {
      conditions.push('LOWER(s.channel) = ?');
      params.push(channel.toLowerCase());
    }
    if (status) {
      conditions.push('s.status = ?');
      params.push(status);
    }
    if (sender) {
      conditions.push('s.sender LIKE ?');
      params.push(`%${sender}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRow = await db.get(
      `SELECT COUNT(*) as total FROM stored_data s ${whereClause}`,
      params
    );
    const total = Number(countRow?.total || 0);

    const listSql = `
      SELECT 
        s.id, s.brand_id, s.device_id, s.sender, s.raw_sms, s.channel,
        s.trx_id, s.amount, s.status, s.received_at, s.used_at,
        b.brand_name, b.brand_slug,
        d.device_name, d.device_model
      FROM stored_data s
      LEFT JOIN brands b ON s.brand_id = b.id
      LEFT JOIN devices d ON s.device_id = d.id
      ${whereClause}
      ORDER BY s.received_at DESC
      LIMIT ? OFFSET ?
    `;

    const rowsRes = await db.query(listSql, [...params, limit, offset]);
    const records = (rowsRes.rows || []).map((r) => ({
      id: r.id,
      brand_id: r.brand_id,
      brandId: r.brand_id,
      device_id: r.device_id,
      deviceId: r.device_id,
      sender: r.sender,
      raw_sms: r.raw_sms,
      rawSms: r.raw_sms,
      channel: r.channel,
      trx_id: r.trx_id,
      trxId: r.trx_id,
      amount: Number(r.amount || 0),
      status: r.status,
      received_at: r.received_at,
      receivedAt: r.received_at,
      used_at: r.used_at,
      usedAt: r.used_at,
      brandName: r.brand_name || null,
      deviceName: r.device_name || null
    }));

    return res.status(200).json({
      success: true,
      records,
      sms: records,
      data: records,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1
      }
    });
  } catch (err) {
    console.error('[getSmsStream Error]:', err.message);
    return res.status(500).json({
      success: false,
      code: 'SMS_STREAM_FAILED',
      message: 'Failed to retrieve carrier SMS feed.'
    });
  }
}

/**
 * POST /api/admin/reconcile/manual
 */
export async function manualReconcile(req, res) {
  try {
    const { storedDataId, invoiceId, reason } = req.body || {};

    if (!storedDataId || !invoiceId) {
      return res.status(400).json({
        success: false,
        code: 'REQUIRED_FIELDS_MISSING',
        message: 'Both storedDataId and invoiceId are required for manual reconciliation.'
      });
    }

    const db = getDatabase();

    const stored = await db.get('SELECT * FROM stored_data WHERE id = ?', [storedDataId]);
    if (!stored) {
      return res.status(404).json({
        success: false,
        code: 'TRANSACTION_NOT_FOUND',
        message: 'Target carrier SMS transaction record not found.'
      });
    }

    if (stored.status !== 'UNUSED') {
      return res.status(400).json({
        success: false,
        code: 'TRANSACTION_ALREADY_USED',
        message: 'Target carrier SMS transaction has already been consumed or reconciled.'
      });
    }

    const invoice = await db.get('SELECT * FROM invoices WHERE id = ?', [invoiceId]);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        code: 'INVOICE_NOT_FOUND',
        message: 'Target invoice not found.'
      });
    }

    if (invoice.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        code: 'INVOICE_NOT_PENDING',
        message: `Invoice is currently in status '${invoice.status}' and cannot be reconciled.`
      });
    }

    // Step 1: Atomic CAS on stored_data
    const res1 = await db.query(
      "UPDATE stored_data SET status = 'USED', used_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'UNUSED'",
      [storedDataId]
    );
    const affected1 = Number(res1?.affectedRows ?? res1?.changes ?? 0);
    if (affected1 === 0) {
      return res.status(400).json({
        success: false,
        code: 'TRANSACTION_ALREADY_USED',
        message: 'Carrier transaction was concurrently consumed by another process.'
      });
    }

    // Step 2: Atomic CAS on invoices
    const res2 = await db.query(
      "UPDATE invoices SET status = 'PAID', trx_id = ?, payment_method = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'PENDING'",
      [stored.trx_id, stored.channel || 'carrier_override', invoiceId]
    );
    const affected2 = Number(res2?.affectedRows ?? res2?.changes ?? 0);
    if (affected2 === 0) {
      // Rollback Step 1
      await db.query("UPDATE stored_data SET status = 'UNUSED', used_at = NULL WHERE id = ?", [storedDataId]);
      return res.status(400).json({
        success: false,
        code: 'INVOICE_NOT_PENDING',
        message: 'Target invoice was concurrently settled or expired.'
      });
    }

    // Step 3: Deduct 1 credit from brand merchant
    const brand = await db.get('SELECT user_id FROM brands WHERE id = ?', [invoice.brand_id]);
    if (brand && brand.user_id) {
      await db.query(
        'UPDATE users SET credits = credits - 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND credits >= 1',
        [brand.user_id]
      );
    }

    // Step 4: Record administrative audit log
    await createAdminAuditLog(db, {
      adminId: req.user.id,
      action: 'MANUAL_RECONCILE',
      targetType: 'invoice',
      targetId: invoiceId,
      details: {
        storedDataId,
        invoiceId,
        trxId: stored.trx_id,
        channel: stored.channel,
        amount: invoice.amount,
        reason: reason || 'Manual administrator reconciliation override'
      },
      ipAddress: req.ip || req.headers['x-forwarded-for'] || null,
      userAgent: req.headers['user-agent'] || null
    });

    // Step 5: Dispatch webhook notification asynchronously
    try {
      if (invoice.brand_id) {
        enqueueWebhookEvent(
          invoice.brand_id,
          invoiceId,
          'invoice.completed',
          {
            event: 'invoice.completed',
            invoice_id: invoiceId,
            invoice_number: invoice.invoice_number,
            trx_id: stored.trx_id,
            amount: invoice.amount,
            currency: invoice.currency || 'BDT',
            channel: stored.channel,
            reconciled_by: 'superadmin_manual',
            reconciled_at: new Date().toISOString()
          }
        ).then((enq) => {
          if (enq?.logId) {
            dispatchSingleWebhook(enq.logId, { allowHttpForTesting: true }).catch((whErr) => {
              console.warn('[manualReconcile Webhook Dispatch Warn]:', whErr.message);
            });
          }
        }).catch(() => {});
      }
    } catch (_) {}

    return res.status(200).json({
      success: true,
      message: `Invoice ${invoice.invoice_number || invoiceId} manually reconciled with TrxID ${stored.trx_id}.`,
      storedDataId,
      invoiceId,
      trxId: stored.trx_id
    });
  } catch (err) {
    console.error('[manualReconcile Error]:', err.message);
    return res.status(500).json({
      success: false,
      code: 'RECONCILIATION_FAILED',
      message: 'Failed to complete manual reconciliation.'
    });
  }
}

export default {
  getSmsStream,
  manualReconcile
};
