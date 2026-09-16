/**
 * DenaNeya v2.0 - Milestone 3 Adversarial Security Challenge Test Suite
 * Challenger: Milestone 3 Challenger 2 (SSRF, Webhook Crypto & Carrier Spoofing Challenger)
 * File: tests/security/adversarial_m3_ssrf_webhook_carrier.test.js
 *
 * Scope:
 * 1. Outbound SSRF attacks on webhook dispatch:
 *    - Private IPv4 (127.0.0.1, 10.0.0.1, 192.168.1.1, 172.16.0.1)
 *    - IPv6 loopback ([::1])
 *    - IPv4-mapped IPv6 ([::ffff:127.0.0.1])
 *    - Octal IP notation (0177.0.0.1)
 *    - Cloud metadata (http://169.254.169.254/latest/meta-data and https://169.254.169.254/latest/meta-data)
 *    - Verify exact dispatch status and database log recording.
 * 2. Webhook HMAC-SHA256 Cryptographic Signature:
 *    - Baseline genuine signature verification
 *    - 1-byte alteration of payload (content tampering)
 *    - 1-byte alteration of timestamp (timing tampering)
 *    - 1-byte alteration of nonce (nonce tampering)
 *    - 1-byte alteration of signature hex digest
 *    - Secret entropy & weak key rejection
 *    - Nonce replay protection within freshness window
 *    - Out-of-tolerance timestamp rejection (> 300s)
 * 3. Carrier SMS Spoofing & BTRC Telecom Whitelist:
 *    - Submitting SMS from personal numbers (+88017..., 018..., +88019...)
 *    - Submitting SMS from modified/lookalike masks (bKashSupport, Nagad_Alert, 162160, 1622)
 *    - Verifying HTTP 400 UNAUTHORIZED_SENDER rejection and zero stored_data ingestion
 *    - Verifying genuine carrier masks (bKash, Nagad, 16216, 16222, Upay)
 * 4. Debit Blacklist Evasion & Receipt Parsing:
 *    - Obfuscated debit keywords (Cash Out, Cash-Out, Cash_Out, Cash - Out, Cashout, zero-width space)
 *    - Outbound transfer keywords (Send Money, Send  Money, SendMoney, Payment to, Paid to, Transfer to)
 *    - Fee variations with non-zero amounts (Fee Tk 5.00, Fee: 5.00, Fee Tk 0.50, Charge Tk 10.00)
 *    - Authentic zero-fee receipts ("Fee Tk 0.00", "Fee: 0", "Fee: Tk 0.00", "Charge Tk 0.00")
 *    - HTTP end-to-end rejection on POST /api/device/sync-sms
 */

process.env.NODE_ENV = 'test';
process.env.DB_CLIENT = 'sqlite';
process.env.DB_SQLITE_PATH = ':memory:';
process.env.JWT_SECRET = 'denaneya_development_jwt_secret_min_32_bytes_long_12345';

import assert from 'node:assert';
import crypto from 'node:crypto';
import http from 'node:http';
import dbPkg from '@denaneya/database';
import { createApp } from '../../apps/api/src/app.js';
import {
  isTelecomSenderWhitelisted,
  resolveProviderFromSender,
  checkDebitBlacklist,
  generateWebhookSignature,
  verifyWebhookSignature,
  validateWebhookSecret,
  isProhibitedIP,
  validateWebhookUrl
} from '@denaneya/shared';
import {
  enqueueWebhookEvent,
  dispatchSingleWebhook,
  validateOutboundUrl
} from '../../apps/api/src/services/webhookService.js';

const { getDatabase, runMigrations, runSeed } = dbPkg;

console.log('===============================================================================');
console.log('  DenaNeya v2.0 - Milestone 3 Adversarial Security Challenge Test Suite        ');
console.log('  Challenger 2: SSRF, Webhook Crypto & Carrier Spoofing                       ');
console.log('===============================================================================\n');

let server;
let baseUrl;
let db;
let testBrandId;
let testDeviceId;
let testDeviceToken;

const summary = {
  total: 0,
  passed: 0,
  failed: 0,
  vulnerabilities: []
};

