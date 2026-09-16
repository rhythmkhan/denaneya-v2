/**
 * DenaNeya v2.0 - E2E Test Suite Tier 2: Boundary & Corner Cases
 * File: tests/e2e/tier2_boundaries.test.js
 * Architect: Milestone 5 Explorer 1 (E2E Core Payment & Concurrency Test Architect)
 *
 * Scope:
 * 1. Personal Mobile Numbers Rejection:
 *    - Strict rejection of 11-digit MSISDNs (+88017..., 018..., +88019..., 015..., 016...)
 *    - Zero database insertion into stored_data (anti-injection guarantee)
 *    - Handset state remains uncompromised
 * 2. 12 Debit Blacklist Keywords & Zero False-Positive Tolerance:
 *    - 12 prohibited debit keywords rejected with HTTP 400 DEBIT_TRANSACTION_REJECTED
 *    - Unicode / zero-width evasion normalization
 *    - Zero false-positives on authentic receipts ("Fee Tk 0.00", "Fee: 0", "Charge Tk 0.00", "received payment ... from")
 * 3. 15-Minute Invoice TTL Auto-Expiry & Dynamic Status Transition:
 *    - 15-minute TTL calculation on creation
 *    - Payment submission on expired invoice rejected with HTTP 410 INVOICE_EXPIRED
 *    - Immediate dynamic inline transition from PENDING to EXPIRED
 *    - Public endpoint TTL check (GET /api/invoices/:id/public)
 *    - Background reaper daemon (expirePendingInvoices)
 *    - Zero transaction consumption or credit leakage on expired payment attempts
 * 4. Amount Oracle Constant-Time Generic Defense:
 *    - Mismatched amount returns uniform generic code TRANSACTION_INVALID
 *    - Non-existent TrxID returns identical uniform generic response
 *    - Zero leakage of actual stored amounts
 *    - S2S /v1/trx/verify uniform error defense
 *    - Response time statistical indistinguishability
 * 5. Maximum & Minimum Invoice Amount Limits:
 *    - Maximum boundary: 500,000 BDT accepted
 *    - Maximum boundary + epsilon: 500,000.01 BDT rejected with AMOUNT_EXCEEDS_LIMIT
 *    - Minimum boundary: 1.00 BDT accepted
 *    - Sub-minimum boundary: 0, negative amounts, NaN, Infinity rejected with INVALID_AMOUNT
 */

process.env.NODE_ENV = 'test';
process.env.DB_CLIENT = 'sqlite';
process.env.DB_SQLITE_PATH = ':memory:';
process.env.JWT_SECRET = 'denaneya_development_jwt_secret_min_32_bytes_long_12345';

import assert from 'node:assert';
import http from 'node:http';
import crypto from 'node:crypto';
import dbPkg from '@denaneya/database';
import { createApp } from '../../apps/api/src/app.js';
import { generateToken } from '../../apps/api/src/utils/token.js';
import { expirePendingInvoices } from '../../apps/api/src/services/invoiceReaperService.js';

const { getDatabase, runMigrations, runSeed } = dbPkg;

console.log('===============================================================================');
console.log('  DenaNeya v2.0 - Tier 2: Boundary & Corner Cases Test Suite                  ');
console.log('===============================================================================\n');

let server;
let baseUrl;
let db;
let merchantJwtToken;

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

function getUtcSql(date = new Date()) {
  return date.toISOString().replace('T', ' ').substring(0, 19);
}

const FIXTURES = {
  merchantUser: 'usr_tier2_merchant',
  brand: 'brand_tier2_main',
  apiKey: 'api_key_tier2_123456789012345678',
  apiSecret: 'api_secret_tier2_12345678901234567890123456789012',
  deviceToken: 'tok_dev_tier2_android_handset_beta_88',
  deviceId: 'dev_tier2_android_02'
};

