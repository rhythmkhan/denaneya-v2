/**
 * DenaNeya v2.0 - Multi-Tenant Boundary Isolation Middleware
 * File: apps/api/src/middlewares/tenant.js
 *
 * Responsibilities:
 * 1. Derives target brand from headers, query, params, or single-brand user fallback.
 * 2. Enforces strict brand ownership (brands.user_id === req.user.id) or staff RBAC (staff_permissions).
 * 3. Prevents cross-tenant IDOR attacks with HTTP 403 Forbidden.
 * 4. Binds zero-secret brand metadata and permission helpers to req context.
 */

import dbPkg from '@denaneya/database';

const { getDatabase } = dbPkg;

/**
 * Express middleware to resolve and authorize tenant brand context.
 * Requires authMiddleware to run beforehand (ensures req.user exists).
 */
export async function tenantMiddleware(req, res, next) {
  try {
    // 1. Ensure caller is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        code: 'UNAUTHORIZED',
        message: 'Authentication required before tenant resolution.'
      });
    }

    const db = getDatabase();

    // 2. Extract requested brand ID from allowed vectors
    let brandId =
      req.headers['x-brand-id'] ||
      req.query.brandId ||
      req.query.brand_id ||
      req.params.brandId;

    // 3. Fallback: If no explicit brand ID was supplied, resolve user's brands
    if (!brandId) {
      const userBrands = await db.query(
        `SELECT id, user_id, brand_name, brand_slug, api_key, webhook_url, status, created_at, updated_at
         FROM brands 
         WHERE user_id = ? AND status != 'deleted' 
         ORDER BY created_at ASC`,
        [req.user.id]
      );

      if (!userBrands.rows || userBrands.rows.length === 0) {
        // Also check if user is staff on any brand
        const staffBrands = await db.query(
          `SELECT b.id, b.user_id, b.brand_name, b.brand_slug, b.api_key, b.webhook_url, b.status, b.created_at, b.updated_at
           FROM brands b
           JOIN staff_permissions sp ON b.id = sp.brand_id
           WHERE sp.user_id = ? AND b.status != 'deleted'
           LIMIT 1`,
          [req.user.id]
        );

        if (!staffBrands.rows || staffBrands.rows.length === 0) {
          return res.status(400).json({
            success: false,
            code: 'NO_BRAND_FOUND',
            message: 'No active brand found for this account. Please create a brand first.'
          });
        }
        brandId = staffBrands.rows[0].id;
      } else if (userBrands.rows.length === 1) {
        // Unambiguous single brand - auto-bind
        brandId = userBrands.rows[0].id;
      } else {
        // Multiple brands exist, client must explicitly disambiguate
        return res.status(400).json({
          success: false,
          code: 'BRAND_ID_REQUIRED',
          message: 'Multiple brands found. Please provide x-brand-id header or brandId query parameter.',
          availableBrands: userBrands.rows.map((b) => ({ id: b.id, name: b.brand_name, slug: b.brand_slug }))
        });
      }
    }

    // 4. Query target brand with ZERO-SECRET projection (omit api_secret & webhook_secret)
    const brand = await db.get(
      `SELECT id, user_id, brand_name, brand_slug, api_key, webhook_url, status, created_at, updated_at
       FROM brands
       WHERE id = ? AND status != 'deleted'`,
      [brandId]
    );

    if (!brand) {
      return res.status(404).json({
        success: false,
        code: 'BRAND_NOT_FOUND',
        message: 'The requested brand does not exist or has been deleted.'
      });
    }

    // 5. Tier 1 Authorization: Direct Owner Validation
    if (brand.user_id === req.user.id) {
      req.brand = brand;
      req.isBrandOwner = true;
      req.staffRole = 'owner';
      req.hasBrandPermission = () => true; // Owner possesses all rights
      return next();
    }

    // 6. Tier 2 Authorization: Staff Permissions Validation
    const staffPerms = await db.query(
      `SELECT module, can_create, can_read, can_update, can_delete
       FROM staff_permissions
       WHERE user_id = ? AND brand_id = ?`,
      [req.user.id, brand.id]
    );

    if (staffPerms.rows && staffPerms.rows.length > 0) {
      req.brand = brand;
      req.isBrandOwner = false;
      req.staffRole = 'staff';
      req.staffPermissions = staffPerms.rows;

      // Helper method for route-level module RBAC enforcement
      req.hasBrandPermission = (moduleName, action = 'read') => {
        const perm = staffPerms.rows.find((p) => p.module === moduleName);
        if (!perm) return false;
        switch (action) {
          case 'create':
            return Boolean(perm.can_create);
          case 'read':
            return Boolean(perm.can_read);
          case 'update':
            return Boolean(perm.can_update);
          case 'delete':
            return Boolean(perm.can_delete);
          default:
            return false;
        }
      };

      return next();
    }

    // 7. Tier 3 Rejection: IDOR Attempt Blocked
    return res.status(403).json({
      success: false,
      code: 'FORBIDDEN',
      message: 'Access denied: You do not have authorization to access this brand.'
    });
  } catch (err) {
    console.error('[TenantMiddleware Error]', err);
    return res.status(500).json({
      success: false,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to process tenant validation.'
    });
  }
}

/**
 * Middleware factory for granular staff module permission checks.
 * @param {string} moduleName - Module name (e.g. 'invoices', 'devices', 'gateways')
 * @param {'create'|'read'|'update'|'delete'} [action='read']
 */
export function requirePermission(moduleName, action = 'read') {
  return (req, res, next) => {
    if (!req.hasBrandPermission || !req.hasBrandPermission(moduleName, action)) {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: `You lack '${action}' permission on the '${moduleName}' module for this brand.`
      });
    }
    next();
  };
}

export default tenantMiddleware;
