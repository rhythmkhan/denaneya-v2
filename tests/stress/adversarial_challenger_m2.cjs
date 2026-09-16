#!/usr/bin/env node
/**
 * DenaNeya v2.0 - Milestone 2 Challenger Adversarial Stress-Test Suite
 * File: tests/stress/adversarial_challenger_m2.cjs
 *
 * EMPIRICAL CHALLENGER VERIFICATION HARNESS
 * Targets:
 * 1. Carrier Spoofing Attack Matrix (unlisted senders, fake shortcodes, homoglyphs, whitespace variations)
 * 2. Debit Fraud Injection Matrix (Cash Out, Send Money, Payment to, Fee/Charge, Unicode zero-width evasions)
 * 3. Concurrency Race Condition & Double-Spend Attacks (25-way and 15-way parallel contention bursts)
 * 4. Amount Oracle & Differential Timing / Response Leakage Resistance
 * 5. Multi-Tenant Cross-Brand Boundary Isolation
 * 6. Device Hardware State & Deactivation Controls
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

let dotenv;
try {
  dotenv = require('dotenv');
} catch (e) {
  dotenv = require(path.resolve(__dirname, '../../node_modules/dotenv'));
}
const envPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

let server;
let baseUrl;
let db;
let sharedPkg;
let dbPkg;

const results = {
  total: 0,
  passed: 0,
  failed: 0,
  failures: []
};

async function challenge(id, category, description, fn) {
  results.total++;
  try {
    await fn();
    results.passed++;
    console.log(`  [CHALLENGE PASSED] ${id} - [${category}] ${description}`);
  } catch (err) {
    results.failed++;
    console.error(`  [CHALLENGE FAILED] ${id} - [${category}] ${description}`);
    console.error(`         >>> Error: ${err.message}`);
    results.failures.push({ id, category, description, error: err.message });
  }
}

let reqSeq = 0;
async function apiRequest(endpoint, { method = 'GET', headers = {}, body = null } = {}) {
  reqSeq++;
  const ipSuffix = (reqSeq % 200) + 1;
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

// Generate unique randomized IDs to prevent collision across parallel test runners
const randSuffix = crypto.randomBytes(4).toString('hex');
const FIXTURES = {
  userId: `usr_chal_${randSuffix}`,
  brandIdA: `brd_chA_${randSuffix}`,
  brandSlugA: `slug-cha-${randSuffix}`,
  brandIdB: `brd_chB_${randSuffix}`,
  brandSlugB: `slug-chb-${randSuffix}`,
  deviceTokenA: `tok_dev_A_${crypto.randomBytes(24).toString('hex')}`,
  deviceIdA: `dev_chA_${randSuffix}`,
  deviceTokenB: `tok_dev_B_${crypto.randomBytes(24).toString('hex')}`,
  deviceIdB: `dev_chB_${randSuffix}`,
  initialCredits: 100
};

async function setup() {
  dbPkg = await import('@denaneya/database');
  const { getDatabase, runMigrations, runSeed } = dbPkg.default || dbPkg;
  sharedPkg = await import('@denaneya/shared');
  const { createApp } = await import('../../apps/api/src/app.js');

  db = getDatabase();

  if (!isLive) {
    console.log('[Adversarial Setup] Running on SQLite in-memory...');
    const migRes = await runMigrations(db, { reset: true });
    assert.strictEqual(migRes.success, true);
    await runSeed(db);
  } else {
    console.log('[Adversarial Setup] Running against Hostinger Live MySQL...');
  }

  const now = getUtcSql();
  // Insert Test User
  await db.query(
    `INSERT INTO users (id, name, email, password_hash, role, credits, status, created_at, updated_at)
     VALUES (?, 'Challenger Tester', ?, 'hash_chal', 'merchant', ?, 'active', ?, ?)`,
    [FIXTURES.userId, `chal_${randSuffix}@denaneya.test`, FIXTURES.initialCredits, now, now]
  );

  // Insert Brand A
  await db.query(
    `INSERT INTO brands (id, user_id, brand_name, brand_slug, api_key, api_secret, webhook_secret, webhook_url, status, created_at, updated_at)
     VALUES (?, ?, 'Challenger Brand Alpha', ?, ?, ?, 'whsec_alpha', 'https://alpha.example.com/webhook', 'active', ?, ?)`,
    [FIXTURES.brandIdA, FIXTURES.userId, FIXTURES.brandSlugA, `key_alpha_${randSuffix}`, `sec_alpha_${randSuffix}`, now, now]
  );

  // Insert Brand B
  await db.query(
    `INSERT INTO brands (id, user_id, brand_name, brand_slug, api_key, api_secret, webhook_secret, webhook_url, status, created_at, updated_at)
     VALUES (?, ?, 'Challenger Brand Beta', ?, ?, ?, 'whsec_beta', 'https://beta.example.com/webhook', 'active', ?, ?)`,
    [FIXTURES.brandIdB, FIXTURES.userId, FIXTURES.brandSlugB, `key_beta_${randSuffix}`, `sec_beta_${randSuffix}`, now, now]
  );

  // Insert Device A
  await db.query(
    `INSERT INTO devices (id, brand_id, device_name, device_model, device_token, sim1_operator, sim2_operator, battery_level, last_sync_at, status, created_at)
     VALUES (?, ?, 'Alpha Handset', 'Pixel 8', ?, 'Grameenphone', 'Robi', 95, ?, 'active', ?)`,
    [FIXTURES.deviceIdA, FIXTURES.brandIdA, FIXTURES.deviceTokenA, now, now]
  );

  // Insert Device B
  await db.query(
    `INSERT INTO devices (id, brand_id, device_name, device_model, device_token, sim1_operator, sim2_operator, battery_level, last_sync_at, status, created_at)
     VALUES (?, ?, 'Beta Handset', 'Galaxy S24', ?, 'Banglalink', 'Teletalk', 89, ?, 'active', ?)`,
    [FIXTURES.deviceIdB, FIXTURES.brandIdB, FIXTURES.deviceTokenB, now, now]
  );

  const app = createApp({ db });
  server = http.createServer(app);
  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      console.log(`[Adversarial Setup] Harness API server online at ${baseUrl}\n`);
      resolve();
    });
  });
}

async function runAdversarialChallenges() {
  console.log('========================================================================================');
  console.log('  MILESTONE 2 EMPIRICAL ADVERSARIAL CHALLENGE SUITE');
  console.log('  Testing Carrier Spoofing, Debit Fraud, Concurrency Double-Spend & Amount Oracle');
  console.log('========================================================================================\n');

  await setup();

  // =========================================================================
  // SUITE 1: CARRIER SPOOFING & UNLISTED SENDER CHALLENGE
  // =========================================================================
  console.log('\n--- SUITE 1: CARRIER SPOOFING & SENDER MASK CHALLENGES ---');

  const spoofedSenders = [
    { sender: '01712345678', desc: 'Standard 11-digit mobile MSISDN' },
    { sender: '+8801712345678', desc: 'E.164 international format MSISDN' },
    { sender: '8801812345678', desc: 'Prefix 880 without plus' },
    { sender: '16217', desc: 'Adjacent unlisted shortcode (16217 vs 16216)' },
    { sender: '16223', desc: 'Adjacent unlisted shortcode (16223 vs 16222)' },
    { sender: '12345', desc: 'Arbitrary 5-digit shortcode' },
    { sender: '999', desc: 'National emergency shortcode 999' },
    { sender: 'bKashh', desc: 'Typosquatting single-letter suffix bKashh' },
    { sender: 'b-Kash', desc: 'Hyphenated spoof b-Kash' },
    { sender: 'b_Kash', desc: 'Underscore spoof b_Kash' },
    { sender: 'BK4SH', desc: 'Leet-speak spoof BK4SH' },
    { sender: 'Nagadd', desc: 'Typosquatting Nagadd' },
    { sender: 'NAGAD1', desc: 'Suffix numeric spoof NAGAD1' },
    { sender: 'ROKET', desc: 'Phonetic spoof ROKET' },
    { sender: 'DBBL', desc: 'Bank acronym DBBL (unlisted, Rocket uses 16216)' },
    { sender: 'Upayy', desc: 'Typosquatting Upayy' },
    { sender: 'bKаsh', desc: 'Cyrillic homoglyph letter a (\u0430) in bKash' },
    { sender: '', desc: 'Empty sender string' },
    { sender: '   ', desc: 'Whitespace-only sender string' }
  ];

  for (let i = 0; i < spoofedSenders.length; i++) {
    const item = spoofedSenders[i];
    const testId = `CHAL-SPOOF-${String(i + 1).padStart(2, '0')}`;
    await challenge(testId, 'CARRIER-SPOOFING', `Reject unlisted sender '${item.sender}' (${item.desc}) with HTTP 400`, async () => {
      const res = await apiRequest('/api/device/sync-sms', {
        method: 'POST',
        headers: { 'X-Device-Token': FIXTURES.deviceTokenA },
        body: {
          sender: item.sender,
          body: 'You have received Tk 1,000.00 from 01711111111. TrxID SPOOF01 at 16/09/2026 12:00'
        }
      });
      assert.strictEqual(res.status, 400, `Expected HTTP 400 for spoofed sender '${item.sender}', got ${res.status}`);
      assert.strictEqual(res.body.code, 'UNAUTHORIZED_SENDER');
    });
  }

  // Verify Valid Whitelist variations pass
  const validCarrierVariations = [
    { sender: 'bKash', provider: 'bKash' },
    { sender: 'BKASH', provider: 'bKash' },
    { sender: 'bkash', provider: 'bKash' },
    { sender: '  bKash  ', provider: 'bKash' },
    { sender: '16216', provider: 'Rocket' },
    { sender: 'Nagad', provider: 'Nagad' },
    { sender: 'NAGAD', provider: 'Nagad' },
    { sender: '16222', provider: 'Nagad' },
    { sender: 'Upay', provider: 'Upay' },
    { sender: 'UPAY', provider: 'Upay' }
  ];

  for (let i = 0; i < validCarrierVariations.length; i++) {
    const item = validCarrierVariations[i];
    const testId = `CHAL-VALID-MASK-${String(i + 1).padStart(2, '0')}`;
    await challenge(testId, 'VALID-CARRIER-MASK', `Verify valid whitelist variant '${item.sender}' is accepted`, async () => {
      const trxId = `VAL${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      let body;
      if (item.provider === 'bKash') {
        body = `You have received Tk 500.00 from 01700000000. Ref ORD. Fee Tk 0.00. Balance Tk 10,000.00. TrxID ${trxId} at 16/09/2026 12:00`;
      } else if (item.provider === 'Nagad') {
        body = `Money Received. Amount: Tk 500.00. Sender: 01700000000. Ref: ORD. TxnID: ${trxId}. Date: 16/09/2026 12:00`;
      } else if (item.provider === 'Rocket') {
        body = `Tk 500.00 received from 01700000000 to A/C 017000000000. Fee Tk 0.00, Balance Tk 10,000.00. TxnId: ${trxId} on 16-Sep-2026 12:00`;
      } else {
        body = `You have received Tk 500.00 from 01700000000. Ref: ORD. TrxID: ${trxId} at 16/09/2026 12:00. Balance: Tk 10,000.00`;
      }

      const res = await apiRequest('/api/device/sync-sms', {
        method: 'POST',
        headers: { 'X-Device-Token': FIXTURES.deviceTokenA },
        body: {
          sender: item.sender,
          body
        }
      });
      assert.strictEqual(res.status, 201, `Expected HTTP 201 for valid mask '${item.sender}', got ${res.status} (${JSON.stringify(res.body)})`);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.trx_id, trxId);
      assert.strictEqual(res.body.status, 'UNUSED');
    });
  }

  // =========================================================================
  // SUITE 2: DEBIT FRAUD INJECTION & EVASION CHALLENGE
  // =========================================================================
  console.log('\n--- SUITE 2: DEBIT FRAUD INJECTION & EVASION CHALLENGES ---');

  const debitFraudPayloads = [
    { text: 'Cash Out Tk 500.00 to 01700000000 successful. Fee Tk 7.50. TrxID DF01 at 16/09/2026 12:00', pattern: 'Cash Out' },
    { text: 'Cash-Out Tk 500.00 to 01700000000. TrxID DF02 at 16/09/2026 12:00', pattern: 'Cash Out' },
    { text: 'Cash_Out Tk 500.00 to 01700000000. TrxID DF03 at 16/09/2026 12:00', pattern: 'Cash Out' },
    { text: 'Cash - Out Tk 500.00 to 01700000000. TrxID DF04 at 16/09/2026 12:00', pattern: 'Cash Out' },
    { text: 'Cashout Tk 500.00 to 01700000000. TrxID DF05 at 16/09/2026 12:00', pattern: 'Cash Out' },
    { text: 'Send Money to 01700000000 Tk 500.00 successful. Fee Tk 5.00. TrxID DF06 at 16/09/2026 12:00', pattern: 'Send Money' },
    { text: 'Send Money Tk 500.00 to 01700000000. TrxID DF07 at 16/09/2026 12:00', pattern: 'Send Money' },
    { text: 'Payment to 01700000000 Tk 500.00 successful. TrxID DF08 at 16/09/2026 12:00', pattern: 'Payment to' },
    { text: 'Payment Tk 500.00 to 01700000000. TrxID DF09 at 16/09/2026 12:00', pattern: 'Payment to' },
    { text: 'Payment of Tk 500.00 to Merchant. TrxID DF10 at 16/09/2026 12:00', pattern: 'Payment to' },
    { text: 'Paid to 01700000000 Tk 500.00. TrxID DF11 at 16/09/2026 12:00', pattern: 'Paid to' },
    { text: 'Paid Tk 500.00 to 01700000000. TrxID DF12 at 16/09/2026 12:00', pattern: 'Paid to' },
    { text: 'Cash Out Fee Tk 15.00 charged. TrxID DF13 at 16/09/2026 12:00', pattern: 'Cash Out Fee' },
    { text: 'Debited Tk 500.00 from your account. TrxID DF14 at 16/09/2026 12:00', pattern: 'Debit' },
    { text: 'Fee: Tk 10.00 deducted. TrxID DF15 at 16/09/2026 12:00', pattern: 'Fee' },
    { text: 'Fee Tk 0.50 applied. TrxID DF16 at 16/09/2026 12:00', pattern: 'Fee' },
    { text: 'Charge: Tk 15.00 applied. TrxID DF17 at 16/09/2026 12:00', pattern: 'Charge' },
    { text: 'Transfer to 01700000000 Tk 500.00. TrxID DF18 at 16/09/2026 12:00', pattern: 'Transfer to' },
    { text: 'Transferred Tk 500.00 to 01700000000. TrxID DF19 at 16/09/2026 12:00', pattern: 'Transferred Tk' },
    { text: 'Mobile Recharge Tk 100.00 to 01700000000. TrxID DF20 at 16/09/2026 12:00', pattern: 'Mobile Recharge' },
    { text: 'Request Money from 01700000000 Tk 500.00. TrxID DF21 at 16/09/2026 12:00', pattern: 'Request Money' },
    // Evasion vectors: invisible zero-width spaces, soft hyphens, null bytes
    { text: 'C\u200Bash O\u200Dut Tk 500.00 to 01700000000. TrxID DF22', pattern: 'Cash Out with Zero-Width' },
    { text: 'S\u200Bend M\u200Doney to 01700000000 Tk 500.00. TrxID DF23', pattern: 'Send Money with Zero-Width' },
    { text: 'P\uFEFFayment to 01700000000 Tk 500.00. TrxID DF24', pattern: 'Payment to with BOM' },
    { text: 'D\0ebited Tk 500.00 from your account. TrxID DF25', pattern: 'Debit with Null Byte' }
  ];

  for (let i = 0; i < debitFraudPayloads.length; i++) {
    const item = debitFraudPayloads[i];
    const testId = `CHAL-DEBIT-${String(i + 1).padStart(2, '0')}`;
    await challenge(testId, 'DEBIT-FRAUD', `Strictly reject debit pattern: '${item.pattern}' with HTTP 400`, async () => {
      const res = await apiRequest('/api/device/sync-sms', {
        method: 'POST',
        headers: { 'X-Device-Token': FIXTURES.deviceTokenA },
        body: {
          sender: 'bKash',
          body: item.text
        }
      });
      assert.strictEqual(res.status, 400, `Expected HTTP 400 for debit pattern '${item.pattern}', got ${res.status}`);
      assert.strictEqual(res.body.code, 'DEBIT_TRANSACTION_REJECTED');
    });
  }

  // =========================================================================
  // SUITE 3: CONCURRENCY RACE & DOUBLE-SPEND ATTACKS
  // =========================================================================
  console.log('\n--- SUITE 3: CONCURRENCY RACE & DOUBLE-SPEND ATTACK STRESS ---');

  await challenge('CHAL-CONCURR-01', 'DOUBLE-SPEND-RACE', '25 Simultaneous parallel verification bursts on single TrxID across 25 different invoices', async () => {
    // bKash TrxID is strictly alphanumeric [A-Za-z0-9]
    const raceTrxId = `RC25${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const raceAmount = 1200.00;
    const now = getUtcSql();
    const expiresAt = getUtcSql(new Date(Date.now() + 15 * 60 * 1000));

    // 1. Ingest authentic SMS for ৳1,200 into stored_data
    const rawSms = `You have received Tk 1,200.00 from 01755555555. Ref RACE. Fee Tk 0.00. Balance Tk 50,000.00. TrxID ${raceTrxId} at 16/09/2026 14:00`;
    const ingestRes = await apiRequest('/api/device/sync-sms', {
      method: 'POST',
      headers: { 'X-Device-Token': FIXTURES.deviceTokenA },
      body: { sender: 'bKash', body: rawSms }
    });
    assert.strictEqual(ingestRes.status, 201, `Ingest failed: ${ingestRes.status} (${JSON.stringify(ingestRes.body)})`);
    assert.strictEqual(ingestRes.body.status, 'UNUSED');

    // 2. Create 25 pending invoices for Brand A, each for ৳1,200
    const invoiceIds = [];
    for (let i = 0; i < 25; i++) {
      const invId = `inv_race25_${i}_${crypto.randomBytes(4).toString('hex')}`;
      invoiceIds.push(invId);
      await db.query(
        `INSERT INTO invoices (
           id, brand_id, invoice_number, amount, currency, customer_name, customer_phone,
           customer_email, payment_method, status, expires_at, created_at, updated_at
         ) VALUES (?, ?, ?, ?, 'BDT', 'Concurrent Buyer', '01755555555', 'race@example.com', 'bKash', 'PENDING', ?, ?, ?)`,
        [invId, FIXTURES.brandIdA, `INV-RACE-${i}-${Date.now()}`, raceAmount, expiresAt, now, now]
      );
    }

    // Capture user credit before burst
    const userBefore = await db.get(`SELECT credits FROM users WHERE id = ?`, [FIXTURES.userId]);
    const creditsBefore = userBefore.credits;

    // 3. Fire all 25 requests simultaneously using Promise.all
    console.log(`     [Fire] Launching 25 parallel asynchronous verification requests for TrxID ${raceTrxId}...`);
    const promises = invoiceIds.map((invId) =>
      apiRequest('/api/payment/submit-trx', {
        method: 'POST',
        body: {
          invoice_id: invId,
          trx_id: raceTrxId
        }
      })
    );

    const responses = await Promise.all(promises);

    let successCount = 0;
    let failedCount = 0;
    const errorCodes = {};

    responses.forEach((res) => {
      if (res.status === 200 && res.body.success === true) {
        successCount++;
      } else {
        failedCount++;
        const code = res.body?.code || `HTTP_${res.status}`;
        errorCodes[code] = (errorCodes[code] || 0) + 1;
      }
    });

    console.log(`     [Result] 25 Concurrent Requests: ${successCount} SUCCEEDED (HTTP 200), ${failedCount} REJECTED (HTTP 400)`);
    console.log(`     [Breakdown] Rejection codes:`, errorCodes);

    // CRITICAL ASSERTION: EXACTLY 1 SUCCEEDS, EXACTLY 24 FAIL
    assert.strictEqual(successCount, 1, `CRITICAL RACE VULNERABILITY: Expected exactly 1 verification to succeed, but ${successCount} succeeded!`);
    assert.strictEqual(failedCount, 24, `Expected exactly 24 rejections, but got ${failedCount}`);

    // Verify stored_data state: status MUST be USED, used_at NOT NULL
    const stored = await db.get(`SELECT status, used_at FROM stored_data WHERE brand_id = ? AND UPPER(trx_id) = ?`, [FIXTURES.brandIdA, raceTrxId]);
    assert.strictEqual(stored.status, 'USED');
    assert.ok(stored.used_at !== null);

    // Verify Invoices state in DB: exactly 1 PAID, 24 PENDING
    let paidInvoicesCount = 0;
    let pendingInvoicesCount = 0;
    for (const invId of invoiceIds) {
      const inv = await db.get(`SELECT status FROM invoices WHERE id = ?`, [invId]);
      if (inv.status === 'PAID') paidInvoicesCount++;
      else if (inv.status === 'PENDING') pendingInvoicesCount++;
    }
    assert.strictEqual(paidInvoicesCount, 1, `DB integrity failure: exactly 1 invoice should be PAID, found ${paidInvoicesCount}`);
    assert.strictEqual(pendingInvoicesCount, 24, `DB integrity failure: 24 invoices should remain PENDING, found ${pendingInvoicesCount}`);

    // Verify User Credits: decremented by EXACTLY 1
    const userAfter = await db.get(`SELECT credits FROM users WHERE id = ?`, [FIXTURES.userId]);
    assert.strictEqual(userAfter.credits, creditsBefore - 1, `Credit balance anomaly: credits should decrement by 1, before=${creditsBefore}, after=${userAfter.credits}`);
  });

  await challenge('CHAL-CONCURR-02', 'SAME-INVOICE-RACE', '15 Simultaneous parallel requests on the exact SAME invoice and TrxID', async () => {
    const singleTrxId = `SM${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const amount = 850.00;
    const now = getUtcSql();
    const expiresAt = getUtcSql(new Date(Date.now() + 15 * 60 * 1000));
    const targetInvoiceId = `inv_same_${crypto.randomBytes(6).toString('hex')}`;

    // Ingest SMS
    const ingRes = await apiRequest('/api/device/sync-sms', {
      method: 'POST',
      headers: { 'X-Device-Token': FIXTURES.deviceTokenA },
      body: {
        sender: 'bKash',
        body: `You have received Tk 850.00 from 01766666666. Ref SAME. Fee Tk 0.00. Balance Tk 50,000.00. TrxID ${singleTrxId} at 16/09/2026 14:15`
      }
    });
    assert.strictEqual(ingRes.status, 201);

    // Create 1 invoice
    await db.query(
      `INSERT INTO invoices (
         id, brand_id, invoice_number, amount, currency, customer_name, customer_phone,
         customer_email, payment_method, status, expires_at, created_at, updated_at
       ) VALUES (?, ?, ?, ?, 'BDT', 'Same Inv Buyer', '01766666666', 'same@example.com', 'bKash', 'PENDING', ?, ?, ?)`,
      [targetInvoiceId, FIXTURES.brandIdA, `INV-SAME-${Date.now()}`, amount, expiresAt, now, now]
    );

    const userBefore = await db.get(`SELECT credits FROM users WHERE id = ?`, [FIXTURES.userId]);

    // Fire 15 requests at the same target invoice
    const requests = Array.from({ length: 15 }, () =>
      apiRequest('/api/payment/submit-trx', {
        method: 'POST',
        body: {
          invoice_id: targetInvoiceId,
          trx_id: singleTrxId
        }
      })
    );

    const resultsSame = await Promise.all(requests);
    const successes = resultsSame.filter((r) => r.status === 200);
    const failures = resultsSame.filter((r) => r.status !== 200);

    assert.strictEqual(successes.length, 1, `Exactly 1 request must succeed, got ${successes.length}`);
    assert.strictEqual(failures.length, 14, `Remaining 14 must fail, got ${failures.length}`);

    // Credits must decrement by exactly 1
    const userAfter = await db.get(`SELECT credits FROM users WHERE id = ?`, [FIXTURES.userId]);
    assert.strictEqual(userAfter.credits, userBefore.credits - 1);
  });

  // =========================================================================
  // SUITE 4: AMOUNT ORACLE & INFORMATION DISCLOSURE RESISTANCE
  // =========================================================================
  console.log('\n--- SUITE 4: AMOUNT ORACLE & INFORMATION DISCLOSURE RESISTANCE ---');

  await challenge('CHAL-ORACLE-01', 'ORACLE-UNIFORMITY', 'Verify uniform constant error response across all mismatch scenarios without amount or existence leakage', async () => {
    const targetInvoiceId = `inv_oracle_${crypto.randomBytes(6).toString('hex')}`;
    const targetAmount = 2500.00;
    const now = getUtcSql();
    const expiresAt = getUtcSql(new Date(Date.now() + 15 * 60 * 1000));

    await db.query(
      `INSERT INTO invoices (
         id, brand_id, invoice_number, amount, currency, customer_name, customer_phone,
         customer_email, payment_method, status, expires_at, created_at, updated_at
       ) VALUES (?, ?, ?, ?, 'BDT', 'Oracle Target', '01777777777', 'oracle@example.com', 'bKash', 'PENDING', ?, ?, ?)`,
      [targetInvoiceId, FIXTURES.brandIdA, `INV-ORACLE-${Date.now()}`, targetAmount, expiresAt, now, now]
    );

    // Prepare stored data transactions with various amount differences:
    const scenarios = [
      { name: 'Non-existent TrxID', trxId: 'NONEXISTENT999' },
      { name: '1 Cent Below (2499.99)', amount: 2499.99 },
      { name: '1 Cent Above (2500.01)', amount: 2500.01 },
      { name: 'Drastic Underpayment (10.00)', amount: 10.00 },
      { name: 'Drastic Overpayment (25000.00)', amount: 25000.00 }
    ];

    for (const sc of scenarios) {
      let testTrx = sc.trxId;
      if (!testTrx) {
        testTrx = `ORC${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
        // Ingest into stored_data
        const raw = `You have received Tk ${sc.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} from 01777777777. Fee Tk 0.00. Balance Tk 50,000.00. TrxID ${testTrx} at 16/09/2026 14:30`;
        const ing = await apiRequest('/api/device/sync-sms', {
          method: 'POST',
          headers: { 'X-Device-Token': FIXTURES.deviceTokenA },
          body: { sender: 'bKash', body: raw }
        });
        assert.strictEqual(ing.status, 201, `Ingest for scenario ${sc.name} failed: ${ing.status} (${JSON.stringify(ing.body)})`);
      }

      // Submit against ৳2,500 target invoice
      const res = await apiRequest('/api/payment/submit-trx', {
        method: 'POST',
        body: {
          invoice_id: targetInvoiceId,
          trx_id: testTrx
        }
      });

      // Strict Oracle Defense checks:
      assert.strictEqual(res.status, 400, `Scenario '${sc.name}' returned status ${res.status}, expected uniform 400`);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.code, 'TRANSACTION_INVALID', `Scenario '${sc.name}' returned non-uniform code: ${res.body.code}`);
      assert.strictEqual(
        res.body.message,
        'Transaction verification failed. Please check your TrxID and try again.',
        `Scenario '${sc.name}' returned disclosing message: ${res.body.message}`
      );

      // Verify no response field leaks numerical amounts
      const bodyStr = JSON.stringify(res.body);
      assert.strictEqual(bodyStr.includes('2500'), false, `Response leaks target invoice amount 2500!`);
      if (sc.amount) {
        assert.strictEqual(bodyStr.includes(String(sc.amount)), false, `Response leaks stored SMS amount ${sc.amount}!`);
      }
    }
  });

  await challenge('CHAL-ORACLE-02', 'TIMING-SIDE-CHANNEL', 'Evaluate timing differential between non-existent TrxID and mismatched amount TrxID', async () => {
    const timingInvId = `inv_timing_${crypto.randomBytes(6).toString('hex')}`;
    const now = getUtcSql();
    const expiresAt = getUtcSql(new Date(Date.now() + 15 * 60 * 1000));

    await db.query(
      `INSERT INTO invoices (
         id, brand_id, invoice_number, amount, currency, customer_name, customer_phone,
         customer_email, payment_method, status, expires_at, created_at, updated_at
       ) VALUES (?, ?, ?, 5000.00, 'BDT', 'Timing Target', '01788888888', 'timing@example.com', 'bKash', 'PENDING', ?, ?, ?)`,
      [timingInvId, FIXTURES.brandIdA, `INV-TIME-${Date.now()}`, expiresAt, now, now]
    );

    // Ingest mismatched SMS (amount 1000 vs 5000)
    const existingMismatchTrx = `TM${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const ingTime = await apiRequest('/api/device/sync-sms', {
      method: 'POST',
      headers: { 'X-Device-Token': FIXTURES.deviceTokenA },
      body: {
        sender: 'bKash',
        body: `You have received Tk 1,000.00 from 01788888888. Fee Tk 0.00. Balance Tk 50,000.00. TrxID ${existingMismatchTrx} at 16/09/2026 14:40`
      }
    });
    assert.strictEqual(ingTime.status, 201);

    const samplesNonExistent = [];
    const samplesMismatched = [];

    // Run 20 trials each
    for (let i = 0; i < 20; i++) {
      const t0 = performance.now();
      await apiRequest('/api/payment/submit-trx', {
        method: 'POST',
        body: { invoice_id: timingInvId, trx_id: `NONEXIST${i}` }
      });
      samplesNonExistent.push(performance.now() - t0);

      const t1 = performance.now();
      await apiRequest('/api/payment/submit-trx', {
        method: 'POST',
        body: { invoice_id: timingInvId, trx_id: existingMismatchTrx }
      });
      samplesMismatched.push(performance.now() - t1);
    }

    const avgNonExistent = samplesNonExistent.reduce((a, b) => a + b, 0) / samplesNonExistent.length;
    const avgMismatched = samplesMismatched.reduce((a, b) => a + b, 0) / samplesMismatched.length;
    const delta = Math.abs(avgNonExistent - avgMismatched);

    console.log(`     [Timing] Avg Non-Existent Trx: ${avgNonExistent.toFixed(2)}ms | Avg Mismatched Trx: ${avgMismatched.toFixed(2)}ms | Delta: ${delta.toFixed(2)}ms`);

    // Side-channel timing delta should not exhibit exploitable divergence (< 50ms)
    assert.ok(delta < 50, `Excessive timing differential detected between existing and non-existent TrxIDs (${delta.toFixed(2)}ms)`);
  });

  // =========================================================================
  // SUITE 5: MULTI-TENANT CROSS-BRAND ISOLATION
  // =========================================================================
  console.log('\n--- SUITE 5: MULTI-TENANT CROSS-BRAND ISOLATION CHALLENGES ---');

  await challenge('CHAL-TENANT-01', 'CROSS-BRAND-ISOLATION', 'Prevent Brand B invoice from consuming Brand A ingested carrier SMS', async () => {
    const brandATrxId = `BA${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const crossAmount = 3000.00;
    const now = getUtcSql();
    const expiresAt = getUtcSql(new Date(Date.now() + 15 * 60 * 1000));

    // Ingest carrier SMS on Brand A handset
    const ingA = await apiRequest('/api/device/sync-sms', {
      method: 'POST',
      headers: { 'X-Device-Token': FIXTURES.deviceTokenA },
      body: {
        sender: 'bKash',
        body: `You have received Tk 3,000.00 from 01799999999. Fee Tk 0.00. Balance Tk 50,000.00. TrxID ${brandATrxId} at 16/09/2026 14:50`
      }
    });
    assert.strictEqual(ingA.status, 201);

    // Create Brand B invoice for identical amount ৳3,000
    const brandBInvoiceId = `inv_cross_b_${crypto.randomBytes(6).toString('hex')}`;
    await db.query(
      `INSERT INTO invoices (
         id, brand_id, invoice_number, amount, currency, customer_name, customer_phone,
         customer_email, payment_method, status, expires_at, created_at, updated_at
       ) VALUES (?, ?, ?, ?, 'BDT', 'Beta Customer', '01799999999', 'beta@example.com', 'bKash', 'PENDING', ?, ?, ?)`,
      [brandBInvoiceId, FIXTURES.brandIdB, `INV-CROSS-B-${Date.now()}`, crossAmount, expiresAt, now, now]
    );

    // Customer on Brand B tries to reconcile with Brand A's TrxID
    const crossAttempt = await apiRequest('/api/payment/submit-trx', {
      method: 'POST',
      body: {
        invoice_id: brandBInvoiceId,
        trx_id: brandATrxId
      }
    });

    assert.strictEqual(crossAttempt.status, 400, 'Cross-brand transaction usage must be rejected with HTTP 400');
    assert.strictEqual(crossAttempt.body.code, 'TRANSACTION_INVALID');

    // Confirm Brand A's transaction remains UNUSED
    const storedA = await db.get(`SELECT status FROM stored_data WHERE brand_id = ? AND UPPER(trx_id) = ?`, [FIXTURES.brandIdA, brandATrxId]);
    assert.strictEqual(storedA.status, 'UNUSED', 'Brand A transaction must remain UNUSED');

    // Confirm Brand B's invoice remains PENDING
    const invB = await db.get(`SELECT status FROM invoices WHERE id = ?`, [brandBInvoiceId]);
    assert.strictEqual(invB.status, 'PENDING', 'Brand B invoice must remain PENDING');
  });

  // =========================================================================
  // SUITE 6: DEVICE CONTROLS & REPLAY RESISTANCE
  // =========================================================================
  console.log('\n--- SUITE 6: DEVICE CONTROLS & REPLAY RESISTANCE ---');

  await challenge('CHAL-DEV-01', 'DEACTIVATED-DEVICE', 'Reject sync-sms requests when device is deactivated in database', async () => {
    // Temporarily deactivate Device B
    await db.query(`UPDATE devices SET status = 'deactivated' WHERE id = ?`, [FIXTURES.deviceIdB]);

    const res = await apiRequest('/api/device/sync-sms', {
      method: 'POST',
      headers: { 'X-Device-Token': FIXTURES.deviceTokenB },
      body: {
        sender: 'bKash',
        body: 'You have received Tk 500.00 from 01700000000. TrxID DEACT01'
      }
    });

    assert.strictEqual(res.status, 403, `Deactivated device must return 403, got ${res.status}`);
    assert.strictEqual(res.body.code, 'DEVICE_DEACTIVATED');

    // Restore Device B
    await db.query(`UPDATE devices SET status = 'active' WHERE id = ?`, [FIXTURES.deviceIdB]);
  });

  await challenge('CHAL-DEV-02', 'IDEMPOTENT-REPLAY', 'Idempotent ingestion on duplicate SMS retransmission preserving UNUSED status', async () => {
    const replayTrx = `RP${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const raw = `You have received Tk 700.00 from 01711112222. Ref RPL. Fee Tk 0.00. Balance Tk 50,000.00. TrxID ${replayTrx} at 16/09/2026 15:00`;

    // 1st transmission
    const first = await apiRequest('/api/device/sync-sms', {
      method: 'POST',
      headers: { 'X-Device-Token': FIXTURES.deviceTokenA },
      body: { sender: 'bKash', body: raw }
    });
    assert.strictEqual(first.status, 201);
    assert.strictEqual(first.body.trx_id, replayTrx);

    // 2nd transmission (identical SMS retransmitted by forwarder)
    const second = await apiRequest('/api/device/sync-sms', {
      method: 'POST',
      headers: { 'X-Device-Token': FIXTURES.deviceTokenA },
      body: { sender: 'bKash', body: raw }
    });
    assert.strictEqual(second.status, 200, `Retransmission must return 200 OK, got ${second.status}`);
    assert.strictEqual(second.body.duplicate, true);
    assert.strictEqual(second.body.ingested, 0);
    assert.strictEqual(second.body.trx_id, replayTrx);

    // Exactly 1 record in stored_data
    const countRow = await db.get(`SELECT count(*) as cnt FROM stored_data WHERE brand_id = ? AND UPPER(trx_id) = ?`, [FIXTURES.brandIdA, replayTrx]);
    const cnt = countRow.cnt !== undefined ? countRow.cnt : countRow['count(*)'];
    assert.strictEqual(Number(cnt), 1, 'Duplicate row must not be inserted into stored_data');
  });

  // =========================================================================
  // CLEANUP & SUMMARY
  // =========================================================================
  if (isLive && db) {
    try {
      console.log('\n[Adversarial Cleanup] Cleaning up temporary fixtures from live MySQL...');
      await db.query(`DELETE FROM webhook_logs WHERE brand_id IN (?, ?)`, [FIXTURES.brandIdA, FIXTURES.brandIdB]);
      await db.query(`DELETE FROM stored_data WHERE brand_id IN (?, ?)`, [FIXTURES.brandIdA, FIXTURES.brandIdB]);
      await db.query(`DELETE FROM invoices WHERE brand_id IN (?, ?)`, [FIXTURES.brandIdA, FIXTURES.brandIdB]);
      await db.query(`DELETE FROM devices WHERE brand_id IN (?, ?)`, [FIXTURES.brandIdA, FIXTURES.brandIdB]);
      await db.query(`DELETE FROM brands WHERE id IN (?, ?)`, [FIXTURES.brandIdA, FIXTURES.brandIdB]);
      await db.query(`DELETE FROM users WHERE id = ?`, [FIXTURES.userId]);
      console.log('[Adversarial Cleanup] Live MySQL cleanup completed cleanly.');
    } catch (cleanErr) {
      console.warn('[Adversarial Cleanup Warning]', cleanErr.message);
    }
  }

  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }

  console.log('\n========================================================================================');
  console.log(`  ADVERSARIAL CHALLENGE EXECUTION SUMMARY`);
  console.log(`  Total Challenges: ${results.total} | Passed: ${results.passed} | Failed: ${results.failed}`);
  console.log('========================================================================================\n');

  if (results.failed > 0) {
    console.error('❌ ADVERSARIAL CHALLENGES FAILED:');
    results.failures.forEach((f) => {
      console.error(`   - [${f.id}] ${f.category}: ${f.description} -> ${f.error}`);
    });
    process.exit(1);
  } else {
    console.log('🛡️ ALL ADVERSARIAL STRESS CHALLENGES PASSED (100% ROBUST UNDER ADVERSARIAL ATTACKS)');
    process.exit(0);
  }
}

runAdversarialChallenges().catch((err) => {
  console.error('Fatal unhandled error during adversarial challenge run:', err);
  process.exit(1);
});
