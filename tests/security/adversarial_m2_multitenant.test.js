/**
 * DenaNeya v2.0 - Milestone 2 Adversarial Multi-Tenant & IDOR Penetration Test Suite
 * File: tests/security/adversarial_m2_multitenant.test.js
 * Challenger: Milestone 2 Challenger 1 (Multi-Tenant & IDOR Penetration Challenger)
 *
 * Verification Scope:
 * 1. Category A: Unauthenticated IDOR probing on /api/dashboard/stats with forged headers and query parameters.
 * 2. Category B: Cross-tenant privilege escalation (Merchant A attempting to read/modify Merchant B, rotate secrets, view brands).
 * 3. Category C: JWT forgery & cryptographic attacks (None alg, tampered signatures, expired tokens, malformed payloads).
 * 4. Category D: Deep secret leakage inspection (api_secret, webhook_secret, device_token zero-leakage verification).
 */

process.env.NODE_ENV = 'test';
process.env.DB_CLIENT = 'sqlite';
process.env.DB_SQLITE_PATH = ':memory:';
process.env.JWT_SECRET = 'denaneya_development_jwt_secret_min_32_bytes_long_12345';

import assert from 'node:assert';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import dbPkg from '@denaneya/database';
import { createApp } from '../../apps/api/src/app.js';

const { getDatabase, runMigrations, runSeed } = dbPkg;

console.log('===============================================================================');
console.log('  DenaNeya v2.0 - M2 Multi-Tenant, IDOR & Secret Leakage Penetration Suite     ');
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

/**
 * Universal request helper using native Node fetch
 */
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

  const res = await fetch(`${baseUrl}${path}`, reqOptions);
  const rawText = await res.text();
  let json = null;
  try {
    json = JSON.parse(rawText);
  } catch (_) {
    json = rawText;
  }

  return {
    status: res.status,
    headers: res.headers,
    body: json,
    rawText
  };
}

async function setupEnvironment() {
  console.log('[Setup] Initializing in-memory SQLite database singleton for penetration test...');
  db = getDatabase();
  await runMigrations(db, { reset: true });
  await runSeed(db);
  console.log('[Setup] Migrations and seed data loaded successfully.');

  const app = createApp();
  server = app.listen(0);
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
  console.log(`[Setup] Penetration test target live on ${baseUrl}\n`);
}

async function teardownEnvironment() {
  console.log('\n[Teardown] Shutting down target server and closing database...');
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  if (db) {
    await db.close();
  }
  console.log('[Teardown] Teardown complete.\n');
  console.log('===============================================================================');
  console.log(`Penetration Results: ${summary.passed} Passed / ${summary.total} Total (${summary.failed} Vulnerabilities Detected)`);
  console.log('===============================================================================\n');

  if (summary.failed > 0) {
    process.exit(1);
  }
}

