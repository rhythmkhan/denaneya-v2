/**
 * DenaNeya v2.0 - Milestone 1 Adversarial Security Test Suite
 * Executed by Challenger 2 (teamwork_preview_challenger_m1_2)
 *
 * Scope:
 * 1. Obfuscated SMS & Sender Mask Injection
 * 2. Edge Withdrawal Keywords & Zero-Fee Variations
 * 3. Octal, Hex, and IPv6 SSRF Vectors & Cloud Metadata
 * 4. HMAC Replay, Clock Skew, Nonce Collision, & Weak Secrets
 */

import assert from "node:assert";
import crypto from "node:crypto";
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
  validateWebhookUrl
} from "../../packages/shared/dist/index.js";

console.log("===============================================================================");
console.log("   DenaNeya v2.0 - Milestone 1 Adversarial Security Challenge Test Suite      ");
console.log("===============================================================================\n");

const results = {
  total: 0,
  passedDefense: 0,
  vulnerabilitiesFound: 0,
  findings: []
};

function recordTest(id, category, description, passed, vulnerabilityDetail = null) {
  results.total++;
  if (passed) {
    results.passedDefense++;
    console.log(`  [PASS] ${id} - ${category}: ${description}`);
  } else {
    results.vulnerabilitiesFound++;
    console.log(`  [FAIL/VULN] ${id} - ${category}: ${description}`);
    if (vulnerabilityDetail) {
      console.log(`         >>> Impact: ${vulnerabilityDetail}`);
    }
    results.findings.push({ id, category, description, detail: vulnerabilityDetail });
  }
}

// ============================================================================
// CATEGORY 1: Obfuscated SMS Senders & Address Masking
// ============================================================================
console.log("--- Category 1: Obfuscated SMS Senders & Address Masking ---");

// Test 1.1: Cellular numbers (+8801... / 01...)
{
  const testSenders = ["+8801711223344", "01711223344", "+8801999999999", "01999999999"];
  let allBlocked = true;
  for (const s of testSenders) {
    if (isTelecomSenderWhitelisted(s)) allBlocked = false;
  }
  recordTest(
    "ADV-SMS-01",
    "SMS Sender",
    "Reject arbitrary 11-digit / +880 MSISDN cell numbers",
    allBlocked,
    "Cell numbers allowed through telecom whitelist"
  );
}

// Test 1.2: Short codes with international prefix (+88016216, 88016216)
{
  const prefixCodes = ["+88016216", "88016216", "+88016222", "88016222"];
  let rejected = true;
  for (const c of prefixCodes) {
    if (isTelecomSenderWhitelisted(c)) rejected = false;
  }
  recordTest(
    "ADV-SMS-02",
    "SMS Sender",
    "Reject prefixed telecom short codes (+88016216, 88016216)",
    rejected,
    "Prefixed short code matched without standard normalization"
  );
}

// Test 1.3: Obfuscated sender masks with whitespace, tabs, and newlines
{
  const trailingSpace = isTelecomSenderWhitelisted("bKash ");
  const leadingSpace = isTelecomSenderWhitelisted(" Nagad");
  const tabSpace = isTelecomSenderWhitelisted("16216\t");
  const newlineSpace = isTelecomSenderWhitelisted("Upay\n");
  // The system trims whitespace in isTelecomSenderWhitelisted:
  // sender.trim().toUpperCase()
  const handlesWhitespace = trailingSpace && leadingSpace && tabSpace && newlineSpace;
  recordTest(
    "ADV-SMS-03",
    "SMS Sender",
    "Normalize and accept valid carrier masks with whitespace/tabs/newlines",
    handlesWhitespace,
    "Legitimate SMS rejected due to trailing or leading whitespace/tab"
  );
}

// Test 1.4: Punctuation & Special Character Injection in Senders ("Nagad!", "bKash#", "bKashSupport")
{
  const punctSenders = ["Nagad!", "bKash#", "bKashSupport", "bKash_Agent", "Upay-Care", "16216!"];
  let allBlocked = true;
  for (const s of punctSenders) {
    if (isTelecomSenderWhitelisted(s)) allBlocked = false;
  }
  recordTest(
    "ADV-SMS-04",
    "SMS Sender",
    "Reject special character variations and brand lookalikes (Nagad!, bKashSupport)",
    allBlocked,
    "Special characters or spoofed brand name allowed"
  );
}

