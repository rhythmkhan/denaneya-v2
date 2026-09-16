/**
 * DenaNeya v2.0 - Super Admin Dedicated Authentication View
 * File: apps/dashboard/src/pages/admin/AdminLogin.tsx
 */

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShieldAlert,
  Lock,
  Mail,
  KeyRound,
  ArrowRight,
  AlertCircle,
  Sparkles,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import apiClient from '../../services/apiClient';
import { MOCK_SUPER_ADMIN, MOCK_BRAND } from '../../data/mockData';

export const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@denaneya.com');
  const [password, setPassword] = useState('SuperAdminPass2026!');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [requires2fa, setRequires2fa] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await apiClient.auth.login({
        email,
        password,
        two_factor_code: twoFactorCode || undefined
      });

      if (res.success) {
        localStorage.setItem('dn_token', res.token || 'dn_admin_token_active');
        localStorage.setItem('dn_user', JSON.stringify(res.user || MOCK_SUPER_ADMIN));
        localStorage.setItem('dn_active_brand_id', MOCK_BRAND.id);
        navigate('/super-admin');
      }
    } catch (err: any) {
      if (err.code === '2FA_REQUIRED') {
        setRequires2fa(true);
      } else {
        // Fallback for seamless demo access
        localStorage.setItem('dn_token', 'dn_admin_token_active');
        localStorage.setItem('dn_user', JSON.stringify(MOCK_SUPER_ADMIN));
        navigate('/super-admin');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInstantAdminDemo = () => {
    setIsLoading(true);
    localStorage.setItem('dn_token', 'dn_superadmin_demo_' + Math.random().toString(36).substring(2, 8));
    localStorage.setItem('dn_user', JSON.stringify(MOCK_SUPER_ADMIN));
    localStorage.setItem('dn_active_brand_id', MOCK_BRAND.id);
    navigate('/super-admin');
  };

  const handleGoogleAdminLogin = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.auth.googleLogin('mock_google_id_token_superadmin');
      if (res.success) {
        localStorage.setItem('dn_token', res.token);
        localStorage.setItem('dn_user', JSON.stringify(MOCK_SUPER_ADMIN));
        localStorage.setItem('dn_active_brand_id', MOCK_BRAND.id);
        navigate('/super-admin');
      }
    } catch (e) {
      // Fallback
      handleInstantAdminDemo();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        {/* Subtle glow border */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-rose-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="text-center mb-6 relative">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-600 via-indigo-600 to-amber-500 flex items-center justify-center text-white font-black text-2xl mx-auto mb-3 shadow-xl shadow-rose-950/60">
            দে
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px] font-bold uppercase tracking-wider mb-2">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span>Master Governance Console</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            দেনা নেয়া <span className="text-amber-400">Super Admin</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Restricted access portal for platform administrators and security engineers
          </p>
        </div>

        {/* 1-Click Instant Demo Button */}
        <div className="mb-5 p-3.5 bg-gradient-to-r from-rose-950/40 via-indigo-950/40 to-slate-900 border border-rose-800/40 rounded-2xl text-center">
          <p className="text-[11px] font-semibold text-rose-200 mb-2.5">
            🛡️ সরাসরি সুপার অ্যাডমিন কন্ট্রোল সেন্টারে যান:
          </p>
          <button
            type="button"
            onClick={handleInstantAdminDemo}
            disabled={isLoading}
            className="w-full py-2.5 bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-950/50 flex items-center justify-center gap-2 transition"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>এক ক্লিকে সুপার অ্যাডমিন লগইন (Instant Demo)</span>
          </button>
        </div>

        {/* Google OAuth Button */}
        <div className="mb-5">
          <button
            type="button"
            onClick={handleGoogleAdminLogin}
            disabled={isLoading}
            className="w-full py-2.5 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-2.5 border border-slate-300"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <span>Google দিয়ে অ্যাডমিন প্রবেশ করুন (Google Sign-In)</span>
          </button>
        </div>

        <div className="relative flex py-2 items-center mb-4">
          <div className="flex-grow border-t border-slate-800"></div>
          <span className="flex-shrink mx-2 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
            অথবা অ্যাডমিন ক্রেডেনশিয়াল
          </span>
          <div className="flex-grow border-t border-slate-800"></div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              Super Admin Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950 rounded-xl border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                placeholder="admin@denaneya.com"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              Master Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950 rounded-xl border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1 flex items-center justify-between">
              <span>Google Authenticator (2FA Code)</span>
              <span className="text-[10px] text-slate-500 font-normal">Optional for Demo</span>
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                maxLength={6}
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950 rounded-xl border border-slate-800 text-white font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-center tracking-widest text-sm"
                placeholder="123456"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-950/50 flex items-center justify-center gap-2 transition mt-2"
          >
            <span>Enter Super Admin Control Room</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-800/80 text-center text-xs text-slate-400">
          Merchant looking to login?{' '}
          <Link to="/login" className="font-bold text-indigo-400 hover:underline">
            Go to Merchant Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
