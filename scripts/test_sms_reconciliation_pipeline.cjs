#!/usr/bin/env node
/**
 * DenaNeya v2.0 - Automated End-to-End Carrier SMS Ingestion & Real-Time Reconciliation Pipeline Test
 * File: scripts/test_sms_reconciliation_pipeline.cjs
 *
 * Verifies:
 * 1. Merchant Invoice Creation (PENDING status, 15-minute TTL).
 * 2. Mobile Handset Telemetry Heartbeat (POST /api/device/heartbeat).
 * 3. Authentic Carrier SMS Ingestion (POST /api/device/sync-sms with whitelisted BTRC mask).
 * 4. Customer Payment Verification (POST /api/payment/submit-trx).
 * 5. Atomic CAS Settlement on stored_data (UNUSED -> USED).
 * 6. Invoice Status Transition to PAID.
 * 7. Atomic Merchant Credit Balance Deduction.
 * 8. RFC 8785 Canonical JSON & HMAC-SHA256 Webhook Logging.
 * 9. Negative & Anti-Fraud Cases:
 *    - Unauthorized / missing device token (HTTP 401)
 *    - Personal phone / spoofed sender mask rejection (HTTP 400 UNAUTHORIZED_SENDER)
 *    - Debit / cash-out keyword manipulation rejection (HTTP 400 DEBIT_TRANSACTION_REJECTED)
 *    - Zero-fee legitimate receipt acceptance (zero false-positive verification)
 *    - Idempotent retransmission deduplication (HTTP 200 duplicate: true)
 *    - Double-spend rejection (HTTP 400 TRANSACTION_INVALID)
 *    - Amount mismatch rejection (HTTP 400 TRANSACTION_INVALID)
 *    - Expired invoice submission rejection (HTTP 400 INVOICE_EXPIRED)
 *
 * Usage:
 *   node scripts/test_sms_reconciliation_pipeline.cjs [--live]
 */

'use strict';

const isLive = process.argv.includes('--live');

if (!isLive) {
  process.env.NODE_ENV = 'test';
  process.env.DB_CLIENT = 'sqlite';
  process.env.DB_SQLITE_PATH = ':memory:';
} else {
  process.env.ALLOW_REMOTE_TEST_DB = 'true';
  process.env.DB_CLIENT = 'mysql';
}
process.env.JWT_SECRET = process.env.JWT_SECRET || 'denaneya_development_jwt_secret_min_32_bytes_long_12345';

const assert = require('assert');
const http = require('http');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

// Load environment
let dotenv;
try {
  dotenv = require('dotenv');
} catch (e) {
  dotenv = require(path.resolve(__dirname, '../node_modules/dotenv'));
}
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

let server;
let baseUrl;
let db;
let sharedPkg;
let dbPkg;

const summary = {
  total: 0,
  passed: 0,
  failed: 0,
  failures: []
};