// Test 1.5: Null Byte & Invisible Unicode in Senders ("bKash\0", "b\u200BKash")
{
  const nullByte = isTelecomSenderWhitelisted("bKash\0");
  const zeroWidth = isTelecomSenderWhitelisted("b\u200BKash");
  const cyrillicA = isTelecomSenderWhitelisted("bKаsh"); // Cyrillic small letter а (U+0430)
  const rejected = !nullByte && !zeroWidth && !cyrillicA;
  recordTest(
    "ADV-SMS-05",
    "SMS Sender",
    "Reject null bytes, zero-width spaces, and homoglyphs (Cyrillic a)",
    rejected,
    "Null byte or homoglyph bypassed whitelist"
  );
}

// Test 1.6: Prototype Pollution in Sender Lookup ("__proto__", "constructor")
{
  const proto = isTelecomSenderWhitelisted("__proto__");
  const ctor = isTelecomSenderWhitelisted("constructor");
  const hasOwn = isTelecomSenderWhitelisted("hasOwnProperty");
  const safe = !proto && !ctor && !hasOwn;
  recordTest(
    "ADV-SMS-06",
    "SMS Sender",
    "Immunity to prototype pollution property names (__proto__, constructor)",
    safe,
    "Prototype pollution attack returned truthy whitelist"
  );
}

// ============================================================================
// CATEGORY 2: Edge Withdrawal Keywords & Zero-Fee Variations
// ============================================================================
console.log("\n--- Category 2: Edge Withdrawal Keywords & Zero-Fee Variations ---");

// Test 2.1: Standard withdrawal formats from DISPATCH.md
{
  const w1 = checkDebitBlacklist("Cash Out Tk 5000").isDebit;
  const w2 = checkDebitBlacklist("Cash Out Fee 10.00").isDebit;
  const w3 = checkDebitBlacklist("Send Money to 01712345678").isDebit;
  const w4 = checkDebitBlacklist("Debited by 500").isDebit;
  const allCaught = w1 && w2 && w3 && w4;
  recordTest(
    "ADV-DEB-01",
    "Debit Blacklist",
    "Block standard withdrawal messages (Cash Out, Cash Out Fee, Send Money to, Debited by)",
    allCaught,
    "Failed to flag standard withdrawal pattern"
  );
}

// Test 2.2: Authentic receipts with zero-fee variations from DISPATCH.md
{
  const base = "You have received Tk 500.00 from 01712345678. Ref Invoice-101. Balance Tk 15,250.00. TrxID BLK998877 at 16/09/2026 14:20";
  const r1 = checkDebitBlacklist(base.replace("Ref Invoice-101.", "Ref Invoice-101. Fee Tk 0.00."));
  const r2 = checkDebitBlacklist(base.replace("Ref Invoice-101.", "Ref Invoice-101. Fee: 0."));
  const r3 = checkDebitBlacklist(base.replace("Ref Invoice-101.", "Ref Invoice-101. Charge Tk 0.00."));
  const r4 = checkDebitBlacklist(base.replace("Ref Invoice-101.", "Ref Invoice-101. Fee Tk 0."));
  const r5 = checkDebitBlacklist(base.replace("Ref Invoice-101.", "Ref Invoice-101. Fee: Tk 0.00."));
  const allAllowed = !r1.isDebit && !r2.isDebit && !r3.isDebit && !r4.isDebit && !r5.isDebit;
  recordTest(
    "ADV-DEB-02",
    "Debit Blacklist",
    "Permit authentic receipts with zero-fee variations (Fee Tk 0.00, Fee: 0, Charge Tk 0.00)",
    allAllowed,
    "Authentic zero-fee receipt incorrectly blacklisted as debit"
  );
}

// Test 2.3: "Debit" keyword without "-ed" suffix (e.g. "Debit Tk 500", "Debit: 500")
{
  const d1 = checkDebitBlacklist("Debit Tk 500.00 from your A/C").isDebit;
  const d2 = checkDebitBlacklist("Debit: Tk 500.00").isDebit;
  const d3 = checkDebitBlacklist("Your account debit of Tk 500 is complete").isDebit;
  const caught = d1 && d2 && d3;
  recordTest(
    "ADV-DEB-03",
    "Debit Blacklist",
    "Block 'Debit' keyword without '-ed' suffix (Debit Tk 500, Debit: Tk 500)",
    caught,
    "Regex only matches /\\bDebited\\b/i. Messages containing 'Debit Tk ...' or 'Debit:' bypass blacklist!"
  );
}

