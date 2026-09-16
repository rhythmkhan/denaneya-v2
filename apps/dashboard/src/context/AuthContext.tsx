/**
 * DenaNeya v2.0 - Auth & RBAC State Provider
 * File: apps/dashboard/src/context/AuthContext.tsx
 *
 * Enforces:
 * - Multi-Tenant Active Brand Isolation (stores active brand in state and local storage)
 * - 4-Tier Staff RBAC checks: Owner, Admin, Manager, Viewer
 * - 10-Module Granular CRUD permissions evaluation
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import apiClient, { ApiError } from '../services/apiClient';
import { User, Brand, StaffRole, ModuleName, PermissionAction, ModulePermission } from '../types/dashboard';

interface AuthContextType {
  user: User | null;
  brand: Brand | null;
  brands: Brand[];
  activeBrandId: string | null;
  staffRole: StaffRole;
  permissions: ModulePermission[];
  isLoading: boolean;
  login: (email: string, pass: string, twoFactorCode?: string) => Promise<void>;
  register: (name: string, email: string, pass: string, brandName: string) => Promise<void>;
  logout: () => void;
  setActiveBrandId: (brandId: string) => void;
  hasPermission: (module: ModuleName, action?: PermissionAction) => boolean;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [brand, setBrand] = useState<Brand | null>(null);
  const [activeBrandId, setActiveBrandIdState] = useState<string | null>(
    localStorage.getItem('dn_active_brand_id')
  );
  const [staffRole, setStaffRole] = useState<StaffRole>('owner');
  const [permissions, setPermissions] = useState<ModulePermission[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Helper to switch active brand and trigger reload
  const setActiveBrandId = (brandId: string) => {
    localStorage.setItem('dn_active_brand_id', brandId);
    setActiveBrandIdState(brandId);
    const selected = brands.find((b) => b.id === brandId) || null;
    setBrand(selected);
    if (selected?.role) {
      setStaffRole(selected.role);
    }
  };

  const refreshUserData = useCallback(async () => {
    const token = localStorage.getItem('dn_token');
    if (!token) {
      setUser(null);
      setBrands([]);
      setBrand(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await apiClient.auth.getMe();
      if (res.success) {
        setUser(res.user);
        const userBrands = res.brands || [];
        setBrands(userBrands);

        // Resolve active brand
        let currentBrandId = localStorage.getItem('dn_active_brand_id');
        let currentBrand = userBrands.find((b: Brand) => b.id === currentBrandId);

        if (!currentBrand && userBrands.length > 0 && userBrands[0]) {
          const firstBrand = userBrands[0];
          currentBrand = firstBrand;
          currentBrandId = firstBrand.id;
          localStorage.setItem('dn_active_brand_id', firstBrand.id);
        }

        if (currentBrand) {
          setBrand(currentBrand);
          setActiveBrandIdState(currentBrandId);
          setStaffRole(currentBrand.role || 'owner');
        }
      }
    } catch (err) {
      console.error('[AuthContext] Failed to fetch session profile:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUserData();
  }, [refreshUserData]);

  const login = async (email: string, pass: string, twoFactorCode?: string) => {
    setIsLoading(true);
    try {
      const res = await apiClient.auth.login({ email, password: pass, two_factor_code: twoFactorCode });
      if (res.success && res.token) {
        localStorage.setItem('dn_token', res.token);
        setUser(res.user);
        if (res.brand) {
          localStorage.setItem('dn_active_brand_id', res.brand.id);
          setActiveBrandIdState(res.brand.id);
          setBrand(res.brand);
        }
        await refreshUserData();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, pass: string, brandName: string) => {
    setIsLoading(true);
    try {
      const res = await apiClient.auth.register({
        name,
        email,
        password: pass,
        brand_name: brandName
      });
      if (res.success && res.token) {
        localStorage.setItem('dn_token', res.token);
        setUser(res.user);
        if (res.brand) {
          localStorage.setItem('dn_active_brand_id', res.brand.id);
          setActiveBrandIdState(res.brand.id);
          setBrand(res.brand);
        }
        await refreshUserData();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('dn_token');
    localStorage.removeItem('dn_active_brand_id');
    setUser(null);
    setBrand(null);
    setBrands([]);
    setActiveBrandIdState(null);
    window.location.href = '/login';
  };

  /**
   * Evaluates granular RBAC permissions:
   * 1. Owner has unrestricted rights across all 10 modules
   * 2. Admin has full rights on operational modules, read on billing/settings
   * 3. Manager has operational access on invoices, links, devices; no billing/settings
   * 4. Viewer has read-only access on overview and invoices; no other access
   * 5. Custom granular permissions in permissions state override defaults
   */
  const hasPermission = (module: ModuleName, action: PermissionAction = 'read'): boolean => {
    if (staffRole === 'owner') return true;

    // Check custom permissions first if assigned
    const customPerm = permissions.find((p) => p.module === module);
    if (customPerm) {
      switch (action) {
        case 'create':
          return customPerm.can_create;
        case 'read':
          return customPerm.can_read;
        case 'update':
          return customPerm.can_update;
        case 'delete':
          return customPerm.can_delete;
      }
    }

    // Role-based defaults
    if (staffRole === 'admin') {
      if (['overview', 'invoices', 'payment_links', 'landing_builder', 'gateways', 'devices'].includes(module)) {
        return true;
      }
      if (['staff', 'billing', 'affiliate', 'settings'].includes(module)) {
        return action === 'read';
      }
      return false;
    }

    if (staffRole === 'manager') {
      if (['invoices', 'payment_links'].includes(module)) {
        return action !== 'delete';
      }
      if (['overview', 'devices', 'gateways', 'landing_builder'].includes(module)) {
        return action === 'read';
      }
      return false;
    }

    if (staffRole === 'viewer') {
      if (['overview', 'invoices'].includes(module)) {
        return action === 'read';
      }
      return false;
    }

    return false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        brand,
        brands,
        activeBrandId,
        staffRole,
        permissions,
        isLoading,
        login,
        register,
        logout,
        setActiveBrandId,
        hasPermission,
        refreshUserData
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
