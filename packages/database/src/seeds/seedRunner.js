/**
 * DenaNeya v2.0 - Universal Seed Runner (MySQL 8 & SQLite 3 Compatible)
 * Seeds demo merchant, brand, test device, active gateways, sample invoices,
 * carrier SMS records, webhook logs, staff RBAC, and affiliate referrals.
 */

'use strict';

const fixtures = require('./demoFixtures.seed.js');
const catalog = require('./gatewayCatalog.seed.js');
const { getDatabase } = require('../connection.js');

/**
 * Execute seeder against the given database driver instance.
 * @param {Object} [dbInstance] - Database driver from getDatabase()
 * @param {Object} [options]
 * @param {boolean} [options.clean=true] - Delete existing demo records first
 * @param {boolean} [options.seedAll52=false] - Also seed all 52 catalog gateways for demo brand
 * @returns {Promise<Object>} Seeding statistics
 */
async function runSeed(dbInstance = null, options = {}) {
  const db = dbInstance || getDatabase();
  const { clean = true, seedAll52 = false } = options;
  const isSqlite = db.type === 'sqlite';

  console.log(`[Seeder] Starting DenaNeya v2.0 Seeding for dialect: ${db.type}...`);

  if (clean) {
    console.log('[Seeder] Cleaning existing demo records...');
    const tablesInOrder = [
      'affiliate_referrals',
      'staff_permissions',
      'webhook_logs',
      'stored_data',
      'invoices',
      'gateways',
      'devices',
      'brands',
      'users'
    ];

    for (const table of tablesInOrder) {
      try {
        if (table === 'users') {
          await db.query(`DELETE FROM users WHERE id = ? OR id = ?`, [fixtures.DEMO_USER_ID, fixtures.STAFF_USER_ID]);
        } else if (table === 'brands') {
          await db.query(`DELETE FROM brands WHERE id = ?`, [fixtures.DEMO_BRAND_ID]);
        } else if (table === 'affiliate_referrals') {
          await db.query(`DELETE FROM affiliate_referrals WHERE referrer_user_id = ?`, [fixtures.DEMO_USER_ID]);
        } else {
          await db.query(`DELETE FROM ${table} WHERE brand_id = ?`, [fixtures.DEMO_BRAND_ID]);
        }
      } catch (err) {
        // Table might not exist or already clean
      }
    }
    console.log('[Seeder] Clean completed.');
  }

  // 1. Seed Users
  console.log(`[Seeder] Seeding ${fixtures.USERS_SEED.length} Users...`);
  for (const u of fixtures.USERS_SEED) {
    const sql = isSqlite
      ? `INSERT OR REPLACE INTO users (id, name, email, password_hash, role, credits, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      : `INSERT INTO users (id, name, email, password_hash, role, credits, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name=VALUES(name), credits=VALUES(credits), status=VALUES(status)`;

    await db.query(sql, [
      u.id, u.name, u.email, u.password_hash, u.role, u.credits, u.status, u.created_at, u.updated_at
    ]);
  }

  // 2. Seed Brands
  console.log(`[Seeder] Seeding ${fixtures.BRANDS_SEED.length} Brands...`);
  for (const b of fixtures.BRANDS_SEED) {
    const sql = isSqlite
      ? `INSERT OR REPLACE INTO brands (id, user_id, brand_name, brand_slug, api_key, api_secret, webhook_url, webhook_secret, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      : `INSERT INTO brands (id, user_id, brand_name, brand_slug, api_key, api_secret, webhook_url, webhook_secret, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE brand_name=VALUES(brand_name), api_key=VALUES(api_key), webhook_url=VALUES(webhook_url)`;

    await db.query(sql, [
      b.id, b.user_id, b.brand_name, b.brand_slug, b.api_key, b.api_secret, b.webhook_url, b.webhook_secret, b.status, b.created_at, b.updated_at
    ]);
  }

  // 3. Seed Devices
  console.log(`[Seeder] Seeding ${fixtures.DEVICES_SEED.length} Devices...`);
  for (const d of fixtures.DEVICES_SEED) {
    const sql = isSqlite
      ? `INSERT OR REPLACE INTO devices (id, brand_id, device_name, device_model, device_token, sim1_operator, sim2_operator, battery_level, last_sync_at, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      : `INSERT INTO devices (id, brand_id, device_name, device_model, device_token, sim1_operator, sim2_operator, battery_level, last_sync_at, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE battery_level=VALUES(battery_level), status=VALUES(status), last_sync_at=VALUES(last_sync_at)`;

    await db.query(sql, [
      d.id, d.brand_id, d.device_name, d.device_model, d.device_token, d.sim1_operator, d.sim2_operator, d.battery_level, d.last_sync_at, d.status, d.created_at
    ]);
  }

  // 4. Seed Active Gateways
  console.log(`[Seeder] Seeding ${fixtures.ACTIVE_GATEWAYS_SEED.length} Active Gateways...`);
  for (const gw of fixtures.ACTIVE_GATEWAYS_SEED) {
    const sql = isSqlite
      ? `INSERT OR REPLACE INTO gateways (id, brand_id, channel_name, category, account_type, account_number, routing_number, branch_name, district, ussd_code, fee_percentage, fee_fixed, exchange_rate, fields_json, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      : `INSERT INTO gateways (id, brand_id, channel_name, category, account_type, account_number, routing_number, branch_name, district, ussd_code, fee_percentage, fee_fixed, exchange_rate, fields_json, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE account_number=VALUES(account_number), status=VALUES(status), fee_percentage=VALUES(fee_percentage)`;

    await db.query(sql, [
      gw.id, gw.brand_id, gw.channel_name, gw.category, gw.account_type, gw.account_number,
      gw.routing_number, gw.branch_name, gw.district, gw.ussd_code, gw.fee_percentage,
      gw.fee_fixed, gw.exchange_rate, gw.fields_json, gw.status, gw.created_at
    ]);
  }

  // Optional: Seed all 52 gateways into the brand
  let seeded52Count = 0;
  if (seedAll52) {
    console.log(`[Seeder] Seeding all ${catalog.GATEWAY_CATALOG.length} Catalog Gateways for Brand ${fixtures.DEMO_BRAND_ID}...`);
    for (const catGw of catalog.GATEWAY_CATALOG) {
      const gwId = `gw_${catGw.id}_catalog`;
      const sql = isSqlite
        ? `INSERT OR REPLACE INTO gateways (id, brand_id, channel_name, category, account_type, account_number, routing_number, branch_name, district, ussd_code, fee_percentage, fee_fixed, exchange_rate, fields_json, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
        : `INSERT INTO gateways (id, brand_id, channel_name, category, account_type, account_number, routing_number, branch_name, district, ussd_code, fee_percentage, fee_fixed, exchange_rate, fields_json, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
           ON DUPLICATE KEY UPDATE status=VALUES(status)`;

      await db.query(sql, [
        gwId,
        fixtures.DEMO_BRAND_ID,
        catGw.name,
        catGw.tab,
        catGw.subtypes && catGw.subtypes[0] ? catGw.subtypes[0] : 'personal',
        '01800000000',
        catGw.routingPrefix ? `${catGw.routingPrefix}0000` : null,
        null,
        null,
        catGw.ussdCode || null,
        0.00,
        0.00,
        catGw.tab === 'International' ? 120.00 : 1.00,
        JSON.stringify(catGw),
        'active'
      ]);
      seeded52Count++;
    }
    console.log(`[Seeder] Seeded ${seeded52Count} catalog gateways.`);
  }

  // 5. Seed Invoices
  console.log(`[Seeder] Seeding ${fixtures.INVOICES_SEED.length} Sample Invoices...`);
  for (const inv of fixtures.INVOICES_SEED) {
    const sql = isSqlite
      ? `INSERT OR REPLACE INTO invoices (id, brand_id, invoice_number, customer_name, customer_email, customer_phone, amount, currency, status, payment_method, trx_id, redirect_url, metadata_json, expires_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      : `INSERT INTO invoices (id, brand_id, invoice_number, customer_name, customer_email, customer_phone, amount, currency, status, payment_method, trx_id, redirect_url, metadata_json, expires_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE status=VALUES(status), trx_id=VALUES(trx_id), updated_at=VALUES(updated_at)`;

    await db.query(sql, [
      inv.id, inv.brand_id, inv.invoice_number, inv.customer_name, inv.customer_email,
      inv.customer_phone, inv.amount, inv.currency, inv.status, inv.payment_method,
      inv.trx_id, inv.redirect_url, inv.metadata_json, inv.expires_at, inv.created_at, inv.updated_at
    ]);
  }

  // 6. Seed Stored Data (Carrier SMS Receipts)
  console.log(`[Seeder] Seeding ${fixtures.STORED_DATA_SEED.length} SMS Ingested Transactions...`);
  for (const s of fixtures.STORED_DATA_SEED) {
    const sql = isSqlite
      ? `INSERT OR REPLACE INTO stored_data (id, brand_id, device_id, sender, raw_sms, channel, trx_id, amount, status, sim_slot, received_at, used_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      : `INSERT INTO stored_data (id, brand_id, device_id, sender, raw_sms, channel, trx_id, amount, status, sim_slot, received_at, used_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE status=VALUES(status), used_at=VALUES(used_at)`;

    await db.query(sql, [
      s.id, s.brand_id, s.device_id, s.sender, s.raw_sms, s.channel,
      s.trx_id, s.amount, s.status, s.sim_slot, s.received_at, s.used_at, s.created_at
    ]);
  }

  // 7. Seed Webhook Logs
  console.log(`[Seeder] Seeding ${fixtures.WEBHOOK_LOGS_SEED.length} Webhook Logs...`);
  for (const w of fixtures.WEBHOOK_LOGS_SEED) {
    const sql = isSqlite
      ? `INSERT OR REPLACE INTO webhook_logs (id, brand_id, invoice_id, event, payload_json, response_status, response_body, status, attempts, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      : `INSERT INTO webhook_logs (id, brand_id, invoice_id, event, payload_json, response_status, response_body, status, attempts, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE status=VALUES(status), response_status=VALUES(response_status)`;

    await db.query(sql, [
      w.id, w.brand_id, w.invoice_id, w.event, w.payload_json,
      w.response_status, w.response_body, w.status, w.attempts, w.created_at
    ]);
  }

  // 8. Seed Staff Permissions
  console.log(`[Seeder] Seeding ${fixtures.STAFF_PERMISSIONS_SEED.length} Staff Permissions...`);
  for (const sp of fixtures.STAFF_PERMISSIONS_SEED) {
    const sql = isSqlite
      ? `INSERT OR REPLACE INTO staff_permissions (id, user_id, brand_id, module, can_create, can_read, can_update, can_delete, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      : `INSERT INTO staff_permissions (id, user_id, brand_id, module, can_create, can_read, can_update, can_delete, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE can_read=VALUES(can_read), can_create=VALUES(can_create)`;

    await db.query(sql, [
      sp.id, sp.user_id, sp.brand_id, sp.module,
      sp.can_create ? 1 : 0, sp.can_read ? 1 : 0,
      sp.can_update ? 1 : 0, sp.can_delete ? 1 : 0,
      sp.created_at
    ]);
  }

  // 9. Seed Affiliate Referrals
  console.log(`[Seeder] Seeding ${fixtures.AFFILIATE_REFERRALS_SEED.length} Affiliate Referrals...`);
  for (const a of fixtures.AFFILIATE_REFERRALS_SEED) {
    const sql = isSqlite
      ? `INSERT OR REPLACE INTO affiliate_referrals (id, referrer_user_id, referred_user_id, commission_rate, total_earned, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      : `INSERT INTO affiliate_referrals (id, referrer_user_id, referred_user_id, commission_rate, total_earned, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE total_earned=VALUES(total_earned), status=VALUES(status)`;

    await db.query(sql, [
      a.id, a.referrer_user_id, a.referred_user_id, a.commission_rate,
      a.total_earned, a.status, a.created_at
    ]);
  }

  console.log('[Seeder] All DenaNeya v2.0 seed records successfully committed!');
  return {
    success: true,
    dialect: db.type,
    catalogGatewaysCount: catalog.GATEWAY_CATALOG.length,
    usersSeeded: fixtures.USERS_SEED.length,
    brandsSeeded: fixtures.BRANDS_SEED.length,
    devicesSeeded: fixtures.DEVICES_SEED.length,
    activeGatewaysSeeded: fixtures.ACTIVE_GATEWAYS_SEED.length,
    catalogGatewaysSeeded: seeded52Count,
    invoicesSeeded: fixtures.INVOICES_SEED.length,
    smsTransactionsSeeded: fixtures.STORED_DATA_SEED.length,
    webhookLogsSeeded: fixtures.WEBHOOK_LOGS_SEED.length,
    staffPermissionsSeeded: fixtures.STAFF_PERMISSIONS_SEED.length,
    affiliateReferralsSeeded: fixtures.AFFILIATE_REFERRALS_SEED.length
  };
}

if (require.main === module) {
  runSeed()
    .then((res) => {
      console.log('[Seeder] Finished successfully:', res);
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Seeder] Seeding error:', err);
      process.exit(1);
    });
}

module.exports = {
  runSeed
};
