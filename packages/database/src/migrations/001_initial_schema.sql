-- ==============================================================================
-- দেনা নেয়া ভার্সন টু (DenaNeya v2.0) - SQLite 3 Initial Schema Migration
-- Compatible with better-sqlite3 for Local Development and CI/CD Testing
-- ==============================================================================

PRAGMA foreign_keys = ON;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'merchant',
    credits INT NOT NULL DEFAULT 50,
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_users_credits CHECK (credits >= 0)
);

-- 2. Brands Table (Multi-Tenant Root)
CREATE TABLE IF NOT EXISTS brands (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    brand_name VARCHAR(120) NOT NULL,
    brand_slug VARCHAR(120) NOT NULL UNIQUE,
    api_key VARCHAR(64) NOT NULL UNIQUE,
    api_secret VARCHAR(128) NOT NULL,
    webhook_url VARCHAR(500) NULL,
    webhook_secret VARCHAR(128) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Devices Table (Android SMS Sync Handsets)
CREATE TABLE IF NOT EXISTS devices (
    id VARCHAR(36) PRIMARY KEY,
    brand_id VARCHAR(36) NOT NULL,
    device_name VARCHAR(100) NOT NULL,
    device_model VARCHAR(100) NULL,
    device_token VARCHAR(128) NOT NULL UNIQUE,
    sim1_operator VARCHAR(50) NULL,
    sim2_operator VARCHAR(50) NULL,
    battery_level INT NOT NULL DEFAULT 100,
    last_sync_at DATETIME NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'offline',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE,
    CONSTRAINT chk_devices_battery CHECK (battery_level BETWEEN 0 AND 100)
);

-- 4. Gateways Table (52+ Channels Configuration)
CREATE TABLE IF NOT EXISTS gateways (
    id VARCHAR(36) PRIMARY KEY,
    brand_id VARCHAR(36) NOT NULL,
    channel_name VARCHAR(50) NOT NULL,
    category VARCHAR(32) NOT NULL,
    account_type VARCHAR(32) NOT NULL,
    account_number VARCHAR(100) NOT NULL,
    routing_number VARCHAR(50) NULL,
    branch_name VARCHAR(100) NULL,
    district VARCHAR(100) NULL,
    ussd_code VARCHAR(30) NULL,
    fee_percentage DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    fee_fixed DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    exchange_rate DECIMAL(12, 4) NOT NULL DEFAULT 1.0000,
    fields_json TEXT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE
);

-- 5. Invoices Table (15-Minute TTL & Scoped Numbers)
CREATE TABLE IF NOT EXISTS invoices (
    id VARCHAR(36) PRIMARY KEY,
    brand_id VARCHAR(36) NOT NULL,
    invoice_number VARCHAR(64) NOT NULL,
    customer_name VARCHAR(120) NOT NULL,
    customer_email VARCHAR(150) NULL,
    customer_phone VARCHAR(30) NULL,
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'BDT',
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    payment_method VARCHAR(50) NULL,
    trx_id VARCHAR(100) NULL,
    redirect_url VARCHAR(500) NULL,
    metadata_json TEXT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE,
    CONSTRAINT chk_invoices_amount CHECK (amount > 0),
    UNIQUE (brand_id, invoice_number)
);

-- 6. Stored Data Table (Carrier SMS Ingestion & Atomic CAS Buffer)
CREATE TABLE IF NOT EXISTS stored_data (
    id VARCHAR(36) PRIMARY KEY,
    brand_id VARCHAR(36) NOT NULL,
    device_id VARCHAR(36) NULL,
    sender VARCHAR(50) NOT NULL,
    raw_sms TEXT NOT NULL,
    channel VARCHAR(50) NOT NULL,
    trx_id VARCHAR(100) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'UNUSED',
    sim_slot INT NOT NULL DEFAULT 1,
    received_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    used_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE SET NULL,
    UNIQUE (brand_id, trx_id)
);

-- 7. Webhook Logs Table (Outbound HMAC Delivery Audits)
CREATE TABLE IF NOT EXISTS webhook_logs (
    id VARCHAR(36) PRIMARY KEY,
    brand_id VARCHAR(36) NOT NULL,
    invoice_id VARCHAR(36) NULL,
    event VARCHAR(50) NOT NULL,
    payload_json TEXT NOT NULL,
    response_status INT NULL,
    response_body TEXT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    attempts INT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL
);

-- 8. Staff Permissions Table (Granular 10-Module RBAC)
CREATE TABLE IF NOT EXISTS staff_permissions (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    brand_id VARCHAR(36) NOT NULL,
    module VARCHAR(50) NOT NULL,
    can_create BOOLEAN NOT NULL DEFAULT 0,
    can_read BOOLEAN NOT NULL DEFAULT 1,
    can_update BOOLEAN NOT NULL DEFAULT 0,
    can_delete BOOLEAN NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE,
    UNIQUE (user_id, brand_id, module)
);

-- 9. Affiliate Referrals Table (10% Commission Ledger)
CREATE TABLE IF NOT EXISTS affiliate_referrals (
    id VARCHAR(36) PRIMARY KEY,
    referrer_user_id VARCHAR(36) NOT NULL,
    referred_user_id VARCHAR(36) NOT NULL,
    commission_rate DECIMAL(5, 2) NOT NULL DEFAULT 10.00,
    total_earned DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (referrer_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (referred_user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (referrer_user_id, referred_user_id)
);

-- ==============================================================================
-- Performance & Security Indexes
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_brands_user_id ON brands (user_id);
CREATE INDEX IF NOT EXISTS idx_devices_brand_status ON devices (brand_id, status);
CREATE INDEX IF NOT EXISTS idx_gateways_brand_cat ON gateways (brand_id, category, status);
CREATE INDEX IF NOT EXISTS idx_invoices_status_exp ON invoices (status, expires_at);
CREATE INDEX IF NOT EXISTS idx_invoices_brand_status ON invoices (brand_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_brand_trx ON invoices (brand_id, trx_id);
CREATE INDEX IF NOT EXISTS idx_stored_cas ON stored_data (brand_id, trx_id, status);
CREATE INDEX IF NOT EXISTS idx_webhook_brand_status ON webhook_logs (brand_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_webhook_invoice ON webhook_logs (invoice_id);
CREATE INDEX IF NOT EXISTS idx_staff_user_brand ON staff_permissions (user_id, brand_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_referrer ON affiliate_referrals (referrer_user_id);
