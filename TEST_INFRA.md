# E2E Test Infrastructure: DenaNeya v2.0 (দেনা নেয়া ভার্সন টু) — Super Admin Suite & Governance

## 1. Test Philosophy
- **Requirement-Driven & Opaque-Box**: All test cases are derived strictly from authoritative specifications in `ORIGINAL_REQUEST.md` (Follow-up 2026-09-16T05:17:36Z) and `PROJECT.md`. Tests interact exclusively with external HTTP interfaces, database state contracts, and observable outputs without relying on internal function implementations.
- **Progressive Validation**: Testing is organized across tiers that escalate from core functional capabilities to adversarial boundary constraints, asynchronous race conditions, and complete operational workflows:
  - **Tier 1: Feature Coverage**: Validates the happy path and primary behavior for all major platform and governance capabilities (>=23 tests).
  - **Tier 2: Boundary & Corner Cases**: Tests defensive threat boundaries, RBAC isolation, TOTP clock skew/anti-replay, input sanitization, and maintenance mode restrictions (>=20 tests).
  - **Tier 3: Concurrency & Cross-Tenant Races**: Simulates parallel multi-worker race conditions, atomic Compare-And-Swap (CAS) state machines, master switch overrides, and cross-subsystem blocking propagation (>=4 multi-step concurrent tests).
  - **Tier 4: Real-World Operational Workloads**: 4 comprehensive operational user journeys simulating full administrative workflows from initial provisioning through emergency maintenance and fraud triage.
  - **Tier 5: Adversarial Coverage Hardening & Forensic Audit**: Post-M4 adversarial penetration testing, boundary fuzzing, and forensic verification.
- **Isolation & Reproducibility**: Each test suite runs against an isolated in-memory SQLite database singleton (`DB_SQLITE_PATH = ':memory:'`) and dynamic ephemeral HTTP servers (`server.listen(0)`), ensuring zero cross-test interference and deterministic execution order.

---

## 2. Complete Feature Inventory (Features 1–40) & Test Tier Mapping

