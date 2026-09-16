/**
 * DenaNeya v2.0 - Demo Merchant & Test Environment Seed Fixtures
 * Matches the authoritative 9-table relational schema:
 * users, brands, devices, gateways, invoices, stored_data, webhook_logs, staff_permissions, affiliate_referrals.
 */

'use strict';

const DEMO_USER_ID = 'usr_demo_8f4c9a2e7b31';
const STAFF_USER_ID = 'usr_staff_viewer_002';
const DEMO_BRAND_ID = 'b101_deshi_course';
const DEMO_DEVICE_ID = 'dev_xiaomi_test_12345';

// 1. Users
const USERS_SEED = [
  {
    id: DEMO_USER_ID,
    name: 'Seratul alim Khan',
    email: 'seratulalimkhanrhythm@gmail.com',
    // Pre-hashed bcrypt for 'Secret123!' and 'admin12345'
    password_hash: '$2a$10$IwdnG0F.mR2KYz5yR3rVietZ6XjrAJ1abqfhi4VvBE6I20TEnLjy2',
    role: 'merchant',
    credits: 100,
    status: 'active',
    created_at: '2026-09-01 00:00:00',
    updated_at: '2026-09-01 00:00:00'
  },
  {
    id: 'usr_demo_login_alt',
    name: 'DenaNeya Demo Merchant',
    email: 'demo@denaneya.com',
    password_hash: '$2a$10$IwdnG0F.mR2KYz5yR3rVietZ6XjrAJ1abqfhi4VvBE6I20TEnLjy2',
    role: 'merchant',
    credits: 100,
    status: 'active',
    created_at: '2026-09-01 00:00:00',
    updated_at: '2026-09-01 00:00:00'
  },
  {
    id: STAFF_USER_ID,
    name: 'Tanvir Finance Assistant',
    email: 'finance@deshicourse.com',
    password_hash: '$2a$10$IwdnG0F.mR2KYz5yR3rVietZ6XjrAJ1abqfhi4VvBE6I20TEnLjy2',
    role: 'staff',
    credits: 0,
    status: 'active',
    created_at: '2026-09-05 00:00:00',
    updated_at: '2026-09-05 00:00:00'
  }
];

// 2. Brands
const BRANDS_SEED = [
  {
    id: DEMO_BRAND_ID,
    user_id: DEMO_USER_ID,
    brand_name: 'Deshi Course - দেশি কোর্স',
    brand_slug: 'deshicourse',
    api_key: 'dn_live_8f4c9a2e7b314d8e9c2f',
    api_secret: 'dn_sec_77665544332211aabbccddeeff0011',
    webhook_url: 'https://merchant.deshicourse.com/api/payment/callback',
    webhook_secret: 'whsec_demo_secret_32_characters_long_12345',
    status: 'active',
    created_at: '2026-09-01 00:00:00',
    updated_at: '2026-09-01 00:00:00'
  }
];

// 3. Devices
const DEVICES_SEED = [
  {
    id: DEMO_DEVICE_ID,
    brand_id: DEMO_BRAND_ID,
    device_name: 'Xiaomi Redmi Note 11 (Primary MFS Sync)',
    device_model: '2201117TG',
    device_token: 'tok_dev_xiaomi_998877665544332211',
    sim1_operator: 'Grameenphone',
    sim2_operator: 'Banglalink',
    battery_level: 94,
    last_sync_at: '2026-09-16 00:00:00',
    status: 'online',
    created_at: '2026-09-01 00:00:00'
  }
];

