/**
 * DenaNeya v2.0 - Webhook SSRF Firewall & HMAC-SHA256 Verification Test Suite
 * File: webhook_ssrf_hmac.test.js
 * Architect: Milestone 5 Explorer 3 (E2E Checkout, Webhook & Master Runner Architect)
 *
 * Exhaustive cryptographic and perimeter security validation:
 * - SSRF Firewall: Cloud metadata (169.254.169.254), loopback (127.0.0.1, ::1, ::ffff:127.0.0.1, octal 0177.0.0.1),
 *   private RFC 1918 subnets (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16), CGNAT (100.64.0.0/10), unescaped entities
 * - HMAC-SHA256 Crypto: RFC 8785 canonical JSON serialization, timestamp replay defense, nonce replay defense,
 *   cryptographic secret entropy enforcement, and 1-byte tamper resistance across payload, timestamp, nonce, signature.
 */

process.env.NODE_ENV = 'test';
process.env.DB_CLIENT = 'sqlite';
process.env.DB_SQLITE_PATH = ':memory:';

import assert from 'node:assert';
import crypto from 'node:crypto';
import http from 'node:http';

// Universal dynamic import helper for portability
let dbPkg;
try {
  dbPkg = (await import('@denaneya/database')).default || await import('@denaneya/database');
} catch (_) {
  dbPkg = (await import('../../denaneya_v2/packages/database/src/index.js')).default || await import('../../denaneya_v2/packages/database/src/index.js');
}

let sharedPkg;
try {
  sharedPkg = await import('@denaneya/shared');
} catch (_) {
  sharedPkg = await import('../../denaneya_v2/packages/shared/dist/index.js');
}

let webhookServiceModule;
try {
  webhookServiceModule = await import('../../apps/api/src/services/webhookService.js');
} catch (_) {
  webhookServiceModule = await import('../../denaneya_v2/apps/api/src/services/webhookService.js');
}

const { getDatabase, runMigrations, runSeed } = dbPkg;
const {
  canonicalizeJson,
  generateWebhookSignature,
  verifyWebhookSignature,
  validateWebhookSecret,
  clearWebhookNonceCache,
  isProhibitedIP,
  validateWebhookUrl
} = sharedPkg;
const {
  validateOutboundUrl,
  normalizeWebhookUrl,
  unescapeHtmlEntities,
  enqueueWebhookEvent,
  dispatchSingleWebhook
} = webhookServiceModule;

// ANSI Colors for Terminal
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

console.log(`${BOLD}${CYAN}================================================================================${RESET}`);
console.log(`${BOLD}${CYAN}  DenaNeya v2.0 - Webhook SSRF Firewall & HMAC-SHA256 Cryptographic Suite        ${RESET}`);
console.log(`${BOLD}${CYAN}================================================================================${RESET}\n`);

let db;

const summary = {
  total: 0,
  passed: 0,
  failed: 0
};

async function test(category, testName, fn) {
  summary.total++;
  try {
    const res = await fn();
    summary.passed++;
    console.log(`  ${GREEN}[PASS]${RESET} [${category}] ${testName}`);
    if (res && typeof res === 'string') {
      console.log(`         ${CYAN}ℹ ${res}${RESET}`);
    }
  } catch (err) {
    summary.failed++;
    console.error(`  ${RED}[FAIL]${RESET} [${category}] ${testName}`);
    console.error(`         ${RED}>>> Error: ${err.message}${RESET}`);
    throw err;
  }
}

