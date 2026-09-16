-- ==============================================================================
-- দেনা নেয়া ভার্সন টু (DenaNeya v2.0) - Migration 002: Super Admin Suite (SQLite 3)
-- Compatible with better-sqlite3 for Local Development and CI/CD Testing
-- ==============================================================================

PRAGMA foreign_keys = ON;

-- 1. Alter Users Table (Add 2FA, Google OAuth & Avatar columns)
ALTER TABLE users ADD COLUMN two_factor_secret VARCHAR(255) NULL;
ALTER TABLE users ADD COLUMN two_factor_enabled BOOLEAN NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN two_factor_backup_codes TEXT NULL;
ALTER TABLE users ADD COLUMN google_id VARCHAR(100) NULL;
ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500) NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users (google_id) WHERE google_id IS NOT NULL;

-- 2. Admin Audit Logs Table (Administrative actions tracking)
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id VARCHAR(36) PRIMARY KEY,
    admin_id VARCHAR(36) NOT NULL,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50) NULL,
    target_id VARCHAR(64) NULL,
    details_json TEXT NULL,
    ip_address VARCHAR(45) NULL,
    user_agent VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_admin_time ON admin_audit_logs (admin_id, created_at);
CREATE INDEX IF NOT EXISTS idx_admin_audit_action_time ON admin_audit_logs (action, created_at);
CREATE INDEX IF NOT EXISTS idx_admin_audit_target ON admin_audit_logs (target_type, target_id);

-- 3. Credit Audit Logs Table (Merchant balance adjustments tracking)
CREATE TABLE IF NOT EXISTS credit_audit_logs (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    admin_id VARCHAR(36) NOT NULL,
    delta_credits INT NOT NULL,
    previous_credits INT NOT NULL,
    new_credits INT NOT NULL,
    reason VARCHAR(255) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_credit_audit_user_time ON credit_audit_logs (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_credit_audit_admin_time ON credit_audit_logs (admin_id, created_at);

-- 4. Impersonation Logs Table (Super Admin session switching tracking)
CREATE TABLE IF NOT EXISTS impersonation_logs (
    id VARCHAR(64) PRIMARY KEY,
    admin_id VARCHAR(64) NOT NULL,
    target_user_id VARCHAR(64) NULL,
    merchant_id VARCHAR(64) NULL,
    action VARCHAR(50) NOT NULL DEFAULT 'START_IMPERSONATION',
    return_ticket_hash VARCHAR(128) NULL,
    status VARCHAR(32) DEFAULT 'active',
    expires_at DATETIME NULL,
    used_at DATETIME NULL,
    ip_address VARCHAR(45) NULL,
    user_agent VARCHAR(255) NULL,
    metadata_json TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_impersonation_admin_time ON impersonation_logs (admin_id, created_at);
CREATE INDEX IF NOT EXISTS idx_impersonation_target_time ON impersonation_logs (target_user_id, created_at);

-- 5. System Settings Table (Dynamic system configurations)
CREATE TABLE IF NOT EXISTS system_settings (
    key_name VARCHAR(100) PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    value_json TEXT NOT NULL,
    description VARCHAR(255) NULL,
    updated_by VARCHAR(36) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings (category);

-- 6. Idempotent Default System Settings
INSERT OR IGNORE INTO system_settings (key_name, category, value_json, description) VALUES
('master_gateways', 'gateways', '{"disabled_channels":[]}', 'Globally disabled payment gateway channels'),
('pricing', 'pricing', '{"rate_per_verification_bdt":1.0,"starter_credits":50,"packages":[{"id":"pkg_starter_50","name":"Starter Pack","credits":50,"price_bdt":50,"discount_pct":0},{"id":"pkg_growth_200","name":"Growth Pack","credits":200,"price_bdt":180,"discount_pct":10},{"id":"pkg_business_500","name":"Business Pack","credits":500,"price_bdt":425,"discount_pct":15},{"id":"pkg_enterprise_2000","name":"Enterprise Pack","credits":2000,"price_bdt":1500,"discount_pct":25}]}', 'Dynamic verification rate, starter credits, and topup packages'),
('site_customizer', 'site', '{"hero_title":"দেনা নেয়া ভার্সন টু - Payment Automation Platform","hero_subtitle":"Automated MFS Payment Reconciliation for Bangladesh","announcement_enabled":false,"announcement_text":"","whatsapp_support":"+8801700000000","telegram_support":"@denaneya_support"}', 'Public marketing site headlines and support links'),
('maintenance_mode', 'maintenance', '{"enabled":false,"message":"System is undergoing scheduled maintenance. Please check back shortly.","allowed_ips":["127.0.0.1","::1"]}', 'Platform-wide maintenance mode switch and IP whitelist');

-- 7. Idempotent Default Super Admin Account
INSERT OR IGNORE INTO users (id, name, email, password_hash, role, credits, status)
VALUES ('usr_superadmin_master_001', 'Super Admin', 'admin@denaneya.com', '$2a$10$ehx92m8PDfnExnwTtYBkOue7VVBuxW.j0ux4PK0kSFI3ol5QSfdaq', 'superadmin', 999999, 'active');
