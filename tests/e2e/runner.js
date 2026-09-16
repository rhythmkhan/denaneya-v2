/**
 * DenaNeya v2.0 - E2E Core Payment & Concurrency Master Test Runner
 * File: tests/e2e/runner.js
 * Architect: Milestone 5 Explorer 1 (E2E Core Payment & Concurrency Test Architect)
 *
 * Sequentially executes:
 * - Tier 1: Core Payment Ingestion & Reconciliation (tests/e2e/tier1_core_payment.test.js)
 * - Tier 2: Boundary & Corner Cases (tests/e2e/tier2_boundaries.test.js)
 * - Tier 3: Combinatorial & Concurrency Races (tests/e2e/tier3_concurrency.test.js)
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUITES = [
  { name: 'Tier 1: Core Payment Ingestion & Reconciliation', file: 'tier1_core_payment.test.js' },
  { name: 'Tier 2: Boundary & Corner Cases', file: 'tier2_boundaries.test.js' },
  { name: 'Tier 3: Combinatorial & Concurrency Races', file: 'tier3_concurrency.test.js' }
];

async function runSuite(suite) {
  return new Promise((resolve) => {
    console.log(`\n>>> Launching Suite: ${suite.name} (${suite.file})`);
    const filePath = path.join(__dirname, suite.file);
    const proc = spawn(process.execPath, [filePath], {
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'test' }
    });

    proc.on('close', (code) => {
      resolve({ suite, code });
    });
  });
}

async function runAll() {
  const startTime = Date.now();
  console.log('===============================================================================');
  console.log('  DenaNeya v2.0 - E2E Core Payment & Concurrency Master Test Suite Runner      ');
  console.log('===============================================================================\n');

  const results = [];
  for (const suite of SUITES) {
    const res = await runSuite(suite);
    results.push(res);
    if (res.code !== 0) {
      console.error(`\n[ABORT] Suite ${suite.name} failed with exit code ${res.code}.`);
      process.exit(res.code);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('\n===============================================================================');
  console.log('  ALL E2E CORE PAYMENT & CONCURRENCY SUITES PASSED (100% SUCCESS)             ');
  console.log(`  Total Duration: ${elapsed}s`);
  console.log('  Suites Executed: 3 of 3 passed cleanly');
  console.log('===============================================================================');
}

runAll().catch((err) => {
  console.error('[Runner Fatal Error]', err);
  process.exit(1);
});
