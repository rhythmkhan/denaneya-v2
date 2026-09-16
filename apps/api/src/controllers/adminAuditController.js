/**
 * DenaNeya v2.0 - Super Admin Audit Logs Controller
 * File: apps/api/src/controllers/adminAuditController.js
 *
 * Implements:
 * 1. GET /api/admin/audit-logs: Chronological queryable log of administrative actions
 */

import dbPkg from '@denaneya/database';

const { getDatabase, getAdminAuditLogs } = dbPkg;

/**
 * GET /api/admin/audit-logs
 */
export async function getAuditLogs(req, res) {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const offset = (page - 1) * limit;
    const action = req.query.action ? req.query.action.trim() : undefined;
    const adminId = req.query.adminId ? req.query.adminId.trim() : undefined;

    const db = getDatabase();
    const result = await getAdminAuditLogs(db, {
      limit,
      offset,
      action,
      adminId
    });

    return res.status(200).json({
      success: true,
      logs: result.logs,
      data: result.logs,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit) || 1
      }
    });
  } catch (err) {
    console.error('[getAuditLogs Error]:', err.message);
    return res.status(500).json({
      success: false,
      code: 'AUDIT_FETCH_FAILED',
      message: 'Failed to retrieve administrative audit logs.'
    });
  }
}

export default {
  getAuditLogs
};
