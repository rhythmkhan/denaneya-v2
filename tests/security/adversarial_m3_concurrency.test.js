/**
 * DenaNeya v2.0 - Milestone 3 Adversarial CAS Concurrency & Double-Spend Test Suite
 * File: tests/security/adversarial_m3_concurrency.test.js
 * Challenger: Milestone 3 Challenger 1 (Atomic CAS Concurrency & Double-Spend Challenger)
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
console.log('  DenaNeya v2.0 - Milestone 3 Adversarial CAS Concurrency & Double-Spend Suite ');
console.log('===============================================================================\n');

let server;
let baseUrl;
let db;

const summary = {
  total: 0,
  passed: 0,
  failed: 0,
  vulnerabilities: []
};

async function attackTest(id, category, description, fn) {
  summary.total++;
  try {
    await fn();
    summary.passed++;
    console.log(`  [PASS] ${id} - [${category}] ${description}`);
  } catch (err) {
    summary.failed++;
    console.error(`  [FAIL/VULN] ${id} - [${category}] ${description}`);
    console.error(`         >>> Error: ${err.message}`);
    summary.vulnerabilities.push({ id, category, description, error: err.message });
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

const ACTOR = {
  userA: 'usr_adv_m3_a',
  brandA: 'brand_adv_m3_a',
  apiKeyA: 'api_key_adv_m3_a_1234567890123456',
  apiSecretA: 'api_secret_adv_m3_a_12345678901234567890123456789012',
  userB: 'usr_adv_m3_b',
  brandB: 'brand_adv_m3_b',
  userDrain: 'usr_adv_m3_drain',
  brandDrain: 'brand_adv_m3_drain',
  apiKeyDrain: 'api_key_adv_m3_drain_12345678901234',
  apiSecretDrain: 'api_secret_adv_m3_drain_1234567890123456789012345'
};

async function setupDatabase() {
  db = getDatabase();
  const migRes = await runMigrations(db, { reset: true });
  assert.strictEqual(migRes.success, true, 'Migrations must succeed');
  await runSeed(db);

  await db.query(`DELETE FROM users WHERE id IN (?, ?, ?)`, [ACTOR.userA, ACTOR.userB, ACTOR.userDrain]);
  await db.query(`DELETE FROM brands WHERE id IN (?, ?, ?)`, [ACTOR.brandA, ACTOR.brandB, ACTOR.brandDrain]);

  await db.query(
    `INSERT INTO users (id, name, email, password_hash, role, credits, status)
     VALUES (?, ?, ?, ?, 'merchant', 200, 'active')`,
    [ACTOR.userA, 'Merchant A (Concurrency)', 'merchant_a_race@test.com', 'hash']
  );
  await db.query(
    `INSERT INTO brands (id, user_id, brand_name, brand_slug, api_key, api_secret, webhook_url, webhook_secret, status)
     VALUES (?, ?, 'Brand A Concurrency', 'brand-a-race', ?, ?, 'https://example.com/webhook', 'secret_m3_test_brand_a_32_bytes_long', 'active')`,
    [ACTOR.brandA, ACTOR.userA, ACTOR.apiKeyA, ACTOR.apiSecretA]
  );

  await db.query(
    `INSERT INTO users (id, name, email, password_hash, role, credits, status)
     VALUES (?, ?, ?, ?, 'merchant', 100, 'active')`,
    [ACTOR.userB, 'Merchant B (Isolation)', 'merchant_b_race@test.com', 'hash']
  );
  await db.query(
    `INSERT INTO brands (id, user_id, brand_name, brand_slug, api_key, api_secret, webhook_secret, status)
     VALUES (?, ?, 'Brand B Isolation', 'brand-b-race', 'key_b_concurrency', 'sec_b_concurrency', 'secret_b_32_bytes_long_1234567890', 'active')`,
    [ACTOR.brandB, ACTOR.userB]
  );

  await db.query(
    `INSERT INTO users (id, name, email, password_hash, role, credits, status)
     VALUES (?, ?, ?, ?, 'merchant', 1, 'active')`,
    [ACTOR.userDrain, 'Merchant Drain', 'merchant_drain@test.com', 'hash']
  );
  await db.query(
    `INSERT INTO brands (id, user_id, brand_name, brand_slug, api_key, api_secret, webhook_secret, status)
     VALUES (?, ?, 'Brand Drain', 'brand-drain', ?, ?, 'secret_drain_32_bytes_long_1234567890', 'active')`,
    [ACTOR.brandDrain, ACTOR.userDrain, ACTOR.apiKeyDrain, ACTOR.apiSecretDrain]
  );
}

async function runAdversarialM3Suite() {
  await setupDatabase();

  const app = createApp();
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
  console.log(`[Setup] Adversarial M3 Concurrency test target active on ${baseUrl}\n`);

  // ============================================================================
  // ATTACK VECTOR A: SIMULTANEOUS RACE ATTACK
  // ===========================================================================
  console.log('--- ATTACK VECTOR A: Simultaneous Race Attack ---');

  await attackTest(
    'ATK-RACE-01',
    'CAS-CONCURRENCY',
    '10 parallel asynchronous workers attempting to claim exact same UNUSED TrxID against 10 distinct invoices: Exactly 1 succeeds, 9 fail with TRANSACTION_INVALID',
    async () => {
      const trxId = 'BKRACE100001';
      const amount = 500.00;
      const initialCredits = 200;

      await db.query('UPDATE users SET credits = ? WHERE id = ?', [initialCredits, ACTOR.userA]);

      await db.query(
        `INSERT INTO stored_data (id, brand_id, sender, raw_sms, channel, trx_id, amount, status, sim_slot)
         VALUES ('str_race_01', ?, 'bKash', 'You have received Tk 500.00', 'bKash', ?, ?, 'UNUSED', 1)`,
        [ACTOR.brandA, trxId, amount]
      );

      const invoiceIds = [];
      for (let i = 1; i <= 10; i++) {
        const invId = `inv_race_a_${String(i).padStart(2, '0')}`;
        invoiceIds.push(invId);
        const expiresAt = getUtcSql(new Date(Date.now() + 15 * 60 * 1000));
        await db.query(
          `INSERT INTO invoices (id, brand_id, invoice_number, customer_name, customer_phone, amount, currency, status, expires_at)
           VALUES (?, ?, ?, 'Race Customer', '01711000000', ?, 'BDT', 'PENDING', ?)`,
          [invId, ACTOR.brandA, `INV-RACE-A-${i}`, amount, expiresAt]
        );
      }

      const workerPromises = invoiceIds.map((invId) => {
        return apiRequest('/api/payment/submit-trx', {
          method: 'POST',
          body: { invoice_id: invId, trx_id: trxId }
        });
      });

      const responses = await Promise.all(workerPromises);

      const successful = responses.filter((r) => r.status === 200 && r.body?.success === true && r.body?.status === 'PAID');
      const failed = responses.filter((r) => r.status === 400 && r.body?.success === false && r.body?.code === 'TRANSACTION_INVALID');

      assert.strictEqual(successful.length, 1, `Expected EXACTLY 1 successful claim, got ${successful.length}`);
      assert.strictEqual(failed.length, 9, `Expected EXACTLY 9 rejected claims, got ${failed.length}`);

      const winnerInvoiceId = successful[0].body.invoice_id;
      assert.ok(invoiceIds.includes(winnerInvoiceId), 'Winner invoice ID must be one of the 10 target invoices');

      const stored = await db.get('SELECT status, used_at FROM stored_data WHERE id = ?', ['str_race_01']);
      assert.strictEqual(stored.status, 'USED', 'Stored transaction status must be USED');
      assert.ok(stored.used_at !== null, 'used_at timestamp must be recorded');

      const invoicesInDb = await db.query(
        `SELECT id, status, trx_id FROM invoices WHERE id IN (${invoiceIds.map(() => '?').join(',')})`,
        invoiceIds
      );
      const paidInvoices = invoicesInDb.rows.filter((inv) => inv.status === 'PAID');
      const pendingInvoices = invoicesInDb.rows.filter((inv) => inv.status === 'PENDING');

      assert.strictEqual(paidInvoices.length, 1, `Exactly 1 invoice must be PAID in database, got ${paidInvoices.length}`);
      assert.strictEqual(pendingInvoices.length, 9, `Exactly 9 invoices must remain PENDING in database, got ${pendingInvoices.length}`);
      assert.strictEqual(paidInvoices[0].id, winnerInvoiceId, 'Database PAID invoice must match the HTTP winner invoice ID');
      assert.strictEqual(paidInvoices[0].trx_id, trxId, 'Paid invoice must record the winning trx_id');

      const user = await db.get('SELECT credits FROM users WHERE id = ?', [ACTOR.userA]);
      assert.strictEqual(user.credits, initialCredits - 1, `Credits must decrement from ${initialCredits} to ${initialCredits - 1}, got ${user.credits}`);

      const webhookLogs = await db.query(
        `SELECT id, invoice_id, event, status FROM webhook_logs WHERE invoice_id IN (${invoiceIds.map(() => '?').join(',')})`,
        invoiceIds
      );
      assert.strictEqual(webhookLogs.rows.length, 1, `Exactly 1 webhook log must be enqueued, got ${webhookLogs.rows.length}`);
      assert.strictEqual(webhookLogs.rows[0].invoice_id, winnerInvoiceId, 'Webhook log must correspond to winning invoice');
    }
  );

  await attackTest(
    'ATK-RACE-02',
    'CAS-CONCURRENCY',
    'Multi-round stress race: 5 consecutive rounds of 10 workers (50 concurrent requests total) with zero CAS race failures',
    async () => {
      const rounds = 5;
      const initialUser = await db.get('SELECT credits FROM users WHERE id = ?', [ACTOR.userA]);
      const initialCredits = initialUser.credits;

      for (let round = 1; round <= rounds; round++) {
        const trxId = `BKMULTIRACE${round}000`;
        const amount = 300.00 + round * 10;

        await db.query(
          `INSERT INTO stored_data (id, brand_id, sender, raw_sms, channel, trx_id, amount, status, sim_slot)
           VALUES (?, ?, 'Nagad', 'Nagad receipt', 'Nagad', ?, ?, 'UNUSED', 1)`,
          [`str_multi_${round}`, ACTOR.brandA, trxId, amount]
        );

        const roundInvIds = [];
        for (let i = 1; i <= 10; i++) {
          const invId = `inv_multi_${round}_${i}`;
          roundInvIds.push(invId);
          const expiresAt = getUtcSql(new Date(Date.now() + 15 * 60 * 1000));
          await db.query(
            `INSERT INTO invoices (id, brand_id, invoice_number, customer_name, amount, currency, status, expires_at)
             VALUES (?, ?, ?, 'Multi Customer', ?, 'BDT', 'PENDING', ?)`,
            [invId, ACTOR.brandA, `INV-MULTI-${round}-${i}`, amount, expiresAt]
          );
        }

        const promises = roundInvIds.map((invId) => {
          return apiRequest('/api/payment/submit-trx', {
            method: 'POST',
            body: { invoice_id: invId, trx_id: trxId }
          });
        });

        const responses = await Promise.all(promises);
        const wins = responses.filter((r) => r.status === 200 && r.body?.status === 'PAID');
        const fails = responses.filter((r) => r.status === 400 && r.body?.code === 'TRANSACTION_INVALID');

        assert.strictEqual(wins.length, 1, `Round ${round}: expected 1 winner, got ${wins.length}`);
        assert.strictEqual(fails.length, 9, `Round ${round}: expected 9 failures, got ${fails.length}`);

        const stored = await db.get('SELECT status FROM stored_data WHERE id = ?', [`str_multi_${round}`]);
        assert.strictEqual(stored.status, 'USED', `Round ${round}: stored transaction must be USED`);
      }

      const finalUser = await db.get('SELECT credits FROM users WHERE id = ?', [ACTOR.userA]);
      assert.strictEqual(finalUser.credits, initialCredits - rounds, `Expected credits to be ${initialCredits - rounds}, got ${finalUser.credits}`);
    }
  );

  await attackTest(
    'ATK-RACE-03',
    'CAS-CONCURRENCY',
    'Parametrized endpoint race: 10 parallel workers on /api/invoices/:id/verify targeting same TrxID: Exactly 1 succeeds, 9 fail',
    async () => {
      const trxId = 'BKPARAMRACE999';
      const amount = 450.00;

      await db.query(
        `INSERT INTO stored_data (id, brand_id, sender, raw_sms, channel, trx_id, amount, status, sim_slot)
         VALUES ('str_param_race', ?, 'Rocket', 'DBBL Rocket', 'Rocket', ?, ?, 'UNUSED', 1)`,
        [ACTOR.brandA, trxId, amount]
      );

      const invIds = [];
      for (let i = 1; i <= 10; i++) {
        const invId = `inv_param_race_${i}`;
        invIds.push(invId);
        const expiresAt = getUtcSql(new Date(Date.now() + 15 * 60 * 1000));
        await db.query(
          `INSERT INTO invoices (id, brand_id, invoice_number, customer_name, amount, currency, status, expires_at)
           VALUES (?, ?, ?, 'Param Customer', ?, 'BDT', 'PENDING', ?)`,
          [invId, ACTOR.brandA, `INV-PARAM-${i}`, amount, expiresAt]
        );
      }

      const promises = invIds.map((invId) => {
        return apiRequest(`/api/invoices/${invId}/verify`, {
          method: 'POST',
          body: { trx_id: trxId }
        });
      });

      const responses = await Promise.all(promises);
      const wins = responses.filter((r) => r.status === 200 && r.body?.status === 'PAID');
      const fails = responses.filter((r) => r.status === 400 && r.body?.code === 'TRANSACTION_INVALID');

      assert.strictEqual(wins.length, 1, `Parametrized race: expected 1 winner, got ${wins.length}`);
      assert.strictEqual(fails.length, 9, `Parametrized race: expected 9 fails, got ${fails.length}`);
    }
  );

  await attackTest(
    'ATK-RACE-04',
    'CAS-CONCURRENCY',
    'S2S 2-Step API confirmation race: 10 parallel workers on /v1/trx/confirm with same transaction UUID: Exactly 1 succeeds, 9 fail with TRANSACTION_ALREADY_USED',
    async () => {
      const trxId = 'BKS2SRACE777';
      const amount = 1000.00;
      const strId = 'str_s2s_race';

      await db.query(
        `INSERT INTO stored_data (id, brand_id, sender, raw_sms, channel, trx_id, amount, status, sim_slot)
         VALUES (?, ?, 'bKash', 'bKash Tk 1000', 'bKash', ?, ?, 'UNUSED', 1)`,
        [strId, ACTOR.brandA, trxId, amount]
      );

      const verifyRes = await apiRequest('/v1/trx/verify', {
        method: 'POST',
        headers: {
          'X-API-KEY': ACTOR.apiKeyA,
          'X-API-SECRET': ACTOR.apiSecretA
        },
        body: { trx_id: trxId, amount }
      });
      assert.strictEqual(verifyRes.status, 200, 'Verification pre-check must succeed');

      const promises = Array.from({ length: 10 }, () => {
        return apiRequest('/v1/trx/confirm', {
          method: 'POST',
          headers: {
            'X-API-KEY': ACTOR.apiKeyA,
            'X-API-SECRET': ACTOR.apiSecretA
          },
          body: { id: strId, trx_id: trxId }
        });
      });

      const responses = await Promise.all(promises);
      const wins = responses.filter((r) => r.status === 200 && r.body?.success === true && r.body?.data?.status === 'USED');
      const fails = responses.filter((r) => r.status === 400 && r.body?.code === 'TRANSACTION_ALREADY_USED');

      assert.strictEqual(wins.length, 1, `S2S confirm race: expected 1 winner, got ${wins.length}`);
      assert.strictEqual(fails.length, 9, `S2S confirm race: expected 9 fails with TRANSACTION_ALREADY_USED, got ${fails.length}`);

      const finalTx = await db.get('SELECT status FROM stored_data WHERE id = ?', [strId]);
      assert.strictEqual(finalTx.status, 'USED', 'Final stored_data status must be USED');
    }
  );

  // ===========================================================================
  // ATTACK VECTOR B DOUBLE-SPEND RE-SUBMISSION ATTACK\n  // ===========================================================================
  console.log('\n--- ATTACK VECTOR B: Double-Spend Re-Submission Attack ---');

  await attackTest(
    'ATK-DS-01',
    'DOUBLE-SPEND',
    'Immediate re-submission of already-claimed TrxID against second invoice: Rejected with uniform TRANSACTION_INVALID',
    async () => {
      const trxId = 'BKCLAIMED001';
      const amount = 250.00;

      await db.query(
        `INSERT INTO stored_data (id, brand_id, sender, raw_sms, channel, trx_id, amount, status, sim_slot)
         VALUES ('str_ds_01', ?, 'bKash', 'bKash Vk 250', 'bKash', ?, ?, 'UNUSED', 1)`,
        [ACTOR.brandA, trxId, amount]
      );

      const expiresAt = getUtcSql(new Date(Date.now() + 15 * 60 * 1000));
      await db.query(
        `INSERT INTO invoices (id, brand_id, invoice_number, customer_name, amount, currency, status, expires_at)
         VALUES ('inv_ds_first', ?, 'INV-DS-1', 'DS First', ?, 'BDT', 'PENDING', ?),
                ('inv_ds_second', ?, 'INV-DS-2', 'DS Second', ?, 'BDT', 'PENDING', ?)`,
        [ACTOR.brandA, amount, expiresAt, ACTOR.brandA, amount, expiresAt]
      );

      const res1 = await apiRequest('/api/payment/submit-trx', {
        method: 'POST',
        body: { invoice_id: 'inv_ds_first', trx_id: trxId }
      });
      assert.strictEqual(res1.status, 200, 'First claim must succeed with HTTP 200');
      assert.strictEqual(res1.body.status, 'PAID');

      const res2 = await apiRequest('/api/payment/submit-trx', {
        method: 'POST',
        body: { invoice_id: 'inv_ds_second', trx_id: trxId }
      });

      assert.strictEqual(res2.status, 400, `Double spend must return HTTP 400, got ${res2.status}`);
      assert.strictEqual(res2.body.success, false);
      assert.strictEqual(res2.body.code, 'TRANSACTION_INVALID', `Error code must be TRANSACTION_INVALID, got ${res2.body.code}`);
      assert.strictEqual(res2.body.message, 'Transaction verification failed. Please check your TrxID and try again.');

      const inv2 = await db.get('SELECT status, trx_id FROM invoices WHERE id = ?', ['inv_ds_second']);
      assert.strictEqual(inv2.status, 'PENDING', 'Second invoice must remain PENDING');
      assert.strictEqual(inv2.trx_id, null, 'Second invoice trx_id must remain null');
    }
  );

  await attackTest(
    'ATK-DS-02',
    'DOUBLE-SPEND',
    'Delayed re-submission of claimed TrxID (after 250ms sleep): Rejected with uniform TRANSACTION_INVALID',
    async () => {
      const trxId = 'BKCLAIMED002';
      const amount = 350.00;

      await db.query(
        `INSERT INTO stored_data (id, brand_id, sender, raw_sms, channel, trx_id, amount, status, sim_slot)
         VALUES ('str_ds_02', ?, 'Nagad', 'Nagad Tk 350', 'Nagad', ?, ?, 'UNUSED', 1)`,
        [ACTOR.brandA, trxId, amount]
      );

      const expiresAt = getUtcSql(new Date(Date.now() + 15 * 60 * 1000));
      await db.query(
        `INSERT INTO invoices (id, brand_id, invoice_number, customer_name, amount, currency, status, expires_at)
         VALUES ('inv_ds_delay_1', ?, 'INV-DS-D1', 'Delay 1', ?, 'BDE', 'PENDING', ?),
                ('inv_ds_delay_2', ?, 'INV-DS-D2', 'Delay 2', ?, 'BDE', 'PENDING', ?)`,
        [ACTOR.brandA, amount, expiresAt, ACTOR.brandA, amount, expiresAt]
      );

      const res1 = await apiRequest('/api/payment/submit-trx', {
        method: 'POST',
        body: { invoice_id: 'inv_ds_delay_1', trx_id: trxId }
      });
      assert.strictEqual(res1.status, 200);

      await new Promise((r) => setTimeout(r, 250));

      const res2 = await apiRequest('/api/payment/submit-trx', {
        method: 'POST',
        body: { invoice_id: 'inv_ds_delay_2', trx_id: trxId }
      });

      assert.strictEqual(res2.status, 400);
      assert.strictEqual(res2.body.code, 'TRANSACTION_INVALID');
      const invDelay2 = await db.get('SELECT status FROM invoices WHERE id = ?', ['inv_ds_delay_2']);
      assert.strictEqual(invDelay2.status, 'PENDING');
    }
  );

  await attackTest(
    'ATK-DS-03',
    'DOUBLE-SPEND',
    'Re-submission against already-paid invoice: Rejected with INVOICE_ALREADY_PAID guard',
    async () => {
      const res = await apiRequest('/api/payment/submit-trx', {
        method: 'POST',
        body: { invoice_id: 'inv_ds_first', trx_id: 'BKCLAIMED001' }
      });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.code, 'INVOICE_ALREADY_PAID');
    }
  );

  await attackTest(
    'ATK-DS-04',
    'DOUBLE-SPEND',
    'Case-manipulated double-spend (uppercase vs lowercase TrxID): Enforced by UPPER() CAS and rejected with TRANSACTION_INVALID',
    async () => {
      const trxId = 'BKCASETRX888';
      const amount = 600.00;

      await db.query(
        `INSERT INTO stored_data (id, brand_id, sender, raw_sms, channel, trx_id, amount, status, sim_slot)
         VALUES ('str_case_ds', ?, 'bKash', 'bKash Vk 600', 'bKash', ?, ?, 'UNUSED', 1)`,
        [ACTOR.brandA, trxId, amount]
      );

      const expiresAt = getUtcSql(new Date(Date.now() + 15 * 60 * 1000));
      await db.query(
        `INSERT INTO invoices (id, brand_id, invoice_number, customer_name, amount, currency, status, expires_at)
         VALUES ('inv_case_1', ?, 'INV-CASE-1', 'Case 1', ?, 'BDE', 'PENDING', ?),
                ('inv_case_2', ?, 'INV-CASE-2', 'Case 2', ?, 'BDT', 'PENDING', ?)`,
        [ACTOR.brandA, amount, expiresAt, ACTOR.brandA, amount, expiresAt]
      );

      const res1 = await apiRequest('/api/payment/submit-trx', {
        method: 'POST',
        body: { invoice_id: 'inv_case_1', trx_id: trxId.toLowerCase() }
      });
      assert.strictEqual(res1.status, 200, 'Initial lowercase claim must succeed');

      const res2 = await apiRequest('/api/payment/submit-trx', {
        method: 'POST',
        body: { invoice_id: 'inv_case_2', trx_id: trxId.toUpperCase() }
      });
      assert.strictEqual(res2.status, 400, 'Uppercase double spend must be rejected');
      assert.strictEqual(res2.body.code, 'TRANSACTION_INVALID');

      const mixedCase = 'BkCaSeTrX888';
      const res3 = await apiRequest('/api/payment/submit-trx', {
        method: 'POST',
        body: { invoice_id: 'inv_case_2', trx_id: mixedCase }
      });
      assert.strictEqual(res3.status, 400, 'Mixed case double spend must be rejected');
      assert.strictEqual(res3.body.code, 'TRANSACTION_INVALID');
    }
  );

  await attackTest(
    'ATK-DS-05',
    'DOUBLE-SPEND',
    'Cross-tenant double-spend attempt: Merchant B invoice cannot claim Merchant A UNUSED transaction (TRANSACTION_INVALID)',
    async () => {
      const trxId = 'BKISOLATE8888';
      const amount = 800.00;

      await db.query(
        `INSERT INTO stored_data (id, brand_id, sender, raw_sms, channel, trx_id, amount, status, sim_slot)
         VALUES ('str_isolate_a', ?, 'bKash', 'bKash Tk 800', 'bKash', ?, ?, 'UNUSED', 1)`,
        [ACTOR.brandA, trxId, amount]
      );

      const expiresAt = getUtcSql(new Date(Date.now() + 15 * 60 * 1000));
      await db.query(
        `INSERT INTO invoices (id, brand_id, invoice_number, customer_name, amount, currency, status, expires_at)
         VALUES ('inv_b_cross', ?, 'INV-B-CROSS', 'Cross B', ?, 'BDT', 'PENDING', ?)`,
        [ACTOR.brandB, amount, expiresAt]
      );

      const res = await apiRequest('/api/payment/submit-trx', {
        method: 'POST',
        body: { invoice_id: 'inv_b_cross', trx_id: trxId }
      });

      assert.strictEqual(res.status, 400, 'Cross-tenant claim must fail with HTTP 400');
      assert.strictEqual(res.body.code, 'TRANSACTION_INVALID');

      const txA = await db.get('SELECT status FROM stored_data WHERE id = ?', ['str_isolate_a']);
      assert.strictEqual(txA.status, 'UNUSED', 'Merchant A transaction must remain UNUSED');

      const invB = await db.get('SELECT status FROM invoices WHERE id = ?', ['inv_b_cross']);
      assert.strictEqual(invB.status, 'PENDING', 'Merchant B invoice must remain PENDING');
    }
  );

  // ===========================================================================
  // ATTACK VECTOR C: CREDIT DRAIN CONCURRENCY ATTACK
  // ===========================================================================
  console.log('\n--- ATTACK VECTOR C: Credit Drain Concurrency Attack ---');

  await attackTest(
    'ATK-DRAIN-01',
    'CREDIT-CONCURRENCY',
    'Credit Drain Concurrency: 10 simultaneous requests when merchant credit = 1: Exactly 1 succeeds, 9 fail with INSUFFICIENT_CREDITS, credits decrement to 0 (never negative)',
    async () => {
      await db.query('UPDATE users SET credits = 1 WHERE id = ?', [ACTOR.userDrain]);
      const initialUser = await db.get('SELECT credits FROM users WHERE id = ?', [ACTOR.userDrain]);
      assert.strictEqual(initialUser.credits, 1, 'Initial credits must be 1');

      const amount = 200.00;
      const workerCount = 10;
      const drainInvoices = [];
      const drainTrxIds = [];

      for (let i = 1; i <= workerCount; i++) {
        const invId = `inv_drain_${String(i).padStart(2, '0')}`;
        const trxId = `BKDRAIN${String(i).padStart(4, '0')}`;
        const strId = `str_drain_${String(i).padStart(2, '0')}`;
        drainInvoices.push(invId);
        drainTrxIds.push(trxId);

        const expiresAt = getUtcSql(new Date(Date.now() + 15 * 60 * 1000));
        await db.query(
          `INSERT INTO invoices (id, brand_id, invoice_number, customer_name, amount, currency, status, expires_at)
           VALUES (?, ?, ?, 'Drain Customer', ?, 'BDT', 'PENDING', ?)`,
          [invId, ACTOR.brandDrain, `INV-DR-${i}`, amount, expiresAt]
        );

        await db.query(
          `INSERT INTO stored_data (id, brand_id, sender, raw_sms, channel, trx_id, amount, status, sim_slot)
           VALUES (?, ?, 'bKash', 'bKash Vk 200', 'bKash', ?, ?, 'UNUSED', 1)`,
          [strId, ACTOR.brandDrain, trxId, amount]
        );
      }

      const promises = drainInvoices.map((invId, idx) => {
        return apiRequest('/api/payment/submit-trx', {
          method: 'POST',
          body: { invoice_id: invId, trx_id: drainTrxIds[idx] }
        });
      });

      const responses = await Promise.all(promises);

      const successful = responses.filter((r) => r.status === 200 && r.body?.success === true && r.body?.status === 'PAID');
      const creditDepleted = responses.filter((r) => r.status === 402 && r.body?.code === 'INSUFFICIENT_CREDITS');

      assert.strictEqual(successful.length, 1, `Expected EXACTLY 1 request to succeed, got ${successful.length}`);
      assert.strictEqual(creditDepleted.length, 9, `Expected EXACTLY 9 requests to fail with INSUFFICIENT_CREDITS, got ${creditDepleted.length}`);

      const finalUser = await db.get('SELECT credits FROM users WHERE id = ?', [ACTOR.userDrain]);
      assert.strictEqual(finalUser.credits, 0, `Merchant credits must be exactly 0, got ${finalUser.credits}`);
      assert.ok(finalUser.credits >= 0, `Merchant credits must NEVER be negative! Got ${finalUser.credits}`);

      const invoicesInDb = await db.query(
        `SELECT id, status FROM invoices WHERE id IN (${drainInvoices.map(() => '?').join(',')})`,
        drainInvoices
      );
      const paidInvoices = invoicesInDb.rows.filter((inv) => inv.status === 'PAID');
      const pendingInvoices = invoicesInDb.rows.filter((inv) => inv.status === 'PENDING');
      assert.strictEqual(paidInvoices.length, 1, `Exactly 1 invoice must be PAID, got ${paidInvoices.length}`);
      assert.strictEqual(pendingInvoices.length, 9, `Exactly 9 invoices must remain PENDING, got ${pendingInvoices.length}`);

      const transactionsInDb = await db.query(
        `SELECT id, status FROM stored_data WHERE id IN (${drainInvoices.map((_, i) => `'str_drain_${String(i+1).padStart(2, '0')}'`).join(',')})`
      );
      const usedTx = transactionsInDb.rows.filter((t) => t.status === 'USED');
      const unusedTx = transactionsInDb.rows.filter((t) => t.status === 'UNUSED');
      assert.strictEqual(usedTx.length, 1, `Exactly 1 transaction must be USED, got ${usedTx.length}`);
      assert.strictEqual(unusedTx.length, 9, `Remaining 9 transactions must remain UNUSED, got ${unusedTx.length}`);
    }
  );

  await attackTest(
    'ATK-DRAIN-02',
    'CREDIT-CONCURRENCY',
    'Baseline depleted credit rejection: 5 concurrent requests when credits = 0 all fail with HTTP 402, credits remain 0',
    async () => {
      const user = await db.get('SELECT credits FROM users WHERE id = ?', [ACTOR.userDrain]);
      assert.strictEqual(user.credits, 0, 'Merchant credits must be 0');

      const promises = Array.from({ length: 5 }, (_, i) => {
        return apiRequest('/api/payment/submit-trx', {
          method: 'POST',
          body: { invoice_id: `inv_drain_0${i+2}`, trx_id: `BKDRAIN000${i+2}` }
        });
      });

      const responses = await Promise.all(promises);
      const allDepleted = responses.every((r) => r.status === 402 && r.body?.code === 'INSUFFICIENT_CREDITS');
      assert.strictEqual(allDepleted, true, 'All 5 requests must return HTTP 402 INSUFFICIENT_CREDITS');

      const finalUser = await db.get('SELECT credits FROM users WHERE id = ?', [ACTOR.userDrain]);
      assert.strictEqual(finalUser.credits, 0, 'Credits must remain exactly 0');
    }
  );

  await attackTest(
    'ATK-DRAIN-03',
    'CREDIT-CONCURRENCY',
    'S2S 2-Step API credit drain concurrency: 10 parallel workers on /v1/trx/verify when credits = 1: Exactly 1 succeeds, 9 fail with HTTP 402, credits = 0',
    async () => {
      await db.query('UPDATE users SET credits = 1 WHERE id = ?', [ACTOR.userDrain]);

      const s2sTrxIds = [];
      for (let i = 1; i <= 10; i++) {
        const trxId = `BKS2SDRAIN:${String(i).padStart(3, '0')}`;
        s2sTrxIds.push(trxId);
        await db.query(
          `INSERT INTO stored_data (id, brand_id, sender, raw_sms, channel, trx_id, amount, status, sim_slot)
           VALUES (?, ?, 'bKash', 'bKash SMS', 'bKash', ?, 150.00, 'UNUSED', 1)`,
          [`str_s2s_dr_${i}`, ACTOR.brandDrain, trxId]
        );
      }

      const promises = s2sTrxIds.map((trxId) => {
        return apiRequest('/v1/trx/verify', {
          method: 'POST',
          headers: {
            'X-API-KEY': ACTOR.apiKeyDrain,
            'X-API-SECRET': ACTOR.apiSecretDrain
          },
          body: { trx_id: trxId, amount: 150.00 }
        });
      });

      const responses = await Promise.all(promises);
      const wins = responses.filter((r) => r.status === 200 && r.body?.success === true);
      const fails = responses.filter((r) => r.status === 402 && r.body?.code === 'INSUFFICIENT_CREDITS');

      assert.strictEqual(wins.length, 1, `S2S verify credit race: expected 1 winner, got ${wins.length}`);
      assert.strictEqual(fails.length, 9, `S2S verify credit race: expected 9 fails with HTTP 402, got ${fails.length}`);

      const user = await db.get('SELECT status FROM users WHERE id = ?', [ACTOR.userDrain]);
      const finalCreditsUser = await db.get('SELECT credits FROM users WHERE id = ?', [ACTOR.userDrain]);
      assert.strictEqual(finalCreditsUser.credits, 0, `Credits must be exactly 0, got ${finalCreditsUser.credits}`);
    }
  );

  // ===========================================================================
  // ATTACK VECTOR D: EXPIRED INVOICE RECONCILIATION ATTACK
  // ===========================================================================
  console.log('\n--- ATTACK VECTOR D: Expired Invoice Race Attack ---');

  await attackTest(
    'ATK-EXP-01',
    'EXPIRED-INVOICE',
    'Payment submission against expired invoice (expires_at 5 minutes in past): Rejected with HTTP 410 INVOICE_EXPIRED, transaction remains UNUSED, zero credit deducted',
    async () => {
      const trxId = 'BKEXPIRED001';
      const amount = 550.00;
      const invId = 'inv_expired_01';

      const initialUser = await db.get('SELECT credits FROM users WHERE id = ?', [ACTOR.userA]);
      const initialCredits = initialUser.credits;

      await db.query(
        `INSERT INTO stored_data (id, brand_id, sender, raw_sms, channel, trx_id, amount, status, sim_slot)
         VALUES ('str_exp_01', ?, 'bKash', 'bKash Vk 550', 'bKash', ?, ?, 'UNUSED', 1)`,
        [ACTOR.brandA, trxId, amount]
      );

      const expiredAt = getUtcSql(new Date(Date.now() - 5 * 60 * 1000));
      await db.query(
        `INSERT INTO invoices (id, brand_id, invoice_number, customer_name, amount, currency, status, expires_at)
         VALUES (?, ?, 'INV-EXP-1', 'Expired Customer', ?, 'BDE', 'PENDING', ?)`,
        [invId, ACTOR.brandA, amount, expiredAt]
      );

      const res = await apiRequest('/api/payment/submit-trx', {
        method: 'POST',
        body: { invoice_id: invId, trx_id: trxId }
      });

      assert.strictEqual(res.status, 410, `Expected HTTP 410, got ${res.status}`);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.code, 'INVOICE_EXPIRED', `Expected code INVOICE_EXPIRED, got ${res.body.code}`);
      assert.strictEqual(res.body.message, 'This invoice has expired and can no longer accept payments.');

      const stored = await db.get('SELECT status, used_at FROM stored_data WHERE id = ?', ['str_exp_01']);
      assert.strictEqual(stored.status, 'UNUSED', 'Stored transaction status must remain UNUSED');
      assert.strictEqual(stored.used_at, null, 'used_at must remain null');

      const invoice = await db.get('SELECT status, trx_id FROM invoices WHERE id = ?', [invId]);
      assert.strictEqual(invoice.status, 'EXPIRED', 'Invoice status must be transitioned to EXPIRED');
      assert.strictEqual(invoice.trx_id, null, 'Invoice trx_id must remain null');

      const user = await db.get('SELECT credits FROM users WHERE id = ?', [ACTOR.userA]);
      assert.strictEqual(user.credits, initialCredits, `Merchant credits must NOT be decremented, got ${user.credits}`);
    }
  );

  await attackTest(
    'ATK-EXP-02',
    'EXPIRED-INVOICE',
    'Exact boundary expiration (expires_at 1 second in past): Rejected with HTTP 410 INVOICE_EXPIRED',
    async () => {
      const trxId = 'BKBOUNDARY002';
      const amount = 320.00;
      const invId = 'inv_boundary_02';


      await db.query(
        `INSERT INTO stored_data (id, brand_id, sender, raw_sms, channel, trx_id, amount, status, sim_slot)
         VALUES ('str_exp_02', ?, 'Nagad', 'Nagad Tk 320', 'Nagad', ?, ?, 'UNUSED', 1)`,
        [ACTOR.brandA, trxId, amount]
      );

      const boundaryExpiredAt = getUtcSql(new Date(Date.now() - 1000));
      await db.query(
        `INSERT INTO invoices (id, brand_id, invoice_number, customer_name, amount, currency, status, expires_at)
         VALUES (?, ?, 'INV-BOUND-2', 'Boundary Customer', ?, 'BDT', 'PENDING', ?)`,
        [invId, ACTOR.brandA, amount, boundaryExpiredAt]
      );

      const res = await apiRequest('/api/payment/submit-trx', {
        method: 'POST',
        body: { invoice_id: invId, trx_id: trxId }
      });

      assert.strictEqual(res.status, 410);
      assert.strictEqual(res.body.code, 'INVOICE_EXPIRED');

      const stored = await db.get('SELECT status FROM stored_data WHERE id = ?', ['str_exp_02']);
      assert.strictEqual(stored.status, 'UNUSED');
    }
  );

  await attackTest(
    'ATK-EXP-03',
    'EXPIRED-INVOICE',
    'Concurrent Expiration Race: 5 parallel workers targeting expired invoice simultaneously: All 5 receive HTTP 410, zero transactions consumed, zero credit leakage',
    async () => {
      const invId = 'inv_race_exp_03';
      const amount = 700.00;
      const initialUser = await db.get('SELECT credits FROM users WHERE id = ?', [ACTOR.userA]);
      const initialCredits = initialUser.credits;

      const txIds = [];
      for (let i = 1; i <= 5; i++) {
        const trxId = `BKCONCUREXP00${i}`;
        txIds.push(trxId);
        await db.query(
          `INSERT INTO stored_data (id, brand_id, sender, raw_sms, channel, trx_id, amount, status, sim_slot)
           VALUES (?, ?, 'bKash', 'bKash SMS', 'bKash', ?, ?, 'UNUSED', 1)`,
          [`str_conc_exp_${i}`, ACTOR.brandA, trxId, amount]
        );
      }

      const expiredAt = getUtcSql(new Date(Date.now() - 10000));
      await db.query(
        `INSERT INTO invoices (id, brand_id, invoice_number, customer_name, amount, currency, status, expires_at)
         VALUES (?, ?, 'INV-RACE-EXP-3', 'Race Expired Customer', ?, 'BDT', 'PENDING', ?)`,
        [invId, ACTOR.brandA, amount, expiredAt]
      );

      const promises = txIds.map((trxId) => {
        return apiRequest('/api/payment/submit-trx', {
          method: 'POST',
          body: { invoice_id: invId, trx_id: trxId }
        });
      });

      const responses = await Promise.all(promises);

      const allExpired = responses.every((r) => r.status === 410 && r.body?.code === 'INVOICE_EXPIRED');
      assert.strictEqual(allExpired, true, 'All 5 concurrent requests must receive HTTP 410 INVOICE_EXPIRED');

      const txRows = await db.query(
        `SELECT id, status FROM stored_data WHERE id IN ('str_conc_exp_1', 'str_conc_exp_2', 'str_conc_exp_3', 'str_conc_exp_4', 'str_conc_exp_5')`
      );
      const allUnused = txRows.rows.every((t) => t.status === 'UNUSED');
      assert.strictEqual(allUnused, true, 'All 5 transactions must remain UNUSED');

      const finalUser = await db.get('SELECT credits FROM users WHERE id = ?', [ACTOR.userA]);
      assert.strictEqual(finalUser.credits, initialCredits, 'Credits must remain untouched');
    }
  );

  await attackTest(
    'ATK-EXP-04',
    'EXPIRED-INVOICE',
    'Reconciling against invoice already status = EXPIRED: Uniform HTTP 410 rejection',
    async () => {
      const invId = 'inv_already_expired';
      const trxId = 'BKALREADYEXP88';

      await db.query(
        `INSERT INTO stored_data (id, brand_id, sender, raw_sms, channel, trx_id, amount, status, sim_slot)
         VALUES ('str_already_exp', ?, 'bKash', 'bKash Vk 100', 'bKash', ?, 100.00, 'UNUSED', 1)`,
        [ACTOR.brandA, trxId]
      );

      const expiredAt = getUtcSql(new Date(Date.now() - 3600000));
      await db.query(
        `INSERT INTO invoices (id, brand_id, invoice_number, customer_name, amount, currency, status, expires_at)
         VALUES (?, ?, 'INV-ALREADY-EXP', 'Already Expired', 100.00, 'BDT', 'EXPIRED', ?)`,
        [invId, ACTOR.brandA, expiredAt]
      );

      const res = await apiRequest('/api/payment/submit-trx', {
          method: 'POST',
          body: { invoice_id: invId, trx_id: trxId }
      });

      assert.strictEqual(res.status, 410);
      assert.strictEqual(res.body.code, 'INVOICE_EXPIRED');
    }
  );

  // Teardown
  await new Promise((resolve) => server.close(resolve));
  await db.close();

  console.log('\n============================================================================');
  console.log(`Execution Finished: ${summary.passed} Passed / ${summary.total} Total (${summary.failed} Failed)`);
  console.log('============================================================================');

  if (summary.failed > 0) {
    console.error(`\n[CRITICAL VULNERABILITIES DETECTED: ${summary.failed}]`);
    for (const v of summary.vulnerabilities) {
      console.error(` - ${v.id} [${v.category}]: ${v.description} -> ${v.error}`);
    }
    process.exitCode = 1;
  } else {
    console.log('\n[VERDICT: ZERO VULNERABILITIES DETECTED] All Concurrency & Atomic CAS Guarantees Verified!');
  }
}

runAdversarialM3Suite().catch((err) => { console.error(err); process.exitCode = 1; });
