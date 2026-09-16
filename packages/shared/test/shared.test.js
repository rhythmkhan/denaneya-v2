/**
 * DenaNeya v2.0 - Comprehensive Unit Test Suite for @denaneya/shared
 * Tests Telecom Whitelist, Debit Blacklist, MFS Parsers, HMAC Signer, SSRF Firewall, and Zod Schemas.
 */

import assert from "node:assert";
import {
  isTelecomSenderWhitelisted,
  resolveProviderFromSender,
  assertWhitelistedSender,
  checkDebitBlacklist,
  parseBkashSms,
  parseNagadSms,
  parseRocketSms,
  parseUpaySms,
  parseIncomingSms,
  canonicalizeJson,
  generateWebhookSignature,
  verifyWebhookSignature,
  validateWebhookSecret,
  isProhibitedIP,
  validateWebhookUrl,
  toPaisa,
  fromPaisa,
  formatBDT,
  sanitizeString,
  invoiceCreateSchema,
  paymentSubmissionSchema,
  deviceSyncPayloadSchema
} from "../dist/index.js";

console.log("=== Running @denaneya/shared Unit Tests ===");

let passCount = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  PASS: ${name}`);
    passCount++;
  } catch (err) {
    console.error(`  FAIL: ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

async function testAsync(name, fn) {
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

// 1. Telecom Whitelist
test("SEC-TEST-03 & 04: Telecom Sender Whitelist & Provider Resolution", () => {
  // Valid whitelisted senders
  assert.strictEqual(isTelecomSenderWhitelisted("bKash"), true);
  assert.strictEqual(isTelecomSenderWhitelisted("BKASH"), true);
  assert.strictEqual(isTelecomSenderWhitelisted("16216"), true);
  assert.strictEqual(isTelecomSenderWhitelisted("Nagad"), true);
  assert.strictEqual(isTelecomSenderWhitelisted("NAGAD"), true);
  assert.strictEqual(isTelecomSenderWhitelisted("16222"), true);
  assert.strictEqual(isTelecomSenderWhitelisted("Upay"), true);
  assert.strictEqual(isTelecomSenderWhitelisted("UPAY"), true);

  // Provider mappings
  assert.strictEqual(resolveProviderFromSender("bKash"), "bKash");
  assert.strictEqual(resolveProviderFromSender("16216"), "Rocket");
  assert.strictEqual(resolveProviderFromSender("Nagad"), "Nagad");
  assert.strictEqual(resolveProviderFromSender("16222"), "Nagad");
  assert.strictEqual(resolveProviderFromSender("Upay"), "Upay");

  // Rejection of cell numbers & spoofed masks (SEC-TEST-03)
  assert.strictEqual(isTelecomSenderWhitelisted("01711223344"), false);
  assert.strictEqual(isTelecomSenderWhitelisted("+8801999999999"), false);
  assert.strictEqual(isTelecomSenderWhitelisted("bKashSupport"), false);
  assert.strictEqual(isTelecomSenderWhitelisted(""), false);
  assert.strictEqual(isTelecomSenderWhitelisted(null), false);

  assert.throws(() => assertWhitelistedSender("01711223344"), /Unauthorized SMS sender address/);
});

// 2. Debit Blacklist & Zero-Fee Receipt Tolerance
test("SEC-TEST-08 & 09: Debit Blacklist and Fee Tk 0.00 Tolerance", () => {
  // Operational debits that must be blocked (SEC-TEST-08)
  assert.strictEqual(checkDebitBlacklist("Cash Out Tk 2,000.00 from 01712345678").isDebit, true);
  assert.strictEqual(checkDebitBlacklist("Send Money to 01812345678 successful. Tk 500.00").isDebit, true);
  assert.strictEqual(checkDebitBlacklist("Payment to Merchant Shop Tk 1,200.00").isDebit, true);
  assert.strictEqual(checkDebitBlacklist("Paid to Deshi Utilities Tk 750.00").isDebit, true);
  assert.strictEqual(checkDebitBlacklist("Cash Out Fee Tk 18.50 charged").isDebit, true);
  assert.strictEqual(checkDebitBlacklist("A/C has been Debited by Tk 300.00").isDebit, true);
  assert.strictEqual(checkDebitBlacklist("Transferred Tk 400.00 to wallet").isDebit, true);
  assert.strictEqual(checkDebitBlacklist("Mobile Recharge Tk 100.00 successful").isDebit, true);

  // CRITICAL (SEC-TEST-09): Authentic receipt containing "Fee Tk 0.00" MUST NOT BE BLOCKED
  const legitimateBkash = "You have received Tk 500.00 from 01800000000. Ref Invoice-101. Fee Tk 0.00. Balance Tk 10,500.00. TrxID BKA778899 at 16/09/2026 14:20";
  const legitimateCheck = checkDebitBlacklist(legitimateBkash);
  assert.strictEqual(legitimateCheck.isDebit, false, "Legitimate receipt with 'Fee Tk 0.00' must NOT be flagged as debit!");
});

// 3. MFS SMS Regex Parsers
test("MFS SMS Parsers: bKash, Nagad, Rocket, Upay", () => {
  // bKash
  const bkashMsg = "You have received Tk 1,250.00 from 01712345678. Ref Invoice-101. Fee Tk 0.00. Balance Tk 15,250.00. TrxID BLK998877 at 16/09/2026 14:20";
  const bkashParsed = parseBkashSms(bkashMsg);
  assert.ok(bkashParsed);
  assert.strictEqual(bkashParsed.provider, "bKash");
  assert.strictEqual(bkashParsed.trxId, "BLK998877");
  assert.strictEqual(bkashParsed.amount, 1250.00);
  assert.strictEqual(bkashParsed.amountPaisa, 125000);
  assert.strictEqual(bkashParsed.senderNumber, "01712345678");
  assert.strictEqual(bkashParsed.smsRef, "Invoice-101");
  assert.strictEqual(bkashParsed.balance, 15250.00);

  // Nagad
  const nagadMsg = "Money Received. Amount: Tk 2,500.00. Sender: 01912345678. Ref: Order55. TxnID: 7HG6F5D4. Date: 16/09/2026 16:45";
  const nagadParsed = parseNagadSms(nagadMsg);
  assert.ok(nagadParsed);
  assert.strictEqual(nagadParsed.provider, "Nagad");
  assert.strictEqual(nagadParsed.trxId, "7HG6F5D4");
  assert.strictEqual(nagadParsed.amount, 2500.00);
  assert.strictEqual(nagadParsed.amountPaisa, 250000);
  assert.strictEqual(nagadParsed.senderNumber, "01912345678");
  assert.strictEqual(nagadParsed.smsRef, "Order55");

  // Rocket
  const rocketMsg = "Tk 1,500.00 received from 01712345678 to A/C 017123456789. Fee Tk 0.00, Balance Tk 25,000.00. TxnId: 9876543210 on 16-Sep-2026 17:00";
  const rocketParsed = parseRocketSms(rocketMsg);
  assert.ok(rocketParsed);
  assert.strictEqual(rocketParsed.provider, "Rocket");
  assert.strictEqual(rocketParsed.trxId, "9876543210");
  assert.strictEqual(rocketParsed.amount, 1500.00);
  assert.strictEqual(rocketParsed.amountPaisa, 150000);

  // Upay
  const upayMsg = "You have received Tk 800.00 from 01512345678. Ref: Cart12. TrxID: UP998877 at 16/09/2026 18:10. Balance: Tk 12,800.00";
  const upayParsed = parseUpaySms(upayMsg);
  assert.ok(upayParsed);
  assert.strictEqual(upayParsed.provider, "Upay");
  assert.strictEqual(upayParsed.trxId, "UP998877");
  assert.strictEqual(upayParsed.amount, 800.00);
  assert.strictEqual(upayParsed.amountPaisa, 80000);

  // Master Ingestion Pipeline
  const masterOk = parseIncomingSms("bKash", bkashMsg);
  assert.strictEqual(masterOk.success, true);
  if (masterOk.success) {
    assert.strictEqual(masterOk.data.trxId, "BLK998877");
  }

  // Master Ingestion Pipeline: Non-whitelisted sender rejection
  const masterUnauthorized = parseIncomingSms("01700000000", bkashMsg);
  assert.strictEqual(masterUnauthorized.success, false);
  assert.strictEqual(masterUnauthorized.error, "UNAUTHORIZED_SENDER");

  // Master Ingestion Pipeline: Debit rejection
  const masterDebit = parseIncomingSms("bKash", "Cash Out Tk 500.00 from 01712345678. Fee Tk 7.50.");
  assert.strictEqual(masterDebit.success, false);
  assert.strictEqual(masterDebit.error, "DEBIT_TRANSACTION_REJECTED");
});

// 4. HMAC-SHA256 Signer & Replay Protection
test("SEC-TEST-11: HMAC-SHA256 Signer, Canonicalization & 300s Replay Window", () => {
  const strongSecret = "abcdef0123456789abcdef0123456789"; // 32 characters

  // Entropy check: Rejects weak secrets
  assert.throws(() => validateWebhookSecret("default_zinipay_secret"), /insufficient entropy/);
  assert.throws(() => validateWebhookSecret("short_secret"), /insufficient entropy/);

  // Canonicalization: Key order variation produces identical signature
  const payload1 = { z: 1, a: "test", m: [3, 2, 1], details: { beta: 2, alpha: 1 } };
  const payload2 = { a: "test", details: { alpha: 1, beta: 2 }, m: [3, 2, 1], z: 1 };
  assert.strictEqual(canonicalizeJson(payload1), canonicalizeJson(payload2));

  const now = Math.floor(Date.now() / 1000);
  const nonce = "11111111-2222-3333-4444-555555555555";
  const sigOutput1 = generateWebhookSignature(payload1, strongSecret, now, nonce);
  const sigOutput2 = generateWebhookSignature(payload2, strongSecret, now, nonce);
  assert.strictEqual(sigOutput1.signature, sigOutput2.signature);

  // Verification success
  const verifyResult = verifyWebhookSignature(payload1, sigOutput1.header, strongSecret);
  assert.strictEqual(verifyResult.valid, true);
  assert.strictEqual(verifyResult.timestamp, now);
  assert.strictEqual(verifyResult.nonce, nonce);

  // Replay rejection: Expired timestamp (> 300s in the past)
  const expiredTimestamp = now - 305;
  const expiredSig = generateWebhookSignature(payload1, strongSecret, expiredTimestamp, nonce);
  const expiredVerify = verifyWebhookSignature(payload1, expiredSig.header, strongSecret);
  assert.strictEqual(expiredVerify.valid, false);
  assert.strictEqual(expiredVerify.error, "TIMESTAMP_OUT_OF_TOLERANCE");

  // Tamper rejection
  const tamperedPayload = { ...payload1, z: 999 };
  const tamperedVerify = verifyWebhookSignature(tamperedPayload, sigOutput1.header, strongSecret);
  assert.strictEqual(tamperedVerify.valid, false);
  assert.strictEqual(tamperedVerify.error, "SIGNATURE_MISMATCH");
});

// 5. SSRF Firewall
test("SEC-TEST-06 & 07: SSRF Private Subnets & Cloud Metadata Blocking", () => {
  // 15 prohibited CIDRs / subnets (SEC-TEST-06 & 07)
  assert.strictEqual(isProhibitedIP("127.0.0.1"), true, "Loopback 127.0.0.1 must be blocked");
  assert.strictEqual(isProhibitedIP("127.255.255.255"), true, "Loopback subnet must be blocked");
  assert.strictEqual(isProhibitedIP("10.0.0.1"), true, "RFC 1918 10.0.0.0/8 must be blocked");
  assert.strictEqual(isProhibitedIP("10.254.1.1"), true, "RFC 1918 10.0.0.0/8 must be blocked");
  assert.strictEqual(isProhibitedIP("172.16.0.1"), true, "RFC 1918 172.16.0.0/12 must be blocked");
  assert.strictEqual(isProhibitedIP("172.31.255.255"), true, "RFC 1918 172.16.0.0/12 must be blocked");
  assert.strictEqual(isProhibitedIP("192.168.0.1"), true, "RFC 1918 192.168.0.0/16 must be blocked");
  assert.strictEqual(isProhibitedIP("169.254.169.254"), true, "Cloud metadata 169.254.169.254 must be blocked");
  assert.strictEqual(isProhibitedIP("100.64.0.1"), true, "CGNAT 100.64.0.0/10 must be blocked");
  assert.strictEqual(isProhibitedIP("0.0.0.0"), true, "0.0.0.0/8 must be blocked");
  assert.strictEqual(isProhibitedIP("224.0.0.1"), true, "Multicast 224.0.0.0/4 must be blocked");
  assert.strictEqual(isProhibitedIP("240.0.0.1"), true, "Reserved 240.0.0.0/4 must be blocked");
  assert.strictEqual(isProhibitedIP("192.0.2.1"), true, "TEST-NET-1 must be blocked");
  assert.strictEqual(isProhibitedIP("198.51.100.1"), true, "TEST-NET-2 must be blocked");
  assert.strictEqual(isProhibitedIP("203.0.113.1"), true, "TEST-NET-3 must be blocked");
  assert.strictEqual(isProhibitedIP("::1"), true, "IPv6 loopback ::1 must be blocked");

  // Public IP addresses must NOT be prohibited
  assert.strictEqual(isProhibitedIP("8.8.8.8"), false, "Public DNS 8.8.8.8 must be permitted");
  assert.strictEqual(isProhibitedIP("1.1.1.1"), false, "Public DNS 1.1.1.1 must be permitted");
});

await testAsync("SSRF URL Validation with Protocol Enactment", async () => {
  // Non-HTTPS blocked in production for public hosts
  const httpResult = await validateWebhookUrl("http://example.com/webhook");
  assert.strictEqual(httpResult.valid, false);
  assert.strictEqual(httpResult.error, "PROTOCOL_NOT_HTTPS");

  // Private IP URL blocked via HTTPS
  const metadataResult = await validateWebhookUrl("https://169.254.169.254/latest/meta-data");
  assert.strictEqual(metadataResult.valid, false);
  assert.ok(metadataResult.error?.includes("SSRF_BLOCKED_PRIVATE_IP"));

  const localhostResult = await validateWebhookUrl("https://127.0.0.1:8080/hook");
  assert.strictEqual(localhostResult.valid, false);
  assert.ok(localhostResult.error?.includes("SSRF_BLOCKED_PRIVATE_IP"));

  // Critical M3-It2 remediation: Private IPs & Cloud Metadata via HTTP must be blocked as SSRF_BLOCKED, NOT PROTOCOL_NOT_HTTPS
  const httpMetadataResult = await validateWebhookUrl("http://169.254.169.254/latest/meta-data");
  assert.strictEqual(httpMetadataResult.valid, false);
  assert.strictEqual(httpMetadataResult.error, "SSRF_BLOCKED_PRIVATE_IP: 169.254.169.254");

  const httpLoopbackResult = await validateWebhookUrl("http://127.0.0.1:8080/hook");
  assert.strictEqual(httpLoopbackResult.valid, false);
  assert.strictEqual(httpLoopbackResult.error, "SSRF_BLOCKED_PRIVATE_IP: 127.0.0.1");

  const httpPrivateResult = await validateWebhookUrl("http://10.0.0.1/webhook");
  assert.strictEqual(httpPrivateResult.valid, false);
  assert.strictEqual(httpPrivateResult.error, "SSRF_BLOCKED_PRIVATE_IP: 10.0.0.1");

  const httpOctalResult = await validateWebhookUrl("http://0177.0.0.1/webhook");
  assert.strictEqual(httpOctalResult.valid, false);
  assert.strictEqual(httpOctalResult.error, "SSRF_BLOCKED_PRIVATE_IP: 127.0.0.1");

  // allowHttpForTesting isolation: permits loopback/localhost only, strictly blocks cloud metadata and private subnets
  const testLoopback = await validateWebhookUrl("http://127.0.0.1:8080/hook", { allowHttpForTesting: true });
  assert.strictEqual(testLoopback.valid, true);
  assert.strictEqual(testLoopback.pinnedAddress, "127.0.0.1");

  const testMetadata = await validateWebhookUrl("http://169.254.169.254/latest/meta-data", { allowHttpForTesting: true });
  assert.strictEqual(testMetadata.valid, false);
  assert.strictEqual(testMetadata.error, "SSRF_BLOCKED_PRIVATE_IP: 169.254.169.254");

  const testPrivate = await validateWebhookUrl("http://10.0.0.1/webhook", { allowHttpForTesting: true });
  assert.strictEqual(testPrivate.valid, false);
  assert.strictEqual(testPrivate.error, "SSRF_BLOCKED_PRIVATE_IP: 10.0.0.1");
});

// 6. Zod Validation Schemas
test("SEC-TEST-16: Zod Schema Constraints & Anti-XSS Sanitization", () => {
  // Valid invoice input
  const validInvoice = invoiceCreateSchema.safeParse({
    amount: 500.00,
    customer_name: "Rahim Uddin",
    customer_email: "rahim@example.com",
    customer_phone: "01712345678"
  });
  assert.strictEqual(validInvoice.success, true);
  if (validInvoice.success) {
    assert.strictEqual(validInvoice.data.ttl_minutes, 15, "Default TTL must be 15 minutes");
  }

  // Floating-point NaN / Infinity injection blocked (SEC-TEST-16)
  const nanInvoice = invoiceCreateSchema.safeParse({
    amount: NaN,
    customer_name: "Attacker"
  });
  assert.strictEqual(nanInvoice.success, false);

  const infInvoice = invoiceCreateSchema.safeParse({
    amount: Infinity,
    customer_name: "Attacker"
  });
  assert.strictEqual(infInvoice.success, false);

  // Negative / Zero amount blocked
  const zeroInvoice = invoiceCreateSchema.safeParse({
    amount: 0,
    customer_name: "Attacker"
  });
  assert.strictEqual(zeroInvoice.success, false);

  // More than 2 decimal places blocked
  const precisionInvoice = invoiceCreateSchema.safeParse({
    amount: 10.999,
    customer_name: "Precision"
  });
  assert.strictEqual(precisionInvoice.success, false);

  // Stored XSS prevention: HTML tags stripped from customer name
  const xssInvoice = invoiceCreateSchema.safeParse({
    amount: 100.00,
    customer_name: "<script>alert('XSS')</script>Karim"
  });
  assert.strictEqual(xssInvoice.success, true);
  if (xssInvoice.success) {
    assert.strictEqual(xssInvoice.data.customer_name, "scriptalert('XSS')/scriptKarim");
  }

  // Payment submission schema: Uppercases TrxID and validates min length
  const paymentOk = paymentSubmissionSchema.safeParse({
    invoice_id: "inv_12345",
    trx_id: "bka778899"
  });
  assert.strictEqual(paymentOk.success, true);
  if (paymentOk.success) {
    assert.strictEqual(paymentOk.data.trx_id, "BKA778899");
  }

  const paymentShort = paymentSubmissionSchema.safeParse({
    invoice_id: "inv_12345",
    trx_id: "123"
  });
  assert.strictEqual(paymentShort.success, false);

  // Device sync schema: Checks telecom sender
  const syncOk = deviceSyncPayloadSchema.safeParse({
    sender: "bKash",
    message: "You have received Tk 500.00 from 01712345678. TrxID BKA123456",
    sim_slot: 1
  });
  assert.strictEqual(syncOk.success, true);

  const syncSpoofed = deviceSyncPayloadSchema.safeParse({
    sender: "01711223344",
    message: "Fake receipt text",
    sim_slot: 1
  });
  assert.strictEqual(syncSpoofed.success, false);
});

// 7. Currency Minor Unit Paisa Helpers
test("Currency Utilities: toPaisa, fromPaisa, formatBDT, sanitizeString", () => {
  assert.strictEqual(toPaisa(1250.50), 125050);
  assert.strictEqual(toPaisa(0.01), 1);
  assert.strictEqual(fromPaisa(125050), 1250.50);
  assert.strictEqual(fromPaisa(1), 0.01);

  assert.throws(() => toPaisa(Infinity), /Cannot convert non-finite/);

  const formatted = formatBDT(1250.50);
  assert.ok(formatted.includes("1,250.50"));

  assert.strictEqual(
    sanitizeString("<script>alert('hello')</script>"),
    "&lt;script&gt;alert(&#x27;hello&#x27;)&lt;&#x2F;script&gt;"
  );
});

console.log(`\nALL ${passCount} SHARED MODULE UNIT TESTS PASSED (100% OK)!\n`);
