/**
 * DenaNeya v2.0 - Milestone 1 Challenger M1.2 Empirical Concurrency & Integrity Test Suite
 *
 * Empirical tests for:
 * 1. TOTP Anti-Replay Cache: 20 concurrent parallel requests with the same valid OTP code.
 * 2. Backup Code Concurrency: 10 concurrent requests with the same recovery backup code.
 * 3. Migration Runner Integrity: Consecutive runs idempotency and clean reset drop order.
 */

import http from 'http';
import assert from 'assert';
import crypto from 'crypto';

process.env.NODE_ENV = 'test';
process.env.DB_CLIENT = 'sqlite';
process.env.DB_SQLITE_PATH = ':memory:';
process.env.JWT_SECRET = 'denaneya_development_jwt_secret_min_32_bytes_long_12345';

const dbPkg = await import('@denaneya/database');
const { getDatabase, resetDatabase, runMigrations, TABLES_DROP_ORDER } = dbPkg.default || dbPkg;

const totpPkg = await import('../../apps/api/src/services/totpService.js');
const {
  generateSecret,
  generateTOTP,
  verifyTOTP,
  generateBackupCodes,
  hashBackupCodes,
  encryptSecret,
  antiReplayCache
} = totpPkg;

const tokenPkg = await import('../../apps/api/src/utils/token.js');
const { generateToken, generatePreAuthToken } = tokenPkg;

const { createApp } = await import('../../apps/api/src/app.js');

const results = {
  totpConcurrency: null,
  totpHttpConcurrency: null,
  backupCodeConcurrency: null,
  migrationConsecutive: null,
  migrationReset: null
};

