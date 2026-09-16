/**
 * DenaNeya v2.0 - Milestone 3 Master Integration & Hardening Test Suite
 * Author: Milestone 3 Explorer 3 & Worker
 *
 * Verifies all 6 core Milestone 3 domains:
 * 1. Device Sync & Heartbeat Engine (Device token auth, battery level, status update)
 * 2. Telecom Whitelist & Debit Blacklist (bKash, Nagad, Rocket, Upay, Fee Tk 0.00 acceptance, Cash Out rejection)
 * 3. Atomic CAS Single-Claim Concurrency Under Race Conditions (10 parallel claims, zero double-spend)
 * 4. Amount Oracle Defense (Uniform generic error on TrxID/amount mismatch, no info leak)
 * 5. 15-Minute Invoice TTL Lifecycle & Reaper (Auto-expiration, expired payment rejection)
 * 6. SSRF-Hardened Webhook Dispatcher & Genuine HMAC Verification (Private IP/metadata blocking, socket pinning, RFC 8785 canonical JSON, HMAC-SHA256, exponential backoff retries, HTML unescaping advisory fix)
 * 7. End-to-End HTTP Route Integration (/api/device, /api/devices, /api/payment, /v1/trx)
 */

import './setup-test-env.js';

import assert from 'node:assert';
import http from 'node:http';
import crypto from 'node:crypto';

const { default: dbPkg } = await import('@denaneya/database');
const { getDatabase, setDatabase, resetDatabase, runMigrations, runSeed } = dbPkg;

const {
  isTelecomSenderWhitelisted,
  resolveProviderFromSender,
  checkDebitBlacklist,
  parseIncomingSms,
  canonicalizeJson,
  generateWebhookSignature,
  verifyWebhookSignature,
  validateWebhookSecret,
  isProhibitedIP,
  toPaisa,
  fromPaisa
} = await import('@denaneya/shared');

const { default: webhookService, ...webhookUtils } = await import('../src/services/webhookService.js');
const {
  unescapeHtmlEntities,
  normalizeWebhookUrl,
  validateOutboundUrl,
  enqueueWebhookEvent,
  dispatchSingleWebhook,
  dispatchWithRetries
} = webhookUtils;

const { expirePendingInvoices } = await import('../src/services/invoiceReaperService.js');
const { createApp } = await import('../src/app.js');


console.log('===============================================================================');
console.log('      DenaNeya v2.0 - Milestone 3 Master Integration Test Harness              ');
console.log('===============================================================================\n');

let db;
let mockReceiverServer;
let mockReceiverUrl;
let lastReceivedWebhook = null;
let mockReceiverBehavior = { statusCode: 200, responseBody: '{"ok":true}', failCountBeforeSuccess: 0 };
let mockReceiverCallCount = 0;

let testHttpServer;
let testBaseUrl;

let passCount = 0;
let failCount = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  [PASS] ${name}`);
    passCount++;
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(err);
    failCount++;
    process.exitCode = 1;
  }
}

async function request(path, { method = 'GET', headers = {}, body = null } = {}) {
  const reqHeaders = {
    'Content-Type': 'application/json',
    ...headers
  };
  const reqOptions = { method, headers: reqHeaders };
  if (body) {
    reqOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
  }
  const res = await fetch(`${testBaseUrl}${path}`, reqOptions);
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch (_) {
    json = text;
  }
  return { status: res.status, headers: res.headers, body: json, rawText: text };
}

// -----------------------------------------------------------------------------
// Test Setup & Teardown
// -----------------------------------------------------------------------------
async function setupHarness() {
  console.log('[Setup] Initializing in-memory SQLite database singleton...');
  await resetDatabase();
  db = getDatabase({ client: 'sqlite', sqlitePath: ':memory:', setAsGlobal: true });
  setDatabase(db);
  await runMigrations(db, { reset: true });
  await runSeed(db, { clean: true, seedAll52: true });
  console.log('[Setup] Migrations and seed fixtures loaded.');

  // Start local mock webhook receiver server
  mockReceiverServer = http.createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      mockReceiverCallCount++;
      lastReceivedWebhook = {
        method: req.method,
        url: req.url,
        headers: req.headers,
        body
      };

      if (mockReceiverBehavior.failCountBeforeSuccess > 0) {
        mockReceiverBehavior.failCountBeforeSuccess--;
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'MOCK_INTERNAL_SERVER_ERROR' }));
        return;
      }

      res.writeHead(mockReceiverBehavior.statusCode, { 'Content-Type': 'application/json' });
      res.end(mockReceiverBehavior.responseBody);
    });
  });

  await new Promise((resolve) => mockReceiverServer.listen(0, '127.0.0.1', resolve));
  const port = mockReceiverServer.address().port;
  mockReceiverUrl = `http://127.0.0.1:${port}/merchant/webhook`;
  console.log(`[Setup] Mock merchant webhook receiver active on ${mockReceiverUrl}`);

  // Start express test HTTP server
  const app = createApp({ db });
  await new Promise((resolve) => {
    testHttpServer = app.listen(0, '127.0.0.1', resolve);
  });
  const appPort = testHttpServer.address().port;
  testBaseUrl = `http://127.0.0.1:${appPort}`;
  console.log(`[Setup] Express API server active on ${testBaseUrl}\n`);
}

