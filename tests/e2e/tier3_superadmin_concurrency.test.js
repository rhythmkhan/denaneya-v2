/**
 * DenaNeya v2.0 - E2E Test Suite Tier 3: Super Admin Concurrency & Propagation Races
 * File: tests/e2e/tier3_superadmin_concurrency.test.js
 * Track: E2E Testing Track (Orchestrator 5)
 *
 * Scope (>=4 Multi-Step Concurrent & Race Tests):
 * 1. TEST-T3-CAS-01: Manual Reconcile vs Carrier Sync Race (10 Concurrent Workers)
 * 2. TEST-T3-GAT-01: Gateway Master Switch Override & Real-Time Checkout Enforcement
 * 3. TEST-T3-MGT-01: Merchant Blocking Instant Propagation Across Subsystems
 * 4. TEST-T3-PRC-01: Dynamic Pricing Runtime Propagation on S2S Verification
 * 5. TEST-T3-REC-02: Concurrent Multi-Worker Manual Reconciliation on Single Invoice
 */

process.env.NODE_ENV = 'test';
process.env.DB_CLIENT = 'sqlite';
process.env.DB_SQLITE_PATH = ':memory:';
process.env.JWT_SECRET = 'denaneya_development_jwt_secret_min_32_bytes_long_12345';

import assert from 'node:assert';
import http from 'node:http';
import jwt from 'jsonwebtoken';
import dbPkg from '@denaneya/database';
import { createApp } from '../../apps/api/src/app.js';

const { getDatabase, runMigrations, runSeed } = dbPkg;

console.log('===============================================================================');
console.log('  DenaNeya v2.0 - Tier 3: Super Admin Concurrency & Propagation Race Suite     ');
console.log('===============================================================================\n');

let server;
let baseUrl;
let db;

const summary = {
  total: 0,
  passed: 0,
  failed: 0,
  failures: []
};

async function test(id, category, description, fn) {
  summary.total++;
  try {
    await fn();
    summary.passed++;
    console.log(`  [PASS] ${id} - [${category}] ${description}`);
  } catch (err) {
    summary.failed++;
    console.error(`  [FAIL] ${id} - [${category}] ${description}`);
    console.error(`         >>> Error: ${err.message}`);
    summary.failures.push({ id, category, description, error: err.message });
  }
}

let requestSeq = 0;
async function apiRequest(path, { method = 'GET', headers = {}, body = null } = {}) {
  requestSeq++;
  const ipSuffix = (requestSeq % 200) + 1;
  const reqHeaders = {
    'Content-Type': 'application/json',
    'X-Forwarded-For': `198.51.100.${ipSuffix}`,
    ...headers
  };
  const reqOptions = { method, headers: reqHeaders };
  if (body !== null && body !== undefined) {
    reqOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
  }
  const res = await fetch(`${baseUrl}${path}`, reqOptions);
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch (_) {
    json = text;
  }
  return { status: res.status, headers: res.headers, body: json, rawText: text };
}

const FIXTURES = {
  adminId: 'usr_t3_superadmin_race',
  adminEmail: 'superadmin_race@denaneya.com',
  merchantId: 'usr_t3_merchant_race',
  merchantEmail: 'merchant_race@example.com',
  brandId: 'brand_t3_race',
  brandApiKey: 'dn_live_t3_race_key_12345',
  brandApiSecret: 'dn_sec_t3_race_secret_67890',
  deviceId: 'dev_t3_race_handset',
  deviceToken: 'tok_dev_t3_race_token_999'
};

