/**
 * DenaNeya v2.0 - Dashboard Master Layout
 * File: apps/dashboard/src/components/layout/DashboardLayout.tsx
 */

import React, { useState } from 'react';
import { NavLink, Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Receipt,
  Link2,
  PanelsTopLeft,
  CreditCard,
  Smartphone,
  Users,
  Coins,
  Gift,
  Settings,
  ChevronDown,
  LogOut,
  Menu,
  X,
  Building2,
  ExternalLink,
  ShieldCheck,
  Zap,
  AlertTriangle,
  ArrowLeft,
  ShieldAlert
} from 'lucide-react';
import apiClient from '../../services/apiClient';
import { useAuth } from '../../context/AuthContext';
import { ModuleName } from '../../types/dashboard';

interface NavItem {
  name: string;
  path: string;
  module: ModuleName;
  icon: React.ElementType;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { name: 'Overview', path: '/', module: 'overview', icon: LayoutDashboard },
  { name: 'Invoices', path: '/invoices', module: 'invoices', icon: Receipt },
  { name: 'Payment Links', path: '/payment-links', module: 'payment_links', icon: Link2 },
  { name: 'Landing Builder', path: '/landing-builder', module: 'landing_builder', icon: PanelsTopLeft, badge: 'NEW' },
  { name: 'Gateways (52+)', path: '/gateways', module: 'gateways', icon: CreditCard },
  { name: 'Devices & SMS', path: '/devices', module: 'devices', icon: Smartphone },
  { name: 'Staff & RBAC', path: '/staff', module: 'staff', icon: Users },
  { name: 'Credits & Billing', path: '/billing', module: 'billing', icon: Coins },
  { name: 'Refer & Earn', path: '/refer-earn', module: 'affiliate', icon: Gift, badge: '10%' },
  { name: 'Profile & 2FA', path: '/settings', module: 'settings', icon: Settings }
];

export const DashboardLayout: React.FC = () => {
  const { user, brand, brands, activeBrandId, setActiveBrandId, staffRole, hasPermission, logout } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isBrandDropdownOpen, setIsBrandDropdownOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const isImpersonating = localStorage.getItem('dn_impersonating') === 'true';
  const isSuperAdmin =
    user?.role === 'superadmin' ||
    user?.email?.includes('admin') ||
    Boolean(localStorage.getItem('dn_original_admin_token'));

  const handleExitImpersonation = async () => {
    try {
      await apiClient.admin.exitImpersonation();
    } catch (e) {}
    localStorage.removeItem('dn_impersonating');
    const orig = localStorage.getItem('dn_original_admin_token');
    if (orig) {
      localStorage.setItem('dn_token', orig);
      localStorage.removeItem('dn_original_admin_token');
    }
    navigate('/super-admin/merchants');
    window.location.reload();
  };

  const currentNav = NAV_ITEMS.find(
    (item) => item.path === location.pathname || (item.path !== '/' && location.pathname.startsWith(item.path))
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-white flex flex-col transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-0 max-lg:-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center font-black text-xl tracking-tighter">
              দে
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-white block leading-tight">
                দেনা নেয়া <span className="text-indigo-400 text-xs font-normal">v2.0</span>
              </span>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                MFS Payment Auto
              </span>
            </div>
          </div>
          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Multi-Tenant Brand Selector */}
        <div className="p-4 border-b border-slate-800">
          <div className="relative">
            <button
              onClick={() => setIsBrandDropdownOpen(!isBrandDropdownOpen)}
              className="w-full bg-slate-800/80 hover:bg-slate-800 p-2.5 rounded-lg border border-slate-700/60 flex items-center justify-between text-left transition-colors"
            >
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-7 h-7 rounded bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <span className="text-xs font-semibold text-white block truncate">
                    {brand?.brand_name || 'Select Brand'}
                  </span>
                  <span className="text-[10px] text-slate-400 block truncate">
                    Role: <span className="capitalize text-indigo-400">{staffRole}</span>
                  </span>
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
            </button>

            {/* Dropdown Menu */}
            {isBrandDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20 py-1 max-h-48 overflow-y-auto">
                <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Your Brands
                </div>
                {brands.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => {
                      setActiveBrandId(b.id);
                      setIsBrandDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-xs text-left flex items-center justify-between hover:bg-slate-700/60 transition-colors ${
                      b.id === activeBrandId ? 'text-indigo-400 font-semibold bg-slate-700/40' : 'text-slate-200'
                    }`}
                  >
                    <span className="truncate">{b.brand_name}</span>
                    {b.id === activeBrandId && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const hasAccess = hasPermission(item.module, 'read');
            if (!hasAccess) return null;

            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                onClick={() => setIsMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-indigo-500/30 text-indigo-300 uppercase">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Credits Balance Strip */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Credits Balance
            </span>
            <span className="text-xs font-bold text-emerald-400">
              {user?.credits ?? 50} Left
            </span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, ((user?.credits ?? 50) / 500) * 100)}%` }}
            />
          </div>
          <NavLink
            to="/billing"
            className="mt-2.5 block text-center text-[10px] font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            + Top-up Credits (৳1/trx)
          </NavLink>
        </div>

        {/* User Footer */}
        <div className="p-3 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
              {user?.name?.[0]?.toUpperCase() || 'M'}
            </div>
            <div className="truncate">
              <span className="text-xs font-semibold text-slate-200 block truncate leading-tight">
                {user?.name || 'Merchant'}
              </span>
              <span className="text-[10px] text-slate-400 block truncate">
                {user?.email || 'merchant@denaneya.com'}
              </span>
            </div>
          </div>
          <button
            onClick={logout}
            title="Log Out"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Impersonation Warning Banner */}
        {isImpersonating && (
          <div className="bg-amber-400 text-slate-950 px-6 py-2.5 flex items-center justify-between text-xs font-bold shadow-md z-20 border-b border-amber-500">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-slate-950 shrink-0" />
              <span>
                You are currently impersonating merchant: <u>{brand?.brand_name || 'Selected Merchant'}</u> ({user?.name || user?.email}). All actions affect this store live.
              </span>
            </div>
            <button
              onClick={handleExitImpersonation}
              className="px-3 py-1 bg-slate-950 hover:bg-slate-900 text-amber-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Exit Impersonation &amp; Return to Admin</span>
            </button>
          </div>
        )}

        {/* Top App Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsMobileOpen(true)}
              className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold text-slate-900">
              {currentNav?.name || 'Dashboard'}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Super Admin Switcher Link if Admin */}
            {isSuperAdmin && (
              <Link
                to="/super-admin"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors shadow-sm"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                <span>Super Admin Console</span>
              </Link>
            )}

            {/* Hosted Checkout Test Link */}
            <a
              href={`/pay/INV_DEMO`}
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              <span>Hosted Checkout</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            {/* Anti-IDOR Tenant Lock Badge */}
            <div className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Multi-Tenant Isolated</span>
            </div>
          </div>
        </header>

        {/* Dynamic Nested Page Content */}
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
