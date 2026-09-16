/**
 * DenaNeya v2.0 - E2E Test Suite Tier 3: Combinatorial & Concurrency Races
 * File: tests/e2e/tier3_concurrency.test.js
 * Architect: Milestone 5 Explorer 1 (E2E Core Payment & Concurrency Test Architect)
 *
 * Scope:
 * 1. Simultaneous Multi-Worker Race (50 Concurrent Claims on 1 TrxID):
 *    - 50 asynchronous concurrent workers simultaneously firing POST /api/payment/submit-trx
 *    - Targeting the exact same UNUSED TrxID against 50 distinct pending invoices
 *    - Exactly 1 worker wins (HTTP 200, status PAID)
 *    - Exactly 49 workers rejected (HTTP 400 TRANSACTION_INVALID)
 *    - Zero double-spend immunity under peak concurrency
 * 2. Stored Transaction Single-Consumer Guarantee:
 *    - Immediate re-submission rejected with TRANSACTION_INVALID
 *    - Delayed re-submission rejected with TRANSACTION_INVALID
 *    - Case-manipulated re-submission rejected via UPPER() CAS
 *    - Re-submission against already-paid invoice rejected with INVOICE_ALREADY_PAID
 *    - S2S API rejection on already-used transaction
 * 3. Simultaneous Credit Deduction Race (Merchant Credit = 1):
 *    - Merchant credit = 1 with 20 parallel distinct transaction claims
 *    - Exactly 1 transaction succeeds and deducts 1 credit
 *    - Exactly 19 transactions fail with HTTP 402 INSUFFICIENT_CREDITS
 *    - Merchant credits reach exactly 0 (never negative, zero debt anomaly)
 *    - S2S /v1/trx/verify credit race immunity
 * 4. Cross-Tenant TrxID Collision Isolation:
 *    - Composite unique index UNIQUE(brand_id, trx_id) allows identical TrxID across distinct brands
 *    - Independent payment processing: Brand A claim leaves Brand B UNUSED
 *    - Subsequent Brand B claim succeeds independently
 *    - Cross-tenant theft defense (Merchant B claiming Merchant A transaction rejected)
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
console.log('  DenaNeya v2.0 - Tier 3: Combinatorial & Concurrency Races Test Suite        ');
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

const ACTORS = {
  merchantA: 'usr_tier3_merch_a',
  brandA: 'brand_tier3_brand_a',
  apiKeyA: 'api_key_tier3_brand_a_123456789012345',
  apiSecretA: 'api_secret_tier3_brand_a_12345678901234567890123456',

  merchantB: 'usr_tier3_merch_b',
  brandB: 'brand_tier3_brand_b',
  apiKeyB: 'api_key_tier3_brand_b_123456789012345',
  apiSecretB: 'api_secret_tier3_brand_b_12345678901234567890123456',

  merchantDrain: 'usr_tier3_merch_drain',
  brandDrain: 'brand_tier3_brand_drain',
  apiKeyDrain: 'api_key_tier3_drain_1234567890123456',
  apiSecretDrain: 'api_secret_tier3_drain_12345678901234567890123456'
};

async function setupDatabase() {
  db = getDatabase();
  const migRes = await runMigrations(db, { reset: true });
  assert.strictEqual(migRes.success, true, 'Database migrations must apply cleanly');
  await runSeed(db);

  // Setup Merchant A (Concurrency Master)
  await db.query(`DELETE FROM users WHERE id IN (?, ?, ?)`, [ACTORS.merchantA, ACTORS.merchantB, ACTORS.merchantDrain]);
  await db.query(`DELETE FROM brands WHERE id IN (?, ?, ?)`, [ACTORS.brandA, ACTORS.brandB, ACTORS.brandDrain]);

  await db.query(
    `INSERT INTO users (id, name, email, password_hash, role, credits, status)
     VALUES (?, 'Merchant A Concurrency', 'merchant_a_t3@example.com', 'hash', 'merchant', 500, 'active')`,
    [ACTORS.merchantA]
  );
  await db.query(
    `INSERT INTO brands (id, user_id, brand_name, brand_slug, api_key, api_secret, webhook_url, webhook_secret, status)
     VALUES (?, ?, 'Brand A Concurrency', 'brand-a-t3', ?, ?, 'https://a.example/webhook', 'sec_webhook_a_32_bytes_long_key_123', 'active')`,
    [ACTORS.brandA, ACTORS.merchantA, ACTORS.apiKeyA, ACTORS.apiSecretA]
  );

  // Setup Merchant B (Tenant Isolation)
  await db.query(
    `INSERT INTO users (id, name, email, password_hash, role, credits, status)
     VALUES (?, 'Merchant B Isolation', 'merchant_b_t3@example.com', 'hash', 'merchant', 200, 'active')`,
    [ACTORS.merchantB]
  );
  await db.query(
    `INSERT INTO brands (id, user_id, brand_name, brand_slug, api_key, api_secret, webhook_url, webhook_secret, status)
     VALUES (?, ?, 'Brand B Isolation', 'brand-b-t3', ?, ?, 'https://b.example/webhook', 'sec_webhook_b_32_bytes_long_key_123', 'active')`,
    [ACTORS.brandB, ACTORS.merchantB, ACTORS.apiKeyB, ACTORS.apiSecretB]
  );

  // Setup Merchant Drain (1 Credit Target)
  await db.query(
    `INSERT INTO users (id, name, email, password_hash, role, credits, status)
     VALUES (?, 'Merchant Drain', 'merchant_drain_t3@example.com', 'hash', 'merchant', 1, 'active')`,
    [ACTORS.merchantDrain]
  );
  await db.query(
    `INSERT INTO brands (id, user_id, brand_name, brand_slug, api_key, api_secret, webhook_url, webhook_secret, status)
     VALUES (?, ?, 'Brand Drain', 'brand-drain-t3', ?, ?, 'https://drain.example/webhook', 'sec_webhook_drain_32_bytes_key_123', 'active')`,
    [ACTORS.brandDrain, ACTORS.merchantDrain, ACTORS.apiKeyDrain, ACTORS.apiSecretDrain]
  );
}

async function runTier3Suite() {
  await setupDatabase();

  const app = createApp();
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
  console.log(`[Setup] Target test server running on ${baseUrl}\n`);

  // ===========================================================================
  // SECTION 1: SIMULTANEOUS MULTI-WORKER RACE (50 CONCURRENT CLAIMS)
  // ===========================================================================
  console.log('--- SECTION 1: Simultaneous Multi-Worker Race (50 Concurrent Claims) ---');

  await test(
    'T3-RACE-50WORKERS',
    'CAS-CONCURRENCY',
    '50 simultaneous asynchronous workers claiming exact same TrxID: Exactly 1 wins (HTTP 200 PAID), exactly 49 rejected (HTTP 400 TRANSACTION_INVALID)',
    async () => {
      const trxId = 'BKRACE50WINNER';
      const amount = 1200.00;
      const initialCredits = 500;

      await db.query('UPDATE users SET credits = ? WHERE id = ?', [initialCredits, ACTORS.merchantA]);

      // 1. Ingest single authentic UNUSED transaction
      await db.query(
        `INSERT INTO stored_data (id, brand_id, sender, raw_sms, channel, trx_id, amount, status, sim_slot)
         VALUES ('str_t3_race_50', ?, 'bKash', 'You have received Tk 1,200.00', 'bKash', ?, ?, 'UNUSED', 1)`,
        [ACTORS.brandA, trxId, amount]
      );

      // 2. Generate 50 distinct pending invoices
      const workerInvoices = [];
      for (let i = 1; i <= 50; i++) {
        const invId = `inv_t3_race50_${String(i).padStart(2, '0')}`;
        workerInvoices.push(invId);
        const expiresAt = getUtcSql(new Date(Date.now() + 15 * 60 * 1000));
        await db.query(
          `INSERT INTO invoices (id, brand_id, invoice_number, customer_name, amount, currency, status, expires_at)
           VALUES (?, ?, ?, ?, ?, 'BDT', 'PENDING', ?)`,
          [invId, ACTORS.brandA, `INV-RACE50-${i}`, `Concurrent Buyer ${i}`, amount, expiresAt]
        );
      }

      // 3. Launch 50 concurrent worker requests simultaneously
      const workerPromises = workerInvoices.map((invId) => {
        return apiRequest('/api/payment/submit-trx', {
          method: 'POST',
          body: { invoice_id: invId, trx_id: trxId }
        });
      });

      const results = await Promise.all(workerPromises);

      // 4. Analyze HTTP responses
      const successfulClaims = results.filter((r) => r.status === 200);
      const rejectedClaims = results.filter((r) => r.status === 400);

      assert.strictEqual(
        successfulClaims.length,
        1,
        `CRITICAL RACE FAILURE: Expected exactly 1 successful claim, got ${successfulClaims.length}`
      );
      assert.strictEqual(
        rejectedClaims.length,
        49,
        `Expected exactly 49 rejected claims, got ${rejectedClaims.length}`
      );

      // Verify winner response payload
      const winner = successfulClaims[0];
      assert.strictEqual(winner.body.success, true);
      assert.strictEqual(winner.body.status, 'PAID');
      assert.strictEqual(winner.body.trx_id, trxId);

      // Verify all 49 rejected responses returned generic error defense
      for (const rej of rejectedClaims) {
        assert.strictEqual(rej.body.code, 'TRANSACTION_INVALID');
        assert.strictEqual(rej.body.message, 'Transaction verification failed. Please check your TrxID and try again.');
      }

      // 5. Verify Database Invariants
      // Exactly 1 invoice marked PAID
      const paidInvoices = await db.query(
        `SELECT id, status, trx_id FROM invoices WHERE brand_id = ? AND status = 'PAID' AND trx_id = ?`,
        [ACTORS.brandA, trxId]
      );
      assert.strictEqual(paidInvoices.rows.length, 1, 'Exactly 1 invoice must be PAID with winning TrxID');

      // Exactly 49 invoices remain PENDING
      const pendingInvoices = await db.query(
        `SELECT id FROM invoices WHERE id IN (${workerInvoices.map(() => '?').join(',')}) AND status = 'PENDING'`,
        workerInvoices
      );
      assert.strictEqual(pendingInvoices.rows.length, 49, 'Exactly 49 invoices must remain in PENDING status');

      // Stored data record transitioned to USED
      const stored = await db.get(
        'SELECT status, used_at FROM stored_data WHERE brand_id = ? AND trx_id = ?',
        [ACTORS.brandA, trxId]
      );
      assert.strictEqual(stored.status, 'USED');
      assert(stored.used_at, 'used_at timestamp must be recorded');

      // Exactly 1 credit deducted from merchant balance
      const user = await db.get('SELECT credits FROM users WHERE id = ?', [ACTORS.merchantA]);
      assert.strictEqual(
        user.credits,
        initialCredits - 1,
        `Credits must decrement by exactly 1: expected ${initialCredits - 1}, got ${user.credits}`
      );
    }
  );

  // ===========================================================================
  // SECTION 2: STORED TRANSACTION CONSUMED EXACTLY ONCE
  // ===========================================================================
  console.log('\n--- SECTION 2: Stored Transaction Single-Consumer Guarantee ---');

  await test(
    'T3-ONCE-01',
    'DOUBLE-SPEND',
    'Immediate re-submission of consumed TrxID against new invoice fails with TRANSACTION_INVALID',
    async () => {
      const trxId = 'BKRACE50WINNER'; // already consumed in previous test
      const invId = 'inv_t3_once_reclaim';
      const expiresAt = getUtcSql(new Date(Date.now() + 15 * 60 * 1000));

      await db.query(
        `INSERT INTO invoices (id, brand_id, invoice_number, customer_name, amount, currency, status, expires_at)
         VALUES (?, ?, 'INV-RECLAIM-01', 'Reclaim Attacker', 1200.00, 'BDT', 'PENDING', ?)`,
        [invId, ACTORS.brandA, expiresAt]
      );

      const res = await apiRequest('/api/payment/submit-trx', {
        method: 'POST',
        body: { invoice_id: invId, trx_id: trxId }
      });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.code, 'TRANSACTION_INVALID');
      assert.strictEqual(res.body.message, 'Transaction verification failed. Please check your TrxID and try again.');

      // Invoice must remain PENDING
      const inv = await db.get('SELECT status FROM invoices WHERE id = ?', [invId]);
      assert.strictEqual(inv.status, 'PENDING');
    }
  );

  await test(
    'T3-ONCE-02',
    'DOUBLE-SPEND',
    'Delayed re-submission (after 100ms sleep) of consumed TrxID fails with TRANSACTION_INVALID',
    async () => {
      await new Promise((r) => setTimeout(r, 100));

      const invId = 'inv_t3_once_delayed';
      const expiresAt = getUtcSql(new Date(Date.now() + 15 * 60 * 1000));
      await db.query(
        `INSERT INTO invoices (id, brand_id, invoice_number, customer_name, amount, currency, status, expires_at)
         VALUES (?, ?, 'INV-DELAYED-01', 'Delayed Attacker', 1200.00, 'BDT', 'PENDING', ?)`,
        [invId, ACTORS.brandA, expiresAt]
      );

      const res = await apiRequest('/api/payment/submit-trx', {
        method: 'POST',
        body: { invoice_id: invId, trx_id: 'BKRACE50WINNER' }
      });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.code, 'TRANSACTION_INVALID');
    }
  );

  await test(
    'T3-ONCE-03',
    'DOUBLE-SPEND',
    'Case-manipulated re-submission (lowercase "bkrace50winner") fails via UPPER() CAS guard',
    async () => {
      const invId = 'inv_t3_once_case';
      const expiresAt = getUtcSql(new Date(Date.now() + 15 * 60 * 1000));
      await db.query(
        `INSERT INTO invoices (id, brand_id, invoice_number, customer_name, amount, currency, status, expires_at)
         VALUES (?, ?, 'INV-CASE-01', 'Case Attacker', 1200.00, 'BDT', 'PENDING', ?)`,
        [invId, ACTORS.brandA, expiresAt]
      );

      const res = await apiRequest('/api/payment/submit-trx', {
        method: 'POST',
        body: { invoice_id: invId, trx_id: 'bkrace50winner' } // lowercase
      });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.code, 'TRANSACTION_INVALID');
    }
  );

  await test(
    'T3-ONCE-04',
    'DOUBLE-SPEND',
    'Submitting payment against an invoice that is already PAID returns INVOICE_ALREADY_PAID',
    async () => {
      // Find the winning invoice from Section 1
      const paidInv = await db.get(
        "SELECT id FROM invoices WHERE brand_id = ? AND status = 'PAID' LIMIT 1",
        [ACTORS.brandA]
      );
      assert(paidInv, 'Paid invoice must exist');

      const res = await apiRequest('/api/payment/submit-trx', {
        method: 'POST',
        body: { invoice_id: paidInv.id, trx_id: 'BKRACE50WINNER' }
      });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.code, 'INVOICE_ALREADY_PAID');
    }
  );

  await test(
    'T3-ONCE-05',
    'DOUBLE-SPEND',
    'S2S /v1/trx/verify rejects consumed transaction with generic TRANSACTION_INVALID',
    async () => {
      const res = await apiRequest('/v1/trx/verify', {
        method: 'POST',
        headers: {
          'X-API-KEY': ACTORS.apiKeyA,
          'X-API-SECRET': ACTORS.apiSecretA
        },
        body: { trx_id: 'BKRACE50WINNER', amount: 1200.00 }
      });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.code, 'TRANSACTION_INVALID');
    }
  );

  // ===========================================================================
  // SECTION 3: SIMULTANEOUS CREDIT DEDUCTION RACE (CREDITS = 1)
  // ===========================================================================
  console.log('\n--- SECTION 3: Simultaneous Credit Deduction Race (Credits = 1) ---');

  await test(
    'T3-CRD-RACE',
    'CREDIT-CONCURRENCY',
    'Merchant credit = 1 with 20 parallel distinct transaction claims: Exactly 1 succeeds (HTTP 200), 19 fail (HTTP 402 INSUFFICIENT_CREDITS), credits = 0 (never negative)',
    async () => {
      // Set merchant credits to exactly 1
      await db.query('UPDATE users SET credits = 1 WHERE id = ?', [ACTORS.merchantDrain]);

      // Seed 20 distinct valid UNUSED transactions and 20 distinct invoices
      const workerPairs = [];
      const expiresAt = getUtcSql(new Date(Date.now() + 15 * 60 * 1000));

      for (let i = 1; i <= 20; i++) {
        const trxId = `BKDRAIN${String(i).padStart(3, '0')}`;
        const invId = `inv_t3_drain_${String(i).padStart(3, '0')}`;
        const amount = 500.00;

        await db.query(
          `INSERT INTO stored_data (id, brand_id, sender, raw_sms, channel, trx_id, amount, status, sim_slot)
           VALUES (?, ?, 'bKash', 'You have received Tk 500.00', 'bKash', ?, ?, 'UNUSED', 1)`,
          [`str_drain_${i}`, ACTORS.brandDrain, trxId, amount]
        );

        await db.query(
          `INSERT INTO invoices (id, brand_id, invoice_number, customer_name, amount, currency, status, expires_at)
           VALUES (?, ?, ?, 'Drain Customer', ?, 'BDT', 'PENDING', ?)`,
          [invId, ACTORS.brandDrain, `INV-DRAIN-${i}`, amount, expiresAt]
        );

        workerPairs.push({ invId, trxId });
      }

      // Fire 20 parallel requests simultaneously
      const creditPromises = workerPairs.map(({ invId, trxId }) => {
        return apiRequest('/api/payment/submit-trx', {
          method: 'POST',
          body: { invoice_id: invId, trx_id: trxId }
        });
      });

      const results = await Promise.all(creditPromises);

      const successfulClaims = results.filter((r) => r.status === 200);
      const insufficientCreditClaims = results.filter((r) => r.status === 402);

      assert.strictEqual(
        successfulClaims.length,
        1,
        `Expected exactly 1 claim to succeed with credit = 1, got ${successfulClaims.length}`
      );
      assert.strictEqual(
        insufficientCreditClaims.length,
        19,
        `Expected exactly 19 claims to fail with HTTP 402, got ${insufficientCreditClaims.length}`
      );

      for (const rej of insufficientCreditClaims) {
        assert.strictEqual(rej.body.code, 'INSUFFICIENT_CREDITS');
      }

      // Database verification: credits must be EXACTLY 0 (never negative)
      const user = await db.get('SELECT credits FROM users WHERE id = ?', [ACTORS.merchantDrain]);
      assert.strictEqual(user.credits, 0, `Merchant credits must be exactly 0, got ${user.credits}`);

      // Exactly 1 invoice marked PAID, 19 remain PENDING
      const paidCount = await db.get(
        "SELECT count(*) as total FROM invoices WHERE brand_id = ? AND status = 'PAID'",
        [ACTORS.brandDrain]
      );
      assert.strictEqual(Number(paidCount.total), 1);

      // Exactly 1 stored record marked USED, 19 remain UNUSED
      const usedCount = await db.get(
        "SELECT count(*) as total FROM stored_data WHERE brand_id = ? AND status = 'USED'",
        [ACTORS.brandDrain]
      );
      assert.strictEqual(Number(usedCount.total), 1);
    }
  );

  await test(
    'T3-CRD-DEPLETED',
    'CREDIT-CONCURRENCY',
    'Baseline depleted credit rejection: 5 concurrent requests when credits = 0 all fail with HTTP 402',
    async () => {
      const user = await db.get('SELECT credits FROM users WHERE id = ?', [ACTORS.merchantDrain]);
      assert.strictEqual(user.credits, 0, 'Credits must be 0');

      // Seed 5 valid transactions & invoices
      const reqs = [];
      const expiresAt = getUtcSql(new Date(Date.now() + 15 * 60 * 1000));

      for (let i = 21; i <= 25; i++) {
        const trxId = `BKZERO${i}`;
        const invId = `inv_zero_${i}`;

        await db.query(
          `INSERT INTO stored_data (id, brand_id, sender, raw_sms, channel, trx_id, amount, status, sim_slot)
           VALUES (?, ?, 'bKash', 'You have received Tk 200.00', 'bKash', ?, 200.00, 'UNUSED', 1)`,
          [`str_zero_${i}`, ACTORS.brandDrain, trxId]
        );

        await db.query(
          `INSERT INTO invoices (id, brand_id, invoice_number, customer_name, amount, currency, status, expires_at)
           VALUES (?, ?, ?, 'Zero Credit Buyer', 200.00, 'BDT', 'PENDING', ?)`,
          [invId, ACTORS.brandDrain, `INV-ZERO-${i}`, expiresAt]
        );

        reqs.push(apiRequest('/api/payment/submit-trx', {
          method: 'POST',
          body: { invoice_id: invId, trx_id: trxId }
        }));
      }

      const results = await Promise.all(reqs);
      for (const res of results) {
        assert.strictEqual(res.status, 402);
        assert.strictEqual(res.body.code, 'INSUFFICIENT_CREDITS');
      }

      const userAfter = await db.get('SELECT credits FROM users WHERE id = ?', [ACTORS.merchantDrain]);
      assert.strictEqual(userAfter.credits, 0, 'Credits must remain 0');
    }
  );

  // ===========================================================================
  // SECTION 4: CROSS-TENANT TRXID COLLISION ISOLATION
  // ===========================================================================
  console.log('\n--- SECTION 4: Cross-Tenant TrxID Collision Isolation ---');

  await test(
    'T3-TEN-COLLIDE',
    'TENANT-ISOLATION',
    'Composite unique index UNIQUE(brand_id, trx_id) allows same TrxID across distinct brands',
    async () => {
      const collisionTrxId = 'BKCOLLIDE888';
      const amount = 1500.00;

      // Ingest into Brand A
      await db.query(
        `INSERT INTO stored_data (id, brand_id, sender, raw_sms, channel, trx_id, amount, status, sim_slot)
         VALUES ('str_t3_col_a', ?, 'bKash', 'You have received Tk 1,500.00', 'bKash', ?, ?, 'UNUSED', 1)`,
        [ACTORS.brandA, collisionTrxId, amount]
      );

      // Ingest into Brand B (exact same TrxID!)
      await db.query(
        `INSERT INTO stored_data (id, brand_id, sender, raw_sms, channel, trx_id, amount, status, sim_slot)
         VALUES ('str_t3_col_b', ?, 'bKash', 'You have received Tk 1,500.00', 'bKash', ?, ?, 'UNUSED', 1)`,
        [ACTORS.brandB, collisionTrxId, amount]
      );

      // Verify both exist in DB
      const recordA = await db.get('SELECT * FROM stored_data WHERE id = ?', ['str_t3_col_a']);
      const recordB = await db.get('SELECT * FROM stored_data WHERE id = ?', ['str_t3_col_b']);

      assert(recordA && recordB, 'Both records must exist due to composite index (brand_id, trx_id)');
      assert.strictEqual(recordA.trx_id, collisionTrxId);
      assert.strictEqual(recordB.trx_id, collisionTrxId);
      assert.notStrictEqual(recordA.brand_id, recordB.brand_id);
    }
  );

  await test(
    'T3-TEN-INDEPENDENT-CLAIM',
    'TENANT-ISOLATION',
    'Brand A claim marks Brand A transaction USED while Brand B transaction remains UNUSED',
    async () => {
      const collisionTrxId = 'BKCOLLIDE888';
      const amount = 1500.00;
      const invA = 'inv_t3_col_brand_a';
      const expiresAt = getUtcSql(new Date(Date.now() + 15 * 60 * 1000));

      await db.query(
        `INSERT INTO invoices (id, brand_id, invoice_number, customer_name, amount, currency, status, expires_at)
         VALUES (?, ?, 'INV-COL-A', 'Brand A Customer', ?, 'BDT', 'PENDING', ?)`,
        [invA, ACTORS.brandA, amount, expiresAt]
      );

      // Customer A reconciles Brand A's invoice
      const resA = await apiRequest('/api/payment/submit-trx', {
        method: 'POST',
        body: { invoice_id: invA, trx_id: collisionTrxId }
      });

      assert.strictEqual(resA.status, 200, `Brand A claim should succeed, got ${resA.status}`);
      assert.strictEqual(resA.body.status, 'PAID');

      // Verify Brand A transaction is now USED
      const strA = await db.get('SELECT status FROM stored_data WHERE id = ?', ['str_t3_col_a']);
      assert.strictEqual(strA.status, 'USED');

      // CRITICAL: Verify Brand B transaction remains UNUSED!
      const strB = await db.get('SELECT status FROM stored_data WHERE id = ?', ['str_t3_col_b']);
      assert.strictEqual(strB.status, 'UNUSED', 'Brand B transaction must remain UNUSED and unaffected!');
    }
  );

  await test(
    'T3-TEN-EXECUTE-B',
    'TENANT-ISOLATION',
    'Brand B customer subsequently claims Brand B invoice using same TrxID successfully',
    async () => {
      const collisionTrxId = 'BKCOLLIDE888';
      const amount = 1500.00;
      const invB = 'inv_t3_col_brand_b';
      const expiresAt = getUtcSql(new Date(Date.now() + 15 * 60 * 1000));

      await db.query(
        `INSERT INTO invoices (id, brand_id, invoice_number, customer_name, amount, currency, status, expires_at)
         VALUES (?, ?, 'INV-COL-B', 'Brand B Customer', ?, 'BDT', 'PENDING', ?)`,
        [invB, ACTORS.brandB, amount, expiresAt]
      );

      // Customer B reconciles Brand B's invoice
      const resB = await apiRequest('/api/payment/submit-trx', {
        method: 'POST',
        body: { invoice_id: invB, trx_id: collisionTrxId }
      });

      assert.strictEqual(resB.status, 200, `Brand B claim should succeed, got ${resB.status}`);
      assert.strictEqual(resB.body.status, 'PAID');

      // Brand B transaction is now USED
      const strB = await db.get('SELECT status FROM stored_data WHERE id = ?', ['str_t3_col_b']);
      assert.strictEqual(strB.status, 'USED');

      // Both invoices are independently completed
      const finalInvA = await db.get('SELECT status FROM invoices WHERE id = ?', ['inv_t3_col_brand_a']);
      const finalInvB = await db.get('SELECT status FROM invoices WHERE id = ?', ['inv_t3_col_brand_b']);
      assert.strictEqual(finalInvA.status, 'PAID');
      assert.strictEqual(finalInvB.status, 'PAID');
    }
  );

  await test(
    'T3-TEN-THEFT-DEFENSE',
    'TENANT-ISOLATION',
    'Merchant B invoice cannot claim Merchant A transaction (Cross-tenant transaction theft rejected with HTTP 400)',
    async () => {
      const secretTrxA = 'BKSECRET_FOR_A_ONLY';
      const amount = 750.00;

      // Ingest only into Brand A
      await db.query(
        `INSERT INTO stored_data (id, brand_id, sender, raw_sms, channel, trx_id, amount, status, sim_slot)
         VALUES ('str_t3_secret_a', ?, 'bKash', 'You have received Tk 750.00', 'bKash', ?, ?, 'UNUSED', 1)`,
        [ACTORS.brandA, secretTrxA, amount]
      );

      // Brand B creates invoice for 750.00
      const invTheft = 'inv_t3_theft_attempt';
      const expiresAt = getUtcSql(new Date(Date.now() + 15 * 60 * 1000));
      await db.query(
        `INSERT INTO invoices (id, brand_id, invoice_number, customer_name, amount, currency, status, expires_at)
         VALUES (?, ?, 'INV-THEFT-B', 'Malicious Buyer', ?, 'BDT', 'PENDING', ?)`,
        [invTheft, ACTORS.brandB, amount, expiresAt]
      );

      // Malicious buyer attempts to claim Brand A's transaction on Brand B's invoice
      const res = await apiRequest('/api/payment/submit-trx', {
        method: 'POST',
        body: { invoice_id: invTheft, trx_id: secretTrxA }
      });

      assert.strictEqual(res.status, 400, 'Cross-tenant claim must be rejected');
      assert.strictEqual(res.body.code, 'TRANSACTION_INVALID');

      // Brand A transaction must remain strictly UNUSED
      const strA = await db.get('SELECT status FROM stored_data WHERE id = ?', ['str_t3_secret_a']);
      assert.strictEqual(strA.status, 'UNUSED');

      // Brand B invoice remains PENDING
      const inv = await db.get('SELECT status FROM invoices WHERE id = ?', [invTheft]);
      assert.strictEqual(inv.status, 'PENDING');
    }
  );

  // ===========================================================================
  // TEST SUITE SUMMARY
  // ===========================================================================
  console.log('\n===============================================================================');
  console.log(`  Tier 3 Execution Finished: ${summary.passed} Passed / ${summary.total} Total (${summary.failed} Failed)`);
  console.log('===============================================================================');

  if (server) server.close();

  if (summary.failed > 0) {
    process.exit(1);
  }
}

runTier3Suite().catch((err) => {
  console.error('[Fatal Tier 3 Test Failure]', err);
  if (server) server.close();
  process.exit(1);
});
