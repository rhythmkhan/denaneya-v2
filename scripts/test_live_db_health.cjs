/**
 * DenaNeya v2.0 - Live MySQL Database Automated Health Check
 * Validates TCP ping, table schemas, gateway count (>= 52), transactional read/write/rollback,
 * and multi-tenant composite uniqueness directly against Hostinger production MySQL.
 */
'use strict';

const path = require('path');
const fs = require('fs');

// Resolve dotenv and mysql2 either locally or from packages/database
let mysql;
try {
  mysql = require('mysql2/promise');
} catch (e) {
  mysql = require(path.resolve(__dirname, '../packages/database/node_modules/mysql2/promise'));
}

let dotenv;
try {
  dotenv = require('dotenv');
} catch (e) {
  dotenv = require(path.resolve(__dirname, '../packages/database/node_modules/dotenv'));
}

// Load .env
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}
dotenv.config({ path: path.resolve(__dirname, '../packages/database/.env') });

async function verifyLiveDatabase() {
  const config = {
    host: process.env.DB_HOST || 'srv1497.hstgr.io',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'u298980084_denaneya',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE || process.env.DB_NAME || 'u298980084_denaneya',
    connectTimeout: 15000
  };

  console.log('======================================================');
  console.log('🔍 INITIATING LIVE MYSQL PRODUCTION HEALTH CHECK');
  console.log(`🎯 Target Host: ${config.host}:${config.port}`);
  console.log(`📁 Database:    ${config.database}`);
  console.log(`👤 User:        ${config.user}`);
  console.log('======================================================\n');

  const startTime = Date.now();
  const conn = await mysql.createConnection(config);
  const latency = Date.now() - startTime;
  console.log(`[HealthCheck] Connected to live Hostinger MySQL successfully in ${latency}ms.`);

  try {
    // 1. Query Ping & Server Metadata
    const [pingRes] = await conn.query('SELECT 1 as ping, VERSION() as version, DATABASE() as db, CURRENT_TIMESTAMP() as ts');
    if (pingRes[0].ping !== 1) throw new Error('Ping check failed');
    console.log(`  [PASS] 1. Live Ping (SELECT 1)`);
    console.log(`         Engine Version: ${pingRes[0].version}`);
    console.log(`         Current DB:     ${pingRes[0].db}`);
    console.log(`         Server Time:    ${pingRes[0].ts}\n`);

    // 2. Table Existence & Integrity Check
    const requiredTables = [
      '_migrations', 'users', 'brands', 'devices',
      'gateways', 'invoices', 'stored_data',
      'webhook_logs', 'staff_permissions', 'affiliate_referrals'
    ];
    const [tableRows] = await conn.query(
      `SELECT TABLE_NAME FROM information_schema.tables WHERE TABLE_SCHEMA = ?`,
      [config.database]
    );
    const existingTables = tableRows.map(r => r.TABLE_NAME || r.table_name);
    console.log(`  [INFO] Found ${existingTables.length} tables in schema '${config.database}':`);
    existingTables.forEach(t => console.log(`         - ${t}`));

    for (const tbl of requiredTables) {
      if (!existingTables.includes(tbl)) {
        throw new Error(`Required table '${tbl}' is missing from live database.`);
      }
    }
    console.log(`  [PASS] 2. All 10 required relational tables verified present.\n`);

    // 3. Gateway Count Check (Requirement >= 52)
    const [gwRows] = await conn.query('SELECT count(*) as count FROM gateways');
    const totalGateways = gwRows[0].count;
    console.log(`  [INFO] Gateways in database: ${totalGateways}`);
    if (totalGateways < 52) {
      throw new Error(`Expected >= 52 gateways, but found ${totalGateways}.`);
    }
    console.log(`  [PASS] 3. Gateway catalog verified (${totalGateways} gateways present, >= 52 requirement satisfied).\n`);

    // 4. Inspect Seed Records
    const [userRows] = await conn.query('SELECT count(*) as count FROM users');
    const [brandRows] = await conn.query('SELECT count(*) as count FROM brands');
    const [deviceRows] = await conn.query('SELECT count(*) as count FROM devices');
    const [invoiceRows] = await conn.query('SELECT count(*) as count FROM invoices');
    const [storedRows] = await conn.query('SELECT count(*) as count FROM stored_data');
    console.log(`  [INFO] Seed Record Counts:`);
    console.log(`         - Users:             ${userRows[0].count}`);
    console.log(`         - Brands:            ${brandRows[0].count}`);
    console.log(`         - Devices:           ${deviceRows[0].count}`);
    console.log(`         - Invoices:          ${invoiceRows[0].count}`);
    console.log(`         - Ingested SMS Data: ${storedRows[0].count}\n`);

    // 5. Atomic Transactional Write & Rollback Test
    console.log('  [TEST] Testing atomic write and rollback capability...');
    await conn.beginTransaction();
    const testId = `test_health_${Date.now()}`;
    await conn.query(
      `INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)`,
      [testId, 'Health Test User', `${testId}@denaneya.local`, 'hash']
    );
    const [verifyInsert] = await conn.query(`SELECT id, email FROM users WHERE id = ?`, [testId]);
    if (verifyInsert.length === 0) throw new Error('Transactional write failed to insert test record');
    console.log(`         Inserted temporary record: ${verifyInsert[0].email}`);
    await conn.rollback();

    const [verifyRollback] = await conn.query(`SELECT id FROM users WHERE id = ?`, [testId]);
    if (verifyRollback.length > 0) throw new Error('Rollback failed to cleanly remove test record');
    console.log('  [PASS] 4. Atomic transactional write and rollback verified.\n');

    // 6. Test Multi-Tenant Stored Data Composite Uniqueness
    console.log('  [TEST] Testing multi-tenant composite uniqueness UNIQUE (brand_id, trx_id)...');
    await conn.beginTransaction();
    const testBrandA = 'b101_deshi_course';
    const testTrxId = `TRX_AUDIT_${Date.now()}`;
    await conn.query(
      `INSERT INTO stored_data (id, brand_id, sender, raw_sms, channel, trx_id, amount, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [`sd_${Date.now()}_1`, testBrandA, 'bKash', 'audit test sms 1', 'bKash', testTrxId, 150.00, 'UNUSED']
    );
    let duplicateCaught = false;
    try {
      await conn.query(
        `INSERT INTO stored_data (id, brand_id, sender, raw_sms, channel, trx_id, amount, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [`sd_${Date.now()}_2`, testBrandA, 'bKash', 'audit test sms 2', 'bKash', testTrxId, 150.00, 'UNUSED']
      );
    } catch (uniqueErr) {
      duplicateCaught = true;
      console.log(`         Caught expected duplicate constraint violation: ${uniqueErr.code || uniqueErr.message}`);
    }
    await conn.rollback();
    if (!duplicateCaught) {
      throw new Error('Composite unique constraint UNIQUE (brand_id, trx_id) failed to reject duplicate!');
    }
    console.log('  [PASS] 5. Composite unique constraint UNIQUE (brand_id, trx_id) enforced on live MySQL.\n');

    console.log('======================================================');
    console.log('✅ LIVE MYSQL DATABASE HEALTH CHECK: ALL SYSTEMS GO (100% OK)');
    console.log('======================================================');
  } finally {
    await conn.end();
  }
}

verifyLiveDatabase().catch((err) => {
  console.error('\n❌ DATABASE HEALTH CHECK FAILED:', err.message);
  process.exit(1);
});
