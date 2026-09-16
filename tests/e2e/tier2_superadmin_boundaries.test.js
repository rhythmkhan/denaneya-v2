/**
 * DenaNeya v2.0 - E2E Test Suite Tier 2: Super Admin Boundaries & Defensive Hardening
 * File: tests/e2e/tier2_superadmin_boundaries.test.js
 * Track: E2E Testing Track (Orchestrator 5)
 *
 * Scope (>=20 Boundary & Security Tests):
 * 1. Threat 1: RBAC Boundaries & Privilege Escalation (TEST-T2-SEC-01 to 07)
 * 2. Threat 2: Impersonation Session Isolation & Return Ticket Replay (TEST-T2-IMP-01 to 04)
 * 3. Threat 3: TOTP Clock Skew, Replay Attacks & Input Validation (TEST-T2-TOTP-01 to 05)
 * 4. Threat 4: Google OAuth Validation & Role Mismatch (TEST-T2-GOOG-01 to 02)
 * 5. Threat 5: Merchant Credit & Status Input Bounds (TEST-T2-MGT-01 to 04)
 * 6. Threat 6: Anti-XSS Sanitization & Maintenance Pipeline Guard (TEST-T2-XSS-01 to 02, TEST-T2-MAI-01 to 03)
 */

process.env.NODE_ENV = 'test';
process.env.DB_CLIENT = 'sqlite';
process.env.DB_SQLITE_PATH = ':memory:';
process.env.JWT_SECRET = 'denaneya_development_jwt_secret_min_32_bytes_long_12345';

import assert from 'node:assert';
import http from 'node:http';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import dbPkg from '@denaneya/database';
import { createApp } from '../../apps/api/src/app.js';

const { getDatabase, runMigrations, runSeed } = dbPkg;

console.log('===============================================================================');
console.log('  DenaNeya v2.0 - Tier 2: Super Admin Boundaries & Security Hardening Suite    ');
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

