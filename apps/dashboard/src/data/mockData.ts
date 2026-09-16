/**
 * DenaNeya v2.0 - Live Mock & Demo Provider
 * File: apps/dashboard/src/data/mockData.ts
 *
 * Ensures seamless, zero-error merchant exploration when exploring the UI
 * on static/cloud hosting (Vercel, Hostinger) without an active API backend.
 */

import { User, Brand, DashboardMetrics, Invoice, Device, Gateway, StaffMember, AffiliateStats } from '../types/dashboard';

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
