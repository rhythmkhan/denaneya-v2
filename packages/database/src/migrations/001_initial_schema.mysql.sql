-- ==============================================================================
-- দেনা নেয়া ভার্সন টু (DenaNeya v2.0) - MySQL 8 Production DDL
-- Hostinger CloudLinux / cPanel MySQL 8.0+ Environment
-- Collation: utf8mb4_unicode_ci (Bengali & English Full Compatibility)
-- ==============================================================================

-- 1. Users Table
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(36) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `email` VARCHAR(150) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` VARCHAR(32) NOT NULL DEFAULT 'merchant',
  `credits` INT NOT NULL DEFAULT 50,
  `status` VARCHAR(32) NOT NULL DEFAULT 'active',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_users_email` (`email`),
  CONSTRAINT `chk_users_credits` CHECK (`credits` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Brands Table (Multi-Tenant Root)
CREATE TABLE IF NOT EXISTS `brands` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `brand_name` VARCHAR(120) NOT NULL,
  `brand_slug` VARCHAR(120) NOT NULL,
  `api_key` VARCHAR(64) NOT NULL,
  `api_secret` VARCHAR(128) NOT NULL,
  `webhook_url` VARCHAR(500) NULL,
  `webhook_secret` VARCHAR(128) NOT NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'active',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_brands_slug` (`brand_slug`),
  UNIQUE KEY `uk_brands_api_key` (`api_key`),
  INDEX `idx_brands_user_id` (`user_id`),
  CONSTRAINT `fk_brands_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Devices Table (Android SMS Sync Handsets)
CREATE TABLE IF NOT EXISTS `devices` (
  `id` VARCHAR(36) NOT NULL,
  `brand_id` VARCHAR(36) NOT NULL,
  `device_name` VARCHAR(100) NOT NULL,
  `device_model` VARCHAR(100) NULL,
  `device_token` VARCHAR(128) NOT NULL,
  `sim1_operator` VARCHAR(50) NULL,
  `sim2_operator` VARCHAR(50) NULL,
  `battery_level` INT NOT NULL DEFAULT 100,
  `last_sync_at` DATETIME NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'offline',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_devices_token` (`device_token`),
  INDEX `idx_devices_brand_status` (`brand_id`, `status`),
  CONSTRAINT `fk_devices_brand` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_devices_battery` CHECK (`battery_level` BETWEEN 0 AND 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Gateways Table (52+ Channels Catalog)
CREATE TABLE IF NOT EXISTS `gateways` (
  `id` VARCHAR(36) NOT NULL,
  `brand_id` VARCHAR(36) NOT NULL,
  `channel_name` VARCHAR(50) NOT NULL,
  `category` VARCHAR(32) NOT NULL,
  `account_type` VARCHAR(32) NOT NULL,
  `account_number` VARCHAR(100) NOT NULL,
  `routing_number` VARCHAR(50) NULL,
  `branch_name` VARCHAR(100) NULL,
  `district` VARCHAR(100) NULL,
  `ussd_code` VARCHAR(30) NULL,
  `fee_percentage` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
  `fee_fixed` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `exchange_rate` DECIMAL(12, 4) NOT NULL DEFAULT 1.0000,
  `fields_json` JSON NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'active',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_gateways_brand_cat` (`brand_id`, `category`, `status`),
  CONSTRAINT `fk_gateways_brand` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Invoices Table (15-Min TTL & Scoped Numbers)
CREATE TABLE IF NOT EXISTS `invoices` (
  `id` VARCHAR(36) NOT NULL,
  `brand_id` VARCHAR(36) NOT NULL,
  `invoice_number` VARCHAR(64) NOT NULL,
  `customer_name` VARCHAR(120) NOT NULL,
  `customer_email` VARCHAR(150) NULL,
  `customer_phone` VARCHAR(30) NULL,
  `amount` DECIMAL(12, 2) NOT NULL,
  `currency` VARCHAR(10) NOT NULL DEFAULT 'BDT',
  `status` VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  `payment_method` VARCHAR(50) NULL,
  `trx_id` VARCHAR(100) NULL,
  `redirect_url` VARCHAR(500) NULL,
  `metadata_json` JSON NULL,
  `expires_at` DATETIME NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_invoices_brand_num` (`brand_id`, `invoice_number`),
  INDEX `idx_invoices_status_exp` (`status`, `expires_at`),
  INDEX `idx_invoices_brand_status` (`brand_id`, `status`),
  INDEX `idx_invoices_brand_trx` (`brand_id`, `trx_id`),
  CONSTRAINT `fk_invoices_brand` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_invoices_amount` CHECK (`amount` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Stored Data Table (Carrier SMS Ingestion & CAS Buffer)
CREATE TABLE IF NOT EXISTS `stored_data` (
  `id` VARCHAR(36) NOT NULL,
  `brand_id` VARCHAR(36) NOT NULL,
  `device_id` VARCHAR(36) NULL,
  `sender` VARCHAR(50) NOT NULL,
  `raw_sms` TEXT NOT NULL,
  `channel` VARCHAR(50) NOT NULL,
  `trx_id` VARCHAR(100) NOT NULL,
  `amount` DECIMAL(12, 2) NOT NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'UNUSED',
  `sim_slot` INT NOT NULL DEFAULT 1,
  `received_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `used_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_brand_trx` (`brand_id`, `trx_id`),
  INDEX `idx_stored_cas` (`brand_id`, `trx_id`, `status`),
  CONSTRAINT `fk_stored_brand` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_stored_device` FOREIGN KEY (`device_id`) REFERENCES `devices` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Webhook Logs Table (Delivery Audits)
CREATE TABLE IF NOT EXISTS `webhook_logs` (
  `id` VARCHAR(36) NOT NULL,
  `brand_id` VARCHAR(36) NOT NULL,
  `invoice_id` VARCHAR(36) NULL,
  `event` VARCHAR(50) NOT NULL,
  `payload_json` JSON NOT NULL,
  `response_status` INT NULL,
  `response_body` TEXT NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  `attempts` INT NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_webhook_brand_status` (`brand_id`, `status`, `created_at`),
  INDEX `idx_webhook_invoice` (`invoice_id`),
  CONSTRAINT `fk_webhook_brand` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_webhook_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Staff Permissions Table (10-Module RBAC)
CREATE TABLE IF NOT EXISTS `staff_permissions` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `brand_id` VARCHAR(36) NOT NULL,
  `module` VARCHAR(50) NOT NULL,
  `can_create` BOOLEAN NOT NULL DEFAULT 0,
  `can_read` BOOLEAN NOT NULL DEFAULT 1,
  `can_update` BOOLEAN NOT NULL DEFAULT 0,
  `can_delete` BOOLEAN NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_staff_user_brand_module` (`user_id`, `brand_id`, `module`),
  INDEX `idx_staff_user_brand` (`user_id`, `brand_id`),
  CONSTRAINT `fk_staff_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_staff_brand` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Affiliate Referrals Table (10% Commission Ledger)
CREATE TABLE IF NOT EXISTS `affiliate_referrals` (
  `id` VARCHAR(36) NOT NULL,
  `referrer_user_id` VARCHAR(36) NOT NULL,
  `referred_user_id` VARCHAR(36) NOT NULL,
  `commission_rate` DECIMAL(5, 2) NOT NULL DEFAULT 10.00,
  `total_earned` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `status` VARCHAR(32) NOT NULL DEFAULT 'active',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_referrer_referred` (`referrer_user_id`, `referred_user_id`),
  INDEX `idx_affiliate_referrer` (`referrer_user_id`),
  CONSTRAINT `fk_affiliate_referrer` FOREIGN KEY (`referrer_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_affiliate_referred` FOREIGN KEY (`referred_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
