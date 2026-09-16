/**
 * DenaNeya v2.0 - Merchant Dashboard Domain Type Definitions
 * File: apps/dashboard/src/types/dashboard.ts
 */

export type StaffRole = 'owner' | 'admin' | 'manager' | 'viewer';

export type ModuleName =
  | 'overview'
  | 'invoices'
  | 'payment_links'
  | 'landing_builder'
  | 'gateways'
  | 'devices'
  | 'staff'
  | 'billing'
  | 'affiliate'
  | 'settings';

export type PermissionAction = 'create' | 'read' | 'update' | 'delete';

export interface ModulePermission {
  module: ModuleName;
  can_create: boolean;
  can_read: boolean;
  can_update: boolean;
  can_delete: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  credits: number;
  status: 'active' | 'suspended' | 'pending';
  created_at: string;
  two_factor_enabled?: boolean;
}

export interface Brand {
  id: string;
  user_id: string;
  brand_name: string;
  brand_slug: string;
  api_key: string;
  api_secret?: string; // Only shown upon rotation
  webhook_url: string | null;
  webhook_secret?: string; // Only shown upon rotation
  status: 'active' | 'inactive' | 'deleted';
  created_at: string;
  role?: StaffRole;
}

export interface DashboardMetrics {
  gmv: number;
  totalCount: number;
  completedCount: number;
  pendingCount: number;
  pendingVolume: number;
  expiredCount: number;
  failedCount: number;
  successRate: number;
  activeDevicesCount: number;
  totalDevicesCount: number;
  activeGatewaysCount: number;
  totalGatewaysCount: number;
  unusedStoredCount: number;
}

export type InvoiceStatus = 'PENDING' | 'COMPLETED' | 'PAID' | 'EXPIRED' | 'FAILED';

export interface Invoice {
  id: string;
  brand_id: string;
  invoice_number: string;
  customer_name: string;
  customer_email?: string | null;
  customer_phone?: string | null;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  payment_method?: string | null;
  trx_id?: string | null;
  redirect_url?: string | null;
  metadata_json?: Record<string, unknown> | null;
  expires_at: string;
  created_at: string;
  updated_at?: string;
}

export interface Device {
  id: string;
  brand_id: string;
  device_name: string;
  device_model?: string | null;
  sim1_operator?: string | null;
  sim2_operator?: string | null;
  battery_level: number;
  last_sync_at?: string | null;
  status: 'online' | 'offline' | 'warning';
  created_at: string;
}

export interface Gateway {
  id: string;
  brand_id?: string;
  channel_name: string;
  category: 'Mobile' | 'International' | 'Bank';
  account_type: 'personal' | 'merchant' | 'agent';
  account_number: string;
  routing_number?: string | null;
  branch_name?: string | null;
  district?: string | null;
  ussd_code?: string | null;
  fee_percentage: number;
  fee_fixed: number;
  exchange_rate: number;
  fields_json?: Record<string, unknown> | null;
  status: 'active' | 'inactive';
}

export interface PaymentLink {
  id: string;
  brand_id: string;
  title: string;
  description: string;
  slug: string;
  amount_type: 'fixed' | 'open';
  amount?: number | null;
  currency: string;
  redirect_url?: string | null;
  total_paid_count: number;
  total_revenue: number;
  status: 'active' | 'archived';
  created_at: string;
}

export interface StaffMember {
  id: string;
  user_id: string;
  brand_id: string;
  name: string;
  email: string;
  role: StaffRole;
  permissions: ModulePermission[];
  status: 'active' | 'invited' | 'suspended';
  created_at: string;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  brand_id?: string;
  invoice_id?: string;
  trx_id?: string;
  delta: number; // -1 for verification, +500 for topup
  balance_after: number;
  type: 'usage' | 'topup' | 'bonus' | 'refund';
  description: string;
  created_at: string;
}

export interface AffiliateStats {
  referral_code: string;
  referral_url: string;
  commission_rate: number;
  total_referred_merchants: number;
  total_earned_bdt: number;
  available_payout_bdt: number;
  total_withdrawn_bdt: number;
}

export interface PayoutRequest {
  id: string;
  user_id: string;
  amount: number;
  mfs_provider: 'bkash' | 'nagad';
  mfs_account_number: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';
  requested_at: string;
  processed_at?: string | null;
}

// 10 Accordion Sections Configuration Schema for Landing Page Builder
export interface LandingPageConfig {
  header: {
    enabled: boolean;
    brand_title: string;
    logo_url: string;
    nav_links: Array<{ label: string; url: string }>;
    cta_text: string;
    cta_url: string;
  };
  hero: {
    enabled: boolean;
    badge_text: string;
    headline: string;
    subheadline: string;
    primary_cta_text: string;
    primary_cta_link: string;
    secondary_cta_text: string;
    secondary_cta_link: string;
    banner_image_url: string;
  };
  features: {
    enabled: boolean;
    title: string;
    subtitle: string;
    items: Array<{ icon: string; title: string; description: string }>;
  };
  product_showcase: {
    enabled: boolean;
    title: string;
    price_bdt: number;
    original_price_bdt?: number;
    discount_label: string;
    image_url: string;
    feature_bullets: string[];
    checkout_cta_text: string;
  };
  video_embed: {
    enabled: boolean;
    title: string;
    embed_url: string;
    poster_image_url: string;
    autoplay: boolean;
  };
  testimonials: {
    enabled: boolean;
    title: string;
    reviews: Array<{
      client_name: string;
      role_or_company: string;
      avatar_url: string;
      star_rating: number;
      quote: string;
    }>;
  };
  faq: {
    enabled: boolean;
    title: string;
    items: Array<{ question: string; answer: string }>;
  };
  cta: {
    enabled: boolean;
    headline: string;
    subheadline: string;
    button_text: string;
    button_link: string;
    background_theme: 'indigo' | 'emerald' | 'gradient';
  };
  footer: {
    enabled: boolean;
    copyright_text: string;
    links: Array<{ label: string; url: string }>;
    social_links: {
      facebook?: string;
      twitter?: string;
      telegram?: string;
      youtube?: string;
    };
  };
  custom_css_js: {
    enabled: boolean;
    custom_css: string;
    custom_head_js: string;
    pixel_id?: string;
    gtm_id?: string;
  };
}
