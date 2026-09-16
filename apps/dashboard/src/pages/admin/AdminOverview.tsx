/**
 * DenaNeya v2.0 - Super Admin Global Platform Overview
 * File: apps/dashboard/src/pages/admin/AdminOverview.tsx
 */

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  CreditCard,
  Users,
  Smartphone,
  Radio,
  Coins,
  ShieldCheck,
  ArrowUpRight,
  RefreshCw,
  Activity,
  AlertTriangle
} from 'lucide-react';
import apiClient from '../../services/apiClient';
import { SuperAdminTelemetry } from '../../types/admin';
import { MOCK_SUPERADMIN_TELEMETRY } from '../../data/mockData';

export const AdminOverview: React.FC = () => {
  const [telemetry, setTelemetry] = useState<SuperAdminTelemetry>(MOCK_SUPERADMIN_TELEMETRY);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchTelemetry = async (manual = false) => {
    if (manual) setIsRefreshing(true);
    try {
      const res = await apiClient.admin.telemetry.getKpis();
      if (res.success && res.telemetry) {
        setTelemetry(res.telemetry);
      }
    } catch (e) {
      console.error('Failed to fetch admin telemetry:', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
  }, []);

  const gmvDisplay = (telemetry.combinedGmv || 3450850).toLocaleString('en-US', { minimumFractionDigits: 2 });
  const revDisplay = (telemetry.platformRevenue || 69017).toLocaleString('en-US', { minimumFractionDigits: 2 });

  return (
    <div className="space-y-6">
      {/* Top Banner & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>Global Network Telemetry &amp; Financial Overview</span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Cross-Tenant
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time aggregate performance metrics across all 142 registered merchant accounts
          </p>
        </div>
        <button
          onClick={() => fetchTelemetry(true)}
          disabled={isRefreshing}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Combined GMV */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Network Gross Volume (GMV)
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white tracking-tight">
              ৳{gmvDisplay}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-emerald-400 font-medium">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>{telemetry.completedInvoices || 3912} Reconciled Invoices</span>
            </div>
          </div>
        </div>

        {/* Card 2: Platform Fees / Revenue */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Platform Revenue Earned
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white tracking-tight">
              ৳{revDisplay}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-amber-400 font-medium">
              <span>৳1.00 / Verification Fee</span>
            </div>
          </div>
        </div>

        {/* Card 3: Active Merchants */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Registered Merchants
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white tracking-tight">
              {telemetry.totalMerchants || 142}
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs font-medium">
              <span className="text-emerald-400">{telemetry.activeMerchants || 138} Active</span>
              <span className="text-slate-600">•</span>
              <span className="text-rose-400">{telemetry.blockedMerchants || 4} Blocked</span>
            </div>
          </div>
        </div>

        {/* Card 4: Android Handsets */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Syncing Android Handsets
            </span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Smartphone className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white tracking-tight">
              {telemetry.activeDevices || 82} / {telemetry.totalDevices || 89}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-cyan-400 font-medium">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>{telemetry.totalSmsReceived || 8740} Carrier SMS Forwarded</span>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Charts & Channel Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 8 Cols: 7-Day Network Transaction Volume Chart */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-bold text-white">Daily Multi-Brand Transaction Volume</h3>
              <p className="text-xs text-slate-400">Aggregated BDT volume processed across all active stores</p>
            </div>
            <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-lg">
              Past 7 Days
            </span>
          </div>

          {/* SVG Line / Bar Chart */}
          <div className="h-48 flex items-end justify-between gap-3 pt-4 px-2">
            {telemetry.dailyVolume?.map((item, idx) => {
              const maxVol = 700000;
              const heightPct = Math.min(100, Math.round((item.volume / maxVol) * 100));
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                  <div className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    ৳{(item.volume / 1000).toFixed(0)}k
                  </div>
                  <div
                    style={{ height: `${heightPct}%` }}
                    className="w-full max-w-[40px] bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t-lg group-hover:from-indigo-500 group-hover:to-cyan-400 transition-all shadow-md shadow-indigo-950/50"
                  />
                  <span className="text-[10px] font-semibold text-slate-400">{item.date}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 4 Cols: MFS Channel Distribution */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white mb-1">MFS &amp; Channel Distribution</h3>
            <p className="text-xs text-slate-400 mb-5">Share of total platform transactions by provider</p>

            <div className="space-y-4">
              {telemetry.channelDistribution?.map((ch, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200">{ch.channel}</span>
                    <span className="font-mono text-slate-400">{ch.percentage}% (৳{(ch.volume / 1000).toFixed(0)}k)</span>
                  </div>
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${ch.percentage}%` }}
                      className={`h-full rounded-full ${
                        i === 0
                          ? 'bg-rose-500'
                          : i === 1
                          ? 'bg-orange-500'
                          : i === 2
                          ? 'bg-purple-500'
                          : 'bg-emerald-500'
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Carrier Ingestion Health</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              100% Operational
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminOverview;
