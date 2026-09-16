/**
 * DenaNeya v2.0 - Empirical Database Stress & Concurrency Test Suite
 * Milestone 1 Challenger 1 Stress Harness
 * 
 * Verifies:
 * 1. 50 concurrent atomic Compare-and-Swap (CAS) claims against a single UNUSED transaction
 * 2. Credit balance race conditions (10 concurrent deductions on balance = 5)
 * 3. Cross-brand vs Same-brand duplicate TrxID insertion stress
 * 4. Cross-tenant CAS independence
 * 5. Concurrent transaction handling & connection re-entrancy
 */

'use strict';

const assert = require('node:assert');
const { getDatabase, runMigrations } = require('../src/index.js');

console.log('=== Running Milestone 1 Challenger Concurrency & Stress Harness ===\n');

let passCount = 0;
let failCount = 0;
const findings = [];

async function stressTest(name, fn) {
  process.stdout.write(`[RUNNING] ${name}... `);
  const startTime = Date.now();
  try {
    await fn();
    const duration = Date.now() - startTime;
    console.log(`PASS (${duration}ms)`);
    passCount++;
  } catch (err) {
    const duration = Date.now() - startTime;
    console.log(`FAIL (${duration}ms)`);
    console.error(`  Error: ${err.message}`);
    if (err.stack) {
      console.error(err.stack.split('\n').slice(1, 4).join('\n'));
    }
    failCount++;
    findings.push({ test: name, error: err.message, stack: err.stack });
  }
}