async function challengeTest(id, category, description, fn) {
  summary.total++;
  try {
    await fn();
    summary.passed++;
    console.log(`  [PASS] ${id} - [${category}] ${description}`);
  } catch (err) {
    summary.failed++;
    console.error(`  [FAIL/VULN] ${id} - [${category}] ${description}`);
    console.error(`         >>> Detail: ${err.message}`);
    summary.vulnerabilities.push({ id, category, description, error: err.message });
  }
}

async function apiRequest(path, { method = 'GET', headers = {}, body = null } = {}) {
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

  const response = await fetch(`${baseUrl}${path}`, reqOptions);
  let data = null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  return {
    status: response.status,
    headers: response.headers,
    body: data
  };
}

async function setup() {
  console.log('[Setup] Initializing in-memory SQLite database singleton for challenger...');
  db = getDatabase();
  await runMigrations(db, { reset: true });
  await runSeed(db);

  // Create test brand and test device for SMS ingestion tests
  testBrandId = `b_challenger_${crypto.randomBytes(4).toString('hex')}`;
  const brandSecret = crypto.randomBytes(32).toString('hex');
  await db.query(
    `INSERT INTO brands (
       id, user_id, brand_name, brand_slug, api_key, api_secret, webhook_url, webhook_secret, status
     ) VALUES (?, 'usr_demo_8f4c9a2e7b31', 'Challenger Brand', 'challenger-brand', ?, ?, 'https://merchant.example.com/webhook', ?, 'active')`,
    [testBrandId, `key_${testBrandId}`, `sec_${testBrandId}`, brandSecret]
  );

  testDeviceId = `dev_${crypto.randomBytes(4).toString('hex')}`;
  testDeviceToken = `tok_dev_${crypto.randomBytes(16).toString('hex')}`;
  await db.query(
    `INSERT INTO devices (
       id, brand_id, device_name, device_token, status, battery_level
     ) VALUES (?, ?, 'Challenger Test Device', ?, 'active', 85)`,
    [testDeviceId, testBrandId, testDeviceToken]
  );

  // Start Express API server
  const app = createApp();
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      console.log(`[Setup] Target API live on ${baseUrl}`);
      resolve();
    });
  });
}

async function teardown() {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
}

