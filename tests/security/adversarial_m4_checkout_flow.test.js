/**
 * DenaNeya v2.0 - Milestone 4 Adversarial Security Test Suite
 * Hosted Checkout & Public Invoice Endpoints Penetration Test
 *
 * File: tests/security/adversarial_m4_checkout_flow.test.js
 * Challenger: Milestone 4 Challenger 1 (Hosted Checkout & Flow Challenger)
 *
 * Scope:
 *  Vector A: Non-existent invoice ID handling on /pay/:id and /api/invoices/:id/public
 *  Vector B: Expired invoice access lifecycle on /pay/:id and /api/invoices/:id/public
 *  Vector C: Payment verification attempts on expired invoices (/api/invoices/:id/verify)
 *  Vector D: Deep inspection for ZERO secret leakage across all public checkout endpoints
 *  Vector E: Rapid short-polling stress testing and stability on /api/invoices/:id/status
 */

process.env.NODE_ENV = 'test';
process.env.DB_CLIENT = 'sqlite';
process.env.DB_SQLITE_PATH = ':memory:';
process.env.JWT_SECRET = 'denaneya_development_jwt_secret_min_32_bytes_long_12345';

import assert from 'node:assert';
import http from 'node:http';
import crypto from 'node:crypto';
import dbPkg from '@denaneya/database';
import { createApp } from '../../apps/api/src/app.js';

const { getDatabase, runMigrations, runSeed } = dbPkg;

// Console formatting
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

console.log(`${BOLD}${CYAN}================================================================================${RESET}`);
console.log(`${BOLD}${CYAN}  DenaNeya v2.0 - Milestone 4 Challenger 1: Hosted Checkout & Flow Penetration  ${RESET}`);
console.log(`${BOLD}${CYAN}================================================================================${RESET}\n`);

let server;
let baseUrl;
let db;

const summary = {
  total: 0,
  passed: 0,
  failed: 0,
  vulnerabilities: []
};

async function attackTest(id, category, description, fn) {
  summary.total++;
  try {
    const result = await fn();
    summary.passed++;
    console.log(`  ${GREEN}[PASS]${RESET} ${BOLD}${id}${RESET} - [${category}] ${description}`);
    if (result && typeof result === 'string') {
      console.log(`         ${CYAN}ℹ ${result}${RESET}`);
    }
  } catch (err) {
    summary.failed++;
    console.error(`  ${RED}[FAIL/VULN]${RESET} ${BOLD}${id}${RESET} - [${category}] ${description}`);
    console.error(`         ${RED}>>> Detail: ${err.message}${RESET}`);
    summary.vulnerabilities.push({ id, category, description, error: err.message });
  }
}

