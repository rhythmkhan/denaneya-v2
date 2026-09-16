/**
 * DenaNeya v2.0 - Milestone 1 Master Test Suite
 * Validates:
 * 1. Dynamic migration runner applying 001 and 002 sequentially
 * 2. Database superadmin helpers (system_settings, admin_audit_logs, credit_audit_logs, impersonation_logs)
 * 3. RFC 6238 TOTP Engine (RFC test vectors, ±30s skew tolerance, 90s anti-replay, backup codes, AES encryption)
 * 4. Google OAuth 2.0 S2S validation, deterministic mock fallback, and user resolver/linking
 * 5. SuperAdminGuard live DB verification and 403 enforcement
 * 6. Full HTTP route integration for all M1 endpoints
 */

import './setup-test-env.js';
import assert from 'node:assert';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';

const { default: dbPkg } = await import('@denaneya/database');
const {
  getDatabase,
  setDatabase,
  resetDatabase,
  runMigrations,
  getSystemSetting,
  setSystemSetting,
  getAllSystemSettings,
  createAdminAuditLog,
  getAdminAuditLogs,
  createCreditAuditLog,
  getCreditAuditLogs,
  createImpersonationLog,
  getImpersonationLogs
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
} = await import('../src/services/totpService.js');

const {
  verifyGoogleIdToken,
  parseMockGoogleToken,
  findOrCreateUserFromGoogle
} = await import('../src/services/googleAuthService.js');

const {
  generateToken,
  generatePreAuthToken,
  verifyPreAuthToken
} = await import('../src/utils/token.js');

const { createApp } = await import('../src/app.js');

