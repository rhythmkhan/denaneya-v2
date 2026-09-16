#!/usr/bin/env node
/**
 * DenaNeya v2.0 - Challenger 2 Empirical Stress Test Suite
 * Milestone 3 Gate: WooCommerce WordPress Payment Gateway Plugin
 *
 * File: scripts/test_challenger2_empirical_harness.cjs
 */
'use strict';

process.env.NODE_ENV = 'test';
process.env.DB_CLIENT = 'sqlite';
process.env.DB_SQLITE_PATH = ':memory:';
process.env.JWT_SECRET = 'denaneya_development_jwt_secret_min_32_bytes_long_12345';

const assert = require('assert');
const http = require('http');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const PLUGIN_DIR = path.resolve(__dirname, '../denaneya-payment-gateway');
const ZIP_PATH   = path.resolve(__dirname, '../denaneya-payment-gateway.zip');
const MOCK_HARNESS = path.resolve(__dirname, 'mock_wc_harness.php');

let server;
let baseUrl;
let db;
let sharedPkg;
let dbPkg;

const report = {
  total: 0,
  passed: 0,
  failed: 0,
  findings: []
};

async function testCase(id, category, description, fn) {
  report.total++;
  try {
    await fn();
    report.passed++;
    console.log(`  [PASS] ${id} - [${category}] ${description}`);
  } catch (err) {
    report.failed++;
    console.error(`  [FAIL] ${id} - [${category}] ${description}`);
    console.error(`         >>> Error: ${err.message}`);
    report.findings.push({ id, category, description, error: err.message });
  }
}

let requestSeq = 0;
async function apiRequest(endpoint, { method = 'GET', headers = {}, body = null } = {}) {
  requestSeq++;
  const reqHeaders = {
    'Content-Type': 'application/json',
    'X-Forwarded-For': `198.51.100.${(requestSeq % 200) + 1}`,
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
  } catch (_) {}
  return { status: res.status, headers: res.headers, text, json };
}

function runPhpMock(inputObj) {
  const inputStr = JSON.stringify(inputObj);
  const output = execSync(`php "${MOCK_HARNESS}"`, {
    input: inputStr,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024
  });
  return JSON.parse(output.trim());
}

function getUtcSql(date = new Date()) {
  return date.toISOString().replace('T', ' ').substring(0, 19);
}

const FIXTURES = {
  userId: 'usr_wc_c2_001',
  userZeroCreditId: 'usr_wc_c2_zero_002',
  brandId: 'brd_wc_c2_001',
  brandZeroCreditId: 'brd_wc_c2_zero_002',
  brandName: 'DenaNeya Challenger Store',
  webhookSecret: 'whsec_c2_empirical_secret_entropy_32_bytes_9999',
  apiKey: `key_c2_${crypto.randomBytes(8).toString('hex')}`,
  apiSecret: `sec_c2_${crypto.randomBytes(16).toString('hex')}`,
  apiKeyZero: `key_c2_zero_${crypto.randomBytes(8).toString('hex')}`,
  apiSecretZero: `sec_c2_zero_${crypto.randomBytes(16).toString('hex')}`,
  deviceId: 'dev_c2_sync_001',
  deviceToken: 'tok_dev_c2_empirical_test_token_min_32_bytes_long_12345',
  initialCredits: 100
};