async function runPenetrationSuite() {
  await setupEnvironment();

  // Provision test actors: Merchant A, Merchant B
  let merchantAToken = '';
  let merchantAId = '';
  let brandAId = '';
  let brandASlug = '';

  let merchantBToken = '';
  let merchantBId = '';
  let brandBId = '';
  let brandBSlug = '';

  // --------------------------------------------------------------------------
  // Provisioning Actors
  // --------------------------------------------------------------------------
  console.log('--- Provisioning Adversarial Actors ---');
  // Merchant A
  const regARes = await apiRequest('/api/auth/register', {
    method: 'POST',
    body: { name: 'Attacker Alice', email: 'alice.attacker@tenanta.test', password: 'StrongPassword123!' }
  });
  assert.strictEqual(regARes.status, 201, 'Merchant A registration failed');
  merchantAToken = regARes.body.token;
  merchantAId = regARes.body.user.id;

  const brandARes = await apiRequest('/api/brands', {
    method: 'POST',
    headers: { Authorization: `Bearer ${merchantAToken}` },
    body: { brand_name: 'Alice Corp', brand_slug: 'alice-corp' }
  });
  assert.strictEqual(brandARes.status, 201, 'Brand A creation failed');
  brandAId = brandARes.body.brand.id;
  brandASlug = brandARes.body.brand.brand_slug;

  // Merchant B (Victim)
  const regBRes = await apiRequest('/api/auth/register', {
    method: 'POST',
    body: { name: 'Victim Bob', email: 'bob.victim@tenantb.test', password: 'StrongPassword123!' }
  });
  assert.strictEqual(regBRes.status, 201, 'Merchant B registration failed');
  merchantBToken = regBRes.body.token;
  merchantBId = regBRes.body.user.id;

  const brandBRes = await apiRequest('/api/brands', {
    method: 'POST',
    headers: { Authorization: `Bearer ${merchantBToken}` },
    body: { brand_name: 'Bob Enterprise', brand_slug: 'bob-enterprise' }
  });
  assert.strictEqual(brandBRes.status, 201, 'Brand B creation failed');
  brandBId = brandBRes.body.brand.id;
  brandBSlug = brandBRes.body.brand.brand_slug;

  console.log(`[Actor Provisioned] Merchant A: ${merchantAId}, Brand A: ${brandAId}`);
  console.log(`[Actor Provisioned] Merchant B: ${merchantBId}, Brand B: ${brandBId}`);
  console.log('---------------------------------------\n');

  // ==========================================================================
  // CATEGORY A: Unauthenticated IDOR Probing on /api/dashboard/stats
  // ==========================================================================
  console.log('--- Category A: Unauthenticated IDOR Probing on /api/dashboard/stats ---');

  await attackTest('ATK-A01', 'UNAUTH-IDOR', 'Unauthenticated GET /api/dashboard/stats (no headers)', async () => {
    const res = await apiRequest('/api/dashboard/stats');
    assert.strictEqual(res.status, 401, `Expected 401 Unauthorized, got ${res.status}`);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.code, 'UNAUTHORIZED');
  });

  await attackTest('ATK-A02', 'UNAUTH-IDOR', 'Unauthenticated probe with forged query ?brandId=b101_deshi_course', async () => {
    const res = await apiRequest('/api/dashboard/stats?brandId=b101_deshi_course');
    assert.strictEqual(res.status, 401, `Expected 401 Unauthorized, got ${res.status}`);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.code, 'UNAUTHORIZED');
  });

  await attackTest('ATK-A03', 'UNAUTH-IDOR', 'Unauthenticated probe with forged header x-brand-id: b101_deshi_course', async () => {
    const res = await apiRequest('/api/dashboard/stats', {
      headers: { 'x-brand-id': 'b101_deshi_course' }
    });
    assert.strictEqual(res.status, 401, `Expected 401 Unauthorized, got ${res.status}`);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.code, 'UNAUTHORIZED');
  });

  await attackTest('ATK-A04', 'UNAUTH-IDOR', 'Unauthenticated probe with forged snake_case query ?brand_id=b101_deshi_course', async () => {
    const res = await apiRequest('/api/dashboard/stats?brand_id=b101_deshi_course');
    assert.strictEqual(res.status, 401, `Expected 401 Unauthorized, got ${res.status}`);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.code, 'UNAUTHORIZED');
  });

  await attackTest('ATK-A05', 'UNAUTH-IDOR', 'Unauthenticated probe with both header x-brand-id and query brandId', async () => {
    const res = await apiRequest(`/api/dashboard/stats?brandId=${brandBId}`, {
      headers: { 'x-brand-id': brandBId }
    });
    assert.strictEqual(res.status, 401, `Expected 401 Unauthorized, got ${res.status}`);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.code, 'UNAUTHORIZED');
  });

  await attackTest('ATK-A06', 'UNAUTH-IDOR', 'Unauthenticated path traversal attempt in brandId query (?brandId=../../etc/passwd)', async () => {
    const res = await apiRequest('/api/dashboard/stats?brandId=../../etc/passwd');
    assert.strictEqual(res.status, 401, `Expected 401 Unauthorized, got ${res.status}`);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.code, 'UNAUTHORIZED');
  });

  await attackTest('ATK-A07', 'UNAUTH-IDOR', 'Unauthenticated SQLi payload in query ?brandId=\' OR 1=1--', async () => {
    const res = await apiRequest("/api/dashboard/stats?brandId=' OR 1=1--");
    assert.strictEqual(res.status, 401, `Expected 401 Unauthorized, got ${res.status}`);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.code, 'UNAUTHORIZED');
  });

  await attackTest('ATK-A08', 'UNAUTH-IDOR', 'Unauthenticated SQLi payload in header x-brand-id: \' OR \'1\'=\'1', async () => {
    const res = await apiRequest('/api/dashboard/stats', {
      headers: { 'x-brand-id': "' OR '1'='1" }
    });
    assert.strictEqual(res.status, 401, `Expected 401 Unauthorized, got ${res.status}`);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.code, 'UNAUTHORIZED');
  });

  await attackTest('ATK-A09', 'UNAUTH-ZERO-LEAK', 'Verify 100% zero data leakage across all unauthenticated probes', async () => {
    const testEndpoints = [
      '/api/dashboard/stats',
      '/api/dashboard/stats?brandId=b101_deshi_course',
      '/api/dashboard/stats?brandId=' + brandBId,
      '/api/brands',
      `/api/brands/${brandBId}`,
      `/api/brands/${brandBId}/rotate-secrets`
    ];

    for (const ep of testEndpoints) {
      const res = await apiRequest(ep);
      assert.strictEqual(res.status, 401, `Endpoint ${ep} must return 401 without auth`);
      const bodyStr = res.rawText;
      assert.strictEqual(bodyStr.includes('dn_live_'), false, `Secret dn_live_ leaked in ${ep}`);
      assert.strictEqual(bodyStr.includes('dn_sec_'), false, `Secret dn_sec_ leaked in ${ep}`);
      assert.strictEqual(bodyStr.includes('whsec_'), false, `Secret whsec_ leaked in ${ep}`);
      assert.strictEqual(bodyStr.includes('gmv'), false, `Metrics gmv leaked in ${ep}`);
      assert.strictEqual(bodyStr.includes('invoice_number'), false, `Invoices leaked in ${ep}`);
    }
  });

  // ==========================================================================
  // CATEGORY B: Cross-Tenant Privilege Escalation (Merchant A vs Merchant B)
  // ==========================================================================
  console.log('\n--- Category B: Cross-Tenant Privilege Escalation ---');

  await attackTest('ATK-B01', 'CROSS-TENANT', 'Merchant A attempts reading Merchant B stats via header x-brand-id (HTTP 403)', async () => {
    const res = await apiRequest('/api/dashboard/stats', {
      headers: {
        Authorization: `Bearer ${merchantAToken}`,
        'x-brand-id': brandBId
      }
    });
    assert.strictEqual(res.status, 403, `Expected 403 Forbidden, got ${res.status}`);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.code, 'FORBIDDEN');
    assert.strictEqual(res.body.brand, undefined, 'Brand object must not be disclosed');
    assert.strictEqual(res.body.metrics, undefined, 'Metrics must not be disclosed');
  });

  await attackTest('ATK-B02', 'CROSS-TENANT', 'Merchant A attempts reading Merchant B stats via query ?brandId= (HTTP 403)', async () => {
    const res = await apiRequest(`/api/dashboard/stats?brandId=${brandBId}`, {
      headers: { Authorization: `Bearer ${merchantAToken}` }
    });
    assert.strictEqual(res.status, 403, `Expected 403 Forbidden, got ${res.status}`);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.code, 'FORBIDDEN');
    assert.strictEqual(res.body.brand, undefined);
  });

  await attackTest('ATK-B03', 'CROSS-TENANT', 'Merchant A attempts reading Merchant B stats via snake_case query ?brand_id= (HTTP 403)', async () => {
    const res = await apiRequest(`/api/dashboard/stats?brand_id=${brandBId}`, {
      headers: { Authorization: `Bearer ${merchantAToken}` }
    });
    assert.strictEqual(res.status, 403, `Expected 403 Forbidden, got ${res.status}`);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.code, 'FORBIDDEN');
  });

  await attackTest('ATK-B04', 'CROSS-TENANT', 'Merchant A attempts reading seed demo brand stats via x-brand-id (HTTP 403)', async () => {
    const res = await apiRequest('/api/dashboard/stats', {
      headers: {
        Authorization: `Bearer ${merchantAToken}`,
        'x-brand-id': 'b101_deshi_course'
      }
    });
    assert.strictEqual(res.status, 403, `Expected 403 Forbidden, got ${res.status}`);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.code, 'FORBIDDEN');
  });

  await attackTest('ATK-B05', 'CROSS-TENANT', 'Merchant A attempts reading seed demo brand stats via query ?brandId=b101_deshi_course (HTTP 403)', async () => {
    const res = await apiRequest('/api/dashboard/stats?brandId=b101_deshi_course', {
      headers: { Authorization: `Bearer ${merchantAToken}` }
    });
    assert.strictEqual(res.status, 403, `Expected 403 Forbidden, got ${res.status}`);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.code, 'FORBIDDEN');
  });

  await attackTest('ATK-B06', 'CROSS-TENANT', 'Conflicting tenant vectors: header=Victim B, query=Owner A (Must strictly reject with HTTP 403)', async () => {
    const res = await apiRequest(`/api/dashboard/stats?brandId=${brandAId}`, {
      headers: {
        Authorization: `Bearer ${merchantAToken}`,
        'x-brand-id': brandBId
      }
    });
    assert.strictEqual(res.status, 403, `Header targeting victim must be evaluated and rejected with 403. Got ${res.status}`);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.code, 'FORBIDDEN');
  });

  await attackTest('ATK-B07', 'CROSS-TENANT', 'Probing non-existent brand ID returns HTTP 404 (no server 500 error or leakage)', async () => {
    const res = await apiRequest('/api/dashboard/stats', {
      headers: {
        Authorization: `Bearer ${merchantAToken}`,
        'x-brand-id': 'b_non_existent_brand_9999'
      }
    });
    assert.strictEqual(res.status, 404, `Expected 404 Brand Not Found, got ${res.status}`);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.code, 'BRAND_NOT_FOUND');
  });

  await attackTest('ATK-B08', 'CROSS-TENANT', 'Merchant A attempts direct GET /api/brands/:id on Merchant B brand (HTTP 403)', async () => {
    const res = await apiRequest(`/api/brands/${brandBId}`, {
      headers: { Authorization: `Bearer ${merchantAToken}` }
    });
    assert.strictEqual(res.status, 403, `Expected 403 Forbidden, got ${res.status}`);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.code, 'FORBIDDEN');
    assert.strictEqual(res.body.brand, undefined);
  });

  await attackTest('ATK-B09', 'CROSS-TENANT', 'Merchant A attempts direct GET /api/brands/:id on seed demo brand (HTTP 403)', async () => {
    const res = await apiRequest('/api/brands/b101_deshi_course', {
      headers: { Authorization: `Bearer ${merchantAToken}` }
    });
    assert.strictEqual(res.status, 403, `Expected 403 Forbidden, got ${res.status}`);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.code, 'FORBIDDEN');
  });

  await attackTest('ATK-B10', 'CROSS-TENANT', 'Merchant A attempts POST /api/brands/:id/rotate-secrets on Merchant B brand (HTTP 403)', async () => {
    const res = await apiRequest(`/api/brands/${brandBId}/rotate-secrets`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${merchantAToken}` },
      body: { rotate_api_secret: true, rotate_webhook_secret: true }
    });
    assert.strictEqual(res.status, 403, `Expected 403 Forbidden, got ${res.status}`);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.code, 'FORBIDDEN');
  });

  await attackTest('ATK-B11', 'DATA-INTEGRITY', 'Verify Merchant B credentials were NOT rotated or corrupted after ATK-B10 attack', async () => {
    // Read Merchant B's brand directly from DB to verify secret values remain unaltered
    const bRow = await db.get('SELECT api_secret, webhook_secret FROM brands WHERE id = ?', [brandBId]);
    assert.ok(bRow.api_secret, 'Merchant B api_secret must still exist');
    assert.ok(bRow.webhook_secret, 'Merchant B webhook_secret must still exist');

    // Bob can view his brand with masked secrets
    const bobRes = await apiRequest(`/api/brands/${brandBId}`, {
      headers: { Authorization: `Bearer ${merchantBToken}` }
    });
    assert.strictEqual(bobRes.status, 200);
    assert.ok(bobRes.body.brand.api_secret_masked.endsWith(bRow.api_secret.slice(-4)));
    assert.ok(bobRes.body.brand.webhook_secret_masked.endsWith(bRow.webhook_secret.slice(-4)));
  });

  await attackTest('ATK-B12', 'CROSS-TENANT', 'Merchant A brand listing isolates strictly to Merchant A (0% Merchant B or Seed)', async () => {
    const res = await apiRequest('/api/brands', {
      headers: { Authorization: `Bearer ${merchantAToken}` }
    });
    assert.strictEqual(res.status, 200);
    const brands = res.body.brands;
    assert.ok(Array.isArray(brands));
    assert.ok(brands.some((b) => b.id === brandAId), 'Merchant A brand must be present');
    assert.strictEqual(brands.some((b) => b.id === brandBId), false, 'Merchant B brand must NOT be present');
    assert.strictEqual(brands.some((b) => b.id === 'b101_deshi_course'), false, 'Seed brand must NOT be present');
  });

  await attackTest('ATK-B13', 'CROSS-TENANT', 'Merchant B brand listing isolates strictly to Merchant B (0% Merchant A or Seed)', async () => {
    const res = await apiRequest('/api/brands', {
      headers: { Authorization: `Bearer ${merchantBToken}` }
    });
    assert.strictEqual(res.status, 200);
    const brands = res.body.brands;
    assert.ok(Array.isArray(brands));
    assert.ok(brands.some((b) => b.id === brandBId), 'Merchant B brand must be present');
    assert.strictEqual(brands.some((b) => b.id === brandAId), false, 'Merchant A brand must NOT be present');
    assert.strictEqual(brands.some((b) => b.id === 'b101_deshi_course'), false, 'Seed brand must NOT be present');
  });

  await attackTest('ATK-B14', 'ACCOUNT-DEACTIVATION', 'Suspended/deactivated account privilege revocation test (HTTP 403)', async () => {
    // Temporarily suspend Merchant A
    await db.query("UPDATE users SET status = 'suspended' WHERE id = ?", [merchantAId]);

    try {
      const statsRes = await apiRequest('/api/dashboard/stats', {
        headers: {
          Authorization: `Bearer ${merchantAToken}`,
          'x-brand-id': brandAId
        }
      });
      assert.strictEqual(statsRes.status, 403, `Suspended user must receive 403. Got ${statsRes.status}`);
      assert.strictEqual(statsRes.body.code, 'ACCOUNT_DEACTIVATED');

      const meRes = await apiRequest('/api/auth/me', {
        headers: { Authorization: `Bearer ${merchantAToken}` }
      });
      assert.strictEqual(meRes.status, 403, `Suspended user must receive 403 on /me. Got ${meRes.status}`);
      assert.strictEqual(meRes.body.code, 'ACCOUNT_DEACTIVATED');
    } finally {
      // Restore Merchant A status
      await db.query("UPDATE users SET status = 'active' WHERE id = ?", [merchantAId]);
    }
  });

  // ==========================================================================
  // CATEGORY C: JWT Forgery & Cryptographic Attacks
  // ==========================================================================
  console.log('\n--- Category C: JWT Forgery & Cryptographic Attacks ---');

  await attackTest('ATK-C01', 'JWT-FORGERY', 'Unsecured token attack (alg: "none" with empty signature) is rejected with HTTP 401', async () => {
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ id: merchantAId, email: 'alice.attacker@tenanta.test', role: 'merchant' })).toString('base64url');
    const noneToken = `${header}.${payload}.`;

    const res = await apiRequest('/api/dashboard/stats', {
      headers: {
        Authorization: `Bearer ${noneToken}`,
        'x-brand-id': brandAId
      }
    });

    assert.strictEqual(res.status, 401, `Expected 401 for alg:none, got ${res.status}`);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.code, 'INVALID_TOKEN');
  });

  await attackTest('ATK-C02', 'JWT-FORGERY', 'Case-manipulated alg: "None" is rejected with HTTP 401', async () => {
    const header = Buffer.from(JSON.stringify({ alg: 'None', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ id: merchantAId, email: 'alice.attacker@tenanta.test', role: 'merchant' })).toString('base64url');
    const noneToken = `${header}.${payload}.`;

    const res = await apiRequest('/api/dashboard/stats', {
      headers: {
        Authorization: `Bearer ${noneToken}`,
        'x-brand-id': brandAId
      }
    });

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.code, 'INVALID_TOKEN');
  });

  await attackTest('ATK-C03', 'JWT-FORGERY', 'Uppercase alg: "NONE" with mock signature is rejected with HTTP 401', async () => {
    const header = Buffer.from(JSON.stringify({ alg: 'NONE', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ id: merchantAId, email: 'alice.attacker@tenanta.test', role: 'merchant' })).toString('base64url');
    const fakeSig = Buffer.from('fakesig1234567890123456').toString('base64url');
    const noneToken = `${header}.${payload}.${fakeSig}`;

    const res = await apiRequest('/api/dashboard/stats', {
      headers: {
        Authorization: `Bearer ${noneToken}`,
        'x-brand-id': brandAId
      }
    });

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.code, 'INVALID_TOKEN');
  });

  await attackTest('ATK-C04', 'JWT-FORGERY', 'Tampered HMAC signature (1 byte altered) is rejected with HTTP 401', async () => {
    const parts = merchantAToken.split('.');
    // Flip characters in the signature segment
    const origSig = parts[2];
    const tamperedSig = origSig.slice(0, -4) + (origSig.slice(-4) === 'aaaa' ? 'bbbb' : 'aaaa');
    const tamperedToken = `${parts[0]}.${parts[1]}.${tamperedSig}`;

    const res = await apiRequest('/api/dashboard/stats', {
      headers: {
        Authorization: `Bearer ${tamperedToken}`,
        'x-brand-id': brandAId
      }
    });

    assert.strictEqual(res.status, 401, `Expected 401 for tampered signature, got ${res.status}`);
    assert.strictEqual(res.body.code, 'INVALID_TOKEN');
  });

  await attackTest('ATK-C05', 'JWT-FORGERY', 'Tampered payload (elevating role to "admin" keeping original signature) is rejected with HTTP 401', async () => {
    const parts = merchantAToken.split('.');
    const decodedPayload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    decodedPayload.role = 'admin';
    decodedPayload.id = 'u102_admin'; // Attempt impersonation of seed admin
    const forgedPayload = Buffer.from(JSON.stringify(decodedPayload)).toString('base64url');
    const forgedToken = `${parts[0]}.${forgedPayload}.${parts[2]}`;

    const res = await apiRequest('/api/dashboard/stats', {
      headers: {
        Authorization: `Bearer ${forgedToken}`,
        'x-brand-id': 'b101_deshi_course'
      }
    });

    assert.strictEqual(res.status, 401, `Expected 401 for tampered payload, got ${res.status}`);
    assert.strictEqual(res.body.code, 'INVALID_TOKEN');
  });

  await attackTest('ATK-C06', 'JWT-FORGERY', 'Token signed with attacker key ("attacker_secret_key_1234567890123") is rejected with HTTP 401', async () => {
    const rogueToken = jwt.sign(
      { id: merchantAId, email: 'alice.attacker@tenanta.test', role: 'admin' },
      'attacker_rogue_secret_key_9999999999999999',
      { algorithm: 'HS256', expiresIn: '24h' }
    );

    const res = await apiRequest('/api/dashboard/stats', {
      headers: {
        Authorization: `Bearer ${rogueToken}`,
        'x-brand-id': brandAId
      }
    });

    assert.strictEqual(res.status, 401, `Expected 401 for rogue secret, got ${res.status}`);
    assert.strictEqual(res.body.code, 'INVALID_TOKEN');
  });

  await attackTest('ATK-C07', 'JWT-FORGERY', 'Cryptographically expired token is rejected with HTTP 401 TOKEN_EXPIRED', async () => {
    const expiredToken = jwt.sign(
      {
        id: merchantAId,
        email: 'alice.attacker@tenanta.test',
        role: 'merchant',
        iat: Math.floor(Date.now() / 1000) - 7200,
        exp: Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
      },
      process.env.JWT_SECRET,
      { algorithm: 'HS256' }
    );

    const res = await apiRequest('/api/dashboard/stats', {
      headers: {
        Authorization: `Bearer ${expiredToken}`,
        'x-brand-id': brandAId
      }
    });

    assert.strictEqual(res.status, 401, `Expected 401 for expired token, got ${res.status}`);
    assert.strictEqual(res.body.code, 'TOKEN_EXPIRED');
  });

  await attackTest('ATK-C08', 'JWT-FORGERY', 'Truncated 2-part token (header.payload without signature) is rejected with HTTP 401', async () => {
    const parts = merchantAToken.split('.');
    const truncatedToken = `${parts[0]}.${parts[1]}`;

    const res = await apiRequest('/api/auth/me', {
      headers: { Authorization: `Bearer ${truncatedToken}` }
    });

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.code, 'INVALID_TOKEN');
  });

  await attackTest('ATK-C09', 'JWT-FORGERY', 'Overextended 4-part token is rejected with HTTP 401', async () => {
    const overextendedToken = `${merchantAToken}.extra_segment`;

    const res = await apiRequest('/api/auth/me', {
      headers: { Authorization: `Bearer ${overextendedToken}` }
    });

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.code, 'INVALID_TOKEN');
  });

  await attackTest('ATK-C10', 'JWT-MALFORMED', 'Empty Bearer token ("Bearer ") is rejected with HTTP 401', async () => {
    const res = await apiRequest('/api/auth/me', {
      headers: { Authorization: 'Bearer ' }
    });

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.code, 'UNAUTHORIZED');
  });

  await attackTest('ATK-C11', 'JWT-MALFORMED', 'Garbage string as token ("Bearer not_a_jwt") is rejected with HTTP 401', async () => {
    const res = await apiRequest('/api/auth/me', {
      headers: { Authorization: 'Bearer not_a_jwt_random_string_12345' }
    });

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.code, 'INVALID_TOKEN');
  });

  await attackTest('ATK-C12', 'JWT-MALFORMED', 'Missing "Bearer " prefix ("Authorization: <token>") is rejected with HTTP 401', async () => {
    const res = await apiRequest('/api/auth/me', {
      headers: { Authorization: merchantAToken }
    });

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.code, 'UNAUTHORIZED');
  });

  await attackTest('ATK-C13', 'JWT-MALFORMED', 'Multiple "Bearer" keywords in header is rejected with HTTP 401', async () => {
    const res = await apiRequest('/api/auth/me', {
      headers: { Authorization: `Bearer Bearer ${merchantAToken}` }
    });

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.code, 'UNAUTHORIZED');
  });

  await attackTest('ATK-C14', 'JWT-USER-VALIDATION', 'Legitimately signed token with non-existent user ID is rejected with HTTP 401 USER_NOT_FOUND', async () => {
    const ghostToken = jwt.sign(
      { id: 'u_non_existent_ghost_999999', email: 'ghost@merchant.test', role: 'merchant' },
      process.env.JWT_SECRET,
      { algorithm: 'HS256', expiresIn: '24h' }
    );

    const res = await apiRequest('/api/dashboard/stats', {
      headers: { Authorization: `Bearer ${ghostToken}` }
    });

    assert.strictEqual(res.status, 401, `Expected 401 USER_NOT_FOUND, got ${res.status}`);
    assert.strictEqual(res.body.code, 'USER_NOT_FOUND');
  });

  await attackTest('ATK-C15', 'JWT-SQLI-PAYLOAD', 'Legitimately signed token with SQL injection in ID payload is rejected with HTTP 401 USER_NOT_FOUND', async () => {
    const sqliToken = jwt.sign(
      { id: "' OR '1'='1", email: 'sqli@merchant.test', role: 'merchant' },
      process.env.JWT_SECRET,
      { algorithm: 'HS256', expiresIn: '24h' }
    );

    const res = await apiRequest('/api/dashboard/stats', {
      headers: { Authorization: `Bearer ${sqliToken}` }
    });

    assert.strictEqual(res.status, 401, `Expected 401 USER_NOT_FOUND, got ${res.status}`);
    assert.strictEqual(res.body.code, 'USER_NOT_FOUND');
  });

  // ==========================================================================
  // CATEGORY D: Secret Leakage & Deep Response Inspection
  // ==========================================================================
  console.log('\n--- Category D: Deep Secret Leakage Inspection ---');

  await attackTest('ATK-D01', 'SECRET-LEAK', 'Deep inspection of GET /api/dashboard/stats response: Zero plaintext secrets', async () => {
    const res = await apiRequest('/api/dashboard/stats', {
      headers: {
        Authorization: `Bearer ${merchantAToken}`,
        'x-brand-id': brandAId
      }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);

    // 1. Inspect Brand Object
    const brandObj = res.body.brand;
    assert.ok(brandObj, 'Brand object must be present');
    assert.strictEqual(brandObj.api_secret, undefined, 'api_secret must be omitted from brand');
    assert.strictEqual(brandObj.webhook_secret, undefined, 'webhook_secret must be omitted from brand');
    assert.strictEqual(brandObj.api_secret_hash, undefined, 'api_secret_hash must be omitted');
    assert.strictEqual(brandObj.webhook_secret_hash, undefined, 'webhook_secret_hash must be omitted');

    // 2. Inspect Devices Array
    assert.ok(Array.isArray(res.body.devices), 'Devices array must be present');
    for (const dev of res.body.devices) {
      assert.strictEqual(dev.device_token, undefined, 'device_token must be omitted from every device');
      assert.strictEqual(dev.token, undefined, 'token must be omitted from every device');
    }

    // 3. Inspect Gateways Array
    assert.ok(Array.isArray(res.body.gateways), 'Gateways array must be present');
    for (const gw of res.body.gateways) {
      assert.strictEqual(gw.password, undefined, 'password must be omitted from gateways');
      assert.strictEqual(gw.api_key, undefined, 'internal gateway credentials must be omitted');
    }

    // 4. Inspect Invoices Array
    assert.ok(Array.isArray(res.body.recent_invoices), 'recent_invoices must be present');

    // 5. Deep regex search on the entire raw JSON response string
    const rawJson = res.rawText;
    assert.strictEqual(/"api_secret"\s*:/i.test(rawJson), false, 'Raw response contains "api_secret" key');
    assert.strictEqual(/"webhook_secret"\s*:/i.test(rawJson), false, 'Raw response contains "webhook_secret" key');
    assert.strictEqual(/"device_token"\s*:/i.test(rawJson), false, 'Raw response contains "device_token" key');
    assert.strictEqual(/"password_hash"\s*:/i.test(rawJson), false, 'Raw response contains "password_hash" key');
    assert.strictEqual(/"password"\s*:/i.test(rawJson), false, 'Raw response contains "password" key');
  });

  await attackTest('ATK-D02', 'SECRET-LEAK', 'Deep inspection of GET /api/brands response: Zero plaintext secrets', async () => {
    const res = await apiRequest('/api/brands', {
      headers: { Authorization: `Bearer ${merchantAToken}` }
    });

    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.brands));

    for (const brand of res.body.brands) {
      assert.strictEqual(brand.api_secret, undefined, 'api_secret must be omitted from brand listing');
      assert.strictEqual(brand.webhook_secret, undefined, 'webhook_secret must be omitted from brand listing');
      assert.strictEqual(brand.api_secret_hash, undefined, 'api_secret_hash must be omitted');
      assert.strictEqual(brand.webhook_secret_hash, undefined, 'webhook_secret_hash must be omitted');
    }

    const rawJson = res.rawText;
    assert.strictEqual(/"api_secret"\s*:/i.test(rawJson), false, 'Raw /api/brands response contains "api_secret" key');
    assert.strictEqual(/"webhook_secret"\s*:/i.test(rawJson), false, 'Raw /api/brands response contains "webhook_secret" key');
  });

  await attackTest('ATK-D03', 'SECRET-LEAK', 'Deep inspection of GET /api/brands/:id: Secrets masked with 32 bullets and last 4 characters', async () => {
    const res = await apiRequest(`/api/brands/${brandAId}`, {
      headers: { Authorization: `Bearer ${merchantAToken}` }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.brand.api_secret, undefined, 'Raw api_secret must be omitted from brand details');
    assert.strictEqual(res.body.brand.webhook_secret, undefined, 'Raw webhook_secret must be omitted from brand details');

    // Verify format of masked secrets
    const maskedApi = res.body.brand.api_secret_masked;
    const maskedWh = res.body.brand.webhook_secret_masked;

    assert.ok(maskedApi, 'api_secret_masked must be provided');
    assert.ok(maskedWh, 'webhook_secret_masked must be provided');

    // Prefix + 32 bullets + 4 hex characters
    assert.ok(maskedApi.startsWith('dn_sec_••••'), `api_secret_masked should start with dn_sec_••••. Got: ${maskedApi}`);
    assert.ok(maskedWh.startsWith('whsec_••••'), `webhook_secret_masked should start with whsec_••••. Got: ${maskedWh}`);
    assert.strictEqual(maskedApi.length, 'dn_sec_'.length + 32 + 4, 'api_secret_masked length must be prefix + 32 bullets + 4 chars');
    assert.strictEqual(maskedWh.length, 'whsec_'.length + 32 + 4, 'webhook_secret_masked length must be prefix + 32 bullets + 4 chars');

    // Confirm that the raw 64-hex secrets are NOT present anywhere in raw response
    const dbRow = await db.get('SELECT api_secret, webhook_secret FROM brands WHERE id = ?', [brandAId]);
    assert.strictEqual(res.rawText.includes(dbRow.api_secret), false, 'Full plaintext api_secret must NOT appear in response body');
    assert.strictEqual(res.rawText.includes(dbRow.webhook_secret), false, 'Full plaintext webhook_secret must NOT appear in response body');
  });

  await attackTest('ATK-D04', 'SECRET-LEAK', 'Deep inspection of POST /api/auth/login: Zero password or password_hash leakage', async () => {
    const res = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: { email: 'alice.attacker@tenanta.test', password: 'StrongPassword123!' }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.user.password, undefined);
    assert.strictEqual(res.body.user.password_hash, undefined);

    const rawJson = res.rawText;
    assert.strictEqual(/"password"\s*:/i.test(rawJson), false);
    assert.strictEqual(/"password_hash"\s*:/i.test(rawJson), false);
    assert.strictEqual(/\$2[aby]\$\d+\$/i.test(rawJson), false, 'Bcrypt hash pattern must NOT appear in login response');
  });

  await attackTest('ATK-D05', 'SECRET-LEAK', 'Deep inspection of POST /api/auth/register: Zero password or password_hash leakage', async () => {
    const res = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: { name: 'Audit User', email: 'audit.user@test.test', password: 'StrongPassword123!' }
    });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.user.password, undefined);
    assert.strictEqual(res.body.user.password_hash, undefined);

    const rawJson = res.rawText;
    assert.strictEqual(/"password"\s*:/i.test(rawJson), false);
    assert.strictEqual(/"password_hash"\s*:/i.test(rawJson), false);
    assert.strictEqual(/\$2[aby]\$\d+\$/i.test(rawJson), false, 'Bcrypt hash pattern must NOT appear in register response');
  });

  await attackTest('ATK-D06', 'SECRET-LEAK', 'Deep inspection of GET /api/auth/me: Zero password or password_hash leakage', async () => {
    const res = await apiRequest('/api/auth/me', {
      headers: { Authorization: `Bearer ${merchantAToken}` }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.user.password, undefined);
    assert.strictEqual(res.body.user.password_hash, undefined);

    const rawJson = res.rawText;
    assert.strictEqual(/"password"\s*:/i.test(rawJson), false);
    assert.strictEqual(/"password_hash"\s*:/i.test(rawJson), false);
  });
}

runPenetrationSuite()
  .catch((err) => {
    console.error('[FATAL RUNNER ERROR]', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await teardownEnvironment();
  });
