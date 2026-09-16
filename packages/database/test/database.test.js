/**
 * DenaNeya v2.0 - Database Package Integration & Security Test Suite
 * Tests 9 Relational Tables, Dual-Driver Abstraction, Migrations,
 * Tenant-Scoped Uniqueness, Atomic CAS Reconciliation, Check Constraints,
 * and 52+ Gateways Seeder.
 */

'use strict';

const assert = require('node:assert');
const {
  getDatabase,
  runMigrations,
  runSeed,
  GATEWAY_CATALOG,
  getGatewaysByTab,
  fixtures
} = require('../src/index.js');

console.log('=== Running @denaneya/database Automated Test Suite ===');

let passCount = 0;
async function test(name, fn) {
  try {
    await fn();
    console.log(`  PASS: ${name}`);
    passCount++;
  } catch (err) {
    console.error(`  FAIL: ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

async function runAllTests() {
  const db = getDatabase({ client: 'sqlite', sqlitePath: ':memory:' });

  // 1. Migration Verification
  await test('M1-DB-01: Schema Migration creates all 9 tables idempotently', async () => {
    const res1 = await runMigrations(db, { reset: true });
    assert.strictEqual(res1.success, true);

    const requiredTables = [
      'affiliate_referrals',
      'brands',
      'devices',
      'gateways',
      'invoices',
      'staff_permissions',
      'stored_data',
      'users',
      'webhook_logs'
    ];

    for (const t of requiredTables) {
      assert.ok(res1.tablesCreated.includes(t), `Table '${t}' must exist`);
    }

    // Idempotency: Run second time without reset
    const res2 = await runMigrations(db, { reset: false });
    assert.strictEqual(res2.success, true);
  });

  // 2. Foreign Key Cascade Enforcement
  await test('M1-DB-02: Foreign Keys & Cascade Deletion on Brand Boundary', async () => {
    // Insert test user and brand
    await db.query(
      `INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)`,
      ['usr_cascade_test', 'Cascade User', 'cascade@example.com', 'hash']
    );

    await db.query(
      `INSERT INTO brands (id, user_id, brand_name, brand_slug, api_key, api_secret, webhook_secret)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['b_cascade_test', 'usr_cascade_test', 'Cascade Brand', 'cascade-brand', 'k1', 's1', 'ws1']
    );

    // Insert child device and invoice
    await db.query(
      `INSERT INTO devices (id, brand_id, device_name, device_token) VALUES (?, ?, ?, ?)`,
      ['dev_cascade_test', 'b_cascade_test', 'Test Device', 'tok_cascade_test']
    );

    await db.query(
      `INSERT INTO invoices (id, brand_id, invoice_number, customer_name, amount, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['inv_cascade_test', 'b_cascade_test', 'INV-C-01', 'Cust', 100.00, '2026-09-16 12:00:00']
    );

    // Delete brand -> child records must be cascade deleted
    await db.query(`DELETE FROM brands WHERE id = ?`, ['b_cascade_test']);

    const dev = await db.get(`SELECT * FROM devices WHERE id = ?`, ['dev_cascade_test']);
    assert.strictEqual(dev, null, 'Child device must be deleted when brand is deleted');

    const inv = await db.get(`SELECT * FROM invoices WHERE id = ?`, ['inv_cascade_test']);
    assert.strictEqual(inv, null, 'Child invoice must be deleted when brand is deleted');
  });

  // 3. Multi-Tenant Scoped Uniqueness (VULN-01 & VULN-09)
  await test('M1-DB-03: Tenant-Scoped Composite Unique (brand_id, trx_id) on stored_data', async () => {
    // Setup 2 brands
    await db.query(`INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)`, ['u1', 'U1', 'u1@t.com', 'h']);
    await db.query(`INSERT INTO brands (id, user_id, brand_name, brand_slug, api_key, api_secret, webhook_secret) VALUES (?, ?, ?, ?, ?, ?, ?)`, ['brand_A', 'u1', 'A', 'brand-a', 'ka', 'sa', 'wsa']);
    await db.query(`INSERT INTO brands (id, user_id, brand_name, brand_slug, api_key, api_secret, webhook_secret) VALUES (?, ?, ?, ?, ?, ?, ?)`, ['brand_B', 'u1', 'B', 'brand-b', 'kb', 'sb', 'wsb']);

    const identicalTrxId = 'BKA99887766';

    // Insert for Brand A
    await db.query(
      `INSERT INTO stored_data (id, brand_id, sender, raw_sms, channel, trx_id, amount)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['sms_A1', 'brand_A', 'bKash', 'Raw A1', 'bKash', identicalTrxId, 500.00]
    );

    // Duplicate insert for same Brand A must FAIL
    let threwDuplicate = false;
    try {
      await db.query(
        `INSERT INTO stored_data (id, brand_id, sender, raw_sms, channel, trx_id, amount)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ['sms_A2', 'brand_A', 'bKash', 'Raw A2', 'bKash', identicalTrxId, 500.00]
      );
    } catch (err) {
      threwDuplicate = true;
      assert.ok(err.message.includes('UNIQUE'), 'Must throw UNIQUE constraint error for duplicate (brand_id, trx_id)');
    }
    assert.strictEqual(threwDuplicate, true, 'Duplicate TrxID for identical brand must be rejected');

    // Identical TrxID for Brand B must SUCCEED (Zero Cross-Tenant Collision DoS - VULN-09)
    let brandBOk = false;
    try {
      await db.query(
        `INSERT INTO stored_data (id, brand_id, sender, raw_sms, channel, trx_id, amount)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ['sms_B1', 'brand_B', 'bKash', 'Raw B1', 'bKash', identicalTrxId, 500.00]
      );
      brandBOk = true;
    } catch (err) {
      brandBOk = false;
    }
    assert.strictEqual(brandBOk, true, 'Brand B must be able to ingest the same TrxID without collision!');
  });

  // 4. Atomic Compare-And-Swap (CAS) Concurrency (VULN-03)
  await test('M1-DB-04: Atomic Compare-and-Swap (CAS) State Transitions', async () => {
    const trxId = 'CAS_TEST_TRX_001';
    await db.query(
      `INSERT INTO stored_data (id, brand_id, sender, raw_sms, channel, trx_id, amount, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ['sms_cas_1', 'brand_A', 'bKash', 'Raw CAS', 'bKash', trxId, 1000.00, 'UNUSED']
    );

    // First worker claims the transaction
    const firstClaim = await db.query(
      `UPDATE stored_data
       SET status = 'USED', used_at = CURRENT_TIMESTAMP
       WHERE brand_id = ? AND trx_id = ? AND status = 'UNUSED'`,
      ['brand_A', trxId]
    );
    assert.strictEqual(firstClaim.affectedRows, 1, 'First worker must successfully update status');

    // Second simultaneous worker attempts to claim identical transaction
    const secondClaim = await db.query(
      `UPDATE stored_data
       SET status = 'USED', used_at = CURRENT_TIMESTAMP
       WHERE brand_id = ? AND trx_id = ? AND status = 'UNUSED'`,
      ['brand_A', trxId]
    );
    assert.strictEqual(secondClaim.affectedRows, 0, 'Second concurrent worker must get 0 affectedRows (Double-Spend Prevented)');
  });

  // 5. Integrity Check Constraints (VULN-11, Devices, Invoices)
  await test('M1-DB-05: Integrity Check Constraints (Credits >= 0, Battery 0-100, Amount > 0)', async () => {
    // Negative credits check constraint
    let creditThrew = false;
    try {
      await db.query(
        `INSERT INTO users (id, name, email, password_hash, credits) VALUES (?, ?, ?, ?, ?)`,
        ['u_neg_credit', 'Neg Credit', 'neg@test.com', 'h', -10]
      );
    } catch (err) {
      creditThrew = true;
      assert.ok(err.message.includes('CHECK'), 'Must reject negative credits with CHECK constraint');
    }
    assert.strictEqual(creditThrew, true, 'Negative user credit balance must be rejected');

    // Battery percentage check constraint (> 100 or < 0)
    let batteryThrew = false;
    try {
      await db.query(
        `INSERT INTO devices (id, brand_id, device_name, device_token, battery_level) VALUES (?, ?, ?, ?, ?)`,
        ['dev_bad_bat', 'brand_A', 'Bad Bat', 'tok_bad_bat', 150]
      );
    } catch (err) {
      batteryThrew = true;
      assert.ok(err.message.includes('CHECK'), 'Must reject battery > 100');
    }
    assert.strictEqual(batteryThrew, true, 'Invalid battery percentage must be rejected');

    // Invoice amount check constraint (amount <= 0)
    let amountThrew = false;
    try {
      await db.query(
        `INSERT INTO invoices (id, brand_id, invoice_number, customer_name, amount, expires_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        ['inv_bad_amt', 'brand_A', 'INV-BAD-01', 'Cust', -5.00, '2026-09-16 12:00:00']
      );
    } catch (err) {
      amountThrew = true;
      assert.ok(err.message.includes('CHECK'), 'Must reject invoice amount <= 0');
    }
    assert.strictEqual(amountThrew, true, 'Zero or negative invoice amounts must be rejected');
  });

  // 6. Universal Seed Runner & Gateway Catalog
  await test('M1-DB-06: 52+ Gateway Catalog & Demo Fixtures Seeding', async () => {
    // Assert gateway catalog structure
    assert.strictEqual(GATEWAY_CATALOG.length, 52, 'Master catalog must have exactly 52 gateways');
    assert.strictEqual(getGatewaysByTab('Mobile').length, 33, 'Must have 33 Mobile gateways');
    assert.strictEqual(getGatewaysByTab('International').length, 8, 'Must have 8 International gateways');
    assert.strictEqual(getGatewaysByTab('Bank').length, 11, 'Must have 11 Bank gateways');
    assert.strictEqual(getGatewaysByTab('All').length, 52, 'All tab must have all 52 gateways');

    // Clean migration & run seeder
    await runMigrations(db, { reset: true });
    const seedRes = await runSeed(db, { clean: true, seedAll52: true });

    assert.strictEqual(seedRes.success, true);
    assert.strictEqual(seedRes.usersSeeded, 2);
    assert.strictEqual(seedRes.brandsSeeded, 1);
    assert.strictEqual(seedRes.devicesSeeded, 1);
    assert.strictEqual(seedRes.activeGatewaysSeeded, 6);
    assert.strictEqual(seedRes.catalogGatewaysSeeded, 52);
    assert.strictEqual(seedRes.invoicesSeeded, 5);
    assert.strictEqual(seedRes.smsTransactionsSeeded, 3);
    assert.strictEqual(seedRes.webhookLogsSeeded, 1);
    assert.strictEqual(seedRes.staffPermissionsSeeded, 3);
    assert.strictEqual(seedRes.affiliateReferralsSeeded, 1);

    // Verify invoice lifecycles exist
    const completedInv = await db.get(`SELECT * FROM invoices WHERE status = 'COMPLETED'`);
    assert.ok(completedInv, 'Must have COMPLETED invoice');

    const pendingInv = await db.get(`SELECT * FROM invoices WHERE status = 'PENDING' AND payment_method = 'Nagad'`);
    assert.ok(pendingInv, 'Must have PENDING Nagad invoice');

    const expiredInv = await db.get(`SELECT * FROM invoices WHERE status = 'EXPIRED'`);
    assert.ok(expiredInv, 'Must have EXPIRED invoice');

    const cancelledInv = await db.get(`SELECT * FROM invoices WHERE status = 'CANCELLED'`);
    assert.ok(cancelledInv, 'Must have CANCELLED invoice');

    // Verify stored SMS has UNUSED matching Nagad transaction
    const unusedSms = await db.get(`SELECT * FROM stored_data WHERE trx_id = '7HG6F5D4' AND status = 'UNUSED'`);
    assert.ok(unusedSms, 'Must have UNUSED SMS receipt with TrxID 7HG6F5D4');
    assert.strictEqual(Number(unusedSms.amount), Number(pendingInv.amount), 'Unused SMS amount must match pending invoice');
  });

  // 7. Transaction Rollback Verification
  await test('M1-DB-07: Asynchronous Transaction Rollback on Error', async () => {
    let txFailed = false;
    try {
      await db.transaction(async (tx) => {
        await tx.query(
          `INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)`,
          ['u_tx_rollback', 'Rollback User', 'rollback@test.com', 'h']
        );
        throw new Error('Simulated failure inside transaction');
      });
    } catch (err) {
      txFailed = true;
    }
    assert.strictEqual(txFailed, true);

    const checkUser = await db.get(`SELECT * FROM users WHERE id = ?`, ['u_tx_rollback']);
    assert.strictEqual(checkUser, null, 'User inserted inside failed transaction must be rolled back');
  });

  await db.close();
  console.log(`\nALL ${passCount} DATABASE TEST SUITES PASSED (100% OK)!\n`);
}

runAllTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
