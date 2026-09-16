/**
 * DenaNeya v2.0 - E2E Tier 2: Boundary & Corner Cases Test Suite
 * File: tests/e2e/tier2_rbac_billing.test.js
 *
 * Scope:
 * - SQL Injection payloads in registration, brand names, and staff profiles (Parameterized query validation).
 * - Stored XSS payloads in registration, brand names, and staff profiles (Sanitizer HTML entity encoding).
 * - Malformed, expired, forged, and algorithm-none JWT token rejection (HTTP 401).
 * - Staff RBAC privilege escalation attempts: non-owner staff adding staff or deleting owner (HTTP 403 OWNER_ONLY).
 * - Module-level RBAC authorization enforcement (HTTP 403 FORBIDDEN).
 * - Negative, zero, below-threshold, non-numeric, and invalid-package billing topup attempts (HTTP 400).
 */

process.env.NODE_ENV = 'test';
process.env.DB_CLIENT = 'sqlite';
process.env.DB_SQLITE_PATH = ':memory:';
process.env.JWT_SECRET = 'denaneya_development_jwt_secret_min_32_bytes_long_12345';

import assert from 'node:assert';
import jwt from 'jsonwebtoken';
import dbPkg from '@denaneya/database';
import { createApp } from '../../apps/api/src/app.js';

const { getDatabase, runMigrations, runSeed } = dbPkg;

console.log('===============================================================================');
console.log('      DenaNeya v2.0 - E2E Tier 2: Boundary & Corner Cases Test Suite           ');
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
  console.log('[Setup] Initializing in-memory SQLite database and running migrations...');
  db = getDatabase();
  await runMigrations(db, { reset: true });
  await runSeed(db);
  console.log('[Setup] Database migrations and seed fixtures ready.');

  const app = createApp();
  server = app.listen(0);
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
  console.log(`[Setup] E2E test server listening on ${baseUrl}\n`);
}

async function teardown() {
  console.log('\n[Teardown] Stopping test server and closing database...');
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  if (db) {
    await db.close();
  }
  console.log(`[Teardown] Suite complete. Summary: ${passCount} Passed, ${failCount} Failed.`);
  if (failCount > 0) {
    process.exit(1);
  }
}

