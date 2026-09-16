/**
 * DenaNeya v2.0 - Live Mock & Demo Provider
 * File: apps/dashboard/src/data/mockData.ts
 *
 * Ensures seamless, zero-error merchant and super-admin exploration when exploring the UI
 * on static/cloud hosting (Vercel, Hostinger) without an active API backend.
 */

import { User, Brand, DashboardMetrics, Invoice, Device, StaffMember, AffiliateStats } from '../types/dashboard';
import { SuperAdminTelemetry, MerchantRecord, CrossTenantSms, SystemSettings, MasterGatewayState, AdminAuditLog } from '../types/admin';

export const MOCK_USER: User = {
  id: 'usr_demo_8f4c9a2e7b31',
  name: 'Seratul alim Khan (Rhythm)',
  email: 'demo@denaneya.com',
  role: 'merchant',
  credits: 100,
  status: 'active',
  created_at: '2026-09-01 00:00:00',
  two_factor_enabled: false
};

export const MOCK_SUPER_ADMIN: User = {
  id: 'usr_superadmin_master_001',
  name: 'Seratul alim Khan (Super Admin)',
  email: 'admin@denaneya.com',
  role: 'superadmin',
  credits: 999999,
  status: 'active',
  created_at: '2026-08-01 00:00:00',
  two_factor_enabled: true
};

export const MOCK_BRAND: Brand = {
  id: 'b101_deshi_course',
  user_id: 'usr_demo_8f4c9a2e7b31',
  brand_name: 'Deshi Course - দেশি কোর্স',
  brand_slug: 'deshicourse',
  api_key: 'dn_live_8f4c9a2e7b314d8e9c2f',
  api_secret: 'dn_sec_77665544332211aabbccddeeff0011',
  webhook_url: 'https://merchant.deshicourse.com/api/payment/callback',
  status: 'active',
  created_at: '2026-09-01 00:00:00',
  role: 'owner'
};

export const MOCK_METRICS: DashboardMetrics = {
  gmv: 1250.00,
  totalCount: 5,
  completedCount: 1,
  pendingCount: 2,
  pendingVolume: 3350.00,
  expiredCount: 1,
  failedCount: 1,
  successRate: 20,
  activeDevicesCount: 1,
  totalDevicesCount: 1,
  activeGatewaysCount: 6,
  totalGatewaysCount: 52,
  unusedStoredCount: 2
};

export const INITIAL_MOCK_INVOICES: Invoice[] = [
  {
    id: 'inv_completed_001',
    brand_id: 'b101_deshi_course',
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
    expires_at: '2026-09-16 00:15:00',
    created_at: '2026-09-16 00:00:00'
  },
  {
    id: 'inv_pending_002',
    brand_id: 'b101_deshi_course',
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
    expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString()
  },
  {
    id: 'inv_pending_003',
    brand_id: 'b101_deshi_course',
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
    expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 8 * 60 * 1000).toISOString()
  },
  {
    id: 'inv_expired_004',
    brand_id: 'b101_deshi_course',
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
    expires_at: '2026-09-15 12:00:00',
    created_at: '2026-09-15 11:45:00'
  },
  {
    id: 'inv_cancelled_005',
    brand_id: 'b101_deshi_course',
    invoice_number: 'INV-2026-0005',
    customer_name: 'Abul Kashem',
    customer_email: null,
    customer_phone: null,
    amount: 500.00,
    currency: 'BDT',
    status: 'FAILED',
    payment_method: null,
    trx_id: null,
    redirect_url: null,
    expires_at: '2026-09-15 15:00:00',
    created_at: '2026-09-15 14:45:00'
  }
];

export const INITIAL_MOCK_DEVICES: Device[] = [
  {
    id: 'dev_xiaomi_test_12345',
    brand_id: 'b101_deshi_course',
    device_name: 'Xiaomi Redmi Note 11 (Primary MFS Sync)',
    device_model: '2201117TG',
    sim1_operator: 'Grameenphone',
    sim2_operator: 'Banglalink',
    battery_level: 94,
    last_sync_at: '2026-09-16 00:00:00',
    status: 'online',
    created_at: '2026-09-01 00:00:00'
  }
];

export const MOCK_STAFF: StaffMember[] = [
  {
    id: 'stf_01',
    user_id: 'usr_staff_viewer_002',
    brand_id: 'b101_deshi_course',
    name: 'Tanvir Finance Assistant',
    email: 'finance@deshicourse.com',
    role: 'manager',
    permissions: [
      { module: 'invoices', can_create: true, can_read: true, can_update: true, can_delete: false },
      { module: 'devices', can_create: false, can_read: true, can_update: false, can_delete: false },
      { module: 'gateways', can_create: false, can_read: true, can_update: false, can_delete: false }
    ],
    status: 'active',
    created_at: '2026-09-05 00:00:00'
  }
];