| # | Feature Name | Description | Milestone | Tier Mapping | Test Case Coverage |
|---|--------------|-------------|-----------|--------------|-------------------|
| 1 | Super Admin Role & RBAC Guard | Session-bound middleware verifying `role = 'superadmin'` on `/api/admin/*` with live DB check | M1 | Tier 1, Tier 2 | `TEST-T1-ADM-01`, `TEST-T1-ADM-02`, `TEST-T2-SEC-01`, `TEST-T2-SEC-02`, `TEST-T2-SEC-03`, `TEST-T2-SEC-04` |
| 2 | Database Migration 002 | Schema additions: `users` 2FA/Google columns, `admin_audit_logs`, `credit_audit_logs`, `impersonation_logs`, `system_settings` | M1 | Tier 1 | `TEST-T1-ADM-01`, `TEST-T1-AUD-01`, `TEST-T1-2FA-01` |
| 3 | Migration Runner Upgrade | Dynamic sequential migration loader in `packages/database/src/migrate.js` executing SQLite & MySQL migrations | M1 | Tier 1 | `TEST-T1-ADM-01`, `setupDatabase()` in all suites |
| 4 | RFC 6238 TOTP Engine | Base32 decoding, HMAC-SHA1 calculation, QR code data URL generation, and ±30s clock skew tolerance | M1 | Tier 1, Tier 2 | `TEST-T1-2FA-01`, `TEST-T1-2FA-02`, `TEST-T2-TOTP-01`, `TEST-T2-TOTP-02`, `TEST-T2-TOTP-05` |
| 5 | TOTP Anti-Replay & Backup Codes | 90s replay prevention cache and 8 single-use hashed recovery backup codes | M1 | Tier 1, Tier 2 | `TEST-T1-2FA-03`, `TEST-T1-2FA-04`, `TEST-T2-TOTP-03`, `TEST-T2-TOTP-04` |
| 6 | Google OAuth 2.0 S2S Validation | Server-to-server Google ID token verification with client ID/secret, user matching/creation, and sandbox mock fallback | M1 | Tier 1, Tier 2 | `TEST-T1-GOG-01`, `TEST-T1-GOG-02`, `TEST-T2-GOOG-01`, `TEST-T2-GOOG-02` |
| 7 | Global Platform KPIs & Health Telemetry | Aggregates network GMV, platform fees, invoice counts, active handsets, uptime, and DB health | M2 | Tier 1 | `TEST-T1-TEL-01`, `TEST-T1-TEL-05`, `SCENARIO-2` |
| 8 | Multi-Brand Volume Timeseries Chart API | Time-series volume intervals across all merchants for 24h, 7d, and 30d periods | M2 | Tier 1 | `TEST-T1-TEL-02`, `SCENARIO-2` |
| 9 | Payment Channel Market Share API | Aggregates volume and counts broken down by channel (bKash, Nagad, Rocket, Upay, Bank, Crypto) | M2 | Tier 1 | `TEST-T1-TEL-03` |
| 10 | Active Handsets & SMS Throughput API | Live rate of SMS processed and connected device counts | M2 | Tier 1 | `TEST-T1-TEL-04` |
| 11 | Paginated Merchant Directory API | Searchable, paginated list of all merchants, brand metadata, device counts, and balances | M2 | Tier 1 | `TEST-T1-MGT-01`, `TEST-T1-MGT-02` |
| 12 | Merchant Status Governance API | Toggle merchant status (`active`, `suspended`, `blocked`) with instant session lockout | M2 | Tier 1, Tier 2, Tier 3 | `TEST-T1-MGT-03`, `TEST-T2-MGT-03`, `TEST-T3-MGT-01`, `SCENARIO-2` |
| 13 | Merchant Credit Adjustment API | Adjusts merchant credit balance with mandatory administrative reason and audit trail | M2 | Tier 1, Tier 2 | `TEST-T1-MGT-04`, `TEST-T2-MGT-01`, `TEST-T2-MGT-02`, `TEST-T2-MGT-04`, `SCENARIO-2` |
| 14 | Administrative Audit Log API | Queryable log of all administrative actions across the platform | M2 | Tier 1 | `TEST-T1-AUD-01`, `SCENARIO-4` |
| 15 | Merchant Impersonation API | Generates scoped merchant token (`isImpersonated: true`) and cryptographically signed return ticket | M2 | Tier 1, Tier 2 | `TEST-T1-IMP-01`, `TEST-T2-SEC-05`, `SCENARIO-2` |
| 16 | Return-to-Admin Reversion API | Validates single-use return ticket and restores super admin session | M2 | Tier 1, Tier 2 | `TEST-T1-IMP-02`, `TEST-T2-SEC-06`, `SCENARIO-2` |
| 17 | Cross-Tenant Carrier SMS Stream API | Global real-time feed of all carrier SMS across all brands with TrxID, sender, and carrier filters | M2 | Tier 1 | `TEST-T1-SMS-01`, `SCENARIO-4` |
| 18 | Manual Reconciliation Override CAS API | Atomic CAS pairing unmatched carrier SMS to pending invoice with webhook dispatch | M2 | Tier 1, Tier 3 | `TEST-T1-REC-01`, `TEST-T3-CAS-01`, `TEST-T3-REC-02`, `SCENARIO-4` |
| 19 | Gateway Master Switches API | Query and globally toggle payment channels on/off network-wide | M2 | Tier 1 | `TEST-T1-GAT-01` |
| 20 | Gateway Master Switch Enforcement | Checkout and verification pipelines respect master switches, overriding tenant activations | M2 | Tier 3 | `TEST-T3-GAT-01` |
| 21 | Dynamic Pricing & Packages API | Configure fee per verification, starter bonus credits, and credit package tiers | M2 | Tier 1 | `TEST-T1-SET-01` |
| 22 | Dynamic Pricing Consumption | Billing verification and registration bonus consume dynamic settings from database | M2 | Tier 3 | `TEST-T3-PRC-01` |
| 23 | Live Site Customizer Settings API | Update hero headlines, announcements, and support links with anti-XSS entity sanitization | M2 | Tier 1, Tier 2 | `TEST-T1-SET-02`, `TEST-T2-XSS-01`, `TEST-T2-XSS-02`, `SCENARIO-3` |
| 24 | Public Dynamic Settings API | Unauthenticated cached endpoint delivering live site copy and announcement banners | M2 | Tier 1 | `TEST-T1-SET-03`, `SCENARIO-3` |
| 25 | Network-Wide Maintenance Mode API | Toggle network-wide maintenance mode with custom message and IP whitelist | M2 | Tier 1 | `TEST-T1-MAI-01`, `SCENARIO-3` |
| 26 | Maintenance Mode Pipeline Guard | Central middleware intercepting public and merchant requests when maintenance is active | M2 | Tier 2, Tier 4 | `TEST-T2-MAI-01`, `TEST-T2-MAI-02`, `TEST-T2-MAI-03`, `SCENARIO-3` |
| 27 | Super Admin Frontend Layout & Routes | Dedicated `/super-admin/*` route group, `SuperAdminRoute` guard, dark theme layout, and sidebar | M3 | Tier 1 (API Support) | Validated via SuperAdmin route contracts and auth token properties |
| 28 | Super Admin Telemetry Dashboard UI | KPI cards, interactive SVG time-series volume charts, channel market share bars, and throughput widget | M3 | Tier 1 (API Support) | Validated via telemetry endpoint payload structures |
| 29 | Merchant Governance & Directory UI | Searchable merchant table, status badges, credit adjustment modal with audit reason, and impersonate button | M3 | Tier 1 (API Support) | Validated via merchant directory and credit adjustment endpoints |
| 30 | 1-Click Merchant Impersonation UX | Session switch + persistent top amber "Return to Super Admin" banner in `DashboardLayout` | M3 | Tier 1, Tier 4 | `TEST-T1-IMP-01`, `TEST-T1-IMP-02`, `SCENARIO-2` |
| 31 | Cross-Tenant SMS Stream Monitor UI | Real-time carrier feed, TrxID search filter, carrier badges, raw SMS viewer | M3 | Tier 1, Tier 4 | `TEST-T1-SMS-01`, `SCENARIO-4` |
| 32 | Manual Reconciliation Override Modal | Modal to search invoice, preview details, and execute atomic CAS override | M3 | Tier 1, Tier 4 | `TEST-T1-REC-01`, `SCENARIO-4` |
| 33 | Gateway Master Switches UI | 52+ channel master switches categorized across Mobile, Bank, International | M3 | Tier 1, Tier 3 | `TEST-T1-GAT-01`, `TEST-T3-GAT-01` |
| 34 | Credit & Pricing Manager UI | Interactive editor for verification fee, starter credits, and topup packages | M3 | Tier 1, Tier 3 | `TEST-T1-SET-01`, `TEST-T3-PRC-01` |
| 35 | Live Site Customizer UI | Form for hero copy, announcement banner toggle/text, WhatsApp/Telegram links, and maintenance switch | M3 | Tier 1, Tier 4 | `TEST-T1-SET-02`, `TEST-T1-MAI-01`, `SCENARIO-3` |
| 36 | Google OAuth 2.0 UI | Branded 1-click Google Sign-In button on login pages with sandbox fallback | M3 | Tier 1, Tier 2 | `TEST-T1-GOG-01`, `TEST-T2-GOOG-01` |
| 37 | Google Authenticator TOTP UI | Setup modal with scannable QR code, manual secret, 6-digit verification, and 2FA login challenge | M3 | Tier 1, Tier 4 | `TEST-T1-2FA-01`, `TEST-T1-2FA-02`, `SCENARIO-1` |
| 38 | Public Web Customizer & Maintenance Reflection | Dynamic hero copy, announcement banner, and maintenance mode overlay on `apps/web` and checkout | M3 | Tier 2, Tier 4 | `TEST-T2-MAI-01`, `SCENARIO-3` |
| 39 | Comprehensive 4-Tier Automated E2E Suite | 100% passing automated test suite covering Tiers 1-4 (feature coverage, boundaries, concurrency, real-world) | M4 | All Tiers | All suites executed via `master_e2e_runner.js` |
| 40 | Tier 5 Adversarial Coverage & Forensic Audit | Adversarial penetration testing, boundary fuzzing, and forensic integrity audit verification | M4 | Tier 5 | Stage 6 Adversarial Security and Forensic Verification |