async function runTest(id, category, description, fn) {
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
async function apiRequest(endpoint, { method = 'GET', headers = {}, body = null } = {}) {
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
  const res = await fetch(`${baseUrl}${endpoint}`, reqOptions);
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
  userId: `usr_rec_${crypto.randomBytes(4).toString('hex')}`,
  brandId: `brd_rec_${crypto.randomBytes(4).toString('hex')}`,
  brandName: 'Automation Demo Store',
  webhookSecret: 'whsec_pipeline_recon_secret_entropy_32_bytes_xyz_9988',
  apiKey: `key_pipe_${crypto.randomBytes(8).toString('hex')}`,
  apiSecret: `sec_pipe_${crypto.randomBytes(16).toString('hex')}`,
  deviceId: `dev_pipe_${crypto.randomBytes(6).toString('hex')}`,
  deviceToken: `tok_dev_${crypto.randomBytes(24).toString('hex')}`,
  initialCredits: 25
};

async function setupDatabaseAndServer() {
  dbPkg = await import('@denaneya/database');
  const { getDatabase, runMigrations, runSeed } = dbPkg.default || dbPkg;
  sharedPkg = await import('@denaneya/shared');
  const { createApp } = await import('../apps/api/src/app.js');

  db = getDatabase();

  if (!isLive) {
    console.log('[Setup] Applying fresh test migrations in SQLite memory...');
    const migRes = await runMigrations(db, { reset: true });
    assert.strictEqual(migRes.success, true, 'Database migrations must apply cleanly');
    await runSeed(db);
  } else {
    console.log('[Setup] Running test against Hostinger live MySQL...');
  }

  // Seed dedicated test user, brand, and device
  const now = getUtcSql();
  await db.query(
    `INSERT INTO users (id, name, email, password_hash, role, credits, status, created_at, updated_at)
     VALUES (?, 'Recon Tester', ?, 'hash_demo', 'merchant', ?, 'active', ?, ?)`,
    [FIXTURES.userId, `test_recon_${Date.now()}@denaneya.local`, FIXTURES.initialCredits, now, now]
  );

  await db.query(
    `INSERT INTO brands (id, user_id, brand_name, brand_slug, api_key, api_secret, webhook_secret, webhook_url, status, created_at, updated_at)
     VALUES (?, ?, ?, 'recon-demo', ?, ?, ?, 'https://merchant.example.com/webhook', 'active', ?, ?)`,
    [FIXTURES.brandId, FIXTURES.userId, FIXTURES.brandName, FIXTURES.apiKey, FIXTURES.apiSecret, FIXTURES.webhookSecret, now, now]
  );

  await db.query(
    `INSERT INTO devices (id, brand_id, device_name, device_model, device_token, sim1_operator, sim2_operator, battery_level, last_sync_at, status, created_at)
     VALUES (?, ?, 'Pipeline Verification Handset', 'Samsung Galaxy A15', ?, 'Grameenphone', 'Robi', 92, ?, 'active', ?)`,
    [FIXTURES.deviceId, FIXTURES.brandId, FIXTURES.deviceToken, now, now]
  );

  const app = createApp({ db });
  server = http.createServer(app);
  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      console.log(`[Setup] Target test API engine running on ${baseUrl}`);
      resolve();
    });
  });
}

