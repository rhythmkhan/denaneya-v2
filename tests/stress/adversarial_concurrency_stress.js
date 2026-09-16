/**
 * DenaNeya v2.0 - Empirical Adversarial Concurrency Stress Suite
 * Milestone 5 Challenger 2 (Concurrency & Real-World Stress Challenger)
 * 
 * Deeply stresses:
 * 1. 100-Worker Simultaneous CAS Double-Spend Race on 1 TrxID
 * 2. Multi-Endpoint Collision Race (Hosted Checkout vs S2S Verify vs S2S Confirm)
 * 3. Credit Depletion Race & ACID Rollback Verification (Credits = 1, 30 parallel claims)
 * 4. 4-Tenant Parallel Concurrency with Identical TrxID Collisions
 * 5. Amount Mismatch vs Correct Amount Simultaneous Race
 */

process.env.NODE_ENV = 'test';
process.env.DB_CLIENT = 'sqlite';
process.env.DB_SQLITE_PATH = ':memory:';
process.env.JWT_SECRET = 'denaneya_development_jwt_secret_min_32_bytes_long_12345';

import assert from 'node:assert';
import http from 'node:http';
import crypto from 'node:crypto';

// Dynamic import after env var configuration to ensure isolated in-memory DB
const dbPkg = (await import('@denaneya/database')).default || await import('@denaneya/database');
const { getDatabase, runMigrations, runSeed } = dbPkg;
const { createApp } = await import('../../apps/api/src/app.js');

console.log('===============================================================================');
console.log('  DenaNeya v2.0 - Adversarial Concurrency Stress Harness (Milestone 5)        ');
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

async function stressAssert(id, name, fn) {
  summary.total++;
  process.stdout.write(`  [TEST] ${id}: ${name}... `);
  const start = Date.now();
  try {
    await fn();
    const duration = Date.now() - start;
    summary.passed++;
    console.log(`PASS (${duration}ms)`);
  } catch (err) {
    const duration = Date.now() - start;
    summary.failed++;
    console.log(`FAIL (${duration}ms)`);
    console.error(`         >>> Error: ${err.message}`);
    summary.failures.push({ id, name, error: err.message, stack: err.stack });
  }
}