async function setupEnv() {
  dbPkg = await import('@denaneya/database');
  const { getDatabase, runMigrations, runSeed } = dbPkg.default || dbPkg;
  sharedPkg = await import('@denaneya/shared');
  const { createApp } = await import('../apps/api/src/app.js');

  db = getDatabase();
  console.log('[Setup] Applying fresh SQLite in-memory migrations...');
  const migRes = await runMigrations(db, { reset: true });
  assert.strictEqual(migRes.success, true);
  await runSeed(db);

  const now = getUtcSql();

  // Insert test users and brands
  await db.query(
    `INSERT INTO users (id, name, email, password_hash, role, credits, status, created_at, updated_at)
     VALUES (?, 'Challenger Merchant', ?, 'hash_demo', 'merchant', ?, 'active', ?, ?)`,
    [FIXTURES.userId, `c2_merchant_${Date.now()}@denaneya.local`, FIXTURES.initialCredits, now, now]
  );

  await db.query(
    `INSERT INTO brands (id, user_id, brand_name, brand_slug, api_key, api_secret, webhook_secret, webhook_url, status, created_at, updated_at)
     VALUES (?, ?, ?, 'c2-store', ?, ?, ?, 'https://c2.example.com/?wc-api=denaneya_webhook', 'active', ?, ?)`,
    [FIXTURES.brandId, FIXTURES.userId, FIXTURES.brandName, FIXTURES.apiKey, FIXTURES.apiSecret, FIXTURES.webhookSecret, now, now]
  );

  await db.query(
    `INSERT INTO users (id, name, email, password_hash, role, credits, status, created_at, updated_at)
     VALUES (?, 'C2 Zero Credit Merchant', ?, 'hash_demo', 'merchant', 0, 'active', ?, ?)`,
    [FIXTURES.userZeroCreditId, `c2_zero_${Date.now()}@denaneya.local`, now, now]
  );

  await db.query(
    `INSERT INTO brands (id, user_id, brand_name, brand_slug, api_key, api_secret, webhook_secret, webhook_url, status, created_at, updated_at)
     VALUES (?, ?, 'C2 Zero Credit Brand', 'c2-zero-store', ?, ?, ?, 'https://c2.example.com/?wc-api=denaneya_webhook', 'active', ?, ?)`,
    [FIXTURES.brandZeroCreditId, FIXTURES.userZeroCreditId, FIXTURES.apiKeyZero, FIXTURES.apiSecretZero, FIXTURES.webhookSecret, now, now]
  );

  // Insert paired test device for carrier SMS sync
  await db.query(
    `INSERT INTO devices (id, brand_id, device_name, device_token, status, battery_level, sim1_operator, created_at)
     VALUES (?, ?, 'Challenger Samsung M21', ?, 'active', 95, 'Grameenphone (bKash)', ?)`,
    [FIXTURES.deviceId, FIXTURES.brandId, FIXTURES.deviceToken, now]
  );

  const app = createApp({ db });
  server = http.createServer(app);
  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      console.log(`[Setup] Challenger Express API running on ${baseUrl}`);
      resolve();
    });
  });
}