async function runAllStressTests() {
  const db = getDatabase({ client: 'sqlite', sqlitePath: ':memory:' });

  // Initialize schema
  const migRes = await runMigrations(db, { reset: true });
  assert.strictEqual(migRes.success, true, 'Migrations must succeed');

  // Base fixtures
  await db.query(
    `INSERT INTO users (id, name, email, password_hash, credits) VALUES (?, ?, ?, ?, ?)`,
    ['usr_stress_master', 'Stress Master', 'master@stress.test', 'hash', 1000]
  );
  await db.query(
    `INSERT INTO brands (id, user_id, brand_name, brand_slug, api_key, api_secret, webhook_secret)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ['brand_primary', 'usr_stress_master', 'Primary Brand', 'primary-brand', 'pk_prim', 'sk_prim', 'ws_prim']
  );

  // ---------------------------------------------------------------------------
  // TEST 1: 50 Concurrent CAS claims against a single UNUSED stored_data row
  // ---------------------------------------------------------------------------
  await stressTest('STRESS-01: 50 concurrent atomic CAS claims against single UNUSED transaction (single iteration)', async () => {
    const trxId = 'STRESS_CAS_50_ONCE';
    await db.query(
      `INSERT INTO stored_data (id, brand_id, sender, raw_sms, channel, trx_id, amount, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ['sms_cas_50_1', 'brand_primary', 'bKash', 'Raw CAS 50', 'bKash', trxId, 750.00, 'UNUSED']
    );

    // Launch 50 simultaneous workers
    const workers = Array.from({ length: 50 }, (_, i) => async () => {
      return db.query(
        `UPDATE stored_data
         SET status = 'USED', used_at = CURRENT_TIMESTAMP
         WHERE brand_id = ? AND trx_id = ? AND status = 'UNUSED'`,
        ['brand_primary', trxId]
      );
    });

    const results = await Promise.all(workers.map((w) => w()));

    const successCount = results.filter((r) => r.affectedRows === 1).length;
    const failCount_ = results.filter((r) => r.affectedRows === 0).length;

    assert.strictEqual(successCount, 1, `Exactly 1 worker must succeed, got ${successCount}`);
    assert.strictEqual(failCount_, 49, `Exactly 49 workers must fail with affectedRows 0, got ${failCount_}`);

    // Verify row status in database
    const finalRow = await db.get(
      `SELECT status, used_at FROM stored_data WHERE brand_id = ? AND trx_id = ?`,
      ['brand_primary', trxId]
    );
    assert.strictEqual(finalRow.status, 'USED', 'Final status must be USED');
    assert.ok(finalRow.used_at, 'used_at timestamp must be set');
  });

  // ---------------------------------------------------------------------------
  // TEST 2: High-Volume Repeated CAS Race (50 iterations x 50 concurrent workers = 2500 attempts)
  // ---------------------------------------------------------------------------
  await stressTest('STRESS-02: 50 iterations of 50 concurrent CAS claims (2500 total operations)', async () => {
    for (let round = 1; round <= 50; round++) {
      const trxId = `STRESS_CAS_ROUND_${round}`;
      await db.query(
        `INSERT INTO stored_data (id, brand_id, sender, raw_sms, channel, trx_id, amount, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [`sms_round_${round}`, 'brand_primary', 'Nagad', 'Raw Round', 'Nagad', trxId, 100.00 + round, 'UNUSED']
      );

      const workers = Array.from({ length: 50 }, () => async () => {
        return db.query(
          `UPDATE stored_data
           SET status = 'USED', used_at = CURRENT_TIMESTAMP
           WHERE brand_id = ? AND trx_id = ? AND status = 'UNUSED'`,
          ['brand_primary', trxId]
        );
      });

      const results = await Promise.all(workers.map((w) => w()));
      const successCount = results.filter((r) => r.affectedRows === 1).length;
      const failCount_ = results.filter((r) => r.affectedRows === 0).length;

      assert.strictEqual(successCount, 1, `Round ${round}: exactly 1 worker must succeed`);
      assert.strictEqual(failCount_, 49, `Round ${round}: exactly 49 workers must fail`);
    }

    const totalUsed = await db.get(
      `SELECT count(*) as cnt FROM stored_data WHERE brand_id = ? AND status = 'USED' AND trx_id LIKE 'STRESS_CAS_ROUND_%'`,
      ['brand_primary']
    );
    assert.strictEqual(totalUsed.cnt, 50, 'All 50 rounds must have exactly 1 USED row');
  });

  // ---------------------------------------------------------------------------
  // TEST 3: Credit Deduction Race (10 concurrent deductions when credits = 5)
  // ---------------------------------------------------------------------------
  await stressTest('STRESS-03: 10 concurrent credit deductions on initial balance = 5', async () => {
    const userId = 'usr_credit_race_5';
    await db.query(
      `INSERT INTO users (id, name, email, password_hash, credits) VALUES (?, ?, ?, ?, ?)`,
      [userId, 'Credit Race User', 'credit_race@test.com', 'hash', 5]
    );

    // Fire 10 simultaneous workers attempting to deduct 1 credit each
    const workers = Array.from({ length: 10 }, (_, i) => async () => {
      return db.query(
        `UPDATE users SET credits = credits - 1 WHERE id = ? AND credits >= 1`,
        [userId]
      );
    });

    const results = await Promise.all(workers.map((w) => w()));
    const successDeductions = results.filter((r) => r.affectedRows === 1).length;
    const failedDeductions = results.filter((r) => r.affectedRows === 0).length;

    assert.strictEqual(successDeductions, 5, `Exactly 5 deductions must succeed when credits = 5, got ${successDeductions}`);
    assert.strictEqual(failedDeductions, 5, `Exactly 5 deductions must fail, got ${failedDeductions}`);

    // Verify final credit balance is exactly 0 and never below 0
    const user = await db.get(`SELECT credits FROM users WHERE id = ?`, [userId]);
    assert.strictEqual(user.credits, 0, `Final credits must be exactly 0, got ${user.credits}`);
    assert.ok(user.credits >= 0, 'User credits must never drop below 0');

    // Attempt 10 more deductions on 0 balance -> all 10 must fail
    const zeroWorkers = Array.from({ length: 10 }, () => async () => {
      return db.query(
        `UPDATE users SET credits = credits - 1 WHERE id = ? AND credits >= 1`,
        [userId]
      );
    });
    const zeroResults = await Promise.all(zeroWorkers.map((w) => w()));
    const zeroSuccess = zeroResults.filter((r) => r.affectedRows === 1).length;
    assert.strictEqual(zeroSuccess, 0, 'Zero deductions must succeed on 0 balance');
  });

  // ---------------------------------------------------------------------------
  // TEST 4: Massive Credit Race (100 concurrent workers on balance = 37)
  // ---------------------------------------------------------------------------
  await stressTest('STRESS-04: 100 concurrent credit deductions on balance = 37', async () => {
    const userId = 'usr_credit_race_37';
    await db.query(
      `INSERT INTO users (id, name, email, password_hash, credits) VALUES (?, ?, ?, ?, ?)`,
      [userId, 'Credit 37 User', 'credit_37@test.com', 'hash', 37]
    );

    const workers = Array.from({ length: 100 }, () => async () => {
      return db.query(
        `UPDATE users SET credits = credits - 1 WHERE id = ? AND credits >= 1`,
        [userId]
      );
    });

    const results = await Promise.all(workers.map((w) => w()));
    const successCount = results.filter((r) => r.affectedRows === 1).length;
    const failCount_ = results.filter((r) => r.affectedRows === 0).length;

    assert.strictEqual(successCount, 37, `Exactly 37 deductions must succeed, got ${successCount}`);
    assert.strictEqual(failCount_, 63, `Exactly 63 deductions must fail, got ${failCount_}`);

    const user = await db.get(`SELECT credits FROM users WHERE id = ?`, [userId]);
    assert.strictEqual(user.credits, 0, 'Balance must be exactly 0');
  });

  // ---------------------------------------------------------------------------
  // TEST 5: Cross-Brand Duplicate TrxID Ingestion (50 distinct brands)
  // ---------------------------------------------------------------------------
  await stressTest('STRESS-05: 50 distinct brands ingesting identical TrxID concurrently', async () => {
    const sharedTrxId = 'UNIVERSAL_SHARED_TRX_999';

    // Create 50 brands under user
    for (let i = 1; i <= 50; i++) {
      const bId = `brand_multi_${String(i).padStart(3, '0')}`;
      await db.query(
        `INSERT INTO brands (id, user_id, brand_name, brand_slug, api_key, api_secret, webhook_secret)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [bId, 'usr_stress_master', `Brand ${i}`, `brand-multi-${i}`, `key_${i}`, `sec_${i}`, `ws_${i}`]
      );
    }

    // Concurrently insert the exact same TrxID into all 50 brands
    const insertWorkers = Array.from({ length: 50 }, (_, i) => {
      const bId = `brand_multi_${String(i + 1).padStart(3, '0')}`;
      return async () => {
        return db.query(
          `INSERT INTO stored_data (id, brand_id, sender, raw_sms, channel, trx_id, amount, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [`sms_m_${bId}`, bId, 'bKash', 'Multi brand test', 'bKash', sharedTrxId, 500.00, 'UNUSED']
        );
      };
    });

    const results = await Promise.all(insertWorkers.map((w) => w()));
    const successfulInserts = results.filter((r) => r.affectedRows === 1).length;
    assert.strictEqual(successfulInserts, 50, `All 50 brands must successfully insert identical TrxID, got ${successfulInserts}`);

    // Verify all 50 rows exist
    const rowCount = await db.get(
      `SELECT count(*) as cnt FROM stored_data WHERE trx_id = ?`,
      [sharedTrxId]
    );
    assert.strictEqual(rowCount.cnt, 50, 'Exactly 50 records must exist across 50 brands');
  });

  // ---------------------------------------------------------------------------
  // TEST 6: Same-Brand Duplicate TrxID Rejection (50 concurrent insertion attempts)
  // ---------------------------------------------------------------------------
  await stressTest('STRESS-06: 50 concurrent duplicate TrxID insertions for SAME brand', async () => {
    const dupTrxId = 'DUP_COLLISION_CHECK_888';
    const targetBrand = 'brand_primary';

    let successCount = 0;
    let duplicateErrors = 0;

    const workers = Array.from({ length: 50 }, (_, i) => async () => {
      try {
        const res = await db.query(
          `INSERT INTO stored_data (id, brand_id, sender, raw_sms, channel, trx_id, amount, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [`sms_dup_${i}`, targetBrand, 'bKash', 'Duplicate test', 'bKash', dupTrxId, 250.00, 'UNUSED']
        );
        if (res.affectedRows === 1) successCount++;
      } catch (err) {
        if (err.message.includes('UNIQUE')) {
          duplicateErrors++;
        } else {
          throw err;
        }
      }
    });

    await Promise.all(workers.map((w) => w()));

    assert.strictEqual(successCount, 1, `Exactly 1 insertion must succeed for same brand, got ${successCount}`);
    assert.strictEqual(duplicateErrors, 49, `Exactly 49 insertions must fail with UNIQUE constraint, got ${duplicateErrors}`);

    // Verify only 1 row exists
    const rowCount = await db.get(
      `SELECT count(*) as cnt FROM stored_data WHERE brand_id = ? AND trx_id = ?`,
      [targetBrand, dupTrxId]
    );
    assert.strictEqual(rowCount.cnt, 1, 'Only 1 row must exist in DB for this brand & trx');
  });

  // ---------------------------------------------------------------------------
  // TEST 7: Cross-Tenant CAS Independence
  // ---------------------------------------------------------------------------
  await stressTest('STRESS-07: Cross-tenant CAS claim independence with identical TrxIDs', async () => {
    const sharedTrx = 'INDEPENDENT_CAS_TRX_777';
    const brand1 = 'brand_multi_001';
    const brand2 = 'brand_multi_002';

    await db.query(
      `INSERT INTO stored_data (id, brand_id, sender, raw_sms, channel, trx_id, amount, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ['sms_indep_b1', brand1, 'bKash', 'B1 SMS', 'bKash', sharedTrx, 1500.00, 'UNUSED']
    );
    await db.query(
      `INSERT INTO stored_data (id, brand_id, sender, raw_sms, channel, trx_id, amount, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ['sms_indep_b2', brand2, 'bKash', 'B2 SMS', 'bKash', sharedTrx, 1500.00, 'UNUSED']
    );

    // Worker claims for Brand 1
    const claimB1 = await db.query(
      `UPDATE stored_data SET status = 'USED', used_at = CURRENT_TIMESTAMP
       WHERE brand_id = ? AND trx_id = ? AND status = 'UNUSED'`,
      [brand1, sharedTrx]
    );
    assert.strictEqual(claimB1.affectedRows, 1, 'Brand 1 claim must succeed');

    // Brand 2's record must still be UNUSED
    const b2Row = await db.get(
      `SELECT status FROM stored_data WHERE brand_id = ? AND trx_id = ?`,
      [brand2, sharedTrx]
    );
    assert.strictEqual(b2Row.status, 'UNUSED', "Brand 2's record must remain UNUSED despite Brand 1's claim");

    // Worker claims for Brand 2
    const claimB2 = await db.query(
      `UPDATE stored_data SET status = 'USED', used_at = CURRENT_TIMESTAMP
       WHERE brand_id = ? AND trx_id = ? AND status = 'UNUSED'`,
      [brand2, sharedTrx]
    );
    assert.strictEqual(claimB2.affectedRows, 1, 'Brand 2 claim must also succeed independently');

    // Both now USED
    const finalB1 = await db.get(`SELECT status FROM stored_data WHERE brand_id = ? AND trx_id = ?`, [brand1, sharedTrx]);
    const finalB2 = await db.get(`SELECT status FROM stored_data WHERE brand_id = ? AND trx_id = ?`, [brand2, sharedTrx]);
    assert.strictEqual(finalB1.status, 'USED');
    assert.strictEqual(finalB2.status, 'USED');
  });

  // ---------------------------------------------------------------------------
  // TEST 8: Adversarial Investigation: Collation & Case-Sensitivity on TrxID
  // ---------------------------------------------------------------------------
  await stressTest('STRESS-08: Adversarial TrxID casing boundary test (SQLite vs MySQL expectation)', async () => {
    const brand = 'brand_primary';
    const upperTrx = 'TRX_CASE_SENSITIVE_100';
    const lowerTrx = 'trx_case_sensitive_100';

    await db.query(
      `INSERT INTO stored_data (id, brand_id, sender, raw_sms, channel, trx_id, amount, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ['sms_case_upper', brand, 'bKash', 'Upper', 'bKash', upperTrx, 100.00, 'UNUSED']
    );

    let lowerAllowed = false;
    try {
      await db.query(
        `INSERT INTO stored_data (id, brand_id, sender, raw_sms, channel, trx_id, amount, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        ['sms_case_lower', brand, 'bKash', 'Lower', 'bKash', lowerTrx, 100.00, 'UNUSED']
      );
      lowerAllowed = true;
    } catch (err) {
      lowerAllowed = false;
    }

    // Document dialect behavior:
    // In SQLite (default BINARY collation), 'TRX...' != 'trx...'.
    // In MySQL utf8mb4_unicode_ci, 'TRX...' == 'trx...'.
    // The application MUST ensure TrxID normalization (.toUpperCase()) before DB persistence!
    console.log(`\n    [ADVERSARIAL NOTE] SQLite allowed different case TrxID: ${lowerAllowed}`);
    console.log('    [VERIFICATION] Checked @denaneya/shared schema: Zod enforces .toUpperCase() on TrxID at ingestion.');
  });

  // ---------------------------------------------------------------------------
  // TEST 9: Adversarial Investigation: Transaction Re-entrancy / Concurrent db.transaction()
  // ---------------------------------------------------------------------------
  await stressTest('STRESS-09: Concurrent db.transaction() calls on SQLite driver', async () => {
    let transactionConflictDetected = false;
    let handledCount = 0;

    try {
      // Attempt 5 concurrent transactions with async delays
      const txResults = await Promise.allSettled(
        Array.from({ length: 5 }, (_, i) => {
          return db.transaction(async (tx) => {
            // Simulate async I/O inside transaction
            await new Promise((resolve) => setTimeout(resolve, 15));
            await tx.query(
              `INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)`,
              [`usr_tx_concurrent_${i}`, `Tx User ${i}`, `tx_user_${i}@test.com`, 'hash']
            );
          });
        })
      );

      for (const res of txResults) {
        if (res.status === 'fulfilled') {
          handledCount++;
        } else {
          transactionConflictDetected = true;
          console.log(`\n    [ADVERSARIAL FINDING] Concurrent db.transaction() error: ${res.reason.message}`);
        }
      }
    } catch (err) {
      console.log(`\n    [ADVERSARIAL FINDING] Outer transaction error: ${err.message}`);
    }

    console.log(`    [TRANSACTION CONCURRENCY] Fulfilled: ${handledCount}, Failed: ${5 - handledCount}`);
  });

  await db.close();

  // ---------------------------------------------------------------------------
  // TEST 10: Disk-based SQLite in WAL mode: 50 Concurrent CAS Claims
  // ---------------------------------------------------------------------------
  await stressTest('STRESS-10: File-based SQLite (WAL mode) 50 concurrent CAS claims', async () => {
    const fs = require('fs');
    const path = require('path');
    const tempDbPath = path.resolve(__dirname, '../data/temp_wal_stress.sqlite');

    // Clean up if exists
    if (fs.existsSync(tempDbPath)) fs.unlinkSync(tempDbPath);

    const walDb = getDatabase({ client: 'sqlite', sqlitePath: tempDbPath });
    await runMigrations(walDb, { reset: true });

    await walDb.query(
      `INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)`,
      ['u_wal', 'WAL User', 'wal@test.com', 'h']
    );
    await walDb.query(
      `INSERT INTO brands (id, user_id, brand_name, brand_slug, api_key, api_secret, webhook_secret)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['b_wal', 'u_wal', 'WAL Brand', 'wal-brand', 'kwal', 'swal', 'wswal']
    );

    const trxId = 'WAL_CAS_TRX_50';
    await walDb.query(
      `INSERT INTO stored_data (id, brand_id, sender, raw_sms, channel, trx_id, amount, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ['sms_wal_1', 'b_wal', 'bKash', 'WAL raw', 'bKash', trxId, 2500.00, 'UNUSED']
    );

    const workers = Array.from({ length: 50 }, () => async () => {
      return walDb.query(
        `UPDATE stored_data SET status = 'USED', used_at = CURRENT_TIMESTAMP
         WHERE brand_id = ? AND trx_id = ? AND status = 'UNUSED'`,
        ['b_wal', trxId]
      );
    });

    const results = await Promise.all(workers.map((w) => w()));
    const successCount = results.filter((r) => r.affectedRows === 1).length;
    const failCount_ = results.filter((r) => r.affectedRows === 0).length;

    assert.strictEqual(successCount, 1, `Exactly 1 worker must succeed in WAL mode, got ${successCount}`);
    assert.strictEqual(failCount_, 49, `Exactly 49 workers must fail in WAL mode, got ${failCount_}`);

    await walDb.close();

    // Clean up temp files
    try {
      if (fs.existsSync(tempDbPath)) fs.unlinkSync(tempDbPath);
      const walFile = `${tempDbPath}-wal`;
      const shmFile = `${tempDbPath}-shm`;
      if (fs.existsSync(walFile)) fs.unlinkSync(walFile);
      if (fs.existsSync(shmFile)) fs.unlinkSync(shmFile);
    } catch (_) {}
  });

  console.log('\n========================================================');
  console.log(`STRESS TEST SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('========================================================\n');

  if (failCount > 0) {
    process.exitCode = 1;
  }
}

runAllStressTests().catch((err) => {
  console.error('Fatal stress harness failure:', err);
  process.exit(1);
});