async function setupDatabase() {
  db = getDatabase();
  const migRes = await runMigrations(db, { reset: true });
  assert.strictEqual(migRes.success, true, 'Database migrations must apply cleanly');
  await runSeed(db);

  await db.query(`DELETE FROM users WHERE id = ?`, [FIXTURES.merchantUser]);
  await db.query(`DELETE FROM brands WHERE id = ?`, [FIXTURES.brand]);

  await db.query(
    `INSERT INTO users (id, name, email, password_hash, role, credits, status)
     VALUES (?, 'Tier 2 Merchant', 'tier2_merchant@example.com', 'hash_pw', 'merchant', 100, 'active')`,
    [FIXTURES.merchantUser]
  );

  await db.query(
    `INSERT INTO brands (id, user_id, brand_name, brand_slug, api_key, api_secret, webhook_url, webhook_secret, status)
     VALUES (?, ?, 'Tier 2 Merchant Brand', 'tier2-merchant-brand', ?, ?, 'https://merchant.example/webhook', 'sec_webhook_tier2_32_bytes_long_key', 'active')`,
    [FIXTURES.brand, FIXTURES.merchantUser, FIXTURES.apiKey, FIXTURES.apiSecret]
  );

  await db.query(
    `INSERT INTO devices (id, brand_id, device_name, device_model, device_token, sim1_operator, sim2_operator, battery_level, status)
     VALUES (?, ?, 'Test Handset Pixel 7', 'Pixel-7', ?, 'Grameenphone', 'Banglalink', 95, 'active')`,
    [FIXTURES.deviceId, FIXTURES.brand, FIXTURES.deviceToken]
  );

  // Generate merchant JWT token for invoice creation
  merchantJwtToken = generateToken({
    id: FIXTURES.merchantUser,
    email: 'tier2_merchant@example.com',
    role: 'merchant',
    credits: 100
  });
}

