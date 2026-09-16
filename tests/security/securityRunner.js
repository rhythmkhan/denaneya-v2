/**
 * DenaNeya v2.0 - Master Adversarial Security & Penetration Suite Runner
 * File: tests/security/securityRunner.js
 *
 * Sequentially executes all 7 adversarial challenge suites:
 * 1. M1: SMS Senders, Debit Blacklist, Octal/IPv6 SSRF, HMAC Replay (adversarial_m1.test.js)
 * 2. M2: Auth Timing, Rate Limiting, Prototype Pollution, Input Sanitization (adversarial_m2_auth_ratelimit_input.test.js)
 * 3. M2: Multi-Tenant, IDOR & Secret Leakage Penetration (adversarial_m2_multitenant.test.js)
 * 4. M3: CAS Concurrency, Race Conditions & Double-Spend Attacks (adversarial_m3_concurrency.test.js)
 * 5. M3: SSRF Firewall, Webhook Cryptography & Carrier Spoofing (adversarial_m3_ssrf_webhook_carrier.test.js)
 * 6. M4: Hosted Checkout, Dynamic TTL & Flow Penetration (adversarial_m4_checkout_flow.test.js)
 * 7. M4: RBAC Hierarchy, Gateway Protection & Billing Manipulation (adversarial_m4_rbac_gateway_billing.test.js)
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SECURITY_SUITES = [
  { name: 'M1: Telecom Senders, Debit Filters, Octal SSRF & HMAC Replay', file: 'adversarial_m1.test.js' },
  { name: 'M2: Auth Timing, Rate Limits, Prototype Pollution & Input Sanitization', file: 'adversarial_m2_auth_ratelimit_input.test.js' },
  { name: 'M2: Multi-Tenant IDOR Isolation & Secret Leakage Defense', file: 'adversarial_m2_multitenant.test.js' },
  { name: 'M3: Atomic CAS Concurrency, Double-Spend & Race Hardening', file: 'adversarial_m3_concurrency.test.js' },
  { name: 'M3: Webhook SSRF IP Pinning, Crypto & Carrier Spoofing', file: 'adversarial_m3_ssrf_webhook_carrier.test.js' },
  { name: 'M4: Hosted Checkout, Dynamic TTL & Status Polling Penetration', file: 'adversarial_m4_checkout_flow.test.js' },
  { name: 'M4: RBAC Isolation, Gateway Security & Billing Tampering', file: 'adversarial_m4_rbac_gateway_billing.test.js' }
];

async function runSuite(suite) {
  return new Promise((resolve, reject) => {
    console.log(`\n===============================================================================`);
    console.log(`>>> Executing Adversarial Suite: ${suite.name}`);
    console.log(`    Script: ${suite.file}`);
    console.log(`===============================================================================`);

    const fullPath = path.join(__dirname, suite.file);
    const child = spawn(process.execPath, [fullPath], {
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'test' }
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Suite ${suite.file} failed with exit code ${code}`));
      }
    });
  });
}

async function main() {
  const startTime = Date.now();
  console.log('###############################################################################');
  console.log('  দেনা নেয়া ভার্সন টু (DenaNeya v2.0) - Comprehensive Adversarial Penetration Runner ');
  console.log('  Executing Tier 5 Adversarial Stress Across All Architectural Milestones      ');
  console.log('###############################################################################\n');

  for (const suite of SECURITY_SUITES) {
    await runSuite(suite);
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('\n###############################################################################');
  console.log(`  ALL 7 ADVERSARIAL PENETRATION SUITES PASSED CLEANLY (100% SUCCESS) in ${duration}s!`);
  console.log('  All 13 Audited ZiNiPay Vulnerabilities Confirmed Structurally Neutralized:');
  console.log('    [VULN-01] Tenant IDOR Metric Leakage: Neutralized & 0% Secret Projection');
  console.log('    [VULN-02] Double-Spend Race Condition: Neutralized via Single-Statement Atomic CAS');
  console.log('    [VULN-03] Telecom Sender Spoofing: Neutralized via BTRC Sender Whitelist');
  console.log('    [VULN-04] SMS Cash-Out Misclassification: Neutralized via Debit Keyword Blacklist');
  console.log('    [VULN-05] SSRF Webhook Exploitation: Neutralized via Binary IPv6/IPv4 Socket Pinning');
  console.log('    [VULN-06] Amount Oracle Side-Channel: Neutralized via Constant-Time Uniform Errors');
  console.log('    [VULN-07] Stored XSS Script Injection: Neutralized via HTML Entity Escaping');
  console.log('    [VULN-08] Stale Invoice Double-Claim: Neutralized via 15-Minute Dynamic TTL');
  console.log('    [VULN-09] JWT Algorithm None / Cryptographic Forgery: Neutralized & Rejected');
  console.log('    [VULN-10] Staff RBAC Privilege Escalation: Neutralized via Strict Owner Matrix');
  console.log('    [VULN-11] Negative / Float Credit Manipulation: Neutralized via Integrity Guard');
  console.log('    [VULN-12] Cross-Tenant TrxID Collision: Isolated via UNIQUE(brand_id, trx_id)');
  console.log('    [VULN-13] Webhook HMAC Replay Attack: Neutralized via 300s Window & Nonce Cache');
  console.log('###############################################################################\n');
}

main().catch((err) => {
  console.error('\n[FATAL] Adversarial Security Runner Failed:', err.message);
  process.exit(1);
});
