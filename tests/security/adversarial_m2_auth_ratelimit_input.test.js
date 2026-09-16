/**
 * DenaNeya v2.0 - Milestone 2 Adversarial Security Test Suite
 * Executed by Challenger 2 (teamwork_preview_challenger_m2_2)
 *
 * Scope:
 * 1. Authentication Timing Attack Verification (Constant-Time Dummy Bcrypt vs Real Hash)
 * 2. Password Complexity Enforcement & Boundary Conditions
 * 3. SQL Injection Immunity across Auth Inputs (Registration & Login)
 * 4. Stored & Reflected XSS Neutralization via Sanitization Pipeline
 * 5. Prototype Pollution Defense (CWE-1321: __proto__, constructor, prototype)
 * 6. Oversized Request Body Rejection (>100KB DoS Defense, HTTP 413)
 * 7. Rate Limiter Boundary Enforcement (HTTP 429 Throttling)
 * 8. Post-Attack Database Integrity & Process Forensics
 */

process.env.NODE_ENV = 'test';
process.env.DB_CLIENT = 'sqlite';
process.env.DB_SQLITE_PATH = ':memory:';

// Dynamic imports to ensure process.env is configured prior to module evaluation
const [
  assertPkg,
  cryptoPkg,
  perfPkg,
  expressPkg,
  dbModule,
  appModule,
  rlModule
] = await Promise.all([
  import('node:assert'),
  import('node:crypto'),
  import('node:perf_hooks'),
  import('express'),
  import('@denaneya/database'),
  import('../../apps/api/src/app.js'),
  import('../../apps/api/src/middlewares/rateLimiter.js')
]);

const crypto = cryptoPkg.default;
const { performance } = perfPkg;
const express = expressPkg.default;
const { getDatabase, runMigrations, runSeed } = dbModule.default;
const { createApp } = appModule;
const {
  authLimiter,
  globalLimiter,
  trxSubmitLimiter,
  deviceSyncLimiter
} = rlModule;

console.log('===============================================================================');
console.log('  DenaNeya v2.0 - Milestone 2 Adversarial Security Challenge Test Suite        ');
console.log('  Challenger 2: Auth Timing, Rate Limiting, Prototype Pollution, & Input San.  ');
console.log('===============================================================================\n');

const stats = {
  total: 0,
  passed: 0,
  failed: 0,
  findings: []
};

function record(id, category, description, passed, detail = null) {
  stats.total++;
  if (passed) {
    stats.passed++;
    console.log(`  [PASS] ${id} - ${category}: ${description}`);
  } else {
    stats.failed++;
    console.log(`  [FAIL/VULN] ${id} - ${category}: ${description}`);
    if (detail) console.log(`         >>> Detail: ${detail}`);
    stats.findings.push({ id, category, description, detail });
    process.exitCode = 1;
  }
}

let server;
let baseUrl;
let db;

async function setup() {
  console.log('[Setup] Initializing in-memory SQLite database singleton...');
  db = getDatabase();
  await runMigrations(db, { reset: true });
  await runSeed(db);
  console.log(`[Setup] In-memory SQLite initialized (db: ${db.raw.name}). Seeds loaded.`);

  const app = createApp();
  server = app.listen(0);
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
  console.log(`[Setup] Target API test server listening on ${baseUrl}\n`);
}

async function teardown() {
  console.log('\n[Teardown] Shutting down test server and closing database...');
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  if (db) {
    await db.close();
  }
  console.log('[Teardown] Cleanup complete.');
}