// Test 2.4: Hyphenated Cash-Out ("Cash-Out Tk 5000")
{
  const co = checkDebitBlacklist("Cash-Out Tk 5000.00 successful").isDebit;
  recordTest(
    "ADV-DEB-04",
    "Debit Blacklist",
    "Block hyphenated 'Cash-Out' keyword",
    co,
    "Regex /\\bCash\\s*Out\\b/i fails to match hyphenated 'Cash-Out'!"
  );
}

// Test 2.5: Customer Payment format ("Payment Tk 500 to 01712345678")
{
  // In real bKash customer debit, the text is "Payment Tk 500.00 to 01712345678 successful"
  // The blacklist only checks /\bPayment\s+to\b/i
  const p1 = checkDebitBlacklist("Payment Tk 500.00 to 01712345678 successful").isDebit;
  const p2 = checkDebitBlacklist("Paid Tk 500.00 to 01712345678 successful").isDebit;
  const caught = p1 && p2;
  recordTest(
    "ADV-DEB-05",
    "Debit Blacklist",
    "Block 'Payment Tk ... to' and 'Paid Tk ... to' customer debit formats",
    caught,
    "Blacklist pattern /\\bPayment\\s+to\\b/i requires immediate 'to', missing 'Payment Tk <amount> to'!"
  );
}

// Test 2.6: Non-zero withdrawal fee ("Fee Tk 10.00 charged", "Charge Tk 15.00")
{
  const f1 = checkDebitBlacklist("Fee Tk 10.00 charged for service").isDebit;
  const f2 = checkDebitBlacklist("Charge Tk 15.00 deducted from account").isDebit;
  const caught = f1 && f2;
  recordTest(
    "ADV-DEB-06",
    "Debit Blacklist",
    "Block non-zero fee messages ('Fee Tk 10.00', 'Charge Tk 15.00')",
    caught,
    "Blacklist has no generic 'Fee Tk [1-9]' or 'Charge Tk' check; non-zero fee messages bypass blacklist."
  );
}

// Test 2.7: Adversarial Hybrid Injection (Credit wording + unblacklisted Debit keyword)
{
  const injectionMsg = "You have received Tk 500.00 from 01712345678. Debit Tk 500.00. TrxID: BKA112233";
  const parsed = parseIncomingSms("bKash", injectionMsg);
  // If it succeeds, an attacker has fooled the pipeline into crediting a debit message!
  const blocked = !parsed.success;
  recordTest(
    "ADV-DEB-07",
    "Debit Blacklist",
    "Prevent hybrid injection messages containing 'Debit Tk ...' from being parsed as credit",
    blocked,
    "Adversarial message with 'Debit Tk 500.00' successfully ingested as valid ৳500 credit (TrxID BKA112233)!"
  );
}

// ============================================================================
// CATEGORY 3: Octal, Hex, and IPv6 SSRF Vectors & Cloud Metadata
// ============================================================================
console.log("\n--- Category 3: Octal, Hex, and IPv6 SSRF Vectors & Cloud Metadata ---");

// Test 3.1: Standard IPv4 RFC 1918 and Loopback
{
  const ips = ["127.0.0.1", "127.255.255.255", "10.0.0.1", "172.16.0.1", "192.168.1.1", "169.254.169.254"];
  let allBlocked = true;
  for (const ip of ips) {
    if (!isProhibitedIP(ip)) allBlocked = false;
  }
  recordTest(
    "ADV-SSRF-01",
    "SSRF Firewall",
    "Block standard IPv4 loopback, RFC 1918, and link-local ranges",
    allBlocked,
    "Standard IPv4 private address permitted"
  );
}

// Test 3.2: Octal and Hex IPv4 representation (0177.0.0.1, 0x7f000001)
{
  const octalBlocked = isProhibitedIP("0177.0.0.1");
  const hexBlocked = isProhibitedIP("0x7f000001");
  const dwordBlocked = isProhibitedIP("2130706433");
  const allBlocked = octalBlocked && hexBlocked && dwordBlocked;
  recordTest(
    "ADV-SSRF-02",
    "SSRF Firewall",
    "Block non-standard IPv4 literals (octal 0177.0.0.1, hex 0x7f000001, dword 2130706433)",
    allBlocked,
    "Octal, hex, or dword IP bypassed isProhibitedIP"
  );
}