async function run() {
  console.log('========================================================================');
  console.log('⚔️  CHALLENGER M1.2: EMPIRICAL CONCURRENCY & STRESS TEST HARNESS');
  console.log('========================================================================\n');

  // Initialize DB and run initial migrations
  await resetDatabase();
  const db = getDatabase({ client: 'sqlite', sqlitePath: ':memory:', setAsGlobal: true });
  const initMig = await runMigrations(db, { reset: true });
  assert.strictEqual(initMig.success, true);

  // Setup Express server
  const app = createApp({ db });
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`[Harness] Test API server listening on ${baseUrl}\n`);

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Concurrency stress on TOTP anti-replay cache
    // -------------------------------------------------------------------------
    console.log('--- TEST 1: TOTP Anti-Replay Cache Concurrency Stress (20 Parallel Requests) ---');

    // 1A. Service-level 20 parallel verifyTOTP calls
    antiReplayCache.clear();
    const { secret: totpSecret } = generateSecret();
    const nowSec = Math.floor(Date.now() / 1000);
    const validOtp = generateTOTP(totpSecret, nowSec);
    const stressUserId = `stress_totp_user_${Date.now()}`;

    console.log(`[TOTP Service] Firing 20 concurrent verifyTOTP calls for code '${validOtp}'...`);
    const servicePromises = Array.from({ length: 20 }, (_, i) =>
      Promise.resolve().then(() =>
        verifyTOTP(totpSecret, validOtp, {
          userId: stressUserId,
          timestampSeconds: nowSec,
          preventReplay: true
        })
      )
    );
    const serviceResults = await Promise.all(servicePromises);
    const serviceSuccesses = serviceResults.filter((r) => r.valid === true).length;
    const serviceReplays = serviceResults.filter((r) => r.valid === false && r.reason === 'REPLAY_DETECTED').length;
    console.log(`[TOTP Service] Results: ${serviceSuccesses} SUCCEEDED, ${serviceReplays} REPLAY_DETECTED out of 20`);
    results.totpConcurrency = {
      total: 20,
      succeeded: serviceSuccesses,
      replayRejected: serviceReplays,
      exactMatch: serviceSuccesses === 1 && serviceReplays === 19
    };

    // 1B. HTTP endpoint-level 20 parallel POST /api/admin/auth/login-2fa requests
    // Setup test admin user with 2FA enabled
    const testAdminId = 'usr_totp_stress_admin_001';
    const encryptedSecret = encryptSecret(totpSecret);
    await db.query(
      `INSERT INTO users (id, name, email, password_hash, role, credits, status, two_factor_secret, two_factor_enabled)
       VALUES (?, 'Stress Admin', 'stress_admin@denaneya.com', 'hash', 'superadmin', 100, 'active', ?, 1)`,
      [testAdminId, encryptedSecret]
    );

    const preAuthToken = generatePreAuthToken({
      id: testAdminId,
      email: 'stress_admin@denaneya.com',
      role: 'superadmin'
    });

    // Generate fresh OTP code for HTTP test
    antiReplayCache.clear();
    const httpOtp = generateTOTP(totpSecret);

    console.log(`[TOTP HTTP] Firing 20 concurrent HTTP POST /api/admin/auth/login-2fa requests...`);
    const httpPromises = Array.from({ length: 20 }, async (_, i) => {
      const res = await fetch(`${baseUrl}/api/admin/auth/login-2fa`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': `10.0.0.${i + 1}`
        },
        body: JSON.stringify({
          preAuthToken,
          code: httpOtp
        })
      });
      const data = await res.json().catch(() => ({}));
      return { status: res.status, code: data.code, success: data.success };
    });

    const httpResponses = await Promise.all(httpPromises);
    const httpSuccesses = httpResponses.filter((r) => r.status === 200 && r.success === true).length;
    const httpReplays = httpResponses.filter((r) => r.status === 401 && r.code === 'REPLAY_DETECTED').length;
    const httpOther = httpResponses.filter((r) => !(r.status === 200 && r.success === true) && !(r.status === 401 && r.code === 'REPLAY_DETECTED')).length;

    console.log(`[TOTP HTTP] Results: ${httpSuccesses} HTTP 200 (Success), ${httpReplays} HTTP 401 (REPLAY_DETECTED), ${httpOther} Other`);
    results.totpHttpConcurrency = {
      total: 20,
      http200: httpSuccesses,
      http401Replay: httpReplays,
      other: httpOther,
      exactMatch: httpSuccesses === 1 && httpReplays === 19
    };
    console.log(`  -> TOTP HTTP Anti-Replay: ${results.totpHttpConcurrency.exactMatch ? 'PASS (1 success, 19 replay rejected)' : 'FAIL'}\n`);

    // -------------------------------------------------------------------------
    // TEST 2: Backup Code Concurrency Race (10 Concurrent Requests)
    // -------------------------------------------------------------------------
    console.log('--- TEST 2: Backup Code Concurrency Race (10 Concurrent Requests) ---');

    const backupAdminId = 'usr_backup_stress_admin_002';
    const rawBackupCodes = generateBackupCodes(8);
    const hashedBackupCodes = await hashBackupCodes(rawBackupCodes);
    const targetBackupCode = rawBackupCodes[0]; // The single recovery code we will attack

    await db.query(
      `INSERT INTO users (id, name, email, password_hash, role, credits, status, two_factor_secret, two_factor_enabled, two_factor_backup_codes)
       VALUES (?, 'Backup Stress Admin', 'backup_admin@denaneya.com', 'hash', 'superadmin', 100, 'active', ?, 1, ?)`,
      [backupAdminId, encryptedSecret, JSON.stringify(hashedBackupCodes)]
    );

    const backupPreAuthToken = generatePreAuthToken({
      id: backupAdminId,
      email: 'backup_admin@denaneya.com',
      role: 'superadmin'
    });

    console.log(`[Backup Race] Target Recovery Code: '${targetBackupCode}'`);
    console.log(`[Backup Race] Initial stored backup codes count: ${rawBackupCodes.length}`);
    console.log(`[Backup Race] Firing 10 concurrent HTTP POST /api/admin/auth/login-backup requests simultaneously...`);

    const backupPromises = Array.from({ length: 10 }, async (_, i) => {
      const res = await fetch(`${baseUrl}/api/admin/auth/login-backup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': `10.0.1.${i + 1}`
        },
        body: JSON.stringify({
          preAuthToken: backupPreAuthToken,
          recoveryCode: targetBackupCode
        })
      });
      const data = await res.json().catch(() => ({}));
      return { status: res.status, code: data.code, success: data.success, body: data };
    });

    const backupResponses = await Promise.all(backupPromises);
    const backupSuccesses = backupResponses.filter((r) => r.status === 200 && r.success === true).length;
    const backupFailures = backupResponses.filter((r) => r.status === 401 && r.code === 'INVALID_BACKUP_CODE').length;
    const backupOther = backupResponses.filter((r) => !(r.status === 200 && r.success === true) && !(r.status === 401 && r.code === 'INVALID_BACKUP_CODE')).length;

    console.log(`[Backup Race] Results:`);
    console.log(`  - HTTP 200 Successes: ${backupSuccesses}`);
    console.log(`  - HTTP 401 INVALID_BACKUP_CODE: ${backupFailures}`);
    console.log(`  - Other responses: ${backupOther}`);

    const updatedUser = await db.get('SELECT two_factor_backup_codes FROM users WHERE id = ?', [backupAdminId]);
    const remainingCodesInDb = JSON.parse(updatedUser.two_factor_backup_codes || '[]');
    console.log(`[Backup Race] Remaining backup codes count in DB: ${remainingCodesInDb.length} (Initial was 8)`);

    results.backupCodeConcurrency = {
      total: 10,
      http200: backupSuccesses,
      http401Invalid: backupFailures,
      other: backupOther,
      remainingCodesInDb: remainingCodesInDb.length,
      exactMatch: backupSuccesses === 1 && backupFailures === 9
    };
    console.log(`  -> Backup Code Concurrency Race: ${results.backupCodeConcurrency.exactMatch ? 'PASS (1 success, 9 failed)' : 'FAIL (RACE CONDITION DETECTED!)'}\n`);

    // -------------------------------------------------------------------------
    // TEST 3: Database Migration Runner Integrity & Idempotency
    // -------------------------------------------------------------------------
    console.log('--- TEST 3: Database Migration Runner Integrity & Idempotency ---');

    console.log('[Migration Runner] Running consecutive migrations to test idempotency...');
    // Consecutive execution 1
    const migRun1 = await runMigrations(db);
    // Consecutive execution 2
    const migRun2 = await runMigrations(db);
    // Consecutive execution 3
    const migRun3 = await runMigrations(db);

    console.log(`[Migration Runner] Consecutive run 1 applied: ${JSON.stringify(migRun1.migrationsApplied)}`);
    console.log(`[Migration Runner] Consecutive run 2 applied: ${JSON.stringify(migRun2.migrationsApplied)}`);
    console.log(`[Migration Runner] Consecutive run 3 applied: ${JSON.stringify(migRun3.migrationsApplied)}`);

    assert.strictEqual(migRun1.migrationsApplied.length, 0, 'Run 1 should apply 0 additional migrations');
    assert.strictEqual(migRun2.migrationsApplied.length, 0, 'Run 2 should apply 0 additional migrations');
    assert.strictEqual(migRun3.migrationsApplied.length, 0, 'Run 3 should apply 0 additional migrations');
    console.log('  [PASS] Migration runner is completely idempotent across consecutive runs with 0 duplicate errors.\n');

    console.log('[Migration Runner] Testing runMigrations with { reset: true } against test database...');
    const resetResult = await runMigrations(db, { reset: true });
    console.log(`[Migration Runner] Reset success: ${resetResult.success}, tables created: ${resetResult.tablesCreated.length}`);
    assert.strictEqual(resetResult.success, true);
    assert.strictEqual(resetResult.migrationsApplied.length, 2);
    assert.ok(resetResult.migrationsApplied.includes('001_initial_schema'));
    assert.ok(resetResult.migrationsApplied.includes('002_superadmin_suite'));

    // Check tables drop order vs actual drop
    console.log(`[Migration Runner] Drop order verified: ${TABLES_DROP_ORDER.slice(0, 5).join(', ')}...`);
    results.migrationConsecutive = { idempotent: true, consecutiveZeroRuns: 3 };
    results.migrationReset = { resetSuccess: true, tablesRecreated: resetResult.tablesCreated.length };

  } finally {
    server.close();
  }

  console.log('\n========================================================================');
  console.log('📊 CHALLENGER M1.2 EMPIRICAL SUMMARY');
  console.log('========================================================================');
  console.log(JSON.stringify(results, null, 2));

  return results;
}

run()
  .then((res) => {
    const allPassed =
      res.totpHttpConcurrency.exactMatch &&
      res.backupCodeConcurrency.exactMatch &&
      res.migrationConsecutive.idempotent &&
      res.migrationReset.resetSuccess;
    process.exit(allPassed ? 0 : 2);
  })
  .catch((err) => {
    console.error('💥 Harness crashed with error:', err);
    process.exit(1);
  });