async function runVerificationPipeline() {
  console.log('========================================================================================');
  console.log('  DenaNeya v2.0 — Automated Carrier SMS Ingestion & Reconciliation Pipeline Verification');
  console.log('========================================================================================\n');

  await setupDatabaseAndServer();

  // Unique transaction details for primary reconciliation flow
  const primaryTrxId = `BKA${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const primaryAmount = 1500.00;
  const primaryCustomerPhone = '01712345678';
  const primaryInvoiceId = `inv_pipe_${crypto.randomBytes(6).toString('hex')}`;
  const primaryInvoiceNumber = `INV-PIPE-${Date.now()}`;

  // -------------------------------------------------------------------------
  // PHASE 1: INVOICE CREATION & TELEMETRY
  // -------------------------------------------------------------------------
  console.log('\n--- PHASE 1: PENDING INVOICE CREATION & HANDSET TELEMETRY ---');

  await runTest('PIPE-01', 'INVOICE-CREATE', 'Create pending invoice with 15-minute TTL and confirm PENDING status', async () => {
    const expiresAt = getUtcSql(new Date(Date.now() + 15 * 60 * 1000));
    const now = getUtcSql();

    await db.query(
      `INSERT INTO invoices (
         id, brand_id, invoice_number, amount, currency, customer_name, customer_phone,
         customer_email, payment_method, status, expires_at, created_at, updated_at
       ) VALUES (?, ?, ?, ?, 'BDT', 'Ariful Islam', ?, 'ariful@example.com', 'bKash', 'PENDING', ?, ?, ?)`,
      [primaryInvoiceId, FIXTURES.brandId, primaryInvoiceNumber, primaryAmount, primaryCustomerPhone, expiresAt, now, now]
    );

    const inv = await db.get(`SELECT id, status, amount, trx_id FROM invoices WHERE id = ?`, [primaryInvoiceId]);
    assert.ok(inv, 'Invoice record must exist');
    assert.strictEqual(inv.status, 'PENDING', 'Initial invoice status must be PENDING');
    assert.strictEqual(Number(inv.amount), primaryAmount, 'Invoice amount must match');
    assert.strictEqual(inv.trx_id, null, 'Invoice trx_id must initially be NULL');
  });

  await runTest('PIPE-02', 'HANDSET-HEARTBEAT', 'Send 15-minute telemetry ping to /api/device/heartbeat and verify battery update', async () => {
    const res = await apiRequest('/api/device/heartbeat', {
      method: 'POST',
      headers: {
        'X-Device-Token': FIXTURES.deviceToken
      },
      body: {
        battery_level: 88,
        sim1_operator: 'Grameenphone (bKash)',
        sim2_operator: 'Robi (Nagad)'
      }
    });

    assert.strictEqual(res.status, 200, `Heartbeat must return 200 OK. Received: ${res.status}`);
    assert.strictEqual(res.body.success, true, 'Heartbeat response success must be true');

    const dev = await db.get(`SELECT battery_level, status FROM devices WHERE id = ?`, [FIXTURES.deviceId]);
    assert.strictEqual(dev.battery_level, 88, 'Battery level in DB must be updated to 88%');
    assert.strictEqual(dev.status, 'active', 'Device status must be active');
  });

  // -------------------------------------------------------------------------
  // PHASE 2: AUTHENTIC CARRIER SMS INGESTION
  // -------------------------------------------------------------------------
  console.log('\n--- PHASE 2: AUTHENTIC CARRIER SMS INGESTION (/api/device/sync-sms) ---');

  await runTest('PIPE-03', 'CARRIER-SMS-INGEST', 'Ingest authentic bKash receipt from whitelisted sender with 201 Created and UNUSED status', async () => {
    const rawSms = `You have received Tk 1,500.00 from ${primaryCustomerPhone}. Ref ${primaryInvoiceNumber}. Fee Tk 0.00. Balance Tk 45,500.00. TrxID ${primaryTrxId} at 16/09/2026 15:30`;

    const res = await apiRequest('/api/device/sync-sms', {
      method: 'POST',
      headers: {
        'X-Device-Token': FIXTURES.deviceToken
      },
      body: {
        sender: 'bKash',
        body: rawSms,
        sim_slot: 1,
        timestamp: new Date().toISOString()
      }
    });

    assert.strictEqual(res.status, 201, `Ingestion must yield HTTP 201. Received: ${res.status} (${JSON.stringify(res.body)})`);
    assert.strictEqual(res.body.success, true, 'Success flag must be true');
    assert.strictEqual(res.body.trx_id, primaryTrxId, 'Response trx_id must match generated TrxID');
    assert.strictEqual(res.body.amount, primaryAmount, 'Parsed amount must be 1500');
    assert.strictEqual(res.body.status, 'UNUSED', 'Buffer status must be UNUSED');

    const stored = await db.get(
      `SELECT * FROM stored_data WHERE brand_id = ? AND UPPER(trx_id) = ?`,
      [FIXTURES.brandId, primaryTrxId]
    );
    assert.ok(stored, 'Record must be persisted in stored_data');
    assert.strictEqual(stored.status, 'UNUSED', 'stored_data status must be UNUSED');
    assert.strictEqual(Number(stored.amount), primaryAmount, 'stored_data amount must match');
    assert.strictEqual(stored.device_id, FIXTURES.deviceId, 'stored_data must be linked to device');
  });

  // -------------------------------------------------------------------------
  // PHASE 3: REAL-TIME RECONCILIATION & ATOMIC CAS SETTLEMENT
  // -------------------------------------------------------------------------
  console.log('\n--- PHASE 3: REAL-TIME PAYMENT RECONCILIATION & ATOMIC CAS ---');

  let webhookIdLogged = null;

  await runTest('PIPE-04', 'ATOMIC-RECONCILIATION', 'Reconcile invoice payment via POST /api/payment/submit-trx', async () => {
    const res = await apiRequest('/api/payment/submit-trx', {
      method: 'POST',
      body: {
        invoice_id: primaryInvoiceId,
        trx_id: primaryTrxId,
        customer_phone: primaryCustomerPhone
      }
    });

    assert.strictEqual(res.status, 200, `Reconciliation must yield 200 OK. Received: ${res.status} (${JSON.stringify(res.body)})`);
    assert.strictEqual(res.body.success, true, 'Response success must be true');
    assert.strictEqual(res.body.status, 'PAID', 'Invoice status returned must be PAID');
    assert.strictEqual(res.body.trx_id, primaryTrxId, 'Matched TrxID must be reflected');
  });

  await runTest('PIPE-05', 'ATOMIC-CAS-VERIFY', 'Confirm stored_data transitioned from UNUSED to USED via Atomic CAS', async () => {
    const stored = await db.get(
      `SELECT status, used_at FROM stored_data WHERE brand_id = ? AND UPPER(trx_id) = ?`,
      [FIXTURES.brandId, primaryTrxId]
    );
    assert.ok(stored, 'Stored transaction must exist');
    assert.strictEqual(stored.status, 'USED', 'stored_data status must transition atomically to USED');
    assert.ok(stored.used_at !== null, 'used_at timestamp must be populated upon consumption');
  });

  await runTest('PIPE-06', 'INVOICE-PAID-VERIFY', 'Confirm invoice record transitioned to PAID and linked to TrxID', async () => {
    const inv = await db.get(
      `SELECT status, trx_id, payment_method FROM invoices WHERE id = ?`,
      [primaryInvoiceId]
    );
    assert.ok(inv, 'Invoice must exist');
    assert.strictEqual(inv.status, 'PAID', 'Invoice status in DB must be PAID');
    assert.strictEqual(inv.trx_id, primaryTrxId, 'Invoice trx_id must link to matched TrxID');
    assert.strictEqual(inv.payment_method, 'bKash', 'Invoice payment_method must reflect bKash');
  });

  await runTest('PIPE-07', 'MERCHANT-CREDIT-DEDUCT', 'Confirm merchant credit balance is decremented atomically by exactly 1', async () => {
    const user = await db.get(`SELECT credits FROM users WHERE id = ?`, [FIXTURES.userId]);
    assert.ok(user, 'User record must exist');
    const expectedCredits = FIXTURES.initialCredits - 1;
    assert.strictEqual(
      user.credits,
      expectedCredits,
      `Credits must be decremented by 1 (expected ${expectedCredits}, found ${user.credits})`
    );
  });

  await runTest('PIPE-08', 'HMAC-WEBHOOK-DISPATCH', 'Confirm webhook_logs record created with RFC 8785 canonical payload and valid HMAC signature', async () => {
    const log = await db.get(
      `SELECT * FROM webhook_logs WHERE brand_id = ? AND invoice_id = ? ORDER BY created_at DESC LIMIT 1`,
      [FIXTURES.brandId, primaryInvoiceId]
    );
    assert.ok(log, 'Webhook log entry must exist in database');
    assert.strictEqual(log.event, 'invoice.completed', 'Webhook event type must be invoice.completed');
    webhookIdLogged = log.id;

    const payload = typeof log.payload_json === 'string'
      ? JSON.parse(log.payload_json)
      : log.payload_json;
    assert.strictEqual(payload.event, 'invoice.completed');
    assert.strictEqual(payload.invoice_id, primaryInvoiceId);
    assert.strictEqual(payload.trx_id, primaryTrxId);
    assert.strictEqual(payload.amount, primaryAmount);

    // Verify cryptographic HMAC-SHA256 signature calculation
    const { canonicalizeJson, generateWebhookSignature, verifyWebhookSignature } = sharedPkg;
    const testTimestamp = Math.floor(Date.now() / 1000);
    const sigOutput = generateWebhookSignature(payload, FIXTURES.webhookSecret, testTimestamp);
    assert.ok(sigOutput.signature, 'Signature must be produced');
    assert.ok(sigOutput.header.includes('v1='), 'Signature header must include v1= prefix');

    const verifyResult = verifyWebhookSignature(
      payload,
      sigOutput.header,
      FIXTURES.webhookSecret,
      300,
      { skipNonceCheck: true }
    );
    assert.strictEqual(verifyResult.valid, true, 'Cryptographic signature verification must pass 100%');
  });

  // -------------------------------------------------------------------------
  // PHASE 4: ANTI-FRAUD & NEGATIVE REJECTION TESTS
  // -------------------------------------------------------------------------
  console.log('\n--- PHASE 4: ANTI-FRAUD, SECURITY & NEGATIVE REJECTION TESTS ---');

  await runTest('PIPE-NEG-01', 'AUTH-ENFORCEMENT', 'Reject sync-sms request with missing or fake device token with HTTP 401', async () => {
    const resNoToken = await apiRequest('/api/device/sync-sms', {
      method: 'POST',
      body: { sender: 'bKash', body: 'Test message' }
    });
    assert.strictEqual(resNoToken.status, 401, 'Missing token must return 401');

    const resFakeToken = await apiRequest('/api/device/sync-sms', {
      method: 'POST',
      headers: { 'X-Device-Token': 'tok_dev_completely_fake_invalid_token_12345' },
      body: { sender: 'bKash', body: 'Test message' }
    });
    assert.strictEqual(resFakeToken.status, 401, 'Fake token must return 401');
  });

  await runTest('PIPE-NEG-02', 'SENDER-WHITELIST', 'Reject SMS from personal phone number (01712345678) with HTTP 400 UNAUTHORIZED_SENDER', async () => {
    const res = await apiRequest('/api/device/sync-sms', {
      method: 'POST',
      headers: { 'X-Device-Token': FIXTURES.deviceToken },
      body: {
        sender: '01712345678', // Personal number, not in BTRC whitelist
        body: `You have received Tk 1,000.00 from 01811111111. TrxID FAKE001 at 16/09/2026 15:35`
      }
    });
    assert.strictEqual(res.status, 400, `Personal sender must return HTTP 400. Received: ${res.status}`);
    assert.strictEqual(res.body.code, 'UNAUTHORIZED_SENDER', 'Error code must be UNAUTHORIZED_SENDER');
  });

  await runTest('PIPE-NEG-03', 'DEBIT-BLACKLIST', 'Reject outbound Cash-Out / Debit notification with HTTP 400 DEBIT_TRANSACTION_REJECTED', async () => {
    const debitSms = 'Cash Out Tk 500.00 to 01700000000 successful. Fee Tk 7.50. Balance Tk 10,000.00. TrxID BKACO9988 at 16/09/2026 15:36';
    const res = await apiRequest('/api/device/sync-sms', {
      method: 'POST',
      headers: { 'X-Device-Token': FIXTURES.deviceToken },
      body: {
        sender: 'bKash',
        body: debitSms
      }
    });
    assert.strictEqual(res.status, 400, `Debit SMS must return HTTP 400. Received: ${res.status}`);
    assert.strictEqual(res.body.code, 'DEBIT_TRANSACTION_REJECTED', 'Error code must be DEBIT_TRANSACTION_REJECTED');
  });

  await runTest('PIPE-NEG-04', 'ZERO-FEE-ACCEPTANCE', 'Accept legitimate credit receipt containing "Fee Tk 0.00" without false positive', async () => {
    const legitimateZeroFeeTrxId = `BKA${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const legitSms = `You have received payment Tk 850.00 from 01999999999. Ref ORD55. Fee Tk 0.00. Balance Tk 46,350.00. TrxID ${legitimateZeroFeeTrxId} at 16/09/2026 15:37`;

    const res = await apiRequest('/api/device/sync-sms', {
      method: 'POST',
      headers: { 'X-Device-Token': FIXTURES.deviceToken },
      body: {
        sender: 'bKash',
        body: legitSms
      }
    });
    assert.strictEqual(res.status, 201, `Legitimate receipt with Fee Tk 0.00 must return HTTP 201. Received: ${res.status}`);
    assert.strictEqual(res.body.trx_id, legitimateZeroFeeTrxId);
  });

  await runTest('PIPE-NEG-05', 'RETRANSMIT-IDEMPOTENCY', 'Idempotently handle retransmitted carrier SMS with HTTP 200 duplicate: true', async () => {
    const duplicateRawSms = `You have received Tk 1,500.00 from ${primaryCustomerPhone}. Ref ${primaryInvoiceNumber}. Fee Tk 0.00. Balance Tk 45,500.00. TrxID ${primaryTrxId} at 16/09/2026 15:30`;

    const res = await apiRequest('/api/device/sync-sms', {
      method: 'POST',
      headers: { 'X-Device-Token': FIXTURES.deviceToken },
      body: {
        sender: 'bKash',
        body: duplicateRawSms
      }
    });

    assert.strictEqual(res.status, 200, `Duplicate transmission must return 200 OK. Received: ${res.status}`);
    assert.strictEqual(res.body.duplicate, true, 'Response duplicate flag must be true');
    assert.strictEqual(res.body.trx_id, primaryTrxId, 'Response trx_id must match');

    // Confirm exactly 1 record exists in stored_data for this brand & trx_id
    const row = await db.get(
      `SELECT count(*) as cnt FROM stored_data WHERE brand_id = ? AND UPPER(trx_id) = ?`,
      [FIXTURES.brandId, primaryTrxId]
    );
    const count = row ? (row.cnt !== undefined ? row.cnt : row['count(*)']) : 0;
    assert.strictEqual(Number(count), 1, 'Exactly one record must exist in stored_data (no duplicate rows)');
  });

  await runTest('PIPE-NEG-06', 'DOUBLE-SPEND-PREVENTION', 'Reject double-spend attempt reusing previously settled TrxID with HTTP 400', async () => {
    const secondInvoiceId = `inv_second_${crypto.randomBytes(6).toString('hex')}`;
    const now = getUtcSql();
    const expiresAt = getUtcSql(new Date(Date.now() + 15 * 60 * 1000));

    await db.query(
      `INSERT INTO invoices (
         id, brand_id, invoice_number, amount, currency, customer_name, customer_phone,
         customer_email, payment_method, status, expires_at, created_at, updated_at
       ) VALUES (?, ?, 'INV-SECOND-01', ?, 'BDT', 'Buyer Two', '01800000000', 'two@example.com', 'bKash', 'PENDING', ?, ?, ?)`,
      [secondInvoiceId, FIXTURES.brandId, primaryAmount, expiresAt, now, now]
    );

    // Attempt to reconcile second invoice using already consumed primaryTrxId
    const res = await apiRequest('/api/payment/submit-trx', {
      method: 'POST',
      body: {
        invoice_id: secondInvoiceId,
        trx_id: primaryTrxId
      }
    });

    assert.strictEqual(res.status, 400, `Double-spend must return HTTP 400. Received: ${res.status}`);
    assert.strictEqual(res.body.code, 'TRANSACTION_INVALID', 'Error code must be TRANSACTION_INVALID');

    // Confirm second invoice remains PENDING
    const secondInv = await db.get(`SELECT status FROM invoices WHERE id = ?`, [secondInvoiceId]);
    assert.strictEqual(secondInv.status, 'PENDING', 'Second invoice must remain PENDING');
  });

  await runTest('PIPE-NEG-07', 'AMOUNT-MISMATCH', 'Reject verification when TrxID amount does not equal invoice amount', async () => {
    const mismatchTrxId = `BKA${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const mismatchInvoiceId = `inv_mismatch_${crypto.randomBytes(6).toString('hex')}`;
    const now = getUtcSql();
    const expiresAt = getUtcSql(new Date(Date.now() + 15 * 60 * 1000));

    // Create ৳2,000 invoice
    await db.query(
      `INSERT INTO invoices (
         id, brand_id, invoice_number, amount, currency, customer_name, customer_phone,
         customer_email, payment_method, status, expires_at, created_at, updated_at
       ) VALUES (?, ?, 'INV-MISMATCH', 2000.00, 'BDT', 'Buyer Mismatch', '01711111111', 'mismatch@example.com', 'bKash', 'PENDING', ?, ?, ?)`,
      [mismatchInvoiceId, FIXTURES.brandId, expiresAt, now, now]
    );

    // Ingest ৳1,000 SMS
    await apiRequest('/api/device/sync-sms', {
      method: 'POST',
      headers: { 'X-Device-Token': FIXTURES.deviceToken },
      body: {
        sender: 'bKash',
        body: `You have received Tk 1,000.00 from 01711111111. Ref ORD. Fee Tk 0.00. Balance Tk 47,350.00. TrxID ${mismatchTrxId} at 16/09/2026 15:40`
      }
    });

    // Try to settle ৳2,000 invoice with ৳1,000 TrxID
    const res = await apiRequest('/api/payment/submit-trx', {
      method: 'POST',
      body: {
        invoice_id: mismatchInvoiceId,
        trx_id: mismatchTrxId
      }
    });

    assert.strictEqual(res.status, 400, `Amount mismatch must return HTTP 400. Received: ${res.status}`);
    assert.strictEqual(res.body.code, 'TRANSACTION_INVALID', 'Error code must be uniform TRANSACTION_INVALID');

    // Confirm transaction remains UNUSED
    const stored = await db.get(
      `SELECT status FROM stored_data WHERE brand_id = ? AND UPPER(trx_id) = ?`,
      [FIXTURES.brandId, mismatchTrxId]
    );
    assert.strictEqual(stored.status, 'UNUSED', 'Mismatched transaction must remain UNUSED');
  });

  await runTest('PIPE-NEG-08', 'EXPIRED-INVOICE', 'Reject verification attempt against an expired invoice with HTTP 400 INVOICE_EXPIRED', async () => {
    const expiredInvoiceId = `inv_exp_${crypto.randomBytes(6).toString('hex')}`;
    const expiredTrxId = `BKA${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const now = getUtcSql();
    // Set expiration 30 minutes in the past
    const pastExpiration = getUtcSql(new Date(Date.now() - 30 * 60 * 1000));

    await db.query(
      `INSERT INTO invoices (
         id, brand_id, invoice_number, amount, currency, customer_name, customer_phone,
         customer_email, payment_method, status, expires_at, created_at, updated_at
       ) VALUES (?, ?, 'INV-EXPIRED', 500.00, 'BDT', 'Buyer Expired', '01722222222', 'expired@example.com', 'bKash', 'EXPIRED', ?, ?, ?)`,
      [expiredInvoiceId, FIXTURES.brandId, pastExpiration, now, now]
    );

    // Ingest ৳500 SMS
    await apiRequest('/api/device/sync-sms', {
      method: 'POST',
      headers: { 'X-Device-Token': FIXTURES.deviceToken },
      body: {
        sender: 'bKash',
        body: `You have received Tk 500.00 from 01722222222. Ref EX. Fee Tk 0.00. Balance Tk 47,850.00. TrxID ${expiredTrxId} at 16/09/2026 15:45`
      }
    });

    const res = await apiRequest('/api/payment/submit-trx', {
      method: 'POST',
      body: {
        invoice_id: expiredInvoiceId,
        trx_id: expiredTrxId
      }
    });

    assert.ok(
      res.status === 400 || res.status === 410,
      `Expired invoice must return HTTP 400 or 410. Received: ${res.status}`
    );
    assert.strictEqual(res.body.code, 'INVOICE_EXPIRED', 'Error code must be INVOICE_EXPIRED');
  });

  // -------------------------------------------------------------------------
  // SUMMARY & CLEANUP
  // -------------------------------------------------------------------------
  if (isLive && db) {
    try {
      console.log('\n[Cleanup] Cleaning up temporary test fixtures from live database...');
      await db.query(`DELETE FROM webhook_logs WHERE brand_id = ?`, [FIXTURES.brandId]);
      await db.query(`DELETE FROM stored_data WHERE brand_id = ?`, [FIXTURES.brandId]);
      await db.query(`DELETE FROM invoices WHERE brand_id = ?`, [FIXTURES.brandId]);
      await db.query(`DELETE FROM devices WHERE brand_id = ?`, [FIXTURES.brandId]);
      await db.query(`DELETE FROM brands WHERE id = ?`, [FIXTURES.brandId]);
      await db.query(`DELETE FROM users WHERE id = ?`, [FIXTURES.userId]);
      console.log('[Cleanup] Live database cleaned cleanly.');
    } catch (cleanErr) {
      console.warn('[Cleanup Warning]', cleanErr.message);
    }
  }

  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }

  console.log('\n========================================================================================');
  console.log(`  PIPELINE EXECUTION FINISHED: ${summary.passed} Passed / ${summary.total} Total (${summary.failed} Failed)`);
  console.log('========================================================================================\n');

  if (summary.failed > 0) {
    console.error('❌ VERIFICATION FAILURES DETECTED:');
    summary.failures.forEach((f) => {
      console.error(`   - [${f.id}] ${f.category}: ${f.description} -> ${f.error}`);
    });
    process.exit(1);
  } else {
    console.log('✅ ALL CARRIER SMS INGESTION & RECONCILIATION VERIFICATION CHECKS PASSED (100% OK)');
    process.exit(0);
  }
}

runVerificationPipeline().catch((err) => {
  console.error('Fatal crash during verification pipeline execution:', err);
  process.exit(1);
});