export const MOCK_AFFILIATE: AffiliateStats = {
  referral_code: 'DENA2026',
  referral_url: 'https://denaneya.vercel.app/ref/DENA2026',
  commission_rate: 10,
  total_referred_merchants: 14,
  total_earned_bdt: 2450.00,
  available_payout_bdt: 1200.00,
  total_withdrawn_bdt: 1250.00
};

// ==========================================
// SUPER ADMIN MOCK SUITE DATA
// ==========================================

export const MOCK_SUPERADMIN_TELEMETRY: SuperAdminTelemetry = {
  totalMerchants: 142,
  activeMerchants: 138,
  blockedMerchants: 4,
  combinedGmv: 3450850.00,
  platformRevenue: 69017.00,
  totalInvoices: 4892,
  completedInvoices: 3912,
  totalDevices: 89,
  activeDevices: 82,
  totalSmsReceived: 8740,
  unmatchedSms: 5,
  dailyVolume: [
    { date: 'Sep 10', volume: 420000, count: 520 },
    { date: 'Sep 11', volume: 480000, count: 610 },
    { date: 'Sep 12', volume: 390000, count: 490 },
    { date: 'Sep 13', volume: 550000, count: 720 },
    { date: 'Sep 14', volume: 620000, count: 790 },
    { date: 'Sep 15', volume: 510000, count: 680 },
    { date: 'Sep 16', volume: 480850, count: 620 }
  ],
  channelDistribution: [
    { channel: 'bKash Personal & Merchant', volume: 1950000, percentage: 56.5, count: 2840 },
    { channel: 'Nagad (MFS)', volume: 920000, percentage: 26.7, count: 1210 },
    { channel: 'Rocket (DBBL)', volume: 380000, percentage: 11.0, count: 490 },
    { channel: 'Upay & CellFin', volume: 135000, percentage: 3.9, count: 190 },
    { channel: 'Direct Bank & Crypto', volume: 65850, percentage: 1.9, count: 82 }
  ]
};

export const INITIAL_MOCK_MERCHANTS: MerchantRecord[] = [
  {
    id: 'b101_deshi_course',
    userId: 'usr_demo_8f4c9a2e7b31',
    name: 'Seratul alim Khan (Rhythm)',
    email: 'merchant@deshicourse.com',
    brandName: 'Deshi Course - দেশি কোর্স',
    brandSlug: 'deshicourse',
    status: 'active',
    credits: 100,
    gmv: 1250.00,
    invoicesCount: 5,
    devicesCount: 1,
    apiKey: 'dn_live_8f4c9a2e7b314d8e9c2f',
    webhookUrl: 'https://merchant.deshicourse.com/api/payment/callback',
    createdAt: '2026-09-01 10:00:00',
    lastLoginAt: '2026-09-16 11:30:00'
  },
  {
    id: 'b102_dhaka_gadget',
    userId: 'usr_02_rahim',
    name: 'Rahim Uddin',
    email: 'rahim@dhakagadget.com',
    brandName: 'Dhaka Gadget Hub',
    brandSlug: 'dhakagadget',
    status: 'active',
    credits: 450,
    gmv: 450200.00,
    invoicesCount: 320,
    devicesCount: 2,
    apiKey: 'dn_live_9a7b5c3d1e2f4a6b',
    webhookUrl: 'https://dhakagadget.com/api/dn-webhook',
    createdAt: '2026-08-15 14:20:00',
    lastLoginAt: '2026-09-16 09:15:00'
  },
  {
    id: 'b103_sylhet_tea',
    userId: 'usr_03_farhan',
    name: 'Farhan Karim',
    email: 'farhan@sylhettea.com',
    brandName: 'Sylhet Organic Tea Mart',
    brandSlug: 'sylhettea',
    status: 'active',
    credits: 20,
    gmv: 185400.00,
    invoicesCount: 140,
    devicesCount: 1,
    apiKey: 'dn_live_3c2e1d0f8a7b6c5d',
    webhookUrl: 'https://sylhettea.com/webhook',
    createdAt: '2026-08-20 16:45:00',
    lastLoginAt: '2026-09-15 18:22:00'
  },
  {
    id: 'b104_ctg_fashion',
    userId: 'usr_04_nusrat',
    name: 'Nusrat Jahan',
    email: 'nusrat@ctgfashion.com',
    brandName: 'Chittagong Fashion House',
    brandSlug: 'ctgfashion',
    status: 'active',
    credits: 1200,
    gmv: 890100.00,
    invoicesCount: 680,
    devicesCount: 3,
    apiKey: 'dn_live_4b5a6c7d8e9f0a1b',
    webhookUrl: 'https://ctgfashion.com/payment/callback',
    createdAt: '2026-08-05 09:10:00',
    lastLoginAt: '2026-09-16 10:45:00'
  },
  {
    id: 'b105_techbazar',
    userId: 'usr_05_alamin',
    name: 'Al-Amin Mia',
    email: 'alamin@techbazarbd.com',
    brandName: 'TechBazar BD',
    brandSlug: 'techbazarbd',
    status: 'suspended',
    credits: 0,
    gmv: 50000.00,
    invoicesCount: 45,
    devicesCount: 0,
    apiKey: 'dn_live_1f2e3d4c5b6a7081',
    webhookUrl: null,
    createdAt: '2026-08-28 11:00:00',
    lastLoginAt: '2026-09-10 14:00:00'
  },
  {
    id: 'b106_spam_bot',
    userId: 'usr_06_spambot',
    name: 'Suspicious Auto Registrant',
    email: 'bot99@temp-mail.org',
    brandName: 'Spam Shop 99',
    brandSlug: 'spamshop99',
    status: 'blocked',
    credits: 0,
    gmv: 0.00,
    invoicesCount: 0,
    devicesCount: 0,
    apiKey: 'dn_live_9988776655443322',
    webhookUrl: null,
    createdAt: '2026-09-14 02:30:00',
    lastLoginAt: '2026-09-14 02:31:00'
  }
];