---

## 3. Test Architecture & Coverage Thresholds

### Test Execution Matrix
```
denaneya_v2/tests/e2e/
├── tier1_superadmin_core.test.js        [Tier 1: Core Features, >=23 tests]
├── tier2_superadmin_boundaries.test.js  [Tier 2: Security & Boundaries, >=20 tests]
├── tier3_superadmin_concurrency.test.js [Tier 3: Concurrency Races, >=4 multi-step tests]
├── tier4_superadmin_realworld.test.js   [Tier 4: 4 Operational User Journeys]
└── master_e2e_runner.js                [Unified Orchestrator & Multi-Tier Aggregator]
```

### Coverage Thresholds
1. **Tier 1 (Core Capabilities)**:
   - Minimum Test Count: **>= 23 automated assertions**
   - Required Coverage: Super Admin Auth & Session, KPIs & Telemetry, Merchant Directory, Status Governance, Credit Adjustment, Audit Logs, Impersonation & Return, Cross-Tenant SMS Stream, Manual Reconciliation CAS, TOTP 2FA (generate, verify, backup), Google Auth S2S, Master Gateway Switches, Pricing Manager, Site Customizer, Maintenance Mode Toggle.
2. **Tier 2 (Boundaries & Threat Vectors)**:
   - Minimum Test Count: **>= 20 automated assertions**
   - Required Coverage: RBAC Boundaries (Merchant/Staff JWT rejected with 403 on all `/api/admin/*` endpoints), Missing Auth (401), Impersonation Token Privileges (cannot invoke admin APIs), Forged/Replayed Return Tickets (401), Deactivated Admin Token (403), TOTP Clock Skew (±30s passes, ±90s fails), TOTP Replay Prevention (90s window rejected with 400), Single-Use Backup Code Invalidation, Malformed TOTP input, Google Token Validation & Role Mismatch, Credit Bounds (no negative balance, non-numeric rejected), Customizer Anti-XSS Sanitization & URL Scheme Validation, Maintenance Mode Interception (503 for public, 200 for super admin and whitelisted IPs).
