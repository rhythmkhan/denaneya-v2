/**
 * DenaNeya v2.0 - Tier 4 Real-World Workload Test Suite
 * File: tests/e2e/tier4_realworld_workloads.test.js
 * Architect: Milestone 5 Explorer 3 (E2E Checkout, Webhook & Master Runner Architect)
 *
 * Implements full merchant-customer payment journeys across 5 real-world scenarios:
 * - Scenario 1: E-Commerce Store Checkout (bKash USSD, real SMS ingestion, TrxID matching, webhook dispatch & credit deduction)
 * - Scenario 2: SaaS Subscription Recurring Payment (Dynamic invoice, Nagad payment, 2-step S2S API verify and confirm)
 * - Scenario 3: Bank Transfer Payment Flow (Invoice generation, City Bank gateway selection, reference submission, verified)
 * - Scenario 4: Expired Checkout Recovery (15-min TTL auto-expiry, HTTP 410 rejection, unused TrxID preserved, recovery via new invoice)
 * - Scenario 5: Multi-Tenant Concurrent Checkouts (Brand A and Brand B parallel checkouts with TrxID collision isolation)
 */

process.env.NODE_ENV = 'test';
process.env.DB_CLIENT = 'sqlite';
process.env.DB_SQLITE_PATH = ':memory:';
process.env.JWT_SECRET = 'denaneya_development_jwt_secret_min_32_bytes_long_12345';

import assert from 'node:assert';
import http from 'node:http';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Universal dynamic import helper for portability between .agents/ and denaneya_v2/tests/e2e/
let dbPkg;
try {
  dbPkg = (await import('@denaneya/database')).default || await import('@denaneya/database');
} catch (_) {
  dbPkg = (await import('../../packages/database/src/index.js')).default || await import('../../packages/database/src/index.js');
}

let sharedPkg;
try {
  sharedPkg = await import('@denaneya/shared');
} catch (_) {
  sharedPkg = await import('../../packages/shared/dist/index.js');
}

let appModule;
try {
  appModule = await import('../../apps/api/src/app.js');
} catch (_) {
  appModule = await import('../apps/api/src/app.js');
}

let tokenModule;
try {
  tokenModule = await import('../../apps/api/src/utils/token.js');
} catch (_) {
  tokenModule = await import('../apps/api/src/utils/token.js');
}

let webhookServiceModule;
try {
  webhookServiceModule = await import('../../apps/api/src/services/webhookService.js');
} catch (_) {
  webhookServiceModule = await import('../apps/api/src/services/webhookService.js');
}

const { getDatabase, runMigrations, runSeed } = dbPkg;
const { verifyWebhookSignature, canonicalizeJson } = sharedPkg;
const { createApp } = appModule;
const { generateToken } = tokenModule;
const { dispatchSingleWebhook } = webhookServiceModule;

// ANSI Colors for Console
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

console.log(`${BOLD}${CYAN}================================================================================${RESET}`);
console.log(`${BOLD}${CYAN}  DenaNeya v2.0 - Tier 4 Real-World Workloads & Complete Merchant Journeys       ${RESET}`);
console.log(`${BOLD}${CYAN}================================================================================${RESET}\n`);

let apiServer;
let apiBaseUrl;
let mockWebhookServer;
let mockWebhookBaseUrl;
let webhookPort;
let db;

// In-memory store for captured merchant webhooks
const capturedWebhooks = new Map(); // brandId -> array of { headers, body, rawText }

const summary = {
  total: 0,
  passed: 0,
  failed: 0,
  scenarios: []
};

async function runStep(scenarioId, stepName, fn) {
  summary.total++;
  try {
    const res = await fn();
    summary.passed++;
    console.log(`  ${GREEN}[PASS]${RESET} ${BOLD}${scenarioId}${RESET} - ${stepName}`);
    if (res && typeof res === 'string') {
      console.log(`         ${CYAN}ℹ ${res}${RESET}`);
    }
  } catch (err) {
    summary.failed++;
    console.error(`  ${RED}[FAIL]${RESET} ${BOLD}${scenarioId}${RESET} - ${stepName}`);
    console.error(`         ${RED}>>> Error: ${err.message}${RESET}`);
    throw err;
  }
}

// HTTP request helper with client IP spoofing avoidance and automatic JSON parsing
let reqCounter = 0;
async function request(endpointPath, { method = 'GET', headers = {}, body = null } = {}) {
  reqCounter++;
  const clientIp = `198.51.100.${(reqCounter % 200) + 1}`;
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

  const res = await fetch(`${apiBaseUrl}${endpointPath}`, reqOptions);
  const rawText = await res.text();
  let json = null;
  try {
    json = JSON.parse(rawText);
  } catch (_) {
    json = null;
  }
  return { status: res.status, headers: res.headers, body: json, rawText };
}

