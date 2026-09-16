/**
 * DenaNeya v2.0 - Milestone 1 Challenger 2 Empirical Test Suite
 * 
 * Target: Hostinger Live MySQL/MariaDB (srv1497.hstgr.io:3306)
 * Database: u298980084_denaneya
 * 
 * Verifications & Stress Challenges:
 * 1. Live Table Columns & Data Types across all 9 relational tables + _migrations
 * 2. CHECK constraints enforcement: credits >= 0, battery_level 0..100, amount > 0
 * 3. Gateway Catalog count (>= 52), category distribution, and JSON validity
 * 4. Transactional Rollback & Atomicity under forced failure conditions
 * 5. Foreign Key referential integrity and ON DELETE CASCADE
 */

'use strict';

const path = require('path');
const fs = require('fs');

// Resolve database dependencies
let mysql;
try {
  mysql = require('mysql2/promise');
} catch (e) {
  mysql = require(path.resolve(__dirname, '../../packages/database/node_modules/mysql2/promise'));
}

let dotenv;
try {
  dotenv = require('dotenv');
} catch (e) {
  dotenv = require(path.resolve(__dirname, '../../packages/database/node_modules/dotenv'));
}

// Load production environment
const rootEnv = path.resolve(__dirname, '../../.env');
if (fs.existsSync(rootEnv)) {
  dotenv.config({ path: rootEnv });
}
dotenv.config({ path: path.resolve(__dirname, '../../packages/database/.env') });

const config = {
  host: process.env.DB_HOST || 'srv1497.hstgr.io',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'u298980084_denaneya',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE || 'u298980084_denaneya',
  connectTimeout: 20000,
  decimalNumbers: true
};

const results = {
  total: 0,
  passed: 0,
  failed: 0,
  details: []
};

function record(name, status, message = '', meta = null) {
  results.total++;
  if (status) {
    results.passed++;
    console.log(`  [PASS] ${name}${message ? ': ' + message : ''}`);
  } else {
    results.failed++;
    console.error(`  [FAIL] ${name}${message ? ': ' + message : ''}`);
  }
  results.details.push({ name, passed: status, message, meta });
}