3. **Tier 3 (Concurrency & Cross-Feature Races)**:
   - Minimum Test Count: **>= 4 multi-step concurrent scenarios**
   - Required Coverage:
     - 10-Worker Race: 5 Carrier Sync + 5 Manual Admin Reconciles for same TrxID (Atomic CAS, exactly 1 succeeds, 9 return 409).
     - Master Switch Override: Disabling gateway globally overrides active tenant gateway in checkout and submit-trx.
     - Merchant Blocking Propagation: Setting merchant status to blocked immediately invalidates merchant JWT, device sync requests, and checkout sessions.
     - Dynamic Pricing Propagation: Updating fee per verification takes effect immediately on subsequent transactions.
4. **Tier 4 (Real-World Operational Workloads)**:
   - Minimum Count: **4 complete end-to-end user journeys**
   - Scenario 1: Super Admin Provisioning & 2FA Hardening Journey.
   - Scenario 2: Merchant Fraud Triage & Impersonation Investigation.
   - Scenario 3: Emergency Network Maintenance & Live Customizer Broadcast.
   - Scenario 4: Unmatched Carrier SMS Triage & Manual Reconciliation Override.

---

## 4. Interface Contracts

### 4.1 Super Admin Auth Guard Contract
- **Mount Point**: Attached to all routes under `/api/admin/*`
- **Request Header**: `Authorization: Bearer <jwt_token>`
- **Validation Pipeline**:
  1. Cryptographic HS256 signature verification using `JWT_SECRET`.
  2. Database lookup: `SELECT id, email, role, status FROM users WHERE id = ?`.
  3. Strict condition: `user.status === 'active' AND user.role === 'superadmin'`.
  4. Response on missing/malformed header or expired/invalid signature: HTTP 401 `UNAUTHORIZED`.
  5. Response on role mismatch (`role !== 'superadmin'`): HTTP 403 `FORBIDDEN_SUPERADMIN_REQUIRED`.
  6. Response on inactive user (`status !== 'active'`): HTTP 403 `ACCOUNT_DEACTIVATED`.