console.log('===============================================================================');
console.log('      DenaNeya v2.0 - Milestone 1 Master Test Suite                            ');
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
  // ---------------------------------------------------------------------------
  // SECTION 1: Dynamic Migration Runner & Schema 002
  // ---------------------------------------------------------------------------
  console.log('\n--- DOMAIN 1: Dynamic Migration Runner & Schema 002 ---');

  await test('M1-MIG-01: Sequential dynamic discovery & execution of 001 and 002 migrations', async () => {
    db = getDatabase();
    const result = await runMigrations(db, { reset: true });
    assert.strictEqual(result.success, true);
    assert.ok(result.migrationsApplied.includes('001_initial_schema'));
    assert.ok(result.migrationsApplied.includes('002_superadmin_suite'));

    // Check all 14 tables
    const expectedTables = [
      '_migrations',
      'users',
      'brands',
      'devices',
      'gateways',
      'invoices',
      'stored_data',
      'webhook_logs',
      'staff_permissions',
      'affiliate_referrals',
      'admin_audit_logs',
      'credit_audit_logs',
      'impersonation_logs',
      'system_settings'
    ];
    for (const table of expectedTables) {
      assert.ok(result.tablesCreated.includes(table), `Table ${table} must be created`);
    }

    // Check 2FA and Google columns on users table
    const userCols = db.raw.pragma('table_info(users)').map((c) => c.name);
    assert.ok(userCols.includes('two_factor_secret'), 'users.two_factor_secret column missing');
    assert.ok(userCols.includes('two_factor_enabled'), 'users.two_factor_enabled column missing');
    assert.ok(userCols.includes('two_factor_backup_codes'), 'users.two_factor_backup_codes column missing');
    assert.ok(userCols.includes('google_id'), 'users.google_id column missing');
    assert.ok(userCols.includes('avatar_url'), 'users.avatar_url column missing');
  });

  await test('M1-MIG-02: Idempotent default system settings and superadmin seeds', async () => {
    const admin = await db.get("SELECT * FROM users WHERE email = 'admin@denaneya.com'");
    assert.ok(admin, 'Default superadmin must exist');
    assert.strictEqual(admin.role, 'superadmin');
    assert.strictEqual(admin.status, 'active');

    const pricing = await db.get("SELECT * FROM system_settings WHERE key_name = 'pricing'");
    assert.ok(pricing, 'Pricing setting must exist');
    const parsedPricing = JSON.parse(pricing.value_json);
    assert.strictEqual(parsedPricing.rate_per_verification_bdt, 1.0);
    assert.strictEqual(parsedPricing.starter_credits, 50);

    const maintenance = await db.get("SELECT * FROM system_settings WHERE key_name = 'maintenance_mode'");
    assert.ok(maintenance, 'Maintenance mode setting must exist');
  });

  // ---------------------------------------------------------------------------
  // SECTION 2: Database Helpers (superadmin.js)
  // ---------------------------------------------------------------------------
  console.log('\n--- DOMAIN 2: Database Super Admin Helpers ---');

  await test('M1-DB-01: System Settings get, set, and getAll helpers', async () => {
    // getSystemSetting with default
    const nonExistent = await getSystemSetting(db, 'non_existent_key', { fallback: true });
    assert.deepStrictEqual(nonExistent, { fallback: true });

    // get existing
    const existing = await getSystemSetting(db, 'master_gateways');
    assert.deepStrictEqual(existing, { disabled_channels: [] });

    // setSystemSetting
    await setSystemSetting(db, 'test_key', 'test_cat', { foo: 'bar' }, 'usr_superadmin_master_001', 'Test setting');
    const updated = await getSystemSetting(db, 'test_key');
    assert.deepStrictEqual(updated, { foo: 'bar' });

    // getAllSystemSettings
    const all = await getAllSystemSettings(db);
    assert.ok(all.pricing);
    assert.ok(all.test_key);
    assert.strictEqual(all.test_key.category, 'test_cat');

    const byCat = await getAllSystemSettings(db, 'test_cat');
    assert.strictEqual(Object.keys(byCat).length, 1);
    assert.ok(byCat.test_key);
  });

  await test('M1-DB-02: Admin audit logs creation and paginated queries', async () => {
    const log = await createAdminAuditLog(db, {
      adminId: 'usr_superadmin_master_001',
      action: 'UPDATE_SETTING',
      targetType: 'setting',
      targetId: 'pricing',
      details: { change: 'price_bump' },
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0'
    });
    assert.ok(log.id);
    assert.strictEqual(log.action, 'UPDATE_SETTING');

    const result = await getAdminAuditLogs(db, { action: 'UPDATE_SETTING' });
    assert.ok(result.total >= 1);
    assert.strictEqual(result.logs[0].action, 'UPDATE_SETTING');
    assert.strictEqual(result.logs[0].admin_email, 'admin@denaneya.com');
  });

  await test('M1-DB-03: Credit audit logs recording and retrieval with reason', async () => {
    // Create a merchant to adjust
    const merchantId = 'usr_test_merchant_credit';
    await db.query(
      `INSERT INTO users (id, name, email, password_hash, role, credits, status)
       VALUES (?, 'Test Merchant', 'merchant_credit@test.com', 'hash', 'merchant', 100, 'active')`,
      [merchantId]
    );

    const creditLog = await createCreditAuditLog(db, {
      userId: merchantId,
      adminId: 'usr_superadmin_master_001',
      deltaCredits: 50,
      previousCredits: 100,
      newCredits: 150,
      reason: 'Promotional grant for testing'
    });
    assert.strictEqual(creditLog.delta_credits, 50);

    // Reason is mandatory
    await assert.rejects(
      async () => {
        await createCreditAuditLog(db, {
          userId: merchantId,
          adminId: 'usr_superadmin_master_001',
          deltaCredits: 10,
          previousCredits: 150,
          newCredits: 160,
          reason: ''
        });
      },
      /reason is mandatory/
    );

    const logs = await getCreditAuditLogs(db, { userId: merchantId });
    assert.strictEqual(logs.total, 1);
    assert.strictEqual(logs.logs[0].reason, 'Promotional grant for testing');
  });

  await test('M1-DB-04: Impersonation logs tracking session transitions', async () => {
    const merchantId = 'usr_test_merchant_credit';
    const impLog = await createImpersonationLog(db, {
      adminId: 'usr_superadmin_master_001',
      targetUserId: merchantId,
      action: 'START_IMPERSONATION',
      ipAddress: '127.0.0.1',
      metadata: { reason: 'Investigating billing issue' }
    });
    assert.ok(impLog.id);
    assert.strictEqual(impLog.action, 'START_IMPERSONATION');

    const history = await getImpersonationLogs(db, { targetUserId: merchantId });
    assert.strictEqual(history.total, 1);
    assert.strictEqual(history.logs[0].target_name, 'Test Merchant');
  });

  // ---------------------------------------------------------------------------
  // SECTION 3: RFC 6238 TOTP Engine & Cryptography
  // ---------------------------------------------------------------------------
  console.log('\n--- DOMAIN 3: RFC 6238 TOTP Engine & Cryptography ---');

  await test('M1-TOTP-01: Base32 encoding and decoding correctness', () => {
    const original = Buffer.from('Hello DenaNeya v2.0!', 'utf8');
    const encoded = base32Encode(original);
    const decoded = base32Decode(encoded);
    assert.strictEqual(decoded.toString('utf8'), 'Hello DenaNeya v2.0!');

    // Tolerates dashes, spaces, lowercase
    const formatted = `${encoded.slice(0, 4)}-${encoded.slice(4)} `.toLowerCase();
    const decodedFormatted = base32Decode(formatted);
    assert.strictEqual(decodedFormatted.toString('utf8'), 'Hello DenaNeya v2.0!');
  });

  await test('M1-TOTP-02: RFC 6238 Appendix B test vectors validation', () => {
    // Secret: ASCII "12345678901234567890" = 20 bytes
    // Base32: GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ
    const rfcSecret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

    const testVectors = [
      { time: 59, expected: '287082' },
      { time: 1111111109, expected: '081804' },
      { time: 1111111111, expected: '050471' },
      { time: 1234567890, expected: '005924' },
      { time: 2000000000, expected: '279037' }
    ];

    for (const v of testVectors) {
      const code = generateTOTP(rfcSecret, v.time);
      assert.strictEqual(code, v.expected, `TOTP mismatch at timestamp ${v.time}: expected ${v.expected}, got ${code}`);
    }
  });

  await test('M1-TOTP-03: Window tolerance (±30s skew) validation', () => {
    const { secret } = generateSecret();
    const now = Math.floor(Date.now() / 1000);

    // Current step
    const currentCode = generateTOTP(secret, now);
    const currentVerif = verifyTOTP(secret, currentCode, { timestampSeconds: now, userId: 'u1', preventReplay: false });
    assert.strictEqual(currentVerif.valid, true);
    assert.strictEqual(currentVerif.delta, 0);

    // Past step (-30s)
    const pastCode = generateTOTP(secret, now - 30);
    const pastVerif = verifyTOTP(secret, pastCode, { timestampSeconds: now, userId: 'u1', preventReplay: false });
    assert.strictEqual(pastVerif.valid, true);
    assert.strictEqual(pastVerif.delta, -1);

    // Future step (+30s)
    const futureCode = generateTOTP(secret, now + 30);
    const futureVerif = verifyTOTP(secret, futureCode, { timestampSeconds: now, userId: 'u1', preventReplay: false });
    assert.strictEqual(futureVerif.valid, true);
    assert.strictEqual(futureVerif.delta, 1);

    // Far past step (-60s) outside window
    const farPastCode = generateTOTP(secret, now - 60);
    const farPastVerif = verifyTOTP(secret, farPastCode, { timestampSeconds: now, userId: 'u1', window: 1 });
    assert.strictEqual(farPastVerif.valid, false);
    assert.strictEqual(farPastVerif.reason, 'CODE_MISMATCH');
  });

  await test('M1-TOTP-04: 90-second Anti-Replay cache rejection', () => {
    const { secret } = generateSecret();
    const now = Math.floor(Date.now() / 1000);
    const code = generateTOTP(secret, now);
    const testUserId = `user_replay_${Date.now()}`;

    // First use: valid
    const firstAttempt = verifyTOTP(secret, code, { timestampSeconds: now, userId: testUserId, preventReplay: true });
    assert.strictEqual(firstAttempt.valid, true);

    // Immediate replay attempt: rejected
    const replayAttempt = verifyTOTP(secret, code, { timestampSeconds: now, userId: testUserId, preventReplay: true });
    assert.strictEqual(replayAttempt.valid, false);
    assert.strictEqual(replayAttempt.reason, 'REPLAY_DETECTED');
  });

  await test('M1-TOTP-05: Emergency backup codes generation, hashing, and single-use consumption', async () => {
    const codes = generateBackupCodes(8);
    assert.strictEqual(codes.length, 8);
    for (const c of codes) {
      assert.match(c, /^[A-F0-9]{4}-[A-F0-9]{4}$/);
    }

    const hashes = await hashBackupCodes(codes);
    assert.strictEqual(hashes.length, 8);

    // Match valid code
    const match = await verifyBackupCode(codes[0], hashes);
    assert.strictEqual(match.valid, true);
    assert.strictEqual(match.matchedIndex, 0);

    // Match case-insensitively and without hyphens
    const normalizedCode = codes[1].replace('-', '').toLowerCase();
    const match2 = await verifyBackupCode(normalizedCode, hashes);
    assert.strictEqual(match2.valid, true);
    assert.strictEqual(match2.matchedIndex, 1);

    // Invalid code
    const invalidMatch = await verifyBackupCode('INVALID-CODE', hashes);
    assert.strictEqual(invalidMatch.valid, false);
  });

  await test('M1-TOTP-06: AES-256-GCM secret encryption at rest', () => {
    const plainSecret = 'JBSWY3DPEHPK3PXP';
    const encrypted = encryptSecret(plainSecret);
    assert.notStrictEqual(encrypted, plainSecret);
    assert.ok(encrypted.includes(':'));

    const decrypted = decryptSecret(encrypted);
    assert.strictEqual(decrypted, plainSecret);
  });

  await test('M1-TOTP-07: QR Code Data URL generation with otpauth URI', async () => {
    const uri = generateOtpauthUri('admin@denaneya.com', 'JBSWY3DPEHPK3PXP', 'DenaNeya');
    assert.ok(uri.startsWith('otpauth://totp/DenaNeya:admin%40denaneya.com?secret=JBSWY3DPEHPK3PXP'));

    const dataUrl = await generateQRCodeDataUrl(uri);
    assert.ok(dataUrl.startsWith('data:image/png;base64,'));
  });

  // ---------------------------------------------------------------------------
  // SECTION 4: Google OAuth 2.0 & User Resolver
  // ---------------------------------------------------------------------------
  console.log('\n--- DOMAIN 4: Google OAuth 2.0 & User Resolver ---');

  await test('M1-GOOG-01: Deterministic mock Google token parsing & negative rejection', async () => {
    const adminToken = parseMockGoogleToken('mock-google-token-admin');
    assert.strictEqual(adminToken.email, 'admin@denaneya.com');
    assert.strictEqual(adminToken.name, 'Super Admin');
    assert.ok(adminToken.googleId);

    const customToken = parseMockGoogleToken('mock-google-token:john@example.com:John Doe');
    assert.strictEqual(customToken.email, 'john@example.com');
    assert.strictEqual(customToken.name, 'John Doe');

    // Negative cases
    assert.throws(() => parseMockGoogleToken('mock-google-token-invalid'), /invalid token/);
    assert.throws(() => parseMockGoogleToken('mock-google-token-expired'), /expired/);
    assert.throws(() => parseMockGoogleToken('mock-google-token-unverified'), /not verified/);
    assert.throws(() => parseMockGoogleToken('mock-google-token-wrong-audience'), /audience/);
  });

  await test('M1-GOOG-02: Auto-provisioning new merchant with default brand and 50 starter credits', async () => {
    const profile = {
      googleId: `gid_${crypto.randomBytes(8).toString('hex')}`,
      email: `google_merchant_${Date.now()}@example.com`,
      name: 'Google Merchant',
      avatarUrl: 'https://example.com/photo.jpg'
    };

    const result = await findOrCreateUserFromGoogle(profile, { role: 'merchant', autoCreate: true });
    assert.strictEqual(result.isNewUser, true);
    assert.strictEqual(result.linked, false);
    assert.strictEqual(result.user.role, 'merchant');
    assert.strictEqual(result.user.credits, 50);
    assert.ok(result.brand, 'Brand must be auto-provisioned');
    assert.strictEqual(result.brand.brandName, "Google Merchant's Brand");

    // Verify in database
    const dbUser = await db.get('SELECT * FROM users WHERE id = ?', [result.user.id]);
    assert.ok(dbUser);
    assert.strictEqual(dbUser.google_id, profile.googleId);
    assert.strictEqual(dbUser.avatar_url, profile.avatarUrl);
  });

  await test('M1-GOOG-03: Account linking for pre-existing email without duplication', async () => {
    const existingEmail = `pre_existing_${Date.now()}@example.com`;
    const userId = `usr_${crypto.randomBytes(8).toString('hex')}`;
    await db.query(
      `INSERT INTO users (id, name, email, password_hash, role, credits, status)
       VALUES (?, 'Pre-existing User', ?, 'hash', 'merchant', 100, 'active')`,
      [userId, existingEmail]
    );

    const googleId = `gid_link_${Date.now()}`;
    const profile = {
      googleId,
      email: existingEmail,
      name: 'Pre-existing User',
      avatarUrl: 'https://example.com/avatar.png'
    };

    const result = await findOrCreateUserFromGoogle(profile);
    assert.strictEqual(result.isNewUser, false);
    assert.strictEqual(result.linked, true);
    assert.strictEqual(result.user.id, userId);

    const updated = await db.get('SELECT google_id, avatar_url FROM users WHERE id = ?', [userId]);
    assert.strictEqual(updated.google_id, googleId);
    assert.strictEqual(updated.avatar_url, 'https://example.com/avatar.png');
  });

  await test('M1-GOOG-04: Strict anti-escalation: public Google OAuth NEVER provisions superadmin', async () => {
    const profile = {
      googleId: `gid_escalate_${Date.now()}`,
      email: `hacker_${Date.now()}@example.com`,
      name: 'Sneaky Attacker'
    };

    // Even if options pass role: 'superadmin', findOrCreateUserFromGoogle must force role: 'merchant'
    const result = await findOrCreateUserFromGoogle(profile, { role: 'superadmin', autoCreate: true });
    assert.strictEqual(result.user.role, 'merchant', 'Role must NEVER be escalated to superadmin');

    const dbUser = await db.get('SELECT role FROM users WHERE id = ?', [result.user.id]);
    assert.strictEqual(dbUser.role, 'merchant');
  });

  // ---------------------------------------------------------------------------
  // SECTION 5: SuperAdminGuard Middleware & Live DB Check
  // ---------------------------------------------------------------------------
  console.log('\n--- DOMAIN 5: SuperAdminGuard Middleware & Live DB Check ---');

  // Start HTTP server for integration testing
  const app = createApp({ db });
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });

  await test('M1-SEC-01: Rejects unauthenticated request to /api/admin/me with 401', async () => {
    const res = await request('/api/admin/me');
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.code, 'UNAUTHORIZED');
  });

  await test('M1-SEC-02: Rejects merchant token to /api/admin/me with 403', async () => {
    const merchantToken = generateToken({
      id: 'usr_test_merchant_credit',
      email: 'merchant_credit@test.com',
      role: 'merchant',
      credits: 100
    });

    const res = await request('/api/admin/me', {
      headers: { Authorization: `Bearer ${merchantToken}` }
    });
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.code, 'FORBIDDEN_SUPERADMIN_REQUIRED');
  });

  await test('M1-SEC-03: Forged JWT claiming superadmin role caught by Live DB check (403)', async () => {
    // Forged token: claims role: 'superadmin', but user in DB has role: 'merchant'
    const forgedToken = generateToken({
      id: 'usr_test_merchant_credit',
      email: 'merchant_credit@test.com',
      role: 'superadmin',
      credits: 100
    });

    const res = await request('/api/admin/me', {
      headers: { Authorization: `Bearer ${forgedToken}` }
    });
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.code, 'FORBIDDEN_SUPERADMIN_REQUIRED');
  });

  await test('M1-SEC-04: Non-existent user ID in forged token rejected with 401 USER_NOT_FOUND', async () => {
    const forgedToken = generateToken({
      id: 'usr_ghost_non_existent',
      email: 'ghost@example.com',
      role: 'superadmin'
    });

    const res = await request('/api/admin/me', {
      headers: { Authorization: `Bearer ${forgedToken}` }
    });
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.code, 'USER_NOT_FOUND');
  });

  await test('M1-SEC-05: Deactivated superadmin account rejected with 403 ACCOUNT_DEACTIVATED', async () => {
    const suspendedAdminId = 'usr_suspended_admin';
    await db.query(
      `INSERT INTO users (id, name, email, password_hash, role, credits, status)
       VALUES (?, 'Suspended Admin', 'suspended@denaneya.com', 'hash', 'superadmin', 0, 'suspended')`,
      [suspendedAdminId]
    );

    const token = generateToken({
      id: suspendedAdminId,
      email: 'suspended@denaneya.com',
      role: 'superadmin'
    });

    const res = await request('/api/admin/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.code, 'ACCOUNT_DEACTIVATED');
  });

  await test('M1-SEC-06: Genuine active superadmin authorized on /api/admin/me', async () => {
    const token = generateToken({
      id: 'usr_superadmin_master_001',
      email: 'admin@denaneya.com',
      role: 'superadmin',
      credits: 999999
    });

    const res = await request('/api/admin/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.user.email, 'admin@denaneya.com');
    assert.strictEqual(res.body.user.role, 'superadmin');
  });

  // ---------------------------------------------------------------------------
  // SECTION 6: Full HTTP Route Integration
  // ---------------------------------------------------------------------------
  console.log('\n--- DOMAIN 6: Full HTTP Route Integration ---');

  await test('M1-HTTP-01: POST /api/auth/google/verify-token validates and provisions merchant', async () => {
    const res = await request('/api/auth/google/verify-token', {
      method: 'POST',
      body: { idToken: 'mock-google-token:new_google_user@test.com:New Google User' }
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.isNewUser, true);
    assert.strictEqual(res.body.user.email, 'new_google_user@test.com');
    assert.ok(res.body.token, 'JWT must be issued');
    assert.ok(res.body.brand, 'Brand must be provisioned');

    // Repeated call -> returns 200
    const res2 = await request('/api/auth/google/verify-token', {
      method: 'POST',
      body: { idToken: 'mock-google-token:new_google_user@test.com:New Google User' }
    });
    assert.strictEqual(res2.status, 200);
    assert.strictEqual(res2.body.isNewUser, false);
  });

  await test('M1-HTTP-02: POST /api/admin/auth/google rejects non-admin identities with 403', async () => {
    const res = await request('/api/admin/auth/google', {
      method: 'POST',
      body: { idToken: 'mock-google-token:random_person@gmail.com:Random Person' }
    });
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.code, 'FORBIDDEN_SUPERADMIN_REQUIRED');
  });

  await test('M1-HTTP-03: POST /api/admin/auth/google authenticates superadmin', async () => {
    const res = await request('/api/admin/auth/google', {
      method: 'POST',
      body: { idToken: 'mock-google-token-admin' }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.user.email, 'admin@denaneya.com');
    assert.strictEqual(res.body.user.role, 'superadmin');
    assert.ok(res.body.token);
  });

  // Flow test for 2FA lifecycle
  let adminAuthToken;
  let totpSecret;
  let backupRecoveryCodes;

  await test('M1-HTTP-04: SuperAdmin generates 2FA secret, QR code, and backup codes', async () => {
    adminAuthToken = generateToken({
      id: 'usr_superadmin_master_001',
      email: 'admin@denaneya.com',
      role: 'superadmin'
    });

    const res = await request('/api/admin/2fa/generate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminAuthToken}` }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.secret);
    assert.ok(res.body.otpauthUri);
    assert.ok(res.body.qrCodeDataUrl.startsWith('data:image/png;base64,'));
    assert.strictEqual(res.body.backupCodes.length, 8);

    totpSecret = res.body.secret;
    backupRecoveryCodes = res.body.backupCodes;
  });

  await test('M1-HTTP-05: POST /api/admin/2fa/verify validates 6-digit code and activates 2FA', async () => {
    // 1. Invalid code rejected
    const invalidRes = await request('/api/admin/2fa/verify', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminAuthToken}` },
      body: { code: '000000' }
    });
    assert.strictEqual(invalidRes.status, 400);
    assert.strictEqual(invalidRes.body.code, 'INVALID_2FA_CODE');

    // 2. Valid code activates 2FA
    const validCode = generateTOTP(totpSecret);
    const validRes = await request('/api/admin/2fa/verify', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminAuthToken}` },
      body: { code: validCode }
    });
    assert.strictEqual(validRes.status, 200);
    assert.strictEqual(validRes.body.success, true);
    assert.strictEqual(validRes.body.twoFactorEnabled, true);

    const user = await db.get('SELECT two_factor_enabled FROM users WHERE id = ?', ['usr_superadmin_master_001']);
    assert.strictEqual(Number(user.two_factor_enabled), 1);
  });

  let preAuthToken;

  await test('M1-HTTP-06: Standard login intercepts 2FA-enabled account with preAuthToken', async () => {
    const res = await request('/api/auth/login', {
      method: 'POST',
      body: {
        email: 'admin@denaneya.com',
        password: 'Password123!'
      }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.requires2FA, true);
    assert.ok(res.body.preAuthToken);
    preAuthToken = res.body.preAuthToken;

    const decoded = verifyPreAuthToken(preAuthToken);
    assert.strictEqual(decoded.id, 'usr_superadmin_master_001');
    assert.strictEqual(decoded.isPreAuth, true);
  });

  await test('M1-HTTP-07: POST /api/admin/auth/login-2fa completes login with valid code', async () => {
    // 1. Invalid code rejected
    const badRes = await request('/api/admin/auth/login-2fa', {
      method: 'POST',
      body: {
        preAuthToken,
        code: '123456'
      }
    });
    assert.strictEqual(badRes.status, 401);
    assert.strictEqual(badRes.body.code, 'INVALID_2FA_CODE');

    // 2. Valid code succeeds
    // Clear antiReplayCache for this test step if needed
    antiReplayCache.clear();
    const validCode = generateTOTP(totpSecret);
    const okRes = await request('/api/admin/auth/login-2fa', {
      method: 'POST',
      body: {
        preAuthToken,
        code: validCode
      }
    });
    assert.strictEqual(okRes.status, 200);
    assert.strictEqual(okRes.body.success, true);
    assert.ok(okRes.body.token);
    assert.strictEqual(okRes.body.user.email, 'admin@denaneya.com');

    // 3. Replay of same code rejected
    const replayRes = await request('/api/admin/auth/login-2fa', {
      method: 'POST',
      body: {
        preAuthToken,
        code: validCode
      }
    });
    assert.strictEqual(replayRes.status, 401);
    assert.strictEqual(replayRes.body.code, 'REPLAY_DETECTED');
  });

  await test('M1-HTTP-08: POST /api/admin/auth/login-backup completes login with single-use recovery code', async () => {
    const recoveryCodeToUse = backupRecoveryCodes[0];

    // Generate fresh preAuthToken
    const freshPreAuthToken = generatePreAuthToken({
      id: 'usr_superadmin_master_001',
      email: 'admin@denaneya.com',
      role: 'superadmin'
    });

    const res = await request('/api/admin/auth/login-backup', {
      method: 'POST',
      body: {
        preAuthToken: freshPreAuthToken,
        recoveryCode: recoveryCodeToUse
      }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.remainingBackupCodes, 7);
    assert.ok(res.body.token);

    // Attempting to reuse the exact same recovery code must be rejected
    const reusePreAuthToken = generatePreAuthToken({
      id: 'usr_superadmin_master_001',
      email: 'admin@denaneya.com',
      role: 'superadmin'
    });

    const reuseRes = await request('/api/admin/auth/login-backup', {
      method: 'POST',
      body: {
        preAuthToken: reusePreAuthToken,
        recoveryCode: recoveryCodeToUse
      }
    });

    assert.strictEqual(reuseRes.status, 401);
    assert.strictEqual(reuseRes.body.code, 'INVALID_BACKUP_CODE');
  });

  await test('M1-HTTP-09: POST /api/admin/auth/login-backup concurrency race rejects parallel submissions (10 concurrent requests)', async () => {
    // Select the next valid backup code from the fixture set
    const recoveryCodeToUse = backupRecoveryCodes[1];

    const initialUser = await db.get('SELECT two_factor_backup_codes FROM users WHERE id = ?', ['usr_superadmin_master_001']);
    const initialCodes = JSON.parse(initialUser.two_factor_backup_codes || '[]');
    const initialCount = initialCodes.length;

    // Fire 10 concurrent requests simultaneously with the same recoveryCode
    const requests = Array.from({ length: 10 }, async () => {
      const freshPreAuthToken = generatePreAuthToken({
        id: 'usr_superadmin_master_001',
        email: 'admin@denaneya.com',
        role: 'superadmin'
      });

      return request('/api/admin/auth/login-backup', {
        method: 'POST',
        body: {
          preAuthToken: freshPreAuthToken,
          recoveryCode: recoveryCodeToUse
        }
      });
    });

    const responses = await Promise.all(requests);
    const successes = responses.filter((r) => r.status === 200 && r.body?.success === true);
    const rejections = responses.filter((r) => r.status === 401 && r.body?.code === 'INVALID_BACKUP_CODE');

    assert.strictEqual(successes.length, 1, `Exactly 1 concurrent request must succeed, got ${successes.length}`);
    assert.strictEqual(rejections.length, 9, `Exactly 9 concurrent requests must fail with 401 INVALID_BACKUP_CODE, got ${rejections.length}`);

    // Verify DB count decremented by exactly 1
    const postUser = await db.get('SELECT two_factor_backup_codes FROM users WHERE id = ?', ['usr_superadmin_master_001']);
    const postCodes = JSON.parse(postUser.two_factor_backup_codes || '[]');
    assert.strictEqual(postCodes.length, initialCount - 1, `Database backup codes must be decremented by exactly 1 (expected ${initialCount - 1}, got ${postCodes.length})`);
  });

  await test('M1-HTTP-10: PreAuth challenge token rejected on protected routes (superAdminGuard and authMiddleware)', async () => {
    const preAuthAdminToken = generatePreAuthToken({
      id: 'usr_superadmin_master_001',
      email: 'admin@denaneya.com',
      role: 'superadmin'
    });

    // Test on superAdminGuard protected route
    const adminRes = await request('/api/admin/me', {
      headers: { Authorization: `Bearer ${preAuthAdminToken}` }
    });
    assert.strictEqual(adminRes.status, 401);
    assert.strictEqual(adminRes.body.code, 'UNAUTHORIZED');
    assert.strictEqual(adminRes.body.message, '2FA challenge token cannot be used for general authorization.');

    // Test on authMiddleware protected route
    const preAuthMerchantToken = generatePreAuthToken({
      id: 'usr_merchant_test_001',
      email: 'merchant@test.com',
      role: 'merchant'
    });
    const merchantRes = await request('/api/invoices', {
      headers: { Authorization: `Bearer ${preAuthMerchantToken}` }
    });
    assert.strictEqual(merchantRes.status, 401);
    assert.strictEqual(merchantRes.body.code, 'UNAUTHORIZED');
    assert.strictEqual(merchantRes.body.message, '2FA challenge token cannot be used for general authorization.');
  });

  await test('M1-HTTP-11: superAdminGuard preserves twoFactorVerified claim', async () => {
    const verifiedToken = generateToken({
      id: 'usr_superadmin_master_001',
      email: 'admin@denaneya.com',
      role: 'superadmin',
      twoFactorVerified: true
    });

    // Access route protected by superAdminGuard
    const res = await request('/api/admin/me', {
      headers: { Authorization: `Bearer ${verifiedToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.user.twoFactorVerified, true);
  });

  await test('M1-HTTP-12: verifyGoogleIdToken strictly throws INVALID_GOOGLE_TOKEN in production with mock token', async () => {
    const prevEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';
      let threw = false;
      try {
        await verifyGoogleIdToken('mock-token-test');
      } catch (err) {
        threw = true;
        assert.strictEqual(err.code, 'INVALID_GOOGLE_TOKEN');
      }
      assert.strictEqual(threw, true, 'Must throw INVALID_GOOGLE_TOKEN in production');
    } finally {
      process.env.NODE_ENV = prevEnv;
    }
  });

} finally {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
}

console.log('\n===============================================================================');
console.log(`  Milestone 1 Test Results: ${passCount} Passed, ${failCount} Failed.`);
console.log('===============================================================================\n');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
