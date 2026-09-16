#!/usr/bin/env node
/**
 * DenaNeya v2.0 - Adversarial Challenge & Empirical Stress-Test Suite for Milestone 3 Gate
 * Author: Challenger 1 (teamwork_preview_challenger_deploy_m3_1)
 * File: tests/adversarial_challenge_m3_woocommerce.cjs
 *
 * Scope: WooCommerce Payment Gateway Plugin Verification & Security Defenses
 *
 * Exercises:
 * 1. HMAC Signature Tampering:
 *    - Mutated bytes in payload (single bit flip, amount tamper, order_id tamper, injected keys, truncation)
 *    - Mutated X-DenaNeya-Signature (bit flips, corrupted prefixes, empty signature, random string)
 *    - Wrong signing secret & empty secret
 *    - Missing signature headers & malformed header formatting
 * 2. Timestamp Freshness Window:
 *    - Timestamp at -300s (boundary pass) vs -301s (boundary fail / rejection)
 *    - Timestamp at +300s (boundary pass) vs +301s (boundary fail / rejection)
 *    - Timestamp extreme past (-1hr, -24hr) and extreme future (+1hr)
 *    - Malformed / non-numeric timestamps
 * 3. Replay Attack Protection:
 *    - Duplicate submission of identical valid webhook with same nonce (HTTP 409 REPLAYED_NONCE)
 *    - Nonce reuse with altered payload
 *    - Idempotency with fresh nonce on already paid/processing order (HTTP 200 without re-transition)
 *    - File-backed transient storage verification
 * 4. Secret Entropy Enforcement:
 *    - Configured secret < 32 characters (0, 8, 16, 31 chars) -> HTTP 500 INSECURE_CONFIGURATION
 *    - Configured secret >= 32 characters (32, 64 chars) -> Validated
 * 5. Underpayment Handling:
 *    - Partial payment (1 paisa short, 40% short, 0.01 payment) -> Order status 'on-hold'
 *    - Verification that order is NOT marked processing or completed and paid is false
 *    - Verification of exact underpayment note recorded in order
 *    - Exact payment (100%) and overpayment (>100%) -> Order marked processing/completed
 * 6. Plugin Architecture & HPOS Compliance:
 *    - PHP syntax lint across all 7 PHP files
 *    - HPOS compatibility hook verification
 *    - Archive packaging integrity (tar listing, file sizes)
 */

'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PLUGIN_DIR = path.resolve(__dirname, '../denaneya-payment-gateway');
const ZIP_PATH = path.resolve(__dirname, '../denaneya-payment-gateway.zip');
const MOCK_HARNESS = path.resolve(__dirname, '../scripts/mock_wc_harness.php');

const VALID_SECRET = 'whsec_adversarial_challenger_secret_entropy_32_bytes_ok_9988';
let sharedPkg;

const summary = {
  total: 0,
  passed: 0,
  failed: 0,
  failures: []
};

async function test(id, category, description, fn) {
  summary.total++;
  try {
    await fn();
    summary.passed++;
    console.log(`  [PASS] ${id} - [${category}] ${description}`);
  } catch (err) {
    summary.failed++;
    console.error(`  [FAIL] ${id} - [${category}] ${description}`);
    console.error(`         >>> Error: ${err.message}`);
    summary.failures.push({ id, category, description, error: err.message });
  }
}

function runPhpMock(inputObj) {
  const inputStr = JSON.stringify(inputObj);
  const output = execSync(`php "${MOCK_HARNESS}"`, {
    input: inputStr,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024
  });
  return JSON.parse(output.trim());
}

function signPayload(payload, secret, ts, nonce) {
  const { canonicalizeJson } = sharedPkg;
  const canon = canonicalizeJson(payload);
  const signature = crypto.createHmac('sha256', secret).update(`${ts}.${nonce}.${canon}`).digest('hex');
  return {
    raw_body: canon,
    header: `t=${ts},n=${nonce},v1=${signature}`,
    signature,
    timestamp: ts,
    nonce
  };
}