// 4. Active Gateways
const ACTIVE_GATEWAYS_SEED = [
  {
    id: 'gw_bkash_payment_01',
    brand_id: DEMO_BRAND_ID,
    channel_name: 'bKash',
    category: 'Mobile',
    account_type: 'merchant',
    account_number: '01813896400',
    routing_number: null,
    branch_name: null,
    district: null,
    ussd_code: '*247#',
    fee_percentage: 1.50,
    fee_fixed: 0.00,
    exchange_rate: 1.0000,
    fields_json: JSON.stringify({ mode: 'payment', counter: '1', reference: 'deshicourse' }),
    status: 'active',
    created_at: '2026-09-01 00:00:00'
  },
  {
    id: 'gw_bkash_personal_02',
    brand_id: DEMO_BRAND_ID,
    channel_name: 'bKash',
    category: 'Mobile',
    account_type: 'personal',
    account_number: '01712345678',
    routing_number: null,
    branch_name: null,
    district: null,
    ussd_code: '*247#',
    fee_percentage: 0.00,
    fee_fixed: 0.00,
    exchange_rate: 1.0000,
    fields_json: JSON.stringify({ mode: 'send_money' }),
    status: 'active',
    created_at: '2026-09-01 00:00:00'
  },
  {
    id: 'gw_nagad_personal_03',
    brand_id: DEMO_BRAND_ID,
    channel_name: 'Nagad',
    category: 'Mobile',
    account_type: 'personal',
    account_number: '01912345678',
    routing_number: null,
    branch_name: null,
    district: null,
    ussd_code: '*167#',
    fee_percentage: 0.00,
    fee_fixed: 0.00,
    exchange_rate: 1.0000,
    fields_json: JSON.stringify({ mode: 'send_money' }),
    status: 'active',
    created_at: '2026-09-01 00:00:00'
  },
  {
    id: 'gw_rocket_payment_04',
    brand_id: DEMO_BRAND_ID,
    channel_name: 'Rocket',
    category: 'Mobile',
    account_type: 'merchant',
    account_number: '017123456789',
    routing_number: null,
    branch_name: null,
    district: null,
    ussd_code: '*322#',
    fee_percentage: 1.20,
    fee_fixed: 0.00,
    exchange_rate: 1.0000,
    fields_json: JSON.stringify({ mode: 'merchant_pay' }),
    status: 'active',
    created_at: '2026-09-01 00:00:00'
  },
  {
    id: 'gw_city_bank_05',
    brand_id: DEMO_BRAND_ID,
    channel_name: 'City Bank',
    category: 'Bank',
    account_type: 'bank',
    account_number: '1102938475001',
    routing_number: '225261890',
    branch_name: 'Gulshan Branch',
    district: 'Dhaka',
    ussd_code: null,
    fee_percentage: 0.00,
    fee_fixed: 0.00,
    exchange_rate: 1.0000,
    fields_json: JSON.stringify({ account_name: 'Deshi Course Ltd' }),
    status: 'active',
    created_at: '2026-09-01 00:00:00'
  },
  {
    id: 'gw_stripe_usd_06',
    brand_id: DEMO_BRAND_ID,
    channel_name: 'Stripe',
    category: 'International',
    account_type: 'merchant',
    account_number: 'acct_1MFSInternationalDemo',
    routing_number: null,
    branch_name: null,
    district: null,
    ussd_code: null,
    fee_percentage: 2.90,
    fee_fixed: 35.00,
    exchange_rate: 120.0000,
    fields_json: JSON.stringify({ currency: 'USD' }),
    status: 'active',
    created_at: '2026-09-01 00:00:00'
  }
];

// 5. Sample Invoices (Covering all 4 lifecycle states)
const INVOICES_SEED = [
  {
    id: 'inv_completed_001',
    brand_id: DEMO_BRAND_ID,
    invoice_number: 'INV-2026-0001',
    customer_name: 'Tanvir Ahmed',
    customer_email: 'tanvir@example.com',
    customer_phone: '01712345678',
    amount: 1250.00,
    currency: 'BDT',
    status: 'COMPLETED',
    payment_method: 'bKash',
    trx_id: 'BLK998877',
    redirect_url: 'https://deshicourse.com/orders/complete?id=INV-2026-0001',
    metadata_json: JSON.stringify({ course_id: 'crs_fullstack_01' }),
    expires_at: '2026-09-16 00:15:00',
    created_at: '2026-09-16 00:00:00',
    updated_at: '2026-09-16 00:05:00'
  },
  {
    id: 'inv_pending_002',
    brand_id: DEMO_BRAND_ID,
    invoice_number: 'INV-2026-0002',
    customer_name: 'Sadia Rahman',
    customer_email: 'sadia@example.com',
    customer_phone: '01912345678',
    amount: 2500.00,
    currency: 'BDT',
    status: 'PENDING',
    payment_method: 'Nagad',
    trx_id: null,
    redirect_url: 'https://deshicourse.com/orders/complete?id=INV-2026-0002',
    metadata_json: JSON.stringify({ course_id: 'crs_devops_02' }),
    // Expires in 15 minutes
    expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19),
    created_at: '2026-09-16 06:40:00',
    updated_at: '2026-09-16 06:40:00'
  },
  {
    id: 'inv_pending_003',
    brand_id: DEMO_BRAND_ID,
    invoice_number: 'INV-2026-0003',
    customer_name: 'Kamal Hossain',
    customer_email: 'kamal@example.com',
    customer_phone: '01712345678',
    amount: 850.00,
    currency: 'BDT',
    status: 'PENDING',
    payment_method: 'Rocket',
    trx_id: null,
    redirect_url: 'https://deshicourse.com/orders/complete?id=INV-2026-0003',
    metadata_json: JSON.stringify({ course_id: 'crs_uiux_03' }),
    // Expires in 15 minutes
    expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19),
    created_at: '2026-09-16 06:42:00',
    updated_at: '2026-09-16 06:42:00'
  },
  {
    id: 'inv_expired_004',
    brand_id: DEMO_BRAND_ID,
    invoice_number: 'INV-2026-0004',
    customer_name: 'Farhana Yasmin',
    customer_email: null,
    customer_phone: '01812345678',
    amount: 3000.00,
    currency: 'BDT',
    status: 'EXPIRED',
    payment_method: 'bKash',
    trx_id: null,
    redirect_url: null,
    metadata_json: null,
    expires_at: '2026-09-15 12:00:00',
    created_at: '2026-09-15 11:45:00',
    updated_at: '2026-09-15 12:00:00'
  },
  {
    id: 'inv_cancelled_005',
    brand_id: DEMO_BRAND_ID,
    invoice_number: 'INV-2026-0005',
    customer_name: 'Abul Kashem',
    customer_email: null,
    customer_phone: null,
    amount: 500.00,
    currency: 'BDT',
    status: 'CANCELLED',
    payment_method: null,
    trx_id: null,
    redirect_url: null,
    metadata_json: null,
    expires_at: '2026-09-15 15:00:00',
    created_at: '2026-09-15 14:45:00',
    updated_at: '2026-09-15 14:50:00'
  }
];