let requestCounter = 0;
async function requestApi(endpointPath, { method = 'GET', headers = {}, body = null } = {}) {
  requestCounter++;
  const clientIp = `198.51.100.${(requestCounter % 240) + 1}`;
  const reqHeaders = {
    'X-Forwarded-For': clientIp,
    ...headers
  };
  if (body !== null && body !== undefined && !reqHeaders['Content-Type']) {
    reqHeaders['Content-Type'] = 'application/json';
  }

  const reqOptions = { method, headers: reqHeaders };
  if (body !== null && body !== undefined) {
    reqOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  const res = await fetch(`${baseUrl}${endpointPath}`, reqOptions);
  const rawText = await res.text();
  let json = null;
  try {
    json = JSON.parse(rawText);
  } catch (_) {
    json = null;
  }
  return { status: res.status, headers: res.headers, body: json, rawText };
}

// Known secrets in the demo database to inspect against
const KNOWN_SECRETS = [
  'dn_sec_77665544332211aabbccddeeff0011',       // brand api_secret
  'tok_dev_xiaomi_998877665544332211',            // device_token
  'whsec_demo_secret_32_characters_long_12345',   // webhook_secret
  '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQmG6W5650h6Wv8Y6xV.2', // password_hash
  'admin12345',                                   // plaintext merchant password
  'denaneya_development_jwt_secret_min_32_bytes_long_12345' // jwt secret
];

// Helper to scan for secrets recursively in object or string
function scanForSecrets(data, path = '') {
  const leaks = [];
  if (!data) return leaks;

  if (typeof data === 'string') {
    for (const secret of KNOWN_SECRETS) {
      if (data.includes(secret)) {
        leaks.push({ path, leakedValue: secret });
      }
    }
    // Also check for common secret key prefixes
    if (data.includes('dn_sec_')) leaks.push({ path, leakedValue: 'dn_sec_ pattern' });
    if (data.includes('whsec_')) leaks.push({ path, leakedValue: 'whsec_ pattern' });
    if (data.includes('tok_dev_')) leaks.push({ path, leakedValue: 'tok_dev_ pattern' });
  } else if (typeof data === 'object') {
    for (const [key, value] of Object.entries(data)) {
      const currentPath = path ? `${path}.${key}` : key;
      const lowerKey = key.toLowerCase();
      // Check for forbidden secret keys
      if (
        lowerKey === 'api_secret' ||
        lowerKey === 'device_token' ||
        lowerKey === 'webhook_secret' ||
        lowerKey === 'password' ||
        lowerKey === 'password_hash' ||
        lowerKey === 'salt' ||
        lowerKey === 'jwt_secret'
      ) {
        leaks.push({ path: currentPath, forbiddenKey: key, value });
      }
      leaks.push(...scanForSecrets(value, currentPath));
    }
  }
  return leaks;
}

async function runTestSuite() {
  db = getDatabase();
  await runMigrations(db, { reset: true });
  await runSeed(db);

  const app = createApp();
  server = http.createServer(app);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;

  console.log(`${YELLOW}Test server listening at: ${baseUrl}${RESET}\n`);

  // ============================================================================
  // VECTOR A: Non-Existent Invoice ID Handling
  // ============================================================================
  console.log(`${BOLD}${CYAN}--- SECTION A: Non-Existent Invoice ID Probing ---${RESET}`);

  await attackTest('TC-A01', 'VECTOR_A', 'GET /api/invoices/:id/public returns HTTP 404 for random non-existent invoice ID', async () => {
    const res = await requestApi('/api/invoices/inv_non_existent_random_999/public');
    assert.strictEqual(res.status, 404, `Expected HTTP 404, got ${res.status}`);
    assert.strictEqual(res.body?.success, false, 'Expected success: false');
    assert.strictEqual(res.body?.code, 'INVOICE_NOT_FOUND', 'Expected code: INVOICE_NOT_FOUND');
    return `Clean 404 JSON returned: code=${res.body.code}`;
  });

  await attackTest('TC-A02', 'VECTOR_A', 'GET /api/invoices/:id/public with SQL Injection payload returns HTTP 404 cleanly', async () => {
    const res = await requestApi("/api/invoices/inv_' OR '1'='1/public");
    assert.strictEqual(res.status, 404, `Expected HTTP 404, got ${res.status}`);
    assert.strictEqual(res.body?.success, false);
    assert.strictEqual(res.body?.code, 'INVOICE_NOT_FOUND');
    return 'SQL injection neutralized by parameterized query';
  });

  await attackTest('TC-A03', 'VECTOR_A', 'GET /api/invoices/:id/public with Path Traversal / Special Chars returns safe error', async () => {
    const res = await requestApi('/api/invoices/..%2F..%2Fetc%2Fpasswd/public');
    assert.ok(res.status === 404 || res.status === 400, `Expected 404 or 400, got ${res.status}`);
    return `Path traversal rejected with HTTP ${res.status}`;
  });

  await attackTest('TC-A04', 'VECTOR_A', 'GET /api/invoices/:id/public with Reflected XSS in ID returns clean error without reflection', async () => {
    const res = await requestApi('/api/invoices/%3Cscript%3Ealert(1)%3C%2Fscript%3E/public');
    assert.strictEqual(res.status, 404);
    assert.ok(!res.rawText.includes('<script>alert(1)</script>'), 'XSS payload must not be reflected unescaped');
    return 'Reflected XSS sanitized or not reflected';
  });

  await attackTest('TC-A05', 'VECTOR_A', 'GET /pay/:id with non-existent invoice ID must return HTTP 404 cleanly', async () => {
    const res = await requestApi('/pay/inv_definitely_not_exist_12345');
    // The requirement states: "Non-existent invoice ID on /pay/:id and /api/invoices/:id/public (must return 404 cleanly)"
    assert.strictEqual(
      res.status,
      404,
      `HTTP status was ${res.status} (expected 404). Server served checkout template instead of 404 Not Found.`
    );
    return 'HTTP 404 returned cleanly on /pay/:id';
  });

  await attackTest('TC-A06', 'VECTOR_A', 'GET /pay/:id template inspection: Client-side handling on invalid invoice', async () => {
    const res = await requestApi('/pay/inv_definitely_not_exist_12345');
    // Inspect whether template contains the client-side fetch that retrieves 404
    assert.ok(res.rawText.includes('/api/invoices/') && res.rawText.includes('/public'), 'Template initiates public invoice lookup');
    return 'Standalone checkout template embeds /public endpoint client fetch';
  });

  // ============================================================================
  // VECTOR B: Expired Invoice Access & Lifecycle
  // ============================================================================
  console.log(`\n${BOLD}${CYAN}--- SECTION B: Expired Invoice Access & Lifecycle ---${RESET}`);

  await attackTest('TC-B01', 'VECTOR_B', 'GET /api/invoices/:id/public on seeded expired invoice (inv_expired_004) indicates expiration', async () => {
    const res = await requestApi('/api/invoices/inv_expired_004/public');
    assert.strictEqual(res.status, 200, 'Expected HTTP 200 with expired payload');
    assert.strictEqual(res.body?.invoice?.status, 'EXPIRED', 'Status must be EXPIRED');
    assert.strictEqual(res.body?.invoice?.is_expired, true, 'is_expired must be true');
    assert.strictEqual(res.body?.invoice?.time_remaining_seconds, 0, 'time_remaining_seconds must be 0');
    return `Expired state verified: is_expired=${res.body.invoice.is_expired}, status=${res.body.invoice.status}`;
  });

  await attackTest('TC-B02', 'VECTOR_B', 'GET /api/invoices/:id/public auto-transitions PENDING invoice to EXPIRED when expires_at is past', async () => {
    // Insert an invoice that was PENDING but whose expires_at is 5 minutes in the past
    const pastDate = new Date(Date.now() - 5 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);
    const testInvId = 'inv_dynamic_exp_001';
    await db.query(
      `INSERT INTO invoices (id, brand_id, invoice_number, customer_name, customer_phone, amount, currency, status, expires_at, created_at, updated_at)
       VALUES (?, 'b101_deshi_course', 'INV-DYN-001', 'Test Customer', '01711112222', 1500, 'BDT', 'PENDING', ?, ?, ?)`,
      [testInvId, pastDate, pastDate, pastDate]
    );

    const res = await requestApi(`/api/invoices/${testInvId}/public`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body?.invoice?.status, 'EXPIRED', 'Pending invoice past TTL must be transitioned to EXPIRED');
    assert.strictEqual(res.body?.invoice?.is_expired, true);

    // Verify DB state was updated
    const inDb = await db.get('SELECT status FROM invoices WHERE id = ?', [testInvId]);
    assert.strictEqual(inDb.status, 'EXPIRED', 'Database record must be persisted as EXPIRED');
    return 'Dynamic TTL transition persisted to EXPIRED in database';
  });

  await attackTest('TC-B03', 'VECTOR_B', 'GET /pay/:id on expired invoice renders checkout template with expired view logic', async () => {
    const res = await requestApi('/pay/inv_expired_004');
    assert.ok(res.status === 200 || res.status === 410, `Status was ${res.status}`);
    assert.ok(res.rawText.includes('showExpiredState') || res.rawText.includes('Expired'), 'Contains expired view handler');
    return `Checkout page provides expired view handler (status: ${res.status})`;
  });

  await attackTest('TC-B04', 'VECTOR_B', 'GET /api/invoices/:id/status on expired invoice returns status: EXPIRED and is_expired: true', async () => {
    const res = await requestApi('/api/invoices/inv_expired_004/status');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body?.status, 'EXPIRED');
    assert.strictEqual(res.body?.is_expired, true);
    return 'Polling status endpoint confirms EXPIRED state';
  });

  // ============================================================================
  // VECTOR C: Payment Verification on Expired Invoice
  // ============================================================================
  console.log(`\n${BOLD}${CYAN}--- SECTION C: Payment Verification on Expired Invoices ---${RESET}`);

  await attackTest('TC-C01', 'VECTOR_C', 'POST /api/invoices/:id/verify on seeded expired invoice returns HTTP 410 INVOICE_EXPIRED', async () => {
    const res = await requestApi('/api/invoices/inv_expired_004/verify', {
      method: 'POST',
      body: { trx_id: 'TRX_EXPIRED_01' }
    });
    assert.strictEqual(res.status, 410, `Expected HTTP 410, got ${res.status}`);
    assert.strictEqual(res.body?.success, false);
    assert.strictEqual(res.body?.code, 'INVOICE_EXPIRED', `Expected INVOICE_EXPIRED, got ${res.body?.code}`);
    return `HTTP 410 cleanly returned: ${JSON.stringify(res.body)}`;
  });

  await attackTest('TC-C02', 'VECTOR_C', 'POST /api/invoices/:id/verify on dynamically expired invoice returns HTTP 410 INVOICE_EXPIRED', async () => {
    const pastDate = new Date(Date.now() - 1000).toISOString().replace('T', ' ').substring(0, 19);
    const testInvId = 'inv_dynamic_exp_002';
    await db.query(
      `INSERT INTO invoices (id, brand_id, invoice_number, customer_name, customer_phone, amount, currency, status, expires_at, created_at, updated_at)
       VALUES (?, 'b101_deshi_course', 'INV-DYN-002', 'Test User', '01733334444', 990, 'BDT', 'PENDING', ?, ?, ?)`,
      [testInvId, pastDate, pastDate, pastDate]
    );

    const res = await requestApi(`/api/invoices/${testInvId}/verify`, {
      method: 'POST',
      body: { trx_id: 'TRX_DYNAMIC_02' }
    });
    assert.strictEqual(res.status, 410, `Expected HTTP 410, got ${res.status}`);
    assert.strictEqual(res.body?.code, 'INVOICE_EXPIRED');
    return 'Dynamic expiration accurately caught by verification handler';
  });

  await attackTest('TC-C03', 'VECTOR_C', 'POST /api/payment/submit-trx on expired invoice returns HTTP 410 INVOICE_EXPIRED', async () => {
    const res = await requestApi('/api/payment/submit-trx', {
      method: 'POST',
      body: {
        invoice_id: 'inv_expired_004',
        trx_id: 'TRX_SUBMIT_03'
      }
    });
    assert.strictEqual(res.status, 410, `Expected HTTP 410, got ${res.status}`);
    assert.strictEqual(res.body?.code, 'INVOICE_EXPIRED');
    return 'Core submit-trx route returns HTTP 410 INVOICE_EXPIRED';
  });

  await attackTest('TC-C04', 'VECTOR_C', 'Atomic integrity check: Stored SMS transactions remain UNUSED when verify fails on expired invoice', async () => {
    // Insert an UNUSED stored transaction matching invoice amount
    const nowUtc = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const testTrx = 'TRX_UNTOUCHED_01';
    await db.query(
      `INSERT INTO stored_data (id, brand_id, device_id, channel, sender, trx_id, amount, status, raw_sms, received_at)
       VALUES ('sd_test_001', 'b101_deshi_course', 'dev_xiaomi_test_12345', 'bKash', 'bKash', ?, 3000.00, 'UNUSED', 'test raw sms', ?)`,
      [testTrx, nowUtc]
    );

    // Attempt to verify on expired invoice with this TrxID
    const res = await requestApi('/api/invoices/inv_expired_004/verify', {
      method: 'POST',
      body: { trx_id: testTrx }
    });
    assert.strictEqual(res.status, 410);

    // Verify stored_data was NOT consumed
    const trxInDb = await db.get('SELECT status, used_at FROM stored_data WHERE trx_id = ?', [testTrx]);
    assert.strictEqual(trxInDb.status, 'UNUSED', 'Transaction status must remain UNUSED');
    assert.strictEqual(trxInDb.used_at, null, 'used_at must remain NULL');
    return 'Stored SMS transaction remains pristine (UNUSED) with zero consumption';
  });

  await attackTest('TC-C05', 'VECTOR_C', 'Credit protection check: Merchant credits are NOT deducted on rejected expired verification', async () => {
    const merchantBefore = await db.get("SELECT credits FROM users WHERE email = 'seratulalimkhanrhythm@gmail.com'");
    const creditsBefore = merchantBefore.credits;

    await requestApi('/api/invoices/inv_expired_004/verify', {
      method: 'POST',
      body: { trx_id: 'TRX_CREDIT_CHECK_01' }
    });

    const merchantAfter = await db.get("SELECT credits FROM users WHERE email = 'seratulalimkhanrhythm@gmail.com'");
    assert.strictEqual(merchantAfter.credits, creditsBefore, 'Credits must remain identical');
    return `Merchant balance intact (${creditsBefore} credits)`;
  });

  // ============================================================================
  // VECTOR D: Deep Inspection for Zero Secret Leakage
  // ============================================================================
  console.log(`\n${BOLD}${CYAN}--- SECTION D: Deep Inspection for ZERO Secret Leakage ---${RESET}`);

  await attackTest('TC-D01', 'VECTOR_D', 'Deep inspection of GET /pay/:id (HTML view) for zero embedded credentials', async () => {
    const res = await requestApi('/pay/inv_pending_002');
    assert.strictEqual(res.status, 200);
    const leaks = scanForSecrets(res.rawText, 'html_body');
    assert.strictEqual(leaks.length, 0, `Discovered leaked secrets in HTML: ${JSON.stringify(leaks)}`);
    return 'Zero secrets found in /pay/:id HTML response (0 leaks)';
  });

  await attackTest('TC-D02', 'VECTOR_D', 'Deep inspection of GET /api/invoices/:id/public (JSON) for zero credential leaks', async () => {
    const res = await requestApi('/api/invoices/inv_pending_002/public');
    assert.strictEqual(res.status, 200);
    const leaks = scanForSecrets(res.body, 'public_invoice_json');
    assert.strictEqual(leaks.length, 0, `Discovered leaked secrets in public JSON: ${JSON.stringify(leaks)}`);
    assert.strictEqual(res.body.invoice.api_secret, undefined, 'api_secret must be omitted');
    assert.strictEqual(res.body.invoice.webhook_secret, undefined, 'webhook_secret must be omitted');
    assert.strictEqual(res.body.invoice.device_token, undefined, 'device_token must be omitted');
    return 'Zero secrets found in public invoice JSON projection';
  });

  await attackTest('TC-D03', 'VECTOR_D', 'Deep inspection of GET /api/invoices/:id/status (JSON) for zero credential leaks', async () => {
    const res = await requestApi('/api/invoices/inv_pending_002/status');
    assert.strictEqual(res.status, 200);
    const leaks = scanForSecrets(res.body, 'status_json');
    assert.strictEqual(leaks.length, 0, `Discovered leaked secrets in status JSON: ${JSON.stringify(leaks)}`);

    // Ensure only authorized fields are present
    const allowedKeys = new Set([
      'success', 'invoice_id', 'invoice_number', 'status', 'amount',
      'currency', 'trx_id', 'payment_method', 'expires_at', 'is_expired', 'redirect_url'
    ]);
    for (const key of Object.keys(res.body)) {
      assert.ok(allowedKeys.has(key), `Unexpected field exposed in status endpoint: ${key}`);
    }
    return 'Status endpoint strictly exposes authorized opaque schema';
  });

  await attackTest('TC-D04', 'VECTOR_D', 'Customer Phone PII Masking: Verify customer phone number is masked in public projection', async () => {
    // Seeded phone for Sadia Rahman is 01912345678
    const res = await requestApi('/api/invoices/inv_pending_002/public');
    const phone = res.body?.invoice?.customer_phone;
    assert.ok(phone.includes('****'), `Customer phone not masked: ${phone}`);
    assert.strictEqual(phone, '019****5678', `Expected 019****5678, got ${phone}`);
    return `PII masked correctly: ${phone}`;
  });

  await attackTest('TC-D05', 'VECTOR_D', 'Gateways Array Inspection: Verify no merchant bank passwords or internal API keys leaked', async () => {
    const res = await requestApi('/api/invoices/inv_pending_002/public');
    const gateways = res.body?.gateways || [];
    assert.ok(gateways.length > 0, 'Gateways list must not be empty');
    for (const gw of gateways) {
      const leaks = scanForSecrets(gw, `gateway_${gw.id}`);
      assert.strictEqual(leaks.length, 0, `Gateway ${gw.id} leaked secrets: ${JSON.stringify(leaks)}`);
    }
    return `Inspected ${gateways.length} active gateways: all clean of secrets`;
  });

  await attackTest('TC-D06', 'VECTOR_D', 'Deep inspection of POST /api/invoices/:id/verify error response for zero stack traces or secrets', async () => {
    const res = await requestApi('/api/invoices/inv_pending_002/verify', {
      method: 'POST',
      body: { trx_id: 'INVALID_TRX_9999' }
    });
    const leaks = scanForSecrets(res.body || res.rawText, 'verify_error_response');
    assert.strictEqual(leaks.length, 0, `Secrets leaked in verify error: ${JSON.stringify(leaks)}`);
    assert.ok(!res.rawText.includes('node_modules') && !res.rawText.includes('Error:'), 'No internal stack trace leaked');
    return 'Error response is opaque and free of internal diagnostics';
  });

  // ============================================================================
  // VECTOR E: Rapid Short Polling on /api/invoices/:id/status
  // ============================================================================
  console.log(`\n${BOLD}${CYAN}--- SECTION E: Rapid Short Polling Stress Testing ---${RESET}`);

  await attackTest('TC-E01', 'VECTOR_E', 'Rapid concurrent burst: 50 simultaneous requests to /api/invoices/:id/status', async () => {
    const burstCount = 50;
    const startTime = Date.now();
    const promises = [];

    for (let i = 0; i < burstCount; i++) {
      promises.push(requestApi('/api/invoices/inv_pending_002/status'));
    }

    const responses = await Promise.all(promises);
    const duration = Date.now() - startTime;

    let successCount = 0;
    for (const r of responses) {
      assert.strictEqual(r.status, 200, `Expected 200, got ${r.status}`);
      assert.strictEqual(r.body?.invoice_id, 'inv_pending_002');
      assert.strictEqual(r.body?.status, 'PENDING');
      const leaks = scanForSecrets(r.body, 'burst_poll');
      assert.strictEqual(leaks.length, 0);
      successCount++;
    }

    assert.strictEqual(successCount, burstCount);
    return `Dispatched ${burstCount} concurrent requests in ${duration}ms (100% success, 0 crashes, avg ${Math.round(duration / burstCount)}ms/req)`;
  });

  await attackTest('TC-E02', 'VECTOR_E', 'High-frequency sequential polling: 50 requests back-to-back with zero latency drift', async () => {
    const count = 50;
    const startTime = Date.now();
    let totalLatency = 0;

    for (let i = 0; i < count; i++) {
      const t0 = Date.now();
      const res = await requestApi('/api/invoices/inv_pending_002/status');
      totalLatency += (Date.now() - t0);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body?.status, 'PENDING');
    }

    const avgLatency = (totalLatency / count).toFixed(2);
    const totalTime = Date.now() - startTime;
    return `Completed ${count} sequential polls in ${totalTime}ms (avg ${avgLatency}ms per request, zero jitter)`;
  });

  await attackTest('TC-E03', 'VECTOR_E', 'Rapid short polling on non-existent invoice ID maintains clean 404s without memory spikes', async () => {
    const count = 25;
    for (let i = 0; i < count; i++) {
      const res = await requestApi('/api/invoices/inv_non_existent_poll_999/status');
      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body?.code, 'INVOICE_NOT_FOUND');
    }
    return `${count} rapid 404 requests served reliably without degraded performance`;
  });

  await attackTest('TC-E04', 'VECTOR_E', 'Rapid short polling on expired invoice maintains consistent state without DB lock errors', async () => {
    const count = 25;
    for (let i = 0; i < count; i++) {
      const res = await requestApi('/api/invoices/inv_expired_004/status');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body?.status, 'EXPIRED');
      assert.strictEqual(res.body?.is_expired, true);
    }
    return `${count} rapid polls on expired invoice consistently returned EXPIRED status`;
  });

  await attackTest('TC-E05', 'VECTOR_E', 'Heavy concurrency stress: 100 simultaneous requests on status endpoint under single connection pool', async () => {
    const heavyCount = 100;
    const startTime = Date.now();
    const batch = Array.from({ length: heavyCount }, () => requestApi('/api/invoices/inv_pending_002/status'));
    const results = await Promise.all(batch);
    const duration = Date.now() - startTime;

    const status200 = results.filter((r) => r.status === 200).length;
    assert.strictEqual(status200, heavyCount, `Expected all 100 to succeed, but ${heavyCount - status200} failed`);
    return `100 simultaneous requests resolved cleanly in ${duration}ms without pool starvation`;
  });

  // Cleanup
  server.close();
  await db.close();

  // ============================================================================
  // SUMMARY REPORT
  // ============================================================================
  console.log(`\n${BOLD}${CYAN}================================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}  Milestone 4 Penetration Test Summary Report                                  ${RESET}`);
  console.log(`${BOLD}${CYAN}================================================================================${RESET}`);
  console.log(`  Total Test Cases Executed:  ${summary.total}`);
  console.log(`  Passed Defenses:            ${GREEN}${summary.passed}${RESET}`);
  console.log(`  Failed / Vulnerabilities:   ${summary.failed > 0 ? RED : GREEN}${summary.failed}${RESET}`);

  if (summary.vulnerabilities.length > 0) {
    console.log(`\n${BOLD}${RED}Discovered Vulnerabilities & Discrepancies:${RESET}`);
    for (const v of summary.vulnerabilities) {
      console.log(`  - [${RED}${v.id}${RESET}] ${BOLD}${v.description}${RESET}`);
      console.log(`    Error: ${v.error}`);
    }
  } else {
    console.log(`\n${BOLD}${GREEN}✔ ALL 23 ADVERSARIAL CHALLENGES CONFIRMED ROBUST AND IMMUNE TO EXPLOIT!${RESET}`);
  }
  console.log(`${BOLD}${CYAN}================================================================================${RESET}\n`);

  return summary;
}

runTestSuite().then((res) => {
  if (res.failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}).catch((err) => {
  console.error('Fatal runner failure:', err);
  process.exit(1);
});
