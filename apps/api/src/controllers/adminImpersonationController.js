/**
 * DenaNeya v2.0 - Super Admin Impersonation Controller
 * File: apps/api/src/controllers/adminImpersonationController.js
 *
 * Implements:
 * 1. POST /api/admin/impersonate/:merchantId: Issues scoped merchant token with single-use cryptographic returnTicket
 * 2. POST /api/admin/impersonate/exit: Validates and atomically consumes returnTicket to restore super admin session
 */

import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import dbPkg from '@denaneya/database';

const { getDatabase, createAdminAuditLog } = dbPkg;

/**
 * POST /api/admin/impersonate/:merchantId
 */
export async function impersonateMerchant(req, res) {
  try {
    const { merchantId } = req.params;
    const db = getDatabase();

    const merchant = await db.get(
      'SELECT id, name, email, role, credits, status FROM users WHERE id = ?',
      [merchantId]
    );

    if (!merchant) {
      return res.status(404).json({
        success: false,
        code: 'MERCHANT_NOT_FOUND',
        message: 'Merchant account not found.'
      });
    }

    const rawTicket = 'rtk_' + crypto.randomBytes(32).toString('hex');
    const ticketHash = crypto.createHash('sha256').update(rawTicket).digest('hex');
    const logId = 'imp_' + crypto.randomUUID().replace(/-/g, '').slice(0, 24);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);

    const impersonationToken = jwt.sign(
      {
        id: merchant.id,
        email: merchant.email,
        name: merchant.name,
        role: 'merchant',
        isImpersonated: true,
        adminId: req.user.id,
        credits: Number(merchant.credits || 0)
      },
      process.env.JWT_SECRET,
      { expiresIn: '30m', algorithm: 'HS256' }
    );

    await db.query(
      `INSERT INTO impersonation_logs 
       (id, admin_id, target_user_id, merchant_id, action, return_ticket_hash, status, expires_at, ip_address, user_agent, metadata_json)
       VALUES (?, ?, ?, ?, 'START_IMPERSONATION', ?, 'active', ?, ?, ?, ?)`,
      [
        logId,
        req.user.id,
        merchant.id,
        merchant.id,
        ticketHash,
        expiresAt,
        req.ip || req.headers['x-forwarded-for'] || null,
        req.headers['user-agent'] || null,
        JSON.stringify({ return_ticket_hash: ticketHash, status: 'active', expires_at: expiresAt })
      ]
    );

    await createAdminAuditLog(db, {
      adminId: req.user.id,
      action: 'START_IMPERSONATION',
      targetType: 'user',
      targetId: merchant.id,
      details: {
        merchantEmail: merchant.email,
        merchantName: merchant.name,
        expiresAt
      },
      ipAddress: req.ip || req.headers['x-forwarded-for'] || null,
      userAgent: req.headers['user-agent'] || null
    });

    return res.status(200).json({
      success: true,
      message: `Successfully initiated impersonation session for merchant ${merchant.email}.`,
      impersonationToken,
      token: impersonationToken,
      returnTicket: rawTicket,
      merchant: {
        id: merchant.id,
        name: merchant.name,
        email: merchant.email
      }
    });
  } catch (err) {
    console.error('[impersonateMerchant Error]:', err.message);
    return res.status(500).json({
      success: false,
      code: 'IMPERSONATION_FAILED',
      message: 'Failed to create impersonation session.'
    });
  }
}

/**
 * POST /api/admin/impersonate/exit
 */
export async function exitImpersonation(req, res) {
  try {
    const { returnTicket } = req.body || {};

    if (!returnTicket || typeof returnTicket !== 'string' || !returnTicket.trim()) {
      return res.status(401).json({
        success: false,
        code: 'INVALID_RETURN_TICKET',
        message: 'Cryptographic return ticket is required to restore administrative session.'
      });
    }

    const ticketHash = crypto.createHash('sha256').update(returnTicket.trim()).digest('hex');
    const db = getDatabase();

    const impLog = await db.get(
      'SELECT id, admin_id, target_user_id, merchant_id, status, expires_at FROM impersonation_logs WHERE return_ticket_hash = ?',
      [ticketHash]
    );

    if (!impLog) {
      return res.status(401).json({
        success: false,
        code: 'INVALID_RETURN_TICKET',
        message: 'Return ticket is invalid, forged, or unrecognized.'
      });
    }

    if (impLog.status !== 'active') {
      return res.status(401).json({
        success: false,
        code: 'TICKET_ALREADY_USED',
        message: 'This return ticket has already been used and cannot be replayed.'
      });
    }

    const expTime = (function parseExpiry(val) {
      if (!val) return 0;
      if (val instanceof Date) return val.getTime();
      if (typeof val === 'number') return val;
      const s = String(val).trim();
      if (s.endsWith('Z') || s.includes('+') || (s.includes('T') && s.length > 19)) {
        return new Date(s).getTime();
      }
      return new Date(s.replace(' ', 'T') + 'Z').getTime();
    })(impLog.expires_at);

    if (expTime > 0 && expTime < Date.now()) {
      return res.status(401).json({
        success: false,
        code: 'TICKET_EXPIRED',
        message: 'Impersonation session and return ticket have expired.'
      });
    }

    // Atomic Compare-And-Swap (CAS) single-use consumption
    const updateRes = await db.query(
      "UPDATE impersonation_logs SET status = 'used', used_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'active'",
      [impLog.id]
    );

    const affected = Number(updateRes?.affectedRows ?? updateRes?.changes ?? 0);
    if (affected === 0) {
      return res.status(401).json({
        success: false,
        code: 'TICKET_ALREADY_USED',
        message: 'This return ticket has already been used and cannot be replayed.'
      });
    }

    // Retrieve original super admin identity
    const admin = await db.get(
      'SELECT id, name, email, role, credits, status FROM users WHERE id = ?',
      [impLog.admin_id]
    );

    if (!admin || admin.status !== 'active' || admin.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN_SUPERADMIN_REQUIRED',
        message: 'Original super admin account is inactive or not found.'
      });
    }

    const adminToken = jwt.sign(
      {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: 'superadmin',
        credits: Number(admin.credits || 0)
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h', algorithm: 'HS256' }
    );

    await createAdminAuditLog(db, {
      adminId: admin.id,
      action: 'EXIT_IMPERSONATION',
      targetType: 'user',
      targetId: impLog.target_user_id || impLog.merchant_id,
      details: {
        impersonationLogId: impLog.id
      },
      ipAddress: req.ip || req.headers['x-forwarded-for'] || null,
      userAgent: req.headers['user-agent'] || null
    });

    return res.status(200).json({
      success: true,
      message: 'Successfully exited impersonation session and restored super admin privileges.',
      adminToken,
      token: adminToken,
      user: {
        id: admin.id,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (err) {
    console.error('[exitImpersonation Error]:', err.message);
    return res.status(500).json({
      success: false,
      code: 'IMPERSONATION_EXIT_FAILED',
      message: 'Failed to process return ticket.'
    });
  }
}

export default {
  impersonateMerchant,
  exitImpersonation
};
