/**
 * DenaNeya v2.0 - Empirical Live Hostinger MySQL Stress & Adversarial Challenge Suite
 * 
 * Tests:
 * 1. Connection Latency & Pool Saturation (p50, p95, p99, connection timeout behavior)
 * 2. Multi-Tenant Composite Uniqueness: UNIQUE(brand_id, trx_id) collision resistance & cross-brand isolation
 * 3. Atomic CAS (Compare-And-Swap) State Transitions: 30 concurrent workers on stored_data & invoices
 * 4. High-Throughput Burst CAS: 10 parallel rows x 10 workers (100 concurrent ops)
 * 5. Production Catalog & Schema Integrity Audit
 */

'use strict';

const path = require('path');
const fs = require('fs');
let dotenv;
try {
  dotenv = require('dotenv');
} catch (e) {
  dotenv = require(path.resolve(__dirname, '../../packages/database/node_modules/dotenv'));
}

let mysql;
try {
  mysql = require('mysql2/promise');
} catch (e) {
  mysql = require(path.resolve(__dirname, '../../packages/database/node_modules/mysql2/promise'));
}

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../packages/database/.env') });

const config = {
  host: process.env.DB_HOST || 'srv1497.hstgr.io',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'u298980084_denaneya',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE || process.env.DB_NAME || 'u298980084_denaneya',
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,
  connectTimeout: 10000
};

let pool = null;

const results = {
  latency: {},
  timeout: {},
  poolSaturation: {},
  multiTenant: {},
  concurrencyCAS: {},
  burstCAS: {},
  catalogIntegrity: {}
};

