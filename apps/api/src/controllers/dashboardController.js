/**
 * DenaNeya v2.0 - Hardened Dashboard Metrics Controller
 * File: apps/api/src/controllers/dashboardController.js
 *
 * Fully resolves VULN-01 IDOR:
 * - Scoped strictly to authenticated req.brand.id
 * - Zero-secret projection across all database entities
 * - Excludes api_secret, webhook_secret, and device_token
 */

import dbPkg from '@denaneya/database';

const { getDatabase } = dbPkg;

/**
 * GET /api/dashboard/stats
 * Returns aggregated financial metrics, safe device list, safe gateway list, and recent invoices.
 */
export async function getDashboardStats(req, res) {
  try {
    const brandId = req.brand.id;
    const db = getDatabase();

    // Parallel execution of strictly scoped, zero-secret SQL queries
    const [
      invoiceStatsRow,
      devicesStatsRow,
      gatewaysStatsRow,
      unusedStoredRow,
      recentInvoicesResult,
      gatewaysResult,
      devicesResult
    ] = await Promise.all([
      // 1. Invoice aggregation metrics
      db.get(
        `SELECT 
           COUNT(*) AS total_count,
           COALESCE(SUM(CASE WHEN status = 'COMPLETED' THEN amount ELSE 0 END), 0) AS gmv,
           COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) AS completed_count,
           COUNT(CASE WHEN status = 'PENDING' THEN 1 END) AS pending_count,
           COALESCE(SUM(CASE WHEN status = 'PENDING' THEN amount ELSE 0 END), 0) AS pending_volume,
           COUNT(CASE WHEN status = 'EXPIRED' THEN 1 END) AS expired_count,
           COUNT(CASE WHEN status = 'FAILED' THEN 1 END) AS failed_count
         FROM invoices 
         WHERE brand_id = ?`,
        [brandId]
      ),

      // 2. Devices statistics
      db.get(
        `SELECT 
           COUNT(*) AS total_devices,
           COUNT(CASE WHEN status = 'online' THEN 1 END) AS active_devices
         FROM devices 
         WHERE brand_id = ?`,
        [brandId]
      ),

      // 3. Gateways statistics
      db.get(
        `SELECT 
           COUNT(*) AS total_gateways,
           COUNT(CASE WHEN status = 'active' THEN 1 END) AS active_gateways
         FROM gateways 
         WHERE brand_id = ?`,
        [brandId]
      ),

      // 4. Unused stored SMS records
      db.get(
        `SELECT COUNT(*) AS unused_count 
         FROM stored_data 
         WHERE brand_id = ? AND status = 'UNUSED'`,
        [brandId]
      ),

      // 5. Recent Invoices (Safe Projection - No Internal Secrets)
      db.query(
        `SELECT 
           id, invoice_number, customer_name, customer_email, customer_phone,
           amount, currency, status, payment_method, trx_id, redirect_url,
           expires_at, created_at
         FROM invoices 
         WHERE brand_id = ? 
         ORDER BY created_at DESC 
         LIMIT 10`,
        [brandId]
      ),

      // 6. Active Gateways (Safe Projection)
      db.query(
        `SELECT 
           id, channel_name, category, account_type, account_number,
           routing_number, branch_name, district, ussd_code,
           fee_percentage, fee_fixed, exchange_rate, status
         FROM gateways 
         WHERE brand_id = ? AND status = 'active'
         ORDER BY channel_name ASC`,
        [brandId]
      ),

      // 7. Paired Devices (Safe Projection - ZERO device_token LEAKAGE)
      db.query(
        `SELECT 
           id, device_name, device_model, sim1_operator, sim2_operator,
           battery_level, last_sync_at, status, created_at
         FROM devices 
         WHERE brand_id = ? 
         ORDER BY last_sync_at DESC`,
        [brandId]
      )
    ]);

    // Format metrics
    const totalCount = Number(invoiceStatsRow?.total_count || 0);
    const completedCount = Number(invoiceStatsRow?.completed_count || 0);
    const gmv = Number(invoiceStatsRow?.gmv || 0);
    const pendingCount = Number(invoiceStatsRow?.pending_count || 0);
    const pendingVolume = Number(invoiceStatsRow?.pending_volume || 0);
    const expiredCount = Number(invoiceStatsRow?.expired_count || 0);
    const failedCount = Number(invoiceStatsRow?.failed_count || 0);

    const successRate = totalCount > 0
      ? Number(((completedCount / totalCount) * 100).toFixed(2))
      : 0.00;

    const activeDevicesCount = Number(devicesStatsRow?.active_devices || 0);
    const totalDevicesCount = Number(devicesStatsRow?.total_devices || 0);
    const activeGatewaysCount = Number(gatewaysStatsRow?.active_gateways || 0);
    const totalGatewaysCount = Number(gatewaysStatsRow?.total_gateways || 0);
    const unusedStoredCount = Number(unusedStoredRow?.unused_count || 0);

    const recentInvoicesList = recentInvoicesResult.rows || [];

    return res.status(200).json({
      success: true,
      brand: {
        id: req.brand.id,
        brand_name: req.brand.brand_name,
        brand_slug: req.brand.brand_slug,
        api_key: req.brand.api_key,
        webhook_url: req.brand.webhook_url,
        status: req.brand.status,
        created_at: req.brand.created_at,
        role: req.staffRole
      },
      metrics: {
        gmv,
        totalCount,
        completedCount,
        pendingCount,
        pendingVolume,
        expiredCount,
        failedCount,
        successRate,
        activeDevicesCount,
        totalDevicesCount,
        activeGatewaysCount,
        totalGatewaysCount,
        unusedStoredCount
      },
      recent_invoices: recentInvoicesList,
      recentInvoices: recentInvoicesList,
      gateways: gatewaysResult.rows || [],
      devices: devicesResult.rows || []
    });
  } catch (err) {
    console.error('[getDashboardStats Error]', err);
    return res.status(500).json({
      success: false,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to retrieve dashboard analytics.'
    });
  }
}

export default getDashboardStats;