### 4.2 Impersonation Session Contract
- **Start Impersonation**: `POST /api/admin/impersonate/:merchantId`
  - Auth: Valid Super Admin JWT
  - Response: `{ success: true, impersonationToken: "<jwt>", returnTicket: "<hmac_ticket>", merchant: { id, name, email } }`
  - Token Claims: `{ id: merchant.id, role: 'merchant', isImpersonated: true, adminId: admin.id, exp: '30m' }`
- **Exit Impersonation**: `POST /api/admin/impersonate/exit`
  - Request Body: `{ returnTicket: "<hmac_ticket>" }`
  - Ticket Verification: HMAC-SHA256 signature check + single-use cache invalidation.
  - Response: `{ success: true, adminToken: "<jwt>", user: { id, email, role: 'superadmin' } }`

### 4.3 Manual Reconciliation CAS Contract
- **Endpoint**: `POST /api/admin/reconcile/manual`
- **Request Body**: `{ storedDataId: string, invoiceId: string, reason: string }`
- **CAS Step 1**: `UPDATE stored_data SET status = 'USED', used_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'UNUSED'`
- **CAS Step 2**: `UPDATE invoices SET status = 'PAID', trx_id = ?, payment_method = ? WHERE id = ? AND status = 'PENDING'`
- **Side Effects**: Deducts fee credits from merchant account, enqueues HMAC-SHA256 webhook dispatch, records entry in `admin_audit_logs`.
- **Conflict Handling**: If either update affects 0 rows, rolls back and returns HTTP 409 `TRANSACTION_ALREADY_USED` or `INVOICE_NOT_PENDING`.

### 4.4 Gateway Master Switch Contract
- **Storage**: `system_settings` table key `'master_gateways'`, JSON value `{"disabled_channels": ["bkash", "rocket"]}`.
- **Query**: `GET /api/admin/gateways/master` returns all 52+ channels with their global enablement status.
- **Toggle**: `PUT /api/admin/gateways/master/:channel` with `{ enabled: boolean }`.
- **Enforcement**: In `apps/api/src/routes/invoiceRoutes.js` and `apps/api/src/controllers/paymentController.js`:
  - `GET /pay/:invoiceId` filters out any channel present in `disabled_channels`.
  - `POST /api/payment/submit-trx` verifies the submitted payment channel is not globally disabled. If disabled, rejects with HTTP 400 `GATEWAY_GLOBALLY_DISABLED`.

### 4.5 Maintenance Mode Contract
- **Storage**: `system_settings` table key `'maintenance_mode'`, JSON value `{"enabled": boolean, "message": string, "allowed_ips": string[]}`.
- **Enforcement**:
  - Middleware checks `enabled === true`.
  - Bypassed if request contains valid Super Admin JWT or client IP is in `allowed_ips`.
  - If not bypassed, immediately terminates with HTTP 503 `SERVICE_MAINTENANCE` and returns JSON maintenance payload.

---

## 5. Verification Commands
To execute the complete automated verification suite:

```bash
# Run entire master E2E suite across all tiers
node tests/e2e/master_e2e_runner.js --tier=all

# Run individual Super Admin suites
node tests/e2e/tier1_superadmin_core.test.js
node tests/e2e/tier2_superadmin_boundaries.test.js
node tests/e2e/tier3_superadmin_concurrency.test.js
node tests/e2e/tier4_superadmin_realworld.test.js
```