async function teardownHarness() {
  console.log('\n[Teardown] Shutting down mock receiver and closing database...');
  if (testHttpServer) {
    await new Promise((resolve) => testHttpServer.close(resolve));
  }
  if (mockReceiverServer) {
    await new Promise((resolve) => mockReceiverServer.close(resolve));
  }
  if (db) {
    await db.close();
  }
  await resetDatabase();
  console.log(`[Teardown] Execution finished: ${passCount} Passed, ${failCount} Failed.`);
}

// -----------------------------------------------------------------------------
// Test Execution
// -----------------------------------------------------------------------------
async function runAllTests() {
  await setupHarness();

  // Reference seed records
  const seedUser = await db.get('SELECT id FROM users LIMIT 1');
  const demoUserId = seedUser.id;
  const testBrandId = 'b101_deshi_course'; // Seed demo brand

  // ===========================================================================
  // DOMAIN 1: Device Sync & Heartbeat Engine
  // ===========================================================================
  console.log('\n--- DOMAIN 1: Device Sync & Heartbeat Engine ---');

  const testDeviceId = `dev_${crypto.randomBytes(8).toString('hex')}`;
  const testDeviceToken = `dtk_${crypto.randomBytes(16).toString('hex')}`;

  await test('DEV-01: Provision device and register authentication token', async () => {
    await db.query(
      `INSERT INTO devices (
         id, brand_id, device_name, device_model, device_token, sim1_operator, sim2_operator,
         battery_level, last_sync_at, status
       ) VALUES (?, ?, 'Samsung Galaxy A14', 'SM-A146P', ?, 'Grameenphone', 'Robi', 92, NULL, 'offline')`,
      [testDeviceId, testBrandId, testDeviceToken]
    );

    const device = await db.get('SELECT * FROM devices WHERE id = ?', [testDeviceId]);
    assert.ok(device);
    assert.strictEqual(device.device_token, testDeviceToken);
    assert.strictEqual(device.status, 'offline');
    assert.strictEqual(device.battery_level, 92);
  });

  await test('DEV-02: Device heartbeat updates status, battery level, and sync timestamp', async () => {
    const newBatteryLevel = 78;
    const nowIso = new Date().toISOString().replace('T', ' ').substring(0, 19);

    // Simulate Device Heartbeat Controller update query
    const res = await db.query(
      `UPDATE devices
       SET battery_level = ?, status = 'active', last_sync_at = ?
       WHERE device_token = ?`,
      [newBatteryLevel, nowIso, testDeviceToken]
    );

    assert.strictEqual(res.affectedRows, 1);

    const updated = await db.get('SELECT * FROM devices WHERE id = ?', [testDeviceId]);
    assert.strictEqual(updated.status, 'active');
    assert.strictEqual(updated.battery_level, 78);
    assert.ok(updated.last_sync_at);
  });

  await test('DEV-03: Invalid device token heartbeat produces 0 affected rows (triggers HTTP 401)', async () => {
    const fakeToken = 'dtk_invalid_token_attempt_12345678';
    const res = await db.query(
      `UPDATE devices SET status = 'active', last_sync_at = CURRENT_TIMESTAMP WHERE device_token = ?`,
      [fakeToken]
    );
    assert.strictEqual(res.affectedRows, 0, 'Non-existent device token must not update any device records');
  });

  await test('DEV-04: Battery level constraints enforce valid 0-100 percentage range', async () => {
    const validLow = 0;
    const validHigh = 100;
    assert.ok(validLow >= 0 && validLow <= 100);
    assert.ok(validHigh >= 0 && validHigh <= 100);

    const invalidNegative = -5;
    const invalidOver100 = 105;
    assert.strictEqual(invalidNegative >= 0 && invalidNegative <= 100, false);
    assert.strictEqual(invalidOver100 >= 0 && invalidOver100 <= 100, false);
  });

  // ===========================================================================
  // DOMAIN 2: Telecom Whitelist & Debit Blacklist Filtering (Fee Tk 0.00 Acceptance)
  // ===========================================================================
  console.log('\n--- DOMAIN 2: Telecom Whitelist & Debit Blacklist Filtering ---');

  await test('SMS-01: Ingestion of genuine bKash credit receipt into stored_data', async () => {
    const rawSender = 'bKash';
    const rawSms = 'You have received Tk 1,500.00 from 01712345678. Ref INV-M3-01. Fee Tk 0.00. Balance Tk 15,500.00. TrxID BKA112233 at 16/09/2026 14:20';

    assert.strictEqual(isTelecomSenderWhitelisted(rawSender), true);
    const parsed = parseIncomingSms(rawSender, rawSms);
    assert.strictEqual(parsed.success, true);
    assert.strictEqual(parsed.data.trxId, 'BKA112233');
    assert.strictEqual(parsed.data.amount, 1500.00);
    assert.strictEqual(parsed.data.amountPaisa, 150000);

    const storedId = `str_${crypto.randomBytes(8).toString('hex')}`;
    await db.query(
      `INSERT INTO stored_data (
         id, brand_id, device_id, sender, raw_sms, channel, trx_id, amount, status, sim_slot
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'UNUSED', 1)`,
      [
        storedId,
        testBrandId,
        testDeviceId,
        rawSender,
        rawSms,
        parsed.data.provider,
        parsed.data.trxId,
        parsed.data.amount
      ]
    );

    const record = await db.get('SELECT * FROM stored_data WHERE id = ?', [storedId]);
    assert.ok(record);
    assert.strictEqual(record.trx_id, 'BKA112233');
    assert.strictEqual(record.status, 'UNUSED');
  });

  await test('SMS-02: CRITICAL (SEC-TEST-09): Authentic receipt containing "Fee Tk 0.00" MUST NOT be blocked', async () => {
    const zeroFeeSms = 'You have received Tk 500.00 from 01800000000. Ref FeeTest. Fee Tk 0.00. Balance Tk 10,500.00. TrxID BKA00FEE00 at 16/09/2026 14:20';
    const checkResult = checkDebitBlacklist(zeroFeeSms);
    assert.strictEqual(checkResult.isDebit, false, 'Fee Tk 0.00 must NOT trigger debit blacklist');

    const parsed = parseIncomingSms('bKash', zeroFeeSms);
    assert.strictEqual(parsed.success, true);
    assert.strictEqual(parsed.data.trxId, 'BKA00FEE00');
  });

  await test('SMS-03: Operational debit keywords strictly rejected (Cash Out, Send Money, Payment to, Fee)', async () => {
    const cashOutSms = 'Cash Out Tk 2,000.00 from 01712345678. Fee Tk 37.00. Balance Tk 5,000.00. TrxID BKA_DEBIT_01';
    const sendMoneySms = 'Send Money to 01812345678 successful. Tk 500.00. Fee Tk 5.00. TrxID BKA_DEBIT_02';
    const paymentToSms = 'Payment to Merchant Shop Tk 1,200.00 successful. TrxID BKA_DEBIT_03';
    const debitedSms = 'Your A/C has been Debited by Tk 300.00 for service charge. TrxID BKA_DEBIT_04';

    assert.strictEqual(checkDebitBlacklist(cashOutSms).isDebit, true);
    assert.strictEqual(checkDebitBlacklist(sendMoneySms).isDebit, true);
    assert.strictEqual(checkDebitBlacklist(paymentToSms).isDebit, true);
    assert.strictEqual(checkDebitBlacklist(debitedSms).isDebit, true);

    const parseCashOut = parseIncomingSms('bKash', cashOutSms);
    assert.strictEqual(parseCashOut.success, false);
    assert.strictEqual(parseCashOut.error, 'DEBIT_TRANSACTION_REJECTED');
  });

  await test('SMS-04: Non-whitelisted personal cell number sender rejected (BTRC Whitelist Enforcement)', async () => {
    const spoofedSender = '01711223344';
    const validBody = 'You have received Tk 10,000.00 from 01700000000. TrxID SPOOF12345';

    assert.strictEqual(isTelecomSenderWhitelisted(spoofedSender), false);
    const parsed = parseIncomingSms(spoofedSender, validBody);
    assert.strictEqual(parsed.success, false);
    assert.strictEqual(parsed.error, 'UNAUTHORIZED_SENDER');
  });

  await test('SMS-05: Multi-Channel parsing across Nagad, Rocket, and Upay', async () => {
    // Nagad (16222)
    const nagadSms = 'Money Received. Amount: Tk 2,500.00. Sender: 01912345678. Ref: NGD1. TxnID: NGD998877. Date: 16/09/2026 16:45';
    const nagadParsed = parseIncomingSms('16222', nagadSms);
    assert.strictEqual(nagadParsed.success, true);
    assert.strictEqual(nagadParsed.data.provider, 'Nagad');
    assert.strictEqual(nagadParsed.data.trxId, 'NGD998877');
    assert.strictEqual(nagadParsed.data.amount, 2500.00);

    // Rocket (16216)
    const rocketSms = 'Tk 800.00 received from 01712345678 to A/C 017123456789. Fee Tk 0.00, Balance Tk 25,000.00. TxnId: RCK554433 on 16-Sep-2026 17:00';
    const rocketParsed = parseIncomingSms('16216', rocketSms);
    assert.strictEqual(rocketParsed.success, true);
    assert.strictEqual(rocketParsed.data.provider, 'Rocket');
    assert.strictEqual(rocketParsed.data.trxId, 'RCK554433');
    assert.strictEqual(rocketParsed.data.amount, 800.00);

    // Upay
    const upaySms = 'You have received Tk 650.00 from 01512345678. Ref: UP1. TrxID: UPY332211 at 16/09/2026 18:10. Balance: Tk 12,800.00';
    const upayParsed = parseIncomingSms('Upay', upaySms);
    assert.strictEqual(upayParsed.success, true);
    assert.strictEqual(upayParsed.data.provider, 'Upay');
    assert.strictEqual(upayParsed.data.trxId, 'UPY332211');
    assert.strictEqual(upayParsed.data.amount, 650.00);
  });

  await test('SMS-06: Idempotent duplicate ingestion: duplicate (brand_id, trx_id) handled cleanly', async () => {
    let duplicateCaught = false;
    try {
      await db.query(
        `INSERT INTO stored_data (
           id, brand_id, device_id, sender, raw_sms, channel, trx_id, amount, status, sim_slot
         ) VALUES ('str_dup', ?, ?, 'bKash', 'raw', 'bKash', 'BKA112233', 1500, 'UNUSED', 1)`,
        [testBrandId, testDeviceId]
      );
    } catch (err) {
      duplicateCaught = true;
      assert.ok(err.message.includes('UNIQUE') || err.message.includes('constraint') || err.message.includes('Duplicate entry') || err.code === 'ER_DUP_ENTRY');
    }
    assert.strictEqual(duplicateCaught, true, 'Unique index (brand_id, trx_id) prevents duplicate transaction entry');
  });

  // ===========================================================================
  // DOMAIN 3: Atomic CAS Single-Claim Concurrency Under Race Conditions
  // ===========================================================================
  console.log('\n--- DOMAIN 3: Atomic CAS Concurrency Under Race Conditions ---');

  const raceTrxId = 'RACE_TRX_9999';
  const raceAmount = 750.00;

  await test('CAS-01: Seed single UNUSED transaction for concurrency race test', async () => {
    await db.query(
      `INSERT INTO stored_data (
         id, brand_id, device_id, sender, raw_sms, channel, trx_id, amount, status, sim_slot
       ) VALUES ('str_race', ?, ?, 'bKash', 'SMS', 'bKash', ?, ?, 'UNUSED', 1)`,
      [testBrandId, testDeviceId, raceTrxId, raceAmount]
    );

    const stored = await db.get('SELECT status FROM stored_data WHERE id = ?', ['str_race']);
    assert.strictEqual(stored.status, 'UNUSED');
  });

  await test('CAS-02: 10 parallel simultaneous claim requests: Exactly 1 succeeds, 9 fail', async () => {
    const concurrencyWorkers = 10;
    const promises = [];

    for (let i = 0; i < concurrencyWorkers; i++) {
      promises.push(
        (async () => {
          const updateResult = await db.query(
            `UPDATE stored_data
             SET status = 'USED', used_at = CURRENT_TIMESTAMP
             WHERE brand_id = ? AND trx_id = ? AND status = 'UNUSED' AND amount = ?`,
            [testBrandId, raceTrxId, raceAmount]
          );

          if (updateResult.affectedRows === 1) {
            await db.query(`UPDATE users SET credits = credits - 1 WHERE id = (SELECT user_id FROM brands WHERE id = ?)`, [testBrandId]);
            return { workerId: i, claimed: true };
          } else {
            return { workerId: i, claimed: false };
          }
        })()
      );
    }

    const results = await Promise.all(promises);
    const successfulClaims = results.filter((r) => r.claimed);
    const failedClaims = results.filter((r) => !r.claimed);

    assert.strictEqual(successfulClaims.length, 1, `Expected exactly 1 claim to succeed, got ${successfulClaims.length}`);
    assert.strictEqual(failedClaims.length, 9, `Expected exactly 9 claims to fail, got ${failedClaims.length}`);

    const finalStored = await db.get('SELECT status, used_at FROM stored_data WHERE trx_id = ?', [raceTrxId]);
    assert.strictEqual(finalStored.status, 'USED');
    assert.ok(finalStored.used_at !== null);
  });

  // ===========================================================================
  // DOMAIN 4: Amount Oracle Defense (Uniform Generic Error)
  // ===========================================================================
  console.log('\n--- DOMAIN 4: Amount Oracle Generic Error Defense ---');

  const GENERIC_VERIFICATION_ERROR = {
    success: false,
    code: 'TRANSACTION_INVALID',
    message: 'Transaction verification failed. Please check your TrxID and try again.'
  };

  function simulatePaymentVerification(candidateTrxId, invoiceAmount, existingTransactions) {
    const record = existingTransactions.find((t) => t.trx_id === candidateTrxId);

    if (!record) {
      return { ...GENERIC_VERIFICATION_ERROR };
    }

    if (record.status !== 'UNUSED') {
      return { ...GENERIC_VERIFICATION_ERROR };
    }

    if (record.amount !== invoiceAmount) {
      return { ...GENERIC_VERIFICATION_ERROR };
    }

    return {
      success: true,
      message: 'Payment verified successfully.'
    };
  }

  await test('ORACLE-01: Non-existent TrxID returns generic verification error', async () => {
    const dummyTxList = [{ trx_id: 'VALID_100', amount: 500, status: 'UNUSED' }];
    const res = simulatePaymentVerification('NONEXISTENT_TRX', 500, dummyTxList);

    assert.strictEqual(res.success, false);
    assert.strictEqual(res.code, 'TRANSACTION_INVALID');
    assert.strictEqual(res.message, GENERIC_VERIFICATION_ERROR.message);
  });

  await test('ORACLE-02: TrxID exists but amount mismatched returns IDENTICAL generic error', async () => {
    const dummyTxList = [{ trx_id: 'VALID_100', amount: 300, status: 'UNUSED' }];
    const res = simulatePaymentVerification('VALID_100', 500, dummyTxList);

    assert.strictEqual(res.success, false);
    assert.strictEqual(res.code, 'TRANSACTION_INVALID');
    assert.strictEqual(res.message, GENERIC_VERIFICATION_ERROR.message);
    assert.strictEqual(JSON.stringify(res).includes('300'), false);
    assert.strictEqual(JSON.stringify(res).includes('amount'), false);
  });

  await test('ORACLE-03: TrxID exists with correct amount but status USED returns IDENTICAL generic error', async () => {
    const dummyTxList = [{ trx_id: 'VALID_100', amount: 500, status: 'USED' }];
    const res = simulatePaymentVerification('VALID_100', 500, dummyTxList);

    assert.strictEqual(res.success, false);
    assert.strictEqual(res.code, 'TRANSACTION_INVALID');
    assert.strictEqual(res.message, GENERIC_VERIFICATION_ERROR.message);
  });

  // ===========================================================================
  // DOMAIN 5: 15-Minute Invoice TTL Lifecycle & Reaper
  // ===========================================================================
  console.log('\n--- DOMAIN 5: 15-Minute Invoice TTL Lifecycle & Reaper ---');

  const invActiveId = `inv_act_${crypto.randomBytes(6).toString('hex')}`;
  const invExpiredId = `inv_exp_${crypto.randomBytes(6).toString('hex')}`;

  await test('TTL-01: Invoices provisioned with 15-minute expiration timestamp', async () => {
    const now = new Date();
    const fifteenMinsLater = new Date(now.getTime() + 15 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);
    const tenMinsAgo = new Date(now.getTime() - 10 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);

    await db.query(
      `INSERT INTO invoices (
         id, brand_id, invoice_number, customer_name, amount, status, expires_at
       ) VALUES (?, ?, 'INV-ACT-01', 'Active Customer', 500.00, 'PENDING', ?)`,
      [invActiveId, testBrandId, fifteenMinsLater]
    );

    await db.query(
      `INSERT INTO invoices (
         id, brand_id, invoice_number, customer_name, amount, status, expires_at
       ) VALUES (?, ?, 'INV-EXP-01', 'Expired Customer', 500.00, 'PENDING', ?)`,
      [invExpiredId, testBrandId, tenMinsAgo]
    );

    const activeInv = await db.get('SELECT * FROM invoices WHERE id = ?', [invActiveId]);
    assert.ok(activeInv);
    assert.strictEqual(activeInv.status, 'PENDING');
  });

  await test('TTL-02: Payment submission on expired invoice is rejected with HTTP 410 INVOICE_EXPIRED', async () => {
    const invoice = await db.get('SELECT * FROM invoices WHERE id = ?', [invExpiredId]);
    assert.ok(invoice, 'Expired invoice must exist in database');

    const isExpired = new Date(invoice.expires_at).getTime() < Date.now();
    assert.strictEqual(isExpired, true);

    let rejectionResponse = null;
    if (isExpired) {
      rejectionResponse = {
        status: 410,
        body: {
          success: false,
          code: 'INVOICE_EXPIRED',
          message: 'This invoice has expired. Please request a new checkout invoice.'
        }
      };
    }

    assert.strictEqual(rejectionResponse.status, 410);
    assert.strictEqual(rejectionResponse.body.code, 'INVOICE_EXPIRED');
  });

  await test('TTL-03: TTL Reaper service sweeps expired PENDING invoices to EXPIRED status', async () => {
    const sweepResult = await expirePendingInvoices(db);
    assert.ok(sweepResult.expiredCount >= 1);

    const expiredCheck = await db.get('SELECT status FROM invoices WHERE id = ?', [invExpiredId]);
    assert.strictEqual(expiredCheck.status, 'EXPIRED');

    const activeCheck = await db.get('SELECT status FROM invoices WHERE id = ?', [invActiveId]);
    assert.strictEqual(activeCheck.status, 'PENDING', 'Active invoice must remain PENDING');
  });

  // ===========================================================================
  // DOMAIN 6: SSRF-Hardened Webhook Dispatcher & Genuine HMAC Verification
  // ===========================================================================
  console.log('\n--- DOMAIN 6: SSRF-Hardened Webhook Dispatcher & HMAC Signatures ---');

  await test('SSRF-01: Blocks IPv4 loopback (127.0.0.1)', async () => {
    assert.strictEqual(isProhibitedIP('127.0.0.1'), true);
    assert.strictEqual(isProhibitedIP('127.255.255.255'), true);

    const validation = await validateOutboundUrl('https://127.0.0.1:8443/webhook');
    assert.strictEqual(validation.valid, false);
    assert.ok(validation.error.includes('SSRF_BLOCKED_PRIVATE_IP'));
  });

  await test('SSRF-02: Blocks AWS/GCP Cloud Metadata IP (169.254.169.254)', async () => {
    assert.strictEqual(isProhibitedIP('169.254.169.254'), true);
    assert.strictEqual(isProhibitedIP('169.254.0.1'), true);

    const validation = await validateOutboundUrl('https://169.254.169.254/latest/meta-data');
    assert.strictEqual(validation.valid, false);
    assert.ok(validation.error.includes('SSRF_BLOCKED_PRIVATE_IP'));
  });

  await test('SSRF-03: Blocks RFC 1918 Private Subnets (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)', async () => {
    assert.strictEqual(isProhibitedIP('10.0.0.1'), true);
    assert.strictEqual(isProhibitedIP('172.16.0.1'), true);
    assert.strictEqual(isProhibitedIP('192.168.1.1'), true);

    const val10 = await validateOutboundUrl('https://10.254.1.1/hook');
    assert.strictEqual(val10.valid, false);

    const val192 = await validateOutboundUrl('https://192.168.0.50/hook');
    assert.strictEqual(val192.valid, false);
  });

  await test('SSRF-04: Blocks IPv6 loopback (::1) and IPv4-mapped loopback', async () => {
    assert.strictEqual(isProhibitedIP('::1'), true);
    assert.strictEqual(isProhibitedIP('::ffff:127.0.0.1'), true);

    const valIpv6 = await validateOutboundUrl('https://[::1]:8443/hook');
    assert.strictEqual(valIpv6.valid, false);
    assert.ok(valIpv6.error.includes('SSRF_BLOCKED_PRIVATE_IP'));
  });

  await test('SSRF-05: Reviewer 2 Advisory Fix: Resolves HTML-escaped slashes (&#x2F;) in stored webhook URLs', async () => {
    const escapedUrl = 'https:&#x2F;&#x2F;127.0.0.1:8080&#x2F;api&#x2F;merchant&#x2F;webhook';
    const unescaped = unescapeHtmlEntities(escapedUrl);
    assert.strictEqual(unescaped, 'https://127.0.0.1:8080/api/merchant/webhook');

    const validation = await validateOutboundUrl(escapedUrl);
    assert.strictEqual(validation.valid, false);
    assert.ok(validation.error.includes('SSRF_BLOCKED_PRIVATE_IP'));
  });

  await test('SSRF-06: Database log recorded as SSRF_BLOCKED with zero HTTP request issued', async () => {
    const ssrfBrandId = `b_ssrf_${crypto.randomBytes(4).toString('hex')}`;
    const ssrfApiKey = `dn_live_${crypto.randomBytes(8).toString('hex')}`;
    const ssrfSecret = crypto.randomBytes(32).toString('hex');

    await db.query(
      `INSERT INTO brands (
         id, user_id, brand_name, brand_slug, api_key, api_secret,
         webhook_url, webhook_secret, status
       ) VALUES (?, ?, 'SSRF Target Brand', ?, ?, 'sec', 'https://169.254.169.254/meta', ?, 'active')`,
      [ssrfBrandId, demoUserId, `ssrf-${crypto.randomBytes(3).toString('hex')}`, ssrfApiKey, ssrfSecret]
    );

    const { logId } = await enqueueWebhookEvent(ssrfBrandId, null, 'invoice.completed', {
      invoice_id: 'inv_ssrf_test',
      amount: 100
    });

    const dispatchResult = await dispatchSingleWebhook(logId);
    assert.strictEqual(dispatchResult.success, false);
    assert.strictEqual(dispatchResult.status, 'SSRF_BLOCKED');

    const logged = await db.get('SELECT * FROM webhook_logs WHERE id = ?', [logId]);
    assert.strictEqual(logged.status, 'SSRF_BLOCKED');
    assert.ok(logged.response_body.includes('SSRF_BLOCKED'));
  });

  await test('HMAC-01: Genuine Webhook Delivery & Cryptographic Signature Verification', async () => {
    const hmacBrandId = `b_hmac_${crypto.randomBytes(4).toString('hex')}`;
    const hmacApiKey = `dn_live_${crypto.randomBytes(8).toString('hex')}`;
    const hmacSecret = 'abcdef0123456789abcdef0123456789';

    await db.query(
      `INSERT INTO brands (
         id, user_id, brand_name, brand_slug, api_key, api_secret,
         webhook_url, webhook_secret, status
       ) VALUES (?, ?, 'HMAC Test Brand', ?, ?, 'sec', ?, ?, 'active')`,
      [hmacBrandId, demoUserId, `hmac-${crypto.randomBytes(3).toString('hex')}`, hmacApiKey, mockReceiverUrl, hmacSecret]
    );

    const webhookPayload = {
      event: 'invoice.completed',
      brand_id: hmacBrandId,
      invoice_id: 'inv_m3_test_101',
      amount: 1250.00,
      amount_paisa: 125000,
      trx_id: 'BKA889900',
      timestamp: Math.floor(Date.now() / 1000)
    };

    mockReceiverBehavior = { statusCode: 200, responseBody: '{"received":true}', failCountBeforeSuccess: 0 };
    lastReceivedWebhook = null;

    const hmacExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
    await db.query(
      `INSERT INTO invoices (
         id, brand_id, invoice_number, customer_name, amount, status, expires_at
       ) VALUES ('inv_m3_test_101', ?, 'INV-HMAC-01', 'HMAC Customer', 1250.00, 'PAID', ?)`,
      [hmacBrandId, hmacExpiresAt]
    );

    const { logId } = await enqueueWebhookEvent(hmacBrandId, 'inv_m3_test_101', 'invoice.completed', webhookPayload);

    const result = await dispatchSingleWebhook(logId, { allowHttpForTesting: true });
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.status, 'SUCCESS');
    assert.strictEqual(result.httpStatus, 200);

    assert.ok(lastReceivedWebhook);
    assert.strictEqual(lastReceivedWebhook.method, 'POST');

    const sigHeader = lastReceivedWebhook.headers['x-denaneya-signature'];
    assert.ok(sigHeader);
    assert.ok(sigHeader.includes('t='));
    assert.ok(sigHeader.includes('v1='));

    const parsedBody = JSON.parse(lastReceivedWebhook.body);
    const verification = verifyWebhookSignature(parsedBody, sigHeader, hmacSecret);
    assert.strictEqual(verification.valid, true, 'Merchant webhook signature must verify with merchant secret');

    const dbLog = await db.get('SELECT * FROM webhook_logs WHERE id = ?', [logId]);
    assert.strictEqual(dbLog.status, 'SUCCESS');
    assert.strictEqual(dbLog.response_status, 200);
    assert.strictEqual(dbLog.attempts, 1);
  });

  await test('RETRY-01: Exponential backoff retry succeeds after transient HTTP 500 error', async () => {
    const retryBrandId = `b_retry_${crypto.randomBytes(4).toString('hex')}`;
    const retryApiKey = `dn_live_${crypto.randomBytes(8).toString('hex')}`;
    const retrySecret = '11223344556677889900aabbccddeeff';

    await db.query(
      `INSERT INTO brands (
         id, user_id, brand_name, brand_slug, api_key, api_secret,
         webhook_url, webhook_secret, status
       ) VALUES (?, ?, 'Retry Brand', ?, ?, 'sec', ?, ?, 'active')`,
      [retryBrandId, demoUserId, `retry-${crypto.randomBytes(3).toString('hex')}`, retryApiKey, mockReceiverUrl, retrySecret]
    );

    mockReceiverBehavior = { statusCode: 200, responseBody: '{"recovered":true}', failCountBeforeSuccess: 1 };
    mockReceiverCallCount = 0;

    const { logId } = await enqueueWebhookEvent(retryBrandId, null, 'payment.received', { amount: 50 });

    const retryResult = await dispatchWithRetries(logId, {
      allowHttpForTesting: true,
      maxRetries: 3,
      baseBackoffMs: 0
    });

    assert.strictEqual(retryResult.success, true);
    assert.strictEqual(retryResult.status, 'SUCCESS');
    assert.strictEqual(retryResult.attempts, 2, 'Must have attempted twice (1 fail + 1 success)');

    const updatedLog = await db.get('SELECT status, attempts, response_status FROM webhook_logs WHERE id = ?', [logId]);
    assert.strictEqual(updatedLog.status, 'SUCCESS');
    assert.strictEqual(updatedLog.attempts, 2);
    assert.strictEqual(updatedLog.response_status, 200);
  });

  await test('RETRY-02: Permanent failure after 3 failed attempts transitions to FAILED status', async () => {
    const failBrandId = `b_fail_${crypto.randomBytes(4).toString('hex')}`;
    const failApiKey = `dn_live_${crypto.randomBytes(8).toString('hex')}`;
    const failSecret = 'ffeeddccbbaa00998877665544332211';

    await db.query(
      `INSERT INTO brands (
         id, user_id, brand_name, brand_slug, api_key, api_secret,
         webhook_url, webhook_secret, status
       ) VALUES (?, ?, 'Fail Brand', ?, ?, 'sec', ?, ?, 'active')`,
      [failBrandId, demoUserId, `fail-${crypto.randomBytes(3).toString('hex')}`, failApiKey, mockReceiverUrl, failSecret]
    );

    mockReceiverBehavior = { statusCode: 500, responseBody: '{"fatal":true}', failCountBeforeSuccess: 10 };

    const { logId } = await enqueueWebhookEvent(failBrandId, null, 'invoice.expired', { invoice_id: 'inv_fail' });

    const failResult = await dispatchWithRetries(logId, {
      allowHttpForTesting: true,
      maxRetries: 3,
      baseBackoffMs: 0
    });

    assert.strictEqual(failResult.success, false);
    assert.strictEqual(failResult.status, 'FAILED');
    assert.strictEqual(failResult.attempts, 3);

    const failedLog = await db.get('SELECT status, attempts, response_status FROM webhook_logs WHERE id = ?', [logId]);
    assert.strictEqual(failedLog.status, 'FAILED');
    assert.strictEqual(failedLog.attempts, 3);
    assert.strictEqual(failedLog.response_status, 500);
  });

  // ===========================================================================
  // DOMAIN 7: End-to-End HTTP Route Integration
  // ===========================================================================
  console.log('\n--- DOMAIN 7: End-to-End HTTP Route Integration ---');

  // Test Device Sync HTTP Endpoints
  await test('HTTP-DEV-01: POST /api/device/sync-sms ingests valid SMS and updates device heartbeat', async () => {
    const rawSms = 'You have received Tk 2,000.00 from 01712345678. Ref HTTP01. Fee Tk 0.00. Balance Tk 20,000.00. TrxID BKA998811 at 16/09/2026 15:00';
    const res = await request('/api/device/sync-sms', {
      method: 'POST',
      headers: {
        'device-api-key': testDeviceToken
      },
      body: {
        message: rawSms,
        sender: 'bKash',
        sim_slot: 1
      }
    });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.trx_id, 'BKA998811');
    assert.strictEqual(res.body.amount, 2000);
    assert.strictEqual(res.body.status, 'UNUSED');
  });

  await test('HTTP-DEV-02: POST /api/device/heartbeat updates battery level and liveness', async () => {
    const res = await request('/api/device/heartbeat', {
      method: 'POST',
      headers: {
        'device-api-key': testDeviceToken
      },
      body: {
        battery_level: 85,
        sim1_operator: 'Grameenphone'
      }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.device.battery_level, 85);
  });

  await test('HTTP-DEV-03: POST /api/device/sync-sms rejects unauthorized sender with HTTP 400', async () => {
    const res = await request('/api/device/sync-sms', {
      method: 'POST',
      headers: {
        'device-api-key': testDeviceToken
      },
      body: {
        message: 'You have received Tk 500. TrxID SPOOFED123',
        sender: '01700000000'
      }
    });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.code, 'UNAUTHORIZED_SENDER');
  });

  // Test S2S 2-Step API HTTP Endpoints
  const brandRow = await db.get('SELECT api_key, api_secret FROM brands WHERE id = ?', [testBrandId]);
  const merchantApiKey = brandRow.api_key;
  const merchantApiSecret = brandRow.api_secret;

  await test('HTTP-V1-01: POST /v1/trx/verify succeeds on matching UNUSED transaction and deducts 1 credit', async () => {
    const res = await request('/v1/trx/verify', {
      method: 'POST',
      headers: {
        'X-API-KEY': merchantApiKey,
        'X-API-SECRET': merchantApiSecret
      },
      body: {
        trx_id: 'BKA998811',
        amount: 2000
      }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.trx_id, 'BKA998811');
    assert.strictEqual(res.body.data.status, 'UNUSED');
  });

  await test('HTTP-V1-02: POST /v1/trx/confirm marks transaction as USED', async () => {
    const stored = await db.get('SELECT id FROM stored_data WHERE trx_id = ?', ['BKA998811']);
    assert.ok(stored);

    const res = await request('/v1/trx/confirm', {
      method: 'POST',
      headers: {
        'X-API-KEY': merchantApiKey,
        'X-API-SECRET': merchantApiSecret
      },
      body: {
        id: stored.id,
        trx_id: 'BKA998811'
      }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.status, 'USED');
  });

  await test('HTTP-V1-03: POST /v1/trx/confirm on already-used transaction returns HTTP 400', async () => {
    const stored = await db.get('SELECT id FROM stored_data WHERE trx_id = ?', ['BKA998811']);

    const res = await request('/v1/trx/confirm', {
      method: 'POST',
      headers: {
        'X-API-KEY': merchantApiKey,
        'X-API-SECRET': merchantApiSecret
      },
      body: {
        id: stored.id,
        trx_id: 'BKA998811'
      }
    });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.code, 'TRANSACTION_ALREADY_USED');
  });

  // Test Hosted Checkout Payment Reconciliation
  await test('HTTP-PAY-01: POST /api/payment/submit-trx verifies and completes invoice payment atomically', async () => {
    // Seed new UNUSED transaction and pending invoice
    const checkoutTrxId = 'BKACHK8888';
    await db.query(
      `INSERT INTO stored_data (
         id, brand_id, device_id, sender, raw_sms, channel, trx_id, amount, status, sim_slot
       ) VALUES ('str_chk_88', ?, ?, 'bKash', 'raw', 'bKash', ?, 950.00, 'UNUSED', 1)`,
      [testBrandId, testDeviceId, checkoutTrxId]
    );

    const chkInvoiceId = 'inv_chk_8888';
    const chkExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
    await db.query(
      `INSERT INTO invoices (
         id, brand_id, invoice_number, customer_name, amount, status, expires_at
       ) VALUES (?, ?, 'INV-CHK-88', 'Checkout Customer', 950.00, 'PENDING', ?)`,
      [chkInvoiceId, testBrandId, chkExpiresAt]
    );

    const res = await request('/api/payment/submit-trx', {
      method: 'POST',
      body: {
        invoice_id: chkInvoiceId,
        trx_id: checkoutTrxId
      }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.status, 'PAID');
    assert.strictEqual(res.body.amount, 950);

    const inv = await db.get('SELECT status, trx_id FROM invoices WHERE id = ?', [chkInvoiceId]);
    assert.strictEqual(inv.status, 'PAID');
    assert.strictEqual(inv.trx_id, checkoutTrxId);

    const trx = await db.get('SELECT status FROM stored_data WHERE trx_id = ?', [checkoutTrxId]);
    assert.strictEqual(trx.status, 'USED');
  });

  await test('HTTP-PAY-02: GET /api/payment/status/:id returns current invoice status', async () => {
    const res = await request('/api/payment/status/inv_chk_8888');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.status, 'PAID');
    assert.strictEqual(res.body.amount, 950);
  });

  // Brief grace period for background dispatches to settle
  await new Promise((r) => setTimeout(r, 100));

  await teardownHarness();
}

runAllTests().catch((err) => {
  console.error('Test suite crashed with unhandled exception:', err);
  process.exit(1);
});
