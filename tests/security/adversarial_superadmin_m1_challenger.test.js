/**
 * DenaNeya v2.0 - Milestone 1 Super Admin Suite Adversarial Stress Test & Exploit Probe Suite
 * Executed by Challenger M1.1 (teamwork_preview_challenger_m1_1)
 *
 * Scope:
 * 1. Privilege Escalation Attacks on /api/admin/* (forged JWTs, merchant tokens, expired tokens, malformed headers, alg none)
 * 2. Deactivated Admin Accounts (suspended, blocked, deleted -> immediate 403 ACCOUNT_DEACTIVATED with 0-revocation window)
 * 3. TOTP Clock Skew Fuzzing (±30s PASS, ±60s/±90s REJECT, extreme skew & malformed inputs)
 * 4. TOTP Code Replay Attack (replay within window -> REPLAY_DETECTED, multi-user isolation)
 * 5. Emergency Backup Code Single-Use Enforcement & Reuse Resistance (bcrypt storage, single-use, exhaustion)
 * 6. Google OAuth Role Spoofing & Escalation Defense (mock tokens, public verify-token anti-escalation, admin login guards)
 */

process.env.NODE_ENV = 'test';
process.env.DB_CLIENT = 'sqlite';
process.env.DB_SQLITE_PATH = ':memory:';
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'denaneya_development_jwt_secret_min_32_bytes_long_12345';
}
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id.apps.googleusercontent.com';

import assert from 'node:assert';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const { default: dbPkg } = await import('@denaneya/database');
const {
  getDatabase,
  runMigrations,
  getSystemSetting,
  setSystemSetting
} = dbPkg;

const {
  base32Encode,
  base32Decode,
  generateHOTP,
  generateTOTP,
  verifyTOTP,
  generateSecret,
  generateOtpauthUri,
  generateQRCodeDataUrl,
  generateBackupCodes,
  hashBackupCodes,
  verifyBackupCode,
  encryptSecret,
  decryptSecret,
  antiReplayCache
} = await import('../../apps/api/src/services/totpService.js');

const {
  verifyGoogleIdToken,
  parseMockGoogleToken,
  findOrCreateUserFromGoogle
} = await import('../../apps/api/src/services/googleAuthService.js');

const {
  generateToken,
  generatePreAuthToken,
  verifyPreAuthToken,
  verifyToken,
  getSecret
} = await import('../../apps/api/src/utils/token.js');

const { createApp } = await import('../../apps/api/src/app.js');

console.log('===============================================================================');
console.log('   DenaNeya v2.0 - Milestone 1 Super Admin Suite Adversarial Challenge Suite    ');
console.log('   Empirical Challenger M1.1: Stress Tests & Exploit Probes                    ');
console.log('===============================================================================\n');

const stats = {
  total: 0,
  passed: 0,
  failed: 0,
  probes: []
};

async function probe(category, id, description, fn) {
  stats.total++;
  try {
    await fn();
    console.log(`  [PASS] [${category}] ${id}: ${description}`);
    stats.passed++;
    stats.probes.push({ category, id, description, status: 'PASS' });
  } catch (err) {
    console.error(`  [FAIL/EXPLOIT] [${category}] ${id}: ${description}`);
    console.error(`         >>> Error: ${err.message}`);
    stats.failed++;
    stats.probes.push({ category, id, description, status: 'FAIL', error: err.message });
  }
}

let server;
let baseUrl;
let db;

async function request(path, { method = 'GET', headers = {}, body = null } = {}) {
  const reqHeaders = {
    'Content-Type': 'application/json',
    ...headers
  };
  const reqOptions = {
    method,
    headers: reqHeaders
  };
  if (body !== null) {
    reqOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
  }
  const res = await fetch(`${baseUrl}${path}`, reqOptions);
  let data = null;
  const text = await res.text();
  try {
    data = JSON.parse(text);
  } catch (_) {
    data = text;
  }
  return { status: res.status, headers: res.headers, body: data };
}