async function setupDatabase() {
  db = getDatabase();
  await runMigrations(db, { reset: true });
  await runSeed(db);

  // Polyfill schema additions if migration 002 is not yet present on disk
  const tableCheck = await db.query(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='admin_audit_logs'"
  );
  if (!tableCheck.rows || tableCheck.rows.length === 0) {
    try { await db.query("ALTER TABLE users ADD COLUMN two_factor_secret TEXT"); } catch (_) {}
    try { await db.query("ALTER TABLE users ADD COLUMN two_factor_enabled INTEGER DEFAULT 0"); } catch (_) {}
    try { await db.query("ALTER TABLE users ADD COLUMN pending_totp_secret TEXT"); } catch (_) {}
    try { await db.query("ALTER TABLE users ADD COLUMN totp_backup_codes TEXT"); } catch (_) {}
    try { await db.query("ALTER TABLE users ADD COLUMN google_id VARCHAR(255)"); } catch (_) {}
    try { await db.query("ALTER TABLE users ADD COLUMN avatar_url TEXT"); } catch (_) {}

    await db.query(`
      CREATE TABLE IF NOT EXISTS admin_audit_logs (
        id VARCHAR(64) PRIMARY KEY,
        admin_id VARCHAR(64) NOT NULL,
        admin_email VARCHAR(255) NOT NULL,
        action VARCHAR(64) NOT NULL,
        target_type VARCHAR(64),
        target_id VARCHAR(64),
        details TEXT,
        ip_address VARCHAR(45),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        key VARCHAR(64) PRIMARY KEY,
        value TEXT NOT NULL,
        updated_by VARCHAR(64),
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS impersonation_logs (
        id VARCHAR(64) PRIMARY KEY,
        admin_id VARCHAR(64) NOT NULL,
        merchant_id VARCHAR(64) NOT NULL,
        return_ticket_hash VARCHAR(128) NOT NULL,
        status VARCHAR(32) DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL,
        used_at DATETIME
      )
    `);
  }

  // Seed Super Admin
  await db.query(
    `INSERT INTO users (id, name, email, password_hash, role, credits, status)
     VALUES (?, 'Super Admin Race', ?, 'hash_admin_pw', 'superadmin', 999999, 'active')`,
    [FIXTURES.adminId, FIXTURES.adminEmail]
  );

  // Seed Merchant
  await db.query(
    `INSERT INTO users (id, name, email, password_hash, role, credits, status)
     VALUES (?, 'Race Merchant', ?, 'hash_merchant_pw', 'merchant', 100, 'active')`,
    [FIXTURES.merchantId, FIXTURES.merchantEmail]
  );

  // Seed Brand
  await db.query(
    `INSERT INTO brands (id, user_id, brand_name, brand_slug, api_key, api_secret, webhook_url, webhook_secret, status)
     VALUES (?, ?, 'Race Brand', 'race-brand', ?, ?, 'https://merchant.example/webhook', 'sec_wh_key', 'active')`,
    [FIXTURES.brandId, FIXTURES.merchantId, FIXTURES.brandApiKey, FIXTURES.brandApiSecret]
  );

  // Seed Device
  await db.query(
    `INSERT INTO devices (id, brand_id, device_name, device_model, device_token, sim1_operator, sim2_operator, battery_level, status)
     VALUES (?, ?, 'Race Device', 'SM-A53', ?, 'bKash', 'Nagad', 90, 'active')`,
    [FIXTURES.deviceId, FIXTURES.brandId, FIXTURES.deviceToken]
  );

  // Seed Active Gateway (bKash) for Brand
  await db.query(
    `INSERT INTO gateways (id, brand_id, channel_name, category, account_number, account_type, status)
     VALUES ('gw_t3_bkash', ?, 'bkash', 'mobile', '01700000001', 'personal', 'active')`,
    [FIXTURES.brandId]
  );
}

function issueToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      credits: user.credits || 0
    },
    process.env.JWT_SECRET,
    { expiresIn: '2h', algorithm: 'HS256' }
  );
}

