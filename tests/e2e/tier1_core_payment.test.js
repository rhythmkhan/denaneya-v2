/**
 * DenaNeya v2.0 - E2E Test Suite Tier 1: Core Payment Ingestion & Reconciliation
 * File: tests/e2e/tier1_core_payment.test.js
 * Architect: Milestone 5 Explorer 1 (E2E Core Payment & Concurrency Test Architect)
 *
 * Scope:
 * 1. SMS Sync from Paired Android Devices (POST /api/device/sync-sms):
 *    - Token authentication enforcement (missing header, invalid token)
 *    - Single SMS carrier ingestion with 201 Created and UNUSED status
 *    - Batch multi-SMS ingestion with array of receipts
 *    - Handset status and last_sync_at telemetry tracking
 *    - Idempotent duplicate SMS deduplication
 * 2. Alphanumeric Telecom Sender Whitelisting:
 *    - Acceptance of authentic BTRC masks (bKash, 16216, Nagad, 16222, Upay)
 *    - Case-insensitive mask evaluation (BKASH, bkash, NAGAD, upay)
 *    - Strict rejection of unauthorized/spoofed sender masks
 * 3. Regex Parser Validation across 4 MFS Providers:
 *    - bKash directional credit parsing
 *    - Nagad directional credit parsing
 *    - DBBL Rocket (16216) directional credit parsing
 *    - UCB Upay directional credit parsing
 *    - Corrupted/unparseable credit notification rejection (HTTP 422)
 * 4. Single-Transaction Reconciliation (Hosted Checkout & S2S API):
 *    - POST /api/payment/submit-trx (Atomic CAS, status PAID, credit deduction, webhook queue)
 *    - Parametrized endpoint POST /api/invoices/:id/verify
 *    - S2S 2-Step API Step 1: POST /v1/trx/verify (credit deduction, status remains UNUSED)
 *    - S2S 2-Step API Step 2: POST /v1/trx/confirm (commits to USED)
 *    - Unauthenticated S2S API rejection (HTTP 401)
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

const { getDatabase, runMigrations, runSeed } = dbPkg;

console.log('===============================================================================');
console.log('  DenaNeya v2.0 - Tier 1: Core Payment Ingestion & Reconciliation Test Suite  ');
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

function getUtcSql(date = new Date()) {
  return date.toISOString().replace('T', ' ').substring(0, 19);
}

const FIXTURES = {
  merchantUser: 'usr_tier1_merchant',
  brand: 'brand_tier1_main',
  apiKey: 'api_key_tier1_987654321012345678',
  apiSecret: 'api_secret_tier1_98765432101234567890123456789012',
  deviceToken: 'tok_dev_tier1_android_handset_alpha_99',
  deviceId: 'dev_tier1_android_01'
};

async function setupDatabase() {
  db = getDatabase();
  const migRes = await runMigrations(db, { reset: true });
  assert.strictEqual(migRes.success, true, 'Database migrations must apply cleanly');
  await runSeed(db);

  // Seed dedicated fixtures for Tier 1 tests
  await db.query(`DELETE FROM users WHERE id = ?`, [FIXTURES.merchantUser]);
  await db.query(`DELETE FROM brands WHERE id = ?`, [FIXTURES.brand]);

  await db.query(
    `INSERT INTO users (id, name, email, password_hash, role, credits, status)
     VALUES (?, 'Tier 1 Merchant', 'tier1_merchant@example.com', 'hash_pw', 'merchant', 100, 'active')`,
    [FIXTURES.merchantUser]
  );

  await db.query(
    `INSERT INTO brands (id, user_id, brand_name, brand_slug, api_key, api_secret, webhook_url, webhook_secret, status)
     VALUES (?, ?, 'Tier 1 Merchant Brand', 'tier1-merchant-brand', ?, ?, 'https://merchant.example/webhook', 'sec_webhook_tier1_32_bytes_long_key', 'active')`,
    [FIXTURES.brand, FIXTURES.merchantUser, FIXTURES.apiKey, FIXTURES.apiSecret]
  );

  await db.query(
    `INSERT INTO devices (id, brand_id, device_name, device_model, device_token, sim1_operator, sim2_operator, battery_level, status)
     VALUES (?, ?, 'Test Handset Samsung S22', 'SM-S901B', ?, 'Grameenphone', 'Robi', 88, 'active')`,
    [FIXTURES.deviceId, FIXTURES.brand, FIXTURES.deviceToken]
  );
}

async function runTier1Suite() {
  await setupDatabase();

  const app = createApp();
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
  console.log(`[Setup] Target test server running on ${baseUrl}\n`);

  // ===========================================================================
  // SECTION 1: SMS SYNC FROM PAIRED ANDROID DEVICES
  // ===========================================================================
  console.log('--- SECTION 1: SMS Sync from Paired Android Devices ---');

  await test(
    'T1-SMS-01',
    'SMS-AUTH',
    'Reject sync-sms request missing device-api-key header with HTTP 401 UNAUTHORIZED_DEVICE',
    async () => {
      const res = await apiRequest('/api/device/sync-sms', {
        method: 'POST',
        body: {
          sender: 'bKash',
          message: 'You have received Tk 500.00 from 01712345678. Fee Tk 0.00. Balance Tk 5,500.00. TrxID BKAUTH001 at 16/09/2026 14:00'
        }
      });
      assert.strictEqual(res.status, 401, 'Should reject with 401');
      assert.strictEqual(res.body.code, 'UNAUTHORIZED_DEVICE');
    }
  );

  await test(
    'T1-SMS-02',
    'SMS-AUTH',
    'Reject sync-sms request with invalid/forged device-api-key with HTTP 401 INVALID_DEVICE_TOKEN',
    async () => {
      const res = await apiRequest('/api/device/sync-sms', {
        method: 'POST',
        headers: { 'device-api-key': 'tok_dev_forged_unregistered_token' },
        body: {
          sender: 'bKash',
          message: 'You have received Tk 500.00 from 01712345678. Fee Tk 0.00. Balance Tk 5,500.00. TrxID BKAUTH002 at 16/09/2026 14:00'
        }
      });
      assert.strictEqual(res.status, 401, 'Should reject with 401');
      assert.strictEqual(res.body.code, 'INVALID_DEVICE_TOKEN');
    }
  );

  await test(
    'T1-SMS-03',
    'SMS-INGEST',
    'Successfully ingest single authentic bKash receipt from paired handset with HTTP 201',
    async () => {
      const trxId = 'BKTIER10001';
      const rawSms = `You have received Tk 1,250.00 from 01712345678. Ref Invoice-101. Fee Tk 0.00. Balance Tk 15,250.00. TrxID ${trxId} at 16/09/2026 14:20`;

      const res = await apiRequest('/api/device/sync-sms', {
        method: 'POST',
        headers: { 'device-api-key': FIXTURES.deviceToken },
        body: {
          sender: 'bKash',
          message: rawSms,
          sim_slot: 1,
          timestamp: new Date().toISOString()
        }
      });

      assert.strictEqual(res.status, 201, `Expected HTTP 201, got ${res.status}`);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.ingested, 1);
      assert.strictEqual(res.body.trx_id, trxId);
      assert.strictEqual(res.body.amount, 1250);
      assert.strictEqual(res.body.amount_paisa, 125000);
      assert.strictEqual(res.body.status, 'UNUSED');

      // Verify database record
      const record = await db.get('SELECT * FROM stored_data WHERE brand_id = ? AND trx_id = ?', [FIXTURES.brand, trxId]);
      assert(record, 'Record must exist in stored_data');
      assert.strictEqual(record.status, 'UNUSED');
      assert.strictEqual(Number(record.amount), 1250);
      assert.strictEqual(record.channel, 'bKash');
    }
  );

  await test(
    'T1-SMS-04',
    'SMS-BATCH',
    'Successfully ingest batch multi-SMS array (bKash, Nagad, Rocket) in single payload',
    async () => {
      const batchPayload = {
        messages: [
          {
            sender: 'bKash',
            message: 'You have received Tk 200.00 from 01711111111. Ref Order1. Fee Tk 0.00. Balance Tk 1,000.00. TrxID BKBATCH001 at 16/09/2026 14:21',
            sim_slot: 1
          },
          {
            sender: 'Nagad',
            message: 'Money Received. Amount: Tk 350.00. Sender: 01922222222. Ref: Order2. TxnID: NGBATCH002. Date: 16/09/2026 14:22',
            sim_slot: 2
          },
          {
            sender: '16216',
            message: 'Tk 450.00 received from 01833333333 to A/C 018333333339. Fee Tk 0.00, Balance Tk 5,000.00. TxnId: RKBATCH003 on 16-Sep-2026 14:23',
            sim_slot: 1
          }
        ]
      };

      const res = await apiRequest('/api/device/sync-sms', {
        method: 'POST',
        headers: { 'device-api-key': FIXTURES.deviceToken },
        body: batchPayload
      });

      assert.strictEqual(res.status, 200, 'Batch should return HTTP 200');
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.ingested, 3);
      assert.strictEqual(res.body.duplicates, 0);

      // Verify all 3 in DB
      for (const t of ['BKBATCH001', 'NGBATCH002', 'RKBATCH003']) {
        const stored = await db.get('SELECT * FROM stored_data WHERE brand_id = ? AND trx_id = ?', [FIXTURES.brand, t]);
        assert(stored, `Transaction ${t} must be stored in DB`);
        assert.strictEqual(stored.status, 'UNUSED');
      }
    }
  );

  await test(
    'T1-SMS-05',
    'SMS-TELEMETRY',
    'Device sync timestamp (last_sync_at) and status = active updated upon successful sync',
    async () => {
      const devBefore = await db.get('SELECT last_sync_at, status FROM devices WHERE id = ?', [FIXTURES.deviceId]);

      await apiRequest('/api/device/sync-sms', {
        method: 'POST',
        headers: { 'device-api-key': FIXTURES.deviceToken },
        body: {
          sender: 'bKash',
          message: 'You have received Tk 100.00 from 01799999999. Fee Tk 0.00. Balance Tk 600.00. TrxID BKTELEM01 at 16/09/2026 14:25'
        }
      });

      const devAfter = await db.get('SELECT last_sync_at, status FROM devices WHERE id = ?', [FIXTURES.deviceId]);
      assert.strictEqual(devAfter.status, 'active');
      assert(devAfter.last_sync_at, 'last_sync_at must be populated');
    }
  );

  await test(
    'T1-SMS-06',
    'SMS-IDEMPOTENCY',
    'Idempotent duplicate SMS delivery returns HTTP 200 with duplicate: true and zero duplicate records',
    async () => {
      const dupTrx = 'BKDUP0001';
      const msg = `You have received Tk 500.00 from 01712345678. Fee Tk 0.00. Balance Tk 5,500.00. TrxID ${dupTrx} at 16/09/2026 14:30`;

      // Delivery 1
      const res1 = await apiRequest('/api/device/sync-sms', {
        method: 'POST',
        headers: { 'device-api-key': FIXTURES.deviceToken },
        body: { sender: 'bKash', message: msg }
      });
      assert.strictEqual(res1.status, 201);

      // Delivery 2 (Re-transmitted by device)
      const res2 = await apiRequest('/api/device/sync-sms', {
        method: 'POST',
        headers: { 'device-api-key': FIXTURES.deviceToken },
        body: { sender: 'bKash', message: msg }
      });
      assert.strictEqual(res2.status, 200, 'Duplicate delivery should return HTTP 200');
      assert.strictEqual(res2.body.duplicate, true);
      assert.strictEqual(res2.body.ingested, 0);
      assert.strictEqual(res2.body.trx_id, dupTrx);

      // Verify exactly 1 record exists in DB
      const countRes = await db.get(
        'SELECT count(*) as total FROM stored_data WHERE brand_id = ? AND trx_id = ?',
        [FIXTURES.brand, dupTrx]
      );
      assert.strictEqual(Number(countRes.total), 1, 'Exactly 1 record must exist in DB');
    }
  );

  // ===========================================================================
  // SECTION 2: ALPHANUMERIC SENDER WHITELISTS
  // ===========================================================================
  console.log('\n--- SECTION 2: Alphanumeric Sender Whitelisting ---');

  const approvedSenders = [
    { sender: 'bKash', label: 'Canonical bKash mask' },
    { sender: '16216', label: 'Rocket official shortcode' },
    { sender: 'Nagad', label: 'Canonical Nagad mask' },
    { sender: '16222', label: 'Nagad alternative shortcode' },
    { sender: 'Upay', label: 'Canonical Upay mask' }
  ];

  for (const item of approvedSenders) {
    await test(
      `T1-WHT-${item.sender}`,
      'SENDER-WHITELIST',
      `Accept authentic BTRC sender mask: '${item.sender}' (${item.label})`,
      async () => {
        const trxId = `TRXWHT${item.sender.toUpperCase().replace(/[^A-Za-z0-9]/g, '')}${Math.floor(Math.random() * 9000 + 1000)}`;
        let msg = '';
        if (item.sender === 'bKash') {
          msg = `You have received Tk 300.00 from 01712345678. Fee Tk 0.00. Balance Tk 3,000.00. TrxID ${trxId} at 16/09/2026 14:00`;
        } else if (item.sender === '16216') {
          msg = `Tk 300.00 received from 01712345678 to A/C 017123456789. Fee Tk 0.00, Balance Tk 3,000.00. TxnId: ${trxId} on 16-Sep-2026 14:00`;
        } else if (item.sender === 'Nagad' || item.sender === '16222') {
          msg = `Money Received. Amount: Tk 300.00. Sender: 01912345678. Ref: WHT. TxnID: ${trxId}. Date: 16/09/2026 14:00`;
        } else {
          msg = `You have received Tk 300.00 from 01512345678. Ref: WHT. TrxID: ${trxId} at 16/09/2026 14:00. Balance: Tk 3,000.00`;
        }

        const res = await apiRequest('/api/device/sync-sms', {
          method: 'POST',
          headers: { 'device-api-key': FIXTURES.deviceToken },
          body: { sender: item.sender, message: msg }
        });

        assert.strictEqual(res.status, 201, `Sender ${item.sender} should be accepted with 201`);
        assert.strictEqual(res.body.success, true);
        assert.strictEqual(res.body.trx_id, trxId.toUpperCase());
      }
    );
  }

  await test(
    'T1-WHT-CASE',
    'SENDER-WHITELIST',
    'Sender whitelist is case-insensitive (e.g., BKASH, bkash, NAGAD, upay)',
    async () => {
      const testCases = [
        { sender: 'BKASH', trx: 'BKCASE01', msg: 'You have received Tk 250.00 from 01712345678. Fee Tk 0.00. Balance Tk 1,000.00. TrxID BKCASE01 at 16/09/2026 14:00' },
        { sender: 'bkash', trx: 'BKCASE02', msg: 'You have received Tk 250.00 from 01712345678. Fee Tk 0.00. Balance Tk 1,000.00. TrxID BKCASE02 at 16/09/2026 14:00' },
        { sender: 'NAGAD', trx: 'NGCASE03', msg: 'Money Received. Amount: Tk 250.00. Sender: 01912345678. Ref: C. TxnID: NGCASE03. Date: 16/09/2026 14:00' },
        { sender: 'upay',  trx: 'UPCASE04', msg: 'You have received Tk 250.00 from 01512345678. Ref: C. TrxID: UPCASE04 at 16/09/2026 14:00. Balance: Tk 1,000.00' }
      ];

      for (const tc of testCases) {
        const res = await apiRequest('/api/device/sync-sms', {
          method: 'POST',
          headers: { 'device-api-key': FIXTURES.deviceToken },
          body: { sender: tc.sender, message: tc.msg }
        });
        assert.strictEqual(res.status, 201, `Sender '${tc.sender}' should be accepted via case normalization`);
      }
    }
  );

  await test(
    'T1-WHT-REJECT',
    'SENDER-WHITELIST',
    'Reject non-whitelisted sender masks (SureCash, bKashOTP, 16217, NagadAlert) with HTTP 400',
    async () => {
      const invalidSenders = ['SureCash', 'bKashOTP', '16217', 'NagadAlert', 'RocketPromo'];
      for (const s of invalidSenders) {
        const res = await apiRequest('/api/device/sync-sms', {
          method: 'POST',
          headers: { 'device-api-key': FIXTURES.deviceToken },
          body: {
            sender: s,
            message: 'You have received Tk 500.00 from 01712345678. Fee Tk 0.00. Balance Tk 5,500.00. TrxID INVLD001 at 16/09/2026 14:00'
          }
        });
        assert.strictEqual(res.status, 400, `Sender '${s}' must be rejected with 400`);
        assert.strictEqual(res.body.code, 'UNAUTHORIZED_SENDER');
      }
    }
  );

  // ===========================================================================
  // SECTION 3: REGEX PARSER VALIDATION FOR ALL 4 MFS PROVIDERS
  // ===========================================================================
  console.log('\n--- SECTION 3: Regex Parser Validation for 4 MFS Providers ---');

  await test(
    'T1-PARSE-BKASH',
    'MFS-PARSER',
    'bKash parser extracts amount, amount_paisa, trxId, customer_mobile, and ref',
    async () => {
      const trxId = 'BKMFS9911';
      const rawSms = `You have received payment Tk 1,750.50 from 01812345678. Ref Invoice-509. Fee Tk 0.00. Balance Tk 25,750.50. TrxID ${trxId} at 16/09/2026 15:30`;

      const res = await apiRequest('/api/device/sync-sms', {
        method: 'POST',
        headers: { 'device-api-key': FIXTURES.deviceToken },
        body: { sender: 'bKash', message: rawSms }
      });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.provider, 'bKash');
      assert.strictEqual(res.body.trx_id, trxId);
      assert.strictEqual(res.body.amount, 1750.5);
      assert.strictEqual(res.body.amount_paisa, 175050);
      assert.strictEqual(res.body.customer_mobile, '01812345678');
      assert.strictEqual(res.body.sms_ref, 'Invoice-509');
    }
  );

  await test(
    'T1-PARSE-NAGAD',
    'MFS-PARSER',
    'Nagad parser extracts amount, amount_paisa, trxId, customer_mobile, and ref',
    async () => {
      const trxId = 'NGMFS8822';
      const rawSms = `Money Received. Amount: Tk 3,450.00. Sender: 01987654321. Ref: Order-77. TxnID: ${trxId}. Date: 16/09/2026 16:45`;

      const res = await apiRequest('/api/device/sync-sms', {
        method: 'POST',
        headers: { 'device-api-key': FIXTURES.deviceToken },
        body: { sender: 'Nagad', message: rawSms }
      });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.provider, 'Nagad');
      assert.strictEqual(res.body.trx_id, trxId);
      assert.strictEqual(res.body.amount, 3450);
      assert.strictEqual(res.body.amount_paisa, 345000);
      assert.strictEqual(res.body.customer_mobile, '01987654321');
      assert.strictEqual(res.body.sms_ref, 'Order-77');
    }
  );

  await test(
    'T1-PARSE-ROCKET',
    'MFS-PARSER',
    'DBBL Rocket (16216) parser extracts amount, amount_paisa, trxId, and customer_mobile',
    async () => {
      const trxId = 'RKMFS7733';
      const rawSms = `Tk 2,100.00 received from 01755555555 to A/C 017555555559. Fee Tk 0.00, Balance Tk 30,000.00. TxnId: ${trxId} on 16-Sep-2026 17:00`;

      const res = await apiRequest('/api/device/sync-sms', {
        method: 'POST',
        headers: { 'device-api-key': FIXTURES.deviceToken },
        body: { sender: '16216', message: rawSms }
      });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.provider, 'Rocket');
      assert.strictEqual(res.body.trx_id, trxId);
      assert.strictEqual(res.body.amount, 2100);
      assert.strictEqual(res.body.amount_paisa, 210000);
      assert.strictEqual(res.body.customer_mobile, '01755555555');
    }
  );

  await test(
    'T1-PARSE-UPAY',
    'MFS-PARSER',
    'UCB Upay parser extracts amount, amount_paisa, trxId, customer_mobile, and ref',
    async () => {
      const trxId = 'UPMFS6644';
      const rawSms = `You have received Tk 920.00 from 01544444444. Ref: UpayRef1. TrxID: ${trxId} at 16/09/2026 18:10. Balance: Tk 14,920.00`;

      const res = await apiRequest('/api/device/sync-sms', {
        method: 'POST',
        headers: { 'device-api-key': FIXTURES.deviceToken },
        body: { sender: 'Upay', message: rawSms }
      });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.provider, 'Upay');
      assert.strictEqual(res.body.trx_id, trxId);
      assert.strictEqual(res.body.amount, 920);
      assert.strictEqual(res.body.amount_paisa, 92000);
      assert.strictEqual(res.body.customer_mobile, '01544444444');
      assert.strictEqual(res.body.sms_ref, 'UpayRef1');
    }
  );

  await test(
    'T1-PARSE-FAIL',
    'MFS-PARSER',
    'Reject malformed or non-receipt text from whitelisted sender with HTTP 422',
    async () => {
      const res = await apiRequest('/api/device/sync-sms', {
        method: 'POST',
        headers: { 'device-api-key': FIXTURES.deviceToken },
        body: {
          sender: 'bKash',
          message: 'bKash offers 10% cashback on online grocery shopping this Friday. Dial *247# to learn more.'
        }
      });

      assert.strictEqual(res.status, 422, 'Non-credit message should return 422');
      assert.strictEqual(res.body.code, 'PARSING_FAILED');
    }
  );

  // ===========================================================================
  // SECTION 4: SINGLE-TRANSACTION VERIFICATION & RECONCILIATION
  // ===========================================================================
  console.log('\n--- SECTION 4: Single-Transaction Verification & Reconciliation ---');

  await test(
    'T1-VER-HOSTED',
    'RECONCILIATION',
    'POST /api/payment/submit-trx transitions invoice to PAID, consumes stored_data to USED, decrements credit, enqueues webhook',
    async () => {
      const trxId = 'BKRECON001';
      const amount = 850.00;
      const invoiceId = 'inv_t1_recon_01';
      const initialCredits = 100;

      // Seed merchant credit
      await db.query('UPDATE users SET credits = ? WHERE id = ?', [initialCredits, FIXTURES.merchantUser]);

      // Ingest authentic transaction
      await db.query(
        `INSERT INTO stored_data (id, brand_id, sender, raw_sms, channel, trx_id, amount, status, sim_slot)
         VALUES ('str_t1_01', ?, 'bKash', 'You have received Tk 850.00', 'bKash', ?, ?, 'UNUSED', 1)`,
        [FIXTURES.brand, trxId, amount]
      );

      // Create pending invoice
      const expiresAt = getUtcSql(new Date(Date.now() + 15 * 60 * 1000));
      await db.query(
        `INSERT INTO invoices (id, brand_id, invoice_number, customer_name, customer_phone, amount, currency, status, expires_at)
         VALUES (?, ?, 'INV-T1-01', 'Alice Johnson', '01700112233', ?, 'BDT', 'PENDING', ?)`,
        [invoiceId, FIXTURES.brand, amount, expiresAt]
      );

      // Submit payment reconciliation
      const res = await apiRequest('/api/payment/submit-trx', {
        method: 'POST',
        body: {
          invoice_id: invoiceId,
          trx_id: trxId
        }
      });

      assert.strictEqual(res.status, 200, `Expected HTTP 200, got ${res.status}`);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.status, 'PAID');
      assert.strictEqual(res.body.trx_id, trxId);
      assert.strictEqual(res.body.amount, amount);

      // 1. Invoice status updated to PAID
      const updatedInv = await db.get('SELECT status, trx_id, payment_method FROM invoices WHERE id = ?', [invoiceId]);
      assert.strictEqual(updatedInv.status, 'PAID');
      assert.strictEqual(updatedInv.trx_id, trxId);

      // 2. Stored data status updated to USED
      const updatedStr = await db.get('SELECT status, used_at FROM stored_data WHERE brand_id = ? AND trx_id = ?', [FIXTURES.brand, trxId]);
      assert.strictEqual(updatedStr.status, 'USED');
      assert(updatedStr.used_at, 'used_at timestamp must be set');

      // 3. Merchant credit decremented by exactly 1
      const updatedUser = await db.get('SELECT credits FROM users WHERE id = ?', [FIXTURES.merchantUser]);
      assert.strictEqual(updatedUser.credits, initialCredits - 1);

      // 4. Webhook log enqueued
      const whk = await db.get('SELECT * FROM webhook_logs WHERE brand_id = ? AND invoice_id = ?', [FIXTURES.brand, invoiceId]);
      assert(whk, 'Webhook log must be created');
      assert.strictEqual(whk.event, 'invoice.completed');
    }
  );

  await test(
    'T1-VER-PARAM-ALIAS',
    'RECONCILIATION',
    'Parametrized endpoint POST /api/invoices/:id/verify successfully completes invoice',
    async () => {
      const trxId = 'BKPARAM002';
      const amount = 400.00;
      const invoiceId = 'inv_t1_param_02';

      await db.query(
        `INSERT INTO stored_data (id, brand_id, sender, raw_sms, channel, trx_id, amount, status, sim_slot)
         VALUES ('str_t1_02', ?, 'bKash', 'You have received Tk 400.00', 'bKash', ?, ?, 'UNUSED', 1)`,
        [FIXTURES.brand, trxId, amount]
      );

      const expiresAt = getUtcSql(new Date(Date.now() + 15 * 60 * 1000));
      await db.query(
        `INSERT INTO invoices (id, brand_id, invoice_number, customer_name, amount, currency, status, expires_at)
         VALUES (?, ?, 'INV-T1-02', 'Bob Smith', ?, 'BDT', 'PENDING', ?)`,
        [invoiceId, FIXTURES.brand, amount, expiresAt]
      );

      const res = await apiRequest(`/api/invoices/${invoiceId}/verify`, {
        method: 'POST',
        body: { trx_id: trxId }
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.status, 'PAID');
    }
  );

  await test(
    'T1-VER-S2S-STEP1',
    'S2S-API',
    'S2S Step 1 (POST /v1/trx/verify): Deducts 1 credit, returns data, transaction status remains UNUSED',
    async () => {
      const trxId = 'BKS2S001';
      const amount = 600.00;
      const userBefore = await db.get('SELECT credits FROM users WHERE id = ?', [FIXTURES.merchantUser]);
      const initialCredits = userBefore.credits;

      await db.query(
        `INSERT INTO stored_data (id, brand_id, sender, raw_sms, channel, trx_id, amount, status, sim_slot)
         VALUES ('str_t1_s2s_01', ?, 'bKash', 'You have received Tk 600.00', 'bKash', ?, ?, 'UNUSED', 1)`,
        [FIXTURES.brand, trxId, amount]
      );

      const res = await apiRequest('/v1/trx/verify', {
        method: 'POST',
        headers: {
          'X-API-KEY': FIXTURES.apiKey,
          'X-API-SECRET': FIXTURES.apiSecret
        },
        body: { trx_id: trxId, amount }
      });

      assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.trx_id, trxId);
      assert.strictEqual(res.body.data.status, 'UNUSED');

      // Credit must be decremented by 1
      const userAfter = await db.get('SELECT credits FROM users WHERE id = ?', [FIXTURES.merchantUser]);
      assert.strictEqual(userAfter.credits, initialCredits - 1);

      // Transaction must remain UNUSED in DB until confirmed
      const stored = await db.get('SELECT status FROM stored_data WHERE brand_id = ? AND trx_id = ?', [FIXTURES.brand, trxId]);
      assert.strictEqual(stored.status, 'UNUSED');
    }
  );

  await test(
    'T1-VER-S2S-STEP2',
    'S2S-API',
    'S2S Step 2 (POST /v1/trx/confirm): Commits transaction status to USED',
    async () => {
      const trxId = 'BKS2S001';
      const stored = await db.get('SELECT id FROM stored_data WHERE brand_id = ? AND trx_id = ?', [FIXTURES.brand, trxId]);
      assert(stored, 'Stored record must exist');

      const res = await apiRequest('/v1/trx/confirm', {
        method: 'POST',
        headers: {
          'X-API-KEY': FIXTURES.apiKey,
          'X-API-SECRET': FIXTURES.apiSecret
        },
        body: { id: stored.id, trx_id: trxId }
      });

      assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.status, 'USED');

      // Verify DB committed to USED
      const updated = await db.get('SELECT status, used_at FROM stored_data WHERE id = ?', [stored.id]);
      assert.strictEqual(updated.status, 'USED');
      assert(updated.used_at, 'used_at timestamp must be set');
    }
  );

  await test(
    'T1-VER-S2S-UNAUTH',
    'S2S-API',
    'Reject S2S verification request without valid API key and secret with HTTP 401',
    async () => {
      const res = await apiRequest('/v1/trx/verify', {
        method: 'POST',
        headers: {
          'X-API-KEY': 'fake_invalid_key',
          'X-API-SECRET': 'fake_invalid_secret'
        },
        body: { trx_id: 'BKFAKE001', amount: 500 }
      });

      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.code, 'INVALID_CREDENTIALS');
    }
  );

  // ===========================================================================
  // TEST SUITE SUMMARY
  // ===========================================================================
  console.log('\n===============================================================================');
  console.log(`  Tier 1 Execution Finished: ${summary.passed} Passed / ${summary.total} Total (${summary.failed} Failed)`);
  console.log('===============================================================================');

  if (server) server.close();

  if (summary.failed > 0) {
    process.exit(1);
  }
}

runTier1Suite().catch((err) => {
  console.error('[Fatal Tier 1 Test Failure]', err);
  if (server) server.close();
  process.exit(1);
});