// Test 3.3: IPv4-mapped IPv6 in hex notation (::ffff:7f00:1)
{
  const loopbackHex = isProhibitedIP("::ffff:7f00:1");
  const loopbackFullHex = isProhibitedIP("::ffff:7f00:0001");
  const blocked = loopbackHex && loopbackFullHex;
  recordTest(
    "ADV-SSRF-03",
    "SSRF Firewall",
    "Block IPv4-mapped IPv6 loopback in hex notation (::ffff:7f00:1)",
    blocked,
    "isProhibitedIP('::ffff:7f00:1') returns false! Bypasses SSRF loopback check."
  );
}

// Test 3.4: Cloud Metadata via IPv4-mapped IPv6 in hex (::ffff:a9fe:a9fe)
{
  // 169.254.169.254 in hex: 169=a9, 254=fe -> a9fe:a9fe
  const metadataHex = isProhibitedIP("::ffff:a9fe:a9fe");
  recordTest(
    "ADV-SSRF-04",
    "SSRF Firewall",
    "Block AWS/GCP cloud metadata via IPv4-mapped IPv6 hex (::ffff:a9fe:a9fe)",
    metadataHex,
    "isProhibitedIP('::ffff:a9fe:a9fe') returns false! Permits access to AWS/GCP cloud metadata 169.254.169.254!"
  );
}

// Test 3.5: RFC 1918 Private ranges via IPv4-mapped IPv6 in hex
{
  const ten = isProhibitedIP("::ffff:a00:1"); // 10.0.0.1
  const oneNineTwo = isProhibitedIP("::ffff:c0a8:1"); // 192.168.0.1
  const oneSevenTwo = isProhibitedIP("::ffff:ac10:1"); // 172.16.0.1
  const blocked = ten && oneNineTwo && oneSevenTwo;
  recordTest(
    "ADV-SSRF-05",
    "SSRF Firewall",
    "Block RFC 1918 private subnets via IPv4-mapped IPv6 hex (::ffff:a00:1, ::ffff:c0a8:1)",
    blocked,
    "IPv4-mapped IPv6 hex representations of 10.0.0.1 and 192.168.0.1 return false (permitted)!"
  );
}

// Test 3.6: Uncompressed IPv4-mapped IPv6 (0:0:0:0:0:ffff:127.0.0.1)
{
  const uncompressed = isProhibitedIP("0:0:0:0:0:ffff:127.0.0.1");
  const uncompressedHex = isProhibitedIP("0000:0000:0000:0000:0000:ffff:7f00:0001");
  const blocked = uncompressed && uncompressedHex;
  recordTest(
    "ADV-SSRF-06",
    "SSRF Firewall",
    "Block uncompressed IPv4-mapped IPv6 (0:0:0:0:0:ffff:127.0.0.1)",
    blocked,
    "isProhibitedIP only checks lower.startsWith('::ffff:'). Uncompressed forms starting with '0:' return false!"
  );
}

// Test 3.7: NAT64 Well-Known Prefix (64:ff9b::127.0.0.1) & IPv4-compatible (::127.0.0.1)
{
  const nat64 = isProhibitedIP("64:ff9b::127.0.0.1");
  const compat = isProhibitedIP("::127.0.0.1");
  const blocked = nat64 && compat;
  recordTest(
    "ADV-SSRF-07",
    "SSRF Firewall",
    "Block RFC 6052 NAT64 (64:ff9b::127.0.0.1) and IPv4-compatible (::127.0.0.1) loopback",
    blocked,
    "NAT64 Well-Known Prefix and IPv4-compatible loopback return false (permitted)!"
  );
}

// Test 3.8: validateWebhookUrl Protocol Enactment
{
  const httpRes = await validateWebhookUrl("http://example.com/webhook");
  const ftpRes = await validateWebhookUrl("ftp://example.com/webhook");
  const fileRes = await validateWebhookUrl("file:///etc/passwd");
  const gopherRes = await validateWebhookUrl("gopher://127.0.0.1:6379/_");
  const allBlocked = !httpRes.valid && !ftpRes.valid && !fileRes.valid && !gopherRes.valid;
  recordTest(
    "ADV-SSRF-08",
    "SSRF Firewall",
    "Reject non-HTTPS protocols (http, ftp, file, gopher)",
    allBlocked,
    "Non-HTTPS protocols permitted in production validation"
  );
}

