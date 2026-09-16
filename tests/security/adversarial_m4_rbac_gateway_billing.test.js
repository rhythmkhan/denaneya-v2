/**
 * DenaNeya v2.0 - Milestone 4 Adversarial RBAC, Multi-Tenant Gateway & Billing Integrity Penetration Suite
 * File: tests/security/adversarial_m4_rbac_gateway_billing.test.js
 * Challenger: Milestone 4 Challenger 2 (RBAC & Gateway Security Challenger)
 *
 * Verification Scope:
 * 1. Category 1: Unauthenticated endpoint probing on /api/staff, /api/gateways, /api/billing/balance (Enforces HTTP 401 UNAUTHORIZED)
 * 2. Category 2: Non-owner staff member attempting staff management (POST /api/staff, DELETE /api/staff/:id) (Enforces HTTP 403 FORBIDDEN)
 * 3. Category 3: Cross-tenant staff tampering (Merchant A attempting to delete Merchant B's staff) (Enforces HTTP 404/403)
 * 4. Category 4: Gateway activation toggle cross-tenancy (Merchant A attempting to toggle Merchant B's gateway) (Enforces HTTP 404/403)
 * 5. Category 5: Billing manipulation (Negative, zero, and malformed amounts to /api/billing/topup) (Enforces HTTP 400 rejection)
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
import { generateToken, getSecret } from '../../apps/api/src/utils/token.js';

const { getDatabase, runMigrations, runSeed } = dbPkg;

console.log('========================================================================================');
console.log('  DenaNeya v2.0 - M4 Adversarial RBAC, Gateway & Billing Penetration Test Suite        ');
console.log('========================================================================================\n');

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
  console.log('========================================================================================');
  console.log(`Penetration Results: ${summary.passed} Passed / ${summary.total} Total (${summary.failed} Vulnerabilities Detected)`);
  console.log('========================================================================================\n');

  if (summary.failed > 0) {
    process.exit(1);
  }
}

async function runPenetrationSuite() {
  await setupEnvironment();

  // --------------------------------------------------------------------------
  // Provisioning Actors and Test Resources
  // --------------------------------------------------------------------------
  console.log('--- Provisioning Adversarial Actors & Multi-Tenant Entities ---');

  // 1. Merchant A (Alice)
  const regARes = await apiRequest('/api/auth/register', {
    method: 'POST',
    body: { name: 'Alice Merchant A', email: 'alice.tenant.a@test.local', password: 'PasswordAlice123!' }
  });
  assert.strictEqual(regARes.status, 201, 'Merchant A registration failed');
  const merchantAToken = regARes.body.token;
  const merchantAId = regARes.body.user.id;

  const brandARes = await apiRequest('/api/brands', {
    method: 'POST',
    headers: { Authorization: `Bearer ${merchantAToken}` },
    body: { brand_name: 'Alice Brand A', brand_slug: 'alice-brand-a' }
  });
  assert.strictEqual(brandARes.status, 201, 'Brand A creation failed');
  const brandAId = brandARes.body.brand.id;

  // Configure Gateway A for Merchant A
  const gwARes = await apiRequest('/api/gateways', {
    method: 'POST',
    headers: { Authorization: `Bearer ${merchantAToken}`, 'x-brand-id': brandAId },
    body: {
      channel_name: 'bKash Merchant A',
      category: 'Mobile',
      account_type: 'merchant',
      account_number: '01811111111'
    }
  });
  assert.strictEqual(gwARes.status, 201, 'Gateway A creation failed');
  const gatewayAId = gwARes.body.gateway.id;

  // 2. Merchant B (Bob - Victim)
  const regBRes = await apiRequest('/api/auth/register', {
    method: 'POST',
    body: { name: 'Bob Merchant B', email: 'bob.victim.b@test.local', password: 'PasswordBob123!' }
  });
  assert.strictEqual(regBRes.status, 201, 'Merchant B registration failed');
  const merchantBToken = regBRes.body.token;
  const merchantBId = regBRes.body.user.id;

  const brandBRes = await apiRequest('/api/brands', {
    method: 'POST',
    headers: { Authorization: `Bearer ${merchantBToken}` },
    body: { brand_name: 'Bob Brand B', brand_slug: 'bob-brand-b' }
  });
  assert.strictEqual(brandBRes.status, 201, 'Brand B creation failed');
  const brandBId = brandBRes.body.brand.id;

  // Configure Gateway B for Merchant B
  const gwBRes = await apiRequest('/api/gateways', {
    method: 'POST',
    headers: { Authorization: `Bearer ${merchantBToken}`, 'x-brand-id': brandBId },
    body: {
      channel_name: 'Nagad Merchant B',
      category: 'Mobile',
      account_type: 'merchant',
      account_number: '01922222222'
    }
  });
  assert.strictEqual(gwBRes.status, 201, 'Gateway B creation failed');
  const gatewayBId = gwBRes.body.gateway.id;

  // 3. Staff Member in Brand A with staff:read=false (Staff A)
  const staffAAddRes = await apiRequest('/api/staff', {
    method: 'POST',
    headers: { Authorization: `Bearer ${merchantAToken}`, 'x-brand-id': brandAId },
    body: {
      email: 'staff.alice@test.local',
      name: 'Staff Alice Assistant',
      password: 'StaffPassword123!',
      permissions: [
        { module: 'overview', can_read: true },
        { module: 'invoices', can_read: true, can_create: true },
        { module: 'gateways', can_read: true, can_update: false, can_delete: false },
        { module: 'staff', can_read: false, can_create: false, can_update: false, can_delete: false }
      ]
    }
  });
  assert.strictEqual(staffAAddRes.status, 201, 'Staff A provisioning failed');
  const staffAUserId = staffAAddRes.body.staff.user_id;

  const staffALoginRes = await apiRequest('/api/auth/login', {
    method: 'POST',
    body: { email: 'staff.alice@test.local', password: 'StaffPassword123!' }
  });
  assert.strictEqual(staffALoginRes.status, 200, 'Staff A login failed');
  const staffAToken = staffALoginRes.body.token;

  // 3b. Staff Member in Brand A WITH staff:read=true (Staff A Viewer)
  const staffAViewerAddRes = await apiRequest('/api/staff', {
    method: 'POST',
    headers: { Authorization: `Bearer ${merchantAToken}`, 'x-brand-id': brandAId },
    body: {
      email: 'staff.viewer@test.local',
      name: 'Staff Alice Viewer',
      password: 'StaffViewerPassword123!',
      permissions: [
        { module: 'overview', can_read: true },
        { module: 'staff', can_read: true, can_create: false, can_update: false, can_delete: false }
      ]
    }
  });
  assert.strictEqual(staffAViewerAddRes.status, 201, 'Staff A Viewer provisioning failed');
  const staffAViewerUserId = staffAViewerAddRes.body.staff.user_id;

  const staffAViewerLoginRes = await apiRequest('/api/auth/login', {
    method: 'POST',
    body: { email: 'staff.viewer@test.local', password: 'StaffViewerPassword123!' }
  });
  assert.strictEqual(staffAViewerLoginRes.status, 200, 'Staff A Viewer login failed');
  const staffAViewerToken = staffAViewerLoginRes.body.token;

  // 4. Staff Member in Brand B (Staff B - Victim Staff)
  const staffBAddRes = await apiRequest('/api/staff', {
    method: 'POST',
    headers: { Authorization: `Bearer ${merchantBToken}`, 'x-brand-id': brandBId },
    body: {
      email: 'staff.bob@test.local',
      name: 'Staff Bob Assistant',
      password: 'StaffBobPassword123!',
      permissions: [
        { module: 'overview', can_read: true },
        { module: 'invoices', can_read: true }
      ]
    }
  });
  assert.strictEqual(staffBAddRes.status, 201, 'Staff B provisioning failed');
  const staffBUserId = staffBAddRes.body.staff.user_id;

  const staffBLoginRes = await apiRequest('/api/auth/login', {
    method: 'POST',
    body: { email: 'staff.bob@test.local', password: 'StaffBobPassword123!' }
  });
  assert.strictEqual(staffBLoginRes.status, 200, 'Staff B login failed');
  const staffBToken = staffBLoginRes.body.token;

  console.log(`[Actors Ready] Merchant A: ${merchantAId}, Brand A: ${brandAId}, Gateway A: ${gatewayAId}, Staff A: ${staffAUserId}`);
  console.log(`[Actors Ready] Merchant B: ${merchantBId}, Brand B: ${brandBId}, Gateway B: ${gatewayBId}, Staff B: ${staffBUserId}`);
  console.log('----------------------------------------------------------------\n');

  // ==========================================================================
  // CATEGORY 1: Unauthenticated Requests (Must Return HTTP 401 UNAUTHORIZED)
  // ==========================================================================
  console.log('--- Category 1: Unauthenticated Requests (HTTP 401 Enforcement) ---');

  await attackTest('ATK-AUTH-01', 'UNAUTH', 'Unauthenticated GET /api/staff (no Authorization header)', async () => {
    const res = await apiRequest('/api/staff');
    assert.strictEqual(res.status, 401, `Expected 401, got ${res.status}`);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.code, 'UNAUTHORIZED');
  });

  await attackTest('ATK-AUTH-02', 'UNAUTH', 'Unauthenticated POST /api/staff (no Authorization header)', async () => {
    const res = await apiRequest('/api/staff', {
      method: 'POST',
      body: { name: 'Hacker Staff', email: 'hacker@blackhat.local' }
    });
    assert.strictEqual(res.status, 401, `Expected 401, got ${res.status}`);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.code, 'UNAUTHORIZED');
  });

  await attackTest('ATK-AUTH-03', 'UNAUTH', 'Unauthenticated DELETE /api/staff/:id (no Authorization header)', async () => {
    const res = await apiRequest(`/api/staff/${staffAUserId}`, {
      method: 'DELETE'
    });
    assert.strictEqual(res.status, 401, `Expected 401, got ${res.status}`);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.code, 'UNAUTHORIZED');
  });

  await attackTest('ATK-AUTH-04', 'UNAUTH', 'Unauthenticated GET /api/gateways (no Authorization header)', async () => {
    const res = await apiRequest('/api/gateways');
    assert.strictEqual(res.status, 401, `Expected 401, got ${res.status}`);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.code, 'UNAUTHORIZED');
  });

  await attackTest('ATK-AUTH-05', 'UNAUTH', 'Unauthenticated POST /api/gateways/:id/toggle (no Authorization header)', async () => {
    const res = await apiRequest(`/api/gateways/${gatewayAId}/toggle`, {
      method: 'POST'
    });
    assert.strictEqual(res.status, 401, `Expected 401, got ${res.status}`);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.code, 'UNAUTHORIZED');
  });

  await attackTest('ATK-AUTH-06', 'UNAUTH', 'Unauthenticated POST /api/gateways (no Authorization header)', async () => {
    const res = await apiRequest('/api/gateways', {
      method: 'POST',
      body: { channel_name: 'bKash Rogue', category: 'Mobile', account_number: '01899999999' }
    });
    assert.strictEqual(res.status, 401, `Expected 401, got ${res.status}`);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.code, 'UNAUTHORIZED');
  });

  await attackTest('ATK-AUTH-07', 'UNAUTH', 'Unauthenticated PUT /api/gateways/:id (no Authorization header)', async () => {
    const res = await apiRequest(`/api/gateways/${gatewayAId}`, {
      method: 'PUT',
      body: { account_number: '01700000000' }
    });
    assert.strictEqual(res.status, 401, `Expected 401, got ${res.status}`);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.code, 'UNAUTHORIZED');
  });

  await attackTest('ATK-AUTH-08', 'UNAUTH', 'Unauthenticated DELETE /api/gateways/:id (no Authorization header)', async () => {
    const res = await apiRequest(`/api/gateways/${gatewayAId}`, {
      method: 'DELETE'
    });
    assert.strictEqual(res.status, 401, `Expected 401, got ${res.status}`);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.code, 'UNAUTHORIZED');
  });

  await attackTest('ATK-AUTH-09', 'UNAUTH', 'Unauthenticated GET /api/billing/balance (no Authorization header)', async () => {
    const res = await apiRequest('/api/billing/balance');
    assert.strictEqual(res.status, 401, `Expected 401, got ${res.status}`);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.code, 'UNAUTHORIZED');
  });

  await attackTest('ATK-AUTH-10', 'UNAUTH', 'Unauthenticated POST /api/billing/topup (no Authorization header)', async () => {
    const res = await apiRequest('/api/billing/topup', {
      method: 'POST',
      body: { amount_credits: 50 }
    });
    assert.strictEqual(res.status, 401, `Expected 401, got ${res.status}`);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.code, 'UNAUTHORIZED');
  });

  await attackTest('ATK-AUTH-11', 'UNAUTH', 'Malformed Bearer token on /api/staff', async () => {
    const res = await apiRequest('/api/staff', {
      headers: { Authorization: 'Bearer this_is_a_completely_fake_and_malformed_jwt_token' }
    });
    assert.strictEqual(res.status, 401, `Expected 401, got ${res.status}`);
    assert.strictEqual(res.body.code, 'INVALID_TOKEN');
  });

  await attackTest('ATK-AUTH-12', 'UNAUTH', 'Expired JWT token on /api/gateways', async () => {
    const expiredToken = jwt.sign(
      { id: merchantAId, email: 'alice.tenant.a@test.local', role: 'merchant' },
      getSecret(),
      { expiresIn: '-1s' }
    );
    const res = await apiRequest('/api/gateways', {
      headers: { Authorization: `Bearer ${expiredToken}` }
    });
    assert.strictEqual(res.status, 401, `Expected 401, got ${res.status}`);
    assert.strictEqual(res.body.code, 'TOKEN_EXPIRED');
  });

  await attackTest('ATK-AUTH-13', 'UNAUTH', 'Forged non-existent user JWT token on /api/billing/balance', async () => {
    const ghostToken = jwt.sign(
      { id: 'usr_ghost_non_existent_999', email: 'ghost@nowhere.local', role: 'merchant' },
      getSecret(),
      { expiresIn: '1h' }
    );
    const res = await apiRequest('/api/billing/balance', {
      headers: { Authorization: `Bearer ${ghostToken}` }
    });
    assert.strictEqual(res.status, 401, `Expected 401, got ${res.status}`);
    assert.strictEqual(res.body.code, 'USER_NOT_FOUND');
  });

  // ==========================================================================
  // CATEGORY 2: Non-Owner Staff Member Attempting to Manage Staff (403 FORBIDDEN)
  // ==========================================================================
  console.log('\n--- Category 2: Non-Owner Staff RBAC Enforcement (HTTP 403 FORBIDDEN) ---');

  await attackTest('ATK-RBAC-01', 'STAFF-RBAC', 'Non-owner staff member attempting POST /api/staff (add colleague)', async () => {
    const res = await apiRequest('/api/staff', {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffAToken}`, 'x-brand-id': brandAId },
      body: {
        email: 'colleague.staff@test.local',
        name: 'Colleague Staff',
        password: 'Password123!'
      }
    });
    assert.strictEqual(res.status, 403, `Expected 403 Forbidden, got ${res.status}`);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.code, 'OWNER_ONLY');
  });

  await attackTest('ATK-RBAC-02', 'STAFF-RBAC', 'Non-owner staff member attempting DELETE /api/staff/:id (revoke staff access)', async () => {
    // Provision a second staff member under Brand A by owner first
    const staffA2Res = await apiRequest('/api/staff', {
      method: 'POST',
      headers: { Authorization: `Bearer ${merchantAToken}`, 'x-brand-id': brandAId },
      body: { email: 'staff2.alice@test.local', name: 'Staff 2 Alice', password: 'Password123!' }
    });
    assert.strictEqual(staffA2Res.status, 201);
    const staff2Id = staffA2Res.body.staff.user_id;

    // Staff A attempts to delete Staff 2
    const res = await apiRequest(`/api/staff/${staff2Id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${staffAToken}`, 'x-brand-id': brandAId }
    });
    assert.strictEqual(res.status, 403, `Expected 403 Forbidden, got ${res.status}`);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.code, 'OWNER_ONLY');
  });

  await attackTest('ATK-RBAC-03', 'STAFF-RBAC', 'Non-owner staff member attempting DELETE /api/staff/:owner_id (delete brand owner)', async () => {
    const res = await apiRequest(`/api/staff/${merchantAId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${staffAToken}`, 'x-brand-id': brandAId }
    });
    assert.strictEqual(res.status, 403, `Expected 403 Forbidden, got ${res.status}`);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.code, 'OWNER_ONLY');
  });

  await attackTest('ATK-RBAC-04', 'STAFF-RBAC', 'Non-owner staff without staff:read permission attempting GET /api/staff', async () => {
    // Staff A does not have 'staff' module read permission (only overview, invoices, gateways)
    const res = await apiRequest('/api/staff', {
      headers: { Authorization: `Bearer ${staffAToken}`, 'x-brand-id': brandAId }
    });
    assert.strictEqual(res.status, 403, `Expected 403 Forbidden, got ${res.status}`);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.code, 'FORBIDDEN');
  });

  await attackTest('ATK-RBAC-05', 'STAFF-RBAC', 'Non-owner staff WITH staff:read permission cannot POST or DELETE /api/staff (OWNER_ONLY 403)', async () => {
    // GET /api/staff succeeds for staff member with staff:read
    const getRes = await apiRequest('/api/staff', {
      headers: { Authorization: `Bearer ${staffAViewerToken}`, 'x-brand-id': brandAId }
    });
    assert.strictEqual(getRes.status, 200, 'Staff member with staff:read should view staff list');

    // But POST /api/staff must still be strictly blocked with 403 OWNER_ONLY
    const postRes = await apiRequest('/api/staff', {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffAViewerToken}`, 'x-brand-id': brandAId },
      body: { email: 'privilege.escalation@test.local', name: 'Escalation Test' }
    });
    assert.strictEqual(postRes.status, 403, `Expected 403 Forbidden, got ${postRes.status}`);
    assert.strictEqual(postRes.body.code, 'OWNER_ONLY');

    // And DELETE /api/staff/:id must also be strictly blocked with 403 OWNER_ONLY
    const delRes = await apiRequest(`/api/staff/${staffAUserId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${staffAViewerToken}`, 'x-brand-id': brandAId }
    });
    assert.strictEqual(delRes.status, 403, `Expected 403 Forbidden, got ${delRes.status}`);
    assert.strictEqual(delRes.body.code, 'OWNER_ONLY');
  });

  await attackTest('ATK-RBAC-06', 'STAFF-RBAC', 'Owner attempting self-addition as staff member rejected (400 CANNOT_ADD_SELF)', async () => {
    const res = await apiRequest('/api/staff', {
      method: 'POST',
      headers: { Authorization: `Bearer ${merchantAToken}`, 'x-brand-id': brandAId },
      body: {
        email: 'alice.tenant.a@test.local',
        name: 'Alice Merchant A Self'
      }
    });
    assert.strictEqual(res.status, 400, `Expected 400 Bad Request, got ${res.status}`);
    assert.strictEqual(res.body.code, 'CANNOT_ADD_SELF');
  });

  await attackTest('ATK-RBAC-07', 'STAFF-RBAC', 'Owner attempting self-revocation rejected (400 CANNOT_REMOVE_OWNER)', async () => {
    const res = await apiRequest(`/api/staff/${merchantAId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${merchantAToken}`, 'x-brand-id': brandAId }
    });
    assert.strictEqual(res.status, 400, `Expected 400 Bad Request, got ${res.status}`);
    assert.strictEqual(res.body.code, 'CANNOT_REMOVE_OWNER');
  });

  // ==========================================================================
  // CATEGORY 3: Cross-Tenant Staff Tampering (Merchant A vs Merchant B)
  // ==========================================================================
  console.log('\n--- Category 3: Cross-Tenant Staff Tampering Isolation (404/403 Enforcement) ---');

  await attackTest('ATK-CROSS-STAFF-01', 'CROSS-TENANT', 'Merchant A attempts to delete Merchant B staff via Brand A context (404 STAFF_NOT_FOUND)', async () => {
    // Merchant A targeting Staff B's user ID with Brand A header
    const res = await apiRequest(`/api/staff/${staffBUserId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${merchantAToken}`, 'x-brand-id': brandAId }
    });
    assert.strictEqual(res.status, 404, `Expected 404 Not Found, got ${res.status}`);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.code, 'STAFF_NOT_FOUND');
  });

  await attackTest('ATK-CROSS-STAFF-02', 'CROSS-TENANT', 'Merchant A attempts to delete Merchant B staff via IDOR Brand B context (403 FORBIDDEN)', async () => {
    // Merchant A targeting Staff B's user ID with Brand B header (spoofed brand context)
    const res = await apiRequest(`/api/staff/${staffBUserId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${merchantAToken}`, 'x-brand-id': brandBId }
    });
    assert.strictEqual(res.status, 403, `Expected 403 Forbidden, got ${res.status}`);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.code, 'FORBIDDEN');
  });

  await attackTest('ATK-CROSS-STAFF-03', 'CROSS-TENANT', 'Merchant A attempts to list Merchant B staff via Brand B context (403 FORBIDDEN)', async () => {
    const res = await apiRequest('/api/staff', {
      headers: { Authorization: `Bearer ${merchantAToken}`, 'x-brand-id': brandBId }
    });
    assert.strictEqual(res.status, 403, `Expected 403 Forbidden, got ${res.status}`);
    assert.strictEqual(res.body.code, 'FORBIDDEN');
  });

  await attackTest('ATK-CROSS-STAFF-04', 'CROSS-TENANT', 'Merchant A attempts to inject rogue staff into Brand B (403 FORBIDDEN)', async () => {
    const res = await apiRequest('/api/staff', {
      method: 'POST',
      headers: { Authorization: `Bearer ${merchantAToken}`, 'x-brand-id': brandBId },
      body: {
        email: 'backdoor.staff@test.local',
        name: 'Backdoor Trojan Staff'
      }
    });
    assert.strictEqual(res.status, 403, `Expected 403 Forbidden, got ${res.status}`);
    assert.strictEqual(res.body.code, 'FORBIDDEN');
  });

  await attackTest('ATK-CROSS-STAFF-05', 'CROSS-TENANT', 'Merchant B attempts to delete Merchant A staff via Brand B context (404 STAFF_NOT_FOUND)', async () => {
    const res = await apiRequest(`/api/staff/${staffAUserId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${merchantBToken}`, 'x-brand-id': brandBId }
    });
    assert.strictEqual(res.status, 404, `Expected 404 Not Found, got ${res.status}`);
    assert.strictEqual(res.body.code, 'STAFF_NOT_FOUND');
  });

  await attackTest('ATK-CROSS-STAFF-06', 'CROSS-TENANT', 'Merchant B attempts to delete Merchant A staff via Brand A context (403 FORBIDDEN)', async () => {
    const res = await apiRequest(`/api/staff/${staffAUserId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${merchantBToken}`, 'x-brand-id': brandAId }
    });
    assert.strictEqual(res.status, 403, `Expected 403 Forbidden, got ${res.status}`);
    assert.strictEqual(res.body.code, 'FORBIDDEN');
  });

  await attackTest('ATK-CROSS-STAFF-07', 'CROSS-TENANT', 'Staff A attempts to delete Staff B via Brand B context (403 FORBIDDEN)', async () => {
    const res = await apiRequest(`/api/staff/${staffBUserId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${staffAToken}`, 'x-brand-id': brandBId }
    });
    assert.strictEqual(res.status, 403, `Expected 403 Forbidden, got ${res.status}`);
    assert.strictEqual(res.body.code, 'FORBIDDEN');
  });

  await attackTest('ATK-CROSS-STAFF-08', 'CROSS-TENANT', 'Verify Staff B records in DB remain completely intact and active', async () => {
    const staffBRows = await db.query(
      'SELECT * FROM staff_permissions WHERE user_id = ? AND brand_id = ?',
      [staffBUserId, brandBId]
    );
    assert.ok(staffBRows.rows && staffBRows.rows.length > 0, 'Staff B permissions must still exist');
  });

  // ==========================================================================
  // CATEGORY 4: Gateway Activation Toggle Cross-Tenancy (Merchant A vs Merchant B)
  // ==========================================================================
  console.log('\n--- Category 4: Gateway Activation Cross-Tenant Isolation (404/403 Enforcement) ---');

  await attackTest('ATK-GW-01', 'GATEWAY-CROSS', 'Merchant A attempts to toggle Merchant B gateway via Brand A context (404 GATEWAY_NOT_FOUND)', async () => {
    const res = await apiRequest(`/api/gateways/${gatewayBId}/toggle`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${merchantAToken}`, 'x-brand-id': brandAId },
      body: { status: 'inactive' }
    });
    assert.strictEqual(res.status, 404, `Expected 404 Not Found, got ${res.status}`);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.code, 'GATEWAY_NOT_FOUND');
  });

  await attackTest('ATK-GW-02', 'GATEWAY-CROSS', 'Merchant A attempts to toggle Merchant B gateway via Brand B context (403 FORBIDDEN)', async () => {
    const res = await apiRequest(`/api/gateways/${gatewayBId}/toggle`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${merchantAToken}`, 'x-brand-id': brandBId },
      body: { status: 'inactive' }
    });
    assert.strictEqual(res.status, 403, `Expected 403 Forbidden, got ${res.status}`);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.code, 'FORBIDDEN');
  });

  await attackTest('ATK-GW-03', 'GATEWAY-CROSS', 'Merchant A attempts to update Merchant B gateway credentials (403 FORBIDDEN)', async () => {
    const res = await apiRequest(`/api/gateways/${gatewayBId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${merchantAToken}`, 'x-brand-id': brandBId },
      body: { account_number: '01799999999' }
    });
    assert.strictEqual(res.status, 403, `Expected 403 Forbidden, got ${res.status}`);
    assert.strictEqual(res.body.code, 'FORBIDDEN');
  });

  await attackTest('ATK-GW-04', 'GATEWAY-CROSS', 'Merchant A attempts to delete Merchant B gateway via Brand B context (403 FORBIDDEN)', async () => {
    const res = await apiRequest(`/api/gateways/${gatewayBId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${merchantAToken}`, 'x-brand-id': brandBId }
    });
    assert.strictEqual(res.status, 403, `Expected 403 Forbidden, got ${res.status}`);
    assert.strictEqual(res.body.code, 'FORBIDDEN');
  });

  await attackTest('ATK-GW-05', 'GATEWAY-CROSS', 'Merchant A attempts to delete Merchant B gateway via Brand A context (404 GATEWAY_NOT_FOUND)', async () => {
    const res = await apiRequest(`/api/gateways/${gatewayBId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${merchantAToken}`, 'x-brand-id': brandAId }
    });
    assert.strictEqual(res.status, 404, `Expected 404 Not Found, got ${res.status}`);
    assert.strictEqual(res.body.code, 'GATEWAY_NOT_FOUND');
  });

  await attackTest('ATK-GW-06', 'GATEWAY-CROSS', 'Staff A lacking gateways:update permission cannot toggle Gateway A (403 FORBIDDEN)', async () => {
    // Staff A has gateways:read = 1, but gateways:update = 0
    const res = await apiRequest(`/api/gateways/${gatewayAId}/toggle`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffAToken}`, 'x-brand-id': brandAId },
      body: { status: 'inactive' }
    });
    assert.strictEqual(res.status, 403, `Expected 403 Forbidden, got ${res.status}`);
    assert.strictEqual(res.body.code, 'FORBIDDEN');
  });

  await attackTest('ATK-GW-07', 'GATEWAY-CROSS', 'Legitimate owner toggles own gateway successfully (200 OK)', async () => {
    // Bob (Merchant B) toggles Gateway B from active to inactive
    const res = await apiRequest(`/api/gateways/${gatewayBId}/toggle`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${merchantBToken}`, 'x-brand-id': brandBId },
      body: { status: 'inactive' }
    });
    assert.strictEqual(res.status, 200, `Expected 200 OK, got ${res.status}`);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.gateway.status, 'inactive');

    // Toggle back to active
    const res2 = await apiRequest(`/api/gateways/${gatewayBId}/toggle`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${merchantBToken}`, 'x-brand-id': brandBId },
      body: { status: 'active' }
    });
    assert.strictEqual(res2.status, 200);
    assert.strictEqual(res2.body.gateway.status, 'active');
  });

  await attackTest('ATK-GW-08', 'GATEWAY-CROSS', 'Verify Gateway B remains owned by Brand B and active in database', async () => {
    const gwB = await db.get('SELECT * FROM gateways WHERE id = ?', [gatewayBId]);
    assert.ok(gwB, 'Gateway B must exist');
    assert.strictEqual(gwB.brand_id, brandBId, 'Gateway B brand_id must still be Brand B');
    assert.strictEqual(gwB.status, 'active', 'Gateway B status must be active');
  });

  // ==========================================================================
  // CATEGORY 5: Billing Manipulation & Integrity Defense
  // ==========================================================================
  console.log('\n--- Category 5: Billing Manipulation & Integrity Defense (Rejection of Invalid Amounts) ---');

  // Baseline Merchant A balance
  const initialUserA = await db.get('SELECT credits FROM users WHERE id = ?', [merchantAId]);
  const initialCreditsA = Number(initialUserA.credits || 0);

  await attackTest('ATK-BILL-01', 'BILLING', 'Submitting amount_credits: 0 to /api/billing/topup rejected (400 INVALID_CREDIT_AMOUNT)', async () => {
    const res = await apiRequest('/api/billing/topup', {
      method: 'POST',
      headers: { Authorization: `Bearer ${merchantAToken}`, 'x-brand-id': brandAId },
      body: { amount_credits: 0 }
    });
    assert.strictEqual(res.status, 400, `Expected 400 Bad Request, got ${res.status}`);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.code, 'INVALID_CREDIT_AMOUNT');
  });

  await attackTest('ATK-BILL-02', 'BILLING', 'Submitting negative amount_credits: -50 rejected (400 INVALID_CREDIT_AMOUNT)', async () => {
    const res = await apiRequest('/api/billing/topup', {
      method: 'POST',
      headers: { Authorization: `Bearer ${merchantAToken}`, 'x-brand-id': brandAId },
      body: { amount_credits: -50 }
    });
    assert.strictEqual(res.status, 400, `Expected 400 Bad Request, got ${res.status}`);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.code, 'INVALID_CREDIT_AMOUNT');
  });

  await attackTest('ATK-BILL-03', 'BILLING', 'Submitting negative amount_credits: -1 rejected (400 INVALID_CREDIT_AMOUNT)', async () => {
    const res = await apiRequest('/api/billing/topup', {
      method: 'POST',
      headers: { Authorization: `Bearer ${merchantAToken}`, 'x-brand-id': brandAId },
      body: { amount_credits: -1 }
    });
    assert.strictEqual(res.status, 400, `Expected 400 Bad Request, got ${res.status}`);
    assert.strictEqual(res.body.code, 'INVALID_CREDIT_AMOUNT');
  });

  await attackTest('ATK-BILL-04', 'BILLING', 'Submitting float negative amount_credits: -0.001 rejected (400 INVALID_CREDIT_AMOUNT)', async () => {
    const res = await apiRequest('/api/billing/topup', {
      method: 'POST',
      headers: { Authorization: `Bearer ${merchantAToken}`, 'x-brand-id': brandAId },
      body: { amount_credits: -0.001 }
    });
    assert.strictEqual(res.status, 400, `Expected 400 Bad Request, got ${res.status}`);
    assert.strictEqual(res.body.code, 'INVALID_CREDIT_AMOUNT');
  });

  await attackTest('ATK-BILL-05', 'BILLING', 'Submitting below-minimum amount_credits: 5 rejected (400 INVALID_CREDIT_AMOUNT)', async () => {
    const res = await apiRequest('/api/billing/topup', {
      method: 'POST',
      headers: { Authorization: `Bearer ${merchantAToken}`, 'x-brand-id': brandAId },
      body: { amount_credits: 5 }
    });
    assert.strictEqual(res.status, 400, `Expected 400 Bad Request, got ${res.status}`);
    assert.strictEqual(res.body.code, 'INVALID_CREDIT_AMOUNT');
  });

  await attackTest('ATK-BILL-06', 'BILLING', 'Submitting non-numeric string "free_credits" rejected (400 INVALID_CREDIT_AMOUNT)', async () => {
    const res = await apiRequest('/api/billing/topup', {
      method: 'POST',
      headers: { Authorization: `Bearer ${merchantAToken}`, 'x-brand-id': brandAId },
      body: { amount_credits: 'free_credits' }
    });
    assert.strictEqual(res.status, 400, `Expected 400 Bad Request, got ${res.status}`);
    assert.strictEqual(res.body.code, 'INVALID_CREDIT_AMOUNT');
  });

  await attackTest('ATK-BILL-07', 'BILLING', 'Submitting unrecognized package_id: "pkg_free_exploit_9999" rejected (400 INVALID_PACKAGE)', async () => {
    const res = await apiRequest('/api/billing/topup', {
      method: 'POST',
      headers: { Authorization: `Bearer ${merchantAToken}`, 'x-brand-id': brandAId },
      body: { package_id: 'pkg_free_exploit_9999' }
    });
    assert.strictEqual(res.status, 400, `Expected 400 Bad Request, got ${res.status}`);
    assert.strictEqual(res.body.code, 'INVALID_PACKAGE');
  });

  await attackTest('ATK-BILL-08', 'BILLING', 'Submitting empty body {} rejected (400 INVALID_CREDIT_AMOUNT)', async () => {
    const res = await apiRequest('/api/billing/topup', {
      method: 'POST',
      headers: { Authorization: `Bearer ${merchantAToken}`, 'x-brand-id': brandAId },
      body: {}
    });
    assert.strictEqual(res.status, 400, `Expected 400 Bad Request, got ${res.status}`);
    assert.strictEqual(res.body.code, 'INVALID_CREDIT_AMOUNT');
  });

  await attackTest('ATK-BILL-09', 'BILLING', 'Verify Merchant A balance did NOT increment or drift after all invalid top-up attacks', async () => {
    const userA = await db.get('SELECT credits FROM users WHERE id = ?', [merchantAId]);
    assert.strictEqual(Number(userA.credits), initialCreditsA, `Credits should remain ${initialCreditsA}, got ${userA.credits}`);
  });

  await attackTest('ATK-BILL-10', 'BILLING', 'Legitimate package top-up increases balance accurately', async () => {
    const res = await apiRequest('/api/billing/topup', {
      method: 'POST',
      headers: { Authorization: `Bearer ${merchantAToken}`, 'x-brand-id': brandAId },
      body: { package_id: 'pkg_starter_50' }
    });
    assert.strictEqual(res.status, 200, `Expected 200 OK, got ${res.status}`);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.topup.credits_added, 50);

    const userA = await db.get('SELECT credits FROM users WHERE id = ?', [merchantAId]);
    assert.strictEqual(Number(userA.credits), initialCreditsA + 50, 'Credits must increment by 50');
  });

  await attackTest('ATK-BILL-11', 'BILLING', 'Legitimate custom amount top-up (amount_credits: 100) increases balance accurately', async () => {
    const res = await apiRequest('/api/billing/topup', {
      method: 'POST',
      headers: { Authorization: `Bearer ${merchantAToken}`, 'x-brand-id': brandAId },
      body: { amount_credits: 100 }
    });
    assert.strictEqual(res.status, 200, `Expected 200 OK, got ${res.status}`);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.topup.credits_added, 100);

    const userA = await db.get('SELECT credits FROM users WHERE id = ?', [merchantAId]);
    assert.strictEqual(Number(userA.credits), initialCreditsA + 150, 'Credits must increment by additional 100');
  });

  await attackTest('ATK-BILL-12', 'BILLING', 'Cross-tenant billing balance query blocked with 403 FORBIDDEN', async () => {
    // Merchant A trying to query billing balance of Brand B
    const res = await apiRequest('/api/billing/balance', {
      headers: { Authorization: `Bearer ${merchantAToken}`, 'x-brand-id': brandBId }
    });
    assert.strictEqual(res.status, 403, `Expected 403 Forbidden, got ${res.status}`);
    assert.strictEqual(res.body.code, 'FORBIDDEN');
  });

  await teardownEnvironment();
}

runPenetrationSuite().catch((err) => {
  console.error('[Fatal Test Failure]', err);
  process.exit(1);
});