// 6. Stored Data (Simulated Carrier SMS Receipts)
const STORED_DATA_SEED = [
  {
    id: 'sms_used_001',
    brand_id: DEMO_BRAND_ID,
    device_id: DEMO_DEVICE_ID,
    sender: 'bKash',
    raw_sms: 'You have received Tk 1,250.00 from 01712345678. Ref Invoice-101. Fee Tk 0.00. Balance Tk 15,250.00. TrxID BLK998877 at 16/09/2026 14:20',
    channel: 'bKash',
    trx_id: 'BLK998877',
    amount: 1250.00,
    status: 'USED',
    sim_slot: 1,
    received_at: '2026-09-16 00:02:00',
    used_at: '2026-09-16 00:05:00',
    created_at: '2026-09-16 00:02:00'
  },
  {
    id: 'sms_unused_002',
    brand_id: DEMO_BRAND_ID,
    device_id: DEMO_DEVICE_ID,
    sender: 'Nagad',
    raw_sms: 'Money Received. Amount: Tk 2,500.00. Sender: 01912345678. Ref: Order55. TxnID: 7HG6F5D4. Date: 16/09/2026 16:45',
    channel: 'Nagad',
    trx_id: '7HG6F5D4',
    amount: 2500.00,
    status: 'UNUSED',
    sim_slot: 2,
    received_at: '2026-09-16 06:41:00',
    used_at: null,
    created_at: '2026-09-16 06:41:00'
  },
  {
    id: 'sms_unused_003',
    brand_id: DEMO_BRAND_ID,
    device_id: DEMO_DEVICE_ID,
    sender: '16216',
    raw_sms: 'Tk 850.00 received from 01712345678 to A/C 017123456789. Fee Tk 0.00, Balance Tk 25,000.00. TxnId: 9876543210 on 16-Sep-2026 17:00',
    channel: 'Rocket',
    trx_id: '9876543210',
    amount: 850.00,
    status: 'UNUSED',
    sim_slot: 1,
    received_at: '2026-09-16 06:43:00',
    used_at: null,
    created_at: '2026-09-16 06:43:00'
  }
];

// 7. Webhook Logs
const WEBHOOK_LOGS_SEED = [
  {
    id: 'wh_log_001',
    brand_id: DEMO_BRAND_ID,
    invoice_id: 'inv_completed_001',
    event: 'invoice.completed',
    payload_json: JSON.stringify({
      event: 'invoice.completed',
      invoice_id: 'inv_completed_001',
      brand_id: DEMO_BRAND_ID,
      amount: 1250.00,
      trx_id: 'BLK998877',
      payment_method: 'bKash'
    }),
    response_status: 200,
    response_body: '{"status":"ok","received":true}',
    status: 'SUCCESS',
    attempts: 1,
    created_at: '2026-09-16 00:05:05'
  }
];

// 8. Staff Permissions
const STAFF_PERMISSIONS_SEED = [
  {
    id: 'sp_invoices_01',
    user_id: STAFF_USER_ID,
    brand_id: DEMO_BRAND_ID,
    module: 'invoices',
    can_create: 0,
    can_read: 1,
    can_update: 0,
    can_delete: 0,
    created_at: '2026-09-05 00:00:00'
  },
  {
    id: 'sp_devices_02',
    user_id: STAFF_USER_ID,
    brand_id: DEMO_BRAND_ID,
    module: 'devices',
    can_create: 0,
    can_read: 1,
    can_update: 0,
    can_delete: 0,
    created_at: '2026-09-05 00:00:00'
  },
  {
    id: 'sp_gateways_03',
    user_id: STAFF_USER_ID,
    brand_id: DEMO_BRAND_ID,
    module: 'gateways',
    can_create: 0,
    can_read: 1,
    can_update: 0,
    can_delete: 0,
    created_at: '2026-09-05 00:00:00'
  }
];

// 9. Affiliate Referrals
const AFFILIATE_REFERRALS_SEED = [
  {
    id: 'aff_demo_01',
    referrer_user_id: DEMO_USER_ID,
    referred_user_id: STAFF_USER_ID,
    commission_rate: 10.00,
    total_earned: 250.00,
    status: 'active',
    created_at: '2026-09-05 00:00:00'
  }
];

module.exports = {
  DEMO_USER_ID,
  STAFF_USER_ID,
  DEMO_BRAND_ID,
  DEMO_DEVICE_ID,
  USERS_SEED,
  BRANDS_SEED,
  DEVICES_SEED,
  ACTIVE_GATEWAYS_SEED,
  INVOICES_SEED,
  STORED_DATA_SEED,
  WEBHOOK_LOGS_SEED,
  STAFF_PERMISSIONS_SEED,
  AFFILIATE_REFERRALS_SEED
};
