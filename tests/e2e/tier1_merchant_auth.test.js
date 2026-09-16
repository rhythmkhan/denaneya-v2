/**
 * DenaNeya v2.0 - E2E Tier 1: Merchant & Auth Journey Test Suite
 * File: tests/e2e/tier1_merchant_auth.test.js
 * 
 * Scope:
 * - Merchant registration and JWT authentication (POST /api/auth/register, POST /api/auth/login, GET /api/auth/me)
 * - Brand creation and auto-generation of S2S API keys and webhook secrets
 * - 52+ Gateway activation toggle, category filtering, and credential setup
 * - Android device pairing, token issuance, and heartbeat telemetry monitoring
 * - Staff member invitation with granular 10-module RBAC permissions matrix
 * - 50 starter credits display and topup packages (GET /api/billing/balance, POST /api/billing/topup)
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
console.log('      DenaNeya v2.0 - E2E Tier 1: Merchant & Auth Journey Test Suite           ');
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

async function runTier1Suite() {
  await setup();

  let merchantToken = '';
  let merchantId = '';
  let defaultBrandId = '';
  let customBrandId = '';
  let customApiKey = '';
  let customApiSecret = '';
  let customWebhookSecret = '';
  let createdGatewayId = '';
  let pairedDeviceId = '';
  let pairedDeviceToken = '';
  let staffUserId = '';

  // ==========================================================================
  // SECTION 1: MERCHANT REGISTRATION & JWT AUTHENTICATION
  // ==========================================================================
  console.log('--- Section 1: Merchant Registration & JWT Authentication ---');

  await test('T1-AUTH-01: Merchant registration provisions user with 50 starter credits, default brand, and valid JWT', async () => {
    const payload = {
      name: 'E2E Merchant One',
      email: 'merchant.one@testcorp.com',
      password: 'StrongPassword#2026'
    };

    const res = await request('/api/auth/register', {
      method: 'POST',
      body: payload
    });

    assert.strictEqual(res.status, 201, `Expected HTTP 201, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.token, 'JWT token must be returned on registration');
    assert.ok(res.body.user, 'User object must be returned');
    assert.strictEqual(res.body.user.role, 'merchant');
    assert.strictEqual(res.body.user.credits, 50, 'Must grant exactly 50 starter credits');
    assert.ok(res.body.brand, 'Default brand must be provisioned');
    assert.ok(res.body.brand.id, 'Default brand ID must be returned');
    assert.ok(res.body.brand.apiKey.startsWith('dn_live_'), 'Default brand API key must start with dn_live_');

    merchantToken = res.body.token;
    merchantId = res.body.user.id;
    defaultBrandId = res.body.brand.id;
  });

  await test('T1-AUTH-02: Merchant login verifies password and returns fresh 24h JWT', async () => {
    const res = await request('/api/auth/login', {
      method: 'POST',
      body: {
        email: 'merchant.one@testcorp.com',
        password: 'StrongPassword#2026'
      }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.token);
    assert.strictEqual(res.body.user.id, merchantId);
    assert.strictEqual(res.body.user.credits, 50);

    // Update to newest token
    merchantToken = res.body.token;
  });

  await test('T1-AUTH-03: Authenticated GET /api/auth/me returns merchant profile and owned brands', async () => {
    const res = await request('/api/auth/me', {
      headers: {
        Authorization: `Bearer ${merchantToken}`
      }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.user.id, merchantId);
    assert.strictEqual(res.body.user.credits, 50);
    assert.ok(Array.isArray(res.body.brands));
    assert.ok(res.body.brands.length >= 1);
    assert.strictEqual(res.body.brands[0].id, defaultBrandId);
    // Secrets must NOT be leaked
    assert.strictEqual(res.body.brands[0].api_secret, undefined);
    assert.strictEqual(res.body.brands[0].webhook_secret, undefined);
  });

  // ==========================================================================
  // SECTION 2: BRAND CREATION & CRYPTOGRAPHIC S2S SECRETS
  // ==========================================================================
  console.log('\n--- Section 2: Brand Creation & S2S Key Generation ---');

  await test('T1-BRAND-01: Brand creation auto-generates S2S API key, API secret, and webhook secret', async () => {
    const res = await request('/api/brands', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${merchantToken}`
      },
      body: {
        brand_name: 'DenaNeya MegaMart',
        brand_slug: 'denaneya-megamart',
        webhook_url: 'https://megamart.com/api/payment-webhook'
      }
    });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.brand);
    assert.ok(res.body.brand.id);
    assert.strictEqual(res.body.brand.brand_name, 'DenaNeya MegaMart');
    assert.strictEqual(res.body.brand.brand_slug, 'denaneya-megamart');
    assert.ok(res.body.brand.api_key.startsWith('dn_live_'), 'API key must start with dn_live_');
    assert.strictEqual(res.body.brand.api_secret.length, 64, 'API secret must be 64-character hex');
    assert.strictEqual(res.body.brand.webhook_secret.length, 64, 'Webhook secret must be 64-character hex');

    customBrandId = res.body.brand.id;
    customApiKey = res.body.brand.api_key;
    customApiSecret = res.body.brand.api_secret;
    customWebhookSecret = res.body.brand.webhook_secret;
  });

  await test('T1-BRAND-02: GET /api/brands/:id returns brand details with masked cryptographic secrets', async () => {
    const res = await request(`/api/brands/${customBrandId}`, {
      headers: {
        Authorization: `Bearer ${merchantToken}`
      }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.brand.id, customBrandId);
    assert.strictEqual(res.body.brand.api_key, customApiKey);
    // Plaintext secrets must NEVER be returned here
    assert.strictEqual(res.body.brand.api_secret, undefined);
    assert.strictEqual(res.body.brand.webhook_secret, undefined);
    // Masked secrets must be present
    assert.ok(res.body.brand.api_secret_masked.includes('••••'));
    assert.ok(res.body.brand.webhook_secret_masked.includes('••••'));
  });

  await test('T1-BRAND-03: POST /api/brands/:id/rotate-secrets successfully rotates brand API secret and webhook secret', async () => {
    const res = await request(`/api/brands/${customBrandId}/rotate-secrets`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${merchantToken}`
      },
      body: {
        rotate_api_secret: true,
        rotate_webhook_secret: true
      }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.rotated.api_secret);
    assert.ok(res.body.rotated.webhook_secret);
    assert.notStrictEqual(res.body.rotated.api_secret, customApiSecret, 'New API secret must differ from old');
    assert.notStrictEqual(res.body.rotated.webhook_secret, customWebhookSecret, 'New Webhook secret must differ from old');
  });

  // ==========================================================================
  // SECTION 3: 52+ GATEWAY ACTIVATION & CREDENTIAL MANAGEMENT
  // ==========================================================================
  console.log('\n--- Section 3: 52+ Gateway Catalog, Activation & Toggle ---');

  await test('T1-GATEWAY-01: GET /api/gateways retrieves brand gateways and category counts', async () => {
    const res = await request('/api/gateways', {
      headers: {
        Authorization: `Bearer ${merchantToken}`,
        'x-brand-id': customBrandId
      }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.counts);
    assert.strictEqual(typeof res.body.counts.all, 'number');
    assert.strictEqual(typeof res.body.counts.mobile, 'number');
    assert.strictEqual(typeof res.body.counts.bank, 'number');
    assert.strictEqual(typeof res.body.counts.international, 'number');
    assert.ok(Array.isArray(res.body.gateways));
  });

  await test('T1-GATEWAY-02: POST /api/gateways activates a new bKash Merchant Gateway with credentials', async () => {
    const res = await request('/api/gateways', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${merchantToken}`,
        'x-brand-id': customBrandId
      },
      body: {
        channel_name: 'bKash Merchant Direct',
        category: 'Mobile',
        account_type: 'merchant',
        account_number: '01811223344',
        ussd_code: '*247#',
        fee_percentage: 1.5,
        fee_fixed: 0.0,
        fields: {
          merchant_number: '01811223344',
          counter_id: '1'
        }
      }
    });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.gateway);
    assert.ok(res.body.gateway.id);
    assert.strictEqual(res.body.gateway.channel_name, 'bKash Merchant Direct');
    assert.strictEqual(res.body.gateway.status, 'active');

    createdGatewayId = res.body.gateway.id;
  });

  await test('T1-GATEWAY-03: POST /api/gateways/:id/toggle toggles gateway status between active and inactive', async () => {
    // 1. Toggle to inactive
    const toggleOff = await request(`/api/gateways/${createdGatewayId}/toggle`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${merchantToken}`,
        'x-brand-id': customBrandId
      }
    });

    assert.strictEqual(toggleOff.status, 200);
    assert.strictEqual(toggleOff.body.gateway.status, 'inactive');

    // 2. Toggle back to active
    const toggleOn = await request(`/api/gateways/${createdGatewayId}/toggle`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${merchantToken}`,
        'x-brand-id': customBrandId
      }
    });

    assert.strictEqual(toggleOn.status, 200);
    assert.strictEqual(toggleOn.body.gateway.status, 'active');
  });

  await test('T1-GATEWAY-04: PUT /api/gateways/:id updates gateway credentials and fee parameters', async () => {
    const res = await request(`/api/gateways/${createdGatewayId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${merchantToken}`,
        'x-brand-id': customBrandId
      },
      body: {
        fee_percentage: 1.25,
        account_number: '01899887766'
      }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.gateway.account_number, '01899887766');

    // Verify persistence and fee percentage update via GET /api/gateways
    const verifyRes = await request('/api/gateways', {
      headers: {
        Authorization: `Bearer ${merchantToken}`,
        'x-brand-id': customBrandId
      }
    });
    const gw = verifyRes.body.gateways.find((g) => g.id === createdGatewayId);
    assert.ok(gw, 'Updated gateway must exist in gateway listing');
    assert.strictEqual(gw.account_number, '01899887766');
    assert.strictEqual(gw.fee_percentage, 1.25);
  });

  // ==========================================================================
  // SECTION 4: ANDROID DEVICE PAIRING & HEARTBEAT MONITORING
  // ==========================================================================
  console.log('\n--- Section 4: Android Device Pairing & Heartbeat Telemetry ---');

  await test('T1-DEVICE-01: POST /api/devices registers new handset and generates pairing device token', async () => {
    const res = await request('/api/devices', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${merchantToken}`,
        'x-brand-id': customBrandId
      },
      body: {
        device_name: 'Warehouse Samsung Galaxy A54',
        device_model: 'SM-A546E',
        sim1_operator: 'Grameenphone',
        sim2_operator: 'Banglalink'
      }
    });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.device);
    assert.ok(res.body.device.id);
    assert.ok(res.body.device.device_token);
    assert.strictEqual(res.body.device.device_name, 'Warehouse Samsung Galaxy A54');
    assert.strictEqual(res.body.device.brand_id, customBrandId);

    pairedDeviceId = res.body.device.id;
    pairedDeviceToken = res.body.device.device_token;
  });

  await test('T1-DEVICE-02: POST /api/device/heartbeat updates handset battery and sync telemetry', async () => {
    const res = await request('/api/device/heartbeat', {
      method: 'POST',
      headers: {
        'device-api-key': pairedDeviceToken
      },
      body: {
        battery_level: 94,
        network_type: 'LTE'
      }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.device.battery_level, 94);
    assert.strictEqual(res.body.device.status, 'active');
  });

  await test('T1-DEVICE-03: GET /api/device/status verifies handset connection health and bound brand', async () => {
    const res = await request('/api/device/status', {
      headers: {
        'device-api-key': pairedDeviceToken
      }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.device.id, pairedDeviceId);
    assert.strictEqual(res.body.device.brand_id, customBrandId);
    assert.strictEqual(res.body.device.status, 'active');
    assert.strictEqual(res.body.device.battery_level, 94);
  });

  await test('T1-DEVICE-04: GET /api/devices lists paired handsets on merchant dashboard', async () => {
    const res = await request('/api/devices', {
      headers: {
        Authorization: `Bearer ${merchantToken}`,
        'x-brand-id': customBrandId
      }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.devices));
    const device = res.body.devices.find((d) => d.id === pairedDeviceId);
    assert.ok(device, 'Created device must appear in merchant device list');
    assert.strictEqual(device.battery_level, 94);
  });

  // ==========================================================================
  // SECTION 5: STAFF INVITATION WITH 10-MODULE RBAC MATRIX
  // ==========================================================================
  console.log('\n--- Section 5: Staff Member Invitation & 10-Module RBAC Matrix ---');

  await test('T1-STAFF-01: Brand owner invites staff member with granular 10-module RBAC permissions', async () => {
    const permissionsPayload = [
      { module: 'overview', can_read: true, can_create: false, can_update: false, can_delete: false },
      { module: 'invoices', can_read: true, can_create: true, can_update: true, can_delete: false },
      { module: 'payment_links', can_read: true, can_create: true, can_update: false, can_delete: false },
      { module: 'landing_pages', can_read: true, can_create: false, can_update: false, can_delete: false },
      { module: 'gateways', can_read: true, can_create: false, can_update: false, can_delete: false },
      { module: 'devices', can_read: true, can_create: false, can_update: false, can_delete: false },
      { module: 'staff', can_read: true, can_create: false, can_update: false, can_delete: false },
      { module: 'billing', can_read: false, can_create: false, can_update: false, can_delete: false },
      { module: 'referrals', can_read: false, can_create: false, can_update: false, can_delete: false },
      { module: 'settings', can_read: false, can_create: false, can_update: false, can_delete: false }
    ];

    const res = await request('/api/staff', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${merchantToken}`,
        'x-brand-id': customBrandId
      },
      body: {
        name: 'Finance Manager Rafiq',
        email: 'rafiq.finance@testcorp.com',
        password: 'StaffPassword#2026',
        permissions: permissionsPayload
      }
    });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.staff);
    assert.ok(res.body.staff.user_id);
    assert.strictEqual(res.body.staff.email, 'rafiq.finance@testcorp.com');
    assert.strictEqual(res.body.staff.permissions.length, 10, 'Must record permissions for all 10 standard modules');

    staffUserId = res.body.staff.user_id;
  });

  await test('T1-STAFF-02: GET /api/staff lists staff members and their 10-module RBAC permissions', async () => {
    const res = await request('/api/staff', {
      headers: {
        Authorization: `Bearer ${merchantToken}`,
        'x-brand-id': customBrandId
      }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.staff));
    const staff = res.body.staff.find((s) => s.user_id === staffUserId);
    assert.ok(staff, 'Invited staff member must appear in staff list');
    assert.strictEqual(staff.permissions.length, 10);
    
    // Check specific module grants
    const invPerm = staff.permissions.find((p) => p.module === 'invoices');
    assert.strictEqual(invPerm.can_create, true);
    assert.strictEqual(invPerm.can_read, true);
    assert.strictEqual(invPerm.can_delete, false);

    const billingPerm = staff.permissions.find((p) => p.module === 'billing');
    assert.strictEqual(billingPerm.can_read, false);
  });

  // ==========================================================================
  // SECTION 6: BILLING BALANCE & CREDIT TOPUP PACKAGES
  // ==========================================================================
  console.log('\n--- Section 6: Starter Credits & Topup Packages ---');

  await test('T1-BILL-01: GET /api/billing/balance displays 50 starter credits and topup packages catalog', async () => {
    const res = await request('/api/billing/balance', {
      headers: {
        Authorization: `Bearer ${merchantToken}`,
        'x-brand-id': customBrandId
      }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.balance);
    assert.strictEqual(res.body.balance.credits, 50, 'Merchant must show initial 50 credits');
    assert.strictEqual(res.body.balance.starter_credits, 50);
    assert.ok(Array.isArray(res.body.packages));
    assert.ok(res.body.packages.length >= 4, 'Catalog must offer at least 4 topup packages');
    
    const growthPkg = res.body.packages.find((p) => p.id === 'pkg_growth_200');
    assert.ok(growthPkg);
    assert.strictEqual(growthPkg.credits, 200);
  });

  await test('T1-BILL-02: POST /api/billing/topup purchases pkg_growth_200 and increments balance by 200', async () => {
    const res = await request('/api/billing/topup', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${merchantToken}`,
        'x-brand-id': customBrandId
      },
      body: {
        package_id: 'pkg_growth_200',
        payment_method: 'bKash'
      }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.topup.credits_added, 200);
    assert.strictEqual(res.body.topup.new_balance, 250, '50 initial + 200 topup = 250 credits');
  });

  await test('T1-BILL-03: POST /api/billing/topup accepts custom numeric credit amount (min 10 credits)', async () => {
    const res = await request('/api/billing/topup', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${merchantToken}`,
        'x-brand-id': customBrandId
      },
      body: {
        amount_credits: 50,
        payment_method: 'Nagad'
      }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.topup.credits_added, 50);
    assert.strictEqual(res.body.topup.new_balance, 300, '250 + 50 = 300 credits');
  });

  await teardown();
}

runTier1Suite().catch((err) => {
  console.error('Fatal execution error in Tier 1 suite:', err);
  process.exit(1);
});
