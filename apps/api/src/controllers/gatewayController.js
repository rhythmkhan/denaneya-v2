/**
 * DenaNeya v2.0 - Gateways Management Controller
 * File: apps/api/src/controllers/gatewayController.js
 *
 * Implements:
 * 1. GET    /api/gateways             - List brand gateways with category breakdown
 * 2. POST   /api/gateways/:id/toggle  - Toggle gateway active/inactive state
 * 3. POST   /api/gateways             - Activate/configure new gateway from 52+ catalog
 * 4. PUT    /api/gateways/:id         - Update gateway credentials & fee parameters
 * 5. DELETE /api/gateways/:id         - Delete/deactivate gateway channel
 */

import crypto from 'node:crypto';
import dbPkg from '@denaneya/database';

const { getDatabase } = dbPkg;

/**
 * 1. GET /api/gateways
 * List brand's configured gateways with optional category filter
 */
export async function listGateways(req, res) {
  try {
    const brandId = req.brand.id;
    const { category, status } = req.query;

    const db = getDatabase();
    const whereClauses = ['brand_id = ?'];
    const params = [brandId];

    if (category) {
      whereClauses.push('LOWER(category) = LOWER(?)');
      params.push(category.trim());
    }

    if (status) {
      whereClauses.push('LOWER(status) = LOWER(?)');
      params.push(status.trim());
    }

    const whereSql = whereClauses.join(' AND ');

    const rowsResult = await db.query(
      `SELECT id, brand_id, channel_name, category, account_type, account_number, routing_number,
              branch_name, district, ussd_code, fee_percentage, fee_fixed, exchange_rate, fields_json,
              status, created_at
       FROM gateways
       WHERE ${whereSql}
       ORDER BY category ASC, channel_name ASC`,
      params
    );

    const allGateways = (rowsResult.rows || []).map((gw) => {
      let parsedFields = null;
      if (gw.fields_json) {
        try {
          parsedFields = typeof gw.fields_json === 'string' ? JSON.parse(gw.fields_json) : gw.fields_json;
        } catch (_) {}
      }
      return {
        ...gw,
        fee_percentage: Number(gw.fee_percentage || 0),
        fee_fixed: Number(gw.fee_fixed || 0),
        exchange_rate: Number(gw.exchange_rate || 1),
        fields: parsedFields
      };
    });

    // Category Counters
    const counts = {
      all: allGateways.length,
      mobile: allGateways.filter((g) => g.category?.toLowerCase() === 'mobile').length,
      bank: allGateways.filter((g) => g.category?.toLowerCase() === 'bank').length,
      international: allGateways.filter((g) => g.category?.toLowerCase() === 'international').length,
      active: allGateways.filter((g) => g.status === 'active').length,
      inactive: allGateways.filter((g) => g.status !== 'active').length
    };

    return res.status(200).json({
      success: true,
      counts,
      gateways: allGateways
    });
  } catch (err) {
    console.error('[gatewayController.listGateways Error]', err.message || err);
    return res.status(500).json({
      success: false,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to retrieve gateways.'
    });
  }
}

/**
 * 2. POST /api/gateways/:id/toggle
 * Toggle gateway active / inactive status
 */
export async function toggleGateway(req, res) {
  try {
    const brandId = req.brand.id;
    const gatewayId = req.params.id;
    const { status } = req.body || {};

    const db = getDatabase();

    // 1. Verify existence & ownership
    const gateway = await db.get(
      'SELECT * FROM gateways WHERE id = ? AND brand_id = ?',
      [gatewayId, brandId]
    );

    if (!gateway) {
      return res.status(404).json({
        success: false,
        code: 'GATEWAY_NOT_FOUND',
        message: 'Gateway channel not found in this brand.'
      });
    }

    // 2. Determine target status
    let newStatus = 'active';
    if (status && (status === 'active' || status === 'inactive')) {
      newStatus = status;
    } else {
      newStatus = gateway.status === 'active' ? 'inactive' : 'active';
    }

    // 3. Update status
    await db.query(
      'UPDATE gateways SET status = ? WHERE id = ? AND brand_id = ?',
      [newStatus, gatewayId, brandId]
    );

    return res.status(200).json({
      success: true,
      message: `Gateway ${gateway.channel_name} (${gateway.account_number}) is now ${newStatus}.`,
      gateway: {
        id: gateway.id,
        channel_name: gateway.channel_name,
        category: gateway.category,
        account_type: gateway.account_type,
        account_number: gateway.account_number,
        status: newStatus
      }
    });
  } catch (err) {
    console.error('[gatewayController.toggleGateway Error]', err.message || err);
    return res.status(500).json({
      success: false,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to toggle gateway status.'
    });
  }
}

/**
 * 3. POST /api/gateways
 * Configure and activate a new gateway from 52+ catalog
 */
