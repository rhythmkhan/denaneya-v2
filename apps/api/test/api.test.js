/**
 * DenaNeya v2.0 - Master Integration Test Suite for apps/api
 * Verifies:
 * - SEC-TEST-01: Unauthenticated IDOR rejection on /api/dashboard/stats (HTTP 401)
 * - SEC-TEST-02: Cross-tenant IDOR defense on /api/dashboard/stats (HTTP 403)
 * - User registration, login, and JWT validation journey
 * - Brand management & tenant isolation
 * - Zero-Secret Projection on /api/dashboard/stats
 * - Defensive security headers (Helmet) & body size limits
 */

import './setup-test-env.js';

import assert from 'node:assert';

const { default: dbPkg } = await import('@denaneya/database');
const { getDatabase, setDatabase, resetDatabase, runMigrations, runSeed } = dbPkg;
const { createApp } = await import('../src/app.js');

console.log('===============================================================================');
console.log('      DenaNeya v2.0 - apps/api Automated Integration Test Suite                ');
console.log('===============================================================================\n');

let server;
let baseUrl;
let db;
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

/**
 * Universal API Request Helper using native Node fetch
 */
async function request(path, { method = 'GET', headers = {}, body = null } = {}) {
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

  const res = await fetch(`${baseUrl}${path}`, reqOptions);
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
  console.log('[Setup] Initializing in-memory SQLite database singleton...');
  await resetDatabase();
  db = getDatabase({ client: 'sqlite', sqlitePath: ':memory:', setAsGlobal: true });
  setDatabase(db);
  await runMigrations(db, { reset: true });
  await runSeed(db, { clean: true, seedAll52: true });
  console.log('[Setup] Database migrations and demo seeds successfully loaded.');

  // Instantiate clean express app for testing
  const app = createApp({ db });
  server = app.listen(0);
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
  console.log(`[Setup] Test server running on ${baseUrl}\n`);
}

async function teardown() {
  console.log('\n[Teardown] Shutting down test server and closing database...');
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  if (db) {
    await db.close();
  }
  await resetDatabase();
  console.log('[Teardown] Clean shutdown completed.');
  console.log(`\nResults: ${passCount} Passed, ${failCount} Failed.`);
  if (failCount > 0) {

    process.exit(1);
  }
}