async function runEmpiricalChallenge() {
  console.log('================================================================');
  console.log('  CHALLENGER 2: EMPIRICAL DDL & TRANSACTIONAL STRESS HARNESS');
  console.log(`  Target: ${config.host}:${config.port} / ${config.database}`);
  console.log('================================================================\n');

  const conn = await mysql.createConnection(config);

  try {
    // -------------------------------------------------------------------------
    // SUITE 1: Table & Column Structural Inspection
    // -------------------------------------------------------------------------
    console.log('--- SUITE 1: TABLE COLUMNS & DATA TYPE VALIDATION ---');
    
    const requiredTables = [
      '_migrations', 'users', 'brands', 'devices', 'gateways',
      'invoices', 'stored_data', 'webhook_logs', 'staff_permissions', 'affiliate_referrals'
    ];

    const [tablesInDb] = await conn.query(
      `SELECT TABLE_NAME FROM information_schema.tables WHERE TABLE_SCHEMA = ?`,
      [config.database]
    );
    const existingTableNames = tablesInDb.map(r => r.TABLE_NAME || r.table_name);

    for (const tbl of requiredTables) {
      const exists = existingTableNames.includes(tbl);
      record(`Table Existence: ${tbl}`, exists, exists ? 'Found in schema' : 'MISSING FROM SCHEMA');
    }

    // Inspect columns for core tables
    const expectedColumns = {
      users: ['id', 'name', 'email', 'password_hash', 'role', 'credits', 'status', 'created_at', 'updated_at'],
      brands: ['id', 'user_id', 'brand_name', 'brand_slug', 'api_key', 'api_secret', 'webhook_url', 'webhook_secret', 'status', 'created_at', 'updated_at'],
      devices: ['id', 'brand_id', 'device_name', 'device_model', 'device_token', 'sim1_operator', 'sim2_operator', 'battery_level', 'last_sync_at', 'status', 'created_at'],
      gateways: ['id', 'brand_id', 'channel_name', 'category', 'account_type', 'account_number', 'routing_number', 'branch_name', 'district', 'ussd_code', 'fee_percentage', 'fee_fixed', 'exchange_rate', 'fields_json', 'status', 'created_at'],
      invoices: ['id', 'brand_id', 'invoice_number', 'customer_name', 'customer_email', 'customer_phone', 'amount', 'currency', 'status', 'payment_method', 'trx_id', 'redirect_url', 'metadata_json', 'expires_at', 'created_at', 'updated_at'],
      stored_data: ['id', 'brand_id', 'device_id', 'sender', 'raw_sms', 'channel', 'trx_id', 'amount', 'status', 'sim_slot', 'received_at', 'used_at', 'created_at'],
      webhook_logs: ['id', 'brand_id', 'invoice_id', 'event', 'payload_json', 'response_status', 'response_body', 'status', 'attempts', 'created_at'],
      staff_permissions: ['id', 'user_id', 'brand_id', 'module', 'can_create', 'can_read', 'can_update', 'can_delete', 'created_at'],
      affiliate_referrals: ['id', 'referrer_user_id', 'referred_user_id', 'commission_rate', 'total_earned', 'status', 'created_at']
    };

    for (const [tbl, cols] of Object.entries(expectedColumns)) {
      const [colRows] = await conn.query(
        `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT 
         FROM information_schema.columns 
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
        [config.database, tbl]
      );
      const actualCols = colRows.map(c => c.COLUMN_NAME || c.column_name);
      const missing = cols.filter(c => !actualCols.includes(c));
      record(
        `Columns Definition: ${tbl}`,
        missing.length === 0,
        missing.length === 0 ? `All ${cols.length} expected columns verified` : `Missing columns: ${missing.join(', ')}`
      );
    }
    console.log('');

    // -------------------------------------------------------------------------
    // SUITE 2: CHECK Constraints Empirical Enforcement
    // -------------------------------------------------------------------------
    console.log('--- SUITE 2: CHECK CONSTRAINTS STRESS-TESTING ---');

    // Test 2.1: users.credits >= 0
    const testUserId = `chk_u_${Date.now()}`;
    let creditNegBlocked = false;
    try {
      await conn.query(
        `INSERT INTO users (id, name, email, password_hash, credits) VALUES (?, ?, ?, ?, ?)`,
        [testUserId, 'Negative Credit Test', `${testUserId}@denaneya.test`, 'hash', -1]
      );
    } catch (e) {
      creditNegBlocked = true;
      console.log(`    [Empirical] Caught rejected negative credit (-1): ${e.code || e.message}`);
    }
    record('CHECK Constraint users.credits >= 0 (Reject -1)', creditNegBlocked, creditNegBlocked ? 'Violation successfully rejected' : 'FAILED: Negative credits inserted!');
    if (!creditNegBlocked) {
      await conn.query(`DELETE FROM users WHERE id = ?`, [testUserId]).catch(() => {});
    }

    let creditSevereBlocked = false;
    try {
      await conn.query(
        `INSERT INTO users (id, name, email, password_hash, credits) VALUES (?, ?, ?, ?, ?)`,
        [`${testUserId}_2`, 'Severe Negative Credit', `${testUserId}_2@denaneya.test`, 'hash', -999999]
      );
    } catch (e) {
      creditSevereBlocked = true;
      console.log(`    [Empirical] Caught rejected severe negative credit (-999999): ${e.code || e.message}`);
    }
    record('CHECK Constraint users.credits >= 0 (Reject -999999)', creditSevereBlocked, creditSevereBlocked ? 'Violation successfully rejected' : 'FAILED: Severe negative credit inserted!');
    if (!creditSevereBlocked) {
      await conn.query(`DELETE FROM users WHERE id = ?`, [`${testUserId}_2`]).catch(() => {});
    }

    // Positive and Zero credit tests
    let creditZeroAllowed = false;
    try {
      await conn.query(
        `INSERT INTO users (id, name, email, password_hash, credits) VALUES (?, ?, ?, ?, ?)`,
        [`${testUserId}_zero`, 'Zero Credit', `${testUserId}_zero@denaneya.test`, 'hash', 0]
      );
      creditZeroAllowed = true;
      await conn.query(`DELETE FROM users WHERE id = ?`, [`${testUserId}_zero`]);
    } catch (e) {
      console.log(`    [Empirical Error] Zero credit failed: ${e.message}`);
    }
    record('CHECK Constraint users.credits >= 0 (Allow 0)', creditZeroAllowed, creditZeroAllowed ? 'Valid boundary 0 accepted' : 'FAILED: Zero credits was blocked');

    // Test 2.2: devices.battery_level BETWEEN 0 AND 100
    // Setup temporary user and brand for device testing
    const fixtureUid = `fx_u_${Date.now()}`;
    const fixtureBid = `fx_b_${Date.now()}`;
    await conn.query(
      `INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)`,
      [fixtureUid, 'Fixture User', `${fixtureUid}@denaneya.test`, 'hash']
    );
    await conn.query(
      `INSERT INTO brands (id, user_id, brand_name, brand_slug, api_key, api_secret, webhook_secret)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [fixtureBid, fixtureUid, 'Fixture Brand', `slug_${Date.now()}`, `key_${Date.now()}`, 'secret', 'whsec']
    );

    let battNegBlocked = false;
    try {
      await conn.query(
        `INSERT INTO devices (id, brand_id, device_name, device_token, battery_level) VALUES (?, ?, ?, ?, ?)`,
        [`dev_neg_${Date.now()}`, fixtureBid, 'Neg Device', `tok_neg_${Date.now()}`, -1]
      );
    } catch (e) {
      battNegBlocked = true;
      console.log(`    [Empirical] Caught rejected battery (-1): ${e.code || e.message}`);
    }
    record('CHECK Constraint devices.battery_level BETWEEN 0 AND 100 (Reject -1)', battNegBlocked, battNegBlocked ? 'Violation successfully rejected' : 'FAILED: Negative battery inserted!');

    let battOverBlocked = false;
    try {
      await conn.query(
        `INSERT INTO devices (id, brand_id, device_name, device_token, battery_level) VALUES (?, ?, ?, ?, ?)`,
        [`dev_over_${Date.now()}`, fixtureBid, 'Over Device', `tok_over_${Date.now()}`, 101]
      );
    } catch (e) {
      battOverBlocked = true;
      console.log(`    [Empirical] Caught rejected battery (101): ${e.code || e.message}`);
    }
    record('CHECK Constraint devices.battery_level BETWEEN 0 AND 100 (Reject 101)', battOverBlocked, battOverBlocked ? 'Violation successfully rejected' : 'FAILED: Over 100 battery inserted!');

    let battExtremeOverBlocked = false;
    try {
      await conn.query(
        `INSERT INTO devices (id, brand_id, device_name, device_token, battery_level) VALUES (?, ?, ?, ?, ?)`,
        [`dev_ext_${Date.now()}`, fixtureBid, 'Extreme Device', `tok_ext_${Date.now()}`, 999]
      );
    } catch (e) {
      battExtremeOverBlocked = true;
      console.log(`    [Empirical] Caught rejected battery (999): ${e.code || e.message}`);
    }
    record('CHECK Constraint devices.battery_level BETWEEN 0 AND 100 (Reject 999)', battExtremeOverBlocked, battExtremeOverBlocked ? 'Violation successfully rejected' : 'FAILED: Extreme battery inserted!');

    let battBoundsAllowed = false;
    try {
      const d0 = `dev_b0_${Date.now()}`;
      const d100 = `dev_b100_${Date.now()}`;
      await conn.query(
        `INSERT INTO devices (id, brand_id, device_name, device_token, battery_level) VALUES (?, ?, ?, ?, ?)`,
        [d0, fixtureBid, 'Boundary 0 Device', `tok_b0_${Date.now()}`, 0]
      );
      await conn.query(
        `INSERT INTO devices (id, brand_id, device_name, device_token, battery_level) VALUES (?, ?, ?, ?, ?)`,
        [d100, fixtureBid, 'Boundary 100 Device', `tok_b100_${Date.now()}`, 100]
      );
      battBoundsAllowed = true;
      await conn.query(`DELETE FROM devices WHERE id IN (?, ?)`, [d0, d100]);
    } catch (e) {
      console.log(`    [Empirical Error] Battery bounds failed: ${e.message}`);
    }
    record('CHECK Constraint devices.battery_level (Accept boundaries 0 and 100)', battBoundsAllowed, battBoundsAllowed ? 'Boundaries 0 and 100 accepted' : 'FAILED: Boundary battery rejected');

    // Test 2.3: invoices.amount > 0
    let invZeroBlocked = false;
    try {
      await conn.query(
        `INSERT INTO invoices (id, brand_id, invoice_number, customer_name, amount, expires_at)
         VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE))`,
        [`inv_z_${Date.now()}`, fixtureBid, `INV_Z_${Date.now()}`, 'Zero Tester', 0.00]
      );
    } catch (e) {
      invZeroBlocked = true;
      console.log(`    [Empirical] Caught rejected zero amount invoice (0.00): ${e.code || e.message}`);
    }
    record('CHECK Constraint invoices.amount > 0 (Reject 0.00)', invZeroBlocked, invZeroBlocked ? 'Zero amount rejected' : 'FAILED: Zero amount invoice inserted!');

    let invNegBlocked = false;
    try {
      await conn.query(
        `INSERT INTO invoices (id, brand_id, invoice_number, customer_name, amount, expires_at)
         VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE))`,
        [`inv_neg_${Date.now()}`, fixtureBid, `INV_NEG_${Date.now()}`, 'Neg Tester', -50.00]
      );
    } catch (e) {
      invNegBlocked = true;
      console.log(`    [Empirical] Caught rejected negative invoice amount (-50.00): ${e.code || e.message}`);
    }
    record('CHECK Constraint invoices.amount > 0 (Reject -50.00)', invNegBlocked, invNegBlocked ? 'Negative amount rejected' : 'FAILED: Negative invoice inserted!');

    // Cleanup fixtures
    await conn.query(`DELETE FROM users WHERE id = ?`, [fixtureUid]);
    console.log('');

    // -------------------------------------------------------------------------
    // SUITE 3: Gateway Catalog Depth & Categorization
    // -------------------------------------------------------------------------
    console.log('--- SUITE 3: GATEWAY CATALOG DEPTH & DISTRIBUTION ---');

    const [allGateways] = await conn.query(
      `SELECT id, brand_id, channel_name, category, account_type, fee_percentage, fee_fixed, exchange_rate, fields_json, status 
       FROM gateways`
    );
    const gwCount = allGateways.length;
    record('Gateway Catalog Count (>= 52)', gwCount >= 52, `Found ${gwCount} gateways in database (Requirement: >= 52)`);

    const categories = allGateways.reduce((acc, g) => {
      acc[g.category] = (acc[g.category] || 0) + 1;
      return acc;
    }, {});
    console.log(`    Category Distribution:`, categories);

    const hasMobile = (categories['Mobile'] || 0) >= 4;
    const hasBank = (categories['Bank'] || 0) >= 1;
    const hasInternational = (categories['International'] || 0) >= 1;

    record('Gateway Distribution: Mobile channels present (>= 4)', hasMobile, `Found ${categories['Mobile'] || 0} Mobile channels`);
    record('Gateway Distribution: Bank channels present (>= 1)', hasBank, `Found ${categories['Bank'] || 0} Bank channels`);
    record('Gateway Distribution: International channels present (>= 1)', hasInternational, `Found ${categories['International'] || 0} International channels`);

    // Verify key Bangladesh channels exist
    const channelNames = allGateways.map(g => g.channel_name.toLowerCase());
    const expectedChannels = ['bkash', 'nagad', 'rocket', 'city bank'];
    for (const ch of expectedChannels) {
      const found = channelNames.some(cn => cn.includes(ch));
      record(`Essential Gateway Present: ${ch}`, found, found ? 'Channel available' : 'MISSING from gateways');
    }

    // Verify fields_json validity
    let jsonValidCount = 0;
    let jsonInvalidCount = 0;
    for (const g of allGateways) {
      if (g.fields_json) {
        try {
          if (typeof g.fields_json === 'string') JSON.parse(g.fields_json);
          jsonValidCount++;
        } catch (_) {
          jsonInvalidCount++;
        }
      }
    }
    record('Gateway fields_json validity', jsonInvalidCount === 0, `Validated ${jsonValidCount} JSON fields with 0 syntax errors`);
    console.log('');

    // -------------------------------------------------------------------------
    // SUITE 4: Transactional Rollback & Atomicity Under Forced Failure
    // -------------------------------------------------------------------------
    console.log('--- SUITE 4: TRANSACTIONAL ROLLBACK & ATOMICITY UNDER FAILURE ---');

    // Scenario 4.1: Standard multi-table rollback
    console.log('  [TEST] Testing standard transaction rollback...');
    await conn.beginTransaction();
    const txUid1 = `tx_u1_${Date.now()}`;
    const txBid1 = `tx_b1_${Date.now()}`;
    await conn.query(
      `INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)`,
      [txUid1, 'Tx User 1', `${txUid1}@denaneya.test`, 'hash']
    );
    await conn.query(
      `INSERT INTO brands (id, user_id, brand_name, brand_slug, api_key, api_secret, webhook_secret)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [txBid1, txUid1, 'Tx Brand 1', `slug_${txBid1}`, `key_${txBid1}`, 'secret', 'whsec']
    );
    await conn.rollback();

    const [verifyU1] = await conn.query(`SELECT id FROM users WHERE id = ?`, [txUid1]);
    const [verifyB1] = await conn.query(`SELECT id FROM brands WHERE id = ?`, [txBid1]);
    const cleanRollback1 = verifyU1.length === 0 && verifyB1.length === 0;
    record('Transaction Rollback: Clean multi-table rollback', cleanRollback1, cleanRollback1 ? 'Both user and brand cleanly rolled back' : 'FAILED: Ghost records remained');

    // Scenario 4.2: Forced Error in Multi-Stage Pipeline (Partial write with subsequent check failure)
    console.log('  [TEST] Testing forced error halfway through multi-stage transaction...');
    await conn.beginTransaction();
    const txUid2 = `tx_u2_${Date.now()}`;
    const txBid2 = `tx_b2_${Date.now()}`;
    let tx2Caught = false;
    try {
      // Step 1: Valid user write
      await conn.query(
        `INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)`,
        [txUid2, 'Tx User 2', `${txUid2}@denaneya.test`, 'hash']
      );

      // Step 2: Valid brand write
      await conn.query(
        `INSERT INTO brands (id, user_id, brand_name, brand_slug, api_key, api_secret, webhook_secret)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [txBid2, txUid2, 'Tx Brand 2', `slug_${txBid2}`, `key_${txBid2}`, 'secret', 'whsec']
      );

      // Step 3: Forced check constraint failure (Negative credits on users)
      await conn.query(
        `UPDATE users SET credits = -999 WHERE id = ?`,
        [txUid2]
      );

      await conn.commit();
    } catch (err) {
      tx2Caught = true;
      console.log(`    [Empirical] Caught forced failure: ${err.code || err.message}. Executing ROLLBACK...`);
      await conn.rollback();
    }

    const [verifyU2] = await conn.query(`SELECT id FROM users WHERE id = ?`, [txUid2]);
    const [verifyB2] = await conn.query(`SELECT id FROM brands WHERE id = ?`, [txBid2]);
    const cleanRollback2 = tx2Caught && verifyU2.length === 0 && verifyB2.length === 0;
    record('Transaction Atomicity: Forced failure rolls back prior stage writes', cleanRollback2, cleanRollback2 ? 'Prior writes cleanly discarded upon failure' : 'FAILED: Partial write persisted!');

    // Scenario 4.3: Duplicate Key Collision Rollback in Stored Data
    console.log('  [TEST] Testing duplicate composite key collision rollback in stored_data...');
    await conn.beginTransaction();
    const txUid3 = `tx_u3_${Date.now()}`;
    const txBid3 = `tx_b3_${Date.now()}`;
    const dupTrx = `TRX_COLLISION_${Date.now()}`;
    let tx3Caught = false;
    try {
      await conn.query(
        `INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)`,
        [txUid3, 'Tx User 3', `${txUid3}@denaneya.test`, 'hash']
      );
      await conn.query(
        `INSERT INTO brands (id, user_id, brand_name, brand_slug, api_key, api_secret, webhook_secret)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [txBid3, txUid3, 'Tx Brand 3', `slug_${txBid3}`, `key_${txBid3}`, 'secret', 'whsec']
      );
      // First insert into stored_data
      await conn.query(
        `INSERT INTO stored_data (id, brand_id, sender, raw_sms, channel, trx_id, amount, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [`sd_a_${Date.now()}`, txBid3, 'bKash', 'sms a', 'bKash', dupTrx, 500.00, 'UNUSED']
      );
      // Duplicate insert with identical (brand_id, trx_id)
      await conn.query(
        `INSERT INTO stored_data (id, brand_id, sender, raw_sms, channel, trx_id, amount, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [`sd_b_${Date.now()}`, txBid3, 'bKash', 'sms b', 'bKash', dupTrx, 500.00, 'UNUSED']
      );
      await conn.commit();
    } catch (err) {
      tx3Caught = true;
      console.log(`    [Empirical] Caught duplicate key collision: ${err.code || err.message}. Executing ROLLBACK...`);
      await conn.rollback();
    }

    const [verifyU3] = await conn.query(`SELECT id FROM users WHERE id = ?`, [txUid3]);
    const [verifySD3] = await conn.query(`SELECT id FROM stored_data WHERE trx_id = ?`, [dupTrx]);
    const cleanRollback3 = tx3Caught && verifyU3.length === 0 && verifySD3.length === 0;
    record('Transaction Atomicity: Duplicate key collision in stored_data cleanly rolls back', cleanRollback3, cleanRollback3 ? 'All records from failed transaction completely reverted' : 'FAILED: State leaked after duplicate collision');
    console.log('');

    // -------------------------------------------------------------------------
    // SUITE 5: Foreign Key Referential Integrity & Cascade Deletions
    // -------------------------------------------------------------------------
    console.log('--- SUITE 5: FOREIGN KEY REFERENTIAL INTEGRITY & CASCADES ---');

    // Test 5.1: Block orphaned brand insert
    let orphanBrandBlocked = false;
    try {
      await conn.query(
        `INSERT INTO brands (id, user_id, brand_name, brand_slug, api_key, api_secret, webhook_secret)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [`b_orphan_${Date.now()}`, 'non_existent_user_id_9999', 'Orphan Brand', `slug_${Date.now()}`, `key_${Date.now()}`, 's', 'w']
      );
    } catch (e) {
      orphanBrandBlocked = true;
      console.log(`    [Empirical] Blocked orphaned brand insert: ${e.code || e.message}`);
    }
    record('FK Constraint brands -> users (Block orphaned brand)', orphanBrandBlocked, orphanBrandBlocked ? 'Orphan insert blocked by foreign key' : 'FAILED: Orphaned brand allowed!');

    // Test 5.2: Cascade Delete Verification
    const cascadeUid = `cas_u_${Date.now()}`;
    const cascadeBid = `cas_b_${Date.now()}`;
    const cascadeDid = `cas_d_${Date.now()}`;
    const cascadeIid = `cas_i_${Date.now()}`;

    // Setup hierarchy: User -> Brand -> (Device, Invoice)
    await conn.query(
      `INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)`,
      [cascadeUid, 'Cascade User', `${cascadeUid}@denaneya.test`, 'hash']
    );
    await conn.query(
      `INSERT INTO brands (id, user_id, brand_name, brand_slug, api_key, api_secret, webhook_secret)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [cascadeBid, cascadeUid, 'Cascade Brand', `slug_${cascadeBid}`, `key_${cascadeBid}`, 'sec', 'whsec']
    );
    await conn.query(
      `INSERT INTO devices (id, brand_id, device_name, device_token) VALUES (?, ?, ?, ?)`,
      [cascadeDid, cascadeBid, 'Cascade Device', `tok_${cascadeDid}`]
    );
    await conn.query(
      `INSERT INTO invoices (id, brand_id, invoice_number, customer_name, amount, expires_at)
       VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE))`,
      [cascadeIid, cascadeBid, `INV_CAS_${Date.now()}`, 'Cascade Customer', 350.00]
    );

    // Delete root User
    await conn.query(`DELETE FROM users WHERE id = ?`, [cascadeUid]);

    // Check if Brand, Device, and Invoice were cascaded
    const [casB] = await conn.query(`SELECT id FROM brands WHERE id = ?`, [cascadeBid]);
    const [casD] = await conn.query(`SELECT id FROM devices WHERE id = ?`, [cascadeDid]);
    const [casI] = await conn.query(`SELECT id FROM invoices WHERE id = ?`, [cascadeIid]);

    const cascadeSuccess = casB.length === 0 && casD.length === 0 && casI.length === 0;
    record('ON DELETE CASCADE: Deleting root User cascades to Brand, Device, and Invoices', cascadeSuccess, cascadeSuccess ? 'All child rows cleanly removed by DB engine' : 'FAILED: Orphaned child rows remained!');
    console.log('');

    // -------------------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------------------
    console.log('================================================================');
    console.log(`  EMPIRICAL CHALLENGE RESULTS: ${results.passed}/${results.total} PASSED (${results.failed} FAILED)`);
    console.log(`  VERDICT: ${results.failed === 0 ? 'APPROVE' : 'REQUEST_CHANGES'}`);
    console.log('================================================================');

    return results;

  } finally {
    await conn.end();
  }
}

runEmpiricalChallenge()
  .then((res) => {
    if (res.failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  })
  .catch((err) => {
    console.error('\n❌ UNHANDLED FATAL TEST ERROR:', err);
    process.exit(1);
  });