async function runTier2Suite() {
  await setup();

  // Provision primary test merchant & brand
  const regRes = await request('/api/auth/register', {
    method: 'POST',
    body: {
      name: 'Tier 2 Master Owner',
      email: 'owner.tier2@testcorp.com',
      password: 'OwnerPassword#2026'
    }
  });
  assert.strictEqual(regRes.status, 201);
  const ownerToken = regRes.body.token;
  const ownerUserId = regRes.body.user.id;
  const ownerBrandId = regRes.body.brand.id;

  let staffToken = '';
  let staffUserId = '';

  // ==========================================================================
  // SECTION 1: SQL INJECTION DEFENSE (PARAMETERIZED QUERY INTEGRITY)
  // ==========================================================================
  console.log('--- Section 1: SQL Injection Boundary Testing ---');

  await test('T2-SQLI-01: Registration with SQLi payload in name is stored safely via parameterized query', async () => {
    const sqliName = "Robert'); DROP TABLE users; --";
    const res = await request('/api/auth/register', {
      method: 'POST',
      body: {
        name: sqliName,
        email: 'bobby.tables@testcorp.com',
        password: 'BobbyPassword#2026'
      }
    });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);

    // Verify users table was NOT dropped and record exists intact
    const verifyUser = await db.get('SELECT name FROM users WHERE email = ?', ['bobby.tables@testcorp.com']);
    assert.ok(verifyUser);
    assert.ok(verifyUser.name.includes('Robert'));
  });

  await test('T2-SQLI-02: Login with SQLi authentication bypass payload is rejected without SQL execution', async () => {
    const res = await request('/api/auth/login', {
      method: 'POST',
      body: {
        email: "' OR '1'='1' --",
        password: 'any_password'
      }
    });

    // Rejected by Zod email schema validation
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.code, 'VALIDATION_ERROR');
  });

  await test('T2-SQLI-03: Brand creation with SQLi payload in brand_name is handled safely without syntax error', async () => {
    const sqliBrand = "Brand' UNION SELECT * FROM users --";
    const res = await request('/api/brands', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ownerToken}`
      },
      body: {
        brand_name: sqliBrand,
        brand_slug: 'sqli-safe-brand'
      }
    });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.brand.id);
  });

  await test('T2-SQLI-04: Staff creation with SQLi payload in staff name is parameterized and inserted safely', async () => {
    const sqliStaff = "Staff'); DELETE FROM staff_permissions; --";
    const res = await request('/api/staff', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ownerToken}`,
        'x-brand-id': ownerBrandId
      },
      body: {
        name: sqliStaff,
        email: 'sqli.staff@testcorp.com',
        password: 'StaffPassword#2026'
      }
    });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);

    // Verify staff_permissions table remains intact
    const allPerms = await db.query('SELECT COUNT(*) AS cnt FROM staff_permissions');
    assert.ok(Number(allPerms.rows[0].cnt) > 0, 'Permissions table must not have been deleted');
  });

  // ==========================================================================
  // SECTION 2: STORED XSS NEUTRALIZATION VIA SANITIZATION MIDDLEWARE
  // ==========================================================================
  console.log('\n--- Section 2: Stored XSS Boundary & Sanitization Testing ---');

  await test('T2-XSS-01: Registration with script tags in name is sanitized to HTML entities', async () => {
    const xssPayload = "<script>alert('XSS-USER')</script>";
    const res = await request('/api/auth/register', {
      method: 'POST',
      body: {
        name: xssPayload,
        email: 'xss.user@testcorp.com',
        password: 'XssPassword#2026'
      }
    });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.user.name, '&lt;script&gt;alert(&#x27;XSS-USER&#x27;)&lt;&#x2F;script&gt;');
    assert.ok(!res.body.user.name.includes('<script>'), 'Must not contain raw unescaped script tag');
  });

  await test('T2-XSS-02: Brand creation with img onerror payload is sanitized to HTML entities', async () => {
    const xssBrand = "<img src=x onerror=alert('XSS-BRAND')>";
    const res = await request('/api/brands', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ownerToken}`
      },
      body: {
        brand_name: xssBrand,
        brand_slug: 'xss-brand-slug'
      }
    });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.brand.brand_name, '&lt;img src=x onerror=alert(&#x27;XSS-BRAND&#x27;)&gt;');
    assert.ok(!res.body.brand.brand_name.includes('<img'), 'Must not contain raw unescaped img tag');
  });

  await test('T2-XSS-03: Staff invitation with iframe payload is sanitized to HTML entities', async () => {
    const xssStaff = "<iframe src='javascript:alert(1)'></iframe>";
    const res = await request('/api/staff', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ownerToken}`,
        'x-brand-id': ownerBrandId
      },
      body: {
        name: xssStaff,
        email: 'xss.staff@testcorp.com',
        password: 'XssPassword#2026'
      }
    });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.staff.name, '&lt;iframe src=&#x27;javascript:alert(1)&#x27;&gt;&lt;&#x2F;iframe&gt;');
    assert.ok(!res.body.staff.name.includes('<iframe'), 'Must not contain raw unescaped iframe tag');
  });

  // ==========================================================================
  // SECTION 3: MALFORMED, FORGED & EXPIRED JWT REJECTION
  // ==========================================================================
  console.log('\n--- Section 3: JWT Boundary & Cryptographic Forgery Testing ---');

  await test('T2-JWT-01: Request without Authorization header is rejected with HTTP 401 UNAUTHORIZED', async () => {
    const res = await request('/api/auth/me');
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.code, 'UNAUTHORIZED');
  });

  await test('T2-JWT-02: Request with malformed Authorization scheme (Basic) is rejected with HTTP 401 UNAUTHORIZED', async () => {
    const res = await request('/api/auth/me', {
      headers: {
        Authorization: 'Basic dXNlcjpwYXNz'
      }
    });
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.code, 'UNAUTHORIZED');
  });

  await test('T2-JWT-03: Request with empty Bearer header is rejected with HTTP 401 UNAUTHORIZED', async () => {
    const res = await request('/api/auth/me', {
      headers: {
        Authorization: 'Bearer'
      }
    });
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.code, 'UNAUTHORIZED');
  });

  await test('T2-JWT-04: Request with cryptographically forged JWT (wrong secret) is rejected with HTTP 401 INVALID_TOKEN', async () => {
    const forgedToken = jwt.sign(
      { id: ownerUserId, email: 'owner.tier2@testcorp.com', role: 'merchant' },
      'attacker_compromised_forged_key_that_is_wrong_12345'
    );

    const res = await request('/api/auth/me', {
      headers: {
        Authorization: `Bearer ${forgedToken}`
      }
    });

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.code, 'INVALID_TOKEN');
  });

  await test('T2-JWT-05: Request with algorithm "none" JWT is rejected with HTTP 401 INVALID_TOKEN', async () => {
    // Generate an unsigned token
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ id: ownerUserId, email: 'owner.tier2@testcorp.com', role: 'merchant' })).toString('base64url');
    const unsignedToken = `${header}.${payload}.`;

    const res = await request('/api/auth/me', {
      headers: {
        Authorization: `Bearer ${unsignedToken}`
      }
    });

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.code, 'INVALID_TOKEN');
  });

  await test('T2-JWT-06: Expired JWT token is rejected with HTTP 401 TOKEN_EXPIRED', async () => {
    const expiredToken = jwt.sign(
      { id: ownerUserId, email: 'owner.tier2@testcorp.com', role: 'merchant' },
      process.env.JWT_SECRET,
      { expiresIn: -3600 } // expired 1 hour ago
    );

    const res = await request('/api/auth/me', {
      headers: {
        Authorization: `Bearer ${expiredToken}`
      }
    });

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.code, 'TOKEN_EXPIRED');
  });

  await test('T2-JWT-07: Validly signed token with non-existent user ID is rejected with HTTP 401 USER_NOT_FOUND', async () => {
    const ghostToken = jwt.sign(
      { id: 'usr_ghost_never_existed_99999', email: 'ghost@testcorp.com', role: 'merchant' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const res = await request('/api/auth/me', {
      headers: {
        Authorization: `Bearer ${ghostToken}`
      }
    });

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.code, 'USER_NOT_FOUND');
  });

  // ==========================================================================
  // SECTION 4: STAFF RBAC PRIVILEGE ESCALATION ATTEMPTS
  // ==========================================================================
  console.log('\n--- Section 4: Staff RBAC Privilege Escalation Testing ---');

  // Setup staff member
  const staffInviteRes = await request('/api/staff', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ownerToken}`,
      'x-brand-id': ownerBrandId
    },
    body: {
      name: 'Junior Associate Salim',
      email: 'salim.junior@testcorp.com',
      password: 'SalimPassword#2026',
      permissions: [
        { module: 'overview', can_read: true, can_create: false, can_update: false, can_delete: false },
        { module: 'invoices', can_read: true, can_create: false, can_update: false, can_delete: false },
        { module: 'gateways', can_read: true, can_create: false, can_update: false, can_delete: false },
        { module: 'staff', can_read: true, can_create: false, can_update: false, can_delete: false },
        { module: 'billing', can_read: false, can_create: false, can_update: false, can_delete: false }
      ]
    }
  });
  assert.strictEqual(staffInviteRes.status, 201);
  staffUserId = staffInviteRes.body.staff.user_id;

  // Staff login to get genuine staff JWT
  const staffLoginRes = await request('/api/auth/login', {
    method: 'POST',
    body: {
      email: 'salim.junior@testcorp.com',
      password: 'SalimPassword#2026'
    }
  });
  assert.strictEqual(staffLoginRes.status, 200);
  staffToken = staffLoginRes.body.token;

  await test('T2-RBAC-01: Non-owner staff attempting to invite staff is rejected with HTTP 403 OWNER_ONLY', async () => {
    const res = await request('/api/staff', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${staffToken}`,
        'x-brand-id': ownerBrandId
      },
      body: {
        name: 'Attacker Puppet',
        email: 'puppet@testcorp.com',
        password: 'PuppetPassword#2026'
      }
    });

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.code, 'OWNER_ONLY');
  });

  await test('T2-RBAC-02: Non-owner staff attempting to delete brand owner is rejected with HTTP 403 OWNER_ONLY', async () => {
    const res = await request(`/api/staff/${ownerUserId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${staffToken}`,
        'x-brand-id': ownerBrandId
      }
    });

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.code, 'OWNER_ONLY');
  });

  await test('T2-RBAC-03: Brand owner attempting to delete themselves as staff is rejected with HTTP 400 CANNOT_REMOVE_OWNER', async () => {
    const res = await request(`/api/staff/${ownerUserId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${ownerToken}`,
        'x-brand-id': ownerBrandId
      }
    });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.code, 'CANNOT_REMOVE_OWNER');
  });

  await test('T2-RBAC-04: Brand owner attempting to invite themselves as staff is rejected with HTTP 400 CANNOT_ADD_SELF', async () => {
    const res = await request('/api/staff', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ownerToken}`,
        'x-brand-id': ownerBrandId
      },
      body: {
        name: 'Owner Self Clone',
        email: 'owner.tier2@testcorp.com',
        password: 'SelfPassword#2026'
      }
    });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.code, 'CANNOT_ADD_SELF');
  });

  await test('T2-RBAC-05: Staff lacking invoices:create permission is rejected with HTTP 403 FORBIDDEN when creating invoice', async () => {
    const res = await request('/api/invoices', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${staffToken}`,
        'x-brand-id': ownerBrandId
      },
      body: {
        amount: 500,
        customer_name: 'Walk-in Customer'
      }
    });

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.code, 'FORBIDDEN');
    assert.ok(res.body.message.toLowerCase().includes("lack 'create' permission on the 'invoices' module"));
  });

  await test('T2-RBAC-06: Staff attempting to rotate brand secrets is rejected with HTTP 403 FORBIDDEN', async () => {
    const res = await request(`/api/brands/${ownerBrandId}/rotate-secrets`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${staffToken}`
      },
      body: {
        rotate_api_secret: true
      }
    });

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.code, 'FORBIDDEN');
  });

  await test('T2-RBAC-07: Staff attempting to topup credits is rejected with HTTP 403 OWNER_ONLY', async () => {
    const res = await request('/api/billing/topup', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${staffToken}`,
        'x-brand-id': ownerBrandId
      },
      body: {
        amount_credits: 100
      }
    });

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.code, 'OWNER_ONLY');
  });

  // ==========================================================================
  // SECTION 5: BILLING INPUT BOUNDARY REJECTION (NEGATIVE, ZERO, NON-NUMERIC)
  // ==========================================================================
  console.log('\n--- Section 5: Billing Boundary & Malformed Input Rejection ---');

  // Check baseline balance
  const initialBalRes = await request('/api/billing/balance', {
    headers: {
      Authorization: `Bearer ${ownerToken}`,
      'x-brand-id': ownerBrandId
    }
  });
  const baselineCredits = initialBalRes.body.balance.credits;

  await test('T2-BILL-01: Negative credit topup amount (-50) is rejected with HTTP 400 INVALID_CREDIT_AMOUNT', async () => {
    const res = await request('/api/billing/topup', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ownerToken}`,
        'x-brand-id': ownerBrandId
      },
      body: {
        amount_credits: -50
      }
    });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.code, 'INVALID_CREDIT_AMOUNT');
  });

  await test('T2-BILL-02: Zero credit topup amount (0) is rejected with HTTP 400 INVALID_CREDIT_AMOUNT', async () => {
    const res = await request('/api/billing/topup', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ownerToken}`,
        'x-brand-id': ownerBrandId
      },
      body: {
        amount_credits: 0
      }
    });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.code, 'INVALID_CREDIT_AMOUNT');
  });

  await test('T2-BILL-03: Non-numeric credit topup amount ("abc") is rejected with HTTP 400 INVALID_CREDIT_AMOUNT', async () => {
    const res = await request('/api/billing/topup', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ownerToken}`,
        'x-brand-id': ownerBrandId
      },
      body: {
        amount_credits: 'not_a_number'
      }
    });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.code, 'INVALID_CREDIT_AMOUNT');
  });

  await test('T2-BILL-04: Credit topup below minimum threshold (5 < 10) is rejected with HTTP 400 INVALID_CREDIT_AMOUNT', async () => {
    const res = await request('/api/billing/topup', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ownerToken}`,
        'x-brand-id': ownerBrandId
      },
      body: {
        amount_credits: 5
      }
    });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.code, 'INVALID_CREDIT_AMOUNT');
  });

  await test('T2-BILL-05: Unrecognized package ID ("pkg_fake_9999") is rejected with HTTP 400 INVALID_PACKAGE', async () => {
    const res = await request('/api/billing/topup', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ownerToken}`,
        'x-brand-id': ownerBrandId
      },
      body: {
        package_id: 'pkg_fake_9999'
      }
    });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.code, 'INVALID_PACKAGE');
  });

  await test('T2-BILL-06: Balance invariant preserved: balance remains strictly unchanged after invalid topup attempts', async () => {
    const finalBalRes = await request('/api/billing/balance', {
      headers: {
        Authorization: `Bearer ${ownerToken}`,
        'x-brand-id': ownerBrandId
      }
    });

    assert.strictEqual(finalBalRes.status, 200);
    assert.strictEqual(finalBalRes.body.balance.credits, baselineCredits, 'Balance must remain identical');
  });

  await teardown();
}

runTier2Suite().catch((err) => {
  console.error('Fatal execution error in Tier 2 suite:', err);
  process.exit(1);
});
