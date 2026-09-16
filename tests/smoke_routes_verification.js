/**
 * Empirical Verification Harness: Webhook and Brand Update API Smoke Test
 * Tests:
 * 1. PUT /api/brands/:id
 *    - 401 Unauthenticated
 *    - 404 Non-existent brand
 *    - 403 Cross-tenant IDOR defense (User B cannot update User A's brand)
 *    - 400 Validation error (invalid name, empty body)
 *    - 200 OK for webhook_url and brand_name update + DB persistence check
 * 2. POST /api/webhooks/test
 *    - 401 Unauthenticated
 *    - 400 Missing webhook URL
 *    - 400 SSRF firewall defense (metadata IP block)
 *    - 200 OK end-to-end simulated webhook delivery with HMAC-SHA256 signature verification & latency measurement
 */

import http from 'node:http';
import assert from 'node:assert';
import crypto from 'node:crypto';

// Ensure test environment variables
process.env.NODE_ENV = 'test';
process.env.DB_CLIENT = 'sqlite';
process.env.DB_SQLITE_PATH = ':memory:';
process.env.JWT_SECRET = 'denaneya_development_jwt_secret_min_32_bytes_long_12345';

const { default: dbPkg } = await import('@denaneya/database');
const { getDatabase, setDatabase, resetDatabase, runMigrations, runSeed } = dbPkg;
const { createApp } = await import('../apps/api/src/app.js');
const { verifyWebhookSignature } = await import('@denaneya/shared');

console.log('================================================================');
console.log('🧪 VERIFICATION SUITE: Backend Route Smoke Test (Webhooks & Brands)');
console.log('================================================================\n');

let appServer;
let apiBaseUrl;
let db;
let receiverServer;
let receiverPort;
let receiverReceivedRequests = [];

let passCount = 0;
let failCount = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✅ [PASS] ${name}`);
    passCount++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(`     Error: ${err.message}`);
    console.error(err);
    failCount++;
    process.exitCode = 1;
  }
}

async function apiRequest(path, { method = 'GET', headers = {}, body = null } = {}) {
  const reqHeaders = {
    'Content-Type': 'application/json',
    ...headers
  };

  const reqOptions = {
    method,
    headers: reqHeaders
  };

  if (body) {
    reqOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  const res = await fetch(`${apiBaseUrl}${path}`, reqOptions);
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch (_) {
    json = text;
  }

  return {
    status: res.status,
    headers: res.headers,
    body: json,
    rawText: text
  };
}

async function setup() {
  // 1. Setup DB
  await resetDatabase();
  db = getDatabase({ client: 'sqlite', sqlitePath: ':memory:', setAsGlobal: true });
  setDatabase(db);
  await runMigrations(db, { reset: true });
  await runSeed(db, { clean: true, seedAll52: true });

  // 2. Start Express App
  const app = createApp({ db });
  appServer = app.listen(0);
  const { port } = appServer.address();
  apiBaseUrl = `http://127.0.0.1:${port}`;

  // 3. Start Mock Webhook Receiver HTTP server
  receiverServer = http.createServer((req, res) => {
    let chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const rawBody = Buffer.concat(chunks).toString('utf-8');
      receiverReceivedRequests.push({
        method: req.method,
        url: req.url,
        headers: req.headers,
        rawBody
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ received: true, ack: 'OK_TEST_ACK_200' }));
    });
  });

  await new Promise((resolve) => {
    receiverServer.listen(0, '127.0.0.1', () => {
      receiverPort = receiverServer.address().port;
      resolve();
    });
  });

  console.log(`[Setup] Test API server running on: ${apiBaseUrl}`);
  console.log(`[Setup] Mock Webhook receiver on:    http://127.0.0.1:${receiverPort}\n`);
}

async function teardown() {
  if (receiverServer) {
    await new Promise((r) => receiverServer.close(r));
  }
  if (appServer) {
    await new Promise((r) => appServer.close(r));
  }
  if (db) {
    await db.close();
  }
  await resetDatabase();
}