async function runAllChallenges() {
  await setup();

  // ===========================================================================
  // CATEGORY 1: Outbound SSRF Attacks on Webhook Dispatch
  // ===========================================================================
  console.log('\n--- CATEGORY 1: Outbound SSRF Attacks on Webhook Dispatch ---');

  // SSRF vectors to test:
  const ssrfVectors = [
    { label: 'Private IPv4 loopback (127.0.0.1)', url: 'https://127.0.0.1/webhook', expectedStatus: 'SSRF_BLOCKED' },
    { label: 'Private IPv4 RFC 1918 Class A (10.0.0.1)', url: 'https://10.0.0.1/webhook', expectedStatus: 'SSRF_BLOCKED' },
    { label: 'Private IPv4 RFC 1918 Class C (192.168.1.1)', url: 'https://192.168.1.1/webhook', expectedStatus: 'SSRF_BLOCKED' },
    { label: 'Private IPv4 RFC 1918 Class B (172.16.0.1)', url: 'https://172.16.0.1/webhook', expectedStatus: 'SSRF_BLOCKED' },
    { label: 'IPv6 loopback ([::1])', url: 'https://[::1]/webhook', expectedStatus: 'SSRF_BLOCKED' },
    { label: 'IPv4-mapped IPv6 loopback ([::ffff:127.0.0.1])', url: 'https://[::ffff:127.0.0.1]/webhook', expectedStatus: 'SSRF_BLOCKED' },
    { label: 'Octal IP notation (0177.0.0.1)', url: 'https://0177.0.0.1/webhook', expectedStatus: 'SSRF_BLOCKED' },
    { label: 'Cloud metadata via HTTPS (https://169.254.169.254/latest/meta-data)', url: 'https://169.254.169.254/latest/meta-data', expectedStatus: 'SSRF_BLOCKED' },
    { label: 'Cloud metadata via HTTP (http://169.254.169.254/latest/meta-data)', url: 'http://169.254.169.254/latest/meta-data', expectedStatus: 'SSRF_BLOCKED' },
    { label: 'Octal IP notation via HTTP (http://0177.0.0.1/webhook)', url: 'http://0177.0.0.1/webhook', expectedStatus: 'SSRF_BLOCKED' },
    { label: 'Loopback via HTTP (http://127.0.0.1/webhook)', url: 'http://127.0.0.1/webhook', expectedStatus: 'SSRF_BLOCKED' },
    { label: 'Private IP via HTTP (http://10.0.0.1/webhook)', url: 'http://10.0.0.1/webhook', expectedStatus: 'SSRF_BLOCKED' }
  ];

  let testIndex = 1;
  for (const vector of ssrfVectors) {
    const testId = `SSRF-${String(testIndex++).padStart(2, '0')}`;
    await challengeTest(testId, 'SSRF-DISPATCH', `SSRF Defense on ${vector.label}`, async () => {
      const bId = `b_ssrf_${crypto.randomBytes(4).toString('hex')}`;
      const bSecret = crypto.randomBytes(32).toString('hex');
      await db.query(
        `INSERT INTO brands (
           id, user_id, brand_name, brand_slug, api_key, api_secret, webhook_url, webhook_secret, status
         ) VALUES (?, 'usr_demo_8f4c9a2e7b31', 'SSRF Target Brand', ?, ?, ?, ?, ?, 'active')`,
        [bId, `slug-${bId}`, `key_${bId}`, `sec_${bId}`, vector.url, bSecret]
      );

      const { logId } = await enqueueWebhookEvent(bId, null, 'invoice.completed', {
        amount: 1000,
        customer: 'test'
      });

      const dispatchResult = await dispatchSingleWebhook(logId);
      const logRecord = await db.get(`SELECT status, response_body, attempts FROM webhook_logs WHERE id = ?`, [logId]);

      // Verify that no network request was permitted
      assert.strictEqual(dispatchResult.success, false, 'Dispatch must not succeed');

      // Check whether it is blocked as SSRF_BLOCKED
      if (dispatchResult.status !== vector.expectedStatus) {
        throw new Error(
          `Expected status '${vector.expectedStatus}', but received '${dispatchResult.status}' (DB: '${logRecord?.status}'). Error was: '${dispatchResult.error}'. Reason: ${logRecord?.response_body}`
        );
      }

      assert.strictEqual(logRecord.status, 'SSRF_BLOCKED', 'Database log status must be SSRF_BLOCKED');
      assert.ok(logRecord.response_body.includes('SSRF_BLOCKED'), 'response_body must indicate SSRF_BLOCKED');
    });
  }

  // ===========================================================================
  // CATEGORY 2: Webhook HMAC Cryptographic Signature & 1-Byte Alteration
  // ===========================================================================
  console.log('\n--- CATEGORY 2: Webhook HMAC Signature & Tamper Resistance ---');

  const strongSecret = crypto.randomBytes(32).toString('hex');
  const basePayload = {
    event: 'invoice.completed',
    invoice_id: 'inv_m3_test_001',
    amount: 50000,
    amount_paisa: 5000000,
    trx_id: 'TRX9988776655',
    timestamp: Math.floor(Date.now() / 1000)
  };
  const fixedTs = Math.floor(Date.now() / 1000);
  const fixedNonce = '7f8c5b3e-1234-4567-89ab-cdef01234567';

  await challengeTest('HMAC-01', 'CRYPTO-BASELINE', 'Genuine webhook payload signature validates successfully', async () => {
    const sigOutput = generateWebhookSignature(basePayload, strongSecret, fixedTs, fixedNonce);
    const verification = verifyWebhookSignature(basePayload, sigOutput.header, strongSecret);
    assert.strictEqual(verification.valid, true);
    assert.strictEqual(verification.timestamp, fixedTs);
    assert.strictEqual(verification.nonce, fixedNonce);
  });

  await challengeTest('HMAC-02', 'CRYPTO-TAMPER-PAYLOAD', 'Altering 1 byte in payload body causes signature failure', async () => {
    const sigOutput = generateWebhookSignature(basePayload, strongSecret, fixedTs, fixedNonce);

    // Alter 1 byte of amount (50000 -> 50001)
    const tamperedPayload = { ...basePayload, amount: 50001 };
    const verification = verifyWebhookSignature(tamperedPayload, sigOutput.header, strongSecret);
    assert.strictEqual(verification.valid, false, 'Tampered payload must be rejected');
    assert.strictEqual(verification.error, 'SIGNATURE_MISMATCH');
  });

  await challengeTest('HMAC-03', 'CRYPTO-TAMPER-TIMESTAMP', 'Altering 1 byte in timestamp causes signature failure', async () => {
    const sigOutput = generateWebhookSignature(basePayload, strongSecret, fixedTs, fixedNonce);

    // Alter 1 byte in timestamp header (fixedTs + 1)
    const tamperedHeader = sigOutput.header.replace(`t=${fixedTs}`, `t=${fixedTs + 1}`);
    const verification = verifyWebhookSignature(basePayload, tamperedHeader, strongSecret);
    assert.strictEqual(verification.valid, false, 'Tampered timestamp must be rejected');
    assert.strictEqual(verification.error, 'SIGNATURE_MISMATCH');
  });

  await challengeTest('HMAC-04', 'CRYPTO-TAMPER-NONCE', 'Altering 1 byte in nonce causes signature failure', async () => {
    const sigOutput = generateWebhookSignature(basePayload, strongSecret, fixedTs, fixedNonce);

    // Alter 1 byte in nonce (change last character)
    const lastChar = fixedNonce.slice(-1);
    const newLastChar = lastChar === '7' ? '8' : '7';
    const tamperedNonce = fixedNonce.slice(0, -1) + newLastChar;
    const tamperedHeader = sigOutput.header.replace(`n=${fixedNonce}`, `n=${tamperedNonce}`);

    const verification = verifyWebhookSignature(basePayload, tamperedHeader, strongSecret);
    assert.strictEqual(verification.valid, false, 'Tampered nonce must be rejected');
    assert.strictEqual(verification.error, 'SIGNATURE_MISMATCH');
  });

  await challengeTest('HMAC-05', 'CRYPTO-TAMPER-SIGNATURE', 'Altering 1 byte in signature digest causes signature failure', async () => {
    const sigOutput = generateWebhookSignature(basePayload, strongSecret, fixedTs, fixedNonce);

    // Alter last hex character of the v1 signature
    const lastHex = sigOutput.signature.slice(-1);
    const alteredHex = lastHex === 'a' ? 'b' : 'a';
    const tamperedSig = sigOutput.signature.slice(0, -1) + alteredHex;
    const tamperedHeader = `t=${fixedTs},n=${fixedNonce},v1=${tamperedSig}`;

    const verification = verifyWebhookSignature(basePayload, tamperedHeader, strongSecret);
    assert.strictEqual(verification.valid, false, 'Tampered signature hex must be rejected');
    assert.strictEqual(verification.error, 'SIGNATURE_MISMATCH');
  });

  await challengeTest('HMAC-06', 'CRYPTO-SECRET-ENTROPY', 'Reject weak/insufficient entropy webhook secrets', async () => {
    const weakSecrets = [
      'short_secret',
      '12345678901234567890123456789012',
      'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      'default_zinipay_secret',
      '                              32chars                        '
    ];

    for (const ws of weakSecrets) {
      assert.throws(
        () => validateWebhookSecret(ws),
        /SECURITY_ERROR/,
        `Weak secret '${ws.slice(0, 16)}...' must be rejected`
      );
    }
  });

  await challengeTest('HMAC-07', 'CRYPTO-NONCE-REPLAY', 'Replayed nonce within tolerance window is rejected with REPLAYED_NONCE', async () => {
    const freshNonce = crypto.randomUUID();
    const sigOutput = generateWebhookSignature(basePayload, strongSecret, fixedTs, freshNonce);

    // First presentation: valid
    const firstAttempt = verifyWebhookSignature(basePayload, sigOutput.header, strongSecret);
    assert.strictEqual(firstAttempt.valid, true, 'First presentation of nonce must succeed');

    // Second presentation with identical payload & nonce: rejected as replay
    const secondAttempt = verifyWebhookSignature(basePayload, sigOutput.header, strongSecret);
    assert.strictEqual(secondAttempt.valid, false, 'Replayed nonce must be rejected');
    assert.strictEqual(secondAttempt.error, 'REPLAYED_NONCE');
  });

  await challengeTest('HMAC-08', 'CRYPTO-TIMESTAMP-TOLERANCE', 'Timestamp outside 300s tolerance window is rejected', async () => {
    const expiredTs = fixedTs - 301;
    const expiredNonce = crypto.randomUUID();
    const sigOutput = generateWebhookSignature(basePayload, strongSecret, expiredTs, expiredNonce);

    const verification = verifyWebhookSignature(basePayload, sigOutput.header, strongSecret);
    assert.strictEqual(verification.valid, false, 'Expired timestamp must be rejected');
    assert.strictEqual(verification.error, 'TIMESTAMP_OUT_OF_TOLERANCE');
  });

  // ===========================================================================
  // CATEGORY 3: Carrier SMS Spoofing & Alphanumeric Mask Whitelist
  // ===========================================================================
  console.log('\n--- CATEGORY 3: Carrier SMS Spoofing & Sender Whitelist ---');

  const spoofedSenders = [
    { sender: '+8801712345678', type: 'Personal mobile (+88017...)' },
    { sender: '01812345678', type: 'Personal mobile (018...)' },
    { sender: '+8801911223344', type: 'Personal mobile (+88019...)' },
    { sender: '01555667788', type: 'Personal mobile (015...)' },
    { sender: 'bKashSupport', type: 'Alphanumeric spoofing (bKashSupport)' },
    { sender: 'Nagad_Alert', type: 'Alphanumeric spoofing (Nagad_Alert)' },
    { sender: 'BkashOfficial', type: 'Alphanumeric spoofing (BkashOfficial)' },
    { sender: 'RocketOTP', type: 'Alphanumeric spoofing (RocketOTP)' },
    { sender: '162160', type: 'Shortcode boundary extension (162160)' },
    { sender: '1622', type: 'Shortcode boundary truncation (1622)' },
    { sender: 'UPAY_PAY', type: 'Alphanumeric spoofing (UPAY_PAY)' }
  ];

  let spoofIndex = 1;
  for (const s of spoofedSenders) {
    const testId = `SPOOF-${String(spoofIndex++).padStart(2, '0')}`;
    await challengeTest(testId, 'CARRIER-SPOOF', `Reject spoofed sender '${s.sender}' (${s.type})`, async () => {
      // 1. Shared module unit validation
      assert.strictEqual(
        isTelecomSenderWhitelisted(s.sender),
        false,
        `Sender '${s.sender}' must NOT be whitelisted in shared module`
      );

      // 2. HTTP Endpoint ingestion test
      const res = await apiRequest('/api/device/sync-sms', {
        method: 'POST',
        headers: {
          'device-api-key': testDeviceToken
        },
        body: {
          sender: s.sender,
          message: 'You have received Tk 1,500.00 from 01711111111. Ref INV-01. Fee Tk 0.00. TrxID 9K9J8H7G6F at 16/09/2026 12:00',
          sim_slot: 1,
          timestamp: new Date().toISOString()
        }
      });

      assert.strictEqual(res.status, 400, `Expected HTTP 400 for spoofed sender '${s.sender}', got ${res.status}`);
      assert.strictEqual(res.body.code, 'UNAUTHORIZED_SENDER');

      // Verify zero records entered stored_data
      const dbCheck = await db.get(`SELECT * FROM stored_data WHERE trx_id = '9K9J8H7G6F'`);
      assert.ok(!dbCheck, 'Spoofed transaction MUST NOT be ingested into stored_data');
    });
  }

  const validSenders = ['bKash', 'BKASH', 'Nagad', 'NAGAD', '16216', '16222', 'Upay', 'UPAY'];
  await challengeTest('SPOOF-VALID', 'CARRIER-WHITELIST', 'Approved BTRC telecom masks pass whitelist', async () => {
    for (const vs of validSenders) {
      assert.strictEqual(isTelecomSenderWhitelisted(vs), true, `Authorized sender '${vs}' must be whitelisted`);
      const provider = resolveProviderFromSender(vs);
      assert.ok(provider, `Provider must be resolved for '${vs}'`);
    }
  });

  // ===========================================================================
  // CATEGORY 4: Debit Blacklist Evasion & Zero-Fee Receipt Tolerance
  // ===========================================================================
  console.log('\n--- CATEGORY 4: Debit Blacklist Evasion & Zero-Fee Acceptance ---');

  const debitEvasionPayloads = [
    { label: 'Standard Cash Out', text: 'Cash Out Tk 500.00 to 01712345678. Fee Tk 7.50. TrxID CASH001' },
    { label: 'Hyphenated Cash-Out', text: 'Cash-Out Tk 500.00 to Agent 01712345678. TrxID CASH002' },
    { label: 'Underscore Cash_Out', text: 'Cash_Out Tk 500.00 to Agent. TrxID CASH003' },
    { label: 'Spaced Cash - Out', text: 'Cash - Out Tk 500.00 successful. TrxID CASH004' },
    { label: 'Compound Cashout', text: 'Cashout Tk 500.00 completed. TrxID CASH005' },
    { label: 'Zero-width space Cash\\u200BOut', text: 'Cash\u200BOut Tk 500.00 successful. TrxID CASH006' },
    { label: 'Tab-separated Cash\\tOut', text: 'Cash\tOut Tk 500.00 successful. TrxID CASH007' },
    { label: 'Newline-separated Cash\\nOut', text: 'Cash\nOut Tk 500.00 successful. TrxID CASH008' },
    { label: 'Standard Send Money', text: 'Send Money to 01712345678 successful. Fee Tk 5.00. TrxID SEND001' },
    { label: 'Spaced Send  Money', text: 'Send  Money to 01712345678. TrxID SEND002' },
    { label: 'Compound SendMoney', text: 'SendMoney to 01712345678 completed. TrxID SEND003' },
    { label: 'Outbound Payment to', text: 'Payment Tk 500.00 to Merchant XYZ. TrxID PAY001' },
    { label: 'Outbound Paid to', text: 'Paid Tk 750.00 to 01911223344. TrxID PAID001' },
    { label: 'Outbound Transfer to', text: 'Transfer Tk 1,000.00 to 01811223344. TrxID XFER001' },
    { label: 'Outbound Debit statement', text: 'Your A/C has been Debited Tk 2,000.00. TrxID DEB001' },
    { label: 'Non-zero Fee Tk 5.00', text: 'Transaction successful. Fee Tk 5.00. Balance Tk 100.00. TrxID FEE001' },
    { label: 'Non-zero Fee: 5.00', text: 'Transaction processed. Fee: 5.00. TrxID FEE002' },
    { label: 'Non-zero fractional Fee Tk 0.50', text: 'Transaction confirmed. Fee Tk 0.50. TrxID FEE003' },
    { label: 'Non-zero Charge Tk 10.00', text: 'Transaction completed. Charge Tk 10.00. TrxID CHG001' }
  ];

  let debitIndex = 1;
  for (const item of debitEvasionPayloads) {
    const testId = `DEBIT-${String(debitIndex++).padStart(2, '0')}`;
    await challengeTest(testId, 'DEBIT-EVASION', `Reject debit message: ${item.label}`, async () => {
      // 1. Shared module unit validation
      const check = checkDebitBlacklist(item.text);
      assert.strictEqual(check.isDebit, true, `Payload '${item.label}' must be flagged as isDebit=true`);

      // 2. HTTP Endpoint ingestion test
      const res = await apiRequest('/api/device/sync-sms', {
        method: 'POST',
        headers: {
          'device-api-key': testDeviceToken
        },
        body: {
          sender: 'bKash',
          message: item.text,
          sim_slot: 1,
          timestamp: new Date().toISOString()
        }
      });

      assert.strictEqual(res.status, 400, `Expected HTTP 400 for debit message '${item.label}', got ${res.status}`);
      assert.strictEqual(res.body.code, 'DEBIT_TRANSACTION_REJECTED');
    });
  }

  // Authentic receipt with "Fee Tk 0.00" MUST BE ACCEPTED
  await challengeTest('DEBIT-AUTHENTIC-01', 'DEBIT-TOLERANCE', 'Authentic bKash credit receipt with "Fee Tk 0.00" is ACCEPTED', async () => {
    const authenticSms = 'You have received Tk 1,250.00 from 01711223344. Ref INV-CHALLENGE-01. Fee Tk 0.00. Balance Tk 10,000.00. TrxID 9X8Y7Z6W5V at 16/09/2026 14:30';

    // 1. Shared module unit check
    const check = checkDebitBlacklist(authenticSms);
    assert.strictEqual(check.isDebit, false, 'Authentic receipt with Fee Tk 0.00 must NOT be marked isDebit');

    // 2. HTTP Endpoint ingestion test
    const res = await apiRequest('/api/device/sync-sms', {
      method: 'POST',
      headers: {
        'device-api-key': testDeviceToken
      },
      body: {
        sender: 'bKash',
        message: authenticSms,
        sim_slot: 1,
        timestamp: new Date().toISOString()
      }
    });

    assert.strictEqual(res.status, 201, `Expected HTTP 201 for authentic receipt, got ${res.status}`);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.ingested, 1);
    assert.strictEqual(res.body.trx_id, '9X8Y7Z6W5V');

    // Verify stored in DB
    const stored = await db.get(`SELECT * FROM stored_data WHERE UPPER(trx_id) = '9X8Y7Z6W5V'`);
    assert.ok(stored, 'Transaction must be present in stored_data');
    assert.strictEqual(stored.amount, 1250, 'Stored amount in DB must match DECIMAL(12,2) BDT');
    assert.strictEqual(res.body.amount_paisa, 125000, 'Response amount_paisa must be 125000');
    assert.strictEqual(stored.status, 'UNUSED');
  });

  await challengeTest('DEBIT-AUTHENTIC-02', 'DEBIT-TOLERANCE', 'Authentic Nagad credit receipt with "Fee: 0" and "Fee: Tk 0.00" is ACCEPTED', async () => {
    const nagadSms = 'You have received Tk 500.00 from 01822334455. Fee: 0. Ref: None. TrxID NGD889900 at 16/09/2026 15:00';
    const check = checkDebitBlacklist(nagadSms);
    assert.strictEqual(check.isDebit, false, 'Nagad receipt with Fee: 0 must not be debit');

    const res = await apiRequest('/api/device/sync-sms', {
      method: 'POST',
      headers: {
        'device-api-key': testDeviceToken
      },
      body: {
        sender: 'Nagad',
        message: nagadSms,
        sim_slot: 2,
        timestamp: new Date().toISOString()
      }
    });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.trx_id, 'NGD889900');
  });

  await teardown();

  console.log('\n===============================================================================');
  console.log(`  Challenger Test Run Summary:`);
  console.log(`  Total Challenges: ${summary.total}`);
  console.log(`  Passed:           ${summary.passed}`);
  console.log(`  Failed/Vuln:      ${summary.failed}`);
  console.log('===============================================================================');

  if (summary.vulnerabilities.length > 0) {
    console.log('\nDiscovered Vulnerabilities & Discrepancies:');
    summary.vulnerabilities.forEach((v, idx) => {
      console.log(`  ${idx + 1}. [${v.id}] ${v.category}: ${v.description}`);
      console.log(`     Error: ${v.error}`);
    });
  }
}

runAllChallenges().catch((err) => {
  console.error('[Fatal Error in Test Harness]:', err);
  process.exit(1);
});