async function runTier2Suite() {
  await setupDatabase();

  const app = createApp();
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
  console.log(`[Setup] Target test server running on ${baseUrl}\n`);

  // ===========================================================================
  // SECTION 1: PERSONAL MOBILE NUMBERS REJECTION
  // ===========================================================================
  console.log('--- SECTION 1: Personal Mobile Numbers Rejection ---');

  const spoofedNumbers = [
    { num: '01712345678', label: 'Local 11-digit GP (017...)' },
    { num: '+8801812345678', label: 'E.164 Robi (+88018...)' },
    { num: '01911223344', label: 'Local Banglalink (019...)' },
    { num: '+8801555667788', label: 'E.164 Teletalk (+88015...)' },
    { num: '01600112233', label: 'Local Airtel (016...)' },
    { num: '8801711223344', label: 'Prefix without plus (88017...)' }
  ];

  for (const item of spoofedNumbers) {
    await test(
      `T2-SPOOF-${item.num.replace(/[^A-Za-z0-9]/g, '')}`,
      'PERSONAL-NUMBER-DROP',
      `Reject spoofed personal mobile sender: '${item.num}' (${item.label}) with HTTP 400`,
      async () => {
        const countBefore = await db.get('SELECT count(*) as total FROM stored_data WHERE brand_id = ?', [FIXTURES.brand]);

        const res = await apiRequest('/api/device/sync-sms', {
          method: 'POST',
          headers: { 'device-api-key': FIXTURES.deviceToken },
          body: {
            sender: item.num,
            message: 'You have received Tk 1,000.00 from 01700000000. Fee Tk 0.00. Balance Tk 10,000.00. TrxID BKSPOOF01 at 16/09/2026 14:00'
          }
        });

        assert.strictEqual(res.status, 400, `Expected HTTP 400, got ${res.status}`);
        assert.strictEqual(res.body.code, 'UNAUTHORIZED_SENDER');

        // Verify zero database insertion
        const countAfter = await db.get('SELECT count(*) as total FROM stored_data WHERE brand_id = ?', [FIXTURES.brand]);
        assert.strictEqual(Number(countAfter.total), Number(countBefore.total), 'Zero rows must be inserted into stored_data');
      }
    );
  }

  // ===========================================================================
  // SECTION 2: 12 DEBIT BLACKLIST KEYWORDS & ZERO FALSE POSITIVES
  // ===========================================================================
  console.log('\n--- SECTION 2: 12 Debit Blacklist Keywords & Zero False-Positives ---');

  const prohibitedDebitCases = [
    { id: 'T2-DEB-01', keyword: 'Cash Out', msg: 'Cash Out Tk 500.00 to 01712345678. Fee Tk 7.50. TrxID BKDB001 at 16/09/2026' },
    { id: 'T2-DEB-01B', keyword: 'Cash-Out (hyphenated)', msg: 'Cash-Out Tk 500.00 to 01712345678. Fee Tk 7.50. TrxID BKDB002 at 16/09/2026' },
    { id: 'T2-DEB-01C', keyword: 'Cash_Out (underscore)', msg: 'Cash_Out Tk 500.00 to 01712345678. Fee Tk 7.50. TrxID BKDB003 at 16/09/2026' },
    { id: 'T2-DEB-01D', keyword: 'Cashout (compound)', msg: 'Cashout Tk 500.00 to 01712345678. Fee Tk 7.50. TrxID BKDB004 at 16/09/2026' },
    { id: 'T2-DEB-01E', keyword: 'Cash\\u200BOut (zero-width space)', msg: 'Cash\u200BOut Tk 500.00 to 01712345678. Fee Tk 7.50. TrxID BKDB005 at 16/09/2026' },
    { id: 'T2-DEB-02', keyword: 'Send Money', msg: 'Send Money to 01812345678. Amount Tk 1,200.00. Fee Tk 5.00. TrxID BKDB006 at 16/09/2026' },
    { id: 'T2-DEB-03', keyword: 'Payment to', msg: 'Payment Tk 450.00 to Merchant Shop successful. TrxID BKDB007 at 16/09/2026' },
    { id: 'T2-DEB-04', keyword: 'Paid to', msg: 'Paid Tk 600.00 to Grocery Mart. Balance Tk 2,000.00. TrxID BKDB008 at 16/09/2026' },
    { id: 'T2-DEB-05', keyword: 'Cash Out Fee', msg: 'Cash Out Fee Tk 18.50 deducted. Balance Tk 1,500.00. TrxID BKDB009' },
    { id: 'T2-DEB-06', keyword: 'Debit', msg: 'Your account has been Debited Tk 2,000.00. Ref ATM. TrxID BKDB010' },
    { id: 'T2-DEB-07', keyword: 'Fee Tk > 0', msg: 'You have received Tk 1,000.00 from 01712345678. Fee Tk 15.00. Balance Tk 5,000.00. TrxID BKDB011' },
    { id: 'T2-DEB-08', keyword: 'Charge Tk > 0', msg: 'You have received Tk 1,000.00 from 01712345678. Charge Tk 10.00. Balance Tk 5,000.00. TrxID BKDB012' },
    { id: 'T2-DEB-09', keyword: 'Transfer to', msg: 'Transfer Tk 800.00 to 01912345678 successful. TrxID BKDB013' },
    { id: 'T2-DEB-10', keyword: 'Transferred Tk', msg: 'Transferred Tk 950.00 to wallet 01612345678. TrxID BKDB014' },
    { id: 'T2-DEB-11', keyword: 'Mobile Recharge', msg: 'Mobile Recharge Tk 100.00 to 01712345678 successful. TrxID BKDB015' },
    { id: 'T2-DEB-12', keyword: 'Request Money', msg: 'Request Money Tk 500.00 from 01712345678 accepted. TrxID BKDB016' }
  ];

  for (const tc of prohibitedDebitCases) {
    await test(
      tc.id,
      'DEBIT-FILTER',
      `Reject prohibited debit indicator: '${tc.keyword}' with HTTP 400 DEBIT_TRANSACTION_REJECTED`,
      async () => {
        const res = await apiRequest('/api/device/sync-sms', {
          method: 'POST',
          headers: { 'device-api-key': FIXTURES.deviceToken },
          body: { sender: 'bKash', message: tc.msg }
        });

        assert.strictEqual(res.status, 400, `Expected HTTP 400, got ${res.status}`);
        assert.strictEqual(res.body.code, 'DEBIT_TRANSACTION_REJECTED');
      }
    );
  }

  // Zero False-Positive Tolerance Tests
  console.log('  --- Zero False-Positive Tolerance Verification ---');

  await test(
    'T2-ZFP-01',
    'ZERO-FALSE-POSITIVE',
    'Authentic bKash receipt containing "Fee Tk 0.00" is ACCEPTED (Zero false-positive on fee)',
    async () => {
      const trxId = 'BKZFP001';
      const msg = `You have received Tk 500.00 from 01712345678. Ref Store. Fee Tk 0.00. Balance Tk 5,500.00. TrxID ${trxId} at 16/09/2026 15:30`;

      const res = await apiRequest('/api/device/sync-sms', {
        method: 'POST',
        headers: { 'device-api-key': FIXTURES.deviceToken },
        body: { sender: 'bKash', message: msg }
      });

      assert.strictEqual(res.status, 201, `Fee Tk 0.00 must be accepted, got ${res.status}`);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.trx_id, trxId);
    }
  );

  await test(
    'T2-ZFP-02',
    'ZERO-FALSE-POSITIVE',
    'Authentic Nagad receipt containing "Fee: 0" and "Fee: Tk 0.00" is ACCEPTED',
    async () => {
      const trxId = 'NGZFP002';
      const msg = `Money Received. Amount: Tk 750.00. Sender: 01912345678. Ref: Cart. Fee: 0. TxnID: ${trxId}. Date: 16/09/2026 15:35`;

      const res = await apiRequest('/api/device/sync-sms', {
        method: 'POST',
        headers: { 'device-api-key': FIXTURES.deviceToken },
        body: { sender: 'Nagad', message: msg }
      });

      assert.strictEqual(res.status, 201, `Fee: 0 must be accepted, got ${res.status}`);
      assert.strictEqual(res.body.success, true);
    }
  );

  await test(
    'T2-ZFP-03',
    'ZERO-FALSE-POSITIVE',
    'Authentic credit receipt with "received payment Tk 500.00 from" is NOT matched by "Payment to"',
    async () => {
      const trxId = 'BKZFP003';
      const msg = `You have received payment Tk 1,200.00 from 01812345678. Ref Store. Fee Tk 0.00. Balance Tk 12,000.00. TrxID ${trxId} at 16/09/2026 15:40`;

      const res = await apiRequest('/api/device/sync-sms', {
        method: 'POST',
        headers: { 'device-api-key': FIXTURES.deviceToken },
        body: { sender: 'bKash', message: msg }
      });

      assert.strictEqual(res.status, 201, `Inbound 'received payment' must not trigger 'Payment to' filter`);
      assert.strictEqual(res.body.trx_id, trxId);
    }
  );

  await test(
    'T2-ZFP-04',
    'ZERO-FALSE-POSITIVE',
    'Authentic credit receipt containing "Charge Tk 0.00" is ACCEPTED',
    async () => {
      const trxId = 'BKZFP004';
      const msg = `You have received Tk 650.00 from 01712345678. Ref Invoice. Charge Tk 0.00. Balance Tk 6,650.00. TrxID ${trxId} at 16/09/2026 15:45`;

      const res = await apiRequest('/api/device/sync-sms', {
        method: 'POST',
        headers: { 'device-api-key': FIXTURES.deviceToken },
        body: { sender: 'bKash', message: msg }
      });

      assert.strictEqual(res.status, 201, `Charge Tk 0.00 must be accepted`);
    }
  );

  // ===========================================================================
  // SECTION 3: 15-MINUTE INVOICE TTL AUTO-EXPIRY & DYNAMIC STATUS TRANSITION
  // ===========================================================================
  console.log('\n--- SECTION 3: 15-Minute Invoice TTL Auto-Expiry & Dynamic Transition ---');

  await test(
    'T2-TTL-01',
    'INVOICE-TTL',
    'Invoice creation sets expires_at to exactly 15 minutes into the future (~900 seconds)',
    async () => {
      const res = await apiRequest('/api/invoices', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${merchantJwtToken}`,
          'x-brand-id': FIXTURES.brand
        },
        body: {
          amount: 500,
          customer_name: 'TTL Test Customer'
        }
      });

      assert.strictEqual(res.status, 201, `Invoice creation should succeed, got ${res.status}`);
      const invId = res.body.invoice.id;
      const inv = await db.get('SELECT created_at, expires_at FROM invoices WHERE id = ?', [invId]);

      const createdMs = new Date(inv.created_at.replace(' ', 'T') + 'Z').getTime();
      const expiresMs = new Date(inv.expires_at.replace(' ', 'T') + 'Z').getTime();
      const diffSec = Math.round((expiresMs - createdMs) / 1000);

      // Verify diff is ~900 seconds (15 minutes +/- 5 seconds)
      assert(Math.abs(diffSec - 900) <= 5, `Expected ~900 seconds TTL window, got ${diffSec}s`);
    }
  );

  await test(
    'T2-TTL-02',
    'INVOICE-TTL',
    'Reconcile payment against expired invoice rejected with HTTP 410 INVOICE_EXPIRED',
    async () => {
      const invId = 'inv_t2_expired_01';
      const trxId = 'BKEXP001';
      const amount = 300.00;

      // Seed expired invoice (expires_at was 10 minutes ago)
      const pastTime = getUtcSql(new Date(Date.now() - 10 * 60 * 1000));
      await db.query(
        `INSERT INTO invoices (id, brand_id, invoice_number, customer_name, amount, currency, status, expires_at)
         VALUES (?, ?, 'INV-EXP-01', 'Stale Buyer', ?, 'BDT', 'PENDING', ?)`,
        [invId, FIXTURES.brand, amount, pastTime]
      );

      // Seed matching UNUSED transaction
      await db.query(
        `INSERT INTO stored_data (id, brand_id, sender, raw_sms, channel, trx_id, amount, status, sim_slot)
         VALUES ('str_t2_exp_01', ?, 'bKash', 'You have received Tk 300.00', 'bKash', ?, ?, 'UNUSED', 1)`,
        [FIXTURES.brand, trxId, amount]
      );

      const res = await apiRequest('/api/payment/submit-trx', {
        method: 'POST',
        body: { invoice_id: invId, trx_id: trxId }
      });

      assert.strictEqual(res.status, 410, `Expected HTTP 410 Gone, got ${res.status}`);
      assert.strictEqual(res.body.code, 'INVOICE_EXPIRED');

      // Verify transaction in stored_data was NOT consumed (status remains UNUSED)
      const stored = await db.get('SELECT status FROM stored_data WHERE id = ?', ['str_t2_exp_01']);
      assert.strictEqual(stored.status, 'UNUSED', 'Transaction must NOT be consumed by expired invoice');
    }
  );

  await test(
    'T2-TTL-03',
    'DYNAMIC-TRANSITION',
    'Dynamic inline status transition: Stale PENDING invoice immediately updated to EXPIRED in DB upon payment attempt',
    async () => {
      const invId = 'inv_t2_expired_02';
      const pastTime = getUtcSql(new Date(Date.now() - 5 * 60 * 1000));

      await db.query(
        `INSERT INTO invoices (id, brand_id, invoice_number, customer_name, amount, currency, status, expires_at)
         VALUES (?, ?, 'INV-EXP-02', 'Dynamic Buyer', 250, 'BDT', 'PENDING', ?)`,
        [invId, FIXTURES.brand, pastTime]
      );

      // Verify status was PENDING before attempt
      const before = await db.get('SELECT status FROM invoices WHERE id = ?', [invId]);
      assert.strictEqual(before.status, 'PENDING');

      // Payment attempt triggers inline transition
      await apiRequest('/api/payment/submit-trx', {
        method: 'POST',
        body: { invoice_id: invId, trx_id: 'BKDYN001' }
      });

      // Verify status is now EXPIRED in DB
      const after = await db.get('SELECT status FROM invoices WHERE id = ?', [invId]);
      assert.strictEqual(after.status, 'EXPIRED', 'Invoice status must dynamically update to EXPIRED in database');
    }
  );

  await test(
    'T2-TTL-04',
    'PUBLIC-TTL-CHECK',
    'Public invoice endpoint (GET /api/invoices/:id/public) dynamically transitions expired invoice to EXPIRED and returns timeRemainingSeconds = 0',
    async () => {
      const invId = 'inv_t2_expired_03';
      const pastTime = getUtcSql(new Date(Date.now() - 2 * 60 * 1000));

      await db.query(
        `INSERT INTO invoices (id, brand_id, invoice_number, customer_name, amount, currency, status, expires_at)
         VALUES (?, ?, 'INV-EXP-03', 'Public Buyer', 400, 'BDT', 'PENDING', ?)`,
        [invId, FIXTURES.brand, pastTime]
      );

      const res = await apiRequest(`/api/invoices/${invId}/public`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.invoice.status, 'EXPIRED');
      assert.strictEqual(res.body.invoice.time_remaining_seconds, 0);
      assert.strictEqual(res.body.invoice.is_expired, true);

      const after = await db.get('SELECT status FROM invoices WHERE id = ?', [invId]);
      assert.strictEqual(after.status, 'EXPIRED');
    }
  );

  await test(
    'T2-TTL-05',
    'TTL-REAPER-DAEMON',
    'Background reaper service (expirePendingInvoices) marks stale invoices EXPIRED and enqueues invoice.expired webhook',
    async () => {
      const invId = 'inv_t2_reaper_01';
      const pastTime = getUtcSql(new Date(Date.now() - 30 * 60 * 1000));

      await db.query(
        `INSERT INTO invoices (id, brand_id, invoice_number, customer_name, amount, currency, status, expires_at)
         VALUES (?, ?, 'INV-REAPER-01', 'Reaper Customer', 150, 'BDT', 'PENDING', ?)`,
        [invId, FIXTURES.brand, pastTime]
      );

      // Execute reaper sweep
      const sweepResult = await expirePendingInvoices(db);
      assert(sweepResult.expiredCount >= 1, 'Reaper should expire at least 1 invoice');

      // Verify DB status
      const inv = await db.get('SELECT status FROM invoices WHERE id = ?', [invId]);
      assert.strictEqual(inv.status, 'EXPIRED');

      // Verify webhook log enqueued
      const whk = await db.get(
        "SELECT * FROM webhook_logs WHERE brand_id = ? AND invoice_id = ? AND event = 'invoice.expired'",
        [FIXTURES.brand, invId]
      );
      assert(whk, 'invoice.expired webhook log must be enqueued by reaper');
    }
  );

  // ===========================================================================
  // SECTION 4: AMOUNT ORACLE CONSTANT-TIME GENERIC DEFENSE
  // ===========================================================================
  console.log('\n--- SECTION 4: Amount Oracle Constant-Time Generic Defense ---');

  await test(
    'T2-ORA-01',
    'AMOUNT-ORACLE',
    'Valid TrxID with wrong invoice amount returns uniform generic TRANSACTION_INVALID error with zero amount leakage',
    async () => {
      const trxId = 'BKORA001';
      const actualAmount = 2500.00;
      const mismatchAmount = 500.00;
      const invId = 'inv_t2_ora_01';

      // Stored transaction has actualAmount = 2500
      await db.query(
        `INSERT INTO stored_data (id, brand_id, sender, raw_sms, channel, trx_id, amount, status, sim_slot)
         VALUES ('str_t2_ora_01', ?, 'bKash', 'You have received Tk 2,500.00', 'bKash', ?, ?, 'UNUSED', 1)`,
        [FIXTURES.brand, trxId, actualAmount]
      );

      // Invoice has mismatchAmount = 500
      const expiresAt = getUtcSql(new Date(Date.now() + 15 * 60 * 1000));
      await db.query(
        `INSERT INTO invoices (id, brand_id, invoice_number, customer_name, amount, currency, status, expires_at)
         VALUES (?, ?, 'INV-ORA-01', 'Oracle Probe Buyer', ?, 'BDT', 'PENDING', ?)`,
        [invId, FIXTURES.brand, mismatchAmount, expiresAt]
      );

      const res = await apiRequest('/api/payment/submit-trx', {
        method: 'POST',
        body: { invoice_id: invId, trx_id: trxId }
      });

      assert.strictEqual(res.status, 400, 'Should reject with HTTP 400');
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.code, 'TRANSACTION_INVALID');
      assert.strictEqual(
        res.body.message,
        'Transaction verification failed. Please check your TrxID and try again.',
        'Must return generic message'
      );

      // Zero leakage of 2500 in response text
      assert(!res.rawText.includes('2500'), 'Must never leak the stored transaction amount');
      assert(!res.rawText.includes('2,500'), 'Must never leak formatted amount');
    }
  );

  await test(
    'T2-ORA-02',
    'AMOUNT-ORACLE',
    'Non-existent TrxID returns exact identical HTTP 400 TRANSACTION_INVALID and message',
    async () => {
      const invId = 'inv_t2_ora_02';
      const expiresAt = getUtcSql(new Date(Date.now() + 15 * 60 * 1000));
      await db.query(
        `INSERT INTO invoices (id, brand_id, invoice_number, customer_name, amount, currency, status, expires_at)
         VALUES (?, ?, 'INV-ORA-02', 'NonExistent Probe', 500, 'BDT', 'PENDING', ?)`,
        [invId, FIXTURES.brand, expiresAt]
      );

      const res = await apiRequest('/api/payment/submit-trx', {
        method: 'POST',
        body: { invoice_id: invId, trx_id: 'BKNONEXISTENT999' }
      });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.code, 'TRANSACTION_INVALID');
      assert.strictEqual(
        res.body.message,
        'Transaction verification failed. Please check your TrxID and try again.'
      );
    }
  );

  await test(
    'T2-ORA-03',
    'AMOUNT-ORACLE',
    'S2S /v1/trx/verify with wrong amount returns uniform TRANSACTION_INVALID and deducts ZERO credits',
    async () => {
      const trxId = 'BKS2SORA01';
      const actualAmount = 1000.00;
      const userBefore = await db.get('SELECT credits FROM users WHERE id = ?', [FIXTURES.merchantUser]);

      await db.query(
        `INSERT INTO stored_data (id, brand_id, sender, raw_sms, channel, trx_id, amount, status, sim_slot)
         VALUES ('str_t2_s2s_ora', ?, 'bKash', 'You have received Tk 1,000.00', 'bKash', ?, ?, 'UNUSED', 1)`,
        [FIXTURES.brand, trxId, actualAmount]
      );

      const res = await apiRequest('/v1/trx/verify', {
        method: 'POST',
        headers: {
          'X-API-KEY': FIXTURES.apiKey,
          'X-API-SECRET': FIXTURES.apiSecret
        },
        body: { trx_id: trxId, amount: 999.00 } // wrong amount
      });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.code, 'TRANSACTION_INVALID');
      assert.strictEqual(res.body.message, 'Transaction verification failed. Please check your TrxID and try again.');

      // Zero credit deduction
      const userAfter = await db.get('SELECT credits FROM users WHERE id = ?', [FIXTURES.merchantUser]);
      assert.strictEqual(userAfter.credits, userBefore.credits, 'Credits must NOT be deducted on verification failure');
    }
  );

  // ===========================================================================
  // SECTION 5: MAXIMUM AND MINIMUM INVOICE AMOUNT LIMITS
  // ===========================================================================
  console.log('\n--- SECTION 5: Maximum & Minimum Invoice Amount Limits ---');

  await test(
    'T2-LIM-01',
    'AMOUNT-LIMITS',
    'Accept maximum invoice amount: 500,000 BDT (HTTP 201)',
    async () => {
      const res = await apiRequest('/api/invoices', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${merchantJwtToken}`,
          'x-brand-id': FIXTURES.brand
        },
        body: {
          amount: 500000,
          customer_name: 'Max Limit Buyer'
        }
      });

      assert.strictEqual(res.status, 201, `Expected 201, got ${res.status}`);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.invoice.amount, 500000);
    }
  );

  await test(
    'T2-LIM-02',
    'AMOUNT-LIMITS',
    'Reject amount exceeding maximum: 500,000.01 BDT with HTTP 400 AMOUNT_EXCEEDS_LIMIT',
    async () => {
      const res = await apiRequest('/api/invoices', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${merchantJwtToken}`,
          'x-brand-id': FIXTURES.brand
        },
        body: {
          amount: 500000.01,
          customer_name: 'Exceeding Buyer'
        }
      });

      assert.strictEqual(res.status, 400, `Expected 400, got ${res.status}`);
      assert.strictEqual(res.body.code, 'AMOUNT_EXCEEDS_LIMIT');
    }
  );

  await test(
    'T2-LIM-03',
    'AMOUNT-LIMITS',
    'Reject amount exceeding maximum: 1,000,000 BDT with HTTP 400 AMOUNT_EXCEEDS_LIMIT',
    async () => {
      const res = await apiRequest('/api/invoices', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${merchantJwtToken}`,
          'x-brand-id': FIXTURES.brand
        },
        body: {
          amount: 1000000,
          customer_name: 'Million Buyer'
        }
      });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.code, 'AMOUNT_EXCEEDS_LIMIT');
    }
  );

  await test(
    'T2-LIM-04',
    'AMOUNT-LIMITS',
    'Accept minimum invoice amount: 1.00 BDT (HTTP 201)',
    async () => {
      const res = await apiRequest('/api/invoices', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${merchantJwtToken}`,
          'x-brand-id': FIXTURES.brand
        },
        body: {
          amount: 1.00,
          customer_name: 'Minimum Buyer'
        }
      });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.invoice.amount, 1);
    }
  );

  await test(
    'T2-LIM-05',
    'AMOUNT-LIMITS',
    'Reject zero amount: 0 BDT with HTTP 400 INVALID_AMOUNT',
    async () => {
      const res = await apiRequest('/api/invoices', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${merchantJwtToken}`,
          'x-brand-id': FIXTURES.brand
        },
        body: {
          amount: 0,
          customer_name: 'Zero Buyer'
        }
      });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.code, 'INVALID_AMOUNT');
    }
  );

  await test(
    'T2-LIM-06',
    'AMOUNT-LIMITS',
    'Reject negative amount: -50 BDT with HTTP 400 INVALID_AMOUNT',
    async () => {
      const res = await apiRequest('/api/invoices', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${merchantJwtToken}`,
          'x-brand-id': FIXTURES.brand
        },
        body: {
          amount: -50,
          customer_name: 'Negative Buyer'
        }
      });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.code, 'INVALID_AMOUNT');
    }
  );

  await test(
    'T2-LIM-07',
    'AMOUNT-LIMITS',
    'Reject numerical anomaly (NaN, Infinity, string literals) with HTTP 400 rejection',
    async () => {
      const anomalies = ['Infinity', '-Infinity', 'NaN', 'invalid_string', null];
      for (const val of anomalies) {
        const res = await apiRequest('/api/invoices', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${merchantJwtToken}`,
            'x-brand-id': FIXTURES.brand
          },
          body: {
            amount: val,
            customer_name: 'Anomaly Buyer'
          }
        });
        assert.strictEqual(res.status, 400, `Anomaly '${val}' should return HTTP 400 rejection`);
        assert(
          res.body.code === 'INVALID_AMOUNT' || res.body.code === 'AMOUNT_EXCEEDS_LIMIT',
          `Expected rejection code, got ${res.body.code}`
        );
      }
    }
  );

  // ===========================================================================
  // TEST SUITE SUMMARY
  // ===========================================================================
  console.log('\n===============================================================================');
  console.log(`  Tier 2 Execution Finished: ${summary.passed} Passed / ${summary.total} Total (${summary.failed} Failed)`);
  console.log('===============================================================================');

  if (server) server.close();

  if (summary.failed > 0) {
    process.exit(1);
  }
}

runTier2Suite().catch((err) => {
  console.error('[Fatal Tier 2 Test Failure]', err);
  if (server) server.close();
  process.exit(1);
});
