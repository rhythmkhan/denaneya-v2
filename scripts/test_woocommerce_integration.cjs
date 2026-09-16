#!/usr/bin/env node
/**
 * DenaNeya v2.0 - WooCommerce Payment Gateway Integration Test Suite
 * File: scripts/test_woocommerce_integration.cjs
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
const { execSync } = require('child_process');

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

const PLUGIN_DIR = path.resolve(__dirname, '../denaneya-payment-gateway');
const ZIP_PATH   = path.resolve(__dirname, '../denaneya-payment-gateway.zip');
const MOCK_HARNESS = path.resolve(__dirname, 'mock_wc_harness.php');

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
  userId: 'usr_wc_tester_001',
  userZeroCreditId: 'usr_wc_zero_credit_002',
  brandId: 'brd_wc_brand_001',
  brandZeroCreditId: 'brd_wc_zero_credit_002',
  brandName: 'DenaNeya WooCommerce Store',
  webhookSecret: 'whsec_wc_integration_secret_entropy_32_bytes_1234',
  apiKey: `key_wc_${crypto.randomBytes(8).toString('hex')}`,
  apiSecret: `sec_wc_${crypto.randomBytes(16).toString('hex')}`,
  apiKeyZero: `key_zero_${crypto.randomBytes(8).toString('hex')}`,
  apiSecretZero: `sec_zero_${crypto.randomBytes(16).toString('hex')}`,
  initialCredits: 100
};

async function setupDatabaseAndServer() {
  dbPkg = await import('@denaneya/database');
  const { getDatabase, runMigrations, runSeed } = dbPkg.default || dbPkg;
  sharedPkg = await import('@denaneya/shared');
  const { createApp } = await import('../apps/api/src/app.js');

  db = getDatabase();

  if (!isLive) {
    console.log('[Setup] Applying fresh SQLite in-memory migrations...');
    const migRes = await runMigrations(db, { reset: true });
    assert.strictEqual(migRes.success, true, 'Database migrations must apply cleanly');
    await runSeed(db);
  }

  const now = getUtcSql();

  await db.query(
    `INSERT INTO users (id, name, email, password_hash, role, credits, status, created_at, updated_at)
     VALUES (?, 'WooCommerce Merchant', ?, 'hash_demo', 'merchant', ?, 'active', ?, ?)`,
    [FIXTURES.userId, `wc_tester_${Date.now()}@denaneya.local`, FIXTURES.initialCredits, now, now]
  );

  await db.query(
    `INSERT INTO brands (id, user_id, brand_name, brand_slug, api_key, api_secret, webhook_secret, webhook_url, status, created_at, updated_at)
     VALUES (?, ?, ?, 'wc-demo-store', ?, ?, ?, 'https://merchant.example.com/?wc-api=denaneya_webhook', 'active', ?, ?)`,
    [FIXTURES.brandId, FIXTURES.userId, FIXTURES.brandName, FIXTURES.apiKey, FIXTURES.apiSecret, FIXTURES.webhookSecret, now, now]
  );

  await db.query(
    `INSERT INTO users (id, name, email, password_hash, role, credits, status, created_at, updated_at)
     VALUES (?, 'Zero Credit Merchant', ?, 'hash_demo', 'merchant', 0, 'active', ?, ?)`,
    [FIXTURES.userZeroCreditId, `wc_zero_${Date.now()}@denaneya.local`, now, now]
  );

  await db.query(
    `INSERT INTO brands (id, user_id, brand_name, brand_slug, api_key, api_secret, webhook_secret, webhook_url, status, created_at, updated_at)
     VALUES (?, ?, 'Zero Credit Brand', 'zero-credit-store', ?, ?, ?, 'https://merchant.example.com/?wc-api=denaneya_webhook', 'active', ?, ?)`,
    [FIXTURES.brandZeroCreditId, FIXTURES.userZeroCreditId, FIXTURES.apiKeyZero, FIXTURES.apiSecretZero, FIXTURES.webhookSecret, now, now]
  );

  const app = createApp({ db });
  server = http.createServer(app);
  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      console.log(`[Setup] Test Express API running on ${baseUrl}`);
      resolve();
    });
  });
}

async function runAllTests() {
  console.log('========================================================================');
  console.log('🚀 DENANEYA v2.0 - WOOCOMMERCE PAYMENT GATEWAY INTEGRATION TEST SUITE');
  console.log('========================================================================\n');

  await setupDatabaseAndServer();
  runPhpMock({ action: 'clear_transients' });

  console.log('--- CATEGORY 1: Plugin Packaging & File Structure Integrity ---');

  await runTest('T1.1', 'Structure', 'Production zip archive exists and is non-empty', async () => {
    assert.strictEqual(fs.existsSync(ZIP_PATH), true, 'denaneya-payment-gateway.zip must exist');
    const stats = fs.statSync(ZIP_PATH);
    assert.ok(stats.size > 5000, `Archive size must be > 5KB, got ${stats.size} bytes`);
  });

  await runTest('T1.2', 'Structure', 'Zip archive expands with root denaneya-payment-gateway/ directory', async () => {
    const list = execSync(`tar -tf "${ZIP_PATH}"`).toString();
    const entries = list.split(/\r?\n/).filter(Boolean);
    assert.ok(entries.length >= 10, 'Archive should contain at least 10 entries');
    for (const entry of entries) {
      assert.ok(entry.startsWith('denaneya-payment-gateway/'), `Entry ${entry} must start with denaneya-payment-gateway/`);
    }
  });

  await runTest('T1.3', 'Structure', 'Required plugin root files exist (PHP entrypoint, readme.txt, LICENSE)', async () => {
    assert.strictEqual(fs.existsSync(path.join(PLUGIN_DIR, 'denaneya-payment-gateway.php')), true);
    assert.strictEqual(fs.existsSync(path.join(PLUGIN_DIR, 'readme.txt')), true);
    assert.strictEqual(fs.existsSync(path.join(PLUGIN_DIR, 'LICENSE')), true);
  });

  await runTest('T1.4', 'Structure', 'Required includes classes exist', async () => {
    const incDir = path.join(PLUGIN_DIR, 'includes');
    assert.strictEqual(fs.existsSync(path.join(incDir, 'class-wc-gateway-denaneya.php')), true);
    assert.strictEqual(fs.existsSync(path.join(incDir, 'class-denaneya-api-client.php')), true);
    assert.strictEqual(fs.existsSync(path.join(incDir, 'class-denaneya-webhook-handler.php')), true);
    assert.strictEqual(fs.existsSync(path.join(incDir, 'class-denaneya-canonicalizer.php')), true);
  });

  await runTest('T1.5', 'Structure', 'Required assets (CSS, icon.png, MFS SVGs) exist', async () => {
    const cssPath = path.join(PLUGIN_DIR, 'assets', 'css', 'denaneya-checkout.css');
    const iconPath = path.join(PLUGIN_DIR, 'assets', 'images', 'icon.png');
    assert.strictEqual(fs.existsSync(cssPath), true, 'denaneya-checkout.css missing');
    assert.strictEqual(fs.existsSync(iconPath), true, 'icon.png missing');
    for (const mfs of ['bkash', 'nagad', 'rocket', 'upay']) {
      const svgPath = path.join(PLUGIN_DIR, 'assets', 'images', `${mfs}.svg`);
      assert.strictEqual(fs.existsSync(svgPath), true, `${mfs}.svg missing`);
    }
  });

  await runTest('T1.6', 'Structure', 'Main plugin metadata headers conform to WooCommerce requirements', async () => {
    const content = fs.readFileSync(path.join(PLUGIN_DIR, 'denaneya-payment-gateway.php'), 'utf8');
    assert.ok(/Plugin Name:\s*DenaNeya Payment Gateway for WooCommerce/i.test(content));
    assert.ok(/Version:\s*2\.0\.0/i.test(content));
    assert.ok(/Requires at least:\s*5\.8/i.test(content));
    assert.ok(/Requires PHP:\s*7\.4/i.test(content));
    assert.ok(/WC requires at least:\s*6\.0/i.test(content));
    assert.ok(/Text Domain:\s*denaneya-payment-gateway/i.test(content));
  });

  await runTest('T1.7', 'Structure', 'High-Performance Order Storage (HPOS) compatibility declared', async () => {
    const content = fs.readFileSync(path.join(PLUGIN_DIR, 'denaneya-payment-gateway.php'), 'utf8');
    assert.ok(content.includes('before_woocommerce_init'), 'Must hook into before_woocommerce_init');
    assert.ok(content.includes('custom_order_tables'), 'Must declare custom_order_tables compatibility');
    assert.ok(content.includes('declare_compatibility'), 'Must call declare_compatibility');
  });

  console.log('\n--- CATEGORY 2: PHP Syntax Linting (php -l) ---');

  const phpFiles = [
    'denaneya-payment-gateway.php',
    'includes/class-wc-gateway-denaneya.php',
    'includes/class-denaneya-api-client.php',
    'includes/class-denaneya-api.php',
    'includes/class-denaneya-webhook-handler.php',
    'includes/class-denaneya-canonicalizer.php',
    'includes/class-denaneya-canonicalize.php'
  ];

  for (let i = 0; i < phpFiles.length; i++) {
    const rel = phpFiles[i];
    await runTest(`T2.${i + 1}`, 'Lint', `php -l on ${rel} reports zero syntax errors`, async () => {
      const fullPath = path.join(PLUGIN_DIR, rel);
      const out = execSync(`php -l "${fullPath}"`).toString();
      assert.ok(out.includes('No syntax errors detected'), `Unexpected output: ${out}`);
    });
  }

  console.log('\n--- CATEGORY 3: RFC 8785 JSON Canonicalization Parity ---');

  const { canonicalizeJson } = sharedPkg;

  const testPayloads = [
    { z: 1, a: 2, m: 3 },
    { amount: 500, currency: 'BDT', channel: 'bkash', metadata: { order_id: '1001', store: 'aihaat' } },
    { deep: { b: { d: 4, c: 3 }, a: 1 }, list: [3, 1, 2], active: true, empty: null },
    { 'দেনা': 'নেয়া', 'টাকা': 1250.5, 'trx': 'TRX12345678', 'বিকাশ': true }
  ];

  for (let i = 0; i < testPayloads.length; i++) {
    const payload = testPayloads[i];
    await runTest(`T3.${i + 1}`, 'Canonicalizer', `Payload #${i + 1} produces byte-for-byte identical output`, async () => {
      const nodeCanon = canonicalizeJson(payload);
      const phpRes = runPhpMock({ action: 'canonicalize', value: payload });
      assert.strictEqual(phpRes.success, true);
      assert.strictEqual(phpRes.canonical, nodeCanon, `Parity mismatch:\nNode: ${nodeCanon}\nPHP:  ${phpRes.canonical}`);
    });
  }

  console.log('\n--- CATEGORY 4: Cryptographic HMAC-SHA256 Parity ---');

  const { generateWebhookSignature } = sharedPkg;

  await runTest('T4.1', 'Crypto', 'Node.js generated HMAC signature matches PHP hash_hmac calculation', async () => {
    const secret = FIXTURES.webhookSecret;
    const testData = { event: 'invoice.completed', amount: 500, trx_id: 'TRX_TEST_HMAC' };
    const ts = Math.floor(Date.now() / 1000);
    const nonce = 'c0a80101-1234-5678-9abc-def012345678';

    const sigObj = generateWebhookSignature(testData, secret, ts, nonce);
    const nodeSig = sigObj.signature;

    const canon = canonicalizeJson(testData);
    const phpRes = runPhpMock({
      action: 'compute_hmac',
      data: `${ts}.${nonce}.${canon}`,
      secret: secret
    });

    assert.strictEqual(nodeSig, phpRes.signature, `Signature mismatch: Node [${nodeSig}] vs PHP [${phpRes.signature}]`);
  });

  await runTest('T4.2', 'Crypto', 'Header t=...,n=...,v1=... format is properly assembled and parsed', async () => {
    const sigObj = generateWebhookSignature({ test: 123 }, FIXTURES.webhookSecret, 1726459200, 'nonce_123');
    assert.strictEqual(sigObj.header.startsWith('t=1726459200,n=nonce_123,v1='), true);
    assert.strictEqual(sigObj.timestamp, 1726459200);
    assert.strictEqual(sigObj.nonce, 'nonce_123');
  });

  console.log('\n--- CATEGORY 5: S2S Invoice Creation API (/v1/payment/create) ---');

  let activeInvoiceId = null;
  let activeCheckoutUrl = null;

  await runTest('T5.1', 'API', 'Create invoice with valid credentials returns HTTP 201 and invoice details', async () => {
    const res = await apiRequest('/v1/payment/create', {
      method: 'POST',
      headers: {
        'X-API-KEY': FIXTURES.apiKey,
        'X-API-SECRET': FIXTURES.apiSecret
      },
      body: {
        amount: 750.50,
        currency: 'BDT',
        order_id: '4001',
        customer_name: 'Shakib Al Hasan',
        customer_email: 'shakib@example.com',
        customer_phone: '01711223344',
        redirect_url: 'https://myshop.com/wc-api/return',
        cancel_url: 'https://myshop.com/checkout/cancel',
        metadata: {
          order_id: '4001',
          order_number: 'ORD-4001',
          order_key: 'wc_order_abc123',
          platform: 'WooCommerce',
          plugin_version: '2.0.0'
        }
      }
    });

    assert.strictEqual(res.status, 201, `Expected HTTP 201, got ${res.status}: ${res.text}`);
    assert.strictEqual(res.json.success, true);
    assert.ok(res.json.invoice_id.startsWith('inv_'));
    assert.ok(res.json.checkout_url.includes('/pay/inv_'));
    assert.strictEqual(res.json.invoice.amount, 750.50);
    assert.strictEqual(res.json.invoice.status, 'PENDING');

    activeInvoiceId = res.json.invoice_id;
    activeCheckoutUrl = res.json.checkout_url;
  });

  await runTest('T5.2', 'API', 'Invoice persisted in database with 15-minute TTL and correct metadata', async () => {
    const row = await db.get('SELECT * FROM invoices WHERE id = ?', [activeInvoiceId]);
    assert.ok(row, 'Invoice record must exist in DB');
    assert.strictEqual(row.brand_id, FIXTURES.brandId);
    assert.strictEqual(Number(row.amount), 750.50);
    assert.strictEqual(row.status, 'PENDING');

    const expiresAt = new Date(row.expires_at.replace(' ', 'T') + 'Z').getTime();
    const createdAt = new Date(row.created_at.replace(' ', 'T') + 'Z').getTime();
    const ttlMinutes = Math.round((expiresAt - createdAt) / (60 * 1000));
    assert.strictEqual(ttlMinutes, 15, `Expected 15 min TTL, got ${ttlMinutes} mins`);

    const meta = JSON.parse(row.metadata_json);
    assert.strictEqual(meta.order_id, '4001');
    assert.strictEqual(meta.platform, 'WooCommerce');
  });

  await runTest('T5.3', 'API', 'Verify invoice payment status via POST /v1/payment/verify', async () => {
    const res = await apiRequest('/v1/payment/verify', {
      method: 'POST',
      headers: {
        'X-API-KEY': FIXTURES.apiKey,
        'X-API-SECRET': FIXTURES.apiSecret
      },
      body: { invoice_id: activeInvoiceId }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.json.invoice_id, activeInvoiceId);
    assert.strictEqual(res.json.payment_status, 'PENDING');
  });

  await runTest('T5.4', 'API', 'Rejects S2S invoice creation with invalid API credentials (HTTP 401)', async () => {
    const res = await apiRequest('/v1/payment/create', {
      method: 'POST',
      headers: {
        'X-API-KEY': 'invalid_key',
        'X-API-SECRET': 'invalid_secret'
      },
      body: { amount: 100 }
    });
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.json.success, false);
  });

  await runTest('T5.5', 'API', 'Rejects S2S invoice creation when merchant credits are depleted (HTTP 402)', async () => {
    const res = await apiRequest('/v1/payment/create', {
      method: 'POST',
      headers: {
        'X-API-KEY': FIXTURES.apiKeyZero,
        'X-API-SECRET': FIXTURES.apiSecretZero
      },
      body: { amount: 100 }
    });
    assert.strictEqual(res.status, 402);
    assert.strictEqual(res.json.code, 'INSUFFICIENT_CREDITS');
  });

  await runTest('T5.6', 'API', 'Rejects S2S invoice creation with zero or negative amount (HTTP 400)', async () => {
    const res = await apiRequest('/v1/payment/create', {
      method: 'POST',
      headers: {
        'X-API-KEY': FIXTURES.apiKey,
        'X-API-SECRET': FIXTURES.apiSecret
      },
      body: { amount: -50 }
    });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.json.code, 'INVALID_AMOUNT');
  });

  await runTest('T5.7', 'API', 'Rejects S2S invoice creation with amount exceeding 500,000 BDT (HTTP 400)', async () => {
    const res = await apiRequest('/v1/payment/create', {
      method: 'POST',
      headers: {
        'X-API-KEY': FIXTURES.apiKey,
        'X-API-SECRET': FIXTURES.apiSecret
      },
      body: { amount: 600000 }
    });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.json.code, 'AMOUNT_EXCEEDS_LIMIT');
  });

  console.log('\n--- CATEGORY 6: Hosted Checkout Customer Journey ---');

  await runTest('T6.1', 'Checkout', 'Customer navigates to hosted checkout URL (/pay/:id) -> HTTP 200', async () => {
    const res = await apiRequest(`/pay/${activeInvoiceId}?standalone=1`);
    assert.strictEqual(res.status, 200);
    assert.ok(res.text.includes(activeInvoiceId), 'Response HTML should contain invoice ID');
  });

  await runTest('T6.2', 'Checkout', 'Zero-secret public projection (/api/invoices/:id/public) returns safe data', async () => {
    const res = await apiRequest(`/api/invoices/${activeInvoiceId}/public`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.json.invoice.id, activeInvoiceId);
    assert.strictEqual(res.json.invoice.amount, 750.50);
    assert.strictEqual(res.json.invoice.status, 'PENDING');
    assert.ok(res.json.invoice.customer_phone.includes('****'), 'Phone must be masked');
    assert.strictEqual(res.json.invoice.api_secret, undefined);
    assert.strictEqual(res.json.invoice.webhook_secret, undefined);
  });

  console.log('\n--- CATEGORY 7: Webhook Callback & Order Lifecycle ---');

  await runTest('T7.1', 'Webhook', 'Valid signed invoice.completed updates order status to processing', async () => {
    const secret = FIXTURES.webhookSecret;
    const ts = Math.floor(Date.now() / 1000);
    const nonce = crypto.randomUUID();

    const webhookPayload = {
      event: 'invoice.completed',
      invoice_id: activeInvoiceId,
      amount: 500.00,
      currency: 'BDT',
      trx_id: 'TRX_BKASH_88291',
      payment_method: 'bkash',
      metadata: { order_id: '701' }
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
      order: { id: 701, total: 500.00, status: 'pending' }
    });

    assert.strictEqual(phpRes.success, true);
    assert.strictEqual(phpRes.handler_res.status_code, 200);
    assert.strictEqual(phpRes.order_status, 'processing');
    assert.strictEqual(phpRes.order_paid, true);
    assert.strictEqual(phpRes.order_meta['_denaneya_trx_id'], 'TRX_BKASH_88291');
    assert.strictEqual(phpRes.order_meta['_denaneya_payment_method'], 'bkash');
    assert.ok(phpRes.order_notes[0].includes('TRX_BKASH_88291'));
  });

  await runTest('T7.2', 'Webhook', 'Configured order status "completed" updates order to completed', async () => {
    const secret = FIXTURES.webhookSecret;
    const ts = Math.floor(Date.now() / 1000);
    const nonce = crypto.randomUUID();

    const webhookPayload = {
      event: 'invoice.completed',
      invoice_id: activeInvoiceId,
      amount: 300.00,
      currency: 'BDT',
      trx_id: 'TRX_NAGAD_33441',
      payment_method: 'nagad',
      metadata: { order_id: '702' }
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
      order: { id: 702, total: 300.00, status: 'pending' }
    });

    assert.strictEqual(phpRes.success, true);
    assert.strictEqual(phpRes.handler_res.status_code, 200);
    assert.strictEqual(phpRes.order_status, 'completed');
    assert.strictEqual(phpRes.order_paid, true);
  });

  await runTest('T7.3', 'Webhook', 'Idempotent repeated delivery returns 200 without duplicate updates', async () => {
    const secret = FIXTURES.webhookSecret;
    const ts = Math.floor(Date.now() / 1000);
    const nonce = crypto.randomUUID();

    const webhookPayload = {
      event: 'invoice.completed',
      invoice_id: activeInvoiceId,
      amount: 500.00,
      trx_id: 'TRX_DUP_11223',
      payment_method: 'rocket',
      metadata: { order_id: '703' }
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
      order: { id: 703, total: 500.00, status: 'processing', paid: true }
    });

    assert.strictEqual(phpRes.success, true);
    assert.strictEqual(phpRes.handler_res.status_code, 200);
    assert.strictEqual(phpRes.handler_res.message, 'Order already processed.');
    assert.strictEqual(phpRes.order_status, 'processing');
  });

  console.log('\n--- CATEGORY 8: Webhook Anti-Tamper & Security Defenses ---');

  await runTest('T8.1', 'Security', 'Rejects tampered payload / invalid HMAC signature (HTTP 401)', async () => {
    const secret = FIXTURES.webhookSecret;
    const ts = Math.floor(Date.now() / 1000);
    const nonce = crypto.randomUUID();

    const webhookPayload = {
      event: 'invoice.completed',
      amount: 500.00,
      metadata: { order_id: '801' }
    };

    const canonBody = canonicalizeJson(webhookPayload);
    const fakeSig = 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';

    const phpRes = runPhpMock({
      action: 'test_webhook',
      webhook_secret: secret,
      raw_body: canonBody,
      headers: {
        'HTTP_X_DENANEYA_SIGNATURE': `t=${ts},n=${nonce},v1=${fakeSig}`
      },
      order: { id: 801, total: 500.00, status: 'pending' }
    });

    assert.strictEqual(phpRes.handler_res.status_code, 401);
    assert.strictEqual(phpRes.handler_res.code, 'INVALID_SIGNATURE');
    assert.strictEqual(phpRes.order_status, 'pending');
    assert.strictEqual(phpRes.order_paid, false);
  });

  await runTest('T8.2', 'Security', 'Rejects expired timestamp (> 300s old) (HTTP 401)', async () => {
    const secret = FIXTURES.webhookSecret;
    const expiredTs = Math.floor(Date.now() / 1000) - 450;
    const nonce = crypto.randomUUID();

    const webhookPayload = { event: 'invoice.completed', amount: 500.00, metadata: { order_id: '802' } };
    const canonBody = canonicalizeJson(webhookPayload);
    const sig = crypto.createHmac('sha256', secret).update(`${expiredTs}.${nonce}.${canonBody}`).digest('hex');

    const phpRes = runPhpMock({
      action: 'test_webhook',
      webhook_secret: secret,
      raw_body: canonBody,
      headers: {
        'HTTP_X_DENANEYA_SIGNATURE': `t=${expiredTs},n=${nonce},v1=${sig}`
      },
      order: { id: 802, total: 500.00, status: 'pending' }
    });

    assert.strictEqual(phpRes.handler_res.status_code, 401);
    assert.strictEqual(phpRes.handler_res.code, 'TIMESTAMP_OUT_OF_TOLERANCE');
  });

  await runTest('T8.3', 'Security', 'Replay attack mitigation: duplicate nonce rejected with HTTP 409', async () => {
    const secret = FIXTURES.webhookSecret;
    const ts = Math.floor(Date.now() / 1000);
    const fixedNonce = 'nonce_replay_test_' + crypto.randomBytes(8).toString('hex');

    const webhookPayload = { event: 'invoice.completed', amount: 500.00, metadata: { order_id: '803' } };
    const canonBody = canonicalizeJson(webhookPayload);
    const sig = crypto.createHmac('sha256', secret).update(`${ts}.${fixedNonce}.${canonBody}`).digest('hex');

    const firstRes = runPhpMock({
      action: 'test_webhook',
      webhook_secret: secret,
      raw_body: canonBody,
      headers: {
        'HTTP_X_DENANEYA_SIGNATURE': `t=${ts},n=${fixedNonce},v1=${sig}`
      },
      order: { id: 803, total: 500.00, status: 'pending' }
    });
    assert.strictEqual(firstRes.handler_res.status_code, 200);

    const replayRes = runPhpMock({
      action: 'test_webhook',
      webhook_secret: secret,
      raw_body: canonBody,
      headers: {
        'HTTP_X_DENANEYA_SIGNATURE': `t=${ts},n=${fixedNonce},v1=${sig}`
      },
      order: { id: 803, total: 500.00, status: 'processing' }
    });

    assert.strictEqual(replayRes.handler_res.status_code, 409);
    assert.strictEqual(replayRes.handler_res.code, 'REPLAYED_NONCE');
  });

  await runTest('T8.4', 'Security', 'Underpayment detection sets order on-hold with warning note', async () => {
    const secret = FIXTURES.webhookSecret;
    const ts = Math.floor(Date.now() / 1000);
    const nonce = crypto.randomUUID();

    const webhookPayload = {
      event: 'invoice.completed',
      amount: 600.00,
      currency: 'BDT',
      trx_id: 'TRX_SHORT_PAY',
      payment_method: 'bkash',
      metadata: { order_id: '804' }
    };

    const canonBody = canonicalizeJson(webhookPayload);
    const sig = crypto.createHmac('sha256', secret).update(`${ts}.${nonce}.${canonBody}`).digest('hex');

    const phpRes = runPhpMock({
      action: 'test_webhook',
      webhook_secret: secret,
      raw_body: canonBody,
      headers: {
        'HTTP_X_DENANEYA_SIGNATURE': `t=${ts},n=${nonce},v1=${sig}`
      },
      order: { id: 804, total: 1000.00, status: 'pending' }
    });

    assert.strictEqual(phpRes.handler_res.status_code, 200);
    assert.strictEqual(phpRes.handler_res.warning, 'UNDERPAYMENT_DETECTED');
    assert.strictEqual(phpRes.order_status, 'on-hold');
    assert.strictEqual(phpRes.order_paid, false);
    assert.ok(phpRes.order_notes[0].includes('underpayment detected'));
  });

  await runTest('T8.5', 'Security', 'Rejects webhook when webhook_secret is shorter than 32 characters (HTTP 500)', async () => {
    const shortSecret = 'short_secret_12345';
    const ts = Math.floor(Date.now() / 1000);
    const nonce = crypto.randomUUID();

    const webhookPayload = { event: 'invoice.completed', amount: 500.00, metadata: { order_id: '805' } };
    const canonBody = canonicalizeJson(webhookPayload);
    const sig = crypto.createHmac('sha256', shortSecret).update(`${ts}.${nonce}.${canonBody}`).digest('hex');

    const phpRes = runPhpMock({
      action: 'test_webhook',
      webhook_secret: shortSecret,
      raw_body: canonBody,
      headers: {
        'HTTP_X_DENANEYA_SIGNATURE': `t=${ts},n=${nonce},v1=${sig}`
      },
      order: { id: 805, total: 500.00, status: 'pending' }
    });

    assert.strictEqual(phpRes.handler_res.status_code, 500);
    assert.strictEqual(phpRes.handler_res.code, 'INSECURE_CONFIGURATION');
  });

  await runTest('T8.6', 'Security', 'Rejects webhook when order_id does not exist in WooCommerce (HTTP 404)', async () => {
    const secret = FIXTURES.webhookSecret;
    const ts = Math.floor(Date.now() / 1000);
    const nonce = crypto.randomUUID();

    const webhookPayload = {
      event: 'invoice.completed',
      amount: 500.00,
      metadata: { order_id: '99999' }
    };

    const canonBody = canonicalizeJson(webhookPayload);
    const sig = crypto.createHmac('sha256', secret).update(`${ts}.${nonce}.${canonBody}`).digest('hex');

    const phpRes = runPhpMock({
      action: 'test_webhook',
      webhook_secret: secret,
      raw_body: canonBody,
      headers: {
        'HTTP_X_DENANEYA_SIGNATURE': `t=${ts},n=${nonce},v1=${sig}`
      },
      order: { id: 806, total: 500.00, status: 'pending' }
    });

    assert.strictEqual(phpRes.handler_res.status_code, 404);
    assert.strictEqual(phpRes.handler_res.code, 'ORDER_NOT_FOUND');
  });

  await runTest('T8.7', 'Security', 'Ignores non-payment events gracefully without order modification', async () => {
    const secret = FIXTURES.webhookSecret;
    const ts = Math.floor(Date.now() / 1000);
    const nonce = crypto.randomUUID();

    const webhookPayload = {
      event: 'device.heartbeat',
      device_id: 'dev_123',
      battery: 90
    };

    const canonBody = canonicalizeJson(webhookPayload);
    const sig = crypto.createHmac('sha256', secret).update(`${ts}.${nonce}.${canonBody}`).digest('hex');

    const phpRes = runPhpMock({
      action: 'test_webhook',
      webhook_secret: secret,
      raw_body: canonBody,
      headers: {
        'HTTP_X_DENANEYA_SIGNATURE': `t=${ts},n=${nonce},v1=${sig}`
      },
      order: { id: 807, total: 500.00, status: 'pending' }
    });

    assert.strictEqual(phpRes.handler_res.status_code, 200);
    assert.ok(phpRes.handler_res.message.includes('Event ignored'));
    assert.strictEqual(phpRes.order_status, 'pending');
    assert.strictEqual(phpRes.order_paid, false);
  });

  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  if (db && !isLive) {
    try {
      await db.close();
    } catch (_) {}
  }

  console.log('\n========================================================================');
  console.log('📊 WOOCOMMERCE INTEGRATION TEST SUMMARY REPORT');
  console.log('========================================================================');
  console.log(`  Total Test Cases Executed: ${summary.total}`);
  console.log(`  Passed:                    ${summary.passed} (${Math.round((summary.passed / summary.total) * 100)}%)`);
  console.log(`  Failed:                    ${summary.failed}`);
  console.log('========================================================================\n');

  if (summary.failed > 0) {
    console.error('❌ INTEGRATION TEST FAILED with the following errors:');
    summary.failures.forEach((f) => {
      console.error(`  - [${f.category}] ${f.id}: ${f.description} -> ${f.error}`);
    });
    process.exit(1);
  } else {
    console.log('✅ ALL INTEGRATION TESTS PASSED WITH 100% SUCCESS RATE.');
    process.exit(0);
  }
}

runAllTests().catch((err) => {
  console.error('FATAL TEST RUNNER ERROR:', err);
  process.exit(1);
});