// ============================================================================
// CATEGORY 4: HMAC Replay, Clock Skew, Nonce Collision & Weak Secrets
// ============================================================================
console.log("\n--- Category 4: HMAC Replay, Clock Skew, Nonce Collision & Weak Secrets ---");

const strongSecret = "0123456789abcdef0123456789abcdef"; // 32 chars
const testPayload = { invoice_id: "inv_123", amount: 500, status: "PAID" };

// Test 4.1: Expired Timestamps (> 300s in past)
{
  const now = Math.floor(Date.now() / 1000);
  const expiredSig = generateWebhookSignature(testPayload, strongSecret, now - 305);
  const verifyRes = verifyWebhookSignature(testPayload, expiredSig.header, strongSecret);
  const blocked = !verifyRes.valid && verifyRes.error === "TIMESTAMP_OUT_OF_TOLERANCE";
  recordTest(
    "ADV-HMAC-01",
    "HMAC Security",
    "Reject expired signatures (> 300s in past)",
    blocked,
    "Expired signature was verified as valid"
  );
}

// Test 4.2: Future Timestamps (> 300s in future)
{
  const now = Math.floor(Date.now() / 1000);
  const futureSig = generateWebhookSignature(testPayload, strongSecret, now + 305);
  const verifyRes = verifyWebhookSignature(testPayload, futureSig.header, strongSecret);
  const blocked = !verifyRes.valid && verifyRes.error === "TIMESTAMP_OUT_OF_TOLERANCE";
  recordTest(
    "ADV-HMAC-02",
    "HMAC Security",
    "Reject future timestamps (> 300s in future)",
    blocked,
    "Future timestamp out of tolerance was accepted"
  );
}

// Test 4.3: Tolerance Boundary Precision (300s accepted, 301s rejected)
{
  const now = Math.floor(Date.now() / 1000);
  const atBoundary = generateWebhookSignature(testPayload, strongSecret, now - 300);
  const pastBoundary = generateWebhookSignature(testPayload, strongSecret, now - 301);
  const atRes = verifyWebhookSignature(testPayload, atBoundary.header, strongSecret);
  const pastRes = verifyWebhookSignature(testPayload, pastBoundary.header, strongSecret);
  const precise = atRes.valid && !pastRes.valid;
  recordTest(
    "ADV-HMAC-03",
    "HMAC Security",
    "Verify exact 300-second tolerance window (300s allowed, 301s rejected)",
    precise,
    "Tolerance boundary off-by-one error"
  );
}

// Test 4.4: Tampered Payload Detection
{
  const now = Math.floor(Date.now() / 1000);
  const originalSig = generateWebhookSignature(testPayload, strongSecret, now);
  const tamperedPayload = { ...testPayload, amount: 999999 };
  const verifyRes = verifyWebhookSignature(tamperedPayload, originalSig.header, strongSecret);
  const blocked = !verifyRes.valid && verifyRes.error === "SIGNATURE_MISMATCH";
  recordTest(
    "ADV-HMAC-04",
    "HMAC Security",
    "Reject tampered payload data",
    blocked,
    "Tampered payload verified successfully"
  );
}

// Test 4.5: Tampered Header Fields (Timestamp / Nonce tampering)
{
  const now = Math.floor(Date.now() / 1000);
  const original = generateWebhookSignature(testPayload, strongSecret, now);
  // Attacker tries to modify t in header
  const modifiedTHeader = original.header.replace(`t=${now}`, `t=${now + 10}`);
  const resT = verifyWebhookSignature(testPayload, modifiedTHeader, strongSecret);

  // Attacker tries to modify nonce in header
  const modifiedNHeader = original.header.replace("n=", "n=tampered_");
  const resN = verifyWebhookSignature(testPayload, modifiedNHeader, strongSecret);

  const blocked = !resT.valid && !resN.valid;
  recordTest(
    "ADV-HMAC-05",
    "HMAC Security",
    "Reject tampered timestamp or nonce values in header",
    blocked,
    "Tampered header field accepted"
  );
}

// Test 4.6: Weak Secret Detection (Length < 32 and default secret)
{
  let shortCaught = false;
  let defaultCaught = false;
  try {
    validateWebhookSecret("short_secret_123");
  } catch {
    shortCaught = true;
  }
  try {
    validateWebhookSecret("default_zinipay_secret");
  } catch {
    defaultCaught = true;
  }
  const caught = shortCaught && defaultCaught;
  recordTest(
    "ADV-HMAC-06",
    "HMAC Security",
    "Reject short secrets (<32 chars) and 'default_zinipay_secret'",
    caught,
    "Failed to reject weak default secret or short secret"
  );
}