try {
  await setup();

  // Create two distinct users for IDOR / multi-tenant isolation testing
  // User A (Owner)
  const userARes = await apiRequest('/api/auth/register', {
    method: 'POST',
    body: {
      email: 'owner_user_a@denaneya.test',
      password: 'StrongPassword123!@#',
      name: 'Owner User A',
      phone: '01811112222'
    }
  });
  assert.strictEqual(userARes.status, 201, 'Failed to register User A');
  const tokenA = userARes.body.token;

  // Create Brand for User A
  const brandCreateRes = await apiRequest('/api/brands', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: {
      brand_name: 'Alpha Electronics',
      brand_slug: 'alpha-electronics',
      webhook_url: 'https://alpha.example.com/webhook'
    }
  });
  assert.strictEqual(brandCreateRes.status, 201, 'Failed to create brand for User A');
  const brandA = brandCreateRes.body.brand;
  const brandAId = brandA.id;

  // User B (Attacker / Different Tenant)
  const userBRes = await apiRequest('/api/auth/register', {
    method: 'POST',
    body: {
      email: 'tenant_user_b@denaneya.test',
      password: 'StrongPassword123!@#',
      name: 'Tenant User B',
      phone: '01833334444'
    }
  });
  assert.strictEqual(userBRes.status, 201, 'Failed to register User B');
  const tokenB = userBRes.body.token;

  // -------------------------------------------------------------
  // TEST SUITE: PUT /api/brands/:id
  // -------------------------------------------------------------
  console.log('--- 1. PUT /api/brands/:id Verification ---');

  await test('PUT /api/brands/:id rejects unauthenticated request (401)', async () => {
    const res = await apiRequest(`/api/brands/${brandAId}`, {
      method: 'PUT',
      body: { webhook_url: 'https://hacked.com' }
    });
    assert.strictEqual(res.status, 401, `Expected 401, got ${res.status}`);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.code, 'UNAUTHORIZED');
  });

  await test('PUT /api/brands/:id returns 404 for non-existent brand', async () => {
    const res = await apiRequest('/api/brands/b_non_existent_99999', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: { webhook_url: 'https://newsite.com/webhook' }
    });
    assert.strictEqual(res.status, 404, `Expected 404, got ${res.status}`);
    assert.strictEqual(res.body.code, 'BRAND_NOT_FOUND');
  });

  await test('PUT /api/brands/:id prevents cross-tenant IDOR update (403 Forbidden)', async () => {
    // User B attempts to overwrite User A's brand webhook_url
    const res = await apiRequest(`/api/brands/${brandAId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tokenB}` },
      body: { webhook_url: 'https://attacker.com/steal-webhooks' }
    });
    assert.strictEqual(res.status, 403, `Expected 403 Forbidden, got ${res.status}`);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.code, 'FORBIDDEN');

    // Confirm database record was NOT altered
    const dbRow = await db.get('SELECT webhook_url FROM brands WHERE id = ?', [brandAId]);
    assert.strictEqual(dbRow.webhook_url, 'https://alpha.example.com/webhook', 'IDOR exploit succeeded! DB was altered!');
  });

  await test('PUT /api/brands/:id rejects empty payload (400 Bad Request)', async () => {
    const res = await apiRequest(`/api/brands/${brandAId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: {}
    });
    assert.strictEqual(res.status, 400, `Expected 400, got ${res.status}`);
    assert.strictEqual(res.body.code, 'BAD_REQUEST');
  });

  await test('PUT /api/brands/:id rejects invalid brand_name length (400 Validation Error)', async () => {
    const res = await apiRequest(`/api/brands/${brandAId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: { brand_name: 'X' } // Less than 2 chars
    });
    assert.strictEqual(res.status, 400, `Expected 400, got ${res.status}`);
    assert.strictEqual(res.body.code, 'VALIDATION_ERROR');
  });

  await test('PUT /api/brands/:id successfully updates webhook_url and persists to DB (200)', async () => {
    const newWebhookUrl = `http://127.0.0.1:${receiverPort}/my-store-webhook`;
    const res = await apiRequest(`/api/brands/${brandAId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: { webhook_url: newWebhookUrl }
    });
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.brand.webhook_url, newWebhookUrl);

    // Verify database persistence
    const dbRow = await db.get('SELECT webhook_url, brand_name FROM brands WHERE id = ?', [brandAId]);
    assert.strictEqual(dbRow.webhook_url, newWebhookUrl, 'Database webhook_url mismatch');
  });

  await test('PUT /api/brands/:id successfully updates brand_name (200)', async () => {
    const newName = 'Alpha Superstore 2026';
    const res = await apiRequest(`/api/brands/${brandAId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: { brand_name: newName }
    });
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    assert.strictEqual(res.body.brand.brand_name, newName);

    const dbRow = await db.get('SELECT brand_name FROM brands WHERE id = ?', [brandAId]);
    assert.strictEqual(dbRow.brand_name, newName, 'Database brand_name mismatch');
  });

  // -------------------------------------------------------------
  // TEST SUITE: POST /api/webhooks/test
  // -------------------------------------------------------------
  console.log('\n--- 2. POST /api/webhooks/test Verification ---');

  await test('POST /api/webhooks/test rejects unauthenticated request (401)', async () => {
    const res = await apiRequest('/api/webhooks/test', {
      method: 'POST',
      body: { webhook_url: `http://127.0.0.1:${receiverPort}/listener` }
    });
    assert.strictEqual(res.status, 401, `Expected 401, got ${res.status}`);
    assert.strictEqual(res.body.code, 'UNAUTHORIZED');
  });

  await test('POST /api/webhooks/test requires webhook URL if none configured on brand (400)', async () => {
    // Create Brand with NULL webhook_url
    const noWebhookBrandRes = await apiRequest('/api/brands', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: {
        brand_name: 'No Webhook Brand',
        brand_slug: 'no-webhook-brand'
      }
    });
    const emptyBrandId = noWebhookBrandRes.body.brand.id;

    const res = await apiRequest('/api/webhooks/test', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenA}`,
        'x-brand-id': emptyBrandId
      },
      body: { webhook_url: '' }
    });
    assert.strictEqual(res.status, 400, `Expected 400, got ${res.status}`);
    assert.strictEqual(res.body.code, 'WEBHOOK_URL_REQUIRED');
  });

  await test('POST /api/webhooks/test blocks SSRF attacks against AWS metadata IP (400)', async () => {
    const res = await apiRequest('/api/webhooks/test', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenA}`,
        'x-brand-id': brandAId
      },
      body: { webhook_url: 'http://169.254.169.254/latest/meta-data/' }
    });
    assert.strictEqual(res.status, 400, `Expected 400, got ${res.status}`);
    assert.strictEqual(res.body.code, 'INVALID_WEBHOOK_URL');
    assert(res.body.message.includes('SSRF'), 'Error message must cite SSRF prevention');
  });

  await test('POST /api/webhooks/test executes simulated delivery with HMAC signature & latency (200)', async () => {
    receiverReceivedRequests = [];
    const targetUrl = `http://127.0.0.1:${receiverPort}/client-listener`;

    const res = await apiRequest('/api/webhooks/test', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenA}`,
        'x-brand-id': brandAId
      },
      body: {
        webhook_url: targetUrl,
        event: 'invoice.completed'
      }
    });

    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.http_status, 200);
    assert.strictEqual(res.body.status_text, 'OK');
    assert(typeof res.body.latency_ms === 'number' && res.body.latency_ms >= 0, 'Invalid latency_ms');
    assert(res.body.signature_header.startsWith('t='), 'Signature header should contain timestamp');
    assert.strictEqual(res.body.sent_payload.event, 'invoice.completed');
    assert(res.body.response_body.includes('OK_TEST_ACK_200'), 'Should contain receiver ack');

    // Verify mock receiver received the request with exact headers and payload
    assert.strictEqual(receiverReceivedRequests.length, 1, 'Receiver should receive exactly 1 request');
    const incoming = receiverReceivedRequests[0];
    assert.strictEqual(incoming.method, 'POST');
    assert.strictEqual(incoming.url, '/client-listener');
    assert(incoming.headers['x-denaneya-signature'], 'Missing X-DenaNeya-Signature header');
    assert(incoming.headers['x-denaneya-timestamp'], 'Missing X-DenaNeya-Timestamp header');
    assert(incoming.headers['x-denaneya-nonce'], 'Missing X-DenaNeya-Nonce header');
    assert.strictEqual(incoming.headers['x-denaneya-event'], 'invoice.completed');

    // Cryptographically verify signature using brand's webhook_secret
    const brandRow = await db.get('SELECT webhook_secret FROM brands WHERE id = ?', [brandAId]);
    assert(brandRow && brandRow.webhook_secret, 'Brand webhook secret not found in DB');

    const incomingPayload = JSON.parse(incoming.rawBody);
    assert.strictEqual(incomingPayload.event, 'invoice.completed');
    assert.strictEqual(incomingPayload.data.amount, 1250);

    const verificationResult = verifyWebhookSignature(
      incomingPayload,
      incoming.headers['x-denaneya-signature'],
      brandRow.webhook_secret,
      60
    );
    assert.strictEqual(verificationResult.valid, true, `Signature validation failed: ${verificationResult.error}`);

  });

} finally {
  await teardown();
}

console.log('\n================================================================');
console.log(`Backend Route Smoke Test Results: ${passCount} Passed, ${failCount} Failed`);
console.log('================================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
