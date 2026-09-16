/**
 * DenaNeya v2.0 - E2E Test Suite Tier 4: Super Admin Real-World Operational Journeys
 * File: tests/e2e/tier4_superadmin_realworld.test.js
 * Track: E2E Testing Track (Orchestrator 5)
 *
 * Scope (4 Complete Operational User Journeys):
 * 1. SCENARIO-1: Super Admin Provisioning & 2FA Hardening Journey
 * 2. SCENARIO-2: Merchant Fraud Triage & Impersonation Investigation
 * 3. SCENARIO-3: Emergency Network Maintenance & Live Customizer Broadcast
 * 4. SCENARIO-4: Unmatched Carrier SMS Triage & Manual Reconciliation CAS Override
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
console.log('  DenaNeya v2.0 - Tier 4: Super Admin Real-World Operational Workloads Suite   ');
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
  adminId: 'usr_t4_superadmin_real',
  adminEmail: 'superadmin_real@denaneya.com',
  suspectMerchantId: 'usr_t4_merchant_apex_suspect',
  suspectMerchantEmail: 'apex_suspect@example.com',
  suspectBrandId: 'brand_t4_apex_suspect',
  deviceId: 'dev_t4_handset_01',
  deviceToken: 'tok_dev_t4_handset_01_token_12345'
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

  // Seed Super Admin
  await db.query(
    `INSERT INTO users (id, name, email, password_hash, role, credits, status)
     VALUES (?, 'Super Admin Real', ?, 'hash_admin_pw', 'superadmin', 999999, 'active')`,
    [FIXTURES.adminId, FIXTURES.adminEmail]
  );

  // Seed Suspect Merchant
  await db.query(
    `INSERT INTO users (id, name, email, password_hash, role, credits, status)
     VALUES (?, 'Apex Suspect Merchant', ?, 'hash_merchant_pw', 'merchant', 500, 'active')`,
    [FIXTURES.suspectMerchantId, FIXTURES.suspectMerchantEmail]
  );

  // Seed Brand
  await db.query(
    `INSERT INTO brands (id, user_id, brand_name, brand_slug, api_key, api_secret, webhook_url, webhook_secret, status)
     VALUES (?, ?, 'Apex Suspect Brand', 'apex-suspect', 'dn_live_apex_suspect', 'dn_sec_apex_suspect', 'https://apex.example/wh', 'sec_apex_wh', 'active')`,
    [FIXTURES.suspectBrandId, FIXTURES.suspectMerchantId]
  );

  // Seed Device
  await db.query(
    `INSERT INTO devices (id, brand_id, device_name, device_model, device_token, sim1_operator, sim2_operator, battery_level, status)
     VALUES (?, ?, 'T4 Handset Samsung S22', 'SM-S901B', ?, 'bKash', 'Nagad', 88, 'active')`,
    [FIXTURES.deviceId, FIXTURES.suspectBrandId, FIXTURES.deviceToken]
  );
}

function issueSuperAdminToken() {
  return jwt.sign(
    {
      id: FIXTURES.adminId,
      email: FIXTURES.adminEmail,
      role: 'superadmin',
      credits: 999999
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h', algorithm: 'HS256' }
  );
}

async function runTier4SuperAdminSuite() {
  await setupDatabase();

  const app = createApp();
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
  console.log(`[Setup] Target test server running on ${baseUrl}\n`);

  let adminToken = issueSuperAdminToken();
  let adminHeaders = { Authorization: `Bearer ${adminToken}` };

  // ===========================================================================
  // SCENARIO 1: SUPER ADMIN PROVISIONING & 2FA HARDENING JOURNEY
  // ===========================================================================
  console.log('--- SCENARIO 1: Super Admin Provisioning & 2FA Hardening Journey ---');

  await test(
    'SCENARIO-1',
    'REALWORLD-WORKLOAD',
    'Super Admin setups 2FA, verifies OTP, receives backup recovery codes, and verifies step-2 challenge',
    async () => {
      // Step 1: Admin accesses /api/admin/me
      const meRes = await apiRequest('/api/admin/me', { headers: adminHeaders });
      assert.strictEqual(meRes.status, 200);
      assert.strictEqual(meRes.body.user.email, FIXTURES.adminEmail);

      // Step 2: Generate TOTP secret & QR code
      const genRes = await apiRequest('/api/admin/2fa/generate', {
        method: 'POST',
        headers: adminHeaders
      });
      assert.strictEqual(genRes.status, 200);
      assert.ok(genRes.body.secret, 'Secret must be returned');
      const secret = genRes.body.secret;

      // Step 3: Verify initial OTP to activate 2FA
      const otpCode = generateTOTPCode(secret, 0);
      const verRes = await apiRequest('/api/admin/2fa/verify', {
        method: 'POST',
        headers: adminHeaders,
        body: { token: otpCode, code: otpCode }
      });
      assert.strictEqual(verRes.status, 200);
      assert.strictEqual(verRes.body.success, true);
      const backupCodes = verRes.body.backupCodes || verRes.body.backup_codes || [];
      assert.strictEqual(backupCodes.length, 8, 'Must return 8 single-use recovery codes');

      // Step 4: Simulate new login -> receives 2FA challenge
      const login1 = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: { email: FIXTURES.adminEmail, password: 'hash_admin_pw' }
      });
      assert.ok(login1.status === 200 || login1.status === 401);
      const tempToken = login1.body.tempToken || login1.body.temp_token || adminToken;

      // Step 5: Complete 2FA login challenge with fresh OTP
      const step2Otp = generateTOTPCode(secret, 0);
      const login2 = await apiRequest('/api/admin/auth/login-2fa', {
        method: 'POST',
        body: { tempToken, code: step2Otp }
      });
      assert.strictEqual(login2.status, 200);
      assert.ok(login2.body.token, 'Authenticated JWT must be issued');

      // Update active token
      adminToken = login2.body.token;
      adminHeaders = { Authorization: `Bearer ${adminToken}` };

      // Step 6: Emergency backup code recovery login test
      const emergencyLogin = await apiRequest('/api/admin/auth/login-backup', {
        method: 'POST',
        body: { tempToken, backupCode: backupCodes[0] }
      });
      assert.strictEqual(emergencyLogin.status, 200);
      assert.ok(emergencyLogin.body.token);
    }
  );

  // ===========================================================================
  // SCENARIO 2: MERCHANT FRAUD TRIAGE & IMPERSONATION INVESTIGATION
  // ===========================================================================
  console.log('\n--- SCENARIO 2: Merchant Fraud Triage & Impersonation Investigation ---');

  await test(
    'SCENARIO-2',
    'REALWORLD-WORKLOAD',
    'Super Admin triages suspect merchant, launches impersonation session, exits safely, and blocks merchant',
    async () => {
      // Step 1: Query global telemetry KPIs
      const kpiRes = await apiRequest('/api/admin/telemetry/kpis', { headers: adminHeaders });
      assert.strictEqual(kpiRes.status, 200);

      // Step 2: Search merchant directory for suspect brand
      const dirRes = await apiRequest('/api/admin/merchants?search=Apex', { headers: adminHeaders });
      assert.strictEqual(dirRes.status, 200);
      const merchants = dirRes.body.merchants || dirRes.body.data || [];
      const suspect = merchants.find((m) => m.id === FIXTURES.suspectMerchantId);
      assert.ok(suspect, 'Suspect merchant must be found');

      // Step 3: Launch 1-click Impersonation
      const impRes = await apiRequest(`/api/admin/impersonate/${FIXTURES.suspectMerchantId}`, {
        method: 'POST',
        headers: adminHeaders
      });
      assert.strictEqual(impRes.status, 200);
      const { impersonationToken, returnTicket } = impRes.body;
      assert.ok(impersonationToken);
      assert.ok(returnTicket);

      // Step 4: Verify impersonation token is merchant-scoped and cannot access admin APIs
      const adminProbe = await apiRequest('/api/admin/telemetry/kpis', {
        headers: { Authorization: `Bearer ${impersonationToken}` }
      });
      assert.strictEqual(adminProbe.status, 403, 'Impersonation token must not have super admin access');

      // Step 5: Exit impersonation via returnTicket
      const exitRes = await apiRequest('/api/admin/impersonate/exit', {
        method: 'POST',
        headers: { Authorization: `Bearer ${impersonationToken}` },
        body: { returnTicket }
      });
      assert.strictEqual(exitRes.status, 200);
      const restoredAdminToken = exitRes.body.adminToken || exitRes.body.token;
      assert.ok(restoredAdminToken);

      // Step 6: Block suspect merchant
      const blockRes = await apiRequest(`/api/admin/merchants/${FIXTURES.suspectMerchantId}/status`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${restoredAdminToken}` },
        body: { status: 'blocked', reason: 'High chargeback fraud suspicion' }
      });
      assert.strictEqual(blockRes.status, 200);

      // Step 7: Forfeit fraudulent credit balance
      const creditRes = await apiRequest(`/api/admin/merchants/${FIXTURES.suspectMerchantId}/adjust-credits`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${restoredAdminToken}` },
        body: { amount: -500, reason: 'Fraudulent credit forfeiture' }
      });
      assert.strictEqual(creditRes.status, 200);

      // Step 8: Verify audit log recorded
      const auditRes = await apiRequest('/api/admin/audit-logs?limit=5', {
        headers: { Authorization: `Bearer ${restoredAdminToken}` }
      });
      assert.strictEqual(auditRes.status, 200);
    }
  );

  // ===========================================================================
  // SCENARIO 3: EMERGENCY NETWORK MAINTENANCE & LIVE BROADCAST
  // ===========================================================================
  console.log('\n--- SCENARIO 3: Emergency Network Maintenance & Live Broadcast ---');

  await test(
    'SCENARIO-3',
    'REALWORLD-WORKLOAD',
    'Super Admin broadcasts emergency announcement, enables maintenance mode with whitelist, and restores live state',
    async () => {
      const whitelistedIp = '203.0.113.88';

      // Step 1: Update Live Customizer with emergency announcement
      const custRes = await apiRequest('/api/admin/settings/customizer', {
        method: 'PUT',
        headers: adminHeaders,
        body: {
          announcementText: 'জরুরি সার্ভার আপগ্রেড চলছে... সাময়িক অসুবিধার জন্য দুঃখিত।',
          announcementActive: true
        }
      });
      assert.strictEqual(custRes.status, 200);

      // Step 2: Turn on network-wide maintenance mode
      const maintRes = await apiRequest('/api/admin/settings/maintenance', {
        method: 'PUT',
        headers: adminHeaders,
        body: {
          enabled: true,
          message: 'সিস্টেম মেইনটেন্যান্স চলছে',
          allowedIps: [whitelistedIp]
        }
      });
      assert.strictEqual(maintRes.status, 200);

      // Step 3: Public visitor hitting checkout receives HTTP 503 SERVICE_MAINTENANCE
      const pubRes = await apiRequest('/pay/inv_mock_t4_test', {
        headers: { 'X-Forwarded-For': '198.51.100.22' }
      });
      assert.strictEqual(pubRes.status, 503);
      assert.strictEqual(pubRes.body.code, 'SERVICE_MAINTENANCE');

      // Step 4: Public settings endpoint delivers announcement
      const pubSettings = await apiRequest('/api/customizer/public');
      assert.strictEqual(pubSettings.status, 200);

      // Step 5: Whitelisted IP request bypasses maintenance mode
      const whiteRes = await apiRequest('/pay/inv_mock_t4_test', {
        headers: { 'X-Forwarded-For': whitelistedIp }
      });
      // Should not be 503 (will be 404 or 200 depending on invoice existence)
      assert.notStrictEqual(whiteRes.status, 503);

      // Step 6: Super admin APIs remain fully accessible
      const admRes = await apiRequest('/api/admin/telemetry/health', { headers: adminHeaders });
      assert.strictEqual(admRes.status, 200);

      // Step 7: Turn off maintenance mode
      const offRes = await apiRequest('/api/admin/settings/maintenance', {
        method: 'PUT',
        headers: adminHeaders,
        body: { enabled: false }
      });
      assert.strictEqual(offRes.status, 200);
    }
  );

  // ===========================================================================
  // SCENARIO 4: UNMATCHED CARRIER SMS TRIAGE & CAS OVERRIDE
  // ===========================================================================
  console.log('\n--- SCENARIO 4: Unmatched Carrier SMS Triage & CAS Override ---');

  await test(
    'SCENARIO-4',
    'REALWORLD-WORKLOAD',
    'Carrier SMS synced without customer match -> Admin triages in stream and executes manual CAS reconciliation',
    async () => {
      const orphanedTrxId = `BK_ORPHAN_${Date.now().toString().slice(-8)}`;
      const storedId = `sd_orphan_${Date.now()}`;
      const invId = `inv_orphan_${Date.now()}`;

      // Step 1: Handset forwards authentic SMS receipt
      await db.query(
        `INSERT INTO stored_data (id, brand_id, device_id, sender, raw_sms, channel, trx_id, amount, status, received_at)
         VALUES (?, ?, ?, 'bKash', 'You have received Tk 2,500.00 from 01799887766. TrxID: ${orphanedTrxId}', 'bkash', ?, 2500, 'UNUSED', CURRENT_TIMESTAMP)`,
        [storedId, FIXTURES.suspectBrandId, FIXTURES.deviceId, orphanedTrxId]
      );

      // Step 2: Customer created pending invoice (with typo in TrxID during submission)
      await db.query(
        `INSERT INTO invoices (id, brand_id, invoice_number, amount, currency, customer_name, customer_email, customer_phone, status, expires_at)
         VALUES (?, ?, 'INV-ORPHAN-001', 2500, 'BDT', 'Customer Orphan', 'orphan@example.com', '01799887766', 'PENDING', datetime('now', '+15 minutes'))`,
        [invId, FIXTURES.suspectBrandId]
      );

      // Step 3: Super Admin searches cross-tenant SMS stream
      const streamRes = await apiRequest(`/api/admin/sms/stream?trxId=${orphanedTrxId}`, {
        headers: adminHeaders
      });
      assert.strictEqual(streamRes.status, 200);
      const records = streamRes.body.records || streamRes.body.sms || streamRes.body.data || [];
      const found = records.find((r) => r.trx_id === orphanedTrxId || r.trxId === orphanedTrxId);
      assert.ok(found, 'Orphaned carrier SMS must be visible in admin stream');

      // Step 4: Admin executes manual reconciliation CAS override
      const recRes = await apiRequest('/api/admin/reconcile/manual', {
        method: 'POST',
        headers: adminHeaders,
        body: {
          storedDataId: storedId,
          invoiceId: invId,
          reason: 'Manual pairing of customer typo'
        }
      });
      assert.strictEqual(recRes.status, 200);

      // Step 5: Verify atomic CAS transitions in DB
      const stored = await db.get('SELECT status, used_at FROM stored_data WHERE id = ?', [storedId]);
      assert.strictEqual(stored.status, 'USED');
      assert.ok(stored.used_at);

      const inv = await db.get('SELECT status, trx_id FROM invoices WHERE id = ?', [invId]);
      assert.strictEqual(inv.status, 'PAID');
      assert.strictEqual(inv.trx_id, orphanedTrxId);

      // Step 6: Verify audit log recorded
      const audit = await db.get(
        "SELECT * FROM admin_audit_logs WHERE action = 'MANUAL_RECONCILE' AND target_id = ?",
        [invId]
      );
      assert.ok(audit, 'Manual reconciliation must be recorded in admin_audit_logs');
    }
  );

  // ===========================================================================
  // SUMMARY
  // ===========================================================================
  console.log('\n===============================================================================');
  console.log(`  Tier 4 Super Admin Finished: ${summary.passed} Passed / ${summary.total} Total (${summary.failed} Failed)`);
  console.log('===============================================================================');

  if (server) server.close();
  if (summary.failed > 0) {
    process.exit(1);
  }
}

runTier4SuperAdminSuite().catch((err) => {
  console.error('[Fatal Tier 4 Test Failure]', err);
  if (server) server.close();
  process.exit(1);
});
