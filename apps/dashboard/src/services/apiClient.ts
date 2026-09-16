/**
 * DenaNeya v2.0 - Hardened Dashboard API Client
 * File: apps/dashboard/src/services/apiClient.ts
 *
 * Implements:
 * - Bearer JWT Token Injection
 * - Session-Bound Multi-Tenant Header (x-brand-id)
 * - Automatic 401 Session Invalidation & Redirect
 * - Constant-Time Error Propagation
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export class ApiError extends Error {
  statusCode: number;
  code: string;
  data?: unknown;

  constructor(message: string, statusCode: number, code: string = 'API_ERROR', data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.data = data;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('dn_token');
  const activeBrandId = localStorage.getItem('dn_active_brand_id');

  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (activeBrandId) {
    headers.set('x-brand-id', activeBrandId);
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers
    });
  } catch (netErr: any) {
    throw new ApiError(netErr.message || 'Network connection failure.', 0, 'NETWORK_ERROR');
  }

  // Intercept 401 Unauthorized
  if (response.status === 401) {
    localStorage.removeItem('dn_token');
    localStorage.removeItem('dn_user');
    // Only redirect if not already on login/register page
    if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
      window.location.href = '/login?expired=1';
    }
    throw new ApiError('Session expired. Please log in again.', 401, 'UNAUTHORIZED');
  }

  // Intercept 403 Forbidden (RBAC or IDOR violation)
  if (response.status === 403) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(
      errorData.message || 'Access denied. You lack permissions for this resource.',
      403,
      errorData.code || 'FORBIDDEN',
      errorData
    );
  }

  let data: any;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const message = data?.message || response.statusText || 'An API error occurred.';
    const code = data?.code || `HTTP_${response.status}`;
    throw new ApiError(message, response.status, code, data);
  }

  return data as T;
}

export const apiClient = {
  // Authentication
  auth: {
    login: (credentials: { email: string; password: string; two_factor_code?: string }) =>
      request<{ success: boolean; token: string; user: any; brand?: any }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials)
      }),
    register: (payload: { name: string; email: string; password: string; brand_name: string }) =>
      request<{ success: boolean; token: string; user: any; brand: any }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload)
      }),
    getMe: () =>
      request<{ success: boolean; user: any; brands: any[] }>('/api/auth/me')
  },

  // Brands & Multi-Tenancy
  brands: {
    list: () => request<{ success: boolean; brands: any[] }>('/api/brands'),
    create: (brandData: { brand_name: string; brand_slug: string; webhook_url?: string }) =>
      request<{ success: boolean; brand: any }>('/api/brands', {
        method: 'POST',
        body: JSON.stringify(brandData)
      }),
    getById: (brandId: string) => request<{ success: boolean; brand: any }>(`/api/brands/${brandId}`),
    rotateSecrets: (brandId: string, type: 'api_secret' | 'webhook_secret' | 'both') =>
      request<{ success: boolean; api_secret?: string; webhook_secret?: string }>(
        `/api/brands/${brandId}/rotate-secrets`,
        {
          method: 'POST',
          body: JSON.stringify({ type })
        }
      )
  },

  // Dashboard Telemetry & Metrics
  dashboard: {
    getStats: () =>
      request<{
        success: boolean;
        brand: any;
        metrics: any;
        recent_invoices: any[];
        gateways: any[];
        devices: any[];
      }>('/api/dashboard/stats')
  },

  // Invoices & Custom Invoice Builder
  invoices: {
    list: (params?: { page?: number; limit?: number; status?: string; search?: string }) => {
      const q = new URLSearchParams(params as any).toString();
      return request<{ success: boolean; invoices: any[]; total: number }>(`/api/invoices?${q}`);
    },
    create: (payload: {
      amount: number;
      customer_name: string;
      customer_email?: string;
      customer_phone?: string;
      redirect_url?: string;
      cancel_url?: string;
      metadata?: Record<string, unknown>;
      ttl_minutes?: number;
    }) =>
      request<{ success: boolean; invoice: any; payment_url: string }>('/api/invoices', {
        method: 'POST',
        body: JSON.stringify(payload)
      }),
    getStatus: (invoiceId: string) =>
      request<{ success: boolean; invoice: any; status: string }>(`/api/payment/status/${invoiceId}`)
  },

  // Devices & SMS Sync
  devices: {
    list: () => request<{ success: boolean; devices: any[] }>('/api/devices'),
    pair: (payload: { device_name: string; device_model?: string }) =>
      request<{
        success: boolean;
        device: any;
        pairing_token: string;
        pairing_qr_data: string;
      }>('/api/devices', {
        method: 'POST',
        body: JSON.stringify(payload)
      }),
    rotateToken: (deviceId: string) =>
      request<{ success: boolean; device_token: string; pairing_qr_data: string }>(
        `/api/devices/${deviceId}/rotate-token`,
        { method: 'POST' }
      ),
    delete: (deviceId: string) =>
      request<{ success: boolean }>(`/api/devices/${deviceId}`, {
        method: 'DELETE'
      })
  },

  // Payment Gateways Library
  gateways: {
    list: () => request<{ success: boolean; gateways: any[] }>('/api/gateways'),
    updateConfig: (
      gatewayId: string,
      config: {
        status?: 'active' | 'inactive';
        account_number?: string;
        account_type?: string;
        routing_number?: string;
        branch_name?: string;
        district?: string;
        ussd_code?: string;
        fee_percentage?: number;
        fee_fixed?: number;
        credentials?: Record<string, string>;
      }
    ) =>
      request<{ success: boolean; gateway: any }>(`/api/gateways/${gatewayId}`, {
        method: 'PUT',
        body: JSON.stringify(config)
      })
  },

  // Staff & Granular RBAC
  staff: {
    list: () => request<{ success: boolean; staff: any[] }>('/api/staff'),
    invite: (payload: {
      name: string;
      email: string;
      role: string;
      permissions?: Array<{ module: string; can_create: boolean; can_read: boolean; can_update: boolean; can_delete: boolean }>;
    }) =>
      request<{ success: boolean; staff: any }>('/api/staff/invite', {
        method: 'POST',
        body: JSON.stringify(payload)
      }),
    updatePermissions: (staffId: string, permissions: any[]) =>
      request<{ success: boolean }>(`/api/staff/${staffId}/permissions`, {
        method: 'PUT',
        body: JSON.stringify({ permissions })
      }),
    delete: (staffId: string) =>
      request<{ success: boolean }>(`/api/staff/${staffId}`, {
        method: 'DELETE'
      })
  },

  // Credits & Billing
  billing: {
    getOverview: () =>
      request<{
        success: boolean;
        credits_balance: number;
        starter_credits: number;
        history: any[];
      }>('/api/billing/overview'),
    purchaseTopup: (tier: 'starter' | 'growth' | 'enterprise') =>
      request<{ success: boolean; payment_url: string; invoice_id: string }>('/api/billing/topup', {
        method: 'POST',
        body: JSON.stringify({ tier })
      })
  },

  // Refer & Earn (Affiliate Program)
  affiliate: {
    getStats: () =>
      request<{
        success: boolean;
        stats: {
          referral_code: string;
          referral_url: string;
          total_referred: number;
          total_earned: number;
          available_payout: number;
          withdrawn: number;
        };
        history: any[];
      }>('/api/affiliate/stats'),
    requestPayout: (payload: { amount: number; mfs_provider: string; account_number: string }) =>
      request<{ success: boolean; payout: any }>('/api/affiliate/withdraw', {
        method: 'POST',
        body: JSON.stringify(payload)
      })
  },

  // Visual Landing Page Builder
  landingBuilder: {
    getConfig: () => request<{ success: boolean; config: any }>('/api/landing-builder/config'),
    saveConfig: (config: any) =>
      request<{ success: boolean; message: string }>('/api/landing-builder/config', {
        method: 'POST',
        body: JSON.stringify({ config })
      })
  }
};

export default apiClient;
