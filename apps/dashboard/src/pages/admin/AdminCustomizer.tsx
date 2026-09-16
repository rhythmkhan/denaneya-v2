/**
 * DenaNeya v2.0 - Super Admin Live Site Customizer & Network Configuration
 * File: apps/dashboard/src/pages/admin/AdminCustomizer.tsx
 */

import React, { useState, useEffect } from 'react';
import {
  Palette,
  Sliders,
  Save,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Globe,
  Coins,
  Shield,
  MessageSquare,
  Key,
  Copy,
  Check
} from 'lucide-react';
import apiClient, { getStoredSystemSettings, setStoredSystemSettings } from '../../services/apiClient';
import { SystemSettings } from '../../types/admin';

export const AdminCustomizer: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings>(getStoredSystemSettings());
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [googleSecret, setGoogleSecret] = useState('GOCSPX-xxxxxxxxxxxxxxxxxxxx');
  const [copiedRedirect, setCopiedRedirect] = useState(false);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.admin.settings.get();
      if (res.success && res.settings) {
        setSettings(res.settings);
      }
    } catch (e) {
      setSettings(getStoredSystemSettings());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(null);
    try {
      const res = await apiClient.admin.settings.update(settings);
      if (res.success) {
        setSaveSuccess('System settings and customizer configuration successfully updated!');
        if (res.settings) {
          setSettings(res.settings);
        }
        setTimeout(() => setSaveSuccess(null), 4000);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRedirect(true);
    setTimeout(() => setCopiedRedirect(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>Site Customizer &amp; Global Configuration</span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Live Runtime
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure platform branding, fees, maintenance status, and Google OAuth credentials without redeployment
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition flex items-center gap-2 shadow-lg shadow-indigo-950/50"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{isSaving ? 'Saving Changes...' : 'Save Configuration'}</span>
        </button>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 shadow-lg">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Platform Branding & Announcement */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Palette className="w-4 h-4 text-indigo-400" />
            <span>Platform Branding &amp; Global Broadcast</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Platform Name
              </label>
              <input
                type="text"
                value={settings.platformName}
                onChange={(e) => setSettings({ ...settings, platformName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Support WhatsApp Number
              </label>
              <input
                type="text"
                value={settings.supportPhone}
                onChange={(e) => setSettings({ ...settings, supportPhone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Global Announcement Banner (Visible on Dashboard &amp; Landing)
              </label>
              <input
                type="text"
                value={settings.announcementText}
                onChange={(e) => setSettings({ ...settings, announcementText: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Official Telegram Community / Support Link
              </label>
              <input
                type="text"
                value={settings.supportTelegram}
                onChange={(e) => setSettings({ ...settings, supportTelegram: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Economics & Credit Pricing */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Coins className="w-4 h-4 text-amber-400" />
            <span>Monetization &amp; Credit Configuration</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Fee Per Automated Payment Verification (BDT)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">
                  ৳
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={settings.verificationFeeBdt}
                  onChange={(e) =>
                    setSettings({ ...settings, verificationFeeBdt: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-bold text-emerald-400"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Cost deducted from merchant balance per successful TrxID match.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Starter Credits (New Merchant Registration Gift)
              </label>
              <input
                type="number"
                min="0"
                value={settings.starterCredits}
                onChange={(e) =>
                  setSettings({ ...settings, starterCredits: parseInt(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-bold text-amber-400"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Free initial credits granted immediately upon account signup.
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: Google OAuth 2.0 Integration Suite */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Key className="w-4 h-4 text-sky-400" />
              <span>Google OAuth 2.0 Authentication Suite</span>
            </h3>

            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-xs text-slate-300 font-semibold">Enable Google Login</span>
              <input
                type="checkbox"
                checked={settings.googleOAuthEnabled}
                onChange={(e) =>
                  setSettings({ ...settings, googleOAuthEnabled: e.target.checked })
                }
                className="w-4 h-4 rounded text-indigo-600 bg-slate-950 border-slate-800 focus:ring-indigo-500"
              />
            </label>
          </div>

          <div className="p-3 bg-sky-950/20 border border-sky-800/40 rounded-xl text-xs text-sky-300">
            Google Cloud Console OAuth 2.0 Client Credentials. When you paste your Client ID and Secret below, both Merchant and Super Admin logins will authenticate directly with Google Accounts.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Google Client ID
              </label>
              <input
                type="text"
                placeholder="e.g. 1029384756-xxxxxxxx.apps.googleusercontent.com"
                value={settings.googleClientId || ''}
                onChange={(e) => setSettings({ ...settings, googleClientId: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Google Client Secret
              </label>
              <input
                type="password"
                placeholder="GOCSPX-xxxxxxxxxxxxxxxxxxxx"
                value={googleSecret}
                onChange={(e) => setGoogleSecret(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Authorized Redirect URIs (Add this in Google Cloud Console Credentials)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value="https://denaneya.aihaat.shop/api/auth/google/callback"
                  className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-indigo-300 font-mono focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard('https://denaneya.aihaat.shop/api/auth/google/callback')
                  }
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  {copiedRedirect ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedRedirect ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Emergency Maintenance Kill-Switch */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Network Maintenance Mode</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                When activated, all public checkouts and merchant dashboards display a graceful maintenance screen
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSettings({ ...settings, maintenanceMode: !settings.maintenanceMode })}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                settings.maintenanceMode
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-950'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>{settings.maintenanceMode ? 'MAINTENANCE ACTIVE' : 'SYSTEM ONLINE'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AdminCustomizer;