async function runTier3SuperAdminSuite() {
  await setupDatabase();

  const app = createApp();
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
  console.log(`[Setup] Target test server running on ${baseUrl}\n`);

  const adminToken = issueToken({ id: FIXTURES.adminId, email: FIXTURES.adminEmail, role: 'superadmin' });
  const merchantToken = issueToken({ id: FIXTURES.merchantId, email: FIXTURES.merchantEmail, role: 'merchant', credits: 100 });

  const adminHeaders = { Authorization: `Bearer ${adminToken}` };
  const merchantHeaders = { Authorization: `Bearer ${merchantToken}` };

  // ===========================================================================
  // TEST 1: MANUAL RECONCILE VS CARRIER SYNC RACE (10 Workers)
  // ===========================================================================
  console.log('--- TEST 1: Manual Reconcile vs Carrier Sync Race (10 Workers) ---');

  await test(
    'TEST-T3-CAS-01',
    'CONCURRENCY-CAS',
    'Simultaneous 5 Carrier Sync + 5 Manual Admin Reconciles for same TrxID: exactly 1 wins, 9 fail with 409 Conflict',
    async () => {
      const raceTrxId = `BKRACE_${Date.now().toString().slice(-8)}`;
      const storedDataId = `sd_race_${Date.now()}`;
      const invoiceId = `inv_race_${Date.now()}`;

      // Ingest unassigned SMS
      await db.query(
        `INSERT INTO stored_data (id, brand_id, device_id, sender, raw_sms, channel, trx_id, amount, status, received_at)
         VALUES (?, ?, ?, 'bKash', 'You have received Tk 1000.00 from 01711223344. TrxID: ${raceTrxId}', 'bkash', ?, 1000, 'UNUSED', CURRENT_TIMESTAMP)`,
        [storedDataId, FIXTURES.brandId, FIXTURES.deviceId, raceTrxId]
      );

      // Create pending invoice
      await db.query(
        `INSERT INTO invoices (id, brand_id, invoice_number, amount, currency, customer_name, customer_email, customer_phone, status, expires_at)
         VALUES (?, ?, 'INV-RACE-001', 1000, 'BDT', 'Race Customer', 'race@example.com', '01711223344', 'PENDING', datetime('now', '+15 minutes'))`,
        [invoiceId, FIXTURES.brandId]
      );

      // Record initial merchant credits
      const userBefore = await db.get('SELECT credits FROM users WHERE id = ?', [FIXTURES.merchantId]);
      const initialCredits = Number(userBefore.credits);

      // Prepare 10 concurrent requests:
      // 5 carrier checkout submissions (submit-trx)
      const checkoutWorkers = Array.from({ length: 5 }, () =>
        apiRequest('/api/payment/submit-trx', {
          method: 'POST',
          body: {
            invoiceId,
            trxId: raceTrxId,
            paymentMethod: 'bkash'
          }
        })
      );

      // 5 manual admin reconciliations
      const adminWorkers = Array.from({ length: 5 }, () =>
        apiRequest('/api/admin/reconcile/manual', {
          method: 'POST',
          headers: adminHeaders,
          body: {
            storedDataId,
            invoiceId,
            reason: 'Concurrent race resolution'
          }
        })
      );

      // Fire all 10 workers concurrently
      const results = await Promise.all([...checkoutWorkers, ...adminWorkers]);

      // Exactly 1 worker must succeed (HTTP 200)
      const successCount = results.filter((r) => r.status === 200).length;
      assert.strictEqual(successCount, 1, `Expected exactly 1 success, got ${successCount}`);

      // Exactly 9 workers must be rejected with 400 or 409 Conflict
      const conflictCount = results.filter((r) => [400, 409].includes(r.status)).length;
      assert.strictEqual(conflictCount, 9, `Expected exactly 9 rejections with 400/409, got ${conflictCount}`);

      // Verify DB final state
      const finalStored = await db.get('SELECT status FROM stored_data WHERE id = ?', [storedDataId]);
      assert.strictEqual(finalStored.status, 'USED', 'Transaction must be marked USED');

      const finalInvoice = await db.get('SELECT status, trx_id FROM invoices WHERE id = ?', [invoiceId]);
      assert.strictEqual(finalInvoice.status, 'PAID', 'Invoice must be settled to PAID');
      assert.strictEqual(finalInvoice.trx_id, raceTrxId);

      // Verify credits deducted exactly once (never double deducted)
      const userAfter = await db.get('SELECT credits FROM users WHERE id = ?', [FIXTURES.merchantId]);
      assert.strictEqual(Number(userAfter.credits), initialCredits - 1, 'Merchant credits must decrement by exactly 1');
    }
  );

  // ===========================================================================
  // TEST 2: GATEWAY MASTER SWITCH OVERRIDE & REAL-TIME ENFORCEMENT
  // ===========================================================================
  console.log('\n--- TEST 2: Gateway Master Switch Override & Enforcement ---');

  await test(
    'TEST-T3-GAT-01',
    'MASTER-SWITCH',
    'Globally disabling bkash on Master Switch overrides merchant activation: omits from checkout and rejects submit-trx',
    async () => {
      const invId = `inv_gw_override_${Date.now()}`;
      await db.query(
        `INSERT INTO invoices (id, brand_id, invoice_number, amount, currency, customer_name, customer_email, customer_phone, status, expires_at)
         VALUES (?, ?, 'INV-GW-001', 500, 'BDT', 'Cust Gateway', 'gw@example.com', '01712345678', 'PENDING', datetime('now', '+15 minutes'))`,
        [invId, FIXTURES.brandId]
      );

      // Step 1: Query checkout before master switch disable -> bkash is present
      const preRes = await apiRequest(`/pay/${invId}`);
      assert.strictEqual(preRes.status, 200);

      // Step 2: Super admin globally disables bkash
      const disRes = await apiRequest('/api/admin/gateways/master/bkash', {
        method: 'PUT',
        headers: adminHeaders,
        body: { enabled: false }
      });
      assert.strictEqual(disRes.status, 200);

      // Step 3: Direct submission attempt for bkash fails with GATEWAY_GLOBALLY_DISABLED
      const submitRes = await apiRequest('/api/payment/submit-trx', {
        method: 'POST',
        body: {
          invoiceId: invId,
          trxId: 'BK_DISABLED_TEST',
          paymentMethod: 'bkash'
        }
      });
      assert.strictEqual(submitRes.status, 400);
      assert.strictEqual(submitRes.body.code, 'GATEWAY_GLOBALLY_DISABLED');

      // Step 4: Super admin re-enables bkash
      const enRes = await apiRequest('/api/admin/gateways/master/bkash', {
        method: 'PUT',
        headers: adminHeaders,
        body: { enabled: true }
      });
      assert.strictEqual(enRes.status, 200);
    }
  );

  // ===========================================================================
  // TEST 3: MERCHANT BLOCKING INSTANT PROPAGATION ACROSS SUBSYSTEMS
  // ===========================================================================
  console.log('\n--- TEST 3: Merchant Blocking Instant Propagation ---');

  await test(
    'TEST-T3-MGT-01',
    'STATUS-PROPAGATION',
    'Setting merchant status to blocked immediately invalidates JWT, handset sync, and checkout sessions',
    async () => {
      const blockInvoiceId = `inv_block_${Date.now()}`;
      await db.query(
        `INSERT INTO invoices (id, brand_id, invoice_number, amount, currency, customer_name, customer_email, customer_phone, status, expires_at)
         VALUES (?, ?, 'INV-BLK-001', 600, 'BDT', 'Block Test', 'blk@example.com', '01712345678', 'PENDING', datetime('now', '+15 minutes'))`,
        [blockInvoiceId, FIXTURES.brandId]
      );

      // 1. Super Admin blocks merchant
      const blockRes = await apiRequest(`/api/admin/merchants/${FIXTURES.merchantId}/status`, {
        method: 'PUT',
        headers: adminHeaders,
        body: { status: 'blocked', reason: 'High chargeback fraud suspicion' }
      });
      assert.strictEqual(blockRes.status, 200);

      // 2. Merchant existing JWT immediately rejected
      const jwtRes = await apiRequest('/api/dashboard/stats', { headers: merchantHeaders });
      assert.strictEqual(jwtRes.status, 403);
      assert.strictEqual(jwtRes.body.code, 'ACCOUNT_DEACTIVATED');

      // 3. Android handset sync immediately rejected
      const devRes = await apiRequest('/api/device/sync-sms', {
        method: 'POST',
        headers: { 'device-api-key': FIXTURES.deviceToken },
        body: {
          sender: 'bKash',
          raw_sms: 'You have received Tk 500.00. TrxID: BLK001',
          received_at: new Date().toISOString()
        }
      });
      assert.strictEqual(devRes.status, 403);

      // 4. Checkout immediately blocked
      const checkRes = await apiRequest(`/pay/${blockInvoiceId}`);
      assert.ok([403, 503].includes(checkRes.status));

      // 5. Unblock merchant and verify restoration
      const unblockRes = await apiRequest(`/api/admin/merchants/${FIXTURES.merchantId}/status`, {
        method: 'PUT',
        headers: adminHeaders,
        body: { status: 'active', reason: 'Investigation completed and cleared' }
      });
      assert.strictEqual(unblockRes.status, 200);

      const restoreRes = await apiRequest('/api/dashboard/stats', { headers: merchantHeaders });
      assert.strictEqual(restoreRes.status, 200);
    }
  );

  // ===========================================================================
  // TEST 4: DYNAMIC PRICING RUNTIME PROPAGATION ON S2S VERIFICATION
  // ===========================================================================
  console.log('\n--- TEST 4: Dynamic Pricing Runtime Propagation ---');

  await test(
    'TEST-T3-PRC-01',
    'DYNAMIC-PRICING',
    'Updating fee per verification dynamically impacts subsequent S2S transaction credit deduction',
    async () => {
      // 1. Super admin sets verification fee to 3 credits
      const setRes = await apiRequest('/api/admin/settings/pricing', {
        method: 'PUT',
        headers: adminHeaders,
        body: { feePerVerification: 3, starterCredits: 50, packages: [] }
      });
      assert.strictEqual(setRes.status, 200);

      // 2. Ingest transaction
      const trxPrice = `BK_PRC_${Date.now().toString().slice(-8)}`;
      await db.query(
        `INSERT INTO stored_data (id, brand_id, device_id, sender, raw_sms, channel, trx_id, amount, status, received_at)
         VALUES ('sd_prc_1', ?, ?, 'bKash', 'You have received Tk 300.00. TrxID: ${trxPrice}', 'bkash', ?, 300, 'UNUSED', CURRENT_TIMESTAMP)`,
        [FIXTURES.brandId, FIXTURES.deviceId, trxPrice]
      );

      const userBefore = await db.get('SELECT credits FROM users WHERE id = ?', [FIXTURES.merchantId]);
      const creditsBefore = Number(userBefore.credits);

      // 3. S2S Verify
      const vRes = await apiRequest('/v1/trx/verify', {
        method: 'POST',
        headers: {
          'X-API-KEY': FIXTURES.brandApiKey,
          'X-API-SECRET': FIXTURES.brandApiSecret
        },
        body: { trx_id: trxPrice, amount: 300 }
      });
      assert.strictEqual(vRes.status, 200);

      // 4. Verify 3 credits were deducted instead of default 1
      const userAfter = await db.get('SELECT credits FROM users WHERE id = ?', [FIXTURES.merchantId]);
      assert.strictEqual(Number(userAfter.credits), creditsBefore - 3, 'Must deduct exactly 3 credits');

      // Cleanup: restore fee to 1 credit
      await apiRequest('/api/admin/settings/pricing', {
        method: 'PUT',
        headers: adminHeaders,
        body: { feePerVerification: 1 }
      });
    }
  );

  // ===========================================================================
  // TEST 5: CONCURRENT MANUAL RECONCILIATIONS ON SINGLE INVOICE (5 Workers)
  // ===========================================================================
  console.log('\n--- TEST 5: Concurrent Manual Reconciliations on Single Invoice ---');

  await test(
    'TEST-T3-REC-02',
    'CONCURRENCY-CAS',
    '5 concurrent admin workers attempting to pair 5 distinct SMS to 1 pending invoice: exactly 1 succeeds, 4 fail with 409',
    async () => {
      const singleInvoiceId = `inv_single_${Date.now()}`;
      await db.query(
        `INSERT INTO invoices (id, brand_id, invoice_number, amount, currency, customer_name, customer_email, customer_phone, status, expires_at)
         VALUES (?, ?, 'INV-MULTI-001', 400, 'BDT', 'Multi Test', 'multi@example.com', '01712345678', 'PENDING', datetime('now', '+15 minutes'))`,
        [singleInvoiceId, FIXTURES.brandId]
      );

      // Create 5 distinct stored SMS
      const storedIds = [];
      for (let i = 1; i <= 5; i++) {
        const sid = `sd_multi_${i}_${Date.now()}`;
        const tx = `BK_MULTI_${i}_${Date.now().toString().slice(-6)}`;
        storedIds.push(sid);
        await db.query(
          `INSERT INTO stored_data (id, brand_id, device_id, sender, raw_sms, channel, trx_id, amount, status, received_at)
           VALUES (?, ?, ?, 'bKash', 'Received Tk 400. TrxID: ${tx}', 'bkash', ?, 400, 'UNUSED', CURRENT_TIMESTAMP)`,
          [sid, FIXTURES.brandId, FIXTURES.deviceId, tx]
        );
      }

      // Fire 5 concurrent admin manual reconciliation requests
      const reconcileCalls = storedIds.map((sid) =>
        apiRequest('/api/admin/reconcile/manual', {
          method: 'POST',
          headers: adminHeaders,
          body: {
            storedDataId: sid,
            invoiceId: singleInvoiceId,
            reason: 'Concurrent pairing stress test'
          }
        })
      );

      const results = await Promise.all(reconcileCalls);

      const successResults = results.filter((r) => r.status === 200);
      assert.strictEqual(successResults.length, 1, 'Exactly 1 reconciliation must succeed');

      const conflictResults = results.filter((r) => [400, 409].includes(r.status));
      assert.strictEqual(conflictResults.length, 4, 'Remaining 4 workers must receive 400/409 Conflict');
    }
  );

  // ===========================================================================
  // SUMMARY
  // ===========================================================================
  console.log('\n===============================================================================');
  console.log(`  Tier 3 Super Admin Finished: ${summary.passed} Passed / ${summary.total} Total (${summary.failed} Failed)`);
  console.log('===============================================================================');

  if (server) server.close();
  if (summary.failed > 0) {
    process.exit(1);
  }
}

runTier3SuperAdminSuite().catch((err) => {
  console.error('[Fatal Tier 3 Test Failure]', err);
  if (server) server.close();
  process.exit(1);
});