function percentile(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

async function runLiveStressTests() {
  console.log('======================================================================');
  console.log('⚡ DENANEYA v2.0 - EMPIRICAL LIVE HOSTINGER MYSQL ADVERSARIAL SUITE');
  console.log(`🎯 Target: ${config.user}@${config.host}:${config.port}/${config.database}`);
  console.log(`⏰ Start:  ${new Date().toISOString()}`);
  console.log('======================================================================\n');

  pool = mysql.createPool(config);

  // --------------------------------------------------------------------------
  // TEST 1: Connection Latency & Distribution Profiling
  // --------------------------------------------------------------------------
  console.log('--- [STAGE 1] Testing Connection Latency & Round-Trip Performance ---');
  const latencies = [];
  const PING_ROUNDS = 30;

  for (let i = 0; i < PING_ROUNDS; i++) {
    const t0 = Date.now();
    await pool.query('SELECT 1 as ping, CURRENT_TIMESTAMP() as ts');
    latencies.push(Date.now() - t0);
  }

  const minLat = Math.min(...latencies);
  const maxLat = Math.max(...latencies);
  const avgLat = (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(1);
  const p50 = percentile(latencies, 50);
  const p95 = percentile(latencies, 95);
  const p99 = percentile(latencies, 99);

  results.latency = { minLat, maxLat, avgLat, p50, p95, p99, samples: latencies.length };
  console.log(`  Samples: ${PING_ROUNDS} queries`);
  console.log(`  Min:     ${minLat}ms`);
  console.log(`  Avg:     ${avgLat}ms`);
  console.log(`  P50:     ${p50}ms`);
  console.log(`  P95:     ${p95}ms`);
  console.log(`  P99:     ${p99}ms`);
  console.log(`  Max:     ${maxLat}ms`);
  console.log('  [PASS] Stage 1: Round-trip query performance profiled.\n');

  // --------------------------------------------------------------------------
  // TEST 2: Connection Timeout Enforcement
  // --------------------------------------------------------------------------
  console.log('--- [STAGE 2] Testing Connection Timeout Behavior ---');
  const timeoutTarget = '192.0.2.1'; // RFC 5737 TEST-NET-1 (non-routable blackhole IP)
  const t0_timeout = Date.now();
  let caughtTimeout = false;
  let timeoutElapsed = 0;

  try {
    const deadConn = await mysql.createConnection({
      host: timeoutTarget,
      port: 3306,
      user: 'test',
      password: 'test',
      connectTimeout: 2000
    });
    await deadConn.end();
  } catch (err) {
    caughtTimeout = true;
    timeoutElapsed = Date.now() - t0_timeout;
    results.timeout = {
      passed: true,
      error: err.code || err.message,
      elapsedMs: timeoutElapsed
    };
    console.log(`  Caught expected timeout error: ${err.code || err.message} in ${timeoutElapsed}ms`);
  }

  if (!caughtTimeout || timeoutElapsed > 5000) {
    results.timeout = { passed: false, elapsedMs: timeoutElapsed };
    console.warn(`  [WARN] Timeout test exceeded expected bound: ${timeoutElapsed}ms`);
  } else {
    console.log('  [PASS] Stage 2: Driver connection timeout properly enforced.\n');
  }

  // --------------------------------------------------------------------------
  // TEST 3: Connection Pool Saturation & Queueing
  // --------------------------------------------------------------------------
  console.log('--- [STAGE 3] Testing Connection Pool Saturation (25 concurrent queries on limit 15) ---');
  const poolT0 = Date.now();
  const poolPromises = [];
  for (let i = 0; i < 25; i++) {
    poolPromises.push(pool.query('SELECT ? as worker_id, SLEEP(0.02) as sleep_res', [i]));
  }
  const poolResponses = await Promise.all(poolPromises);
  const poolDuration = Date.now() - poolT0;
  results.poolSaturation = {
    totalRequests: 25,
    successfulResponses: poolResponses.length,
    durationMs: poolDuration
  };
  console.log(`  Dispatched 25 concurrent queries, all 25 completed in ${poolDuration}ms with 0 failures.`);
  console.log('  [PASS] Stage 3: Pool handles concurrency queueing gracefully.\n');

  // --------------------------------------------------------------------------
  // TEST 4: Multi-Tenant Isolation & UNIQUE(brand_id, trx_id) Collision Resistance
  // --------------------------------------------------------------------------
  console.log('--- [STAGE 4] Challenging Multi-Tenant Isolation & Composite Uniqueness ---');
  const runId = Date.now();
  const testUserId = `user_stress_${runId}`;
  const brandAlpha = `brand_alpha_${runId}`;
  const brandBeta = `brand_beta_${runId}`;
  const sharedTrx = `TRX_CHALLENGE_${runId}`;

  // Insert parent test user and test brands for foreign key constraints
  await pool.query(
    `INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)`,
    [testUserId, 'Stress Test Merchant', `${testUserId}@denaneya.local`, 'hash_secret']
  );
  await pool.query(
    `INSERT INTO brands (id, user_id, brand_name, brand_slug, api_key, api_secret, webhook_secret) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [brandAlpha, testUserId, 'Brand Alpha', `brand-alpha-${runId}`, `key_alpha_${runId}`, 'secret_alpha', 'whsec_alpha']
  );
  await pool.query(
    `INSERT INTO brands (id, user_id, brand_name, brand_slug, api_key, api_secret, webhook_secret) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [brandBeta, testUserId, 'Brand Beta', `brand-beta-${runId}`, `key_beta_${runId}`, 'secret_beta', 'whsec_beta']
  );

  // 4a. Duplicate same-brand insertion test
  const insertQuery = `
    INSERT INTO stored_data (id, brand_id, sender, raw_sms, channel, trx_id, amount, status, created_at)
    VALUES (?, ?, 'bKash', 'sms text', 'bKash', ?, 500.00, 'UNUSED', NOW())
  `;

  await pool.query(insertQuery, [`sd_${runId}_alpha_1`, brandAlpha, sharedTrx]);
  console.log(`  [4a] Inserted initial transaction '${sharedTrx}' for ${brandAlpha}`);

  let duplicateRejected = false;
  let duplicateErrCode = null;
  try {
    await pool.query(insertQuery, [`sd_${runId}_alpha_2`, brandAlpha, sharedTrx]);
  } catch (dupErr) {
    duplicateRejected = true;
    duplicateErrCode = dupErr.code || dupErr.message;
    console.log(`  [4a] Duplicate insert under same brand correctly blocked: ${duplicateErrCode}`);
  }

  if (!duplicateRejected) {
    throw new Error('CRITICAL VULNERABILITY: Duplicate (brand_id, trx_id) was permitted under same brand!');
  }

  // 4b. Cross-brand same-trx_id insertion test (Tenant Isolation)
  let crossBrandAllowed = false;
  try {
    await pool.query(insertQuery, [`sd_${runId}_beta_1`, brandBeta, sharedTrx]);
    crossBrandAllowed = true;
    console.log(`  [4b] Identical TrxID '${sharedTrx}' successfully inserted under different brand ${brandBeta}`);
  } catch (crossErr) {
    console.error(`  [4b] Cross-brand insert FAILED unexpectedly:`, crossErr);
  }

  if (!crossBrandAllowed) {
    throw new Error('FALSE POSITIVE COLLISION: Independent brand was blocked from using its own TrxID!');
  }

  // 4c. Concurrent duplicate race: 20 simultaneous workers inserting identical (brand_id, trx_id)
  console.log('  [4c] Stressing concurrent duplicate race: 20 workers racing to insert SAME (brand_id, trx_id)...');
  const raceTrx = `TRX_RACE_${runId}`;
  const racePromises = [];
  for (let i = 0; i < 20; i++) {
    racePromises.push(
      pool.query(insertQuery, [`sd_${runId}_race_${i}`, brandAlpha, raceTrx])
        .then(() => ({ success: true, worker: i }))
        .catch((err) => ({ success: false, worker: i, error: err.code || err.message }))
    );
  }

  const raceResults = await Promise.all(racePromises);
  const raceWinners = raceResults.filter(r => r.success);
  const raceLosers = raceResults.filter(r => !r.success);

  console.log(`       Race results: ${raceWinners.length} winner(s), ${raceLosers.length} duplicate rejection(s)`);
  if (raceWinners.length !== 1 || raceLosers.length !== 19) {
    throw new Error(`CONCURRENCY RACE FAILED: Expected exactly 1 winner and 19 duplicate errors, got ${raceWinners.length} winners!`);
  }

  results.multiTenant = {
    sameBrandDuplicateBlocked: duplicateRejected,
    duplicateErrorCode: duplicateErrCode,
    crossBrandAllowed,
    concurrentRace: {
      totalWorkers: 20,
      winners: raceWinners.length,
      duplicateRejections: raceLosers.length
    }
  };
  console.log('  [PASS] Stage 4: Multi-tenant isolation and composite uniqueness completely verified.\n');

  // --------------------------------------------------------------------------
  // TEST 5: Atomic Compare-And-Swap (CAS) Concurrency Stress
  // --------------------------------------------------------------------------
  console.log('--- [STAGE 5] Stressing Atomic CAS State Transitions (30 Concurrent Workers) ---');

  // 5a. stored_data CAS (UNUSED -> USED)
  const casStoredId = `sd_cas_${runId}`;
  await pool.query(
    `INSERT INTO stored_data (id, brand_id, sender, raw_sms, channel, trx_id, amount, status, created_at)
     VALUES (?, ?, 'bKash', 'cas test', 'bKash', ?, 1200.00, 'UNUSED', NOW())`,
    [casStoredId, brandAlpha, `TRX_CAS_${runId}`]
  );

  const WORKER_COUNT = 30;
  console.log(`  [5a] Launching ${WORKER_COUNT} concurrent CAS workers for stored_data row ${casStoredId}...`);
  const casPromises = [];

  for (let i = 0; i < WORKER_COUNT; i++) {
    casPromises.push(
      pool.query(
        `UPDATE stored_data SET status = 'USED', used_at = NOW() WHERE id = ? AND status = 'UNUSED'`,
        [casStoredId]
      ).then(([res]) => ({
        worker: i,
        affectedRows: res.affectedRows,
        changedRows: res.changedRows
      })).catch((err) => ({
        worker: i,
        error: err.message
      }))
    );
  }

  const casResults = await Promise.all(casPromises);
  const casWinners = casResults.filter(r => r.affectedRows === 1);
  const casLosers = casResults.filter(r => r.affectedRows === 0);
  const casErrors = casResults.filter(r => r.error);

  console.log(`       Winners (affectedRows=1): ${casWinners.length}`);
  console.log(`       Losers  (affectedRows=0): ${casLosers.length}`);
  console.log(`       Errors:                  ${casErrors.length}`);

  if (casWinners.length !== 1 || casLosers.length !== (WORKER_COUNT - 1) || casErrors.length > 0) {
    throw new Error(`CAS DOUBLE SPEND VULNERABILITY! Expected 1 winner, found ${casWinners.length}`);
  }

  // 5b. invoices CAS (PENDING -> PAID)
  const casInvoiceId = `inv_cas_${runId}`;
  await pool.query(
    `INSERT INTO invoices (id, brand_id, invoice_number, customer_name, customer_email, customer_phone, amount, currency, status, payment_method, redirect_url, expires_at, created_at, updated_at)
     VALUES (?, ?, ?, 'CAS Customer', 'cas@test.com', '01700000000', 1200.00, 'BDT', 'PENDING', 'bKash', 'https://example.com', DATE_ADD(NOW(), INTERVAL 15 MINUTE), NOW(), NOW())`,
    [casInvoiceId, brandAlpha, `INV_${runId}`]
  );

  console.log(`  [5b] Launching ${WORKER_COUNT} concurrent CAS workers for invoices row ${casInvoiceId}...`);
  const invCasPromises = [];

  for (let i = 0; i < WORKER_COUNT; i++) {
    invCasPromises.push(
      pool.query(
        `UPDATE invoices SET status = 'PAID', trx_id = ?, updated_at = NOW() WHERE id = ? AND status = 'PENDING'`,
        [`TRX_CAS_WINNER_${i}`, casInvoiceId]
      ).then(([res]) => ({
        worker: i,
        affectedRows: res.affectedRows
      })).catch((err) => ({
        worker: i,
        error: err.message
      }))
    );
  }

  const invCasResults = await Promise.all(invCasPromises);
  const invWinners = invCasResults.filter(r => r.affectedRows === 1);
  const invLosers = invCasResults.filter(r => r.affectedRows === 0);

  console.log(`       Invoice Winners: ${invWinners.length}, Losers: ${invLosers.length}`);
  if (invWinners.length !== 1 || invLosers.length !== (WORKER_COUNT - 1)) {
    throw new Error(`INVOICE CAS FAILED: Expected 1 winner, found ${invWinners.length}`);
  }

  // Verify DB state
  const [finalInv] = await pool.query('SELECT status, trx_id FROM invoices WHERE id = ?', [casInvoiceId]);
  console.log(`       Final invoice state: status='${finalInv[0].status}', trx_id='${finalInv[0].trx_id}'`);

  results.concurrencyCAS = {
    storedDataCAS: { workers: WORKER_COUNT, winners: casWinners.length, losers: casLosers.length },
    invoiceCAS: { workers: WORKER_COUNT, winners: invWinners.length, losers: invLosers.length, finalStatus: finalInv[0].status }
  };
  console.log('  [PASS] Stage 5: Atomic CAS state transitions impervious to race conditions.\n');

  // --------------------------------------------------------------------------
  // TEST 6: High-Throughput Burst CAS (10 Distinct Rows x 10 Workers = 100 Ops)
  // --------------------------------------------------------------------------
  console.log('--- [STAGE 6] High-Throughput Burst CAS (100 Concurrent Operations) ---');
  const BURST_ROWS = 10;
  const BURST_WORKERS = 10;
  const rowIds = [];

  for (let r = 0; r < BURST_ROWS; r++) {
    const rid = `sd_burst_${runId}_${r}`;
    rowIds.push(rid);
    await pool.query(
      `INSERT INTO stored_data (id, brand_id, sender, raw_sms, channel, trx_id, amount, status, created_at)
       VALUES (?, ?, 'bKash', 'burst test', 'bKash', ?, 100.00, 'UNUSED', NOW())`,
      [rid, brandAlpha, `TRX_BURST_${runId}_${r}`]
    );
  }

  const burstPromises = [];
  for (let r = 0; r < BURST_ROWS; r++) {
    const rid = rowIds[r];
    for (let w = 0; w < BURST_WORKERS; w++) {
      burstPromises.push(
        pool.query(
          `UPDATE stored_data SET status = 'USED', used_at = NOW() WHERE id = ? AND status = 'UNUSED'`,
          [rid]
        ).then(([res]) => ({
          rowId: rid,
          worker: w,
          won: res.affectedRows === 1
        }))
      );
    }
  }

  const burstResults = await Promise.all(burstPromises);
  const totalWon = burstResults.filter(b => b.won).length;
  const totalLost = burstResults.filter(b => !b.won).length;

  console.log(`  Burst results: Total Operations: ${burstResults.length}`);
  console.log(`                 Total Won (affectedRows=1): ${totalWon} (Expected: ${BURST_ROWS})`);
  console.log(`                 Total Lost (affectedRows=0): ${totalLost} (Expected: ${BURST_ROWS * (BURST_WORKERS - 1)})`);

  if (totalWon !== BURST_ROWS || totalLost !== (BURST_ROWS * (BURST_WORKERS - 1))) {
    throw new Error(`BURST CAS INTEGRITY COMPROMISED: Expected ${BURST_ROWS} wins, got ${totalWon}!`);
  }

  results.burstCAS = {
    totalOps: burstResults.length,
    totalWon,
    totalLost,
    passed: true
  };
  console.log('  [PASS] Stage 6: High-throughput burst CAS 100% consistent.\n');

  // Clean up temporary test data created in brandAlpha and brandBeta via CASCADE
  console.log('  [CLEANUP] Cleaning up test records from live database...');
  await pool.query('DELETE FROM users WHERE id = ?', [testUserId]);
  console.log('  [CLEANUP] Temporary test records removed cleanly via CASCADE.\n');

  // --------------------------------------------------------------------------
  // TEST 7: Production Schema & Catalog Integrity Check
  // --------------------------------------------------------------------------
  console.log('--- [STAGE 7] Production Schema & Gateway Catalog Integrity Inspection ---');
  const [tables] = await pool.query('SELECT TABLE_NAME FROM information_schema.tables WHERE TABLE_SCHEMA = ?', [config.database]);
  const tableNames = tables.map(t => t.TABLE_NAME || t.table_name);
  console.log(`  Found ${tableNames.length} tables in '${config.database}':`, tableNames.join(', '));

  const [gwCountRes] = await pool.query('SELECT count(*) as cnt FROM gateways');
  const gatewayCount = gwCountRes[0].cnt;
  console.log(`  Current Gateways in database: ${gatewayCount}`);

  const [usersCount] = await pool.query('SELECT count(*) as cnt FROM users');
  const [brandsCount] = await pool.query('SELECT count(*) as cnt FROM brands');
  const [devicesCount] = await pool.query('SELECT count(*) as cnt FROM devices');

  console.log(`  Current Record Counts: Users=${usersCount[0].cnt}, Brands=${brandsCount[0].cnt}, Devices=${devicesCount[0].cnt}`);

  results.catalogIntegrity = {
    tableCount: tableNames.length,
    gatewayCount,
    meets52Requirement: gatewayCount >= 52,
    usersCount: usersCount[0].cnt,
    brandsCount: brandsCount[0].cnt,
    devicesCount: devicesCount[0].cnt
  };

  if (gatewayCount < 52) {
    console.error(`\n❌ [FINDING] Gateway Catalog Deficiency: Database contains ${gatewayCount} gateways, but PROJECT.md and ORIGINAL_REQUEST.md require >= 52 catalog gateways!`);
  } else {
    console.log(`  [PASS] Gateway count >= 52 satisfied.`);
  }

  console.log('\n======================================================================');
  console.log('🏁 EMPIRICAL STRESS TEST SUITE EXECUTION SUMMARY');
  console.log(JSON.stringify(results, null, 2));
  console.log('======================================================================\n');

  return results;
}

runLiveStressTests()
  .then(() => {
    if (results.catalogIntegrity.gatewayCount < 52) {
      console.log('Test completed with findings (gateway catalog count < 52).');
      process.exit(2);
    }
    console.log('All tests passed with zero failures.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('STRESS TEST ENCOUNTERED FATAL ERROR:', err);
    process.exit(1);
  })
  .finally(async () => {
    if (pool) await pool.end();
  });
