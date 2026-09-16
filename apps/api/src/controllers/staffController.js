/**
 * DenaNeya v2.0 - Staff Management & 10-Module RBAC Controller
 * File: apps/api/src/controllers/staffController.js
 *
 * Implements:
 * 1. GET    /api/staff       - List brand staff with granular module permissions
 * 2. POST   /api/staff       - Create/invite staff member & assign RBAC matrix (Owner only)
 * 3. DELETE /api/staff/:id   - Revoke staff member access from brand (Owner only)
 */

import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import dbPkg from '@denaneya/database';

const { getDatabase } = dbPkg;

// Standard 10 Functional Modules for Granular RBAC
export const STANDARD_MODULES = [
  'overview',
  'invoices',
  'payment_links',
  'landing_pages',
  'gateways',
  'devices',
  'staff',
  'billing',
  'referrals',
  'settings'
];

/**
 * 1. GET /api/staff
 * List all staff members assigned to the brand and their permissions
 */
export async function listStaff(req, res) {
  try {
    const brandId = req.brand.id;

    // Check authorization: Owner or staff with staff read permission
    if (!req.isBrandOwner && (!req.hasBrandPermission || !req.hasBrandPermission('staff', 'read'))) {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'Access denied: You lack permission to view staff members.'
      });
    }

    const db = getDatabase();
    const querySql = `
      SELECT sp.id AS permission_id, sp.module, sp.can_create, sp.can_read, sp.can_update, sp.can_delete,
             u.id AS user_id, u.name, u.email, u.role, u.status, u.created_at AS user_created_at
      FROM staff_permissions sp
      JOIN users u ON sp.user_id = u.id
      WHERE sp.brand_id = ?
      ORDER BY u.name ASC, sp.module ASC
    `;

    const result = await db.query(querySql, [brandId]);
    const rows = result.rows || [];

    // Group permissions by user_id
    const userMap = new Map();
    for (const row of rows) {
      if (!userMap.has(row.user_id)) {
        userMap.set(row.user_id, {
          user_id: row.user_id,
          name: row.name,
          email: row.email,
          role: row.role,
          status: row.status,
          user_created_at: row.user_created_at,
          permissions: []
        });
      }
      userMap.get(row.user_id).permissions.push({
        permission_id: row.permission_id,
        module: row.module,
        can_create: Boolean(row.can_create),
        can_read: Boolean(row.can_read),
        can_update: Boolean(row.can_update),
        can_delete: Boolean(row.can_delete)
      });
    }

    const staffList = Array.from(userMap.values());

    return res.status(200).json({
      success: true,
      count: staffList.length,
      available_modules: STANDARD_MODULES,
      staff: staffList
    });
  } catch (err) {
    console.error('[staffController.listStaff Error]', err.message || err);
    return res.status(500).json({
      success: false,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to retrieve staff members.'
    });
  }
}

/**
 * 2. POST /api/staff
 * Create or invite staff member with module permissions
 * Strictly restricted to Brand Owner (req.isBrandOwner === true)
 */