async function runAllTests() {
  await setup();

  let user1Token = '';
  let user1BrandId = '';
  let user2Token = '';
  let user2BrandId = '';

  // --------------------------------------------------------------------------
  // 1. System Health
  // --------------------------------------------------------------------------
  await test('SYS-01: Health check endpoint returns HTTP 200', async () => {
    const res = await request('/api/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'ok');
  });

  // --------------------------------------------------------------------------
  // 2. Authentication Journey
  // --------------------------------------------------------------------------
  await test('AUTH-01: User registration creates merchant with 50 starter credits and JWT', async () => {
    const res = await request('/api/auth/register', {
      method: 'POST',
      body: {
        name: 'Alice Merchant',
        email: 'alice@merchant.test',
        password: 'Password123!'
      }
    });

    assert.strictEqual(res.status, 201, `Expected 201 Created, got ${res.status}`);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.token, 'Token must be returned');
    assert.strictEqual(res.body.user.name, 'Alice Merchant');
    assert.strictEqual(res.body.user.email, 'alice@merchant.test');
    assert.strictEqual(res.body.user.role, 'merchant');
    assert.strictEqual(res.body.user.credits, 50, 'Starter credits must be 50');
    assert.strictEqual(res.body.user.password, undefined, 'Password must never be in response');
    assert.strictEqual(res.body.user.password_hash, undefined, 'Password hash must never be in response');

    user1Token = res.body.token;
  });

  await test('AUTH-02: Duplicate email registration returns HTTP 409 Conflict', async () => {
    const res = await request('/api/auth/register', {
      method: 'POST',
      body: {
        name: 'Alice Duplicate',
        email: 'alice@merchant.test',
        password: 'Password123!'
      }
    });

    assert.strictEqual(res.status, 409);
    assert.strictEqual(res.body.success, false);
  });

  await test('AUTH-03: Weak password registration returns HTTP 400 Bad Request', async () => {
    const res = await request('/api/auth/register', {
      method: 'POST',
      body: {
        name: 'Weak Password User',
        email: 'weak@merchant.test',
        password: '123'
      }
    });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
  });

  await test('AUTH-04: Valid login returns HTTP 200 and JWT', async () => {
    const res = await request('/api/auth/login', {
      method: 'POST',
      body: {
        email: 'alice@merchant.test',
        password: 'Password123!'
      }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.token);
    assert.strictEqual(res.body.user.email, 'alice@merchant.test');
  });

  await test('AUTH-05: Login with wrong password returns HTTP 401 Unauthorized', async () => {
    const res = await request('/api/auth/login', {
      method: 'POST',
      body: {
        email: 'alice@merchant.test',
        password: 'WrongPassword999!'
      }
    });

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
  });

  await test('AUTH-06: Login with non-existent email returns generic HTTP 401 Unauthorized', async () => {
    const res = await request('/api/auth/login', {
      method: 'POST',
      body: {
        email: 'nonexistent@merchant.test',
        password: 'Password123!'
      }
    });

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
  });

  await test('AUTH-07: Authenticated GET /api/auth/me returns current user profile', async () => {
    const res = await request('/api/auth/me', {
      headers: {
        Authorization: `Bearer ${user1Token}`
      }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.user.email, 'alice@merchant.test');
    assert.strictEqual(res.body.user.credits, 50);
  });

  await test('AUTH-08: Unauthenticated GET /api/auth/me returns HTTP 401', async () => {
    const res = await request('/api/auth/me');
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
  });

  await test('AUTH-09: Tampered JWT to /api/auth/me returns HTTP 401', async () => {
    const res = await request('/api/auth/me', {
      headers: {
        Authorization: 'Bearer invalid.tampered.token'
      }
    });

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
  });

  // --------------------------------------------------------------------------
  // 3. Brand Management & Multi-Tenant Setup
  // --------------------------------------------------------------------------
  await test('BRAND-01: User 1 creates Brand A with cryptographically secure credentials', async () => {
    const res = await request('/api/brands', {
      method: 'POST',
      headers: { Authorization: `Bearer ${user1Token}` },
      body: {
        brand_name: 'Alice Electronics',
        brand_slug: 'alice-electronics'
      }
    });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.brand.id);
    assert.ok(res.body.brand.api_key.startsWith('dn_live_'));
    assert.strictEqual(res.body.brand.api_secret.length, 64, 'API secret must be 64 hex chars');
    assert.strictEqual(res.body.brand.webhook_secret.length, 64, 'Webhook secret must be 64 hex chars');

    user1BrandId = res.body.brand.id;
  });

  await test('BRAND-02: Register User 2 and create Brand B', async () => {
    const regRes = await request('/api/auth/register', {
      method: 'POST',
      body: {
        name: 'Bob Merchant',
        email: 'bob@merchant.test',
        password: 'Password123!'
      }
    });
    assert.strictEqual(regRes.status, 201);
    user2Token = regRes.body.token;

    const brandRes = await request('/api/brands', {
      method: 'POST',
      headers: { Authorization: `Bearer ${user2Token}` },
      body: {
        brand_name: 'Bob Fashion',
        brand_slug: 'bob-fashion'
      }
    });
    assert.strictEqual(brandRes.status, 201);
    user2BrandId = brandRes.body.brand.id;

    assert.notStrictEqual(user1BrandId, user2BrandId, 'Brand IDs must be unique');
  });

  await test('BRAND-03: Brand listing isolates brands per user', async () => {
    const resUser1 = await request('/api/brands', {
      headers: { Authorization: `Bearer ${user1Token}` }
    });
    assert.strictEqual(resUser1.status, 200);
    const brands1 = resUser1.body.brands;
    assert.ok(brands1.some((b) => b.id === user1BrandId));
    assert.strictEqual(brands1.some((b) => b.id === user2BrandId), false, 'User 1 must not see User 2 brands');

    const resUser2 = await request('/api/brands', {
      headers: { Authorization: `Bearer ${user2Token}` }
    });
    assert.strictEqual(resUser2.status, 200);
    const brands2 = resUser2.body.brands;
    assert.ok(brands2.some((b) => b.id === user2BrandId));
    assert.strictEqual(brands2.some((b) => b.id === user1BrandId), false, 'User 2 must not see User 1 brands');
  });

  await test('BRAND-04: GET /api/brands/:id returns brand details with masked secrets', async () => {
    const res = await request(`/api/brands/${user1BrandId}`, {
      headers: { Authorization: `Bearer ${user1Token}` }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.brand.id, user1BrandId);
    assert.strictEqual(res.body.brand.api_secret, undefined, 'Raw api_secret must not be returned');
    assert.ok(res.body.brand.api_secret_masked.startsWith('dn_sec_••••'));
    assert.ok(res.body.brand.webhook_secret_masked.startsWith('whsec_••••'));
  });

  await test('BRAND-05: POST /api/brands/:id/rotate-secrets successfully rotates credentials for owner', async () => {
    const res = await request(`/api/brands/${user1BrandId}/rotate-secrets`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${user1Token}` },
      body: { rotate_api_secret: true, rotate_webhook_secret: true }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.rotated.api_secret);
    assert.strictEqual(res.body.rotated.api_secret.length, 64);
    assert.ok(res.body.rotated.webhook_secret);
    assert.strictEqual(res.body.rotated.webhook_secret.length, 64);
  });

  await test('BRAND-06: Cross-tenant secret rotation attempt is rejected with HTTP 403', async () => {
    const res = await request(`/api/brands/${user1BrandId}/rotate-secrets`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${user2Token}` },
      body: { rotate_api_secret: true }
    });

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.success, false);
  });

  // --------------------------------------------------------------------------
  // 4. SEC-TEST-01: Unauthenticated IDOR Rejection on /api/dashboard/stats
  // --------------------------------------------------------------------------
  await test('SEC-TEST-01-A: Unauthenticated GET /api/dashboard/stats returns HTTP 401', async () => {
    const res = await request('/api/dashboard/stats');
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
  });

  await test('SEC-TEST-01-B: Unauthenticated query injection ?brandId=b101_deshi_course returns HTTP 401', async () => {
    const res = await request('/api/dashboard/stats?brandId=b101_deshi_course');
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
    // Ensure no credentials or brand objects are disclosed
    assert.strictEqual(res.rawText.includes('dn_live_'), false);
    assert.strictEqual(res.rawText.includes('dn_sec_'), false);
  });

  await test('SEC-TEST-01-C: Unauthenticated header injection x-brand-id returns HTTP 401', async () => {
    const res = await request('/api/dashboard/stats', {
      headers: { 'x-brand-id': 'b101_deshi_course' }
    });
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
  });

  // --------------------------------------------------------------------------
  // 5. SEC-TEST-02: Cross-Tenant IDOR Defense on /api/dashboard/stats
  // --------------------------------------------------------------------------
  await test('SEC-TEST-02-A: User 1 cannot access User 2 brand stats via x-brand-id (HTTP 403)', async () => {
    const res = await request('/api/dashboard/stats', {
      headers: {
        Authorization: `Bearer ${user1Token}`,
        'x-brand-id': user2BrandId
      }
    });

    assert.strictEqual(res.status, 403, `Expected 403 Forbidden, got ${res.status}`);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.brand, undefined);
    assert.strictEqual(res.body.metrics, undefined);
  });

  await test('SEC-TEST-02-B: User 1 cannot access User 2 brand stats via query ?brandId= (HTTP 403)', async () => {
    const res = await request(`/api/dashboard/stats?brandId=${user2BrandId}`, {
      headers: {
        Authorization: `Bearer ${user1Token}`
      }
    });

    assert.strictEqual(res.status, 403, `Expected 403 Forbidden, got ${res.status}`);
    assert.strictEqual(res.body.success, false);
  });

  await test('SEC-TEST-02-C: User 1 cannot access seed demo brand b101_deshi_course (HTTP 403)', async () => {
    const res = await request('/api/dashboard/stats', {
      headers: {
        Authorization: `Bearer ${user1Token}`,
        'x-brand-id': 'b101_deshi_course'
      }
    });

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.success, false);
  });

  // --------------------------------------------------------------------------
  // 6. Authorized Stats & Zero-Secret Projection
  // --------------------------------------------------------------------------
  await test('STATS-01: User 1 successfully accesses their own brand stats (HTTP 200)', async () => {
    const res = await request('/api/dashboard/stats', {
      headers: {
        Authorization: `Bearer ${user1Token}`,
        'x-brand-id': user1BrandId
      }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.brand.id, user1BrandId);
    assert.ok(res.body.metrics, 'Metrics object must be provided');
    assert.ok(Array.isArray(res.body.recent_invoices));
    assert.ok(Array.isArray(res.body.devices));
    assert.ok(Array.isArray(res.body.gateways));
  });

  await test('ZERO-SEC-01: Zero-Secret Projection strictly enforces absence of secrets', async () => {
    const res = await request('/api/dashboard/stats', {
      headers: {
        Authorization: `Bearer ${user1Token}`,
        'x-brand-id': user1BrandId
      }
    });

    assert.strictEqual(res.status, 200);

    // 1. Explicit property absence checks on brand object
    assert.strictEqual(res.body.brand.api_secret, undefined, 'api_secret must be omitted');
    assert.strictEqual(res.body.brand.webhook_secret, undefined, 'webhook_secret must be omitted');
    assert.strictEqual(res.body.brand.api_secret_hash, undefined, 'api_secret_hash must be omitted');
    assert.strictEqual(res.body.brand.webhook_secret_hash, undefined, 'webhook_secret_hash must be omitted');

    // 2. Explicit absence on devices
    for (const dev of res.body.devices) {
      assert.strictEqual(dev.device_token, undefined, 'device_token must be omitted from devices list');
    }

    // 3. String scan across the entire response body
    const rawJson = JSON.stringify(res.body);
    assert.strictEqual(/api_secret/i.test(rawJson), false, 'api_secret must not appear anywhere in payload');
    assert.strictEqual(/webhook_secret/i.test(rawJson), false, 'webhook_secret must not appear anywhere in payload');
    assert.strictEqual(/password_hash/i.test(rawJson), false, 'password_hash must not appear anywhere in payload');
  });

  // --------------------------------------------------------------------------
  // 7. Defensive Security Middlewares (Helmet, CORS, Body Limits)
  // --------------------------------------------------------------------------
  await test('SEC-MID-01: Helmet security headers are present on API responses', async () => {
    const res = await request('/api/health');
    assert.strictEqual(res.headers.get('x-content-type-options'), 'nosniff');
    assert.ok(res.headers.get('x-frame-options'), 'X-Frame-Options must be set');
  });

  await test('SEC-MID-02: Payloads larger than 100KB are rejected with HTTP 413', async () => {
    const largeString = 'x'.repeat(105 * 1024); // 105 KB
    const res = await request('/api/auth/login', {
      method: 'POST',
      body: {
        email: 'test@test.com',
        password: 'Password123!',
        padding: largeString
      }
    });

    assert.strictEqual(res.status, 413, `Expected 413 Payload Too Large, got ${res.status}`);
  });

  await test('SEC-MID-03: Unauthorized CORS Origin is rejected with HTTP 403', async () => {
    const res = await request('/api/health', {
      headers: {
        Origin: 'https://evil-attacker.malicious.com'
      }
    });

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.code, 'CORS_FORBIDDEN');
  });

  await test('SEC-MID-04: Authorized CORS Origin receives Access-Control-Allow-Origin', async () => {
    const res = await request('/api/health', {
      headers: {
        Origin: 'http://localhost:3000'
      }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('access-control-allow-origin'), 'http://localhost:3000');
  });

  await test('SEC-MID-05: Input sanitization escapes XSS HTML entities in input fields', async () => {
    const res = await request('/api/auth/register', {
      method: 'POST',
      body: {
        name: '<script>alert("xss")</script>',
        email: 'xss-tester@merchant.test',
        password: 'Password123!'
      }
    });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    // Verified that angle brackets and quotes were converted to entities
    assert.ok(!res.body.user.name.includes('<script>'), 'Unescaped script tag must not exist');
    assert.ok(res.body.user.name.includes('&lt;script&gt;'), 'Must be escaped to HTML entities');
  });
}

runAllTests()
  .catch((err) => {
    console.error('Master test runner encountered fatal error:');
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await teardown();
  });