async function request(path, { method = 'GET', headers = {}, body = null } = {}) {
  const reqHeaders = {
    'Content-Type': 'application/json',
    ...headers
  };

  const options = {
    method,
    headers: reqHeaders
  };

  if (body !== null) {
    options.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  const res = await fetch(`${baseUrl}${path}`, options);
  const rawText = await res.text();
  let json = null;
  try {
    json = JSON.parse(rawText);
  } catch (_) {
    json = rawText;
  }

  return {
    status: res.status,
    headers: res.headers,
    body: json,
    rawText
  };
}

function resetAllLimiters() {
  const ips = ['127.0.0.1', '::ffff:127.0.0.1', '::1'];
  for (const ip of ips) {
    try { authLimiter.resetKey(ip); } catch (_) {}
    try { globalLimiter.resetKey(ip); } catch (_) {}
    try { trxSubmitLimiter.resetKey(ip); } catch (_) {}
    try { deviceSyncLimiter.resetKey(ip); } catch (_) {}
  }
}

async function runAllTests() {
  await setup();

  // ==========================================================================
  // SUITE 1: AUTHENTICATION TIMING ATTACK MEASUREMENT
  // ==========================================================================
  console.log('--- [SUITE 1] Authentication Timing Attack Resistance ---');
  resetAllLimiters();

  // Register a benchmark user for timing measurement
  const benchmarkEmail = 'timing_benchmark_user@zinipay.com';
  const benchmarkPassword = 'RealPassword123!';
  const wrongPassword = 'WrongPassword456!';

  await request('/api/auth/register', {
    method: 'POST',
    body: {
      name: 'Timing Benchmark User',
      email: benchmarkEmail,
      password: benchmarkPassword
    }
  });

  // JIT Warmup
  await request('/api/auth/login', {
    method: 'POST',
    body: { email: benchmarkEmail, password: wrongPassword }
  });
  await request('/api/auth/login', {
    method: 'POST',
    body: { email: 'warmup_nonexistent@zinipay.com', password: wrongPassword }
  });
  resetAllLimiters();

  const TRIALS = 15;
  const realEmailDurations = [];
  const fakeEmailDurations = [];
  let allCodesMatch401 = true;
  let allBodiesIdentical = true;

  for (let i = 0; i < TRIALS; i++) {
    // Target A: Existing user, wrong password
    const tA0 = performance.now();
    const resA = await request('/api/auth/login', {
      method: 'POST',
      body: { email: benchmarkEmail, password: wrongPassword }
    });
    const tA1 = performance.now();
    realEmailDurations.push(tA1 - tA0);

    // Target B: Nonexistent user, wrong password
    const fakeEmail = `nonexistent_user_${i}_${crypto.randomBytes(4).toString('hex')}@fake-domain.xyz`;
    const tB0 = performance.now();
    const resB = await request('/api/auth/login', {
      method: 'POST',
      body: { email: fakeEmail, password: wrongPassword }
    });
    const tB1 = performance.now();
    fakeEmailDurations.push(tB1 - tB0);

    if (resA.status !== 401 || resB.status !== 401) {
      allCodesMatch401 = false;
    }
    if (
      resA.body?.code !== 'INVALID_CREDENTIALS' ||
      resB.body?.code !== 'INVALID_CREDENTIALS' ||
      resA.body?.message !== resB.body?.message
    ) {
      allBodiesIdentical = false;
    }
  }

  const mean = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const median = (arr) => {
    const sorted = [...arr].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  };

  const meanReal = mean(realEmailDurations);
  const meanFake = mean(fakeEmailDurations);
  const medianReal = median(realEmailDurations);
  const medianFake = median(fakeEmailDurations);
  const absDiff = Math.abs(meanReal - meanFake);
  const ratio = meanReal / (meanFake || 1);

  console.log(`    Metrics over ${TRIALS} alternating trials:`);
  console.log(`      Valid Email + Wrong Pass : Mean = ${meanReal.toFixed(2)}ms, Median = ${medianReal.toFixed(2)}ms`);
  console.log(`      Nonexistent Email        : Mean = ${meanFake.toFixed(2)}ms, Median = ${medianFake.toFixed(2)}ms`);
  console.log(`      Absolute Difference      : ${absDiff.toFixed(2)}ms | Ratio (Real/Fake): ${ratio.toFixed(2)}x`);

  record(
    'TIMING-01',
    'Auth Timing Attack',
    'Existing user and nonexistent user both return identical HTTP 401 INVALID_CREDENTIALS',
    allCodesMatch401 && allBodiesIdentical,
    `CodesMatch: ${allCodesMatch401}, BodiesIdentical: ${allBodiesIdentical}`
  );

  record(
    'TIMING-02',
    'Auth Timing Attack',
    `Response latencies are constant-time bounded (|diff| = ${absDiff.toFixed(2)}ms, ratio = ${ratio.toFixed(2)}x)`,
    absDiff < 25 && ratio >= 0.65 && ratio <= 1.5,
    `Latency delta too high: diff=${absDiff.toFixed(2)}ms, ratio=${ratio.toFixed(2)}x`
  );

  // ==========================================================================
  // SUITE 2: PASSWORD COMPLEXITY & BOUNDARY CONDITIONS
  // ==========================================================================
  console.log('\n--- [SUITE 2] Password Complexity Enforcement ---');
  resetAllLimiters();

  const weakPasswords = [
    { label: 'Too short (7 chars)', pass: 'Abc123!' },
    { label: 'No uppercase letter', pass: 'all_lowercase_123!' },
    { label: 'No lowercase letter', pass: 'ALL_UPPERCASE_123!' },
    { label: 'No numeric digit', pass: 'NoNumbersInThisPassword!' },
    { label: 'Empty string', pass: '' },
    { label: 'Spaces only', pass: '          ' }
  ];

  for (let i = 0; i < weakPasswords.length; i++) {
    const item = weakPasswords[i];
    const res = await request('/api/auth/register', {
      method: 'POST',
      body: {
        name: `Weak Tester ${i}`,
        email: `weak_pass_${i}@zinipay.com`,
        password: item.pass
      }
    });

    record(
      `PASS-WEAK-0${i + 1}`,
      'Password Policy',
      `Rejects weak password: ${item.label} (HTTP 400 VALIDATION_ERROR)`,
      res.status === 400 && res.body?.code === 'VALIDATION_ERROR' && res.body?.errors?.password !== undefined,
      `Status: ${res.status}, Body: ${JSON.stringify(res.body)}`
    );
  }

  // Valid password boundary tests
  const validRes = await request('/api/auth/register', {
    method: 'POST',
    body: {
      name: 'Valid Boundary User',
      email: 'valid_boundary_user@zinipay.com',
      password: 'Aa1!ValidLength8'
    }
  });
  record(
    'PASS-VALID-01',
    'Password Policy',
    'Accepts valid password meeting all complexity criteria (HTTP 201)',
    validRes.status === 201 && validRes.body?.success === true,
    `Status: ${validRes.status}, Body: ${JSON.stringify(validRes.body)}`
  );

  // Multi-byte Unicode password
  const unicodeRes = await request('/api/auth/register', {
    method: 'POST',
    body: {
      name: 'Unicode Password User',
      email: 'unicode_user@zinipay.com',
      password: 'Str0ngPass日本語123!'
    }
  });
  record(
    'PASS-UNICODE-01',
    'Password Policy',
    'Handles multi-byte Unicode password without crash (HTTP 201)',
    unicodeRes.status === 201 && unicodeRes.body?.success === true,
    `Status: ${unicodeRes.status}`
  );

  // ==========================================================================
  // SUITE 3: SQL INJECTION IMMUNITY IN REGISTRATION & LOGIN
  // ==========================================================================
  console.log('\n--- [SUITE 3] SQL Injection Immunity ---');
  resetAllLimiters();

  const sqliEmailPayloads = [
    "' OR '1'='1",
    "admin'--",
    "' UNION SELECT 1, 'admin', 'hacked@x.com', 'hash', 'admin', 9999, 'active'--",
    "'; DROP TABLE users; --",
    "admin@zinipay.com' OR '1'='1",
    "\" OR \"\"=\""
  ];

  for (let i = 0; i < sqliEmailPayloads.length; i++) {
    const payload = sqliEmailPayloads[i];
    // Test in registration email
    const regRes = await request('/api/auth/register', {
      method: 'POST',
      body: {
        name: 'SQLi Tester',
        email: payload,
        password: 'ValidPassword123!'
      }
    });

    record(
      `SQLI-REG-EMAIL-0${i + 1}`,
      'SQL Injection',
      `Registration rejects SQLi in email: "${payload}" (HTTP 400 VALIDATION_ERROR)`,
      regRes.status === 400 && regRes.body?.code === 'VALIDATION_ERROR',
      `Status: ${regRes.status}`
    );

    // Test in login email
    const loginRes = await request('/api/auth/login', {
      method: 'POST',
      body: {
        email: payload,
        password: 'Password123!'
      }
    });

    record(
      `SQLI-LOGIN-EMAIL-0${i + 1}`,
      'SQL Injection',
      `Login rejects SQLi in email: "${payload}" (HTTP 400 VALIDATION_ERROR)`,
      loginRes.status === 400 && loginRes.body?.code === 'VALIDATION_ERROR',
      `Status: ${loginRes.status}`
    );
  }

  // SQL injection in login password field
  const sqliPassPayloads = [
    "' OR '1'='1",
    "' OR 1=1 --",
    "admin'--",
    "'; DROP TABLE brands; --"
  ];

  for (let i = 0; i < sqliPassPayloads.length; i++) {
    const passPayload = sqliPassPayloads[i];
    const passRes = await request('/api/auth/login', {
      method: 'POST',
      body: {
        email: benchmarkEmail,
        password: passPayload
      }
    });

    record(
      `SQLI-LOGIN-PASS-0${i + 1}`,
      'SQL Injection',
      `Login rejects SQLi password payload: "${passPayload}" (HTTP 401 INVALID_CREDENTIALS)`,
      passRes.status === 401 && passRes.body?.code === 'INVALID_CREDENTIALS',
      `Status: ${passRes.status}`
    );
  }

  // SQL injection in registration name field (attempt table destruction)
  const dropAttemptName = "Robert'); DROP TABLE users;--";
  const dropRes = await request('/api/auth/register', {
    method: 'POST',
    body: {
      name: dropAttemptName,
      email: 'sqli_name_tester@zinipay.com',
      password: 'SafePassword123!'
    }
  });

  // Check if users table is intact
  const usersCount = await db.get('SELECT COUNT(*) as cnt FROM users');
  record(
    'SQLI-NAME-01',
    'SQL Injection',
    'Registration parameterized insertion neutralizes DDL injection attempt; users table intact',
    dropRes.status === 201 && Number(usersCount.cnt) > 0,
    `Reg Status: ${dropRes.status}, Users Count: ${usersCount?.cnt}`
  );

  // ==========================================================================
  // SUITE 4: XSS SANITIZATION IN INPUTS
  // ==========================================================================
  console.log('\n--- [SUITE 4] Cross-Site Scripting (XSS) Sanitization ---');
  resetAllLimiters();

  const xssPayloads = [
    {
      name: "<script>alert('Stored XSS')</script>",
      expectedSubstring: "&lt;script&gt;alert(&#x27;Stored XSS&#x27;)&lt;&#x2F;script&gt;"
    },
    {
      name: '<img src="x" onerror="alert(1)">',
      expectedSubstring: '&lt;img src=&quot;x&quot; onerror=&quot;alert(1)&quot;&gt;'
    },
    {
      name: '<svg/onload=alert(document.domain)>',
      expectedSubstring: '&lt;svg&#x2F;onload=alert(document.domain)&gt;'
    },
    {
      name: '"><script src="https://evil.com/x.js"></script>',
      expectedSubstring: '&quot;&gt;&lt;script src=&quot;https:&#x2F;&#x2F;evil.com&#x2F;x.js&quot;&gt;&lt;&#x2F;script&gt;'
    }
  ];

  for (let i = 0; i < xssPayloads.length; i++) {
    const item = xssPayloads[i];
    const xssEmail = `xss_test_${i}@zinipay.com`;
    const regRes = await request('/api/auth/register', {
      method: 'POST',
      body: {
        name: item.name,
        email: xssEmail,
        password: 'ValidPassword123!'
      }
    });

    const returnedName = regRes.body?.user?.name || '';
    const token = regRes.body?.token;

    // Also verify profile fetch (/api/auth/me) preserves sanitization
    let meName = '';
    if (token) {
      const meRes = await request('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      meName = meRes.body?.user?.name || '';
    }

    record(
      `XSS-SANITIZE-0${i + 1}`,
      'Input Sanitization',
      `HTML entities in name escaped on registration and profile fetch (${item.name.slice(0, 20)}...)`,
      returnedName === item.expectedSubstring && meName === item.expectedSubstring,
      `Returned: "${returnedName}", Expected: "${item.expectedSubstring}"`
    );
  }

  // ==========================================================================
  // SUITE 5: OBJECT PROTOTYPE POLLUTION DEFENSE (CWE-1321)
  // ==========================================================================
  console.log('\n--- [SUITE 5] Object Prototype Pollution Defense (CWE-1321) ---');
  resetAllLimiters();

  // Test 1: Direct __proto__ in registration body
  await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      __proto__: { polluted_root: 'ATTACK_SUCCESS', role: 'admin', isAdmin: true },
      name: 'Proto Root Tester',
      email: 'proto_root@zinipay.com',
      password: 'SafePassword123!'
    })
  });

  const check1 = Object.prototype.polluted_root === undefined && ({}).polluted_root === undefined;
  const checkAdmin = Object.prototype.isAdmin === undefined && ({}).isAdmin === undefined;

  record(
    'PROTO-01',
    'Prototype Pollution',
    'Root __proto__ payload stripped without polluting Object.prototype',
    check1 && checkAdmin,
    `polluted_root: ${Object.prototype.polluted_root}, isAdmin: ${Object.prototype.isAdmin}`
  );

  // Test 2: Nested __proto__ in sub-objects
  await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Proto Nested Tester',
      email: 'proto_nested@zinipay.com',
      password: 'SafePassword123!',
      metadata: {
        __proto__: { polluted_nested: 'ATTACK_SUCCESS' }
      }
    })
  });

  const check2 = Object.prototype.polluted_nested === undefined && ({}).polluted_nested === undefined;
  record(
    'PROTO-02',
    'Prototype Pollution',
    'Nested __proto__ payload stripped in child objects',
    check2,
    `polluted_nested: ${Object.prototype.polluted_nested}`
  );

  // Test 3: constructor.prototype pollution
  await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      constructor: {
        prototype: { polluted_constructor: 'ATTACK_SUCCESS' }
      },
      email: 'proto_root@zinipay.com',
      password: 'SafePassword123!'
    })
  });

  const check3 = Object.prototype.polluted_constructor === undefined && ({}).polluted_constructor === undefined;
  record(
    'PROTO-03',
    'Prototype Pollution',
    'constructor.prototype payload stripped without prototype alteration',
    check3,
    `polluted_constructor: ${Object.prototype.polluted_constructor}`
  );

  // Test 4: Array containing polluted objects
  await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Proto Array Tester',
      email: 'proto_array@zinipay.com',
      password: 'SafePassword123!',
      tags: [{ __proto__: { polluted_array: 'ATTACK_SUCCESS' } }]
    })
  });

  const check4 = Object.prototype.polluted_array === undefined && ({}).polluted_array === undefined;
  record(
    'PROTO-04',
    'Prototype Pollution',
    'Array of objects with __proto__ cleanly neutralized',
    check4,
    `polluted_array: ${Object.prototype.polluted_array}`
  );

  // ==========================================================================
  // SUITE 6: OVERSIZED REQUEST BODY REJECTION (>100KB DoS DEFENSE)
  // ==========================================================================
  console.log('\n--- [SUITE 6] Request Body Size Limitation (DoS Defense, HTTP 413) ---');
  resetAllLimiters();

  // Test 1: 105 KB payload (exceeds 100KB limit)
  const oversized105KB = {
    email: 'oversized@zinipay.com',
    password: 'ValidPassword123!',
    padding: 'X'.repeat(105 * 1024)
  };
  const res105 = await request('/api/auth/login', {
    method: 'POST',
    body: oversized105KB
  });

  record(
    'OVERSIZE-01',
    'Body Size Limit',
    '105KB payload to /api/auth/login rejected with HTTP 413 PAYLOAD_TOO_LARGE',
    res105.status === 413 && res105.body?.code === 'PAYLOAD_TOO_LARGE',
    `Status: ${res105.status}, Body: ${JSON.stringify(res105.body)}`
  );

  // Test 2: 250 KB payload to /api/auth/register
  const oversized250KB = {
    name: 'Oversized User',
    email: 'oversized250@zinipay.com',
    password: 'ValidPassword123!',
    junkData: 'Z'.repeat(250 * 1024)
  };
  const res250 = await request('/api/auth/register', {
    method: 'POST',
    body: oversized250KB
  });

  record(
    'OVERSIZE-02',
    'Body Size Limit',
    '250KB payload to /api/auth/register rejected with HTTP 413 PAYLOAD_TOO_LARGE',
    res250.status === 413 && res250.body?.code === 'PAYLOAD_TOO_LARGE',
    `Status: ${res250.status}, Body: ${JSON.stringify(res250.body)}`
  );

  // Test 3: Boundary Test: 90 KB payload (under 100KB limit) is parsed normally
  const under90KB = {
    email: 'valid_under_limit@zinipay.com',
    password: 'ValidPassword123!',
    padding: 'A'.repeat(90 * 1024)
  };
  const res90 = await request('/api/auth/login', {
    method: 'POST',
    body: under90KB
  });

  record(
    'OVERSIZE-03',
    'Body Size Limit',
    '90KB payload (under 100KB) is accepted by body-parser (not 413)',
    res90.status !== 413,
    `Status: ${res90.status}`
  );

  // Test 4: Post-DoS Liveness Check
  const healthRes = await request('/api/health');
  record(
    'OVERSIZE-04',
    'Body Size Limit',
    'Server remains fully responsive on /api/health after handling oversized floods',
    healthRes.status === 200 && healthRes.body?.status === 'ok',
    `Status: ${healthRes.status}`
  );

  // ==========================================================================
  // SUITE 7: RATE LIMITER BOUNDARY ENFORCEMENT (HTTP 429)
  // ==========================================================================
  console.log('\n--- [SUITE 7] Rate Limiter Boundary Enforcement ---');
  resetAllLimiters();

  // Test 1: Test trxSubmitLimiter (strict limit: 5 requests per 1 min)
  const testTrxApp = express();
  testTrxApp.set('trust proxy', 1);
  testTrxApp.use(express.json());
  testTrxApp.post('/test/trx', trxSubmitLimiter, (req, res) => {
    res.status(200).json({ success: true });
  });
  const trxServer = testTrxApp.listen(0);
  const trxPort = trxServer.address().port;

  let trxPassCount = 0;
  let trxBlockedStatus = 0;
  let trxBlockedBody = null;

  for (let i = 1; i <= 7; i++) {
    const res = await fetch(`http://127.0.0.1:${trxPort}/test/trx`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trx_id: `TRX_${i}` })
    });
    if (res.status === 200) {
      trxPassCount++;
    } else if (res.status === 429) {
      trxBlockedStatus = res.status;
      trxBlockedBody = await res.json();
    }
  }
  await new Promise((r) => trxServer.close(r));

  record(
    'RATELIMIT-TRX-01',
    'Rate Limiting',
    'trxSubmitLimiter strictly allows 5 attempts then triggers HTTP 429 TRX_RATE_LIMIT_EXCEEDED',
    trxPassCount === 5 && trxBlockedStatus === 429 && trxBlockedBody?.code === 'TRX_RATE_LIMIT_EXCEEDED',
    `Passed: ${trxPassCount}, Blocked Status: ${trxBlockedStatus}, Code: ${trxBlockedBody?.code}`
  );

  // Test 2: authLimiter boundary test on target app
  // In test environment, authLimiter allows 100 attempts before triggering HTTP 429.
  resetAllLimiters();
  let authPassCount = 0;
  let authBlockedAt = null;
  let authBlockedResponse = null;

  console.log('    Executing burst of 105 requests against /api/auth/login...');
  for (let i = 1; i <= 105; i++) {
    const res = await request('/api/auth/login', {
      method: 'POST',
      body: {
        email: 'benchmark_burst@zinipay.com',
        password: 'BurstPassword123!'
      }
    });

    if (res.status === 401 || res.status === 400) {
      authPassCount++;
    } else if (res.status === 429) {
      if (authBlockedAt === null) {
        authBlockedAt = i;
        authBlockedResponse = res;
      }
    }
  }

  record(
    'RATELIMIT-AUTH-01',
    'Rate Limiting',
    `authLimiter boundary triggers HTTP 429 after 100 requests (Triggered at #${authBlockedAt})`,
    authPassCount === 100 && authBlockedAt === 101 && authBlockedResponse?.status === 429,
    `Pass Count: ${authPassCount}, Blocked At: ${authBlockedAt}, Status: ${authBlockedResponse?.status}`
  );

  record(
    'RATELIMIT-AUTH-02',
    'Rate Limiting',
    'authLimiter HTTP 429 payload contains AUTH_RATE_LIMIT_EXCEEDED code',
    authBlockedResponse?.body?.code === 'AUTH_RATE_LIMIT_EXCEEDED',
    `Body: ${JSON.stringify(authBlockedResponse?.body)}`
  );

  // ==========================================================================
  // SUITE 8: DATABASE INTEGRITY & POST-ATTACK FORENSICS
  // ==========================================================================
  console.log('\n--- [SUITE 8] Post-Attack Database Integrity & Forensics ---');

  const { rows: tables } = await db.query(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
  );
  const tableNames = tables.map((t) => t.name);
  const requiredTables = [
    'users',
    'brands',
    'devices',
    'gateways',
    'invoices',
    'stored_data',
    'webhook_logs',
    'staff_permissions',
    'affiliate_referrals'
  ];

  const allTablesIntact = requiredTables.every((t) => tableNames.includes(t));
  record(
    'FORENSIC-01',
    'Database Integrity',
    'All 9 production relational tables intact following exhaustive SQLi attacks',
    allTablesIntact,
    `Tables found: ${JSON.stringify(tableNames)}`
  );

  // Check that Object.prototype is pristine
  const pollutedKeys = Object.keys(Object.prototype);
  const hasPollution =
    'polluted_root' in Object.prototype ||
    'polluted_nested' in Object.prototype ||
    'polluted_constructor' in Object.prototype ||
    'polluted_array' in Object.prototype;

  record(
    'FORENSIC-02',
    'Process Integrity',
    'Object.prototype remains pristine with zero prototype pollution contamination',
    !hasPollution,
    `Polluted keys detected: ${pollutedKeys.join(', ')}`
  );

  await teardown();

  // Print Summary
  console.log('\n===============================================================================');
  console.log(`  Challenger Test Results: ${stats.passed} Passed, ${stats.failed} Failed / Vulnerable`);
  console.log('===============================================================================');

  if (stats.failed > 0) {
    console.error('\n[VERDICT]: REQUEST_CHANGES - Vulnerabilities detected.');
    process.exitCode = 1;
  } else {
    console.log('\n[VERDICT]: APPROVE - All adversarial challenges resisted successfully.');
    process.exitCode = 0;
  }
}

runAllTests().catch((err) => {
  console.error('[Fatal Test Error]:', err);
  process.exitCode = 1;
});