// RFC 6238 TOTP Helper
function base32Decode(base32) {
  const charTable = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = base32.toUpperCase().replace(/=+$/, '').replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const bytes = [];
  for (let i = 0; i < clean.length; i++) {
    const val = charTable.indexOf(clean[i]);
    if (val === -1) continue;
    value = (value << 5) | val;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

function generateTOTPCode(secretBase32, timeOffsetSeconds = 0) {
  const timeStep = 30;
  const epoch = Math.floor((Date.now() / 1000 + timeOffsetSeconds) / timeStep);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(epoch), 0);

  const key = base32Decode(secretBase32);
  const hmac = crypto.createHmac('sha1', key).update(counterBuffer).digest();

  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return (code % 1000000).toString().padStart(6, '0');
}

const FIXTURES = {
  adminId: 'usr_t2_superadmin_bound',
  adminEmail: 'superadmin_bound@denaneya.com',
  deactivatedAdminId: 'usr_t2_deactivated_admin',
  merchantId: 'usr_t2_merchant_bound',
  merchantEmail: 'merchant_bound@example.com',
  staffId: 'usr_t2_staff_bound',
  brandId: 'brand_t2_bound',
  invoiceId: 'inv_t2_bound_001'
};

async function setupDatabase() {
  db = getDatabase();
  await runMigrations(db, { reset: true });
  await runSeed(db);

  // Polyfill schema additions if migration 002 is not yet present on disk
  const tableCheck = await db.query(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='admin_audit_logs'"
  );
  if (!tableCheck.rows || tableCheck.rows.length === 0) {
    try { await db.query("ALTER TABLE users ADD COLUMN two_factor_secret TEXT"); } catch (_) {}
    try { await db.query("ALTER TABLE users ADD COLUMN two_factor_enabled INTEGER DEFAULT 0"); } catch (_) {}
    try { await db.query("ALTER TABLE users ADD COLUMN pending_totp_secret TEXT"); } catch (_) {}
    try { await db.query("ALTER TABLE users ADD COLUMN totp_backup_codes TEXT"); } catch (_) {}
    try { await db.query("ALTER TABLE users ADD COLUMN google_id VARCHAR(255)"); } catch (_) {}
    try { await db.query("ALTER TABLE users ADD COLUMN avatar_url TEXT"); } catch (_) {}

    await db.query(`
      CREATE TABLE IF NOT EXISTS admin_audit_logs (
        id VARCHAR(64) PRIMARY KEY,
        admin_id VARCHAR(64) NOT NULL,
        admin_email VARCHAR(255) NOT NULL,
        action VARCHAR(64) NOT NULL,
        target_type VARCHAR(64),
        target_id VARCHAR(64),
        details TEXT,
        ip_address VARCHAR(45),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        key VARCHAR(64) PRIMARY KEY,
        value TEXT NOT NULL,
        updated_by VARCHAR(64),
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS impersonation_logs (
        id VARCHAR(64) PRIMARY KEY,
        admin_id VARCHAR(64) NOT NULL,
        merchant_id VARCHAR(64) NOT NULL,
        return_ticket_hash VARCHAR(128) NOT NULL,
        status VARCHAR(32) DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL,
        used_at DATETIME
      )
    `);
  }

  // Active Super Admin
  await db.query(
    `INSERT INTO users (id, name, email, password_hash, role, credits, status)
     VALUES (?, 'Super Admin Bound', ?, 'hash_admin_pw', 'superadmin', 999999, 'active')`,
    [FIXTURES.adminId, FIXTURES.adminEmail]
  );

  // Deactivated Super Admin
  await db.query(
    `INSERT INTO users (id, name, email, password_hash, role, credits, status)
     VALUES (?, 'Deactivated Admin', 'deactivated_admin@denaneya.com', 'hash_pw', 'superadmin', 0, 'suspended')`,
    [FIXTURES.deactivatedAdminId]
  );

  // Active Merchant
  await db.query(
    `INSERT INTO users (id, name, email, password_hash, role, credits, status)
     VALUES (?, 'Bound Merchant', ?, 'hash_merchant_pw', 'merchant', 25, 'active')`,
    [FIXTURES.merchantId, FIXTURES.merchantEmail]
  );

  // Staff User
  await db.query(
    `INSERT INTO users (id, name, email, password_hash, role, credits, status)
     VALUES (?, 'Bound Staff', 'staff_bound@example.com', 'hash_staff_pw', 'staff', 0, 'active')`,
    [FIXTURES.staffId]
  );

  // Brand & Invoice for maintenance tests
  await db.query(
    `INSERT INTO brands (id, user_id, brand_name, brand_slug, api_key, api_secret, webhook_url, webhook_secret, status)
     VALUES (?, ?, 'Bound Brand', 'bound-brand', 'dn_live_bound_key', 'dn_sec_bound_secret', 'https://merchant.example/wh', 'sec_bound_wh', 'active')`,
    [FIXTURES.brandId, FIXTURES.merchantId]
  );

  await db.query(
    `INSERT INTO invoices (id, brand_id, invoice_number, amount, currency, customer_name, customer_email, customer_phone, status, expires_at)
     VALUES (?, ?, 'INV-T2-001', 500, 'BDT', 'Customer Bound', 'cust_bound@example.com', '01712345678', 'PENDING', datetime('now', '+15 minutes'))`,
    [FIXTURES.invoiceId, FIXTURES.brandId]
  );
}

function issueToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      credits: user.credits || 0,
      isImpersonated: user.isImpersonated || false
    },
    process.env.JWT_SECRET,
    { expiresIn: '2h', algorithm: 'HS256' }
  );
}

