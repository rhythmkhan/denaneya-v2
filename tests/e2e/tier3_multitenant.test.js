/**
 * DenaNeya v2.0 - E2E Tier 3: Cross-Tenant Boundaries & IDOR Isolation Test Suite
 * File: tests/e2e/tier3_multitenant.test.js
 *
 * Scope:
 * - Cross-tenant IDOR attacks: Merchant A querying Merchant B dashboard stats, invoices, gateways, staff (HTTP 403 / 404).
 * - Cross-tenant device sync rejection: Device A token attempting to sync SMS into Brand B.
 * - Hardware token binding: deviceAuthMiddleware derives brand context strictly from paired handset token.
 * - Brand scoping verification: all queries strictly enforce WHERE brand_id = ?.
 * - Cross-tenant TrxID collision isolation: composite index UNIQUE (brand_id, trx_id) allows identical TrxID in distinct brands.
 */

process.env.NODE_ENV = 'test';
process.env.DB_CLIENT = 'sqlite';
process.env.DB_SQLITE_PATH = ':memory:';
process.env.JWT_SECRET = 'denaneya_development_jwt_secret_min_32_bytes_long_12345';

import assert from 'node:assert';
import dbPkg from '@denaneya/database';
import { createApp } from '../../apps/api/src/app.js';

const { getDatabase, runMigrations, runSeed } = dbPkg;

console.log('===============================================================================');
console.log('      DenaNeya v2.0 - E2E Tier 3: Cross-Tenant Boundaries & IDOR Test Suite    ');
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
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch (_) {
    json = text;
  }

  return {
    status: res.status,
    headers: res.headers,
    body: json,
    rawText: text
  };
}

async function setup() {
  console.log('[Setup] Initializing in-memory SQLite database and running migrations...');
  db = getDatabase();
  await runMigrations(db, { reset: true });
  await runSeed(db);
  console.log('[Setup] Database migrations and seed fixtures ready.');

  const app = createApp();
  server = app.listen(0);
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
  console.log(`[Setup] E2E test server listening on ${baseUrl}\n`);
}

async function teardown() {
  console.log('\n[Teardown] Stopping test server and closing database...');
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  if (db) {
    await db.close();
  }
  console.log(`[Teardown] Suite complete. Summary: ${passCount} Passed, ${failCount} Failed.`);
  if (failCount > 0) {
    process.exit(1);
  }
}