export const INITIAL_MOCK_CROSS_SMS: CrossTenantSms[] = [
  {
    id: 'sms_001',
    brandId: 'b101_deshi_course',
    brandName: 'Deshi Course - দেশি কোর্স',
    deviceId: 'dev_xiaomi_test_12345',
    deviceName: 'Xiaomi Redmi Note 11',
    sender: 'bKash',
    recipientSimSlot: 'SIM 1',
    simOperator: 'Grameenphone',
    rawText: 'You have received Tk 1,250.00 from 01712345678. Fee Tk 0.00. Balance Tk 14,500.00. TrxID BLK998877 at 16/09/2026 00:01',
    trxId: 'BLK998877',
    amount: 1250.00,
    fee: 0.00,
    balance: 14500.00,
    status: 'MATCHED',
    matchedInvoiceNumber: 'INV-2026-0001',
    receivedAt: '2026-09-16 00:01:15'
  },
  {
    id: 'sms_002',
    brandId: 'b102_dhaka_gadget',
    brandName: 'Dhaka Gadget Hub',
    deviceId: 'dev_dg_01',
    deviceName: 'Samsung Galaxy A53',
    sender: 'Nagad',
    recipientSimSlot: 'SIM 1',
    simOperator: 'Robi',
    rawText: 'Payment Received. Amount: Tk 4,500.00. Sender: 01822334455. TxnID: NGD778899. Date: 16-09-2026 11:20:00. Balance: Tk 32,800.00',
    trxId: 'NGD778899',
    amount: 4500.00,
    fee: 0.00,
    balance: 32800.00,
    status: 'MATCHED',
    matchedInvoiceNumber: 'INV-DG-1049',
    receivedAt: '2026-09-16 11:20:05'
  },
  {
    id: 'sms_003',
    brandId: 'b104_ctg_fashion',
    brandName: 'Chittagong Fashion House',
    deviceId: 'dev_ctg_01',
    deviceName: 'OnePlus Nord CE 2',
    sender: '16216',
    recipientSimSlot: 'SIM 2',
    simOperator: 'Banglalink',
    rawText: 'Tk 2,100.00 received from 01999887766. A/C: 017001122338. TxnId: RCK112233. Fee: Tk 0.00. Balance: Tk 18,200.00.',
    trxId: 'RCK112233',
    amount: 2100.00,
    fee: 0.00,
    balance: 18200.00,
    status: 'MATCHED',
    matchedInvoiceNumber: 'INV-CTG-8821',
    receivedAt: '2026-09-16 11:45:10'
  },
  {
    id: 'sms_004',
    brandId: 'b101_deshi_course',
    brandName: 'Deshi Course - দেশি কোর্স',
    deviceId: 'dev_xiaomi_test_12345',
    deviceName: 'Xiaomi Redmi Note 11',
    sender: 'bKash',
    recipientSimSlot: 'SIM 1',
    simOperator: 'Grameenphone',
    rawText: 'You have received Tk 850.00 from 01712345678. Fee Tk 0.00. Balance Tk 15,350.00. TrxID BLK334455 at 16/09/2026 12:02',
    trxId: 'BLK334455',
    amount: 850.00,
    fee: 0.00,
    balance: 15350.00,
    status: 'UNUSED',
    matchedInvoiceNumber: null,
    receivedAt: '2026-09-16 12:02:14'
  },
  {
    id: 'sms_005',
    brandId: 'b102_dhaka_gadget',
    brandName: 'Dhaka Gadget Hub',
    deviceId: 'dev_dg_02',
    deviceName: 'Xiaomi Redmi 10C',
    sender: 'bKash',
    recipientSimSlot: 'SIM 1',
    simOperator: 'Grameenphone',
    rawText: 'Cash Out Tk 5,000.00 to Agent 01799887766 fee Tk 75.00 Balance Tk 27,800.00. TrxID OUT887766',
    trxId: 'OUT887766',
    amount: 5000.00,
    fee: 75.00,
    balance: 27800.00,
    status: 'REJECTED_DEBIT',
    matchedInvoiceNumber: null,
    receivedAt: '2026-09-16 12:15:30'
  }
];