export async function createGateway(req, res) {
  try {
    const brandId = req.brand.id;
    const {
      channel_name,
      category = 'Mobile',
      account_type = 'personal',
      account_number,
      routing_number,
      branch_name,
      district,
      ussd_code,
      fee_percentage = 0.0,
      fee_fixed = 0.0,
      exchange_rate = 1.0,
      fields
    } = req.body || {};

    if (!channel_name || typeof channel_name !== 'string') {
      return res.status(400).json({
        success: false,
        code: 'CHANNEL_NAME_REQUIRED',
        message: 'channel_name is required.'
      });
    }

    if (!account_number || typeof account_number !== 'string') {
      return res.status(400).json({
        success: false,
        code: 'ACCOUNT_NUMBER_REQUIRED',
        message: 'account_number is required.'
      });
    }

    const gatewayId = `gw_${channel_name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`;
    const nowUtc = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const serializedFields = fields ? JSON.stringify(fields) : null;

    const db = getDatabase();
    await db.query(
      `INSERT INTO gateways (
         id, brand_id, channel_name, category, account_type, account_number,
         routing_number, branch_name, district, ussd_code, fee_percentage,
         fee_fixed, exchange_rate, fields_json, status, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
      [
        gatewayId,
        brandId,
        channel_name.trim(),
        category.trim(),
        account_type.trim(),
        account_number.trim(),
        routing_number ? routing_number.trim() : null,
        branch_name ? branch_name.trim() : null,
        district ? district.trim() : null,
        ussd_code ? ussd_code.trim() : null,
        Number(fee_percentage) || 0.0,
        Number(fee_fixed) || 0.0,
        Number(exchange_rate) || 1.0,
        serializedFields,
        nowUtc
      ]
    );

    return res.status(201).json({
      success: true,
      message: `Gateway ${channel_name} configured and activated successfully.`,
      gateway: {
        id: gatewayId,
        brand_id: brandId,
        channel_name: channel_name.trim(),
        category: category.trim(),
        account_type: account_type.trim(),
        account_number: account_number.trim(),
        status: 'active',
        created_at: nowUtc
      }
    });
  } catch (err) {
    console.error('[gatewayController.createGateway Error]', err.message || err);
    return res.status(500).json({
      success: false,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to configure gateway.'
    });
  }
}

/**
 * 4. PUT /api/gateways/:id
 * Update gateway configuration
 */
export async function updateGateway(req, res) {
  try {
    const brandId = req.brand.id;
    const gatewayId = req.params.id;
    const {
      account_type,
      account_number,
      routing_number,
      branch_name,
      district,
      ussd_code,
      fee_percentage,
      fee_fixed,
      exchange_rate,
      fields
    } = req.body || {};

    const db = getDatabase();
    const existing = await db.get(
      'SELECT * FROM gateways WHERE id = ? AND brand_id = ?',
      [gatewayId, brandId]
    );

    if (!existing) {
      return res.status(404).json({
        success: false,
        code: 'GATEWAY_NOT_FOUND',
        message: 'Gateway channel not found in this brand.'
      });
    }

    const updatedAccType = account_type !== undefined ? account_type : existing.account_type;
    const updatedAccNum = account_number !== undefined ? account_number : existing.account_number;
    const updatedRouting = routing_number !== undefined ? routing_number : existing.routing_number;
    const updatedBranch = branch_name !== undefined ? branch_name : existing.branch_name;
    const updatedDistrict = district !== undefined ? district : existing.district;
    const updatedUssd = ussd_code !== undefined ? ussd_code : existing.ussd_code;
    const updatedFeePct = fee_percentage !== undefined ? Number(fee_percentage) : existing.fee_percentage;
    const updatedFeeFixed = fee_fixed !== undefined ? Number(fee_fixed) : existing.fee_fixed;
    const updatedRate = exchange_rate !== undefined ? Number(exchange_rate) : existing.exchange_rate;
    const updatedFields = fields !== undefined ? JSON.stringify(fields) : existing.fields_json;

    await db.query(
      `UPDATE gateways SET
         account_type = ?, account_number = ?, routing_number = ?, branch_name = ?,
         district = ?, ussd_code = ?, fee_percentage = ?, fee_fixed = ?,
         exchange_rate = ?, fields_json = ?
       WHERE id = ? AND brand_id = ?`,
      [
        updatedAccType,
        updatedAccNum,
        updatedRouting,
        updatedBranch,
        updatedDistrict,
        updatedUssd,
        updatedFeePct,
        updatedFeeFixed,
        updatedRate,
        updatedFields,
        gatewayId,
        brandId
      ]
    );

    return res.status(200).json({
      success: true,
      message: 'Gateway configuration updated successfully.',
      gateway: {
        id: gatewayId,
        channel_name: existing.channel_name,
        account_type: updatedAccType,
        account_number: updatedAccNum,
        status: existing.status
      }
    });
  } catch (err) {
    console.error('[gatewayController.updateGateway Error]', err.message || err);
    return res.status(500).json({
      success: false,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to update gateway.'
    });
  }
}

/**
 * 5. DELETE /api/gateways/:id
 * Delete gateway channel
 */
export async function deleteGateway(req, res) {
  try {
    const brandId = req.brand.id;
    const gatewayId = req.params.id;

    const db = getDatabase();
    const result = await db.query(
      'DELETE FROM gateways WHERE id = ? AND brand_id = ?',
      [gatewayId, brandId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        code: 'GATEWAY_NOT_FOUND',
        message: 'Gateway channel not found in this brand.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Gateway channel deleted successfully.'
    });
  } catch (err) {
    console.error('[gatewayController.deleteGateway Error]', err.message || err);
    return res.status(500).json({
      success: false,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to delete gateway.'
    });
  }
}

export default {
  listGateways,
  toggleGateway,
  createGateway,
  updateGateway,
  deleteGateway
};