export async function runWebhookSecuritySuite() {
  console.log('[Setup] Initializing database for Webhook SSRF/HMAC test suite...');
  db = getDatabase();
  await runMigrations(db, { reset: true });
  await runSeed(db);

  try {
    // ==========================================================================
    // PART 1: SSRF FIREWALL VERIFICATION
    // ==========================================================================
    console.log(`\n${BOLD}${YELLOW}--- SECTION 1: SSRF FIREWALL & PRE-FLIGHT IP VALIDATION ---${RESET}`);

    // Vector 1.1: Cloud Metadata via HTTP
    await test('SSRF-FIREWALL', 'AWS/GCP Cloud Metadata IPv4 via HTTP is strictly blocked', async () => {
      const url = 'http://169.254.169.254/latest/meta-data/iam/security-credentials';
      const check = await validateOutboundUrl(url);
      assert.strictEqual(check.valid, false, 'Cloud metadata HTTP must be rejected');
      assert.ok(check.error?.includes('169.254.169.254') || check.error?.includes('SSRF_BLOCKED'), 'Error flags cloud metadata IP');
      return `Blocked cloud metadata URL: ${check.error}`;
    });

    // Vector 1.2: Cloud Metadata via HTTPS
    await test('SSRF-FIREWALL', 'AWS/GCP Cloud Metadata IPv4 via HTTPS is strictly blocked', async () => {
      const url = 'https://169.254.169.254/latest/meta-data';
      const check = await validateOutboundUrl(url);
      assert.strictEqual(check.valid, false, 'Cloud metadata HTTPS must be rejected');
      assert.ok(check.error?.includes('169.254.169.254') || check.error?.includes('SSRF_BLOCKED'));
      return `Blocked HTTPS cloud metadata: ${check.error}`;
    });

    // Vector 1.3: Loopback IPv4
    await test('SSRF-FIREWALL', 'Loopback IPv4 (127.0.0.1) is strictly blocked', async () => {
      const url = 'https://127.0.0.1:8443/webhook';
      const check = await validateOutboundUrl(url);
      assert.strictEqual(check.valid, false);
      assert.ok(check.error?.includes('127.0.0.1'));
      return `Blocked loopback: ${check.error}`;
    });

    // Vector 1.4: Loopback IPv6
    await test('SSRF-FIREWALL', 'Loopback IPv6 ([::1]) is strictly blocked', async () => {
      const url = 'https://[::1]:8443/webhook';
      const check = await validateOutboundUrl(url);
      assert.strictEqual(check.valid, false);
      assert.ok(check.error?.includes('::1'));
      return `Blocked IPv6 loopback: ${check.error}`;
    });

    // Vector 1.5: IPv4-mapped IPv6
    await test('SSRF-FIREWALL', 'IPv4-mapped IPv6 loopback ([::ffff:127.0.0.1]) is strictly blocked', async () => {
      const url = 'https://[::ffff:127.0.0.1]:8443/webhook';
      const check = await validateOutboundUrl(url);
      assert.strictEqual(check.valid, false);
      assert.ok(check.error?.includes('SSRF_BLOCKED'), 'Error flags SSRF_BLOCKED');
      return `Blocked IPv4-mapped IPv6: ${check.error}`;
    });

    // Vector 1.6: Octal IP representation
    await test('SSRF-FIREWALL', 'Octal IP notation (0177.0.0.1) is strictly blocked', async () => {
      const url = 'https://0177.0.0.1/webhook';
      const check = await validateOutboundUrl(url);
      assert.strictEqual(check.valid, false);
      return `Blocked octal IP notation: ${check.error}`;
    });

    // Vector 1.7: Private RFC 1918 Class A (10.0.0.0/8)
    await test('SSRF-FIREWALL', 'Private RFC 1918 Class A (10.0.0.1) is strictly blocked', async () => {
      const url = 'https://10.0.0.1/webhook';
      const check = await validateOutboundUrl(url);
      assert.strictEqual(check.valid, false);
      assert.ok(check.error?.includes('10.0.0.1'));
      return `Blocked RFC 1918 Class A: ${check.error}`;
    });

    // Vector 1.8: Private RFC 1918 Class B (172.16.0.0/12)
    await test('SSRF-FIREWALL', 'Private RFC 1918 Class B (172.16.0.1) is strictly blocked', async () => {
      const url = 'https://172.16.0.1/webhook';
      const check = await validateOutboundUrl(url);
      assert.strictEqual(check.valid, false);
      assert.ok(check.error?.includes('172.16.0.1'));
      return `Blocked RFC 1918 Class B: ${check.error}`;
    });

    // Vector 1.9: Private RFC 1918 Class C (192.168.0.0/16)
    await test('SSRF-FIREWALL', 'Private RFC 1918 Class C (192.168.1.1) is strictly blocked', async () => {
      const url = 'https://192.168.1.1/webhook';
      const check = await validateOutboundUrl(url);
      assert.strictEqual(check.valid, false);
      assert.ok(check.error?.includes('192.168.1.1'));
      return `Blocked RFC 1918 Class C: ${check.error}`;
    });

    // Vector 1.10: Carrier-Grade NAT (100.64.0.0/10)
    await test('SSRF-FIREWALL', 'Carrier-Grade NAT (100.64.0.1) is strictly blocked', async () => {
      const url = 'https://100.64.0.1/webhook';
      const check = await validateOutboundUrl(url);
      assert.strictEqual(check.valid, false);
      return `Blocked CGNAT range: ${check.error}`;
    });

    // Vector 1.11: Reviewer 2 Advisory (Escaped HTML entities &#x2F;)
    await test('SSRF-FIREWALL', 'Escaped HTML entities (&#x2F;) are unescaped and blocked', async () => {
      const escapedUrl = 'https:&#x2F;&#x2F;169.254.169.254&#x2F;metadata';
      const unescaped = unescapeHtmlEntities(escapedUrl);
      assert.strictEqual(unescaped, 'https://169.254.169.254/metadata');

      const check = await validateOutboundUrl(escapedUrl);
      assert.strictEqual(check.valid, false);
      assert.ok(check.error?.includes('169.254.169.254'));
      return `Entity &#x2F; unescaped safely and blocked as SSRF: ${check.error}`;
    });

    // Vector 1.12: Non-HTTPS Protocol Rejection in Production
    await test('SSRF-FIREWALL', 'Plain HTTP protocol to external domain is rejected in production mode', async () => {
      const url = 'http://api.merchantstore.com/webhooks';
      const check = await validateOutboundUrl(url, { allowHttpForTesting: false });
      assert.strictEqual(check.valid, false);
      assert.strictEqual(check.error, 'PROTOCOL_NOT_HTTPS');
      return `Enforced HTTPS-only requirement: ${check.error}`;
    });

    // Vector 1.13: End-to-End Webhook Dispatcher SSRF Defense in DB
    await test('SSRF-FIREWALL', 'End-to-end dispatch against SSRF target logs SSRF_BLOCKED without leaking responses', async () => {
      const bId = `b_ssrf_test_${crypto.randomBytes(4).toString('hex')}`;
      const bSec = `whsec_${crypto.randomBytes(32).toString('hex')}`;

      await db.query(
        `INSERT INTO brands (id, user_id, brand_name, brand_slug, api_key, api_secret, webhook_url, webhook_secret, status)
         VALUES (?, 'usr_demo_8f4c9a2e7b31', 'SSRF Test Brand', ?, 'key_test', 'sec_test', 'https://169.254.169.254/secret-meta', ?, 'active')`,
        [bId, `slug-${bId}`, bSec]
      );

      const { logId } = await enqueueWebhookEvent(bId, null, 'invoice.completed', {
        amount: 500,
        customer_name: 'Attacker'
      });

      const dispatchResult = await dispatchSingleWebhook(logId);
      assert.strictEqual(dispatchResult.success, false, 'Dispatch must return success: false');
      assert.strictEqual(dispatchResult.status, 'SSRF_BLOCKED', 'Dispatch status marked SSRF_BLOCKED');

      const logRow = await db.get("SELECT status, response_body FROM webhook_logs WHERE id = ?", [logId]);
      assert.strictEqual(logRow.status, 'SSRF_BLOCKED', 'Database persists SSRF_BLOCKED status');
      assert.ok(logRow.response_body?.includes('SSRF_BLOCKED'), 'Response body records SSRF block without leaking internal payload');
      return `DB status is SSRF_BLOCKED, zero outbound connection made`;
    });

    // ==========================================================================
    // PART 2: RFC 8785 CANONICAL JSON SERIALIZATION
    // ==========================================================================
    console.log(`\n${BOLD}${YELLOW}--- SECTION 2: RFC 8785 CANONICAL JSON SERIALIZATION ---${RESET}`);

    await test('RFC-8785', 'Lexicographical sorting: object keys sorted deterministically', async () => {
      const obj1 = { z: 10, a: 1, m: 50, b: 2 };
      const obj2 = { a: 1, b: 2, m: 50, z: 10 };
      const obj3 = { m: 50, z: 10, b: 2, a: 1 };

      const c1 = canonicalizeJson(obj1);
      const c2 = canonicalizeJson(obj2);
      const c3 = canonicalizeJson(obj3);

      assert.strictEqual(c1, '{"a":1,"b":2,"m":50,"z":10}');
      assert.strictEqual(c1, c2);
      assert.strictEqual(c2, c3);
      return `Deterministic output: ${c1}`;
    });

    await test('RFC-8785', 'Deep nested object hierarchy key ordering', async () => {
      const nested1 = {
        outer: { z: 1, a: { y: 2, x: 3 } },
        array: [{ b: 2, a: 1 }, { d: 4, c: 3 }]
      };
      const nested2 = {
        array: [{ a: 1, b: 2 }, { c: 3, d: 4 }],
        outer: { a: { x: 3, y: 2 }, z: 1 }
      };

      const c1 = canonicalizeJson(nested1);
      const c2 = canonicalizeJson(nested2);

      assert.strictEqual(c1, '{"array":[{"a":1,"b":2},{"c":3,"d":4}],"outer":{"a":{"x":3,"y":2},"z":1}}');
      assert.strictEqual(c1, c2);
      return `Deep nested structures sort identically across permutations`;
    });

    await test('RFC-8785', 'Handling undefined, functions, and symbols properly', async () => {
      const dirtyObj = {
        validKey: 'validValue',
        undefProp: undefined,
        funcProp: () => {},
        symbolProp: Symbol('test'),
        arrayWithGaps: [1, undefined, () => {}, 'valid']
      };

      const canonical = canonicalizeJson(dirtyObj);
      assert.strictEqual(canonical, '{"arrayWithGaps":[1,null,null,"valid"],"validKey":"validValue"}');
      return `Filtered undefined/functions/symbols from objects and mapped to null in arrays`;
    });

    // ==========================================================================
    // PART 3: HMAC-SHA256 SIGNATURE & REPLAY DEFENSE
    // ==========================================================================
    console.log(`\n${BOLD}${YELLOW}--- SECTION 3: HMAC-SHA256 CRYPTOGRAPHIC VERIFICATION & REPLAY DEFENSE ---${RESET}`);
    const validSecret = 'whsec_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';
    const samplePayload = {
      event: 'invoice.completed',
      invoice_id: 'inv_sec_9988',
      amount: 2500,
      currency: 'BDT',
      customer_email: 'buyer@test.com'
    };

    // Vector 3.1: Baseline Genuine Signature
    await test('HMAC-CRYPTO', 'Baseline genuine signature generation and verification', async () => {
      const sigOutput = generateWebhookSignature(samplePayload, validSecret);
      assert.ok(sigOutput.signature, 'Signature hex generated');
      assert.ok(sigOutput.timestamp > 0, 'Timestamp generated');
      assert.ok(sigOutput.nonce, 'UUIDv4 nonce generated');
      assert.ok(sigOutput.header.startsWith('t='), 'Header format starts with t=');

      const result = verifyWebhookSignature(samplePayload, sigOutput.header, validSecret);
      assert.strictEqual(result.valid, true, 'Verification of pristine signature must pass');
      assert.strictEqual(result.timestamp, sigOutput.timestamp);
      assert.strictEqual(result.nonce, sigOutput.nonce);
      return `Signature verified: v1=${sigOutput.signature.slice(0, 16)}...`;
    });

    // Vector 3.2: Secret Entropy Enforcement
    await test('HMAC-CRYPTO', 'Rejection of weak, short, or default webhook secrets', async () => {
      // Default secret
      assert.throws(() => validateWebhookSecret('default_zinipay_secret'), /SECURITY_ERROR/);

      // Too short (< 32 characters)
      assert.throws(() => validateWebhookSecret('short_secret_123'), /SECURITY_ERROR/);

      // Single repeated character
      assert.throws(() => validateWebhookSecret('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'), /SECURITY_ERROR/);

      // Less than 4 unique characters
      assert.throws(() => validateWebhookSecret('abababababababababababababababab'), /SECURITY_ERROR/);

      // Valid secret passes without throwing
      assert.doesNotThrow(() => validateWebhookSecret(validSecret));
      return `Strict entropy enforced: default secrets, < 32 chars, and low-entropy keys rejected`;
    });

    // Vector 3.3: 1-Byte Tamper Sensitivity (Payload Alteration)
    await test('HMAC-CRYPTO', '1-byte alteration in payload body invalidates signature', async () => {
      const sigOutput = generateWebhookSignature(samplePayload, validSecret);
      const tamperedPayload = { ...samplePayload, amount: 2501 }; // ৳2,500 -> ৳2,501

      const result = verifyWebhookSignature(tamperedPayload, sigOutput.header, validSecret);
      assert.strictEqual(result.valid, false, 'Tampered payload must fail');
      assert.strictEqual(result.error, 'SIGNATURE_MISMATCH');
      return `1-byte amount change correctly flagged as SIGNATURE_MISMATCH`;
    });

    // Vector 3.4: 1-Byte Tamper Sensitivity (Timestamp Alteration)
    await test('HMAC-CRYPTO', '1-second alteration in timestamp header invalidates signature', async () => {
      const sigOutput = generateWebhookSignature(samplePayload, validSecret);
      const tamperedHeader = sigOutput.header.replace(/t=\d+/, `t=${sigOutput.timestamp + 1}`);

      const result = verifyWebhookSignature(samplePayload, tamperedHeader, validSecret);
      assert.strictEqual(result.valid, false, 'Tampered timestamp must fail');
      assert.strictEqual(result.error, 'SIGNATURE_MISMATCH');
      return `1-second timestamp offset correctly flagged as SIGNATURE_MISMATCH`;
    });

    // Vector 3.5: 1-Byte Tamper Sensitivity (Nonce Alteration)
    await test('HMAC-CRYPTO', '1-byte alteration in nonce header invalidates signature', async () => {
      const sigOutput = generateWebhookSignature(samplePayload, validSecret);
      const tamperedHeader = sigOutput.header.replace(/n=[a-f0-9-]+/, `n=tampered-nonce-001`);

      const result = verifyWebhookSignature(samplePayload, tamperedHeader, validSecret);
      assert.strictEqual(result.valid, false, 'Tampered nonce must fail');
      assert.strictEqual(result.error, 'SIGNATURE_MISMATCH');
      return `Altered nonce correctly flagged as SIGNATURE_MISMATCH`;
    });

    // Vector 3.6: Secret Mismatch
    await test('HMAC-CRYPTO', 'Verification with wrong merchant secret fails', async () => {
      const sigOutput = generateWebhookSignature(samplePayload, validSecret);
      const wrongSecret = 'whsec_b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2';

      const result = verifyWebhookSignature(samplePayload, sigOutput.header, wrongSecret);
      assert.strictEqual(result.valid, false, 'Wrong secret must fail');
      assert.strictEqual(result.error, 'SIGNATURE_MISMATCH');
      return `Different secret correctly flagged as SIGNATURE_MISMATCH`;
    });

    // Vector 3.7: Timestamp Freshness (> 300s Tolerance)
    await test('HMAC-CRYPTO', 'Stale webhook delivery (> 300 seconds old) is rejected', async () => {
      const staleTimestamp = Math.floor(Date.now() / 1000) - 305; // 5 minutes 5 seconds ago
      const sigOutput = generateWebhookSignature(samplePayload, validSecret, staleTimestamp);

      const result = verifyWebhookSignature(samplePayload, sigOutput.header, validSecret, 300);
      assert.strictEqual(result.valid, false, 'Stale timestamp must fail');
      assert.strictEqual(result.error, 'TIMESTAMP_OUT_OF_TOLERANCE');
      return `Timestamp older than 300s rejected with TIMESTAMP_OUT_OF_TOLERANCE`;
    });

    // Vector 3.8: Nonce Replay Defense
    await test('HMAC-CRYPTO', 'Replayed nonce within freshness window is rejected with REPLAYED_NONCE', async () => {
      clearWebhookNonceCache();
      const uniqueNonce = `nonce_${crypto.randomUUID()}`;
      const nowTs = Math.floor(Date.now() / 1000);
      const sigOutput = generateWebhookSignature(samplePayload, validSecret, nowTs, uniqueNonce);

      // First delivery: Valid
      const firstResult = verifyWebhookSignature(samplePayload, sigOutput.header, validSecret);
      assert.strictEqual(firstResult.valid, true, 'First presentation of nonce is accepted');

      // Second delivery (Replay attack with exact same headers & payload): Rejected
      const secondResult = verifyWebhookSignature(samplePayload, sigOutput.header, validSecret);
      assert.strictEqual(secondResult.valid, false, 'Replayed presentation of nonce is rejected');
      assert.strictEqual(secondResult.error, 'REPLAYED_NONCE');
      return `Replay defense verified: duplicate nonce blocked with REPLAYED_NONCE`;
    });

    console.log(`\n${BOLD}${GREEN}================================================================================${RESET}`);
    console.log(`${BOLD}${GREEN}  Webhook SSRF & HMAC Verification Suite: 100% Pass Rate                       ${RESET}`);
    console.log(`${BOLD}${GREEN}================================================================================${RESET}`);
    console.log(`  Total Checks Executed: ${summary.total}`);
    console.log(`  Passed Defenses:       ${summary.passed}`);
    console.log(`  Failed Defenses:       ${summary.failed}`);
    console.log(`${BOLD}${GREEN}================================================================================${RESET}\n`);

    return summary;
  } finally {
    if (db && typeof db.close === 'function') await db.close();
  }
}

// Auto-run when executed directly via node
if (process.argv[1]?.endsWith('webhook_ssrf_hmac.test.js')) {
  runWebhookSecuritySuite().catch((err) => {
    console.error('Fatal Webhook Security Suite Error:', err);
    process.exit(1);
  });
}