async function runTier3Suite() {
  await setup();

  // 1. Provision Merchant Alpha
  const regAlpha = await request('/api/auth/register', {
    method: 'POST',
    body: {
      name: 'Alpha Merchant',
      email: 'alpha@merchants.com',
      password: 'AlphaPassword#2026'
    }
  });
  assert.strictEqual(regAlpha.status, 201);
  const tokenAlpha = regAlpha.body.token;
  const brandAlphaId = regAlpha.body.brand.id;

  // 2. Provision Merchant Beta
  const regBeta = await request('/api/auth/register', {
    method: 'POST',
    body: {
      name: 'Beta Merchant',
      email: 'beta@merchants.com',
      password: 'BetaPassword#2026'
    }
  });
  assert.strictEqual(regBeta.status, 201);
  const tokenBeta = regBeta.body.token;
  const brandBetaId = regBeta.body.brand.id;

  // 3. Create Resources for Brand Alpha
  // 3a. Gateway Alpha
  const gwAlphaRes = await request('/api/gateways', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenAlpha}`, 'x-brand-id': brandAlphaId },
    body: {
      channel_name: 'bKash Alpha Channel',
      category: 'Mobile',
      account_type: 'personal',
      account_number: '01711111111',
      ussd_code: '*247#'
    }
  });
  assert.strictEqual(gwAlphaRes.status, 201);
  const gatewayAlphaId = gwAlphaRes.body.gateway.id;

  // 3b. Invoice Alpha
  const invAlphaRes = await request('/api/invoices', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenAlpha}`, 'x-brand-id': brandAlphaId },
    body: { amount: 1500, customer_name: 'Customer of Alpha' }
  });
  assert.strictEqual(invAlphaRes.status, 201);
  const invoiceAlphaId = invAlphaRes.body.invoice.id;

  // 3c. Device Alpha
  const devAlphaRes = await request('/api/devices', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenAlpha}`, 'x-brand-id': brandAlphaId },
    body: {
      device_name: 'Alpha Phone 1',
      device_model: 'SM-Alpha',
      sim1_operator: 'Grameenphone',
      sim2_operator: 'Robi'
    }
  });
  assert.strictEqual(devAlphaRes.status, 201);
  const deviceAlphaId = devAlphaRes.body.device.id;
  const deviceAlphaToken = devAlphaRes.body.device.device_token;

  // 3d. Staff Alpha
  const staffAlphaRes = await request('/api/staff', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenAlpha}`, 'x-brand-id': brandAlphaId },
    body: {
      name: 'Alpha Staffer',
      email: 'staffer@alpha.com',
      password: 'StafferPass#2026'
    }
  });
  assert.strictEqual(staffAlphaRes.status, 201);
  const staffAlphaUserId = staffAlphaRes.body.staff.user_id;

  // 4. Create Resources for Brand Beta
  // 4a. Gateway Beta
  const gwBetaRes = await request('/api/gateways', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenBeta}`, 'x-brand-id': brandBetaId },
    body: {
      channel_name: 'Nagad Beta Channel',
      category: 'Mobile',
      account_type: 'merchant',
      account_number: '01622222222',
      ussd_code: '*167#'
    }
  });
  assert.strictEqual(gwBetaRes.status, 201);
  const gatewayBetaId = gwBetaRes.body.gateway.id;

  // 4b. Invoice Beta
  const invBetaRes = await request('/api/invoices', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenBeta}`, 'x-brand-id': brandBetaId },
    body: { amount: 3500, customer_name: 'Customer of Beta' }
  });
  assert.strictEqual(invBetaRes.status, 201);
  const invoiceBetaId = invBetaRes.body.invoice.id;

  // 4c. Device Beta
  const devBetaRes = await request('/api/devices', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenBeta}`, 'x-brand-id': brandBetaId },
    body: {
      device_name: 'Beta Phone 2',
      device_model: 'SM-Beta',
      sim1_operator: 'Banglalink',
      sim2_operator: 'Teletalk'
    }
  });
  assert.strictEqual(devBetaRes.status, 201);
  const deviceBetaId = devBetaRes.body.device.id;
  const deviceBetaToken = devBetaRes.body.device.device_token;

  // 4d. Staff Beta
  const staffBetaRes = await request('/api/staff', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenBeta}`, 'x-brand-id': brandBetaId },
    body: {
      name: 'Beta Staffer',
      email: 'staffer@beta.com',
      password: 'StafferPass#2026'
    }
  });
  assert.strictEqual(staffBetaRes.status, 201);
  const staffBetaUserId = staffBetaRes.body.staff.user_id;

  // ==========================================================================
  // SECTION 1: CROSS-TENANT IDOR ATTACKS ON DASHBOARD STATS
  // ==========================================================================
  console.log('--- Section 1: Dashboard Stats IDOR Boundary Testing ---');

  await test('T3-DASH-01: Merchant Alpha querying Brand Beta dashboard stats via x-brand-id header is rejected with HTTP 403', async () => {
    const res = await request('/api/dashboard/stats', {
      headers: {
        Authorization: `Bearer ${tokenAlpha}`,
        'x-brand-id': brandBetaId
      }
    });

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.code, 'FORBIDDEN');
    assert.ok(res.body.message.includes('Access denied'));
  });

  await test('T3-DASH-02: Merchant Alpha querying Brand Beta dashboard stats via query param ?brandId= is rejected with HTTP 403', async () => {
    const res = await request(`/api/dashboard/stats?brandId=${brandBetaId}`, {
      headers: {
        Authorization: `Bearer ${tokenAlpha}`
      }
    });

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.code, 'FORBIDDEN');
  });

  await test('T3-DASH-03: Merchant Alpha querying Brand Beta dashboard stats via query param ?brand_id= is rejected with HTTP 403', async () => {
    const res = await request(`/api/dashboard/stats?brand_id=${brandBetaId}`, {
      headers: {
        Authorization: `Bearer ${tokenAlpha}`
      }
    });

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.code, 'FORBIDDEN');
  });

  await test('T3-DASH-04: Merchant Alpha stats accurately isolates Brand Alpha metrics and leaks 0 Beta data', async () => {
    const res = await request('/api/dashboard/stats', {
      headers: {
        Authorization: `Bearer ${tokenAlpha}`,
        'x-brand-id': brandAlphaId
      }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.metrics.totalCount, 1, 'Brand Alpha has exactly 1 invoice');
    assert.strictEqual(res.body.metrics.totalDevicesCount, 1, 'Brand Alpha has exactly 1 device');
  });

  // ==========================================================================
  // SECTION 2: CROSS-TENANT IDOR ATTACKS ON INVOICES
  // ==========================================================================
  console.log('\n--- Section 2: Invoices IDOR & Scoping Testing ---');

  await test('T3-INV-01: Merchant Alpha listing Brand Beta invoices via x-brand-id is rejected with HTTP 403', async () => {
    const res = await request('/api/invoices', {
      headers: {
        Authorization: `Bearer ${tokenAlpha}`,
        'x-brand-id': brandBetaId
      }
    });

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.code, 'FORBIDDEN');
  });

  await test('T3-INV-02: Merchant Alpha querying Invoice Beta by ID (/api/invoices/:id) returns HTTP 404 INVOICE_NOT_FOUND', async () => {
    const res = await request(`/api/invoices/${invoiceBetaId}`, {
      headers: {
        Authorization: `Bearer ${tokenAlpha}`,
        'x-brand-id': brandAlphaId
      }
    });

    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.body.code, 'INVOICE_NOT_FOUND');
  });

  await test('T3-INV-03: Merchant Alpha listing invoices contains strictly Brand Alpha invoices with zero leak of Beta invoices', async () => {
    const res = await request('/api/invoices', {
      headers: {
        Authorization: `Bearer ${tokenAlpha}`,
        'x-brand-id': brandAlphaId
      }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.invoices.length, 1);
    assert.strictEqual(res.body.invoices[0].id, invoiceAlphaId);
    assert.notStrictEqual(res.body.invoices[0].id, invoiceBetaId);
  });

  await test('T3-INV-04: Merchant Alpha attempting to create invoice under Brand Beta is rejected with HTTP 403', async () => {
    const res = await request('/api/invoices', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenAlpha}`,
        'x-brand-id': brandBetaId
      },
      body: {
        amount: 200,
        customer_name: 'Unauthorized Invoice'
      }
    });

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.code, 'FORBIDDEN');
  });

  // ==========================================================================
  // SECTION 3: CROSS-TENANT IDOR ATTACKS ON PAYMENT GATEWAYS
  // ==========================================================================
  console.log('\n--- Section 3: Gateways IDOR & Scoping Testing ---');

  await test('T3-GW-01: Merchant Alpha listing Brand Beta gateways via x-brand-id is rejected with HTTP 403', async () => {
    const res = await request('/api/gateways', {
      headers: {
        Authorization: `Bearer ${tokenAlpha}`,
        'x-brand-id': brandBetaId
      }
    });

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.code, 'FORBIDDEN');
  });

  await test('T3-GW-02: Merchant Alpha attempting to toggle Gateway Beta is rejected with HTTP 404 GATEWAY_NOT_FOUND', async () => {
    const res = await request(`/api/gateways/${gatewayBetaId}/toggle`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenAlpha}`,
        'x-brand-id': brandAlphaId
      }
    });

    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.body.code, 'GATEWAY_NOT_FOUND');
  });

  await test('T3-GW-03: Merchant Alpha attempting to update Gateway Beta credentials is rejected with HTTP 404 GATEWAY_NOT_FOUND', async () => {
    const res = await request(`/api/gateways/${gatewayBetaId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${tokenAlpha}`,
        'x-brand-id': brandAlphaId
      },
      body: {
        account_number: '01999999999'
      }
    });

    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.body.code, 'GATEWAY_NOT_FOUND');
  });

  await test('T3-GW-04: Merchant Alpha attempting to delete Gateway Beta is rejected with HTTP 404 GATEWAY_NOT_FOUND', async () => {
    const res = await request(`/api/gateways/${gatewayBetaId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${tokenAlpha}`,
        'x-brand-id': brandAlphaId
      }
    });

    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.body.code, 'GATEWAY_NOT_FOUND');
  });

  // ==========================================================================
  // SECTION 4: CROSS-TENANT IDOR ATTACKS ON STAFF MANAGEMENT
  // ==========================================================================
  console.log('\n--- Section 4: Staff IDOR & Boundary Testing ---');

  await test('T3-STAFF-01: Merchant Alpha listing Brand Beta staff via x-brand-id is rejected with HTTP 403', async () => {
    const res = await request('/api/staff', {
      headers: {
        Authorization: `Bearer ${tokenAlpha}`,
        'x-brand-id': brandBetaId
      }
    });

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.code, 'FORBIDDEN');
  });

  await test('T3-STAFF-02: Merchant Alpha attempting to add staff to Brand Beta is rejected with HTTP 403', async () => {
    const res = await request('/api/staff', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenAlpha}`,
        'x-brand-id': brandBetaId
      },
      body: {
        name: 'Infiltrator',
        email: 'infiltrator@alpha.com',
        password: 'InfiltratorPass#2026'
      }
    });

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.code, 'FORBIDDEN');
  });

  await test('T3-STAFF-03: Merchant Alpha attempting to revoke Staff Beta is rejected with HTTP 404 STAFF_NOT_FOUND', async () => {
    const res = await request(`/api/staff/${staffBetaUserId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${tokenAlpha}`,
        'x-brand-id': brandAlphaId
      }
    });

    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.body.code, 'STAFF_NOT_FOUND');
  });

  // ==========================================================================
  // SECTION 5: CROSS-TENANT DEVICE SYNC REJECTION & TOKEN SCOPING
  // ==========================================================================
  console.log('\n--- Section 5: Device Sync Token Scoping & Cross-Brand Rejection ---');

  await test('T3-DEV-01: Merchant Alpha querying Device Beta details returns HTTP 404 DEVICE_NOT_FOUND', async () => {
    const res = await request(`/api/devices/${deviceBetaId}`, {
      headers: {
        Authorization: `Bearer ${tokenAlpha}`,
        'x-brand-id': brandAlphaId
      }
    });

    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.body.code, 'DEVICE_NOT_FOUND');
  });

  await test('T3-DEV-02: Merchant Alpha attempting to rotate Device Beta token returns HTTP 404 DEVICE_NOT_FOUND', async () => {
    const res = await request(`/api/devices/${deviceBetaId}/rotate-token`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenAlpha}`,
        'x-brand-id': brandAlphaId
      }
    });

    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.body.code, 'DEVICE_NOT_FOUND');
  });

  await test('T3-SYNC-01: Device Alpha token attempting to sync SMS with spoofed x-brand-id: Brand Beta is strictly bound to Brand Alpha', async () => {
    // Authentic bKash cash-in message
    const smsMessage = 'You have received Tk 1,200.00 from 01700000000. Fee Tk 0.00. Balance Tk 15,200.00. TrxID TRXALPHA9901 at 15/09/2026 12:00';

    const res = await request('/api/device/sync-sms', {
      method: 'POST',
      headers: {
        'device-api-key': deviceAlphaToken,
        'x-brand-id': brandBetaId // Spoofed header
      },
      body: {
        sender: 'bKash',
        message: smsMessage,
        sim_slot: 1,
        brand_id: brandBetaId // Spoofed body field
      }
    });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.trx_id, 'TRXALPHA9901');

    // Verify stored_data record in database: MUST belong to Brand Alpha, NEVER Brand Beta
    const storedAlpha = await db.get('SELECT * FROM stored_data WHERE trx_id = ? AND brand_id = ?', ['TRXALPHA9901', brandAlphaId]);
    assert.ok(storedAlpha, 'Stored SMS must belong strictly to Brand Alpha');
    assert.strictEqual(storedAlpha.device_id, deviceAlphaId);

    const storedBeta = await db.get('SELECT * FROM stored_data WHERE trx_id = ? AND brand_id = ?', ['TRXALPHA9901', brandBetaId]);
    assert.ok(!storedBeta, 'Brand Beta must have ZERO records from Device Alpha');
  });

  await test('T3-SYNC-02: Cross-tenant TrxID collision isolation: identical TrxID is independently stored in Brand Beta due to UNIQUE(brand_id, trx_id)', async () => {
    // Identical TrxID ingested for Brand Beta by Device Beta
    const identicalTrxIdMsg = 'You have received Tk 2,500.00 from 01800000000. Fee Tk 0.00. Balance Tk 25,000.00. TrxID TRXALPHA9901 at 15/09/2026 12:05';

    const res = await request('/api/device/sync-sms', {
      method: 'POST',
      headers: {
        'device-api-key': deviceBetaToken
      },
      body: {
        sender: 'bKash',
        message: identicalTrxIdMsg,
        sim_slot: 1
      }
    });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.trx_id, 'TRXALPHA9901');

    // Verify two distinct records exist in database with the same TrxID under different brand_ids
    const allRecords = await db.query('SELECT id, brand_id, trx_id, amount FROM stored_data WHERE trx_id = ?', ['TRXALPHA9901']);
    assert.strictEqual(allRecords.rows.length, 2, 'Exactly 2 records with identical TrxID must co-exist across the two tenants');
    
    const brandsInDb = allRecords.rows.map((r) => r.brand_id);
    assert.ok(brandsInDb.includes(brandAlphaId), 'Must include Brand Alpha record');
    assert.ok(brandsInDb.includes(brandBetaId), 'Must include Brand Beta record');
  });

  // ==========================================================================
  // SECTION 6: DIRECT DATABASE QUERY SCOPING VERIFICATION
  // ==========================================================================
  console.log('\n--- Section 6: Database Scoping Verification (WHERE brand_id = ?) ---');

  await test('T3-SCOPE-01: Invoices table partition: Brand Alpha invoices are strictly isolated from Brand Beta', async () => {
    const alphaInvs = await db.query('SELECT id FROM invoices WHERE brand_id = ?', [brandAlphaId]);
    const betaInvs = await db.query('SELECT id FROM invoices WHERE brand_id = ?', [brandBetaId]);

    assert.strictEqual(alphaInvs.rows.length, 1);
    assert.strictEqual(betaInvs.rows.length, 1);
    assert.strictEqual(alphaInvs.rows[0].id, invoiceAlphaId);
    assert.strictEqual(betaInvs.rows[0].id, invoiceBetaId);
  });

  await test('T3-SCOPE-02: Gateways table partition: Brand Alpha gateways are strictly isolated from Brand Beta', async () => {
    const alphaGws = await db.query('SELECT id FROM gateways WHERE brand_id = ?', [brandAlphaId]);
    const betaGws = await db.query('SELECT id FROM gateways WHERE brand_id = ?', [brandBetaId]);

    assert.strictEqual(alphaGws.rows.length, 1);
    assert.strictEqual(betaGws.rows.length, 1);
    assert.strictEqual(alphaGws.rows[0].id, gatewayAlphaId);
    assert.strictEqual(betaGws.rows[0].id, gatewayBetaId);
  });

  await test('T3-SCOPE-03: Staff permissions partition: Brand Alpha permissions are strictly isolated from Brand Beta', async () => {
    const alphaPerms = await db.query('SELECT id FROM staff_permissions WHERE brand_id = ?', [brandAlphaId]);
    const betaPerms = await db.query('SELECT id FROM staff_permissions WHERE brand_id = ?', [brandBetaId]);

    assert.ok(alphaPerms.rows.length >= 10);
    assert.ok(betaPerms.rows.length >= 10);

    const crossPerms = await db.query('SELECT id FROM staff_permissions WHERE user_id = ? AND brand_id = ?', [staffAlphaUserId, brandBetaId]);
    assert.strictEqual(crossPerms.rows.length, 0, 'Alpha staff must have ZERO permissions in Brand Beta');
  });

  await teardown();
}

runTier3Suite().catch((err) => {
  console.error('Fatal execution error in Tier 3 suite:', err);
  process.exit(1);
});