// Setup and Teardown
async function setupEnvironment() {
  console.log('[Setup] Initializing in-memory SQLite database singleton...');
  db = getDatabase();
  await runMigrations(db, { reset: true });
  await runSeed(db);

  // 1. Start Mock Merchant Webhook Server
  mockWebhookServer = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      const urlParts = req.url.split('/').filter(Boolean);
      const brandId = urlParts[urlParts.length - 1] || 'default';
      let parsed = null;
      try {
        parsed = JSON.parse(raw);
      } catch (_) {}

      if (!capturedWebhooks.has(brandId)) {
        capturedWebhooks.set(brandId, []);
      }
      capturedWebhooks.get(brandId).push({
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: parsed,
        rawText: raw,
        receivedAt: Date.now()
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ received: true }));
    });
  });

  await new Promise((resolve) => mockWebhookServer.listen(0, '127.0.0.1', resolve));
  webhookPort = mockWebhookServer.address().port;
  mockWebhookBaseUrl = `http://127.0.0.1:${webhookPort}`;
  console.log(`[Setup] Mock Merchant Webhook Receiver live at ${mockWebhookBaseUrl}`);

  // 2. Start Main DenaNeya Express API
  const app = createApp();
  apiServer = http.createServer(app);
  await new Promise((resolve) => apiServer.listen(0, '127.0.0.1', resolve));
  const apiPort = apiServer.address().port;
  apiBaseUrl = `http://127.0.0.1:${apiPort}`;
  console.log(`[Setup] DenaNeya v2.0 API Server live at ${apiBaseUrl}\n`);
}

async function teardownEnvironment() {
  console.log('\n[Teardown] Stopping servers and releasing database...');
  if (apiServer) await new Promise((r) => apiServer.close(r));
  if (mockWebhookServer) await new Promise((r) => mockWebhookServer.close(r));
  if (db && typeof db.close === 'function') await db.close();
  console.log('[Teardown] Cleanup complete.');
}

// Helper to wait for webhook delivery
async function waitForWebhook(brandId, timeoutMs = 2500) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const list = capturedWebhooks.get(brandId);
    if (list && list.length > 0) {
      return list[list.length - 1];
    }
    await new Promise((r) => setTimeout(r, 50));
  }
  return null;
}

// ==============================================================================
// TEST SCENARIOS
// ==============================================================================