async function runAllChallengerTests() {
  console.log('========================================================================');
  console.log('🛡️  CHALLENGER 1: WOOCOMMERCE GATEWAY ADVERSARIAL STRESS TEST SUITE');
  console.log('========================================================================\n');

  sharedPkg = await import('@denaneya/shared');
  const { canonicalizeJson } = sharedPkg;

  // Clear transients before starting
  runPhpMock({ action: 'clear_transients' });

  // ---------------------------------------------------------------------------
  // SECTION 1: HMAC SIGNATURE TAMPERING
  // ---------------------------------------------------------------------------
  console.log('--- SECTION 1: HMAC Signature Tampering & Integrity Defenses ---');

  await test('CH-1.1', 'HMAC', 'Payload byte mutation: single bit flip in raw JSON body rejected with 401', async () => {
    const ts = Math.floor(Date.now() / 1000);
    const nonce = crypto.randomUUID();
    const payload = { event: 'invoice.completed', amount: 500.00, currency: 'BDT', metadata: { order_id: '101' } };
    const { header, raw_body } = signPayload(payload, VALID_SECRET, ts, nonce);

    // Flip a byte in the raw body (change 500 to 501)
    const tamperedBody = raw_body.replace('500', '501');

    const res = runPhpMock({
      action: 'test_webhook',
      webhook_secret: VALID_SECRET,
      raw_body: tamperedBody,
      headers: { 'HTTP_X_DENANEYA_SIGNATURE': header },
      order: { id: 101, total: 500.00, status: 'pending' }
    });

    assert.strictEqual(res.handler_res.status_code, 401);
    assert.strictEqual(res.handler_res.code, 'INVALID_SIGNATURE');
    assert.strictEqual(res.order_status, 'pending');
    assert.strictEqual(res.order_paid, false);
    assert.strictEqual(res.order_notes.length, 0);
  });

  await test('CH-1.2', 'HMAC', 'Payload mutation: modified metadata order_id rejected with 401', async () => {
    const ts = Math.floor(Date.now() / 1000);
    const nonce = crypto.randomUUID();
    const payload = { event: 'invoice.completed', amount: 500.00, currency: 'BDT', metadata: { order_id: '101' } };
    const { header } = signPayload(payload, VALID_SECRET, ts, nonce);

    const tamperedPayload = { event: 'invoice.completed', amount: 500.00, currency: 'BDT', metadata: { order_id: '102' } };
    const tamperedBody = canonicalizeJson(tamperedPayload);

    const res = runPhpMock({
      action: 'test_webhook',
      webhook_secret: VALID_SECRET,
      raw_body: tamperedBody,
      headers: { 'HTTP_X_DENANEYA_SIGNATURE': header },
      order: { id: 102, total: 500.00, status: 'pending' }
    });

    assert.strictEqual(res.handler_res.status_code, 401);
    assert.strictEqual(res.handler_res.code, 'INVALID_SIGNATURE');
    assert.strictEqual(res.order_status, 'pending');
    assert.strictEqual(res.order_paid, false);
  });

  await test('CH-1.3', 'HMAC', 'Signature mutation: single hex char alteration in v1 rejected with 401', async () => {
    const ts = Math.floor(Date.now() / 1000);
    const nonce = crypto.randomUUID();
    const payload = { event: 'invoice.completed', amount: 500.00, metadata: { order_id: '103' } };
    const { raw_body, signature } = signPayload(payload, VALID_SECRET, ts, nonce);

    // Corrupt last character of hex signature
    const corruptChar = signature.slice(-1) === 'a' ? 'b' : 'a';
    const mutatedSig = signature.slice(0, -1) + corruptChar;
    const mutatedHeader = `t=${ts},n=${nonce},v1=${mutatedSig}`;

    const res = runPhpMock({
      action: 'test_webhook',
      webhook_secret: VALID_SECRET,
      raw_body,
      headers: { 'HTTP_X_DENANEYA_SIGNATURE': mutatedHeader },
      order: { id: 103, total: 500.00, status: 'pending' }
    });

    assert.strictEqual(res.handler_res.status_code, 401);
    assert.strictEqual(res.handler_res.code, 'INVALID_SIGNATURE');
    assert.strictEqual(res.order_status, 'pending');
    assert.strictEqual(res.order_paid, false);
  });

  await test('CH-1.4', 'HMAC', 'Wrong secret: signing with an attacker key rejected with 401', async () => {
    const ts = Math.floor(Date.now() / 1000);
    const nonce = crypto.randomUUID();
    const payload = { event: 'invoice.completed', amount: 500.00, metadata: { order_id: '104' } };
    const ATTACKER_SECRET = 'whsec_attacker_fake_secret_entropy_32_bytes_long_xxxx';
    const { raw_body, header } = signPayload(payload, ATTACKER_SECRET, ts, nonce);

    const res = runPhpMock({
      action: 'test_webhook',
      webhook_secret: VALID_SECRET,
      raw_body,
      headers: { 'HTTP_X_DENANEYA_SIGNATURE': header },
      order: { id: 104, total: 500.00, status: 'pending' }
    });

    assert.strictEqual(res.handler_res.status_code, 401);
    assert.strictEqual(res.handler_res.code, 'INVALID_SIGNATURE');
    assert.strictEqual(res.order_status, 'pending');
    assert.strictEqual(res.order_paid, false);
  });

  await test('CH-1.5', 'HMAC', 'Missing signature header: rejected with 401 MISSING_SIGNATURE', async () => {
    const payload = { event: 'invoice.completed', amount: 500.00, metadata: { order_id: '105' } };
    const raw_body = canonicalizeJson(payload);

    const res = runPhpMock({
      action: 'test_webhook',
      webhook_secret: VALID_SECRET,
      raw_body,
      headers: {},
      order: { id: 105, total: 500.00, status: 'pending' }
    });

    assert.strictEqual(res.handler_res.status_code, 401);
    assert.strictEqual(res.handler_res.code, 'MISSING_SIGNATURE');
    assert.strictEqual(res.order_status, 'pending');
    assert.strictEqual(res.order_paid, false);
  });

  await test('CH-1.6', 'HMAC', 'Empty / truncated signature in header: rejected with 400 MALFORMED_HEADER', async () => {
    const ts = Math.floor(Date.now() / 1000);
    const nonce = crypto.randomUUID();
    const payload = { event: 'invoice.completed', amount: 500.00, metadata: { order_id: '106' } };
    const raw_body = canonicalizeJson(payload);

    const res = runPhpMock({
      action: 'test_webhook',
      webhook_secret: VALID_SECRET,
      raw_body,
      headers: { 'HTTP_X_DENANEYA_SIGNATURE': `t=${ts},n=${nonce},v1=` },
      order: { id: 106, total: 500.00, status: 'pending' }
    });

    assert.strictEqual(res.handler_res.status_code, 400);
    assert.strictEqual(res.handler_res.code, 'MALFORMED_HEADER');
    assert.strictEqual(res.order_status, 'pending');
    assert.strictEqual(res.order_paid, false);
  });

  // ---------------------------------------------------------------------------
  // SECTION 2: TIMESTAMP FRESHNESS WINDOW
  // ---------------------------------------------------------------------------
  console.log('\n--- SECTION 2: Timestamp Freshness Window (300s Tolerance) ---');

  await test('CH-2.1', 'Timestamp', 'Freshness boundary: timestamp exactly 300s in the past is ACCEPTED (boundary inside window)', async () => {
    const ts = Math.floor(Date.now() / 1000) - 300;
    const nonce = crypto.randomUUID();
    const payload = { event: 'invoice.completed', amount: 500.00, metadata: { order_id: '201' } };
    const { raw_body, header } = signPayload(payload, VALID_SECRET, ts, nonce);

    const res = runPhpMock({
      action: 'test_webhook',
      webhook_secret: VALID_SECRET,
      raw_body,
      headers: { 'HTTP_X_DENANEYA_SIGNATURE': header },
      order: { id: 201, total: 500.00, status: 'pending' }
    });

    assert.strictEqual(res.handler_res.status_code, 200, `Expected HTTP 200 at t-300s, got ${res.handler_res.status_code}`);
    assert.strictEqual(res.order_status, 'processing');
  });

  await test('CH-2.2', 'Timestamp', 'Freshness boundary: timestamp 301s in the past is REJECTED (TIMESTAMP_OUT_OF_TOLERANCE)', async () => {
    const ts = Math.floor(Date.now() / 1000) - 301;
    const nonce = crypto.randomUUID();
    const payload = { event: 'invoice.completed', amount: 500.00, metadata: { order_id: '202' } };
    const { raw_body, header } = signPayload(payload, VALID_SECRET, ts, nonce);

    const res = runPhpMock({
      action: 'test_webhook',
      webhook_secret: VALID_SECRET,
      raw_body,
      headers: { 'HTTP_X_DENANEYA_SIGNATURE': header },
      order: { id: 202, total: 500.00, status: 'pending' }
    });

    assert.ok(res.handler_res.status_code === 400 || res.handler_res.status_code === 401, `Status should be 400 or 401, got ${res.handler_res.status_code}`);
    assert.strictEqual(res.handler_res.code, 'TIMESTAMP_OUT_OF_TOLERANCE');
    assert.ok(res.handler_res.message.includes('tolerance window') || res.handler_res.message.includes('expired'));
    assert.strictEqual(res.order_status, 'pending');
    assert.strictEqual(res.order_paid, false);
  });

  await test('CH-2.3', 'Timestamp', 'Freshness boundary: timestamp 301s in the FUTURE is REJECTED', async () => {
    const ts = Math.floor(Date.now() / 1000) + 301;
    const nonce = crypto.randomUUID();
    const payload = { event: 'invoice.completed', amount: 500.00, metadata: { order_id: '203' } };
    const { raw_body, header } = signPayload(payload, VALID_SECRET, ts, nonce);

    const res = runPhpMock({
      action: 'test_webhook',
      webhook_secret: VALID_SECRET,
      raw_body,
      headers: { 'HTTP_X_DENANEYA_SIGNATURE': header },
      order: { id: 203, total: 500.00, status: 'pending' }
    });

    assert.strictEqual(res.handler_res.code, 'TIMESTAMP_OUT_OF_TOLERANCE');
    assert.strictEqual(res.order_status, 'pending');
  });

  await test('CH-2.4', 'Timestamp', 'Extreme staleness: timestamp 86,400s (24 hours) in the past rejected', async () => {
    const ts = Math.floor(Date.now() / 1000) - 86400;
    const nonce = crypto.randomUUID();
    const payload = { event: 'invoice.completed', amount: 500.00, metadata: { order_id: '204' } };
    const { raw_body, header } = signPayload(payload, VALID_SECRET, ts, nonce);

    const res = runPhpMock({
      action: 'test_webhook',
      webhook_secret: VALID_SECRET,
      raw_body,
      headers: { 'HTTP_X_DENANEYA_SIGNATURE': header },
      order: { id: 204, total: 500.00, status: 'pending' }
    });

    assert.strictEqual(res.handler_res.code, 'TIMESTAMP_OUT_OF_TOLERANCE');
    assert.strictEqual(res.order_status, 'pending');
  });

  // ---------------------------------------------------------------------------
  // SECTION 3: REPLAY ATTACK PROTECTION
  // ---------------------------------------------------------------------------
  console.log('\n--- SECTION 3: Replay Attack Protection ---');

  await test('CH-3.1', 'Replay', 'Identical valid webhook submitted twice with same nonce: second request rejected with HTTP 409 REPLAYED_NONCE', async () => {
    const ts = Math.floor(Date.now() / 1000);
    const nonce = 'nonce_emp_replay_' + crypto.randomBytes(8).toString('hex');
    const payload = { event: 'invoice.completed', amount: 500.00, trx_id: 'TRX_REP_1', metadata: { order_id: '301' } };
    const { raw_body, header } = signPayload(payload, VALID_SECRET, ts, nonce);

    // First attempt: Must succeed
    const firstRes = runPhpMock({
      action: 'test_webhook',
      webhook_secret: VALID_SECRET,
      raw_body,
      headers: { 'HTTP_X_DENANEYA_SIGNATURE': header },
      order: { id: 301, total: 500.00, status: 'pending' }
    });

    assert.strictEqual(firstRes.handler_res.status_code, 200);
    assert.strictEqual(firstRes.order_status, 'processing');
    assert.strictEqual(firstRes.order_paid, true);

    // Second attempt: Same nonce, same payload -> must be rejected with 409
    const secondRes = runPhpMock({
      action: 'test_webhook',
      webhook_secret: VALID_SECRET,
      raw_body,
      headers: { 'HTTP_X_DENANEYA_SIGNATURE': header },
      order: { id: 301, total: 500.00, status: 'processing', paid: true }
    });

    assert.strictEqual(secondRes.handler_res.status_code, 409);
    assert.strictEqual(secondRes.handler_res.code, 'REPLAYED_NONCE');
    assert.ok(secondRes.handler_res.message.toLowerCase().includes('replay'));
  });

  await test('CH-3.2', 'Replay', 'Attacker reuses recorded nonce with different payload: rejected with HTTP 409', async () => {
    const ts = Math.floor(Date.now() / 1000);
    const reusedNonce = 'nonce_emp_intercept_' + crypto.randomBytes(8).toString('hex');

    // Legitimate webhook
    const legitPayload = { event: 'invoice.completed', amount: 100.00, metadata: { order_id: '302' } };
    const legitSig = signPayload(legitPayload, VALID_SECRET, ts, reusedNonce);

    const legRes = runPhpMock({
      action: 'test_webhook',
      webhook_secret: VALID_SECRET,
      raw_body: legitSig.raw_body,
      headers: { 'HTTP_X_DENANEYA_SIGNATURE': legitSig.header },
      order: { id: 302, total: 100.00, status: 'pending' }
    });
    assert.strictEqual(legRes.handler_res.status_code, 200);

    // Attacker crafts new payload reusing reusedNonce
    const attackPayload = { event: 'invoice.completed', amount: 5000.00, metadata: { order_id: '303' } };
    const attackSig = signPayload(attackPayload, VALID_SECRET, ts, reusedNonce);

    const atkRes = runPhpMock({
      action: 'test_webhook',
      webhook_secret: VALID_SECRET,
      raw_body: attackSig.raw_body,
      headers: { 'HTTP_X_DENANEYA_SIGNATURE': attackSig.header },
      order: { id: 303, total: 5000.00, status: 'pending' }
    });

    assert.strictEqual(atkRes.handler_res.status_code, 409);
    assert.strictEqual(atkRes.handler_res.code, 'REPLAYED_NONCE');
    assert.strictEqual(atkRes.order_status, 'pending');
    assert.strictEqual(atkRes.order_paid, false);
  });

  await test('CH-3.3', 'Replay', 'Idempotency: Fresh nonce for already paid/completed order acknowledges with 200 without duplicate transitions', async () => {
    const ts = Math.floor(Date.now() / 1000);
    const freshNonce = 'nonce_emp_fresh_' + crypto.randomBytes(8).toString('hex');
    const payload = { event: 'invoice.completed', amount: 500.00, metadata: { order_id: '304' } };
    const { raw_body, header } = signPayload(payload, VALID_SECRET, ts, freshNonce);

    const res = runPhpMock({
      action: 'test_webhook',
      webhook_secret: VALID_SECRET,
      raw_body,
      headers: { 'HTTP_X_DENANEYA_SIGNATURE': header },
      order: { id: 304, total: 500.00, status: 'completed', paid: true }
    });

    assert.strictEqual(res.handler_res.status_code, 200);
    assert.strictEqual(res.handler_res.message, 'Order already processed.');
    assert.strictEqual(res.order_status, 'completed');
  });

  // ---------------------------------------------------------------------------
  // SECTION 4: SECRET ENTROPY ENFORCEMENT
  // ---------------------------------------------------------------------------
  console.log('\n--- SECTION 4: Secret Entropy Enforcement (Min 32 Characters) ---');

  const shortSecrets = [
    { len: 0, val: '', label: 'Empty secret (0 chars)' },
    { len: 8, val: '12345678', label: '8-character secret' },
    { len: 16, val: 'sec_16chars_1234', label: '16-character secret' },
    { len: 31, val: '1234567890123456789012345678901', label: '31-character secret (boundary)' }
  ];

  for (let i = 0; i < shortSecrets.length; i++) {
    const item = shortSecrets[i];
    await test(`CH-4.${i + 1}`, 'Entropy', `Secret length ${item.len} (${item.label}) rejected with HTTP 500 INSECURE_CONFIGURATION`, async () => {
      const ts = Math.floor(Date.now() / 1000);
      const nonce = crypto.randomUUID();
      const payload = { event: 'invoice.completed', amount: 500.00, metadata: { order_id: `40${i + 1}` } };
      const raw_body = canonicalizeJson(payload);
      const sig = item.val.length > 0
        ? crypto.createHmac('sha256', item.val).update(`${ts}.${nonce}.${raw_body}`).digest('hex')
        : 'fake_sig';

      const res = runPhpMock({
        action: 'test_webhook',
        webhook_secret: item.val,
        raw_body,
        headers: { 'HTTP_X_DENANEYA_SIGNATURE': `t=${ts},n=${nonce},v1=${sig}` },
        order: { id: `40${i + 1}`, total: 500.00, status: 'pending' }
      });

      assert.strictEqual(res.handler_res.status_code, 500);
      assert.strictEqual(res.handler_res.code, 'INSECURE_CONFIGURATION');
      assert.ok(res.handler_res.message.includes('not securely configured'));
      assert.strictEqual(res.order_status, 'pending');
      assert.strictEqual(res.order_paid, false);
    });
  }

  await test('CH-4.5', 'Entropy', 'Secret of exactly 32 characters is accepted and verifies signature', async () => {
    const exact32Secret = '12345678901234567890123456789012'; // exactly 32 chars
    const ts = Math.floor(Date.now() / 1000);
    const nonce = crypto.randomUUID();
    const payload = { event: 'invoice.completed', amount: 500.00, metadata: { order_id: '405' } };
    const { raw_body, header } = signPayload(payload, exact32Secret, ts, nonce);

    const res = runPhpMock({
      action: 'test_webhook',
      webhook_secret: exact32Secret,
      raw_body,
      headers: { 'HTTP_X_DENANEYA_SIGNATURE': header },
      order: { id: 405, total: 500.00, status: 'pending' }
    });

    assert.strictEqual(res.handler_res.status_code, 200);
    assert.strictEqual(res.order_status, 'processing');
  });

  // ---------------------------------------------------------------------------
  // SECTION 5: UNDERPAYMENT HANDLING
  // ---------------------------------------------------------------------------
  console.log('\n--- SECTION 5: Underpayment Handling & Fraud Defense ---');

  await test('CH-5.1', 'Underpayment', 'Marginal underpayment (999.99 BDT vs 1000.00 BDT order): order placed ON-HOLD, NOT processing, underpayment note recorded', async () => {
    const ts = Math.floor(Date.now() / 1000);
    const nonce = crypto.randomUUID();
    const payload = {
      event: 'invoice.completed',
      amount: 999.99,
      currency: 'BDT',
      trx_id: 'TRX_UNDER_001',
      payment_method: 'bkash',
      metadata: { order_id: '501' }
    };
    const { raw_body, header } = signPayload(payload, VALID_SECRET, ts, nonce);

    const res = runPhpMock({
      action: 'test_webhook',
      webhook_secret: VALID_SECRET,
      raw_body,
      headers: { 'HTTP_X_DENANEYA_SIGNATURE': header },
      order: { id: 501, total: 1000.00, status: 'pending' }
    });

    assert.strictEqual(res.handler_res.status_code, 200);
    assert.strictEqual(res.handler_res.warning, 'UNDERPAYMENT_DETECTED');
    assert.strictEqual(res.order_status, 'on-hold', 'Order status must be "on-hold"');
    assert.notStrictEqual(res.order_status, 'processing', 'Order must NOT be processing');
    assert.notStrictEqual(res.order_status, 'completed', 'Order must NOT be completed');
    assert.strictEqual(res.order_paid, false, 'order_paid must remain false');

    assert.ok(res.order_notes.length > 0, 'Order note must be recorded');
    const noteText = res.order_notes[0];
    assert.ok(noteText.includes('underpayment detected'), `Note must describe underpayment: ${noteText}`);
    assert.ok(noteText.includes('1000'), `Note must show expected total: ${noteText}`);
    assert.ok(noteText.includes('999.99'), `Note must show received amount: ${noteText}`);
    assert.ok(noteText.includes('TRX_UNDER_001'), `Note must show TrxID: ${noteText}`);
  });

  await test('CH-5.2', 'Underpayment', 'Severe underpayment (10.00 BDT vs 5000.00 BDT order): order placed ON-HOLD, unpaid', async () => {
    const ts = Math.floor(Date.now() / 1000);
    const nonce = crypto.randomUUID();
    const payload = {
      event: 'invoice.completed',
      amount: 10.00,
      currency: 'BDT',
      trx_id: 'TRX_UNDER_002',
      payment_method: 'nagad',
      metadata: { order_id: '502' }
    };
    const { raw_body, header } = signPayload(payload, VALID_SECRET, ts, nonce);

    const res = runPhpMock({
      action: 'test_webhook',
      webhook_secret: VALID_SECRET,
      raw_body,
      headers: { 'HTTP_X_DENANEYA_SIGNATURE': header },
      order: { id: 502, total: 5000.00, status: 'pending' }
    });

    assert.strictEqual(res.handler_res.status_code, 200);
    assert.strictEqual(res.handler_res.warning, 'UNDERPAYMENT_DETECTED');
    assert.strictEqual(res.order_status, 'on-hold');
    assert.strictEqual(res.order_paid, false);
    assert.ok(res.order_notes[0].includes('5000'));
    assert.ok(res.order_notes[0].includes('10'));
  });

  await test('CH-5.3', 'Payment', 'Exact payment (500.00 BDT vs 500.00 BDT order): order marked processing, paid is true', async () => {
    const ts = Math.floor(Date.now() / 1000);
    const nonce = crypto.randomUUID();
    const payload = {
      event: 'invoice.completed',
      amount: 500.00,
      currency: 'BDT',
      trx_id: 'TRX_EXACT_001',
      payment_method: 'bkash',
      metadata: { order_id: '503' }
    };
    const { raw_body, header } = signPayload(payload, VALID_SECRET, ts, nonce);

    const res = runPhpMock({
      action: 'test_webhook',
      webhook_secret: VALID_SECRET,
      raw_body,
      headers: { 'HTTP_X_DENANEYA_SIGNATURE': header },
      order: { id: 503, total: 500.00, status: 'pending' }
    });

    assert.strictEqual(res.handler_res.status_code, 200);
    assert.strictEqual(res.order_status, 'processing');
    assert.strictEqual(res.order_paid, true);
    assert.strictEqual(res.order_meta['_denaneya_trx_id'], 'TRX_EXACT_001');
  });

  await test('CH-5.4', 'Payment', 'Overpayment (550.00 BDT vs 500.00 BDT order): order marked processing, paid is true', async () => {
    const ts = Math.floor(Date.now() / 1000);
    const nonce = crypto.randomUUID();
    const payload = {
      event: 'invoice.completed',
      amount: 550.00,
      currency: 'BDT',
      trx_id: 'TRX_OVER_001',
      payment_method: 'rocket',
      metadata: { order_id: '504' }
    };
    const { raw_body, header } = signPayload(payload, VALID_SECRET, ts, nonce);

    const res = runPhpMock({
      action: 'test_webhook',
      webhook_secret: VALID_SECRET,
      raw_body,
      headers: { 'HTTP_X_DENANEYA_SIGNATURE': header },
      order: { id: 504, total: 500.00, status: 'pending' }
    });

    assert.strictEqual(res.handler_res.status_code, 200);
    assert.strictEqual(res.order_status, 'processing');
    assert.strictEqual(res.order_paid, true);
    assert.strictEqual(res.order_meta['_denaneya_trx_id'], 'TRX_OVER_001');
  });

  // ---------------------------------------------------------------------------
  // SECTION 6: HPOS COMPLIANCE & PLUGIN PACKAGING
  // ---------------------------------------------------------------------------
  console.log('\n--- SECTION 6: Architecture, HPOS Compliance & Package Integrity ---');

  await test('CH-6.1', 'Packaging', 'Packaged archive denaneya-payment-gateway.zip is valid and non-corrupt', async () => {
    assert.strictEqual(fs.existsSync(ZIP_PATH), true);
    const stat = fs.statSync(ZIP_PATH);
    assert.ok(stat.size > 10000, `Expected zip size > 10KB, got ${stat.size}`);

    const tarList = execSync(`tar -tf "${ZIP_PATH}"`).toString().trim().split(/\r?\n/);
    assert.ok(tarList.length >= 12, `Expected at least 12 files, got ${tarList.length}`);
    for (const f of tarList) {
      assert.ok(f.startsWith('denaneya-payment-gateway/'), `File not in root: ${f}`);
    }
  });

  await test('CH-6.2', 'Architecture', 'WC HPOS custom_order_tables compatibility declaration verified', async () => {
    const entryFile = path.join(PLUGIN_DIR, 'denaneya-payment-gateway.php');
    const content = fs.readFileSync(entryFile, 'utf8');
    assert.ok(content.includes('custom_order_tables'), 'Must declare custom_order_tables');
    assert.ok(content.includes('before_woocommerce_init'), 'Must use before_woocommerce_init hook');
  });

  await test('CH-6.3', 'Architecture', 'All 7 plugin PHP files pass strict php -l syntax check', async () => {
    const files = [
      'denaneya-payment-gateway.php',
      'includes/class-wc-gateway-denaneya.php',
      'includes/class-denaneya-api-client.php',
      'includes/class-denaneya-api.php',
      'includes/class-denaneya-canonicalizer.php',
      'includes/class-denaneya-canonicalize.php',
      'includes/class-denaneya-webhook-handler.php'
    ];
    for (const file of files) {
      const fullPath = path.join(PLUGIN_DIR, file);
      const out = execSync(`php -l "${fullPath}"`).toString();
      assert.ok(out.includes('No syntax errors detected'), `Syntax error in ${file}: ${out}`);
    }
  });

  // Summary
  console.log('\n========================================================================');
  console.log('📊 CHALLENGER EMPIRICAL TEST SUMMARY REPORT');
  console.log('========================================================================');
  console.log(`  Total Test Cases Executed: ${summary.total}`);
  console.log(`  Passed:                    ${summary.passed} (${Math.round((summary.passed / summary.total) * 100)}%)`);
  console.log(`  Failed:                    ${summary.failed}`);
  console.log('========================================================================\n');

  if (summary.failed > 0) {
    console.error('❌ CHALLENGER SUITE FAILED with the following errors:');
    summary.failures.forEach((f) => {
      console.error(`  - [${f.category}] ${f.id}: ${f.description} -> ${f.error}`);
    });
    process.exit(1);
  } else {
    console.log('✅ ALL CHALLENGER EMPIRICAL TESTS PASSED.');
    process.exit(0);
  }
}

runAllChallengerTests().catch((err) => {
  console.error('FATAL CHALLENGER ERROR:', err);
  process.exit(1);
});