// Test 4.7: Low Entropy Secret Detection (32 spaces or 32 repeated chars)
{
  let spaceRejected = false;
  let zeroRejected = false;
  try {
    validateWebhookSecret(" ".repeat(32));
  } catch {
    spaceRejected = true;
  }
  try {
    validateWebhookSecret("0".repeat(32));
  } catch {
    zeroRejected = true;
  }
  const lowEntropyCaught = spaceRejected && zeroRejected;
  recordTest(
    "ADV-HMAC-07",
    "HMAC Security",
    "Reject low-entropy secrets of 32 characters (32 spaces, 32 repeated zeros)",
    lowEntropyCaught,
    "validateWebhookSecret only checks .length >= 32. 32 spaces or '000...000' are accepted!"
  );
}

// Test 4.8: Replay Vulnerability within 300s window (Stateless verification)
{
  const now = Math.floor(Date.now() / 1000);
  const sig = generateWebhookSignature(testPayload, strongSecret, now);

  // Simulate 3 rapid replayed requests with the exact same header & payload
  const r1 = verifyWebhookSignature(testPayload, sig.header, strongSecret);
  const r2 = verifyWebhookSignature(testPayload, sig.header, strongSecret);
  const r3 = verifyWebhookSignature(testPayload, sig.header, strongSecret);

  // If verifyWebhookSignature accepts all 3 replays without a nonce cache,
  // the verifier itself is stateless and relies on the consumer to cache nonces.
  const verifierCachesNonces = !(r1.valid && r2.valid && r3.valid);
  recordTest(
    "ADV-HMAC-08",
    "HMAC Security",
    "Built-in nonce cache / replay defense within the 300-second window",
    verifierCachesNonces,
    "verifyWebhookSignature is purely stateless. Identical payload & signature can be replayed repeatedly within 300s unless the consumer maintains an external nonce store!"
  );
}

// Test 4.9: Canonicalization with `undefined` values
{
  const objWithUndefined = { a: 1, b: undefined };
  const canonicalStr = canonicalizeJson(objWithUndefined);
  // Valid JSON does not allow {"a":1,"b":undefined}. In standard JSON, undefined keys are stripped: {"a":1}
  let producesValidJson = false;
  try {
    JSON.parse(canonicalStr);
    producesValidJson = true;
  } catch {
    producesValidJson = false;
  }
  recordTest(
    "ADV-HMAC-09",
    "HMAC Security",
    "canonicalizeJson produces standard valid JSON when object contains undefined values",
    producesValidJson,
    `canonicalizeJson({ a: 1, b: undefined }) produces '${canonicalStr}' which is invalid JSON (undefined is not valid JSON token)!`
  );
}

// Test 4.10: Timing Safe Equal comparison on different signature lengths
{
  const now = Math.floor(Date.now() / 1000);
  const sig = generateWebhookSignature(testPayload, strongSecret, now);
  const malformedHeader = sig.header.replace(/v1=[0-9a-f]+/, "v1=short");
  const res = verifyWebhookSignature(testPayload, malformedHeader, strongSecret);
  const handledSafely = !res.valid && res.error === "SIGNATURE_MISMATCH";
  recordTest(
    "ADV-HMAC-10",
    "HMAC Security",
    "Gracefully handle candidate signatures of different buffer lengths without crashing timingSafeEqual",
    handledSafely,
    "Buffer length mismatch crashed crypto.timingSafeEqual"
  );
}

// ============================================================================
// SUMMARY & VERDICT
// ============================================================================
console.log("\n===============================================================================");
console.log(`   EXECUTION SUMMARY: ${results.total} TESTS RUN`);
console.log(`   - Passed Defenses: ${results.passedDefense}`);
console.log(`   - Vulnerabilities / Security Gaps Found: ${results.vulnerabilitiesFound}`);
console.log("===============================================================================\n");

if (results.vulnerabilitiesFound > 0) {
  console.log("VULNERABILITY FINDINGS BREAKDOWN:");
  for (const f of results.findings) {
    console.log(`- [${f.id}] (${f.category}): ${f.description}`);
    if (f.detail) console.log(`  Detail: ${f.detail}`);
  }
}
