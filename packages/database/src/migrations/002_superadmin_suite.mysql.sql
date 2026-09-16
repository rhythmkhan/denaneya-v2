-- ==============================================================================
-- দেনা নেয়া ভার্সন টু (DenaNeya v2.0) - Migration 002: Super Admin Suite (MySQL 8)
-- Hostinger CloudLinux / cPanel MySQL 8.0+ Environment
-- Collation: utf8mb4_unicode_ci (Bengali & English Full Compatibility)
-- ==============================================================================

-- 1. Alter Users Table (Add 2FA, Google OAuth & Avatar columns)
ALTER TABLE `users`
  ADD COLUMN `two_factor_secret` VARCHAR(255) NULL AFTER `status`,
  ADD COLUMN `two_factor_enabled` TINYINT(1) NOT NULL DEFAULT 0 AFTER `two_factor_secret`,
  ADD COLUMN `two_factor_backup_codes` TEXT NULL AFTER `two_factor_enabled`,
  ADD COLUMN `google_id` VARCHAR(100) NULL AFTER `two_factor_backup_codes`,
  ADD COLUMN `avatar_url` VARCHAR(500) NULL AFTER `google_id`,
  ADD UNIQUE KEY `uk_users_google_id` (`google_id`);

-- 2. Admin Audit Logs Table (Administrative actions tracking)
CREATE TABLE IF NOT EXISTS `admin_audit_logs` (
  `id` VARCHAR(36) NOT NULL,
  `admin_id` VARCHAR(36) NOT NULL,
  `action` VARCHAR(100) NOT NULL,
  `target_type` VARCHAR(50) NULL,
  `target_id` VARCHAR(64) NULL,
  `details_json` JSON NULL,
  `ip_address` VARCHAR(45) NULL,
  `user_agent` VARCHAR(255) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_admin_audit_admin_time` (`admin_id`, `created_at`),
  INDEX `idx_admin_audit_action_time` (`action`, `created_at`),
  INDEX `idx_admin_audit_target` (`target_type`, `target_id`),
  CONSTRAINT `fk_admin_audit_admin` FOREIGN KEY (`admin_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Credit Audit Logs Table (Merchant balance adjustments tracking)
CREATE TABLE IF NOT EXISTS `credit_audit_logs` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `admin_id` VARCHAR(36) NOT NULL,
  `delta_credits` INT NOT NULL,
  `previous_credits` INT NOT NULL,
  `new_credits` INT NOT NULL,
  `reason` VARCHAR(255) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_credit_audit_user_time` (`user_id`, `created_at`),
  INDEX `idx_credit_audit_admin_time` (`admin_id`, `created_at`),
  CONSTRAINT `fk_credit_audit_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_credit_audit_admin` FOREIGN KEY (`admin_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Impersonation Logs Table (Super Admin session switching tracking)
CREATE TABLE IF NOT EXISTS `impersonation_logs` (
  `id` VARCHAR(64) NOT NULL,
  `admin_id` VARCHAR(64) NOT NULL,
  `target_user_id` VARCHAR(64) NULL,
  `merchant_id` VARCHAR(64) NULL,
  `action` VARCHAR(50) NOT NULL DEFAULT 'START_IMPERSONATION',
  `return_ticket_hash` VARCHAR(128) NULL,
  `status` VARCHAR(32) DEFAULT 'active',
  `expires_at` DATETIME NULL,
  `used_at` DATETIME NULL,
  `ip_address` VARCHAR(45) NULL,
  `user_agent` VARCHAR(255) NULL,
  `metadata_json` JSON NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_impersonation_admin_time` (`admin_id`, `created_at`),
  CONSTRAINT `fk_impersonation_admin` FOREIGN KEY (`admin_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. System Settings Table (Dynamic system configurations)
CREATE TABLE IF NOT EXISTS `system_settings` (
  `key_name` VARCHAR(100) NOT NULL,
  `category` VARCHAR(50) NOT NULL,
  `value_json` JSON NOT NULL,
  `description` VARCHAR(255) NULL,
  `updated_by` VARCHAR(36) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`key_name`),
  INDEX `idx_system_settings_category` (`category`),
  CONSTRAINT `fk_system_settings_user` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Idempotent Default System Settings
INSERT IGNORE INTO `system_settings` (`key_name`, `category`, `value_json`, `description`) VALUES
('master_gateways', 'gateways', '{"disabled_channels":[]}', 'Globally disabled payment gateway channels'),
('pricing', 'pricing', '{"rate_per_verification_bdt":1.0,"starter_credits":50,"packages":[{"id":"pkg_starter_50","name":"Starter Pack","credits":50,"price_bdt":50,"discount_pct":0},{"id":"pkg_growth_200","name":"Growth Pack","credits":200,"price_bdt":180,"discount_pct":10},{"id":"pkg_business_500","name":"Business Pack","credits":500,"price_bdt":425,"discount_pct":15},{"id":"pkg_enterprise_2000","name":"Enterprise Pack","credits":2000,"price_bdt":1500,"discount_pct":25}]}', 'Dynamic verification rate, starter credits, and topup packages'),
('site_customizer', 'site', '{"hero_title":"দেনা নেয়া ভার্সন টু - Payment Automation Platform","hero_subtitle":"Automated MFS Payment Reconciliation for Bangladesh","announcement_enabled":false,"announcement_text":"","whatsapp_support":"+8801700000000","telegram_support":"@denaneya_support"}', 'Public marketing site headlines and support links'),
('maintenance_mode', 'maintenance', '{"enabled":false,"message":"System is undergoing scheduled maintenance. Please check back shortly.","allowed_ips":["127.0.0.1","::1"]}', 'Platform-wide maintenance mode switch and IP whitelist');

-- 7. Idempotent Default Super Admin Account
INSERT IGNORE INTO `users` (`id`, `name`, `email`, `password_hash`, `role`, `credits`, `status`)
VALUES ('usr_superadmin_master_001', 'Super Admin', 'admin@denaneya.com', '$2a$10$ehx92m8PDfnExnwTtYBkOue7VVBuxW.j0ux4PK0kSFI3ol5QSfdaq', 'superadmin', 999999, 'active');
