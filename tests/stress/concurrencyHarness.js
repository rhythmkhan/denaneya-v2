/**
 * DenaNeya v2.0 - Root Concurrency & Stress Verification Runner
 * Invokes @denaneya/database stress suite
 */

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

require('../../packages/database/test/stress.test.js');

