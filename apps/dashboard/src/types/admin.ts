/**
 * DenaNeya v2.0 - Super Admin & Platform Governance Types
 * File: apps/dashboard/src/types/admin.ts
 */

export interface SuperAdminTelemetry {
  totalMerchants: number;
  activeMerchants: number;
  blockedMerchants: number;
  combinedGmv: number;
  platformRevenue: number;
  totalInvoices: number;
  completedInvoices: number;
  totalDevices: number;
  activeDevices: number;
  totalSmsReceived: number;
  unmatchedSms: number;
  dailyVolume: { date: string; volume: number; count: number }[];
  channelDistribution: { channel: string; volume: number; percentage: number; count: number }[];
}

export interface MerchantRecord {
  id: string;
  userId: string;
  name: string;
  email: string;
  brandName: string;
  brandSlug: string;
  status: 'active' | 'suspended' | 'blocked';
  credits: number;
  gmv: number;
  invoicesCount: number;
  devicesCount: number;
  apiKey: string;
  webhookUrl: string | null;
  createdAt: string;
  lastLoginAt: string;
}

export interface CrossTenantSms {
  id: string;
  brandId: string;
  brandName: string;
  deviceId: string;
  deviceName: string;
  sender: string;
  recipientSimSlot: string;
  simOperator: string;
  rawText: string;
  trxId: string | null;
  amount: number | null;
  fee: number | null;
  balance: number | null;
  status: 'MATCHED' | 'UNUSED' | 'REJECTED_DEBIT';
  matchedInvoiceNumber?: string | null;
  receivedAt: string;
}

export interface SystemSettings {
  platformName: string;
  verificationFeeBdt: number;
  starterCredits: number;
  maintenanceMode: boolean;
  announcementText: string;
  supportPhone: string;
  supportTelegram: string;
  googleOAuthEnabled: boolean;
  googleClientId?: string;
}

export interface MasterGatewayState {
  id: string;
  name: string;
  type: 'mfs' | 'bank' | 'international' | 'crypto';
  isGloballyEnabled: boolean;
  totalVolume: number;
  activeMerchantsCount: number;
}

export interface AdminAuditLog {
  id: string;
  adminEmail: string;
  action: string;
  targetType: 'merchant' | 'gateway' | 'settings' | 'sms' | 'credits';
  targetId: string;
  description: string;
  ipAddress: string;
  timestamp: string;
}