export async function addStaff(req, res) {
  try {
    const brandId = req.brand.id;

    // Strict Owner-Only Enforcement
    if (!req.isBrandOwner) {
      return res.status(403).json({
        success: false,
        code: 'OWNER_ONLY',
        message: 'Only the primary brand owner can add or invite staff members.'
      });
    }

    const { email, name, password, permissions = [] } = req.body || {};

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_EMAIL',
        message: 'A valid email address is required.'
      });
    }

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_NAME',
        message: 'Staff member name is required (minimum 2 characters).'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    const db = getDatabase();

    // Check if target user is trying to add themselves as staff
    if (cleanEmail === req.user.email.toLowerCase()) {
      return res.status(400).json({
        success: false,
        code: 'CANNOT_ADD_SELF',
        message: 'The brand owner cannot be added as a staff member.'
      });
    }

    let targetUserId = null;

    // Check if user already exists in `users` table
    const existingUser = await db.get('SELECT id, email, name, role FROM users WHERE email = ?', [cleanEmail]);
    if (existingUser) {
      targetUserId = existingUser.id;
    } else {
      // Create new user account with staff role
      targetUserId = `usr_staff_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
      const rawPassword = password || 'StaffPass@2026';
      const passwordHash = await bcrypt.hash(rawPassword, 10);
      const nowUtc = new Date().toISOString().replace('T', ' ').substring(0, 19);

      await db.query(
        `INSERT INTO users (id, name, email, password_hash, role, credits, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'staff', 0, 'active', ?, ?)`,
        [targetUserId, cleanName, cleanEmail, passwordHash, nowUtc, nowUtc]
      );
    }

    // Build permissions list: use provided permissions or defaults for all 10 modules
    const nowUtc = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const assignedPermissions = [];

    for (const mod of STANDARD_MODULES) {
      const userPerm = Array.isArray(permissions) ? permissions.find((p) => p.module === mod) : null;
      const canCreate = userPerm ? (userPerm.can_create ? 1 : 0) : 0;
      const canRead = userPerm ? (userPerm.can_read ? 1 : 0) : 1; // Default read access
      const canUpdate = userPerm ? (userPerm.can_update ? 1 : 0) : 0;
      const canDelete = userPerm ? (userPerm.can_delete ? 1 : 0) : 0;

      // Upsert into staff_permissions
      const permId = `sp_${mod}_${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`;

      // Check if permission already exists for this (user, brand, module)
      const existingPerm = await db.get(
        'SELECT id FROM staff_permissions WHERE user_id = ? AND brand_id = ? AND module = ?',
        [targetUserId, brandId, mod]
      );

      if (existingPerm) {
        await db.query(
          `UPDATE staff_permissions SET can_create = ?, can_read = ?, can_update = ?, can_delete = ?
           WHERE id = ?`,
          [canCreate, canRead, canUpdate, canDelete, existingPerm.id]
        );
      } else {
        await db.query(
          `INSERT INTO staff_permissions (id, user_id, brand_id, module, can_create, can_read, can_update, can_delete, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [permId, targetUserId, brandId, mod, canCreate, canRead, canUpdate, canDelete, nowUtc]
        );
      }

      assignedPermissions.push({
        module: mod,
        can_create: Boolean(canCreate),
        can_read: Boolean(canRead),
        can_update: Boolean(canUpdate),
        can_delete: Boolean(canDelete)
      });
    }

    return res.status(201).json({
      success: true,
      message: `Staff member ${cleanName} (${cleanEmail}) added successfully.`,
      staff: {
        user_id: targetUserId,
        name: cleanName,
        email: cleanEmail,
        role: 'staff',
        permissions: assignedPermissions
      }
    });
  } catch (err) {
    console.error('[staffController.addStaff Error]', err.message || err);
    return res.status(500).json({
      success: false,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to add staff member.'
    });
  }
}

/**
 * 3. DELETE /api/staff/:id
 * Revoke staff member access from this brand
 * Strictly restricted to Brand Owner
 */
export async function removeStaff(req, res) {
  try {
    const brandId = req.brand.id;
    const targetUserId = req.params.id;

    // Strict Owner-Only Enforcement
    if (!req.isBrandOwner) {
      return res.status(403).json({
        success: false,
        code: 'OWNER_ONLY',
        message: 'Only the brand owner can revoke staff member permissions.'
      });
    }

    // Safety: Protect Owner Account
    if (targetUserId === req.user.id || targetUserId === req.brand.user_id) {
      return res.status(400).json({
        success: false,
        code: 'CANNOT_REMOVE_OWNER',
        message: 'Cannot revoke permissions of the brand owner.'
      });
    }

    const db = getDatabase();
    const result = await db.query(
      'DELETE FROM staff_permissions WHERE user_id = ? AND brand_id = ?',
      [targetUserId, brandId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        code: 'STAFF_NOT_FOUND',
        message: 'Staff member not found for this brand.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Staff member access has been successfully revoked.'
    });
  } catch (err) {
    console.error('[staffController.removeStaff Error]', err.message || err);
    return res.status(500).json({
      success: false,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to revoke staff access.'
    });
  }
}

export default {
  listStaff,
  addStaff,
  removeStaff,
  STANDARD_MODULES
};