let seq = 0;
async function api(path, { method = 'GET', headers = {}, body = null } = {}) {
  seq++;
  const ipSuffix = (seq % 220) + 1;
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

async function setup() {
  db = getDatabase();
  const migRes = await runMigrations(db, { reset: true });
  assert.strictEqual(migRes.success, true);
  await runSeed(db);

  const app = createApp();
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
  console.log(`[Setup] In-memory SQLite initialized; test API listening at ${baseUrl}\n`);
}

async function teardown() {
  if (server) await new Promise((r) => server.close(r));
  if (db && typeof db.close === 'function') await db.close();
}

async function runAdversarialHarness() {
  await setup();

  try {
    // -------------------------------------------------------------------------
    // TEST ADV-01: 100 CONCURRENT WORKERS CLAIMING 1 TrxID
    // -------------------------------------------------------------------------
    await stressAssert('ADV-01', '100 Concurrent Workers Race on 1 TrxID (Hosted Checkout)', async () => {
      const merchantId = 'usr_adv_01';
      const brandId = 'brand_adv_01';
      const trxId = 'TRX_STRESS_100_WINNER';
      const amount = 2500.00;
      const initialCredits = 1000;

      await db.query(
        `INSERT INTO users (id, name, email, password_hash, role, credits, status)
         VALUES (?, 'Adv User 01', 'adv01@test.com', 'h', 'merchant', ?, 'active')`,
        [merchantId, initialCredits]
      );
      await db.query(
        `INSERT INTO brands (id, user_id, brand_name, brand_slug, api_key, api_secret, webhook_secret, status)
         VALUES (?, ?, 'Adv Brand 01', 'adv-brand-01', 'k_01', 's_01', 'wh_01', 'active')`,
        [brandId, merchantId]
      );

      // Ingest 1 authentic transaction
      await db.query(
        `INSERT INTO stored_data (id, brand_id, sender, raw_sms, channel, trx_id, amount, status)
         VALUES ('str_adv_01', ?, 'bKash', 'Received 2500', 'bKash', ?, ?, 'UNUSED')`,
        [brandId, trxId, amount]
      );

      // Create 100 pending invoices
      const invoiceIds = [];
      const expiresAt = getUtcSql(new Date(Date.now() + 15 * 60 * 1000));
      for (let i = 1; i <= 100; i++) {
        const invId = `inv_adv_01_${String(i).padStart(3, '0')}`;
        invoiceIds.push(invId);
        await db.query(
          `INSERT INTO invoices (id, brand_id, invoice_number, customer_name, amount, currency, status, expires_at)
           VALUES (?, ?, ?, 'Customer', ?, 'BDT', 'PENDING', ?)`,
          [invId, brandId, `INV-100-${i}`, amount, expiresAt]
        );
      }

      // Fire 100 concurrent claims simultaneously
      const promises = invoiceIds.map((invId) => {
        return api('/api/payment/submit-trx', {
          method: 'POST',
          body: { invoice_id: invId, trx_id: trxId }
        });
      });

      const results = await Promise.all(promises);

      const winners = results.filter((r) => r.status === 200);
      const losers = results.filter((r) => r.status === 400);

      assert.strictEqual(winners.length, 1, `CRITICAL DOUBLE SPEND: expected 1 winner, got ${winners.length}`);
      assert.strictEqual(losers.length, 99, `Expected 99 rejections, got ${losers.length}`);

      // Database integrity:
      const paidInvoices = await db.query(
        `SELECT id, trx_id FROM invoices WHERE brand_id = ? AND status = 'PAID'`,
        [brandId]
      );
      assert.strictEqual(paidInvoices.rows.length, 1, 'Only 1 invoice marked PAID');
      assert.strictEqual(paidInvoices.rows[0].trx_id, trxId);

      const pendingCount = await db.get(
        `SELECT count(*) as cnt FROM invoices WHERE brand_id = ? AND status = 'PENDING'`,
        [brandId]
      );
      assert.strictEqual(Number(pendingCount.cnt), 99, '99 invoices remain PENDING');

      const user = await db.get(`SELECT credits FROM users WHERE id = ?`, [merchantId]);
      assert.strictEqual(user.credits, initialCredits - 1, 'Merchant credits decremented by exactly 1');

      const stored = await db.get(`SELECT status, used_at FROM stored_data WHERE id = 'str_adv_01'`);
      assert.strictEqual(stored.status, 'USED');
      assert.ok(stored.used_at);
    });

    // -------------------------------------------------------------------------
    // TEST ADV-02: MULTI-ENDPOINT COLLISION RACE
    // -------------------------------------------------------------------------
    await stressAssert('ADV-02', 'Multi-Endpoint Race: Checkout vs S2S Verify vs S2S Confirm on same TrxID', async () => {
      const merchantId = 'usr_adv_02';
      const brandId = 'brand_adv_02';
      const apiKey = 'api_key_adv_02_1234567890';
      const apiSec = 'api_sec_adv_02_12345678901234567890';
      const trxId = 'TRX_MULTI_ENDPOINT_99';
      const amount = 3000.00;

      await db.query(
        `INSERT INTO users (id, name, email, password_hash, role, credits, status)
         VALUES (?, 'Adv User 02', 'adv02@test.com', 'h', 'merchant', 500, 'active')`,
        [merchantId]
      );
      await db.query(
        `INSERT INTO brands (id, user_id, brand_name, brand_slug, api_key, api_secret, webhook_secret, status)
         VALUES (?, ?, 'Adv Brand 02', 'adv-brand-02', ?, ?, 'wh_02', 'active')`,
        [brandId, merchantId, apiKey, apiSec]
      );

      const storedId = 'str_adv_02';
      await db.query(
        `INSERT INTO stored_data (id, brand_id, sender, raw_sms, channel, trx_id, amount, status)
         VALUES (?, ?, 'Nagad', 'Received 3000', 'Nagad', ?, ?, 'UNUSED')`,
        [storedId, brandId, trxId, amount]
      );

      // Create 15 pending invoices for checkout claims
      const expiresAt = getUtcSql(new Date(Date.now() + 15 * 60 * 1000));
      const invIds = [];
      for (let i = 1; i <= 15; i++) {
        const invId = `inv_multi_${i}`;
        invIds.push(invId);
        await db.query(
          `INSERT INTO invoices (id, brand_id, invoice_number, customer_name, amount, currency, status, expires_at)
           VALUES (?, ?, ?, 'Multi User', ?, 'BDT', 'PENDING', ?)`,
          [invId, brandId, `INV-M-${i}`, amount, expiresAt]
        );
      }

      // Mix: 15 hosted checkout claims + 15 S2S confirms
      const mixedRequests = [];
      for (const invId of invIds) {
        mixedRequests.push(
          api('/api/payment/submit-trx', {
            method: 'POST',
            body: { invoice_id: invId, trx_id: trxId }
          })
        );
      }
      for (let j = 1; j <= 15; j++) {
        mixedRequests.push(
          api('/v1/trx/confirm', {
            method: 'POST',
            headers: { 'X-API-KEY': apiKey, 'X-API-SECRET': apiSec },
            body: { id: storedId, trx_id: trxId }
          })
        );
      }

      // Fire all 30 simultaneously
      const mixedResults = await Promise.all(mixedRequests);

      const successful = mixedResults.filter((r) => r.status === 200);
      assert.strictEqual(
        successful.length,
        1,
        `CRITICAL RACE: Exactly 1 claim (checkout OR s2s confirm) must succeed across endpoints, got ${successful.length}`
      );

      // The transaction must now be USED exactly once
      const storedFinal = await db.get(`SELECT status FROM stored_data WHERE id = ?`, [storedId]);
      assert.strictEqual(storedFinal.status, 'USED');
    });

    // -------------------------------------------------------------------------
    // TEST ADV-03: CREDIT DRAIN CONCURRENCY & ACID ROLLBACK
    // -------------------------------------------------------------------------
    await stressAssert('ADV-03', 'Credit Drain Concurrency (Credits = 1, 30 parallel claims): Balance never negative, failed claims rolled back', async () => {
      const merchantId = 'usr_adv_03_drain';
      const brandId = 'brand_adv_03_drain';

      // Set merchant credits to exactly 1
      await db.query(
        `INSERT INTO users (id, name, email, password_hash, role, credits, status)
         VALUES (?, 'Drain Merchant', 'drain@test.com', 'h', 'merchant', 1, 'active')`,
        [merchantId]
      );
      await db.query(
        `INSERT INTO brands (id, user_id, brand_name, brand_slug, api_key, api_secret, webhook_secret, status)
         VALUES (?, ?, 'Drain Brand', 'drain-brand', 'k_dr', 's_dr', 'wh_dr', 'active')`,
        [brandId, merchantId]
      );

      // Seed 30 distinct transactions and 30 distinct invoices
      const expiresAt = getUtcSql(new Date(Date.now() + 15 * 60 * 1000));
      const pairs = [];
      for (let i = 1; i <= 30; i++) {
        const tId = `BKDRAIN_ADV_${String(i).padStart(3, '0')}`;
        const iId = `inv_adv_drain_${String(i).padStart(3, '0')}`;
        const sId = `str_adv_drain_${String(i).padStart(3, '0')}`;

        await db.query(
          `INSERT INTO stored_data (id, brand_id, sender, raw_sms, channel, trx_id, amount, status)
           VALUES (?, ?, 'bKash', 'Drain test', 'bKash', ?, 500.00, 'UNUSED')`,
          [sId, brandId, tId]
        );
        await db.query(
          `INSERT INTO invoices (id, brand_id, invoice_number, customer_name, amount, currency, status, expires_at)
           VALUES (?, ?, ?, 'Customer', 500.00, 'BDT', 'PENDING', ?)`,
          [iId, brandId, `INV-DR-${i}`, expiresAt]
        );

        pairs.push({ invId: iId, trxId: tId, strId: sId });
      }

      // Fire 30 concurrent claims
      const reqs = pairs.map((p) => {
        return api('/api/payment/submit-trx', {
          method: 'POST',
          body: { invoice_id: p.invId, trx_id: p.trxId }
        });
      });

      const results = await Promise.all(reqs);

      const wins = results.filter((r) => r.status === 200);
      const depleted = results.filter((r) => r.status === 402);

      assert.strictEqual(wins.length, 1, `Expected 1 win on credit = 1, got ${wins.length}`);
      assert.strictEqual(depleted.length, 29, `Expected 29 HTTP 402 INSUFFICIENT_CREDITS, got ${depleted.length}`);

      // Crucial balance check:
      const user = await db.get(`SELECT credits FROM users WHERE id = ?`, [merchantId]);
      assert.strictEqual(user.credits, 0, `Credit balance must be exactly 0 (never negative!), got ${user.credits}`);

      // Crucial ACID rollback check:
      // Exactly 1 stored_data row must be USED. The other 29 MUST REMAIN UNUSED!
      const usedStored = await db.query(
        `SELECT id FROM stored_data WHERE brand_id = ? AND status = 'USED'`,
        [brandId]
      );
      assert.strictEqual(usedStored.rows.length, 1, 'Exactly 1 stored transaction marked USED');

      const unusedStored = await db.query(
        `SELECT id FROM stored_data WHERE brand_id = ? AND status = 'UNUSED'`,
        [brandId]
      );
      assert.strictEqual(
        unusedStored.rows.length,
        29,
        'CRITICAL ACID ROLLBACK: All 29 failed transactions must remain pristine UNUSED!'
      );

      // Invoices: 1 PAID, 29 PENDING
      const paidInvs = await db.query(
        `SELECT id FROM invoices WHERE brand_id = ? AND status = 'PAID'`,
        [brandId]
      );
      assert.strictEqual(paidInvs.rows.length, 1);
    });

    // -------------------------------------------------------------------------
    // TEST ADV-04: 4-BRAND PARALLEL CHECKOUTS WITH IDENTICAL TrxID
    // -------------------------------------------------------------------------
    await stressAssert('ADV-04', 'Multi-Tenant Concurrency: 4 Brands with identical TrxID processed simultaneously', async () => {
      const sharedTrx = 'QUAD_BRAND_COLLISION_777';
      const brands = [];

      for (let b = 1; b <= 4; b++) {
        const uId = `usr_quad_${b}`;
        const bId = `brand_quad_${b}`;
        await db.query(
          `INSERT INTO users (id, name, email, password_hash, role, credits, status)
           VALUES (?, 'Quad User ${b}', 'quad${b}@test.com', 'h', 'merchant', 100, 'active')`,
          [uId]
        );
        await db.query(
          `INSERT INTO brands (id, user_id, brand_name, brand_slug, api_key, api_secret, webhook_secret, status)
           VALUES (?, ?, 'Quad Brand ${b}', 'quad-brand-${b}', 'k_q${b}', 's_q${b}', 'wh_q${b}', 'active')`,
          [bId, uId]
        );

        // Ingest identical TrxID into each brand
        await db.query(
          `INSERT INTO stored_data (id, brand_id, sender, raw_sms, channel, trx_id, amount, status)
           VALUES (?, ?, 'bKash', 'Quad test', 'bKash', ?, 1200.00, 'UNUSED')`,
          [`str_quad_${b}`, bId, sharedTrx]
        );

        const invId = `inv_quad_${b}`;
        const expiresAt = getUtcSql(new Date(Date.now() + 15 * 60 * 1000));
        await db.query(
          `INSERT INTO invoices (id, brand_id, invoice_number, customer_name, amount, currency, status, expires_at)
           VALUES (?, ?, 'INV-Q-${b}', 'Customer ${b}', 1200.00, 'BDT', 'PENDING', ?)`,
          [invId, bId, expiresAt]
        );

        brands.push({ uId, bId, invId });
      }

      // Fire 4 parallel checkouts for the 4 brands simultaneously
      const quadReqs = brands.map((b) => {
        return api('/api/payment/submit-trx', {
          method: 'POST',
          body: { invoice_id: b.invId, trx_id: sharedTrx }
        });
      });

      const quadResults = await Promise.all(quadReqs);

      for (let i = 0; i < 4; i++) {
        const res = quadResults[i];
        assert.strictEqual(res.status, 200, `Brand ${i + 1} checkout must return 200, got ${res.status}`);
        assert.strictEqual(res.body.status, 'PAID');
        assert.strictEqual(res.body.trx_id, sharedTrx);
      }

      // Verify each brand's transaction is USED and user credit decremented by 1
      for (const b of brands) {
        const str = await db.get(`SELECT status FROM stored_data WHERE brand_id = ? AND trx_id = ?`, [b.bId, sharedTrx]);
        assert.strictEqual(str.status, 'USED');

        const inv = await db.get(`SELECT status, trx_id FROM invoices WHERE id = ?`, [b.invId]);
        assert.strictEqual(inv.status, 'PAID');
        assert.strictEqual(inv.trx_id, sharedTrx);

        const usr = await db.get(`SELECT credits FROM users WHERE id = ?`, [b.uId]);
        assert.strictEqual(usr.credits, 99);
      }
    });

    // -------------------------------------------------------------------------
    // TEST ADV-05: AMOUNT MISMATCH VS MATCH SIMULTANEOUS RACE
    // -------------------------------------------------------------------------
    await stressAssert('ADV-05', 'Amount Mismatch Race: 10 wrong-amount vs 10 correct-amount workers simultaneously', async () => {
      const merchantId = 'usr_adv_05';
      const brandId = 'brand_adv_05';
      const trxId = 'TRX_AMOUNT_RACE_55';
      const correctAmount = 1000.00;
      const wrongAmount = 500.00;

      await db.query(
        `INSERT INTO users (id, name, email, password_hash, role, credits, status)
         VALUES (?, 'Adv User 05', 'adv05@test.com', 'h', 'merchant', 100, 'active')`,
        [merchantId]
      );
      await db.query(
        `INSERT INTO brands (id, user_id, brand_name, brand_slug, api_key, api_secret, webhook_secret, status)
         VALUES (?, ?, 'Adv Brand 05', 'adv-brand-05', 'k_05', 's_05', 'wh_05', 'active')`,
        [brandId, merchantId]
      );

      // Ingest transaction for 1000.00
      await db.query(
        `INSERT INTO stored_data (id, brand_id, sender, raw_sms, channel, trx_id, amount, status)
         VALUES ('str_adv_05', ?, 'bKash', 'Amount race', 'bKash', ?, ?, 'UNUSED')`,
        [brandId, trxId, correctAmount]
      );

      const expiresAt = getUtcSql(new Date(Date.now() + 15 * 60 * 1000));
      const reqs = [];

      // 10 invoices for 500.00 (mismatched amount)
      for (let i = 1; i <= 10; i++) {
        const invId = `inv_mismatch_${i}`;
        await db.query(
          `INSERT INTO invoices (id, brand_id, invoice_number, customer_name, amount, currency, status, expires_at)
           VALUES (?, ?, 'INV-MIS-${i}', 'Mismatch User', ?, 'BDT', 'PENDING', ?)`,
          [invId, brandId, wrongAmount, expiresAt]
        );
        reqs.push({
          type: 'mismatch',
          invId,
          req: api('/api/payment/submit-trx', {
            method: 'POST',
            body: { invoice_id: invId, trx_id: trxId }
          })
        });
      }

      // 10 invoices for 1000.00 (correct amount)
      for (let j = 1; j <= 10; j++) {
        const invId = `inv_correct_${j}`;
        await db.query(
          `INSERT INTO invoices (id, brand_id, invoice_number, customer_name, amount, currency, status, expires_at)
           VALUES (?, ?, 'INV-COR-${j}', 'Correct User', ?, 'BDT', 'PENDING', ?)`,
          [invId, brandId, correctAmount, expiresAt]
        );
        reqs.push({
          type: 'correct',
          invId,
          req: api('/api/payment/submit-trx', {
            method: 'POST',
            body: { invoice_id: invId, trx_id: trxId }
          })
        });
      }

      // Fire all 20 simultaneously
      const results = await Promise.all(reqs.map((r) => r.req));

      const mismatchResults = results.slice(0, 10);
      const correctResults = results.slice(10, 20);

      // ALL 10 mismatch workers MUST fail
      for (const res of mismatchResults) {
        assert.strictEqual(res.status, 400, 'Mismatch amount must return 400');
        assert.strictEqual(res.body.code, 'TRANSACTION_INVALID');
      }

      // Exactly 1 of the correct workers must win, 9 must fail
      const correctWins = correctResults.filter((r) => r.status === 200);
      const correctFails = correctResults.filter((r) => r.status === 400);

      assert.strictEqual(correctWins.length, 1, `Expected exactly 1 correct worker to win, got ${correctWins.length}`);
      assert.strictEqual(correctFails.length, 9, `Expected 9 correct workers to be rejected, got ${correctFails.length}`);

      // Database state
      const str = await db.get(`SELECT status FROM stored_data WHERE id = 'str_adv_05'`);
      assert.strictEqual(str.status, 'USED');

      const user = await db.get(`SELECT credits FROM users WHERE id = ?`, [merchantId]);
      assert.strictEqual(user.credits, 99);
    });

  } finally {
    await teardown();
  }

  console.log('\n===============================================================================');
  console.log(`  Adversarial Harness Finished: ${summary.passed} Passed / ${summary.total} Total (${summary.failed} Failed)`);
  console.log('===============================================================================\n');

  if (summary.failed > 0) {
    process.exit(1);
  }
}

runAdversarialHarness().catch((err) => {
  console.error('Fatal Harness Failure:', err);
  process.exit(1);
});