try {
  // Initialize in-memory SQLite database and execute dynamic migrations
  db = getDatabase();
  const migResult = await runMigrations(db, { reset: true });
  assert.strictEqual(migResult.success, true, 'Migrations 001 and 002 must apply successfully');

  // Launch API server on ephemeral port
  const app = createApp({ db });
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });

  // Fixtures: Create Active Merchant & Active Staff for boundary testing
  const merchantId = 'usr_legit_merchant_001';
  const staffId = 'usr_legit_staff_001';
  await db.query(
    `INSERT INTO users (id, name, email, password_hash, role, credits, status)
     VALUES (?, 'Legitimate Merchant', 'legit_merchant@test.com', 'hash', 'merchant', 500, 'active')`,
    [merchantId]
  );
  await db.query(
    `INSERT INTO users (id, name, email, password_hash, role, credits, status)
     VALUES (?, 'Legitimate Staff', 'legit_staff@test.com', 'hash', 'staff', 0, 'active')`,
    [staffId]
  );

  // ===========================================================================
  // DOMAIN 1: PRIVILEGE ESCALATION ATTACKS ON /api/admin/*
  // ===========================================================================
  console.log('\n--- DOMAIN 1: Privilege Escalation Attacks on /api/admin/* ---');

  await probe('PRIV_ESC', 'PRV-01', 'Omitted Authorization header yields 401 UNAUTHORIZED', async () => {
    const res = await request('/api/admin/me');
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.code, 'UNAUTHORIZED');
  });

  await probe('PRIV_ESC', 'PRV-02', 'Empty Authorization header yields 401 UNAUTHORIZED', async () => {
    const res = await request('/api/admin/me', { headers: { Authorization: '' } });
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.code, 'UNAUTHORIZED');
  });

  await probe('PRIV_ESC', 'PRV-03', 'Whitespace-only Authorization header yields 401 UNAUTHORIZED', async () => {
    const res = await request('/api/admin/me', { headers: { Authorization: '     ' } });
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.code, 'UNAUTHORIZED');
  });

  await probe('PRIV_ESC', 'PRV-04', 'Malformed scheme (Basic auth instead of Bearer) yields 401 UNAUTHORIZED', async () => {
    const res = await request('/api/admin/me', { headers: { Authorization: 'Basic dXNlcjpwYXNz' } });
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.code, 'UNAUTHORIZED');
    assert.match(res.body.message, /Malformed authorization header/);
  });

  await probe('PRIV_ESC', 'PRV-05', 'Bearer without token yields 401 UNAUTHORIZED', async () => {
    const res = await request('/api/admin/me', { headers: { Authorization: 'Bearer ' } });
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.code, 'UNAUTHORIZED');
  });

  await probe('PRIV_ESC', 'PRV-06', 'Bearer with multiple token segments yields 401 UNAUTHORIZED', async () => {
    const res = await request('/api/admin/me', { headers: { Authorization: 'Bearer token1 token2 token3' } });
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.code, 'UNAUTHORIZED');
  });

  await probe('PRIV_ESC', 'PRV-07', 'Malformed non-JWT token string yields 401 INVALID_TOKEN', async () => {
    const res = await request('/api/admin/me', { headers: { Authorization: 'Bearer totally_not_a_valid_jwt' } });
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.code, 'INVALID_TOKEN');
  });

  await probe('PRIV_ESC', 'PRV-08', 'Token signed with illegitimate HMAC secret yields 401 INVALID_TOKEN', async () => {
    const forgedToken = jwt.sign(
      { id: 'usr_superadmin_master_001', email: 'admin@denaneya.com', role: 'superadmin' },
      'wrong_unauthorized_attacker_hmac_secret_12345',
      { expiresIn: '1h' }
    );
    const res = await request('/api/admin/me', { headers: { Authorization: `Bearer ${forgedToken}` } });
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.code, 'INVALID_TOKEN');
  });

  await probe('PRIV_ESC', 'PRV-09', 'Alg: none attack token yields 401 INVALID_TOKEN (algorithm confusion immunity)', async () => {
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ id: 'usr_superadmin_master_001', role: 'superadmin', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url');
    const noneToken = `${header}.${payload}.`;

    const res = await request('/api/admin/me', { headers: { Authorization: `Bearer ${noneToken}` } });
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.code, 'INVALID_TOKEN');
  });

  await probe('PRIV_ESC', 'PRV-10', 'Expired superadmin token yields 401 TOKEN_EXPIRED', async () => {
    const expiredToken = jwt.sign(
      { id: 'usr_superadmin_master_001', email: 'admin@denaneya.com', role: 'superadmin' },
      getSecret(),
      { expiresIn: '-10s' }
    );
    const res = await request('/api/admin/me', { headers: { Authorization: `Bearer ${expiredToken}` } });
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.code, 'TOKEN_EXPIRED');
  });

  await probe('PRIV_ESC', 'PRV-11', 'Legitimate active merchant token yields 403 FORBIDDEN_SUPERADMIN_REQUIRED', async () => {
    const merchantToken = generateToken({
      id: merchantId,
      email: 'legit_merchant@test.com',
      role: 'merchant',
      credits: 500
    });
    const res = await request('/api/admin/me', { headers: { Authorization: `Bearer ${merchantToken}` } });
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.code, 'FORBIDDEN_SUPERADMIN_REQUIRED');
  });

  await probe('PRIV_ESC', 'PRV-12', 'Legitimate active staff token yields 403 FORBIDDEN_SUPERADMIN_REQUIRED', async () => {
    const staffToken = generateToken({
      id: staffId,
      email: 'legit_staff@test.com',
      role: 'staff',
      credits: 0
    });
    const res = await request('/api/admin/me', { headers: { Authorization: `Bearer ${staffToken}` } });
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.code, 'FORBIDDEN_SUPERADMIN_REQUIRED');
  });

  await probe('PRIV_ESC', 'PRV-13', 'Merchant attempting to invoke POST /api/admin/2fa/generate yields 403', async () => {
    const merchantToken = generateToken({
      id: merchantId,
      email: 'legit_merchant@test.com',
      role: 'merchant'
    });
    const res = await request('/api/admin/2fa/generate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${merchantToken}` }
    });
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.code, 'FORBIDDEN_SUPERADMIN_REQUIRED');
  });

  await probe('PRIV_ESC', 'PRV-14', 'Forged role claim (merchant ID with role: superadmin in JWT) caught by live DB check (403)', async () => {
    const forgedClaimToken = generateToken({
      id: merchantId,
      email: 'legit_merchant@test.com',
      role: 'superadmin'
    });
    const res = await request('/api/admin/me', { headers: { Authorization: `Bearer ${forgedClaimToken}` } });
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.code, 'FORBIDDEN_SUPERADMIN_REQUIRED');
  });

  await probe('PRIV_ESC', 'PRV-15', 'Forged ghost user ID (role: superadmin for non-existent ID) caught by live DB check (401 USER_NOT_FOUND)', async () => {
    const ghostToken = generateToken({
      id: 'usr_non_existent_ghost_999999',
      email: 'ghost_attacker@evil.com',
      role: 'superadmin'
    });
    const res = await request('/api/admin/me', { headers: { Authorization: `Bearer ${ghostToken}` } });
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.code, 'USER_NOT_FOUND');
  });

  await probe('PRIV_ESC', 'PRV-16', 'PreAuthToken (intended for 2FA challenge) is rejected when used directly as admin Bearer token', async () => {
    const preAuth = generatePreAuthToken({
      id: merchantId,
      email: 'legit_merchant@test.com',
      role: 'merchant'
    });
    const res = await request('/api/admin/me', { headers: { Authorization: `Bearer ${preAuth}` } });
    assert.ok([401, 403].includes(res.status), `Expected 401 or 403, got ${res.status}`);
    assert.ok(['UNAUTHORIZED', 'FORBIDDEN_SUPERADMIN_REQUIRED'].includes(res.body.code));
  });

  // ===========================================================================
  // DOMAIN 2: DEACTIVATED ADMIN ACCOUNTS (SUSPENDED & BLOCKED)
  // ===========================================================================
  console.log('\n--- DOMAIN 2: Deactivated Admin Accounts (Suspended / Blocked / Deleted) ---');

  const suspendedAdminId = 'usr_admin_suspended_001';
  const blockedAdminId = 'usr_admin_blocked_001';
  const deletedAdminId = 'usr_admin_deleted_001';

  const { secret: suspendedSec } = generateSecret();
  const encSuspendedSec = encryptSecret(suspendedSec);
  const backupCodesSuspended = generateBackupCodes(8);
  const hashBackupSuspended = await hashBackupCodes(backupCodesSuspended);

  await db.query(
    `INSERT INTO users (id, name, email, password_hash, role, credits, status, two_factor_enabled, two_factor_secret, two_factor_backup_codes)
     VALUES (?, 'Suspended Admin', 'suspended_admin@denaneya.com', 'hash', 'superadmin', 100, 'suspended', 1, ?, ?)`,
    [suspendedAdminId, encSuspendedSec, JSON.stringify(hashBackupSuspended)]
  );
  await db.query(
    `INSERT INTO users (id, name, email, password_hash, role, credits, status)
     VALUES (?, 'Blocked Admin', 'blocked_admin@denaneya.com', 'hash', 'superadmin', 100, 'blocked')`,
    [blockedAdminId]
  );
  await db.query(
    `INSERT INTO users (id, name, email, password_hash, role, credits, status)
     VALUES (?, 'Deleted Admin', 'deleted_admin@denaneya.com', 'hash', 'superadmin', 100, 'deleted')`,
    [deletedAdminId]
  );

  await probe('DEACT_ADMIN', 'DEC-01', 'Suspended superadmin token on /api/admin/me yields 403 ACCOUNT_DEACTIVATED', async () => {
    const token = generateToken({
      id: suspendedAdminId,
      email: 'suspended_admin@denaneya.com',
      role: 'superadmin'
    });
    const res = await request('/api/admin/me', { headers: { Authorization: `Bearer ${token}` } });
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.code, 'ACCOUNT_DEACTIVATED');
  });

  await probe('DEACT_ADMIN', 'DEC-02', 'Blocked superadmin token on /api/admin/me yields 403 ACCOUNT_DEACTIVATED', async () => {
    const token = generateToken({
      id: blockedAdminId,
      email: 'blocked_admin@denaneya.com',
      role: 'superadmin'
    });
    const res = await request('/api/admin/me', { headers: { Authorization: `Bearer ${token}` } });
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.code, 'ACCOUNT_DEACTIVATED');
  });

  await probe('DEACT_ADMIN', 'DEC-03', 'Deleted superadmin token on /api/admin/me yields 403 ACCOUNT_DEACTIVATED', async () => {
    const token = generateToken({
      id: deletedAdminId,
      email: 'deleted_admin@denaneya.com',
      role: 'superadmin'
    });
    const res = await request('/api/admin/me', { headers: { Authorization: `Bearer ${token}` } });
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.code, 'ACCOUNT_DEACTIVATED');
  });

  await probe('DEACT_ADMIN', 'DEC-04', 'Suspended admin attempting POST /api/admin/auth/google yields 403 ACCOUNT_DEACTIVATED', async () => {
    const res = await request('/api/admin/auth/google', {
      method: 'POST',
      body: { idToken: 'mock-google-token:suspended_admin@denaneya.com:Suspended Admin' }
    });
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.code, 'ACCOUNT_DEACTIVATED');
  });

  await probe('DEACT_ADMIN', 'DEC-05', 'Suspended admin attempting POST /api/admin/auth/login-2fa yields 401 UNAUTHORIZED', async () => {
    const preAuth = generatePreAuthToken({ id: suspendedAdminId, email: 'suspended_admin@denaneya.com', role: 'superadmin' });
    const otp = generateTOTP(suspendedSec);
    const res = await request('/api/admin/auth/login-2fa', {
      method: 'POST',
      body: { preAuthToken: preAuth, code: otp }
    });
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.code, 'UNAUTHORIZED');
  });

  await probe('DEACT_ADMIN', 'DEC-06', 'Suspended admin attempting POST /api/admin/auth/login-backup yields 401 UNAUTHORIZED', async () => {
    const preAuth = generatePreAuthToken({ id: suspendedAdminId, email: 'suspended_admin@denaneya.com', role: 'superadmin' });
    const res = await request('/api/admin/auth/login-backup', {
      method: 'POST',
      body: { preAuthToken: preAuth, recoveryCode: backupCodesSuspended[0] }
    });
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.code, 'UNAUTHORIZED');
  });

  await probe('DEACT_ADMIN', 'DEC-07', 'Mid-session revocation test: active admin suspended mid-flight blocked with 0-second window', async () => {
    const targetAdminId = 'usr_mid_flight_revocation_test';
    await db.query(
      `INSERT INTO users (id, name, email, password_hash, role, credits, status)
       VALUES (?, 'Mid Revoke Admin', 'mid_revoke@denaneya.com', 'hash', 'superadmin', 100, 'active')`,
      [targetAdminId]
    );

    const validActiveToken = generateToken({
      id: targetAdminId,
      email: 'mid_revoke@denaneya.com',
      role: 'superadmin'
    });

    // Request 1: Must succeed when active
    const resActive = await request('/api/admin/me', { headers: { Authorization: `Bearer ${validActiveToken}` } });
    assert.strictEqual(resActive.status, 200);
    assert.strictEqual(resActive.body.user.id, targetAdminId);

    // SOC deactivates account in DB immediately
    await db.query("UPDATE users SET status = 'suspended' WHERE id = ?", [targetAdminId]);

    // Request 2: With the EXACT SAME 24h JWT, must immediately fail with 403 ACCOUNT_DEACTIVATED
    const resSuspended = await request('/api/admin/me', { headers: { Authorization: `Bearer ${validActiveToken}` } });
    assert.strictEqual(resSuspended.status, 403);
    assert.strictEqual(resSuspended.body.code, 'ACCOUNT_DEACTIVATED');

    // Reactivate: Must immediately succeed again
    await db.query("UPDATE users SET status = 'active' WHERE id = ?", [targetAdminId]);
    const resReactivated = await request('/api/admin/me', { headers: { Authorization: `Bearer ${validActiveToken}` } });
    assert.strictEqual(resReactivated.status, 200);
  });

  // ===========================================================================
  // DOMAIN 3: TOTP CLOCK SKEW FUZZING (±30s PASS, ±60s/±90s REJECT)
  // ===========================================================================
  console.log('\n--- DOMAIN 3: TOTP Clock Skew Fuzzing (±30s PASS, ±60s/±90s REJECT) ---');

  const { secret: totpTestSecret } = generateSecret();
  const testUserId = 'usr_clock_skew_fuzz_user';
  const baseTime = 1750000000;

  await probe('TOTP_SKEW', 'SKW-01', 'Exact timestamp t (delta 0) PASSES verification', () => {
    const code = generateTOTP(totpTestSecret, baseTime);
    const result = verifyTOTP(totpTestSecret, code, {
      timestampSeconds: baseTime,
      userId: testUserId,
      preventReplay: false
    });
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.delta, 0);
  });

  await probe('TOTP_SKEW', 'SKW-02', 'Clock drift +15s (delta 0, same step) PASSES verification', () => {
    const code = generateTOTP(totpTestSecret, baseTime + 15);
    const result = verifyTOTP(totpTestSecret, code, {
      timestampSeconds: baseTime,
      userId: testUserId,
      preventReplay: false
    });
    assert.strictEqual(result.valid, true);
  });

  await probe('TOTP_SKEW', 'SKW-03', 'Clock drift -15s (delta 0, same step) PASSES verification', () => {
    const code = generateTOTP(totpTestSecret, baseTime - 15);
    const result = verifyTOTP(totpTestSecret, code, {
      timestampSeconds: baseTime,
      userId: testUserId,
      preventReplay: false
    });
    assert.strictEqual(result.valid, true);
  });

  await probe('TOTP_SKEW', 'SKW-04', 'Clock drift +30s (+1 step tolerance boundary) PASSES verification', () => {
    const code = generateTOTP(totpTestSecret, baseTime + 30);
    const result = verifyTOTP(totpTestSecret, code, {
      timestampSeconds: baseTime,
      userId: testUserId,
      preventReplay: false
    });
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.delta, 1);
  });

  await probe('TOTP_SKEW', 'SKW-05', 'Clock drift -30s (-1 step tolerance boundary) PASSES verification', () => {
    const code = generateTOTP(totpTestSecret, baseTime - 30);
    const result = verifyTOTP(totpTestSecret, code, {
      timestampSeconds: baseTime,
      userId: testUserId,
      preventReplay: false
    });
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.delta, -1);
  });

  await probe('TOTP_SKEW', 'SKW-06', 'Clock drift +60s (+2 steps, outside tolerance) MUST BE REJECTED', () => {
    const code = generateTOTP(totpTestSecret, baseTime + 60);
    const result = verifyTOTP(totpTestSecret, code, {
      timestampSeconds: baseTime,
      userId: testUserId,
      preventReplay: false
    });
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.reason, 'CODE_MISMATCH');
  });

  await probe('TOTP_SKEW', 'SKW-07', 'Clock drift -60s (-2 steps, outside tolerance) MUST BE REJECTED', () => {
    const code = generateTOTP(totpTestSecret, baseTime - 60);
    const result = verifyTOTP(totpTestSecret, code, {
      timestampSeconds: baseTime,
      userId: testUserId,
      preventReplay: false
    });
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.reason, 'CODE_MISMATCH');
  });

  await probe('TOTP_SKEW', 'SKW-08', 'Clock drift +90s (+3 steps, outside tolerance) MUST BE REJECTED', () => {
    const code = generateTOTP(totpTestSecret, baseTime + 90);
    const result = verifyTOTP(totpTestSecret, code, {
      timestampSeconds: baseTime,
      userId: testUserId,
      preventReplay: false
    });
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.reason, 'CODE_MISMATCH');
  });

  await probe('TOTP_SKEW', 'SKW-09', 'Clock drift -90s (-3 steps, outside tolerance) MUST BE REJECTED', () => {
    const code = generateTOTP(totpTestSecret, baseTime - 90);
    const result = verifyTOTP(totpTestSecret, code, {
      timestampSeconds: baseTime,
      userId: testUserId,
      preventReplay: false
    });
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.reason, 'CODE_MISMATCH');
  });

  await probe('TOTP_SKEW', 'SKW-10', 'Extreme skew (+300s, -300s, +86400s) ALL REJECTED', () => {
    const skews = [300, -300, 86400, -86400];
    for (const s of skews) {
      const code = generateTOTP(totpTestSecret, baseTime + s);
      const res = verifyTOTP(totpTestSecret, code, { timestampSeconds: baseTime, userId: testUserId });
      assert.strictEqual(res.valid, false, `Skew ${s}s must be rejected`);
    }
  });

  await probe('TOTP_SKEW', 'SKW-11', 'Malformed candidate code fuzzing (length != 6, non-numeric, injection)', () => {
    const badCodes = ['12345', '1234567', 'abcdef', '12a456', '', '      ', null, undefined, "' OR 1=1 --"];
    for (const bad of badCodes) {
      const res = verifyTOTP(totpTestSecret, bad, { timestampSeconds: baseTime, userId: testUserId });
      assert.strictEqual(res.valid, false, `Malformed code '${bad}' must be rejected`);
      assert.strictEqual(res.reason, 'INVALID_FORMAT');
    }
  });

  await probe('TOTP_SKEW', 'SKW-12', 'HTTP Route Skew Verification: POST /api/admin/auth/login-2fa accepts ±30s, rejects ±60s/±90s', async () => {
    const skewAdminId = 'usr_admin_http_skew_test';
    const { secret: skewSecret } = generateSecret();
    const encSkewSec = encryptSecret(skewSecret);
    await db.query(
      `INSERT INTO users (id, name, email, password_hash, role, credits, status, two_factor_enabled, two_factor_secret)
       VALUES (?, 'Skew Admin', 'skew_admin@denaneya.com', 'hash', 'superadmin', 100, 'active', 1, ?)`,
      [skewAdminId, encSkewSec]
    );

    const now = Math.floor(Date.now() / 1000);

    // +30s code -> PASS
    antiReplayCache.clear();
    const preAuthP30 = generatePreAuthToken({ id: skewAdminId, email: 'skew_admin@denaneya.com', role: 'superadmin' });
    const codeP30 = generateTOTP(skewSecret, now + 30);
    const resP30 = await request('/api/admin/auth/login-2fa', {
      method: 'POST',
      body: { preAuthToken: preAuthP30, code: codeP30 }
    });
    assert.strictEqual(resP30.status, 200);

    // -30s code -> PASS
    antiReplayCache.clear();
    const preAuthM30 = generatePreAuthToken({ id: skewAdminId, email: 'skew_admin@denaneya.com', role: 'superadmin' });
    const codeM30 = generateTOTP(skewSecret, now - 30);
    const resM30 = await request('/api/admin/auth/login-2fa', {
      method: 'POST',
      body: { preAuthToken: preAuthM30, code: codeM30 }
    });
    assert.strictEqual(resM30.status, 200);

    // +60s code -> REJECT (401)
    const preAuthP60 = generatePreAuthToken({ id: skewAdminId, email: 'skew_admin@denaneya.com', role: 'superadmin' });
    const codeP60 = generateTOTP(skewSecret, now + 60);
    const resP60 = await request('/api/admin/auth/login-2fa', {
      method: 'POST',
      body: { preAuthToken: preAuthP60, code: codeP60 }
    });
    assert.strictEqual(resP60.status, 401);
    assert.strictEqual(resP60.body.code, 'INVALID_2FA_CODE');

    // -60s code -> REJECT (401)
    const preAuthM60 = generatePreAuthToken({ id: skewAdminId, email: 'skew_admin@denaneya.com', role: 'superadmin' });
    const codeM60 = generateTOTP(skewSecret, now - 60);
    const resM60 = await request('/api/admin/auth/login-2fa', {
      method: 'POST',
      body: { preAuthToken: preAuthM60, code: codeM60 }
    });
    assert.strictEqual(resM60.status, 401);
    assert.strictEqual(resM60.body.code, 'INVALID_2FA_CODE');

    // +90s code -> REJECT (401)
    const preAuthP90 = generatePreAuthToken({ id: skewAdminId, email: 'skew_admin@denaneya.com', role: 'superadmin' });
    const codeP90 = generateTOTP(skewSecret, now + 90);
    const resP90 = await request('/api/admin/auth/login-2fa', {
      method: 'POST',
      body: { preAuthToken: preAuthP90, code: codeP90 }
    });
    assert.strictEqual(resP90.status, 401);

    // -90s code -> REJECT (401)
    const preAuthM90 = generatePreAuthToken({ id: skewAdminId, email: 'skew_admin@denaneya.com', role: 'superadmin' });
    const codeM90 = generateTOTP(skewSecret, now - 90);
    const resM90 = await request('/api/admin/auth/login-2fa', {
      method: 'POST',
      body: { preAuthToken: preAuthM90, code: codeM90 }
    });
    assert.strictEqual(resM90.status, 401);
  });

  // ===========================================================================
  // DOMAIN 4: TOTP CODE REPLAY ATTACK
  // ===========================================================================
  console.log('\n--- DOMAIN 4: TOTP Code Replay Attack ---');

  const replayUserId = 'usr_replay_victim_001';
  const replayUserBId = 'usr_replay_other_002';
  const replaySecret = generateSecret().secret;
  const replayNow = 1750000100;
  const validReplayOtp = generateTOTP(replaySecret, replayNow);

  await probe('TOTP_REPLAY', 'RPL-01', 'First submission of valid OTP succeeds', () => {
    antiReplayCache.clear();
    const result = verifyTOTP(replaySecret, validReplayOtp, {
      timestampSeconds: replayNow,
      userId: replayUserId,
      preventReplay: true
    });
    assert.strictEqual(result.valid, true);
  });

  await probe('TOTP_REPLAY', 'RPL-02', 'Immediate second submission of identical OTP is REJECTED with REPLAY_DETECTED', () => {
    const result = verifyTOTP(replaySecret, validReplayOtp, {
      timestampSeconds: replayNow,
      userId: replayUserId,
      preventReplay: true
    });
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.reason, 'REPLAY_DETECTED');
  });

  await probe('TOTP_REPLAY', 'RPL-03', 'Subsequent 3rd, 4th, and 5th submissions all consistently REJECTED', () => {
    for (let i = 0; i < 3; i++) {
      const result = verifyTOTP(replaySecret, validReplayOtp, {
        timestampSeconds: replayNow,
        userId: replayUserId,
        preventReplay: true
      });
      assert.strictEqual(result.valid, false);
      assert.strictEqual(result.reason, 'REPLAY_DETECTED');
    }
  });

  await probe('TOTP_REPLAY', 'RPL-04', 'Multi-tenant isolation: User A replay lock does NOT lock distinct User B', () => {
    const resultB = verifyTOTP(replaySecret, validReplayOtp, {
      timestampSeconds: replayNow,
      userId: replayUserBId,
      preventReplay: true
    });
    assert.strictEqual(resultB.valid, true, 'User B must not be blocked by User A replay entry');
  });

  await probe('TOTP_REPLAY', 'RPL-05', 'HTTP route POST /api/admin/auth/login-2fa enforces replay rejection', async () => {
    const admin2faId = 'usr_admin_2fa_replay_http';
    const { secret: adminSecret } = generateSecret();
    const encryptedSec = encryptSecret(adminSecret);
    await db.query(
      `INSERT INTO users (id, name, email, password_hash, role, credits, status, two_factor_enabled, two_factor_secret)
       VALUES (?, '2FA Replay Admin', 'replay_admin@denaneya.com', 'hash', 'superadmin', 100, 'active', 1, ?)`,
      [admin2faId, encryptedSec]
    );

    const preAuth1 = generatePreAuthToken({ id: admin2faId, email: 'replay_admin@denaneya.com', role: 'superadmin' });
    const currentOtp = generateTOTP(adminSecret);

    // Attempt 1: Valid OTP succeeds
    const res1 = await request('/api/admin/auth/login-2fa', {
      method: 'POST',
      body: { preAuthToken: preAuth1, code: currentOtp }
    });
    assert.strictEqual(res1.status, 200);
    assert.strictEqual(res1.body.success, true);
    assert.ok(res1.body.token);

    // Attempt 2: Same OTP replayed with fresh preAuthToken
    const preAuth2 = generatePreAuthToken({ id: admin2faId, email: 'replay_admin@denaneya.com', role: 'superadmin' });
    const res2 = await request('/api/admin/auth/login-2fa', {
      method: 'POST',
      body: { preAuthToken: preAuth2, code: currentOtp }
    });
    assert.strictEqual(res2.status, 401);
    assert.strictEqual(res2.body.code, 'REPLAY_DETECTED');
  });

  await probe('TOTP_REPLAY', 'RPL-06', 'HTTP route POST /api/admin/2fa/verify rejects replayed verification OTP with 400 REPLAY_DETECTED', async () => {
    const setupAdminId = 'usr_admin_setup_replay_test';
    await db.query(
      `INSERT INTO users (id, name, email, password_hash, role, credits, status)
       VALUES (?, 'Setup Replay Admin', 'setup_replay@denaneya.com', 'hash', 'superadmin', 100, 'active')`,
      [setupAdminId]
    );

    const adminToken = generateToken({ id: setupAdminId, email: 'setup_replay@denaneya.com', role: 'superadmin' });
    const genRes = await request('/api/admin/2fa/generate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(genRes.status, 200);
    const newSecret = genRes.body.secret;
    const otp = generateTOTP(newSecret);

    // Verification attempt 1: Succeeds
    const verRes1 = await request('/api/admin/2fa/verify', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { code: otp }
    });
    assert.strictEqual(verRes1.status, 200);
    assert.strictEqual(verRes1.body.twoFactorEnabled, true);

    // Verification attempt 2: Replay same code
    const verRes2 = await request('/api/admin/2fa/verify', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { code: otp }
    });
    assert.strictEqual(verRes2.status, 400);
    assert.strictEqual(verRes2.body.code, 'REPLAY_DETECTED');
  });

  // ===========================================================================
  // DOMAIN 5: EMERGENCY BACKUP CODE REUSE & CRYPTOGRAPHIC RESISTANCE
  // ===========================================================================
  console.log('\n--- DOMAIN 5: Emergency Backup Code Single-Use & Cryptographic Storage ---');

  const backupAdminId = 'usr_backup_test_admin_001';
  const backupCodesRaw = generateBackupCodes(8);
  const backupCodesHashed = await hashBackupCodes(backupCodesRaw);

  await db.query(
    `INSERT INTO users (id, name, email, password_hash, role, credits, status, two_factor_enabled, two_factor_backup_codes)
     VALUES (?, 'Backup Code Admin', 'backup_admin@denaneya.com', 'hash', 'superadmin', 100, 'active', 1, ?)`,
    [backupAdminId, JSON.stringify(backupCodesHashed)]
  );

  await probe('BACKUP_CODE', 'BCK-01', 'Cryptographic verification: backup codes stored strictly as bcrypt hashes in database', async () => {
    const user = await db.get('SELECT two_factor_backup_codes FROM users WHERE id = ?', [backupAdminId]);
    const parsed = JSON.parse(user.two_factor_backup_codes);
    assert.strictEqual(parsed.length, 8);
    for (const h of parsed) {
      assert.match(h, /^\$2[aby]\$\d{2}\$/, 'Stored backup code must be a valid bcrypt hash');
    }
    for (const plain of backupCodesRaw) {
      assert.strictEqual(user.two_factor_backup_codes.includes(plain), false, `Plaintext code '${plain}' must never appear in DB`);
    }
  });

  await probe('BACKUP_CODE', 'BCK-02', 'Valid recovery code login succeeds and decrements remaining codes from 8 to 7', async () => {
    const preAuth = generatePreAuthToken({ id: backupAdminId, email: 'backup_admin@denaneya.com', role: 'superadmin' });
    const res = await request('/api/admin/auth/login-backup', {
      method: 'POST',
      body: { preAuthToken: preAuth, recoveryCode: backupCodesRaw[0] }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.remainingBackupCodes, 7);
    assert.ok(res.body.token);

    const user = await db.get('SELECT two_factor_backup_codes FROM users WHERE id = ?', [backupAdminId]);
    assert.strictEqual(JSON.parse(user.two_factor_backup_codes).length, 7);
  });

  await probe('BACKUP_CODE', 'BCK-03', 'Immediate reuse attack: submitting the consumed code again FAILS with 401 INVALID_BACKUP_CODE', async () => {
    const preAuth = generatePreAuthToken({ id: backupAdminId, email: 'backup_admin@denaneya.com', role: 'superadmin' });
    const res = await request('/api/admin/auth/login-backup', {
      method: 'POST',
      body: { preAuthToken: preAuth, recoveryCode: backupCodesRaw[0] }
    });
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.code, 'INVALID_BACKUP_CODE');
  });

  await probe('BACKUP_CODE', 'BCK-04', 'Burst reuse attack (10 consecutive attempts with consumed code) ALL consistently rejected', async () => {
    for (let i = 0; i < 10; i++) {
      const preAuth = generatePreAuthToken({ id: backupAdminId, email: 'backup_admin@denaneya.com', role: 'superadmin' });
      const res = await request('/api/admin/auth/login-backup', {
        method: 'POST',
        body: { preAuthToken: preAuth, recoveryCode: backupCodesRaw[0] }
      });
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.code, 'INVALID_BACKUP_CODE');
    }
  });

  await probe('BACKUP_CODE', 'BCK-05', 'Format normalizer resilience: lowercase, space, and no-hyphen variant succeeds once then locks', async () => {
    const rawCode = backupCodesRaw[1];
    const messyCode = ` ${rawCode.replace('-', '').toLowerCase()}  `;

    const preAuth1 = generatePreAuthToken({ id: backupAdminId, email: 'backup_admin@denaneya.com', role: 'superadmin' });
    const res1 = await request('/api/admin/auth/login-backup', {
      method: 'POST',
      body: { preAuthToken: preAuth1, recoveryCode: messyCode }
    });
    assert.strictEqual(res1.status, 200);
    assert.strictEqual(res1.body.remainingBackupCodes, 6);

    const preAuth2 = generatePreAuthToken({ id: backupAdminId, email: 'backup_admin@denaneya.com', role: 'superadmin' });
    const res2 = await request('/api/admin/auth/login-backup', {
      method: 'POST',
      body: { preAuthToken: preAuth2, recoveryCode: rawCode }
    });
    assert.strictEqual(res2.status, 401);
  });

  await probe('BACKUP_CODE', 'BCK-06', 'Complete backup code exhaustion: consuming all remaining codes triggers NO_BACKUP_CODES_REMAINING', async () => {
    for (let i = 2; i < 8; i++) {
      const preAuth = generatePreAuthToken({ id: backupAdminId, email: 'backup_admin@denaneya.com', role: 'superadmin' });
      const res = await request('/api/admin/auth/login-backup', {
        method: 'POST',
        body: { preAuthToken: preAuth, recoveryCode: backupCodesRaw[i] }
      });
      assert.strictEqual(res.status, 200);
    }

    const user = await db.get('SELECT two_factor_backup_codes FROM users WHERE id = ?', [backupAdminId]);
    assert.strictEqual(JSON.parse(user.two_factor_backup_codes).length, 0);

    const preAuth = generatePreAuthToken({ id: backupAdminId, email: 'backup_admin@denaneya.com', role: 'superadmin' });
    const resExhausted = await request('/api/admin/auth/login-backup', {
      method: 'POST',
      body: { preAuthToken: preAuth, recoveryCode: 'XXXX-YYYY' }
    });
    assert.strictEqual(resExhausted.status, 400);
    assert.strictEqual(resExhausted.body.code, 'NO_BACKUP_CODES_REMAINING');
  });

  // ===========================================================================
  // DOMAIN 6: GOOGLE OAUTH ROLE SPOOFING & ESCALATION DEFENSE
  // ===========================================================================
  console.log('\n--- DOMAIN 6: Google OAuth Role Spoofing & Escalation Defense ---');

  await probe('GOOG_SPOOF', 'GOG-01', 'Public Google verify-token claiming superadmin role strictly forces merchant role', async () => {
    const attackerEmail = `attacker_spoof_${Date.now()}@gmail.com`;
    const res = await request('/api/auth/google/verify-token', {
      method: 'POST',
      body: {
        idToken: `mock-google-token:${attackerEmail}:Attacker Spoof`,
        role: 'superadmin'
      }
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.user.role, 'merchant', 'Role MUST strictly be merchant, never superadmin');

    const user = await db.get('SELECT role FROM users WHERE email = ?', [attackerEmail]);
    assert.strictEqual(user.role, 'merchant');
  });

  await probe('GOOG_SPOOF', 'GOG-02', 'Public Google verify-token using mock-google-token-admin does not alter role to superadmin on new user', async () => {
    const profile = {
      googleId: `gid_adversarial_${Date.now()}`,
      email: `fake_admin_${Date.now()}@google.com`,
      name: 'Fake Admin'
    };
    const result = await findOrCreateUserFromGoogle(profile, { role: 'superadmin', autoCreate: true });
    assert.strictEqual(result.user.role, 'merchant', 'findOrCreateUserFromGoogle must neutralize superadmin injection');
  });

  await probe('GOOG_SPOOF', 'GOG-03', 'Publicly registered Google user attempting /api/admin/me yields 403 FORBIDDEN_SUPERADMIN_REQUIRED', async () => {
    const googleMerchantEmail = `google_user_probe_${Date.now()}@gmail.com`;
    const regRes = await request('/api/auth/google/verify-token', {
      method: 'POST',
      body: { idToken: `mock-google-token:${googleMerchantEmail}:Google Merchant` }
    });
    assert.strictEqual(regRes.status, 201);
    const merchantToken = regRes.body.token;

    const adminRes = await request('/api/admin/me', {
      headers: { Authorization: `Bearer ${merchantToken}` }
    });
    assert.strictEqual(adminRes.status, 403);
    assert.strictEqual(adminRes.body.code, 'FORBIDDEN_SUPERADMIN_REQUIRED');
  });

  await probe('GOOG_SPOOF', 'GOG-04', 'POST /api/admin/auth/google with unauthorized Google identity rejected with 403', async () => {
    const res = await request('/api/admin/auth/google', {
      method: 'POST',
      body: { idToken: 'mock-google-token:unauthorized_stranger@gmail.com:Stranger' }
    });
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.code, 'FORBIDDEN_SUPERADMIN_REQUIRED');
    assert.match(res.body.message, /No Super Admin account found with this Google identity/);
  });

  await probe('GOOG_SPOOF', 'GOG-05', 'POST /api/admin/auth/google with registered merchant Google identity rejected with 403', async () => {
    const merchantEmail = `existing_merchant_${Date.now()}@gmail.com`;
    await request('/api/auth/google/verify-token', {
      method: 'POST',
      body: { idToken: `mock-google-token:${merchantEmail}:Existing Merchant` }
    });

    const res = await request('/api/admin/auth/google', {
      method: 'POST',
      body: { idToken: `mock-google-token:${merchantEmail}:Existing Merchant` }
    });
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.code, 'FORBIDDEN_SUPERADMIN_REQUIRED');
    assert.match(res.body.message, /Administrative privileges required/);
  });

  await probe('GOOG_SPOOF', 'GOG-06', 'Negative mock Google token rejections: invalid, expired, unverified, audience mismatch', async () => {
    const invalidRes = await request('/api/auth/google/verify-token', {
      method: 'POST',
      body: { idToken: 'mock-google-token-invalid' }
    });
    assert.strictEqual(invalidRes.status, 401);
    assert.strictEqual(invalidRes.body.code, 'INVALID_GOOGLE_TOKEN');

    const expiredRes = await request('/api/auth/google/verify-token', {
      method: 'POST',
      body: { idToken: 'mock-google-token-expired' }
    });
    assert.strictEqual(expiredRes.status, 401);
    assert.strictEqual(expiredRes.body.code, 'TOKEN_EXPIRED');

    const unverifiedRes = await request('/api/auth/google/verify-token', {
      method: 'POST',
      body: { idToken: 'mock-google-token-unverified' }
    });
    assert.strictEqual(unverifiedRes.status, 500);
    assert.strictEqual(unverifiedRes.body.code, 'EMAIL_NOT_VERIFIED');

    const audRes = await request('/api/auth/google/verify-token', {
      method: 'POST',
      body: { idToken: 'mock-google-token-wrong-audience' }
    });
    assert.strictEqual(audRes.status, 401);
    assert.strictEqual(audRes.body.code, 'TOKEN_AUDIENCE_MISMATCH');
  });

} finally {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
}

console.log('\n===============================================================================');
console.log(`   Adversarial Stress & Exploit Probe Results: ${stats.passed} Passed, ${stats.failed} Failed (Total: ${stats.total})`);
console.log('===============================================================================\n');

if (stats.failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