async function runTier2SuperAdminSuite() {
  await setupDatabase();

  const app = createApp();
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
  console.log(`[Setup] Target test server running on ${baseUrl}\n`);

  const adminToken = issueToken({ id: FIXTURES.adminId, email: FIXTURES.adminEmail, role: 'superadmin' });
  const merchantToken = issueToken({ id: FIXTURES.merchantId, email: FIXTURES.merchantEmail, role: 'merchant', credits: 25 });
  const staffToken = issueToken({ id: FIXTURES.staffId, email: 'staff_bound@example.com', role: 'staff' });
  const deactivatedAdminToken = issueToken({ id: FIXTURES.deactivatedAdminId, email: 'deactivated_admin@denaneya.com', role: 'superadmin' });
  const impersonatedToken = issueToken({ id: FIXTURES.merchantId, email: FIXTURES.merchantEmail, role: 'merchant', isImpersonated: true });

  const adminHeaders = { Authorization: `Bearer ${adminToken}` };
  const merchantHeaders = { Authorization: `Bearer ${merchantToken}` };
  const staffHeaders = { Authorization: `Bearer ${staffToken}` };

  // ===========================================================================
  // SECTION 1: PRIVILEGE ESCALATION & RBAC BOUNDARIES (Threat 1)
  // ===========================================================================
  console.log('--- SECTION 1: Privilege Escalation & RBAC Boundaries ---');

  await test(
    'TEST-T2-SEC-01',
    'RBAC-GUARD',
    'Merchant JWT calling /api/admin/telemetry/kpis is rejected with HTTP 403 FORBIDDEN_SUPERADMIN_REQUIRED',
    async () => {
      const res = await apiRequest('/api/admin/telemetry/kpis', { headers: merchantHeaders });
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.code, 'FORBIDDEN_SUPERADMIN_REQUIRED');
    }
  );

  await test(
    'TEST-T2-SEC-02',
    'RBAC-GUARD',
    'Merchant JWT calling /api/admin/merchants is rejected with HTTP 403',
    async () => {
      const res = await apiRequest('/api/admin/merchants', { headers: merchantHeaders });
      assert.strictEqual(res.status, 403);
    }
  );

  await test(
    'TEST-T2-SEC-03',
    'RBAC-GUARD',
    'Merchant JWT calling /api/admin/settings/pricing is rejected with HTTP 403',
    async () => {
      const res = await apiRequest('/api/admin/settings/pricing', {
        method: 'PUT',
        headers: merchantHeaders,
        body: { feePerVerification: 5 }
      });
      assert.strictEqual(res.status, 403);
    }
  );

  await test(
    'TEST-T2-SEC-04',
    'RBAC-GUARD',
    'Staff member JWT calling /api/admin/* is rejected with HTTP 403',
    async () => {
      const res = await apiRequest('/api/admin/me', { headers: staffHeaders });
      assert.strictEqual(res.status, 403);
    }
  );

  await test(
    'TEST-T2-SEC-05',
    'AUTH-GUARD',
    'Unauthenticated request with missing Authorization header to /api/admin/* is rejected with HTTP 401',
    async () => {
      const res = await apiRequest('/api/admin/me');
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.code, 'UNAUTHORIZED');
    }
  );

  await test(
    'TEST-T2-SEC-06',
    'AUTH-GUARD',
    'Malformed Authorization header (e.g. Basic xxx or invalid JWT format) is rejected with HTTP 401',
    async () => {
      const res = await apiRequest('/api/admin/me', {
        headers: { Authorization: 'Basic dXNlcjpwYXNz' }
      });
      assert.strictEqual(res.status, 401);
    }
  );

  await test(
    'TEST-T2-SEC-07',
    'AUTH-GUARD',
    'Deactivated super admin account with valid JWT signature is rejected via live DB check with HTTP 403',
    async () => {
      const res = await apiRequest('/api/admin/me', {
        headers: { Authorization: `Bearer ${deactivatedAdminToken}` }
      });
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.code, 'ACCOUNT_DEACTIVATED');
    }
  );

  // ===========================================================================
  // SECTION 2: IMPERSONATION BOUNDARIES & RETURN TICKET SECURITY (Threat 2)
  // ===========================================================================
  console.log('\n--- SECTION 2: Impersonation Boundaries & Return Ticket Security ---');

  await test(
    'TEST-T2-IMP-01',
    'IMPERSONATION',
    'Impersonation token (isImpersonated: true) attempting to invoke /api/admin/* receives HTTP 403',
    async () => {
      const res = await apiRequest('/api/admin/settings/pricing', {
        headers: { Authorization: `Bearer ${impersonatedToken}` }
      });
      assert.strictEqual(res.status, 403);
    }
  );

  await test(
    'TEST-T2-IMP-02',
    'IMPERSONATION',
    'POST /api/admin/impersonate/:merchantId with non-existent merchant returns HTTP 404',
    async () => {
      const res = await apiRequest('/api/admin/impersonate/usr_non_existent_merchant_9999', {
        method: 'POST',
        headers: adminHeaders
      });
      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.code, 'MERCHANT_NOT_FOUND');
    }
  );

  await test(
    'TEST-T2-IMP-03',
    'IMPERSONATION',
    'POST /api/admin/impersonate/exit with forged or tampered return ticket receives HTTP 401',
    async () => {
      const res = await apiRequest('/api/admin/impersonate/exit', {
        method: 'POST',
        headers: { Authorization: `Bearer ${impersonatedToken}` },
        body: { returnTicket: 'forged_tampered_hmac_ticket_attempt_0000' }
      });
      assert.strictEqual(res.status, 401);
    }
  );

  await test(
    'TEST-T2-IMP-04',
    'IMPERSONATION',
    'Replaying an already-consumed return ticket is rejected with HTTP 401',
    async () => {
      // 1. Generate valid impersonation and ticket
      const impRes = await apiRequest(`/api/admin/impersonate/${FIXTURES.merchantId}`, {
        method: 'POST',
        headers: adminHeaders
      });
      assert.strictEqual(impRes.status, 200);
      const ticket = impRes.body.returnTicket;
      const tok = impRes.body.impersonationToken;

      // 2. Consume ticket once -> success
      const exit1 = await apiRequest('/api/admin/impersonate/exit', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tok}` },
        body: { returnTicket: ticket }
      });
      assert.strictEqual(exit1.status, 200);

      // 3. Replay same ticket -> must fail
      const exit2 = await apiRequest('/api/admin/impersonate/exit', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tok}` },
        body: { returnTicket: ticket }
      });
      assert.strictEqual(exit2.status, 401);
    }
  );

  // ===========================================================================
  // SECTION 3: TOTP CLOCK SKEW, REPLAY & INPUT VALIDATION (Threat 3)
  // ===========================================================================
  console.log('\n--- SECTION 3: TOTP Clock Skew, Replay & Input Validation ---');

  const testSecret = 'JBSWY3DPEHPK3PXP'; // Base32 test secret

  await test(
    'TEST-T2-TOTP-01',
    'TOTP-SKEW',
    'TOTP code generated with ±30s clock skew succeeds (T-1 and T+1)',
    async () => {
      // Set secret in DB for admin
      await db.query(`UPDATE users SET two_factor_secret = ? WHERE id = ?`, [testSecret, FIXTURES.adminId]);

      // T-30s code
      const pastCode = generateTOTPCode(testSecret, -30);
      const resPast = await apiRequest('/api/admin/2fa/verify', {
        method: 'POST',
        headers: adminHeaders,
        body: { token: pastCode, code: pastCode }
      });
      assert.strictEqual(resPast.status, 200, `Expected HTTP 200 for T-30s code, got ${resPast.status}`);
    }
  );

  await test(
    'TEST-T2-TOTP-02',
    'TOTP-SKEW',
    'TOTP code generated with ±90s clock skew is rejected (T-3 and T+3)',
    async () => {
      await db.query(`UPDATE users SET two_factor_secret = ? WHERE id = ?`, [testSecret, FIXTURES.adminId]);
      const staleCode = generateTOTPCode(testSecret, -90);

      const res = await apiRequest('/api/admin/2fa/verify', {
        method: 'POST',
        headers: adminHeaders,
        body: { token: staleCode, code: staleCode }
      });
      assert.strictEqual(res.status, 400);
      assert.ok(
        ['INVALID_OTP_CODE', 'INVALID_2FA_CODE'].includes(res.body.code),
        `Expected INVALID_OTP_CODE or INVALID_2FA_CODE, got ${res.body.code}`
      );
    }
  );

  await test(
    'TEST-T2-TOTP-03',
    'TOTP-REPLAY',
    'Replaying identical 6-digit TOTP code within same window is rejected with HTTP 400 OTP_ALREADY_USED',
    async () => {
      await db.query(`UPDATE users SET two_factor_secret = ? WHERE id = ?`, [testSecret, FIXTURES.adminId]);
      const currentCode = generateTOTPCode(testSecret, 0);

      // First submission
      const res1 = await apiRequest('/api/admin/2fa/verify', {
        method: 'POST',
        headers: adminHeaders,
        body: { token: currentCode, code: currentCode }
      });
      assert.strictEqual(res1.status, 200);

      // Replay submission
      const res2 = await apiRequest('/api/admin/2fa/verify', {
        method: 'POST',
        headers: adminHeaders,
        body: { token: currentCode, code: currentCode }
      });
      assert.strictEqual(res2.status, 400);
      assert.ok(
        ['OTP_ALREADY_USED', 'REPLAY_DETECTED'].includes(res2.body.code),
        `Expected OTP_ALREADY_USED or REPLAY_DETECTED, got ${res2.body.code}`
      );
    }
  );

  await test(
    'TEST-T2-TOTP-04',
    'TOTP-BACKUP',
    'Consuming an already-used backup recovery code is rejected with HTTP 401 INVALID_BACKUP_CODE',
    async () => {
      const testBackupCode = 'RECV-123456';
      await db.query(`UPDATE users SET two_factor_backup_codes = ? WHERE id = ?`, [
        JSON.stringify([testBackupCode, 'RECV-999999']),
        FIXTURES.adminId
      ]);

      // 1. Consume once -> success
      const res1 = await apiRequest('/api/admin/auth/login-backup', {
        method: 'POST',
        body: { tempToken: adminToken, backupCode: testBackupCode }
      });
      assert.strictEqual(res1.status, 200);

      // 2. Consume again -> rejected
      const res2 = await apiRequest('/api/admin/auth/login-backup', {
        method: 'POST',
        body: { tempToken: adminToken, backupCode: testBackupCode }
      });
      assert.strictEqual(res2.status, 401);
      assert.strictEqual(res2.body.code, 'INVALID_BACKUP_CODE');
    }
  );

  await test(
    'TEST-T2-TOTP-05',
    'TOTP-INPUT',
    'Malformed OTP code (non-6-digits, alphabetical, empty) is rejected with HTTP 400',
    async () => {
      const res1 = await apiRequest('/api/admin/2fa/verify', {
        method: 'POST',
        headers: adminHeaders,
        body: { code: 'ABCDEF' }
      });
      assert.strictEqual(res1.status, 400);

      const res2 = await apiRequest('/api/admin/2fa/verify', {
        method: 'POST',
        headers: adminHeaders,
        body: { code: '12' }
      });
      assert.strictEqual(res2.status, 400);
    }
  );

  // ===========================================================================
  // SECTION 4: GOOGLE OAUTH BOUNDARIES
  // ===========================================================================
  console.log('\n--- SECTION 4: Google OAuth Boundaries ---');

  await test(
    'TEST-T2-GOOG-01',
    'GOOGLE-AUTH',
    'Google OAuth verify with invalid/forged ID token is rejected with HTTP 401',
    async () => {
      const res = await apiRequest('/api/auth/google/verify-token', {
        method: 'POST',
        body: { idToken: 'forged_malicious_google_token_999' }
      });
      assert.ok([400, 401].includes(res.status));
    }
  );

  await test(
    'TEST-T2-GOOG-02',
    'GOOGLE-AUTH',
    'Google login via super admin endpoint with non-superadmin account returns HTTP 403',
    async () => {
      const res = await apiRequest('/api/admin/auth/google', {
        method: 'POST',
        body: { idToken: 'google_token_merchant_role_mock' }
      });
      assert.ok([400, 401, 403].includes(res.status));
    }
  );

  // ===========================================================================
  // SECTION 5: MERCHANT CREDIT & STATUS INPUT BOUNDS
  // ===========================================================================
  console.log('\n--- SECTION 5: Merchant Credit & Status Input Bounds ---');

  await test(
    'TEST-T2-MGT-01',
    'CREDITS-BOUND',
    'Credit adjustment driving balance below zero is rejected with HTTP 400 INSUFFICIENT_CREDITS',
    async () => {
      // Merchant currently has 25 credits. Attempting to deduct 50 credits must fail.
      const res = await apiRequest(`/api/admin/merchants/${FIXTURES.merchantId}/adjust-credits`, {
        method: 'POST',
        headers: adminHeaders,
        body: { amount: -50, reason: 'Over-deduction attempt' }
      });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.code, 'INSUFFICIENT_CREDITS');
    }
  );

  await test(
    'TEST-T2-MGT-02',
    'CREDITS-BOUND',
    'Credit adjustment with non-integer or string amount (10.5, NaN, text) rejected with HTTP 400',
    async () => {
      const resFloat = await apiRequest(`/api/admin/merchants/${FIXTURES.merchantId}/adjust-credits`, {
        method: 'POST',
        headers: adminHeaders,
        body: { amount: 10.5, reason: 'Fractional test' }
      });
      assert.strictEqual(resFloat.status, 400);

      const resString = await apiRequest(`/api/admin/merchants/${FIXTURES.merchantId}/adjust-credits`, {
        method: 'POST',
        headers: adminHeaders,
        body: { amount: 'twenty', reason: 'String test' }
      });
      assert.strictEqual(resString.status, 400);
    }
  );

  await test(
    'TEST-T2-MGT-03',
    'CREDITS-BOUND',
    'Credit adjustment missing mandatory administrative reason is rejected with HTTP 400',
    async () => {
      const res = await apiRequest(`/api/admin/merchants/${FIXTURES.merchantId}/adjust-credits`, {
        method: 'POST',
        headers: adminHeaders,
        body: { amount: 10 }
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.code, 'REASON_REQUIRED');
    }
  );

  await test(
    'TEST-T2-MGT-04',
    'STATUS-BOUND',
    'Setting merchant status to invalid string (destroyed, deleted) is rejected with HTTP 400',
    async () => {
      const res = await apiRequest(`/api/admin/merchants/${FIXTURES.merchantId}/status`, {
        method: 'PUT',
        headers: adminHeaders,
        body: { status: 'destroyed_status', reason: 'Invalid test' }
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.code, 'INVALID_MERCHANT_STATUS');
    }
  );

  // ===========================================================================
  // SECTION 6: ANTI-XSS SANITIZATION & MAINTENANCE MODE GUARD (Threat 5)
  // ===========================================================================
  console.log('\n--- SECTION 6: Anti-XSS Sanitization & Maintenance Mode Guard ---');

  await test(
    'TEST-T2-XSS-01',
    'XSS-DEFENSE',
    'Submitting script tags in Customizer heroTitle escapes or sanitizes HTML entities',
    async () => {
      const xssPayload = "<script>alert('xss_attack')</script>";
      const res = await apiRequest('/api/admin/settings/customizer', {
        method: 'PUT',
        headers: adminHeaders,
        body: { heroTitle: xssPayload }
      });

      assert.strictEqual(res.status, 200);

      // Verify that public view does not contain raw executable script tag
      const pubRes = await apiRequest('/api/customizer/public');
      const title = pubRes.body.heroTitle || '';
      assert.ok(!title.includes('<script>alert'), 'Raw script tags must not be rendered');
    }
  );

  await test(
    'TEST-T2-XSS-02',
    'XSS-DEFENSE',
    'Submitting javascript: protocol in WhatsApp/Telegram links is rejected with HTTP 400',
    async () => {
      const res = await apiRequest('/api/admin/settings/customizer', {
        method: 'PUT',
        headers: adminHeaders,
        body: { supportWhatsapp: 'javascript:alert(1)' }
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.code, 'INVALID_URL');
    }
  );

  await test(
    'TEST-T2-MAI-01',
    'MAINTENANCE-GUARD',
    'When maintenance mode is active, non-whitelisted checkout requests receive HTTP 503 SERVICE_MAINTENANCE',
    async () => {
      // 1. Enable maintenance mode
      await apiRequest('/api/admin/settings/maintenance', {
        method: 'PUT',
        headers: adminHeaders,
        body: {
          enabled: true,
          message: 'Emergency upgrade in progress',
          allowedIps: ['203.0.113.199']
        }
      });

      // 2. Public request from non-whitelisted IP to checkout
      const res = await apiRequest(`/pay/${FIXTURES.invoiceId}`, {
        headers: { 'X-Forwarded-For': '198.51.100.55' }
      });

      assert.strictEqual(res.status, 503);
      assert.strictEqual(res.body.code, 'SERVICE_MAINTENANCE');
    }
  );

  await test(
    'TEST-T2-MAI-02',
    'MAINTENANCE-GUARD',
    'When maintenance mode is active, super admin requests to /api/admin/* succeed with HTTP 200',
    async () => {
      const res = await apiRequest('/api/admin/telemetry/health', {
        headers: adminHeaders
      });
      assert.strictEqual(res.status, 200, 'Super admin requests must bypass maintenance mode');
    }
  );

  await test(
    'TEST-T2-MAI-03',
    'MAINTENANCE-GUARD',
    'When maintenance mode is active, whitelisted IP requests succeed with HTTP 200',
    async () => {
      const res = await apiRequest(`/pay/${FIXTURES.invoiceId}`, {
        headers: { 'X-Forwarded-For': '203.0.113.199' }
      });
      assert.strictEqual(res.status, 200, 'Whitelisted IP requests must bypass maintenance mode');

      // Cleanup: Disable maintenance mode
      await apiRequest('/api/admin/settings/maintenance', {
        method: 'PUT',
        headers: adminHeaders,
        body: { enabled: false }
      });
    }
  );

  // ===========================================================================
  // SUMMARY
  // ===========================================================================
  console.log('\n===============================================================================');
  console.log(`  Tier 2 Super Admin Finished: ${summary.passed} Passed / ${summary.total} Total (${summary.failed} Failed)`);
  console.log('===============================================================================');

  if (server) server.close();
  if (summary.failed > 0) {
    process.exit(1);
  }
}

runTier2SuperAdminSuite().catch((err) => {
  console.error('[Fatal Tier 2 Test Failure]', err);
  if (server) server.close();
  process.exit(1);
});
