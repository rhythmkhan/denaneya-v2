/**
 * DenaNeya v2.0 - Milestone 4 Explorer 3 Verification Test Runner
 * Validates all newly architected API endpoints, security bounds, and TTL enforcement.
 */

import express from 'express';
import http from 'http';
import dbPkg from '@denaneya/database';
import { generateToken } from '../apps/api/src/utils/token.js';

const { getDatabase, runMigrations, runSeed } = dbPkg;

// Import controllers
import invoiceController from '../apps/api/src/controllers/invoiceController.js';
import gatewayController from '../apps/api/src/controllers/gatewayController.js';
import staffController from '../apps/api/src/controllers/staffController.js';
import billingController from '../apps/api/src/controllers/billingController.js';

// Colors for reporting
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ${GREEN}[PASS]${RESET} ${message}`);
    passed++;
  } else {
    console.error(`  ${RED}[FAIL]${RESET} ${message}`);
    failed++;
  }
}

async function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = http.request(
      {
        hostname: u.hostname,
        port: u.port,
        path: u.pathname + u.search,
        method: options.method || 'GET',
        headers: options.headers || {}
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let body = data;
          try {
            body = JSON.parse(data);
          } catch (_) {}
          resolve({ status: res.statusCode, headers: res.headers, body });
        });
      }
    );
    req.on('error', reject);
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function run() {
  console.log(`${CYAN}======================================================${RESET}`);
  console.log(`${CYAN}  DenaNeya v2.0 - M4 API Blueprint Verification Test  ${RESET}`);
  console.log(`${CYAN}======================================================${RESET}\n`);

  process.env.JWT_SECRET = 'denaneya_super_secure_jwt_secret_key_32_bytes_long_123';
  process.env.DB_CLIENT = 'sqlite';
  process.env.SQLITE_DB_PATH = ':memory:';

  const db = getDatabase();
  await runMigrations(db, { reset: true });
  await runSeed(db);

  // Get Demo User & Brand
  const demoUser = await db.get("SELECT * FROM users WHERE email = 'seratulalimkhanrhythm@gmail.com'");
  const demoBrand = await db.get('SELECT * FROM brands WHERE user_id = ?', [demoUser.id]);
  const staffUser = await db.get("SELECT * FROM users WHERE email = 'finance@deshicourse.com'");

  const ownerToken = generateToken({ id: demoUser.id, email: demoUser.email, role: demoUser.role });
  const staffToken = generateToken({ id: staffUser.id, email: staffUser.email, role: staffUser.role });

  // Setup Mock Express App
  const app = express();
  app.use(express.json());

  // Mock tenant injector middleware
  const authAndTenant = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ success: false, code: 'UNAUTHORIZED' });
    const token = authHeader.split(' ')[1];
    if (token === ownerToken) {
      req.user = demoUser;
      req.brand = demoBrand;
      req.isBrandOwner = true;
      req.hasBrandPermission = () => true;
      return next();
    } else if (token === staffToken) {
      req.user = staffUser;
      req.brand = demoBrand;
      req.isBrandOwner = false;
      req.hasBrandPermission = (mod, act) => mod === 'invoices' && act === 'read';
      return next();
    }
    return res.status(401).json({ success: false, code: 'UNAUTHORIZED' });
  };

  // Mount routes
  app.get('/pay/:invoiceId', invoiceController.renderHostedCheckout);
  app.get('/api/invoices/:id/public', invoiceController.getPublicInvoice);
  app.post('/api/invoices', authAndTenant, invoiceController.createInvoice);
  app.get('/api/invoices', authAndTenant, invoiceController.listInvoices);
  app.get('/api/invoices/:id', authAndTenant, invoiceController.getInvoiceById);

  app.get('/api/gateways', authAndTenant, gatewayController.listGateways);
  app.post('/api/gateways/:id/toggle', authAndTenant, gatewayController.toggleGateway);
  app.post('/api/gateways', authAndTenant, gatewayController.createGateway);

  app.get('/api/staff', authAndTenant, staffController.listStaff);
  app.post('/api/staff', authAndTenant, staffController.addStaff);
  app.delete('/api/staff/:id', authAndTenant, staffController.removeStaff);

  app.get('/api/billing/balance', authAndTenant, billingController.getBalance);
  app.post('/api/billing/topup', authAndTenant, billingController.topupCredits);

  const server = http.createServer(app);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // ----------------------------------------------------
    // TEST 1: Public Invoice Summary (GET /api/invoices/:id/public)
    // ----------------------------------------------------
    console.log(`${CYAN}--- Section 1: Public Hosted Checkout Endpoints ---${RESET}`);
    const res1 = await request(`${baseUrl}/api/invoices/inv_pending_002/public`);
    assert(res1.status === 200, 'GET /api/invoices/:id/public returns HTTP 200');
    assert(res1.body.success === true, 'Response body success is true');
    assert(res1.body.invoice.amount === 2500, 'Invoice amount correctly exposed');
    assert(res1.body.invoice.brand_name.includes('Deshi Course'), 'Brand name correctly populated');
    assert(res1.body.invoice.time_remaining_seconds > 0, 'TTL time_remaining_seconds is positive');
    assert(Array.isArray(res1.body.gateways) && res1.body.gateways.length > 0, 'Active gateways list returned');
    assert(res1.body.invoice.api_secret === undefined, 'ZERO SECRET LEAKAGE: api_secret is omitted');
    assert(res1.body.invoice.webhook_secret === undefined, 'ZERO SECRET LEAKAGE: webhook_secret is omitted');

    // ----------------------------------------------------
    // TEST 2: Public Invoice Expiration Lifecycle
    // ----------------------------------------------------
    const res2 = await request(`${baseUrl}/api/invoices/inv_expired_004/public`);
    assert(res2.status === 200, 'Expired invoice returns HTTP 200 with expired flag');
    assert(res2.body.invoice.is_expired === true, 'Invoice is marked is_expired: true');
    assert(res2.body.invoice.time_remaining_seconds === 0, 'Expired invoice has 0 seconds remaining');

    // ----------------------------------------------------
    // TEST 3: Hosted Checkout Direct Page (GET /pay/:invoiceId)
    // ----------------------------------------------------
    const res3 = await request(`${baseUrl}/pay/inv_pending_002`);
    assert(res3.status === 200, 'GET /pay/:invoiceId returns HTTP 200');
    assert(res3.headers['content-type'].includes('text/html'), 'Content-Type is text/html');
    assert(res3.body.includes('দেনা নেয়া') || res3.body.includes('DenaNeya'), 'HTML contains DenaNeya branding');

    // ----------------------------------------------------
    // TEST 4: Invoice Creation (POST /api/invoices)
    // ----------------------------------------------------
    console.log(`\n${CYAN}--- Section 2: Authenticated Invoice Management ---${RESET}`);
    const res4 = await request(`${baseUrl}/api/invoices`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'content-type': 'application/json'
      },
      body: {
        amount: 1750,
        customer_name: 'Mahmudul Hasan',
        customer_phone: '01898765432',
        customer_email: 'mahmud@example.com',
        redirect_url: 'https://deshicourse.com/order/success'
      }
    });
    assert(res4.status === 201, 'POST /api/invoices returns HTTP 201 Created');
    assert(res4.body.invoice.amount === 1750, 'Created invoice amount matches');
    assert(res4.body.invoice.status === 'PENDING', 'Created invoice initial status is PENDING');
    assert(res4.body.invoice.checkout_url.includes('/pay/'), 'Checkout URL returned');

    // ----------------------------------------------------
    // TEST 5: Invoice Listing (GET /api/invoices)
    // ----------------------------------------------------
    const res5 = await request(`${baseUrl}/api/invoices`, {
      headers: { authorization: `Bearer ${ownerToken}` }
    });
    assert(res5.status === 200, 'GET /api/invoices returns HTTP 200');
    assert(Array.isArray(res5.body.invoices), 'Invoices is an array');
    assert(res5.body.pagination.total >= 6, 'Pagination count reflects created invoices');

    // ----------------------------------------------------
    // TEST 6: Gateways Management (GET /api/gateways)
    // ----------------------------------------------------
    console.log(`\n${CYAN}--- Section 3: Gateways Management ---${RESET}`);
    const res6 = await request(`${baseUrl}/api/gateways`, {
      headers: { authorization: `Bearer ${ownerToken}` }
    });
    assert(res6.status === 200, 'GET /api/gateways returns HTTP 200');
    assert(res6.body.counts.all >= 6, 'Gateway counts returned');
    assert(res6.body.counts.mobile >= 3, 'Mobile category count accurate');

    // ----------------------------------------------------
    // TEST 7: Gateway Toggle (POST /api/gateways/:id/toggle)
    // ----------------------------------------------------
    const targetGw = res6.body.gateways[0];
    const initialStatus = targetGw.status;
    const res7 = await request(`${baseUrl}/api/gateways/${targetGw.id}/toggle`, {
      method: 'POST',
      headers: { authorization: `Bearer ${ownerToken}` }
    });
    assert(res7.status === 200, 'POST /api/gateways/:id/toggle returns HTTP 200');
    assert(res7.body.gateway.status !== initialStatus, 'Gateway status successfully toggled');

    // Toggle back
    await request(`${baseUrl}/api/gateways/${targetGw.id}/toggle`, {
      method: 'POST',
      headers: { authorization: `Bearer ${ownerToken}` }
    });

    // ----------------------------------------------------
    // TEST 8: Staff Management (GET /api/staff)
    // ----------------------------------------------------
    console.log(`\n${CYAN}--- Section 4: Staff RBAC Management ---${RESET}`);
    const res8 = await request(`${baseUrl}/api/staff`, {
      headers: { authorization: `Bearer ${ownerToken}` }
    });
    assert(res8.status === 200, 'GET /api/staff returns HTTP 200');
    assert(Array.isArray(res8.body.staff), 'Staff members returned');
    assert(res8.body.staff.some((s) => s.email === 'finance@deshicourse.com'), 'Staff user found');

    // ----------------------------------------------------
    // TEST 9: Staff Add (POST /api/staff - Owner only)
    // ----------------------------------------------------
    const res9Denied = await request(`${baseUrl}/api/staff`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${staffToken}`,
        'content-type': 'application/json'
      },
      body: { email: 'hacker@test.com', name: 'Hacker' }
    });
    assert(res9Denied.status === 403, 'Non-owner staff creation rejected with HTTP 403 Forbidden');

    const res9Success = await request(`${baseUrl}/api/staff`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'content-type': 'application/json'
      },
      body: {
        email: 'ops@deshicourse.com',
        name: 'Operations Manager',
        permissions: [{ module: 'invoices', can_read: true, can_create: true }]
      }
    });
    assert(res9Success.status === 201, 'Owner creates staff with HTTP 201 Created');
    assert(res9Success.body.staff.permissions.length === 10, 'All 10 modules assigned in RBAC matrix');

    // ----------------------------------------------------
    // TEST 10: Staff Revocation (DELETE /api/staff/:id)
    // ----------------------------------------------------
    const newStaffId = res9Success.body.staff.user_id;
    const res10 = await request(`${baseUrl}/api/staff/${newStaffId}`, {
      method: 'DELETE',
      headers: { authorization: `Bearer ${ownerToken}` }
    });
    assert(res10.status === 200, 'DELETE /api/staff/:id revokes staff access');

    // ----------------------------------------------------
    // TEST 11: Billing Balance (GET /api/billing/balance)
    // ----------------------------------------------------
    console.log(`\n${CYAN}--- Section 5: Billing & Credits ---${RESET}`);
    const res11 = await request(`${baseUrl}/api/billing/balance`, {
      headers: { authorization: `Bearer ${ownerToken}` }
    });
    assert(res11.status === 200, 'GET /api/billing/balance returns HTTP 200');
    assert(res11.body.balance.starter_credits === 50, 'Starter credits indicator is 50');
    assert(res11.body.balance.credits >= 50, 'Merchant credit balance returned');
    assert(Array.isArray(res11.body.packages), 'Top-up packages catalog returned');

    // ----------------------------------------------------
    // TEST 12: Top-up Credits (POST /api/billing/topup)
    // ----------------------------------------------------
    const initialCredits = res11.body.balance.credits;
    const res12 = await request(`${baseUrl}/api/billing/topup`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'content-type': 'application/json'
      },
      body: { package_id: 'pkg_growth_200' }
    });
    assert(res12.status === 200, 'POST /api/billing/topup returns HTTP 200');
    assert(res12.body.topup.credits_added === 200, '200 credits added');
    assert(res12.body.topup.new_balance === initialCredits + 200, 'New balance incremented atomically');

  } finally {
    server.close();
    await db.close();
  }

  console.log(`\n${CYAN}======================================================${RESET}`);
  console.log(`Results: ${GREEN}${passed} Passed${RESET}, ${failed > 0 ? RED : GREEN}${failed} Failed${RESET}`);
  console.log(`${CYAN}======================================================${RESET}\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