async function runChallengerSuite() {
  console.log('========================================================================');
  console.log('⚔️  CHALLENGER 2: EMPIRICAL STRESS TEST & ADVERSARIAL VERIFICATION');
  console.log('========================================================================\n');

  await setupEnv();
  runPhpMock({ action: 'clear_transients' });

  // ---------------------------------------------------------------------------
  // TASK 1: CANONICALIZATION PARITY & CRYPTOGRAPHIC HMAC IDENTITY
  // ---------------------------------------------------------------------------
  console.log('--- TASK 1: RFC 8785 Canonical JSON & HMAC-SHA256 Stress Vectors ---');

  const { canonicalizeJson } = sharedPkg;

  // Complex stress vectors
  const canonicalVectors = [
    {
      name: 'V1-Standard-Unsorted-Keys',
      data: { z: 'last', a: 'first', m: 'middle', 5: 'numeric_key', b: 123 }
    },
    {
      name: 'V2-Bengali-Unicode-Keys-And-Values',
      data: {
        'দেনা': 'নেয়া',
        'টাকা': 1250.75,
        'বিকাশ': true,
        'নগদ': false,
        'বিবরণ': 'অর্ডার #১২৩৪ পেমেন্ট গেটওয়ে ভেরিফিকেশন',
        'গ্রাহক': 'তানভীর আহমেদ',
        'ফোন': '০১৭১১২২৩৩৪৪'
      }
    },
    {
      name: 'V3-Nested-Objects-And-Arrays',
      data: {
        order: {
          items: [
            { id: 'item_1', name: 'বই - পাইথন', price: 450.5, qty: 2 },
            { id: 'item_2', name: 'টি-শার্ট', price: 350.0, qty: 1 }
          ],
          customer: {
            name: 'করিম উল্লাহ',
            address: { city: 'ঢাকা', district: 'মিরপুর', post_code: '1216' }
          }
        },
        meta: { channel: 'bkash', verified: true, attempts: 1 }
      }
    },
    {
      name: 'V4-Booleans-And-Nulls',
      data: {
        is_active: true,
        is_fraud: false,
        discount_code: null,
        flags: [true, false, null, true]
      }
    },
    {
      name: 'V5-Standard-Floats-MFS-Amounts',
      data: {
        amount_small: 10.5,
        amount_medium: 1250.75,
        amount_large: 499999.99,
        fee: 0.0,
        zero: 0
      }
    },
    {
      name: 'V6-String-Escapes-And-Symbols',
      data: {
        quote: 'He said: "Automate everything with DenaNeya!"',
        slashes: 'https://denaneya.aihaat.shop/pay/inv_123456',
        newlines: 'Line 1\nLine 2\r\nLine 3\tTabbed',
        symbols: 'Symbols: © 2026 ® ™ & < > ; : ` ~ ! @ # $ % ^ * ( ) _ + ='
      }
    },
    {
      name: 'V7-Deeply-Nested-Tree',
      data: {
        l1: { l2: { l3: { l4: { l5: { l6: { l7: { l8: { leaf: 'deep_value', val: 99 } } } } } } } }
      }
    },
    {
      name: 'V8-Realistic-WooCommerce-Invoice-Payload',
      data: {
        event: 'invoice.completed',
        invoice_id: 'inv_88291a82f0991c',
        order_id: '4009',
        amount: 1750.50,
        currency: 'BDT',
        trx_id: 'TRX_BKASH_9922001',
        payment_method: 'bkash',
        customer_name: 'আব্দুল হাকিম',
        customer_phone: '01812345678',
        paid_at: '2026-09-16 11:30:00',
        metadata: {
          order_id: '4009',
          order_key: 'wc_order_998877aabbcc',
          platform: 'WooCommerce',
          plugin_version: '2.0.0'
        }
      }
    }
  ];

  for (let i = 0; i < canonicalVectors.length; i++) {
    const vec = canonicalVectors[i];
    await testCase(`CANON-${i + 1}`, 'Canonicalizer', `${vec.name}: Node.js and PHP produce byte-for-byte identical canonical JSON`, async () => {
      const nodeCanon = canonicalizeJson(vec.data);
      const phpRes = runPhpMock({ action: 'canonicalize', value: vec.data });
      assert.strictEqual(phpRes.success, true, `PHP execution failed: ${phpRes.error}`);
      assert.strictEqual(
        phpRes.canonical,
        nodeCanon,
        `Byte-for-byte canonical JSON mismatch!\nNode.js:\n${nodeCanon}\nPHP:\n${phpRes.canonical}`
      );
    });

    await testCase(`HMAC-${i + 1}`, 'Crypto', `${vec.name}: Node.js and PHP compute identical SHA256 HMAC`, async () => {
      const nodeCanon = canonicalizeJson(vec.data);
      const secret = FIXTURES.webhookSecret;
      const ts = 1726488000;
      const nonce = `nonce_test_vec_${i + 1}`;
      const msg = `${ts}.${nonce}.${nodeCanon}`;

      const nodeHmac = crypto.createHmac('sha256', secret).update(msg).digest('hex');
      const phpRes = runPhpMock({ action: 'compute_hmac', data: msg, secret: secret });

      assert.strictEqual(phpRes.success, true);
      assert.strictEqual(
        phpRes.signature,
        nodeHmac,
        `HMAC-SHA256 mismatch!\nNode: ${nodeHmac}\nPHP:  ${phpRes.signature}`
      );
    });
  }

  // Adversarial edge-case vector: Empty Object vs Empty Array
  await testCase('CANON-EDGE-01', 'Adversarial', 'Investigation of empty array [] canonicalization parity', async () => {
    const emptyArrPayload = { arr: [] };
    const nodeCanon = canonicalizeJson(emptyArrPayload);
    const phpRes = runPhpMock({ action: 'canonicalize', value: emptyArrPayload });
    assert.strictEqual(phpRes.canonical, nodeCanon, `Empty array mismatch: Node ${nodeCanon} vs PHP ${phpRes.canonical}`);
  });

  await testCase('CANON-EDGE-02', 'Adversarial', 'Investigation of empty object {} canonicalization parity', async () => {
    const emptyObjPayload = { obj: {} };
    const nodeCanon = canonicalizeJson(emptyObjPayload);
    const phpRes = runPhpMock({ action: 'canonicalize', value: emptyObjPayload });
    // In PHP, json_decode(..., true) decodes {} as array(), which PHP canonicalizer treats as []
    if (phpRes.canonical !== nodeCanon) {
      throw new Error(
        `KNOWN LIMITATION / BUG: PHP DenaNeya_Canonicalizer serializes empty object { obj: {} } as {"obj":[]} instead of {"obj":{}} due to json_decode array conversion.\nNode: ${nodeCanon}\nPHP:  ${phpRes.canonical}`
      );
    }
  });

  // ---------------------------------------------------------------------------
  // TASK 2: S2S ENDPOINT API CONTRACT STRESS TEST (/v1/payment/create)
  // ---------------------------------------------------------------------------
  console.log('\n--- TASK 2: S2S Endpoint API Contract Stress Test (/v1/payment/create) ---');

  let s2sInvoiceId = null;
  let s2sCheckoutUrl = null;

  await testCase('S2S-01', 'API Contract', 'Valid credentials return HTTP 201 with invoice_id, checkout_url, and 15-min TTL', async () => {
    const res = await apiRequest('/v1/payment/create', {
      method: 'POST',
      headers: {
        'X-API-KEY': FIXTURES.apiKey,
        'X-API-SECRET': FIXTURES.apiSecret
      },
      body: {
        amount: 2500.00,
        currency: 'BDT',
        order_id: '6001',
        customer_name: 'Tanvir Hasan',
        customer_email: 'tanvir@example.com',
        customer_phone: '01811223344',
        redirect_url: 'https://myshop.com/wc-api/return',
        cancel_url: 'https://myshop.com/checkout/cancel',
        metadata: { order_id: '6001', store: 'aihaat' }
      }
    });

    assert.strictEqual(res.status, 201, `Expected 201, got ${res.status}: ${res.text}`);
    assert.strictEqual(res.json.success, true);
    assert.ok(res.json.invoice_id.startsWith('inv_'));
    assert.ok(res.json.checkout_url.includes('/pay/inv_'));
    assert.strictEqual(res.json.invoice.amount, 2500.00);
    assert.strictEqual(res.json.invoice.status, 'PENDING');

    s2sInvoiceId = res.json.invoice_id;
    s2sCheckoutUrl = res.json.checkout_url;

    // Verify 15-minute TTL
    const dbInvoice = await db.get('SELECT * FROM invoices WHERE id = ?', [s2sInvoiceId]);
    assert.ok(dbInvoice);
    const expTime = new Date(dbInvoice.expires_at.replace(' ', 'T') + 'Z').getTime();
    const crtTime = new Date(dbInvoice.created_at.replace(' ', 'T') + 'Z').getTime();
    const diffMins = Math.round((expTime - crtTime) / 60000);
    assert.strictEqual(diffMins, 15, `Expected 15m TTL, got ${diffMins}m`);
  });

  await testCase('S2S-02', 'API Contract', 'Invalid API Key returns HTTP 401 Unauthorized', async () => {
    const res = await apiRequest('/v1/payment/create', {
      method: 'POST',
      headers: {
        'X-API-KEY': 'key_invalid_forgery_123',
        'X-API-SECRET': FIXTURES.apiSecret
      },
      body: { amount: 500 }
    });
    assert.strictEqual(res.status, 401, `Expected 401, got ${res.status}`);
    assert.strictEqual(res.json.success, false);
  });

  await testCase('S2S-03', 'API Contract', 'Invalid API Secret returns HTTP 401 Unauthorized', async () => {
    const res = await apiRequest('/v1/payment/create', {
      method: 'POST',
      headers: {
        'X-API-KEY': FIXTURES.apiKey,
        'X-API-SECRET': 'sec_invalid_forgery_456'
      },
      body: { amount: 500 }
    });
    assert.strictEqual(res.status, 401, `Expected 401, got ${res.status}`);
    assert.strictEqual(res.json.success, false);
  });

  await testCase('S2S-04', 'API Contract', 'Missing API credentials returns HTTP 401 Unauthorized', async () => {
    const res = await apiRequest('/v1/payment/create', {
      method: 'POST',
      body: { amount: 500 }
    });
    assert.strictEqual(res.status, 401, `Expected 401, got ${res.status}`);
    assert.strictEqual(res.json.success, false);
  });

  await testCase('S2S-05', 'API Contract', 'Zero amount returns HTTP 400 Bad Request (INVALID_AMOUNT)', async () => {
    const res = await apiRequest('/v1/payment/create', {
      method: 'POST',
      headers: {
        'X-API-KEY': FIXTURES.apiKey,
        'X-API-SECRET': FIXTURES.apiSecret
      },
      body: { amount: 0 }
    });
    assert.strictEqual(res.status, 400, `Expected 400, got ${res.status}`);
    assert.strictEqual(res.json.code, 'INVALID_AMOUNT');
  });

  await testCase('S2S-06', 'API Contract', 'Negative amount returns HTTP 400 Bad Request (INVALID_AMOUNT)', async () => {
    const res = await apiRequest('/v1/payment/create', {
      method: 'POST',
      headers: {
        'X-API-KEY': FIXTURES.apiKey,
        'X-API-SECRET': FIXTURES.apiSecret
      },
      body: { amount: -150.75 }
    });
    assert.strictEqual(res.status, 400, `Expected 400, got ${res.status}`);
    assert.strictEqual(res.json.code, 'INVALID_AMOUNT');
  });

  await testCase('S2S-07', 'API Contract', 'Non-numeric amount returns HTTP 400 Bad Request (INVALID_AMOUNT)', async () => {
    const res = await apiRequest('/v1/payment/create', {
      method: 'POST',
      headers: {
        'X-API-KEY': FIXTURES.apiKey,
        'X-API-SECRET': FIXTURES.apiSecret
      },
      body: { amount: 'not_a_number' }
    });
    assert.strictEqual(res.status, 400, `Expected 400, got ${res.status}`);
    assert.strictEqual(res.json.code, 'INVALID_AMOUNT');
  });

  await testCase('S2S-08', 'API Contract', 'Amount exceeding 500,000 BDT limit returns HTTP 400 (AMOUNT_EXCEEDS_LIMIT)', async () => {
    const res = await apiRequest('/v1/payment/create', {
      method: 'POST',
      headers: {
        'X-API-KEY': FIXTURES.apiKey,
        'X-API-SECRET': FIXTURES.apiSecret
      },
      body: { amount: 500001 }
    });
    assert.strictEqual(res.status, 400, `Expected 400, got ${res.status}`);
    assert.strictEqual(res.json.code, 'AMOUNT_EXCEEDS_LIMIT');
  });

  await testCase('S2S-09', 'API Contract', 'Merchant with zero credits returns HTTP 402 Payment Required (INSUFFICIENT_CREDITS)', async () => {
    const res = await apiRequest('/v1/payment/create', {
      method: 'POST',
      headers: {
        'X-API-KEY': FIXTURES.apiKeyZero,
        'X-API-SECRET': FIXTURES.apiSecretZero
      },
      body: { amount: 200 }
    });
    assert.strictEqual(res.status, 402, `Expected 402, got ${res.status}`);
    assert.strictEqual(res.json.code, 'INSUFFICIENT_CREDITS');
  });

  await testCase('S2S-10', 'API Contract', 'Verify payment status via POST /v1/payment/verify returns status PENDING', async () => {
    const res = await apiRequest('/v1/payment/verify', {
      method: 'POST',
      headers: {
        'X-API-KEY': FIXTURES.apiKey,
        'X-API-SECRET': FIXTURES.apiSecret
      },
      body: { invoice_id: s2sInvoiceId }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.json.invoice_id, s2sInvoiceId);
    assert.strictEqual(res.json.payment_status, 'PENDING');
  });

  await testCase('S2S-11', 'API Contract', 'Verify non-existent invoice returns HTTP 404 Not Found', async () => {
    const res = await apiRequest('/v1/payment/verify', {
      method: 'POST',
      headers: {
        'X-API-KEY': FIXTURES.apiKey,
        'X-API-SECRET': FIXTURES.apiSecret
      },
      body: { invoice_id: 'inv_non_existent_999' }
    });
    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.json.code, 'INVOICE_NOT_FOUND');
  });

  // ---------------------------------------------------------------------------
  // TASK 3: END-TO-END CHECKOUT MOCK ORDER LIFECYCLE & SMS RECONCILIATION
  // ---------------------------------------------------------------------------
  console.log('\n--- TASK 3: End-to-End Checkout Mock Order Lifecycle & Carrier SMS Sync ---');

  const e2eOrder = {
    id: 7001,
    order_number: 'ORD-7001',
    order_key: 'wc_order_c2_test_7001',
    total: 1250.00,
    currency: 'BDT',
    status: 'pending',
    billing_first_name: 'Shakib',
    billing_last_name: 'Al Hasan',
    billing_email: 'shakib@example.com',
    billing_phone: '01711223344'
  };

  let e2eInvoiceId = null;
  let e2eCheckoutUrl = null;
  const e2eTrxId = `BK${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

  await testCase('E2E-01', 'Checkout', 'Mock WooCommerce process_payment calls S2S API, creates invoice, and returns redirect', async () => {
    // Simulate WC_Gateway_DenaNeya::process_payment()
    const payload = {
      amount: e2eOrder.total,
      currency: e2eOrder.currency,
      customer_name: `${e2eOrder.billing_first_name} ${e2eOrder.billing_last_name}`,
      customer_email: e2eOrder.billing_email,
      customer_phone: e2eOrder.billing_phone,
      redirect_url: 'https://myshop.com/wc-api/return?order_id=7001',
      cancel_url: 'https://myshop.com/checkout/cancel',
      metadata: {
        order_id: String(e2eOrder.id),
        order_number: e2eOrder.order_number,
        order_key: e2eOrder.order_key,
        platform: 'WooCommerce',
        plugin_version: '2.0.0'
      }
    };

    const res = await apiRequest('/v1/payment/create', {
      method: 'POST',
      headers: {
        'X-API-KEY': FIXTURES.apiKey,
        'X-API-SECRET': FIXTURES.apiSecret
      },
      body: payload
    });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.json.success, true);
    assert.ok(res.json.invoice_id.startsWith('inv_'));

    e2eInvoiceId = res.json.invoice_id;
    e2eCheckoutUrl = res.json.checkout_url;
  });

  await testCase('E2E-02', 'Checkout', 'Customer is redirected to hosted checkout /pay/:invoice_id (HTTP 200)', async () => {
    const res = await apiRequest(`/pay/${e2eInvoiceId}?standalone=1`);
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    assert.ok(res.text.includes(e2eInvoiceId), 'Hosted checkout page must include invoice ID');
  });

  await testCase('E2E-03', 'Checkout', 'Public projection /api/invoices/:id/public masks phone and leaks no secrets', async () => {
    const res = await apiRequest(`/api/invoices/${e2eInvoiceId}/public`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.json.invoice.id, e2eInvoiceId);
    assert.strictEqual(res.json.invoice.amount, 1250.00);
    assert.strictEqual(res.json.invoice.status, 'PENDING');
    assert.ok(res.json.invoice.customer_phone.includes('****'), 'Phone must be masked');
    assert.strictEqual(res.json.invoice.api_secret, undefined);
    assert.strictEqual(res.json.invoice.webhook_secret, undefined);
  });

  await testCase('E2E-04', 'Carrier Sync', 'Android Forwarder syncs carrier SMS to /api/device/sync-sms with UNUSED status', async () => {
    const smsBody = `You have received Tk 1,250.00 from ${e2eOrder.billing_phone}. Fee Tk 0.00. Balance Tk 60,000.00. TrxID ${e2eTrxId} at 16/09/2026 12:45`;

    const res = await apiRequest('/api/device/sync-sms', {
      method: 'POST',
      headers: {
        'X-Device-Token': FIXTURES.deviceToken
      },
      body: {
        sender: 'bKash',
        body: smsBody,
        sim_slot: 1,
        timestamp: new Date().toISOString()
      }
    });

    assert.strictEqual(res.status, 201, `Ingestion returned ${res.status}: ${res.text}`);
    assert.strictEqual(res.json.success, true);
    assert.strictEqual(res.json.trx_id, e2eTrxId);
    assert.strictEqual(res.json.amount, 1250.00);
    assert.strictEqual(res.json.status, 'UNUSED');

    // Confirm stored_data in database
    const stored = await db.get(
      'SELECT * FROM stored_data WHERE brand_id = ? AND UPPER(trx_id) = ?',
      [FIXTURES.brandId, e2eTrxId]
    );
    assert.ok(stored, 'Record must exist in stored_data');
    assert.strictEqual(stored.status, 'UNUSED');
  });

  await testCase('E2E-05', 'Reconciliation', 'Transaction submission matches SMS via Atomic CAS and transitions invoice to PAID', async () => {
    const res = await apiRequest('/api/payment/submit-trx', {
      method: 'POST',
      body: {
        invoice_id: e2eInvoiceId,
        trx_id: e2eTrxId,
        customer_phone: e2eOrder.billing_phone
      }
    });

    assert.strictEqual(res.status, 200, `Reconciliation returned ${res.status}: ${res.text}`);
    assert.strictEqual(res.json.success, true);
    assert.strictEqual(res.json.status, 'PAID');
    assert.strictEqual(res.json.trx_id, e2eTrxId);

    // Verify stored_data CAS transition to USED
    const stored = await db.get(
      'SELECT status, used_at FROM stored_data WHERE brand_id = ? AND UPPER(trx_id) = ?',
      [FIXTURES.brandId, e2eTrxId]
    );
    assert.strictEqual(stored.status, 'USED');
    assert.ok(stored.used_at !== null);

    // Verify invoice status in DB
    const inv = await db.get('SELECT status, trx_id, payment_method FROM invoices WHERE id = ?', [e2eInvoiceId]);
    assert.strictEqual(inv.status, 'PAID');
    assert.strictEqual(inv.trx_id, e2eTrxId);
    assert.strictEqual(inv.payment_method, 'bKash');

    // Verify merchant credit deducted
    const merchant = await db.get('SELECT credits FROM users WHERE id = ?', [FIXTURES.userId]);
    assert.strictEqual(merchant.credits, FIXTURES.initialCredits - 1);
  });

  await testCase('E2E-06', 'Webhook Dispatch', 'Verified webhook delivered to WooCommerce transitions order to processing', async () => {
    const secret = FIXTURES.webhookSecret;
    const ts = Math.floor(Date.now() / 1000);
    const nonce = crypto.randomUUID();

    const webhookPayload = {
      event: 'invoice.completed',
      invoice_id: e2eInvoiceId,
      amount: 1250.00,
      currency: 'BDT',
      trx_id: e2eTrxId,
      payment_method: 'bkash',
      metadata: { order_id: String(e2eOrder.id) }
    };

    const canonBody = canonicalizeJson(webhookPayload);
    const sig = crypto.createHmac('sha256', secret).update(`${ts}.${nonce}.${canonBody}`).digest('hex');

    const phpRes = runPhpMock({
      action: 'test_webhook',
      webhook_secret: secret,
      order_status_success: 'processing',
      raw_body: canonBody,
      headers: {
        'HTTP_X_DENANEYA_SIGNATURE': `t=${ts},n=${nonce},v1=${sig}`
      },
      order: e2eOrder
    });

    assert.strictEqual(phpRes.success, true);
    assert.strictEqual(phpRes.handler_res.status_code, 200);
    assert.strictEqual(phpRes.order_status, 'processing');
    assert.strictEqual(phpRes.order_paid, true);
    assert.strictEqual(phpRes.order_meta['_denaneya_trx_id'], e2eTrxId);
    assert.strictEqual(phpRes.order_meta['_denaneya_payment_method'], 'bkash');
    assert.ok(phpRes.order_notes[0].includes(e2eTrxId));
  });

  await testCase('E2E-07', 'Webhook Status', 'Configured order status "completed" transitions instant service order to completed', async () => {
    const secret = FIXTURES.webhookSecret;
    const ts = Math.floor(Date.now() / 1000);
    const nonce = crypto.randomUUID();

    const webhookPayload = {
      event: 'invoice.completed',
      invoice_id: e2eInvoiceId,
      amount: 500.00,
      currency: 'BDT',
      trx_id: 'TRX_NAGAD_7002',
      payment_method: 'nagad',
      metadata: { order_id: '7002' }
    };

    const canonBody = canonicalizeJson(webhookPayload);
    const sig = crypto.createHmac('sha256', secret).update(`${ts}.${nonce}.${canonBody}`).digest('hex');

    const phpRes = runPhpMock({
      action: 'test_webhook',
      webhook_secret: secret,
      order_status_success: 'completed',
      raw_body: canonBody,
      headers: {
        'HTTP_X_DENANEYA_SIGNATURE': `t=${ts},n=${nonce},v1=${sig}`
      },
      order: { id: 7002, total: 500.00, status: 'pending' }
    });

    assert.strictEqual(phpRes.success, true);
    assert.strictEqual(phpRes.handler_res.status_code, 200);
    assert.strictEqual(phpRes.order_status, 'completed');
    assert.strictEqual(phpRes.order_paid, true);
  });

  await testCase('E2E-08', 'Underpayment', 'Underpayment detection transitions WooCommerce order to on-hold with warning note', async () => {
    const secret = FIXTURES.webhookSecret;
    const ts = Math.floor(Date.now() / 1000);
    const nonce = crypto.randomUUID();

    const webhookPayload = {
      event: 'invoice.completed',
      invoice_id: e2eInvoiceId,
      amount: 500.00, // Customer paid 500 instead of 1000
      currency: 'BDT',
      trx_id: 'TRX_SHORT_7003',
      payment_method: 'rocket',
      metadata: { order_id: '7003' }
    };

    const canonBody = canonicalizeJson(webhookPayload);
    const sig = crypto.createHmac('sha256', secret).update(`${ts}.${nonce}.${canonBody}`).digest('hex');

    const phpRes = runPhpMock({
      action: 'test_webhook',
      webhook_secret: secret,
      order_status_success: 'processing',
      raw_body: canonBody,
      headers: {
        'HTTP_X_DENANEYA_SIGNATURE': `t=${ts},n=${nonce},v1=${sig}`
      },
      order: { id: 7003, total: 1000.00, status: 'pending' }
    });

    assert.strictEqual(phpRes.success, true);
    assert.strictEqual(phpRes.handler_res.status_code, 200);
    assert.strictEqual(phpRes.handler_res.warning, 'UNDERPAYMENT_DETECTED');
    assert.strictEqual(phpRes.order_status, 'on-hold');
    assert.strictEqual(phpRes.order_paid, false);
    assert.ok(phpRes.order_notes[0].includes('underpayment detected'));
  });

  // ---------------------------------------------------------------------------
  // TASK 4: ARCHIVE INTEGRITY VERIFICATION (denaneya-payment-gateway.zip)
  // ---------------------------------------------------------------------------
  console.log('\n--- TASK 4: Archive Integrity Verification ---');

  const unpackDir = path.resolve(__dirname, 'tmp_unpack_challenger_c2');

  await testCase('ARCH-01', 'Archive', 'denaneya-payment-gateway.zip exists and size is valid (> 10KB)', async () => {
    assert.strictEqual(fs.existsSync(ZIP_PATH), true, 'denaneya-payment-gateway.zip must exist');
    const st = fs.statSync(ZIP_PATH);
    assert.ok(st.size > 10000, `Archive size ${st.size} bytes should be > 10KB`);
  });

  await testCase('ARCH-02', 'Archive', 'Extracts cleanly with root denaneya-payment-gateway/ folder', async () => {
    if (fs.existsSync(unpackDir)) {
      fs.rmSync(unpackDir, { recursive: true, force: true });
    }
    fs.mkdirSync(unpackDir, { recursive: true });

    // Extract using tar
    execSync(`tar -xf "${ZIP_PATH}" -C "${unpackDir}"`);

    const extractedRoot = path.join(unpackDir, 'denaneya-payment-gateway');
    assert.strictEqual(fs.existsSync(extractedRoot), true, 'Root folder denaneya-payment-gateway must exist');
  });

  await testCase('ARCH-03', 'Archive', 'All required classes, templates, and assets exist in unpacked folder', async () => {
    const root = path.join(unpackDir, 'denaneya-payment-gateway');
    const requiredFiles = [
      'denaneya-payment-gateway.php',
      'readme.txt',
      'LICENSE',
      'includes/class-wc-gateway-denaneya.php',
      'includes/class-denaneya-api-client.php',
      'includes/class-denaneya-api.php',
      'includes/class-denaneya-canonicalizer.php',
      'includes/class-denaneya-canonicalize.php',
      'includes/class-denaneya-webhook-handler.php',
      'assets/css/denaneya-checkout.css',
      'assets/images/icon.png',
      'assets/images/bkash.svg',
      'assets/images/nagad.svg',
      'assets/images/rocket.svg',
      'assets/images/upay.svg'
    ];

    for (const rel of requiredFiles) {
      const full = path.join(root, rel);
      assert.strictEqual(fs.existsSync(full), true, `Missing required file: ${rel}`);
      assert.ok(fs.statSync(full).size > 0, `File ${rel} must not be empty`);
    }
  });

  await testCase('ARCH-04', 'Archive', 'php -l linting passes with zero errors on all unpacked PHP files', async () => {
    const root = path.join(unpackDir, 'denaneya-payment-gateway');
    const phpList = [
      'denaneya-payment-gateway.php',
      'includes/class-wc-gateway-denaneya.php',
      'includes/class-denaneya-api-client.php',
      'includes/class-denaneya-api.php',
      'includes/class-denaneya-canonicalizer.php',
      'includes/class-denaneya-canonicalize.php',
      'includes/class-denaneya-webhook-handler.php'
    ];

    for (const rel of phpList) {
      const full = path.join(root, rel);
      const lintOut = execSync(`php -l "${full}"`, { encoding: 'utf8' });
      assert.ok(lintOut.includes('No syntax errors detected'), `Lint error in ${rel}: ${lintOut}`);
    }
  });

  await testCase('ARCH-05', 'Archive', 'Byte-level packaging fidelity: SHA256 checksums of unpacked files match repository source', async () => {
    const root = path.join(unpackDir, 'denaneya-payment-gateway');
    const files = [
      'denaneya-payment-gateway.php',
      'readme.txt',
      'LICENSE',
      'includes/class-wc-gateway-denaneya.php',
      'includes/class-denaneya-api-client.php',
      'includes/class-denaneya-api.php',
      'includes/class-denaneya-canonicalizer.php',
      'includes/class-denaneya-canonicalize.php',
      'includes/class-denaneya-webhook-handler.php',
      'assets/css/denaneya-checkout.css',
      'assets/images/icon.png',
      'assets/images/bkash.svg',
      'assets/images/nagad.svg',
      'assets/images/rocket.svg',
      'assets/images/upay.svg'
    ];

    for (const rel of files) {
      const unpackedPath = path.join(root, rel);
      const sourcePath   = path.join(PLUGIN_DIR, rel);

      const unpackedHash = crypto.createHash('sha256').update(fs.readFileSync(unpackedPath)).digest('hex');
      const sourceHash   = crypto.createHash('sha256').update(fs.readFileSync(sourcePath)).digest('hex');

      assert.strictEqual(unpackedHash, sourceHash, `Checksum mismatch on ${rel}! Packaging corrupted.`);
    }

    // Clean up temporary directory
    fs.rmSync(unpackDir, { recursive: true, force: true });
  });

  // ---------------------------------------------------------------------------
  // CLEANUP & SUMMARY
  // ---------------------------------------------------------------------------
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  if (db) {
    try { await db.close(); } catch (_) {}
  }

  console.log('\n========================================================================');
  console.log('📊 CHALLENGER 2 EMPIRICAL TEST REPORT SUMMARY');
  console.log('========================================================================');
  console.log(`  Total Test Cases Executed: ${report.total}`);
  console.log(`  Passed:                    ${report.passed} (${Math.round((report.passed / report.total) * 100)}%)`);
  console.log(`  Failed / Flagged:          ${report.failed}`);
  console.log('========================================================================\n');

  if (report.findings.length > 0) {
    console.log('⚠️  CHALLENGER FINDINGS / ANOMALIES:');
    report.findings.forEach((f) => {
      console.log(`  - [${f.category}] ${f.id}: ${f.description}\n    Detail: ${f.error}`);
    });
  }

  return report;
}

runChallengerSuite().catch((err) => {
  console.error('FATAL CHALLENGER HARNESS ERROR:', err);
  process.exit(1);
});
