/**
 * DenaNeya v2.0 - Super Admin Master Layout
 * File: apps/dashboard/src/pages/admin/SuperAdminLayout.tsx
 */

import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  ShieldAlert,
  BarChart3,
  Users,
  Radio,
  Sliders,
  Palette,
  KeyRound,
  FileText,
  LogOut,
  ExternalLink,
  Menu,
  X,
  Bell,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AdminNavItem {
  name: string;
  path: string;
  icon: React.ElementType;
  badge?: string;
}

const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { name: 'Platform Overview', path: '/super-admin', icon: BarChart3 },
  { name: 'Merchant Governance', path: '/super-admin/merchants', icon: Users, badge: 'Live' },
  { name: 'Cross-Tenant SMS Stream', path: '/super-admin/sms', icon: Radio, badge: 'Realtime' },
  { name: 'Master Gateway Kill-Switch', path: '/super-admin/gateways', icon: Sliders },
  { name: 'Site Customizer & Settings', path: '/super-admin/customizer', icon: Palette },
  { name: 'Google Authenticator (2FA)', path: '/super-admin/security', icon: KeyRound },
  { name: 'Platform Audit Logs', path: '/super-admin/audit-logs', icon: FileText }
];

export const SuperAdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleSwitchToMerchantPortal = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Super Admin Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-0 max-lg:-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 via-indigo-600 to-amber-500 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-rose-950/50">
              দে
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm tracking-tight text-white">
                  দেনা নেয়া <span className="text-amber-400">v2.0</span>
                </span>
                <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
                  Super Admin
                </span>
              </div>
              <p className="text-[10px] text-slate-400">Master Governance Console</p>
            </div>
          </div>
          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Control Center
          </div>

          {ADMIN_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.path ||
              (item.path !== '/super-admin' && location.pathname.startsWith(item.path));

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileOpen(false)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-950/50'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-400'
                    }`}
                  />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Switch to Merchant Mode Action */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/30">
          <button
            onClick={handleSwitchToMerchantPortal}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-700/60 transition group"
          >
            <ExternalLink className="w-3.5 h-3.5 text-indigo-400 group-hover:translate-x-0.5 transition-transform" />
            <span>Switch to Merchant Portal</span>
          </button>
        </div>

        {/* Super Admin User Footer */}
        <div className="p-4 border-t border-slate-800/80 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold flex items-center justify-center text-xs shrink-0">
              SA
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">
                {user?.name || 'Super Administrator'}
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                {user?.email || 'admin@denaneya.com'}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            title="Logout"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-950">
        {/* Top Header Bar */}
        <header className="h-16 px-6 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/60 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsMobileOpen(true)}
              className="lg:hidden text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <h1 className="text-sm font-bold text-white tracking-tight">
                Super Admin Security &amp; Control Room
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Hostinger MySQL Live</span>
            </div>

            <button
              onClick={handleSwitchToMerchantPortal}
              className="px-3 py-1.5 text-xs font-semibold text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-lg transition flex items-center gap-1.5"
            >
              <span>Merchant View</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </header>

        {/* Child Views */}
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default SuperAdminLayout;
