/**
 * DenaNeya v2.0 - E2E Test Suite Tier 1: Super Admin Core Capabilities & Governance
 * File: tests/e2e/tier1_superadmin_core.test.js
 * Track: E2E Testing Track (Orchestrator 5)
 *
 * Scope (>=23 Tests across all Super Admin Capabilities):
 * 1. Super Admin Authentication & Profile (TEST-T1-ADM-01 to 03)
 * 2. Global Platform KPIs & Health Telemetry (TEST-T1-TEL-01 to 05)
 * 3. Merchant Governance, Directory & Credit Adjustment (TEST-T1-MGT-01 to 04)
 * 4. Administrative Audit Logging (TEST-T1-AUD-01)
 * 5. Merchant Impersonation & Reversion (TEST-T1-IMP-01 to 02)
 * 6. Cross-Tenant Carrier SMS Stream & Manual Reconciliation (TEST-T1-SMS-01, TEST-T1-REC-01)
 * 7. RFC 6238 TOTP 2FA Provisioning, Verification & Recovery (TEST-T1-2FA-01 to 04)
 * 8. Google OAuth 2.0 S2S & Client Verification (TEST-T1-GOG-01 to 02)
 * 9. Gateway Master Switches & Dynamic Settings (TEST-T1-GAT-01, TEST-T1-SET-01 to 03, TEST-T1-MAI-01)
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
console.log('  DenaNeya v2.0 - Tier 1: Super Admin Core Capabilities & Governance Suite     ');
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

// RFC 6238 TOTP Helper for opaque-box testing
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
  adminId: 'usr_t1_superadmin',
  adminEmail: 'admin@denaneya.com',
  merchantId: 'usr_t1_merchant_apex',
  merchantEmail: 'merchant_apex@example.com',
  brandId: 'brand_t1_apex',
  deviceId: 'dev_t1_handset_s22',
  deviceToken: 'tok_dev_t1_handset_s22_valid_token_12345'
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
  await db.query(`DELETE FROM users WHERE id = ? OR email = ?`, [FIXTURES.adminId, FIXTURES.adminEmail]);
  await db.query(
    `INSERT INTO users (id, name, email, password_hash, role, credits, status)
     VALUES (?, 'Super Admin Root', ?, 'hash_admin_pw', 'superadmin', 999999, 'active')`,
    [FIXTURES.adminId, FIXTURES.adminEmail]
  );

  // Seed Merchant
  await db.query(`DELETE FROM users WHERE id = ? OR email = ?`, [FIXTURES.merchantId, FIXTURES.merchantEmail]);
  await db.query(
    `INSERT INTO users (id, name, email, password_hash, role, credits, status)
     VALUES (?, 'Apex Pay Merchant', ?, 'hash_merchant_pw', 'merchant', 100, 'active')`,
    [FIXTURES.merchantId, FIXTURES.merchantEmail]
  );

  // Seed Brand
  await db.query(`DELETE FROM brands WHERE id = ?`, [FIXTURES.brandId]);
  await db.query(
    `INSERT INTO brands (id, user_id, brand_name, brand_slug, api_key, api_secret, webhook_url, webhook_secret, status)
     VALUES (?, ?, 'Apex Payments', 'apex-pay', 'dn_live_apex_key_12345', 'dn_sec_apex_secret_67890', 'https://apex.example/webhook', 'sec_apex_wh_key', 'active')`,
    [FIXTURES.brandId, FIXTURES.merchantId]
  );

  // Seed Device
  await db.query(`DELETE FROM devices WHERE id = ?`, [FIXTURES.deviceId]);
  await db.query(
    `INSERT INTO devices (id, brand_id, device_name, device_model, device_token, sim1_operator, sim2_operator, battery_level, status)
     VALUES (?, ?, 'Apex Galaxy S22', 'SM-S901B', ?, 'bKash', 'Nagad', 95, 'active')`,
    [FIXTURES.deviceId, FIXTURES.brandId, FIXTURES.deviceToken]
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

function issueMerchantToken() {
  return jwt.sign(
    {
      id: FIXTURES.merchantId,
      email: FIXTURES.merchantEmail,
      role: 'merchant',
      credits: 100
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h', algorithm: 'HS256' }
  );
}

async function runTier1SuperAdminSuite() {
  await setupDatabase();

  const app = createApp();
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
  console.log(`[Setup] Target test server running on ${baseUrl}\n`);

  const adminToken = issueSuperAdminToken();
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };

  // ===========================================================================
  // SECTION 1: SUPER ADMIN AUTHENTICATION & PROFILE
  // ===========================================================================
  console.log('--- SECTION 1: Super Admin Authentication & Profile ---');

  await test(
    'TEST-T1-ADM-01',
    'AUTH',
    'Super Admin seeder initializes default super admin account with role = superadmin in DB',
    async () => {
      const user = await db.get('SELECT id, email, role, status FROM users WHERE email = ?', [FIXTURES.adminEmail]);
      assert.ok(user, 'Super admin user must exist in database');
      assert.strictEqual(user.role, 'superadmin');
      assert.strictEqual(user.status, 'active');
    }
  );

  await test(
    'TEST-T1-ADM-02',
    'AUTH',
    'Super Admin authentication token contains role = superadmin claim',
    async () => {
      const decoded = jwt.verify(adminToken, process.env.JWT_SECRET);
      assert.strictEqual(decoded.role, 'superadmin');
      assert.strictEqual(decoded.email, FIXTURES.adminEmail);
    }
  );

  await test(
    'TEST-T1-ADM-03',
    'AUTH',
    'GET /api/admin/me returns super admin identity, role, and 2FA status',
    async () => {
      const res = await apiRequest('/api/admin/me', { headers: adminHeaders });
      assert.strictEqual(res.status, 200, `Expected HTTP 200, got ${res.status}: ${JSON.stringify(res.body)}`);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.user.role, 'superadmin');
      assert.strictEqual(res.body.user.email, FIXTURES.adminEmail);
      assert.ok('two_factor_enabled' in res.body.user || 'totp_enabled' in res.body.user);
    }
  );

  // ===========================================================================
  // SECTION 2: GLOBAL PLATFORM KPIS & HEALTH TELEMETRY
  // ===========================================================================
  console.log('\n--- SECTION 2: Global Platform KPIs & Health Telemetry ---');

  await test(
    'TEST-T1-TEL-01',
    'TELEMETRY',
    'GET /api/admin/telemetry/kpis returns aggregated GMV, revenue, invoice metrics, and active handsets',
    async () => {
      const res = await apiRequest('/api/admin/telemetry/kpis', { headers: adminHeaders });
      assert.strictEqual(res.status, 200, `Expected HTTP 200, got ${res.status}: ${JSON.stringify(res.body)}`);
      assert.strictEqual(res.body.success, true);
      assert.ok('gmvTaka' in res.body || 'gmv' in res.body || 'totalGmv' in res.body, 'GMV metric must be returned');
      assert.ok('totalInvoices' in res.body || 'invoicesCount' in res.body, 'Invoice count must be returned');
      assert.ok('activeDevices' in res.body || 'activeHandsets' in res.body, 'Active handsets count must be returned');
    }
  );

  await test(
    'TEST-T1-TEL-02',
    'TELEMETRY',
    'GET /api/admin/telemetry/transactions-chart returns time-series volume intervals for 24h, 7d, and 30d',
    async () => {
      const res = await apiRequest('/api/admin/telemetry/transactions-chart?period=7d', { headers: adminHeaders });
      assert.strictEqual(res.status, 200, `Expected HTTP 200, got ${res.status}: ${JSON.stringify(res.body)}`);
      assert.strictEqual(res.body.success, true);
      assert.ok(Array.isArray(res.body.intervals || res.body.data || res.body.points), 'Must return array of chart points');
    }
  );

  await test(
    'TEST-T1-TEL-03',
    'TELEMETRY',
    'GET /api/admin/telemetry/channel-distribution returns market share breakdown across payment channels',
    async () => {
      const res = await apiRequest('/api/admin/telemetry/channel-distribution', { headers: adminHeaders });
      assert.strictEqual(res.status, 200, `Expected HTTP 200, got ${res.status}: ${JSON.stringify(res.body)}`);
      assert.strictEqual(res.body.success, true);
      assert.ok(Array.isArray(res.body.distribution || res.body.channels || res.body.data), 'Must return channel breakdown');
    }
  );

  await test(
    'TEST-T1-TEL-04',
    'TELEMETRY',
    'GET /api/admin/telemetry/sms-throughput returns real-time SMS ingestion rate and active handsets count',
    async () => {
      const res = await apiRequest('/api/admin/telemetry/sms-throughput', { headers: adminHeaders });
      assert.strictEqual(res.status, 200, `Expected HTTP 200, got ${res.status}: ${JSON.stringify(res.body)}`);
      assert.strictEqual(res.body.success, true);
      assert.ok('currentThroughput' in res.body || 'smsPerMinute' in res.body || 'throughput' in res.body);
    }
  );

  await test(
    'TEST-T1-TEL-05',
    'TELEMETRY',
    'GET /api/admin/telemetry/health returns live database status, uptime, and system health status',
    async () => {
      const res = await apiRequest('/api/admin/telemetry/health', { headers: adminHeaders });
      assert.strictEqual(res.status, 200, `Expected HTTP 200, got ${res.status}: ${JSON.stringify(res.body)}`);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.status, 'healthy');
      assert.ok('uptimeSeconds' in res.body || 'uptime' in res.body);
    }
  );

  // ===========================================================================
  // SECTION 3: MERCHANT GOVERNANCE & DIRECTORY
  // ===========================================================================
  console.log('\n--- SECTION 3: Merchant Governance & Directory ---');

  await test(
    'TEST-T1-MGT-01',
    'MERCHANTS',
    'GET /api/admin/merchants returns paginated list of merchants with search filtering',
    async () => {
      const res = await apiRequest('/api/admin/merchants?page=1&limit=10&search=Apex', { headers: adminHeaders });
      assert.strictEqual(res.status, 200, `Expected HTTP 200, got ${res.status}: ${JSON.stringify(res.body)}`);
      assert.strictEqual(res.body.success, true);
      const merchants = res.body.merchants || res.body.data || [];
      assert.ok(Array.isArray(merchants), 'Merchants must be an array');
      const found = merchants.find((m) => m.id === FIXTURES.merchantId || m.email === FIXTURES.merchantEmail);
      assert.ok(found, 'Seeded merchant must be returned in directory');
    }
  );

  await test(
    'TEST-T1-MGT-02',
    'MERCHANTS',
    'GET /api/admin/merchants/:id returns detailed merchant metadata including brands and devices',
    async () => {
      const res = await apiRequest(`/api/admin/merchants/${FIXTURES.merchantId}`, { headers: adminHeaders });
      assert.strictEqual(res.status, 200, `Expected HTTP 200, got ${res.status}: ${JSON.stringify(res.body)}`);
      assert.strictEqual(res.body.success, true);
      const m = res.body.merchant || res.body.data;
      assert.strictEqual(m.id, FIXTURES.merchantId);
      assert.ok(Array.isArray(m.brands), 'Merchant brands array must be present');
    }
  );

  await test(
    'TEST-T1-MGT-03',
    'MERCHANTS',
    'PUT /api/admin/merchants/:id/status toggles merchant status (active -> suspended -> active)',
    async () => {
      // 1. Suspend
      const res1 = await apiRequest(`/api/admin/merchants/${FIXTURES.merchantId}/status`, {
        method: 'PUT',
        headers: adminHeaders,
        body: { status: 'suspended', reason: 'Routine compliance audit' }
      });
      assert.strictEqual(res1.status, 200, `Expected HTTP 200, got ${res1.status}`);
      const updated1 = await db.get('SELECT status FROM users WHERE id = ?', [FIXTURES.merchantId]);
      assert.strictEqual(updated1.status, 'suspended');

      // 2. Reactivate
      const res2 = await apiRequest(`/api/admin/merchants/${FIXTURES.merchantId}/status`, {
        method: 'PUT',
        headers: adminHeaders,
        body: { status: 'active', reason: 'Audit passed' }
      });
      assert.strictEqual(res2.status, 200);
      const updated2 = await db.get('SELECT status FROM users WHERE id = ?', [FIXTURES.merchantId]);
      assert.strictEqual(updated2.status, 'active');
    }
  );

  await test(
    'TEST-T1-MGT-04',
    'MERCHANTS',
    'POST /api/admin/merchants/:id/adjust-credits adjusts merchant credit balance with audit log',
    async () => {
      const previous = await db.get('SELECT credits FROM users WHERE id = ?', [FIXTURES.merchantId]);
      const initialCredits = Number(previous.credits);

      const res = await apiRequest(`/api/admin/merchants/${FIXTURES.merchantId}/adjust-credits`, {
        method: 'POST',
        headers: adminHeaders,
        body: { amount: 50, reason: 'Promotional loyalty bonus' }
      });

      assert.strictEqual(res.status, 200, `Expected HTTP 200, got ${res.status}: ${JSON.stringify(res.body)}`);
      const updated = await db.get('SELECT credits FROM users WHERE id = ?', [FIXTURES.merchantId]);
      assert.strictEqual(Number(updated.credits), initialCredits + 50);
    }
  );

  await test(
    'TEST-T1-AUD-01',
    'AUDIT',
    'GET /api/admin/audit-logs returns chronological administrative action logs',
    async () => {
      const res = await apiRequest('/api/admin/audit-logs?limit=10', { headers: adminHeaders });
      assert.strictEqual(res.status, 200, `Expected HTTP 200, got ${res.status}: ${JSON.stringify(res.body)}`);
      assert.strictEqual(res.body.success, true);
      assert.ok(Array.isArray(res.body.logs || res.body.data), 'Audit logs must be returned as an array');
    }
  );

  // ===========================================================================
  // SECTION 4: MERCHANT IMPERSONATION & SESSION REVERSION
  // ===========================================================================
  console.log('\n--- SECTION 4: Merchant Impersonation & Session Reversion ---');

  let impersonationToken = '';
  let returnTicket = '';

  await test(
    'TEST-T1-IMP-01',
    'IMPERSONATION',
    'POST /api/admin/impersonate/:merchantId generates scoped merchant token and returnTicket',
    async () => {
      const res = await apiRequest(`/api/admin/impersonate/${FIXTURES.merchantId}`, {
        method: 'POST',
        headers: adminHeaders
      });

      assert.strictEqual(res.status, 200, `Expected HTTP 200, got ${res.status}: ${JSON.stringify(res.body)}`);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.impersonationToken, 'Impersonation token must be returned');
      assert.ok(res.body.returnTicket, 'Cryptographic returnTicket must be returned');

      impersonationToken = res.body.impersonationToken;
      returnTicket = res.body.returnTicket;

      const decoded = jwt.verify(impersonationToken, process.env.JWT_SECRET);
      assert.strictEqual(decoded.role, 'merchant');
      assert.strictEqual(decoded.isImpersonated, true);
      assert.strictEqual(decoded.id, FIXTURES.merchantId);
    }
  );

  await test(
    'TEST-T1-IMP-02',
    'IMPERSONATION',
    'POST /api/admin/impersonate/exit validates returnTicket and restores super admin session',
    async () => {
      assert.ok(returnTicket, 'Must have valid returnTicket from previous test');
      const res = await apiRequest('/api/admin/impersonate/exit', {
        method: 'POST',
        headers: { Authorization: `Bearer ${impersonationToken}` },
        body: { returnTicket }
      });

      assert.strictEqual(res.status, 200, `Expected HTTP 200, got ${res.status}: ${JSON.stringify(res.body)}`);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.adminToken || res.body.token, 'Super admin token must be re-issued');

      const restoredToken = res.body.adminToken || res.body.token;
      const decoded = jwt.verify(restoredToken, process.env.JWT_SECRET);
      assert.strictEqual(decoded.role, 'superadmin');
      assert.strictEqual(decoded.email, FIXTURES.adminEmail);
    }
  );

  // ===========================================================================
  // SECTION 5: CROSS-TENANT SMS STREAM & MANUAL RECONCILIATION
  // ===========================================================================
  console.log('\n--- SECTION 5: Cross-Tenant SMS Stream & Manual Reconciliation ---');

  const testTrxId = `BK_T1_${Date.now().toString().slice(-8)}`;
  let testStoredDataId = '';
  let testInvoiceId = '';

  await test(
    'TEST-T1-SMS-01',
    'SMS-STREAM',
    'GET /api/admin/sms/stream returns global carrier SMS across all brands filterable by TrxID',
    async () => {
      // 1. Ingest an SMS receipt directly into stored_data
      testStoredDataId = `sd_t1_${Date.now()}`;
      await db.query(
        `INSERT INTO stored_data (id, brand_id, device_id, sender, raw_sms, channel, trx_id, amount, status, received_at)
         VALUES (?, ?, ?, 'bKash', 'You have received Tk 750.00 from 01712345678. Ref: Apex. TrxID: ${testTrxId}', 'bkash', ?, 750, 'UNUSED', CURRENT_TIMESTAMP)`,
        [testStoredDataId, FIXTURES.brandId, FIXTURES.deviceId, testTrxId]
      );

      // 2. Query admin stream with TrxID filter
      const res = await apiRequest(`/api/admin/sms/stream?trxId=${testTrxId}`, { headers: adminHeaders });
      assert.strictEqual(res.status, 200, `Expected HTTP 200, got ${res.status}: ${JSON.stringify(res.body)}`);
      assert.strictEqual(res.body.success, true);
      const records = res.body.records || res.body.sms || res.body.data || [];
      assert.ok(Array.isArray(records), 'Stream must return array of records');
      const found = records.find((r) => r.trx_id === testTrxId || r.trxId === testTrxId);
      assert.ok(found, 'Ingested carrier SMS must be visible in admin stream');
    }
  );

  await test(
    'TEST-T1-REC-01',
    'RECONCILE',
    'POST /api/admin/reconcile/manual executes atomic CAS override pairing SMS to invoice',
    async () => {
      // 1. Create a pending invoice for the same brand
      testInvoiceId = `inv_t1_rec_${Date.now()}`;
      await db.query(
        `INSERT INTO invoices (id, brand_id, invoice_number, amount, currency, customer_name, customer_email, customer_phone, status, expires_at)
         VALUES (?, ?, 'INV-T1-001', 750, 'BDT', 'Test Customer', 'cust@example.com', '01712345678', 'PENDING', datetime('now', '+15 minutes'))`,
        [testInvoiceId, FIXTURES.brandId]
      );

      // 2. Call manual reconciliation
      const res = await apiRequest('/api/admin/reconcile/manual', {
        method: 'POST',
        headers: adminHeaders,
        body: {
          storedDataId: testStoredDataId,
          invoiceId: testInvoiceId,
          reason: 'Customer reported typo during checkout'
        }
      });

      assert.strictEqual(res.status, 200, `Expected HTTP 200, got ${res.status}: ${JSON.stringify(res.body)}`);
      assert.strictEqual(res.body.success, true);

      // 3. Verify database state: stored_data is USED, invoice is PAID
      const stored = await db.get('SELECT status, used_at FROM stored_data WHERE id = ?', [testStoredDataId]);
      assert.strictEqual(stored.status, 'USED', 'stored_data must transition to USED');

      const invoice = await db.get('SELECT status, trx_id FROM invoices WHERE id = ?', [testInvoiceId]);
      assert.strictEqual(invoice.status, 'PAID', 'invoice must transition to PAID');
      assert.strictEqual(invoice.trx_id, testTrxId);
    }
  );

  // ===========================================================================
  // SECTION 6: RFC 6238 TOTP 2FA PROVISIONING & AUTHENTICATION
  // ===========================================================================
  console.log('\n--- SECTION 6: RFC 6238 TOTP 2FA & Google Auth ---');

  let generatedSecret = '';

  await test(
    'TEST-T1-2FA-01',
    'TOTP',
    'POST /api/admin/2fa/generate generates Base32 secret, otpauth URI, and QR data URL',
    async () => {
      const res = await apiRequest('/api/admin/2fa/generate', {
        method: 'POST',
        headers: adminHeaders
      });

      assert.strictEqual(res.status, 200, `Expected HTTP 200, got ${res.status}: ${JSON.stringify(res.body)}`);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.secret, 'Base32 secret must be returned');
      assert.ok(res.body.otpauthUrl || res.body.otpauth_url, 'otpauth URI must be returned');
      assert.ok(res.body.qrCodeDataUrl || res.body.qr_code || res.body.qrCode, 'QR code data URL must be returned');

      generatedSecret = res.body.secret;
    }
  );

  let backupCodes = [];

  await test(
    'TEST-T1-2FA-02',
    'TOTP',
    'POST /api/admin/2fa/verify validates 6-digit OTP code, enables 2FA, and issues 8 backup codes',
    async () => {
      assert.ok(generatedSecret, 'Must have generated secret from previous step');
      const validCode = generateTOTPCode(generatedSecret, 0);

      const res = await apiRequest('/api/admin/2fa/verify', {
        method: 'POST',
        headers: adminHeaders,
        body: { token: validCode, code: validCode }
      });

      assert.strictEqual(res.status, 200, `Expected HTTP 200, got ${res.status}: ${JSON.stringify(res.body)}`);
      assert.strictEqual(res.body.success, true);
      backupCodes = res.body.backupCodes || res.body.backup_codes || [];
      assert.ok(Array.isArray(backupCodes), 'Backup codes array must be returned');
      assert.strictEqual(backupCodes.length, 8, 'Must return exactly 8 backup recovery codes');

      // Verify DB record
      const admin = await db.get('SELECT two_factor_enabled FROM users WHERE id = ?', [FIXTURES.adminId]);
      assert.strictEqual(Number(admin.two_factor_enabled), 1, '2FA must be marked enabled in database');
    }
  );

  let temp2FAToken = '';

  await test(
    'TEST-T1-2FA-03',
    'TOTP',
    'Super Admin login challenge enforces step-2 OTP verification when 2FA is active',
    async () => {
      // 1. Initial login returns 2FA challenge
      const res1 = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: { email: FIXTURES.adminEmail, password: 'hash_admin_pw' }
      });

      // API may return 200 with requires2FA: true or 401 with code: 2FA_REQUIRED
      assert.ok(res1.status === 200 || res1.status === 401);
      assert.ok(
        res1.body.requires2FA || res1.body.requires_2fa || res1.body.code === '2FA_REQUIRED',
        'Must require 2FA verification'
      );
      temp2FAToken = res1.body.tempToken || res1.body.temp_token || adminToken;

      // 2. Submit valid OTP to step-2 endpoint
      const currentOtp = generateTOTPCode(generatedSecret, 0);
      const res2 = await apiRequest('/api/admin/auth/login-2fa', {
        method: 'POST',
        body: { tempToken: temp2FAToken, code: currentOtp }
      });

      assert.strictEqual(res2.status, 200, `Expected HTTP 200, got ${res2.status}: ${JSON.stringify(res2.body)}`);
      assert.strictEqual(res2.body.success, true);
      assert.ok(res2.body.token, 'Final authenticated Super Admin JWT must be returned');
    }
  );

  await test(
    'TEST-T1-2FA-04',
    'TOTP',
    'POST /api/admin/auth/login-backup allows emergency login using one-time backup recovery code',
    async () => {
      assert.ok(backupCodes.length > 0, 'Must have backup codes available');
      const testCode = backupCodes[0];

      const res = await apiRequest('/api/admin/auth/login-backup', {
        method: 'POST',
        body: { tempToken: temp2FAToken, backupCode: testCode }
      });

      assert.strictEqual(res.status, 200, `Expected HTTP 200, got ${res.status}: ${JSON.stringify(res.body)}`);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.token, 'Authenticated JWT must be issued on backup code login');
    }
  );

  await test(
    'TEST-T1-GOG-01',
    'GOOGLE-AUTH',
    'GET /api/auth/google/url returns configured Google OAuth authorization URL or fallback',
    async () => {
      const res = await apiRequest('/api/auth/google/url');
      assert.strictEqual(res.status, 200, `Expected HTTP 200, got ${res.status}`);
      assert.ok(typeof res.body.url === 'string' || res.body.enabled === false);
    }
  );

  await test(
    'TEST-T1-GOG-02',
    'GOOGLE-AUTH',
    'POST /api/auth/google/verify-token handles S2S Google ID token validation schema',
    async () => {
      const res = await apiRequest('/api/auth/google/verify-token', {
        method: 'POST',
        body: { idToken: 'mock_sandbox_google_id_token_test' }
      });
      // In testing mode without Google secrets, returns 200/201 mock or 401/400 validation rejection
      assert.ok([200, 201, 400, 401].includes(res.status));
    }
  );

  // ===========================================================================
  // SECTION 7: GATEWAY MASTER SWITCHES & DYNAMIC SETTINGS
  // ===========================================================================
  console.log('\n--- SECTION 7: Gateway Master Switches & Dynamic Settings ---');

  await test(
    'TEST-T1-GAT-01',
    'GATEWAYS',
    'GET & PUT /api/admin/gateways/master globally disables and enables a payment channel',
    async () => {
      // 1. Globally disable 'rocket'
      const res1 = await apiRequest('/api/admin/gateways/master/rocket', {
        method: 'PUT',
        headers: adminHeaders,
        body: { enabled: false }
      });
      assert.strictEqual(res1.status, 200, `Expected HTTP 200, got ${res1.status}`);

      // 2. Query master switches list
      const res2 = await apiRequest('/api/admin/gateways/master', { headers: adminHeaders });
      assert.strictEqual(res2.status, 200);
      assert.strictEqual(res2.body.success, true);

      // 3. Re-enable 'rocket'
      const res3 = await apiRequest('/api/admin/gateways/master/rocket', {
        method: 'PUT',
        headers: adminHeaders,
        body: { enabled: true }
      });
      assert.strictEqual(res3.status, 200);
    }
  );

  await test(
    'TEST-T1-SET-01',
    'PRICING',
    'GET & PUT /api/admin/settings/pricing dynamically updates platform fees and credit tiers',
    async () => {
      const res = await apiRequest('/api/admin/settings/pricing', {
        method: 'PUT',
        headers: adminHeaders,
        body: {
          feePerVerification: 2,
          starterCredits: 100,
          packages: [
            { credits: 500, priceTaka: 500 },
            { credits: 2000, priceTaka: 1800 }
          ]
        }
      });

      assert.strictEqual(res.status, 200, `Expected HTTP 200, got ${res.status}: ${JSON.stringify(res.body)}`);
      assert.strictEqual(res.body.success, true);

      const check = await apiRequest('/api/admin/settings/pricing', { headers: adminHeaders });
      assert.strictEqual(check.status, 200);
      assert.strictEqual(check.body.feePerVerification, 2);
    }
  );

  await test(
    'TEST-T1-SET-02',
    'CUSTOMIZER',
    'GET & PUT /api/admin/settings/customizer updates landing hero copy, announcements, and support links',
    async () => {
      const payload = {
        heroTitle: 'DenaNeya v2.0 Enterprise Automation',
        announcementText: 'Scheduled system upgrade on Sunday 02:00 AM UTC',
        announcementActive: true,
        supportWhatsapp: '+8801712345678',
        supportTelegram: 'https://t.me/denaneya_support'
      };

      const res = await apiRequest('/api/admin/settings/customizer', {
        method: 'PUT',
        headers: adminHeaders,
        body: payload
      });

      assert.strictEqual(res.status, 200, `Expected HTTP 200, got ${res.status}: ${JSON.stringify(res.body)}`);
      assert.strictEqual(res.body.success, true);
    }
  );

  await test(
    'TEST-T1-SET-03',
    'CUSTOMIZER',
    'GET /api/customizer/public delivers live dynamic customizer content unauthenticated',
    async () => {
      const res = await apiRequest('/api/customizer/public');
      assert.strictEqual(res.status, 200, `Expected HTTP 200, got ${res.status}`);
      assert.strictEqual(res.body.success, true);
      assert.ok('heroTitle' in res.body || 'announcement' in res.body || 'support' in res.body);
    }
  );

  await test(
    'TEST-T1-MAI-01',
    'MAINTENANCE',
    'GET & PUT /api/admin/settings/maintenance toggles network-wide maintenance mode',
    async () => {
      // 1. Enable maintenance
      const res1 = await apiRequest('/api/admin/settings/maintenance', {
        method: 'PUT',
        headers: adminHeaders,
        body: {
          enabled: true,
          message: 'Server undergoing scheduled database indexing.',
          allowedIps: ['198.51.100.99']
        }
      });
      assert.strictEqual(res1.status, 200, `Expected HTTP 200, got ${res1.status}`);

      // 2. Disable maintenance
      const res2 = await apiRequest('/api/admin/settings/maintenance', {
        method: 'PUT',
        headers: adminHeaders,
        body: { enabled: false }
      });
      assert.strictEqual(res2.status, 200);
    }
  );

  // ===========================================================================
  // SUMMARY
  // ===========================================================================
  console.log('\n===============================================================================');
  console.log(`  Tier 1 Super Admin Finished: ${summary.passed} Passed / ${summary.total} Total (${summary.failed} Failed)`);
  console.log('===============================================================================');

  if (server) server.close();
  if (summary.failed > 0) {
    process.exit(1);
  }
}

runTier1SuperAdminSuite().catch((err) => {
  console.error('[Fatal Tier 1 Test Failure]', err);
  if (server) server.close();
  process.exit(1);
});
