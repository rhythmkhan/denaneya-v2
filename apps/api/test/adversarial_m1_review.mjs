import assert from 'node:assert';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';

const dbPkg = (await import('@denaneya/database')).default;
const { getDatabase, runMigrations } = dbPkg;

const {
  base32Encode,
  base32Decode,
  generateHOTP,
  generateTOTP,
  verifyTOTP,
  generateSecret,
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

console.log('=== STARTING INDEPENDENT ADVERSARIAL STRESS-TESTS ===\n');

let failedTests = [];
let passedTests = [];

async function advTest(name, fn) {
  try {
    await fn();
    console.log(`[ADV-PASS] ${name}`);
    passedTests.push(name);
  } catch (err) {
    console.error(`[ADV-FAIL] ${name}`);
    console.error(`  Error: ${err.message}`);
    failedTests.push({ name, error: err.message, stack: err.stack });
  }
}

// -----------------------------------------------------------------------------
// Test 1: Base32 Comprehensive Fuzzing
// -----------------------------------------------------------------------------
await advTest('ADV-01: Base32 Fuzzing across arbitrary lengths (0 to 64 bytes)', () => {
  for (let len = 0; len <= 64; len++) {
    const raw = crypto.randomBytes(len);
    const encoded = base32Encode(raw);
    const decoded = base32Decode(encoded);
    assert.deepStrictEqual(decoded, raw, `Mismatch at length ${len}`);
  }
});

// Test 1b: RFC 4648 standard test vectors
await advTest('ADV-01b: RFC 4648 Section 10 standard test vectors', () => {
  const vectors = [
    { in: '', out: '' },
    { in: 'f', out: 'MY' },
    { in: 'fo', out: 'MZXQ' },
    { in: 'foo', out: 'MZXW6' },
    { in: 'foob', out: 'MZXW6YQ' },
    { in: 'fooba', out: 'MZXW6YTB' },
    { in: 'foobar', out: 'MZXW6YTBOI' }
  ];
  for (const v of vectors) {
    const enc = base32Encode(Buffer.from(v.in, 'ascii'));
    assert.strictEqual(enc, v.out, `Encode mismatch for "${v.in}": got "${enc}", expected "${v.out}"`);
    const dec = base32Decode(v.out);
    assert.strictEqual(dec.toString('ascii'), v.in, `Decode mismatch for "${v.out}"`);
  }
});

// -----------------------------------------------------------------------------
// Test 2: AES-256-GCM Tamper Resistance
// -----------------------------------------------------------------------------
await advTest('ADV-02: AES-256-GCM Tamper Detection (Ciphertext and Tag Corruption)', () => {
  const secret = 'JBSWY3DPEHPK3PXP';
  const encrypted = encryptSecret(secret);
  const parts = encrypted.split(':');
  assert.strictEqual(parts.length, 3);

  // Corrupt tag
  const tagBuf = Buffer.from(parts[1], 'hex');
  tagBuf[0] ^= 0xff; // Flip bits
  const tamperedTag = `${parts[0]}:${tagBuf.toString('hex')}:${parts[2]}`;

  assert.throws(() => {
    decryptSecret(tamperedTag);
  }, /unable to authenticate data|Unsupported state/i);

  // Corrupt ciphertext
  const cipherBuf = Buffer.from(parts[2], 'hex');
  cipherBuf[0] ^= 0xff;
  const tamperedCipher = `${parts[0]}:${parts[1]}:${cipherBuf.toString('hex')}`;

  assert.throws(() => {
    decryptSecret(tamperedCipher);
  }, /unable to authenticate data|Unsupported state/i);
});

// -----------------------------------------------------------------------------
// Test 3: TOTP Clock Skew & Anti-Replay Limits
// -----------------------------------------------------------------------------
await advTest('ADV-03: Clock Skew Limits and Anti-Replay Boundary', () => {
  const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
  const t0 = 1000000;

  // t0 - 30s (-1 window): valid
  const codePast = generateTOTP(secret, t0 - 30);
  const resPast = verifyTOTP(secret, codePast, { timestampSeconds: t0, userId: 'u_adv_1', preventReplay: false });
  assert.strictEqual(resPast.valid, true);
  assert.strictEqual(resPast.delta, -1);

  // t0 + 30s (+1 window): valid
  const codeFut = generateTOTP(secret, t0 + 30);
  const resFut = verifyTOTP(secret, codeFut, { timestampSeconds: t0, userId: 'u_adv_1', preventReplay: false });
  assert.strictEqual(resFut.valid, true);
  assert.strictEqual(resFut.delta, 1);

  // t0 - 31s: outside current step, delta -1 or -2?
  // 1000000 / 30 = 33333
  // (1000000 - 60) / 30 = 33331 -> delta = -2 -> invalid
  const codeFarPast = generateTOTP(secret, t0 - 60);
  const resFarPast = verifyTOTP(secret, codeFarPast, { timestampSeconds: t0, userId: 'u_adv_1' });
  assert.strictEqual(resFarPast.valid, false);

  // Replay test: consume at t0, then try again at t0 + 15
  antiReplayCache.clear();
  const codeNow = generateTOTP(secret, t0);
  const res1 = verifyTOTP(secret, codeNow, { timestampSeconds: t0, userId: 'u_adv_rep', preventReplay: true });
  assert.strictEqual(res1.valid, true);

  const res2 = verifyTOTP(secret, codeNow, { timestampSeconds: t0 + 15, userId: 'u_adv_rep', preventReplay: true });
  assert.strictEqual(res2.valid, false);
  assert.strictEqual(res2.reason, 'REPLAY_DETECTED');

  // After 91 seconds, replay cache should expire
  const res3 = verifyTOTP(secret, codeNow, { timestampSeconds: t0 + 91, userId: 'u_adv_rep', preventReplay: true });
  // At t0+91, current step is 33336. The code was for 33333. Delta is -3, so CODE_MISMATCH
  assert.strictEqual(res3.valid, false);
  assert.strictEqual(res3.reason, 'CODE_MISMATCH');
});

// -----------------------------------------------------------------------------
// Test 4: Setup HTTP Server and Test PreAuth Token Bypass & Role Escalation
// -----------------------------------------------------------------------------
const db = getDatabase();
await runMigrations(db, { reset: true });
const app = createApp({ db });

let server;
let baseUrl;

await new Promise((resolve) => {
  server = app.listen(0, '127.0.0.1', () => {
    baseUrl = `http://127.0.0.1:${server.address().port}`;
    resolve();
  });
});

async function apiReq(path, { method = 'GET', headers = {}, body = null } = {}) {
  const reqHeaders = { 'Content-Type': 'application/json', ...headers };
  const opts = { method, headers: reqHeaders };
  if (body) opts.body = typeof body === 'string' ? body : JSON.stringify(body);
  const res = await fetch(`${baseUrl}${path}`, opts);
  let data;
  const text = await res.text();
  try { data = JSON.parse(text); } catch (_) { data = text; }
  return { status: res.status, body: data };
}

// Check preAuthToken against /api/admin/me
await advTest('ADV-04: Security Check: PreAuthToken must NOT grant access to /api/admin/me', async () => {
  // First, enable 2FA on superadmin
  const { secret } = generateSecret();
  const encrypted = encryptSecret(secret);
  await db.query(
    'UPDATE users SET two_factor_secret = ?, two_factor_enabled = 1 WHERE email = ?',
    [encrypted, 'admin@denaneya.com']
  );

  // Generate a preAuthToken (issued during initial password step when 2FA is required)
  const preAuthToken = generatePreAuthToken({
    id: 'usr_superadmin_master_001',
    email: 'admin@denaneya.com',
    role: 'superadmin'
  });

  // Attempt to use this preAuthToken on /api/admin/me
  const res = await apiReq('/api/admin/me', {
    headers: { Authorization: `Bearer ${preAuthToken}` }
  });

  // An unverified pre-auth token SHOULD be rejected!
  // If status is 200, this is a vulnerability where 2FA challenge is bypassed by preAuthToken!
  console.log(`    PreAuthToken on /api/admin/me returned status: ${res.status}`);
  if (res.status === 200) {
    throw new Error(`SECURITY FLAW: preAuthToken granted access to /api/admin/me without 2FA verification! Response: ${JSON.stringify(res.body)}`);
  }
  assert.notStrictEqual(res.status, 200, 'preAuthToken must not bypass 2FA');
});

// Check mock Google token in production mode
await advTest('ADV-05: Security Check: Mock Google Token in Production Environment', async () => {
  // Save original env
  const origEnv = process.env.NODE_ENV;
  const origClientId = process.env.GOOGLE_CLIENT_ID;

  try {
    process.env.NODE_ENV = 'production';
    process.env.GOOGLE_CLIENT_ID = '123456789-realclientid.apps.googleusercontent.com';

    // Test verifyGoogleIdToken with a mock token string
    try {
      const profile = await verifyGoogleIdToken('mock-google-token-admin');
      console.log(`    Mock token accepted in production:`, profile);
      throw new Error(`SECURITY FLAW: mock-google-token-admin was accepted even when NODE_ENV=production and real GOOGLE_CLIENT_ID is set!`);
    } catch (err) {
      if (err.message.includes('SECURITY FLAW')) {
        throw err;
      }
      console.log(`    Properly rejected mock token in production: ${err.message}`);
    }
  } finally {
    process.env.NODE_ENV = origEnv;
    process.env.GOOGLE_CLIENT_ID = origClientId;
  }
});

// Check Google OAuth Role Escalation Attack
await advTest('ADV-06: Google OAuth Role Escalation Attack via Public API', async () => {
  const res = await apiReq('/api/auth/google/verify-token', {
    method: 'POST',
    body: {
      idToken: 'mock-google-token:attacker@evil.com:Evil Attacker',
      role: 'superadmin',
      credits: 9999999
    }
  });

  assert.strictEqual(res.body.user.role, 'merchant', 'Attacker must be assigned role merchant, not superadmin');
  assert.strictEqual(res.body.user.credits, 50, 'Attacker must receive starter credits, not requested credits');
});

// Check Backup Code Double-Spend / Reuse
await advTest('ADV-07: Backup Code Single-Use Removal & Non-Reusability', async () => {
  // Generate backup codes
  const codes = generateBackupCodes(8);
  const hashes = await hashBackupCodes(codes);
  await db.query(
    'UPDATE users SET two_factor_backup_codes = ?, two_factor_enabled = 1 WHERE email = ?',
    [JSON.stringify(hashes), 'admin@denaneya.com']
  );

  const token1 = generatePreAuthToken({
    id: 'usr_superadmin_master_001',
    email: 'admin@denaneya.com',
    role: 'superadmin'
  });

  // Use code 0
  const res1 = await apiReq('/api/admin/auth/login-backup', {
    method: 'POST',
    body: {
      preAuthToken: token1,
      recoveryCode: codes[0]
    }
  });

  assert.strictEqual(res1.status, 200);
  assert.strictEqual(res1.body.remainingBackupCodes, 7);

  // Attempt reuse
  const token2 = generatePreAuthToken({
    id: 'usr_superadmin_master_001',
    email: 'admin@denaneya.com',
    role: 'superadmin'
  });

  const res2 = await apiReq('/api/admin/auth/login-backup', {
    method: 'POST',
    body: {
      preAuthToken: token2,
      recoveryCode: codes[0]
    }
  });

  assert.strictEqual(res2.status, 401);
  assert.strictEqual(res2.body.code, 'INVALID_BACKUP_CODE');
});

server.close();

console.log('\n=== ADVERSARIAL STRESS-TEST SUMMARY ===');
console.log(`Passed: ${passedTests.length}`);
console.log(`Failed: ${failedTests.length}`);
if (failedTests.length > 0) {
  console.log('\nFailed Tests Details:');
  for (const f of failedTests) {
    console.log(`- ${f.name}: ${f.error}`);
  }
}

if (failedTests.length > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