export const INITIAL_MOCK_SYSTEM_SETTINGS: SystemSettings = {
  platformName: 'দেনা নেয়া ভার্সন টু (DenaNeya v2.0)',
  verificationFeeBdt: 1.00,
  starterCredits: 50,
  maintenanceMode: false,
  announcementText: '🚀 দেনা নেয়া v2.0 সুপার অ্যাডমিন ও ক্লাউড ইঞ্জিন সম্পূর্ণ সক্রিয়।',
  supportPhone: '+8801700000000',
  supportTelegram: '@denaneya_support',
  googleOAuthEnabled: true,
  googleClientId: '109876543210-mock-client-id.apps.googleusercontent.com'
};

export const INITIAL_MOCK_MASTER_GATEWAYS: MasterGatewayState[] = [
  { id: 'bkash', name: 'bKash (MFS)', type: 'mfs', isGloballyEnabled: true, totalVolume: 1950000, activeMerchantsCount: 135 },
  { id: 'nagad', name: 'Nagad (MFS)', type: 'mfs', isGloballyEnabled: true, totalVolume: 920000, activeMerchantsCount: 120 },
  { id: 'rocket', name: 'Rocket (DBBL)', type: 'mfs', isGloballyEnabled: true, totalVolume: 380000, activeMerchantsCount: 85 },
  { id: 'upay', name: 'Upay (UCB)', type: 'mfs', isGloballyEnabled: true, totalVolume: 95000, activeMerchantsCount: 42 },
  { id: 'cellfin', name: 'CellFin (IBBL)', type: 'bank', isGloballyEnabled: true, totalVolume: 40000, activeMerchantsCount: 30 },
  { id: 'citytouch', name: 'CityTouch (City Bank)', type: 'bank', isGloballyEnabled: true, totalVolume: 25000, activeMerchantsCount: 18 },
  { id: 'stripe', name: 'Stripe Global Cards', type: 'international', isGloballyEnabled: true, totalVolume: 15850, activeMerchantsCount: 12 },
  { id: 'binance_pay', name: 'Binance Pay (Crypto)', type: 'crypto', isGloballyEnabled: true, totalVolume: 50000, activeMerchantsCount: 8 }
];

export const INITIAL_MOCK_AUDIT_LOGS: AdminAuditLog[] = [
  {
    id: 'aud_001',
    adminEmail: 'admin@denaneya.com',
    action: 'MERCHANT_STATUS_UPDATE',
    targetType: 'merchant',
    targetId: 'b106_spam_bot',
    description: 'Blocked merchant "Spam Shop 99" due to suspicious automated API registrations.',
    ipAddress: '103.205.180.22',
    timestamp: '2026-09-14 02:40:00'
  },
  {
    id: 'aud_002',
    adminEmail: 'admin@denaneya.com',
    action: 'CREDITS_MANUAL_ADJUSTMENT',
    targetType: 'credits',
    targetId: 'b101_deshi_course',
    description: 'Added +50 bonus credits to Deshi Course as verified launch partner.',
    ipAddress: '103.205.180.22',
    timestamp: '2026-09-15 10:15:00'
  },
  {
    id: 'aud_003',
    adminEmail: 'admin@denaneya.com',
    action: 'SETTINGS_UPDATE',
    targetType: 'settings',
    targetId: 'system_settings',
    description: 'Updated global announcement text for DenaNeya v2.0 Super Admin release.',
    ipAddress: '103.205.180.22',
    timestamp: '2026-09-16 09:00:00'
  }
];