export async function runTier4Suite() {
  await setupEnvironment();

  try {
    // Fetch Seed Merchant & Brand Credentials
    const demoUser = await db.get("SELECT * FROM users WHERE email = 'seratulalimkhanrhythm@gmail.com'");
    const demoBrand = await db.get("SELECT * FROM brands WHERE user_id = ?", [demoUser.id]);
    const demoDevice = await db.get("SELECT * FROM devices WHERE brand_id = ?", [demoBrand.id]);
    const merchantToken = generateToken({ id: demoUser.id, email: demoUser.email, role: demoUser.role });

    // Configure Brand Webhook URL to point to our mock webhook listener
    const merchantWebhookUrl = `${mockWebhookBaseUrl}/webhook/${demoBrand.id}`;
    await db.query("UPDATE brands SET webhook_url = ? WHERE id = ?", [merchantWebhookUrl, demoBrand.id]);
    demoBrand.webhook_url = merchantWebhookUrl;

    // --------------------------------------------------------------------------
    // SCENARIO 1: E-Commerce Store Checkout (Complete Customer-Merchant Flow)
    // --------------------------------------------------------------------------
    console.log(`${BOLD}${YELLOW}--- SCENARIO 1: E-Commerce Store Checkout (bKash USSD & Webhook) ---${RESET}`);
    let sc1Invoice = null;
    let sc1InitialCredits = demoUser.credits; // expected: 50
    const sc1TrxId = 'BKASH9A8B7C';

    await runStep('SCENARIO-1', '1.1 Merchant generates an e-commerce invoice (POST /api/invoices)', async () => {
      const res = await request('/api/invoices', {
        method: 'POST',
        headers: { Authorization: `Bearer ${merchantToken}` },
        body: {
          amount: 1500,
          currency: 'BDT',
          customer_name: 'Karim Rahman',
          customer_phone: '01712345678',
          customer_email: 'karim@example.com',
          redirect_url: 'https://deshicourse.com/checkout/success',
          cancel_url: 'https://deshicourse.com/checkout/cancel',
          metadata: { order_id: 'ORD-ECOM-9901', items: ['Next.js Fullstack Course'] }
        }
      });
      assert.strictEqual(res.status, 201, 'HTTP 201 Created');
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.invoice.id, 'Invoice ID generated');
      assert.strictEqual(res.body.invoice.status, 'PENDING');
      assert.strictEqual(res.body.invoice.amount, 1500);
      sc1Invoice = res.body.invoice;
      return `Created invoice ${sc1Invoice.id} for ৳1,500 with 15-min TTL`;
    });

    await runStep('SCENARIO-1', '1.2 Customer loads hosted checkout (/pay/:id and /api/invoices/:id/public)', async () => {
      const pageRes = await request(`/pay/${sc1Invoice.id}`);
      assert.strictEqual(pageRes.status, 200, 'HTML page served with HTTP 200');
      assert.ok(pageRes.headers.get('content-type')?.includes('text/html'), 'Content-Type is text/html');

      const publicRes = await request(`/api/invoices/${sc1Invoice.id}/public`);
      assert.strictEqual(publicRes.status, 200, 'Public API endpoint returns HTTP 200');
      assert.strictEqual(publicRes.body.success, true);
      assert.strictEqual(publicRes.body.invoice.amount, 1500);
      assert.strictEqual(publicRes.body.invoice.customer_phone, '017****5678', 'Customer phone PII masked');
      assert.strictEqual(publicRes.body.invoice.api_secret, undefined, 'Zero secret leakage (api_secret)');
      assert.strictEqual(publicRes.body.invoice.webhook_secret, undefined, 'Zero secret leakage (webhook_secret)');

      const bkashGw = publicRes.body.gateways.find((g) => g.channel_name?.toLowerCase() === 'bkash');
      assert.ok(bkashGw, 'bKash channel present in active gateways catalog');
      assert.strictEqual(bkashGw.account_number, '01813896400', 'Merchant bKash number displayed');
      assert.strictEqual(bkashGw.ussd_code, '*247#', 'USSD guide code available');
      return `Checkout page verified: customer phone masked, zero secrets exposed, bKash USSD ready`;
    });

    await runStep('SCENARIO-1', '1.3 Customer sends payment via USSD & telco SMS ingested by paired device', async () => {
      const smsPayload = {
        sender: 'bKash',
        message: 'You have received Tk 1,500.00 from 01712345678. Ref ORD-ECOM-9901. Fee Tk 0.00. Balance Tk 45,500.00. TrxID BKASH9A8B7C at 16/09/2026 12:30',
        sim_slot: 1,
        timestamp: new Date().toISOString()
      };

      const syncRes = await request('/api/device/sync-sms', {
        method: 'POST',
        headers: { 'device-api-key': demoDevice.device_token },
        body: smsPayload
      });
      assert.ok(syncRes.status === 200 || syncRes.status === 201, 'SMS sync succeeded with HTTP 200/201');
      assert.strictEqual(syncRes.body.success, true);
      assert.strictEqual(syncRes.body.ingested, 1, 'Exactly 1 SMS ingested');

      const stored = await db.get(
        "SELECT * FROM stored_data WHERE brand_id = ? AND UPPER(trx_id) = ?",
        [demoBrand.id, sc1TrxId]
      );
      assert.ok(stored, 'Record written to stored_data table');
      assert.strictEqual(stored.status, 'UNUSED', 'Initial transaction status is UNUSED');
      assert.strictEqual(Number(stored.amount), 1500, 'Ingested amount matches 1500');
      return `Real telco SMS ingested from BTRC sender 'bKash': TrxID=${sc1TrxId}, Status=UNUSED`;
    });

    await runStep('SCENARIO-1', '1.4 Customer enters TrxID on hosted checkout (POST /api/payment/submit-trx)', async () => {
      const submitRes = await request('/api/payment/submit-trx', {
        method: 'POST',
        body: {
          invoice_id: sc1Invoice.id,
          trx_id: sc1TrxId
        }
      });
      assert.strictEqual(submitRes.status, 200, 'Payment submitted successfully (HTTP 200)');
      assert.strictEqual(submitRes.body.success, true);
      assert.strictEqual(submitRes.body.status, 'PAID');
      assert.strictEqual(submitRes.body.trx_id, sc1TrxId);
      assert.strictEqual(submitRes.body.payment_method, 'bKash');

      // Verify database state transitions
      const updatedInv = await db.get("SELECT * FROM invoices WHERE id = ?", [sc1Invoice.id]);
      assert.strictEqual(updatedInv.status, 'PAID', 'Invoice status transitioned to PAID');
      assert.strictEqual(updatedInv.trx_id, sc1TrxId);

      const consumedTrx = await db.get(
        "SELECT * FROM stored_data WHERE brand_id = ? AND UPPER(trx_id) = ?",
        [demoBrand.id, sc1TrxId]
      );
      assert.strictEqual(consumedTrx.status, 'USED', 'Transaction status atomically transitioned to USED');
      assert.ok(consumedTrx.used_at, 'used_at timestamp recorded');
      return `Invoice ${sc1Invoice.id} transitioned PENDING -> PAID; Trx marked USED via atomic CAS`;
    });

    await runStep('SCENARIO-1', '1.5 Merchant credit balance decremented by 1', async () => {
      const updatedUser = await db.get("SELECT credits FROM users WHERE id = ?", [demoUser.id]);
      assert.strictEqual(updatedUser.credits, sc1InitialCredits - 1, 'Credit balance decremented by exactly 1');
      return `Merchant credit decremented atomically: ${sc1InitialCredits} -> ${updatedUser.credits}`;
    });

    await runStep('SCENARIO-1', '1.6 Merchant webhook dispatched & received with valid HMAC-SHA256 signature', async () => {
      // Find pending webhook log entry
      const whLog = await db.get(
        "SELECT * FROM webhook_logs WHERE brand_id = ? AND invoice_id = ? ORDER BY created_at DESC LIMIT 1",
        [demoBrand.id, sc1Invoice.id]
      );
      assert.ok(whLog, 'Webhook log enqueued in database');

      // Reset status to PENDING so test dispatch with allowHttpForTesting can execute
      await db.query("UPDATE webhook_logs SET status = 'PENDING' WHERE id = ?", [whLog.id]);

      // Dispatch webhook using allowHttpForTesting for the mock listener
      const dispatchResult = await dispatchSingleWebhook(whLog.id, { allowHttpForTesting: true });
      assert.strictEqual(dispatchResult.success, true, 'Webhook dispatch returned success: true');

      const webhookEvent = await waitForWebhook(demoBrand.id);
      assert.ok(webhookEvent, 'Mock merchant receiver captured webhook event');

      // Verify HMAC-SHA256 signature
      const sigHeader = webhookEvent.headers['x-denaneya-signature'];
      assert.ok(sigHeader, 'X-DenaNeya-Signature header present');

      const verifyResult = verifyWebhookSignature(
        webhookEvent.body,
        sigHeader,
        demoBrand.webhook_secret
      );
      assert.strictEqual(verifyResult.valid, true, 'HMAC-SHA256 cryptographic verification passed');
      assert.strictEqual(webhookEvent.body.event, 'invoice.completed');
      assert.strictEqual(webhookEvent.body.amount, 1500);
      assert.strictEqual(webhookEvent.body.trx_id, sc1TrxId);
      return `Webhook delivered with verified HMAC-SHA256 signature: t=${verifyResult.timestamp}, n=${verifyResult.nonce}`;
    });

    await runStep('SCENARIO-1', '1.7 Customer short-polling verifies completion & redirect URL (GET /api/payment/status/:id)', async () => {
      const pollRes = await request(`/api/payment/status/${sc1Invoice.id}`);
      assert.strictEqual(pollRes.status, 200);
      assert.strictEqual(pollRes.body.status, 'PAID');
      assert.strictEqual(pollRes.body.trx_id, sc1TrxId);
      assert.strictEqual(pollRes.body.redirect_url, 'https://deshicourse.com/checkout/success');
      return `Short-polling confirmed PAID status with redirect URL: ${pollRes.body.redirect_url}`;
    });

    // --------------------------------------------------------------------------
    // SCENARIO 2: SaaS Subscription Recurring Payment (2-Step S2S API)
    // --------------------------------------------------------------------------
    console.log(`\n${BOLD}${YELLOW}--- SCENARIO 2: SaaS Subscription Recurring Payment (Nagad & 2-Step S2S) ---${RESET}`);
    let sc2Invoice = null;
    const sc2TrxId = 'NAGAD8899AA';
    let sc2StoredTrxId = null;

    await runStep('SCENARIO-2', '2.1 SaaS merchant creates dynamic subscription invoice', async () => {
      const res = await request('/api/invoices', {
        method: 'POST',
        headers: { Authorization: `Bearer ${merchantToken}` },
        body: {
          amount: 3500,
          currency: 'BDT',
          customer_name: 'Tanvir Hossain',
          customer_phone: '01811223344',
          customer_email: 'tanvir@saas.com',
          metadata: { subscription_id: 'SUB-PRO-2026', plan: 'Professional Annual' }
        }
      });
      assert.strictEqual(res.status, 201);
      sc2Invoice = res.body.invoice;
      return `Created dynamic subscription invoice ${sc2Invoice.id} for ৳3,500`;
    });

    await runStep('SCENARIO-2', '2.2 Customer pays via Nagad & official telco SMS is ingested', async () => {
      const syncRes = await request('/api/device/sync-sms', {
        method: 'POST',
        headers: { 'device-api-key': demoDevice.device_token },
        body: {
          sender: 'Nagad',
          message: 'Amount: Tk 3,500.00 from 01811223344. Ref SUB-PRO-2026. TxnID: NAGAD8899AA at 16/09/2026 14:00. Balance: Tk 18,200.00',
          sim_slot: 1
        }
      });
      assert.ok(syncRes.status === 200 || syncRes.status === 201, 'SMS sync succeeded with HTTP 200/201');
      assert.strictEqual(syncRes.body.ingested, 1);

      const stored = await db.get(
        "SELECT * FROM stored_data WHERE brand_id = ? AND UPPER(trx_id) = ?",
        [demoBrand.id, sc2TrxId]
      );
      assert.ok(stored);
      assert.strictEqual(stored.status, 'UNUSED');
      sc2StoredTrxId = stored.id;
      return `Nagad transaction ${sc2TrxId} ingested in UNUSED state (ID=${sc2StoredTrxId})`;
    });

    await runStep('SCENARIO-2', '2.3 S2S Step 1: Merchant calls POST /v1/trx/verify (1 credit deducted, holds UNUSED)', async () => {
      const userBefore = await db.get("SELECT credits FROM users WHERE id = ?", [demoUser.id]);

      const verifyRes = await request('/v1/trx/verify', {
        method: 'POST',
        headers: {
          'x-api-key': demoBrand.api_key,
          'x-api-secret': demoBrand.api_secret
        },
        body: {
          trx_id: sc2TrxId,
          amount: 3500
        }
      });

      assert.strictEqual(verifyRes.status, 200, 'S2S verify returns HTTP 200');
      assert.strictEqual(verifyRes.body.success, true);
      assert.strictEqual(verifyRes.body.data.status, 'UNUSED', 'Transaction remains UNUSED in hold state');
      assert.strictEqual(verifyRes.body.data.amount, 3500);
      assert.ok(verifyRes.body.data.sender, 'Sender populated');

      // Verify 1 credit deducted on verify
      const userAfter = await db.get("SELECT credits FROM users WHERE id = ?", [demoUser.id]);
      assert.strictEqual(userAfter.credits, userBefore.credits - 1, '1 credit deducted on verify');

      // Check DB: stored_data status must STILL be UNUSED
      const storedCheck = await db.get("SELECT status FROM stored_data WHERE id = ?", [sc2StoredTrxId]);
      assert.strictEqual(storedCheck.status, 'UNUSED', 'DB status remains UNUSED until confirm');
      return `Step 1 verified: transaction held in UNUSED status, 1 credit deducted (balance: ${userAfter.credits})`;
    });

    await runStep('SCENARIO-2', '2.4 S2S Step 2: Merchant confirms subscription activation via POST /v1/trx/confirm', async () => {
      const confirmRes = await request('/v1/trx/confirm', {
        method: 'POST',
        headers: {
          'x-api-key': demoBrand.api_key,
          'x-api-secret': demoBrand.api_secret
        },
        body: {
          id: sc2StoredTrxId,
          trx_id: sc2TrxId
        }
      });

      assert.strictEqual(confirmRes.status, 200, 'S2S confirm returns HTTP 200');
      assert.strictEqual(confirmRes.body.success, true);
      assert.strictEqual(confirmRes.body.data.status, 'USED', 'Status transitioned to USED');

      // Check DB: stored_data status is now USED
      const storedCheck = await db.get("SELECT status, used_at FROM stored_data WHERE id = ?", [sc2StoredTrxId]);
      assert.strictEqual(storedCheck.status, 'USED');
      assert.ok(storedCheck.used_at, 'used_at timestamp recorded');
      return `Step 2 confirmed: transaction committed to USED via atomic CAS`;
    });

    await runStep('SCENARIO-2', '2.5 Anti-Replay Defense: Re-verifying or re-confirming consumed TrxID is rejected', async () => {
      // Attempting to confirm again must fail
      const replayConfirm = await request('/v1/trx/confirm', {
        method: 'POST',
        headers: {
          'x-api-key': demoBrand.api_key,
          'x-api-secret': demoBrand.api_secret
        },
        body: {
          id: sc2StoredTrxId,
          trx_id: sc2TrxId
        }
      });
      assert.strictEqual(replayConfirm.status, 400, 'Re-confirm rejected with HTTP 400');
      assert.strictEqual(replayConfirm.body.code, 'TRANSACTION_ALREADY_USED');

      // Attempting to verify again must fail (Amount Oracle suppression)
      const replayVerify = await request('/v1/trx/verify', {
        method: 'POST',
        headers: {
          'x-api-key': demoBrand.api_key,
          'x-api-secret': demoBrand.api_secret
        },
        body: {
          trx_id: sc2TrxId,
          amount: 3500
        }
      });
      assert.strictEqual(replayVerify.status, 400, 'Re-verify rejected with HTTP 400');
      assert.strictEqual(replayVerify.body.code, 'TRANSACTION_INVALID');
      return `Anti-replay verified: double confirm returns TRANSACTION_ALREADY_USED; re-verify returns TRANSACTION_INVALID`;
    });

    // --------------------------------------------------------------------------
    // SCENARIO 3: Bank Transfer Payment Flow
    // --------------------------------------------------------------------------
    console.log(`\n${BOLD}${YELLOW}--- SCENARIO 3: Bank Transfer Payment Flow (City Bank Manual Reference) ---${RESET}`);
    let sc3Invoice = null;
    const sc3BankRef = 'CITY_NPSB_987654';

    await runStep('SCENARIO-3', '3.1 Merchant generates high-value invoice for bank settlement', async () => {
      const res = await request('/api/invoices', {
        method: 'POST',
        headers: { Authorization: `Bearer ${merchantToken}` },
        body: {
          amount: 25000,
          currency: 'BDT',
          customer_name: 'Chowdhury Enterprise',
          customer_phone: '01799887766',
          customer_email: 'finance@chowdhury.com',
          metadata: { contract_no: 'CNT-2026-88' }
        }
      });
      assert.strictEqual(res.status, 201);
      sc3Invoice = res.body.invoice;
      return `Generated high-value invoice ${sc3Invoice.id} for ৳25,000`;
    });

    await runStep('SCENARIO-3', '3.2 Customer loads checkout and selects City Bank details', async () => {
      const publicRes = await request(`/api/invoices/${sc3Invoice.id}/public`);
      assert.strictEqual(publicRes.status, 200);

      const cityBankGw = publicRes.body.gateways.find(
        (g) => g.channel_name?.toLowerCase().includes('city bank')
      );
      assert.ok(cityBankGw, 'City Bank gateway active in merchant catalog');
      assert.strictEqual(cityBankGw.account_number, '1102938475001', 'City Bank account number verified');
      assert.strictEqual(cityBankGw.routing_number, '225261890', 'City Bank routing number verified');
      assert.strictEqual(cityBankGw.branch_name, 'Gulshan Branch', 'Branch verified');
      assert.strictEqual(cityBankGw.fields?.account_name, 'Deshi Course Ltd', 'Account name verified');
      return `City Bank details retrieved: A/C 1102938475001, Routing 225261890, Gulshan Branch`;
    });

    await runStep('SCENARIO-3', '3.3 Bank transfer notification ingested into stored_data', async () => {
      // Bank notifications (via SMS, API webhook from core banking, or statement sync)
      const nowUtc = new Date().toISOString().replace('T', ' ').substring(0, 19);
      await db.query(
        `INSERT INTO stored_data (
           id, brand_id, sender, raw_sms, channel, trx_id, amount, status, sim_slot, received_at, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, 'UNUSED', 1, ?, ?)`,
        [
          `std_bank_${crypto.randomUUID().slice(0, 8)}`,
          demoBrand.id,
          'City Bank Gulshan',
          'NPSB Inward Credit Tk 25,000.00 Ref CNT-2026-88 TrxID CITY_NPSB_987654',
          'City Bank',
          sc3BankRef,
          25000,
          nowUtc,
          nowUtc
        ]
      );

      const check = await db.get("SELECT * FROM stored_data WHERE brand_id = ? AND UPPER(trx_id) = ?", [
        demoBrand.id,
        sc3BankRef
      ]);
      assert.ok(check, 'Bank reference ingested in stored_data');
      assert.strictEqual(check.status, 'UNUSED');
      return `Bank transfer reference ${sc3BankRef} ingested for ৳25,000 (channel: City Bank)`;
    });

    await runStep('SCENARIO-3', '3.4 Customer submits bank reference on hosted checkout', async () => {
      const submitRes = await request('/api/payment/submit-trx', {
        method: 'POST',
        body: {
          invoice_id: sc3Invoice.id,
          trx_id: sc3BankRef
        }
      });
      assert.strictEqual(submitRes.status, 200, 'Payment submitted successfully');
      assert.strictEqual(submitRes.body.success, true);
      assert.strictEqual(submitRes.body.status, 'PAID');
      assert.strictEqual(submitRes.body.trx_id, sc3BankRef);
      assert.strictEqual(submitRes.body.payment_method, 'City Bank');

      const invCheck = await db.get("SELECT * FROM invoices WHERE id = ?", [sc3Invoice.id]);
      assert.strictEqual(invCheck.status, 'PAID');
      assert.strictEqual(invCheck.payment_method, 'City Bank');
      assert.strictEqual(invCheck.trx_id, sc3BankRef);
      return `Bank transfer verified: Invoice marked PAID, payment_method set to 'City Bank'`;
    });

    // --------------------------------------------------------------------------
    // SCENARIO 4: Expired Checkout Recovery (15-Minute TTL Lifecycle)
    // --------------------------------------------------------------------------
    console.log(`\n${BOLD}${YELLOW}--- SCENARIO 4: Expired Checkout Recovery (15-Min TTL & Recovery) ---${RESET}`);
    let sc4ExpiredInvoice = null;
    const sc4TrxId = 'BKASHLATE7766';

    await runStep('SCENARIO-4', '4.1 Merchant creates invoice and simulates 16 minutes time lapse', async () => {
      const res = await request('/api/invoices', {
        method: 'POST',
        headers: { Authorization: `Bearer ${merchantToken}` },
        body: {
          amount: 1000,
          customer_name: 'Zakir Hasan',
          customer_phone: '01912345678'
        }
      });
      assert.strictEqual(res.status, 201);
      sc4ExpiredInvoice = res.body.invoice;

      // Wind clock back to simulate 16 minutes in the past
      const pastTime = new Date(Date.now() - 16 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);
      await db.query("UPDATE invoices SET expires_at = ? WHERE id = ?", [pastTime, sc4ExpiredInvoice.id]);
      return `Created invoice ${sc4ExpiredInvoice.id} and set expires_at to 16 minutes ago`;
    });

    await runStep('SCENARIO-4', '4.2 Public endpoint dynamically auto-transitions invoice to EXPIRED', async () => {
      const publicRes = await request(`/api/invoices/${sc4ExpiredInvoice.id}/public`);
      assert.strictEqual(publicRes.status, 200);
      assert.strictEqual(publicRes.body.invoice.status, 'EXPIRED', 'Status auto-transitioned to EXPIRED');
      assert.strictEqual(publicRes.body.invoice.is_expired, true, 'is_expired flag is true');
      assert.strictEqual(publicRes.body.invoice.time_remaining_seconds, 0, 'time_remaining_seconds is 0');

      const dbCheck = await db.get("SELECT status FROM invoices WHERE id = ?", [sc4ExpiredInvoice.id]);
      assert.strictEqual(dbCheck.status, 'EXPIRED', 'Persisted to EXPIRED in database');
      return `Dynamic TTL triggered: invoice ${sc4ExpiredInvoice.id} is officially EXPIRED`;
    });

    await runStep('SCENARIO-4', '4.3 Telco SMS is ingested; redemption on expired invoice is rejected with HTTP 410', async () => {
      // Ingest genuine SMS
      await request('/api/device/sync-sms', {
        method: 'POST',
        headers: { 'device-api-key': demoDevice.device_token },
        body: {
          sender: 'bKash',
          message: 'You have received Tk 1,000.00 from 01912345678. Fee Tk 0.00. TrxID BKASHLATE7766 at 16/09/2026 15:30',
          sim_slot: 1
        }
      });

      // Customer attempts to pay expired invoice
      const submitRes = await request('/api/payment/submit-trx', {
        method: 'POST',
        body: {
          invoice_id: sc4ExpiredInvoice.id,
          trx_id: sc4TrxId
        }
      });
      assert.strictEqual(submitRes.status, 410, 'HTTP 410 Gone / Expired returned');
      assert.strictEqual(submitRes.body.code, 'INVOICE_EXPIRED');
      assert.strictEqual(submitRes.body.success, false);

      // CRITICAL ASSERTION: The transaction must NOT have been consumed!
      const storedCheck = await db.get(
        "SELECT status FROM stored_data WHERE brand_id = ? AND UPPER(trx_id) = ?",
        [demoBrand.id, sc4TrxId]
      );
      assert.strictEqual(storedCheck.status, 'UNUSED', 'Customer transaction preserved in UNUSED state');
      return `HTTP 410 INVOICE_EXPIRED returned; customer payment ${sc4TrxId} preserved in UNUSED state`;
    });

    await runStep('SCENARIO-4', '4.4 Merchant creates fresh recovery invoice; payment successfully redeemed', async () => {
      // Create new replacement invoice
      const freshRes = await request('/api/invoices', {
        method: 'POST',
        headers: { Authorization: `Bearer ${merchantToken}` },
        body: {
          amount: 1000,
          customer_name: 'Zakir Hasan',
          customer_phone: '01912345678',
          metadata: { recovery_for: sc4ExpiredInvoice.id }
        }
      });
      assert.strictEqual(freshRes.status, 201);
      const recoveryInvoice = freshRes.body.invoice;

      // Submit the intact TrxID against the new invoice
      const redeemRes = await request('/api/payment/submit-trx', {
        method: 'POST',
        body: {
          invoice_id: recoveryInvoice.id,
          trx_id: sc4TrxId
        }
      });
      assert.strictEqual(redeemRes.status, 200, 'Re-submission against fresh invoice succeeds');
      assert.strictEqual(redeemRes.body.success, true);
      assert.strictEqual(redeemRes.body.status, 'PAID');

      const finalTrx = await db.get(
        "SELECT status FROM stored_data WHERE brand_id = ? AND UPPER(trx_id) = ?",
        [demoBrand.id, sc4TrxId]
      );
      assert.strictEqual(finalTrx.status, 'USED', 'Transaction now properly marked USED');
      return `Recovery complete: Trx ${sc4TrxId} applied to new invoice ${recoveryInvoice.id} -> PAID`;
    });

    // --------------------------------------------------------------------------
    // SCENARIO 5: Multi-Tenant Concurrent Checkouts (Parallel Brand Journeys)
    // --------------------------------------------------------------------------
    console.log(`\n${BOLD}${YELLOW}--- SCENARIO 5: Multi-Tenant Concurrent Checkouts (Parallel Brand Journeys) ---${RESET}`);
    const brandA = demoBrand;
    let brandB = null;
    let userB = null;
    let deviceB = null;
    let tokenB = null;
    const sharedCollisionTrxId = 'TRXCOLLISION999';

    await runStep('SCENARIO-5', '5.1 Provision Brand B ("Tech Academy") with isolated credentials & webhook', async () => {
      const nowUtc = new Date().toISOString().replace('T', ' ').substring(0, 19);
      const userBId = `usr_tech_${crypto.randomUUID().slice(0, 8)}`;
      const brandBId = `brand_tech_${crypto.randomUUID().slice(0, 8)}`;
      const deviceBId = `dev_tech_${crypto.randomUUID().slice(0, 8)}`;

      await db.query(
        `INSERT INTO users (id, email, password_hash, name, role, credits, created_at)
         VALUES (?, 'admin@techacademy.io', '$2b$10$demoHashTechAcademy1234567890123456789012345', 'Tech Academy Admin', 'merchant', 50, ?)`,
        [userBId, nowUtc]
      );

      const brandBWebhookUrl = `${mockWebhookBaseUrl}/webhook/${brandBId}`;
      const brandBWebhookSec = `whsec_${crypto.randomBytes(32).toString('hex')}`;
      const brandBApiKey = `dn_live_${crypto.randomBytes(16).toString('hex')}`;
      const brandBApiSec = `dn_sec_${crypto.randomBytes(24).toString('hex')}`;

      await db.query(
        `INSERT INTO brands (id, user_id, brand_name, brand_slug, api_key, api_secret, webhook_url, webhook_secret, status, created_at)
         VALUES (?, ?, 'Tech Academy', 'tech-academy', ?, ?, ?, ?, 'active', ?)`,
        [brandBId, userBId, brandBApiKey, brandBApiSec, brandBWebhookUrl, brandBWebhookSec, nowUtc]
      );

      const deviceBToken = `tok_dev_${crypto.randomBytes(24).toString('hex')}`;
      await db.query(
        `INSERT INTO devices (id, brand_id, device_name, device_token, status, created_at)
         VALUES (?, ?, 'Samsung Galaxy S22', ?, 'active', ?)`,
        [deviceBId, brandBId, deviceBToken, nowUtc]
      );

      userB = await db.get("SELECT * FROM users WHERE id = ?", [userBId]);
      brandB = await db.get("SELECT * FROM brands WHERE id = ?", [brandBId]);
      deviceB = await db.get("SELECT * FROM devices WHERE id = ?", [deviceBId]);
      tokenB = generateToken({ id: userB.id, email: userB.email, role: userB.role });

      return `Brand B provisioned: ID=${brandB.id}, User=${userB.email}, Webhook=${brandBWebhookUrl}`;
    });

    await runStep('SCENARIO-5', '5.2 Cross-tenant TrxID collision: Ingest identical TrxID under Brand A and Brand B', async () => {
      // Ingest under Brand A: ৳2,000
      const syncA = await request('/api/device/sync-sms', {
        method: 'POST',
        headers: { 'device-api-key': demoDevice.device_token },
        body: {
          sender: 'bKash',
          message: `You have received Tk 2,000.00 from 01711111111. Fee Tk 0.00. TrxID ${sharedCollisionTrxId} at 16/09/2026 16:00`,
          sim_slot: 1
        }
      });
      assert.ok(syncA.status === 200 || syncA.status === 201, 'Brand A SMS sync succeeded');
      assert.strictEqual(syncA.body.ingested, 1);

      // Ingest under Brand B: ৳4,500 with EXACT SAME TrxID
      const syncB = await request('/api/device/sync-sms', {
        method: 'POST',
        headers: { 'device-api-key': deviceB.device_token },
        body: {
          sender: 'bKash',
          message: `You have received Tk 4,500.00 from 01822222222. Fee Tk 0.00. TrxID ${sharedCollisionTrxId} at 16/09/2026 16:00`,
          sim_slot: 1
        }
      });
      assert.ok(syncB.status === 200 || syncB.status === 201, 'Brand B SMS sync succeeded');
      assert.strictEqual(syncB.body.ingested, 1);

      // Verify composite unique index (brand_id, trx_id) allowed both entries
      const countRes = await db.get(
        "SELECT count(*) as cnt FROM stored_data WHERE UPPER(trx_id) = ?",
        [sharedCollisionTrxId]
      );
      assert.strictEqual(countRes.cnt, 2, 'Exactly 2 records exist with the identical TrxID across distinct brands');
      return `Composite uniqueness confirmed: identical TrxID ${sharedCollisionTrxId} successfully partitioned per brand`;
    });

    await runStep('SCENARIO-5', '5.3 Execute simultaneous parallel checkouts across Brand A and Brand B', async () => {
      // Create Invoice A (Brand A, ৳2,000)
      const invResA = await request('/api/invoices', {
        method: 'POST',
        headers: { Authorization: `Bearer ${merchantToken}` },
        body: { amount: 2000, customer_name: 'Student A', customer_phone: '01711111111' }
      });
      assert.strictEqual(invResA.status, 201);
      const invA = invResA.body.invoice;

      // Create Invoice B (Brand B, ৳4,500)
      const invResB = await request('/api/invoices', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenB}` },
        body: { amount: 4500, customer_name: 'Student B', customer_phone: '01822222222' }
      });
      assert.strictEqual(invResB.status, 201);
      const invB = invResB.body.invoice;

      // Trigger simultaneous verification calls via Promise.all
      const [resA, resB] = await Promise.all([
        request('/api/payment/submit-trx', {
          method: 'POST',
          body: { invoice_id: invA.id, trx_id: sharedCollisionTrxId }
        }),
        request('/api/payment/submit-trx', {
          method: 'POST',
          body: { invoice_id: invB.id, trx_id: sharedCollisionTrxId }
        })
      ]);

      assert.strictEqual(resA.status, 200, 'Brand A checkout returned HTTP 200');
      assert.strictEqual(resA.body.status, 'PAID');
      assert.strictEqual(resA.body.amount, 2000);

      assert.strictEqual(resB.status, 200, 'Brand B checkout returned HTTP 200');
      assert.strictEqual(resB.body.status, 'PAID');
      assert.strictEqual(resB.body.amount, 4500);

      // Verify Brand A transaction marked USED under Brand A
      const trxCheckA = await db.get(
        "SELECT status FROM stored_data WHERE brand_id = ? AND UPPER(trx_id) = ?",
        [brandA.id, sharedCollisionTrxId]
      );
      assert.strictEqual(trxCheckA.status, 'USED');

      // Verify Brand B transaction marked USED under Brand B
      const trxCheckB = await db.get(
        "SELECT status FROM stored_data WHERE brand_id = ? AND UPPER(trx_id) = ?",
        [brandB.id, sharedCollisionTrxId]
      );
      assert.strictEqual(trxCheckB.status, 'USED');
      return `Simultaneous parallel checkouts completed: Brand A (৳2000) & Brand B (৳4500) both PAID without contention`;
    });

    await runStep('SCENARIO-5', '5.4 Verify independent webhook dispatch and signature isolation per brand', async () => {
      // Find and dispatch Brand A webhook
      const logA = await db.get("SELECT * FROM webhook_logs WHERE brand_id = ? ORDER BY created_at DESC LIMIT 1", [brandA.id]);
      await db.query("UPDATE webhook_logs SET status = 'PENDING' WHERE id = ?", [logA.id]);
      await dispatchSingleWebhook(logA.id, { allowHttpForTesting: true });
      const eventA = await waitForWebhook(brandA.id);
      assert.ok(eventA);
      const sigA = verifyWebhookSignature(eventA.body, eventA.headers['x-denaneya-signature'], brandA.webhook_secret);
      assert.strictEqual(sigA.valid, true, 'Brand A signature valid with Brand A secret');

      // Find and dispatch Brand B webhook
      const logB = await db.get("SELECT * FROM webhook_logs WHERE brand_id = ? ORDER BY created_at DESC LIMIT 1", [brandB.id]);
      await db.query("UPDATE webhook_logs SET status = 'PENDING' WHERE id = ?", [logB.id]);
      await dispatchSingleWebhook(logB.id, { allowHttpForTesting: true });
      const eventB = await waitForWebhook(brandB.id);
      assert.ok(eventB);
      const sigB = verifyWebhookSignature(eventB.body, eventB.headers['x-denaneya-signature'], brandB.webhook_secret);
      assert.strictEqual(sigB.valid, true, 'Brand B signature valid with Brand B secret');

      // Verify cross-verification failure (Brand A secret CANNOT verify Brand B payload)
      const invalidCrossSig = verifyWebhookSignature(eventB.body, eventB.headers['x-denaneya-signature'], brandA.webhook_secret);
      assert.strictEqual(invalidCrossSig.valid, false, 'Brand A secret strictly fails on Brand B webhook');
      return `Multi-tenant cryptographic boundary verified: Brand A and Brand B keys isolated`;
    });

    console.log(`\n${BOLD}${GREEN}================================================================================${RESET}`);
    console.log(`${BOLD}${GREEN}  Tier 4 Test Suite Execution Complete: 100% Pass Rate                          ${RESET}`);
    console.log(`${BOLD}${GREEN}================================================================================${RESET}`);
    console.log(`  Total Steps Executed:  ${summary.total}`);
    console.log(`  Passed Steps:          ${summary.passed}`);
    console.log(`  Failed Steps:          ${summary.failed}`);
    console.log(`${BOLD}${GREEN}================================================================================${RESET}\n`);

    return summary;
  } finally {
    await teardownEnvironment();
  }
}

// Auto-run when executed directly via node
if (process.argv[1]?.endsWith('tier4_realworld_workloads.test.js')) {
  runTier4Suite().catch((err) => {
    console.error('Fatal Tier 4 Suite Error:', err);
    process.exit(1);
  });
}
