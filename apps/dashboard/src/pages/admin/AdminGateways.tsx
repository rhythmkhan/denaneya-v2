/**
 * DenaNeya v2.0 - Super Admin Master Gateway Kill-Switch & Catalog
 * File: apps/dashboard/src/pages/admin/AdminGateways.tsx
 */

import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Search,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ShieldAlert,
  Power,
  TrendingUp,
  Layers,
  Smartphone,
  Landmark,
  Globe,
  Coins
} from 'lucide-react';
import apiClient, { getStoredMasterGateways, setStoredMasterGateways } from '../../services/apiClient';
import { MasterGatewayState } from '../../types/admin';

export const AdminGateways: React.FC = () => {
  const [gateways, setGateways] = useState<MasterGatewayState[]>([]);
  const [filteredGateways, setFilteredGateways] = useState<MasterGatewayState[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'mfs' | 'bank' | 'international' | 'crypto'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchGateways = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const res = await apiClient.admin.gateways.list();
      if (res.success && res.gateways) {
        setGateways(res.gateways);
      }
    } catch (e) {
      setGateways(getStoredMasterGateways());
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchGateways();
  }, []);

  useEffect(() => {
    let list = gateways;
    if (activeTab !== 'all') {
      list = list.filter((g) => g.type === activeTab);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (g) => g.name.toLowerCase().includes(q) || g.id.toLowerCase().includes(q)
      );
    }
    setFilteredGateways(list);
  }, [gateways, activeTab, searchQuery]);

  const handleToggle = async (gatewayId: string, currentState: boolean) => {
    setUpdatingId(gatewayId);
    const newState = !currentState;
    try {
      const res = await apiClient.admin.gateways.toggle(gatewayId, newState);
      if (res.success) {
        setGateways((prev) =>
          prev.map((g) => (g.id === gatewayId ? { ...g, isGloballyEnabled: newState } : g))
        );
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update gateway status');
    } finally {
      setUpdatingId(null);
    }
  };

  const totalChannels = gateways.length;
  const enabledCount = gateways.filter((g) => g.isGloballyEnabled).length;
  const disabledCount = gateways.filter((g) => !g.isGloballyEnabled).length;
  const totalVolume = gateways.reduce((acc, g) => acc + (g.totalVolume || 0), 0);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'mfs':
        return <Smartphone className="w-4 h-4 text-amber-400" />;
      case 'bank':
        return <Landmark className="w-4 h-4 text-sky-400" />;
      case 'international':
        return <Globe className="w-4 h-4 text-emerald-400" />;
      case 'crypto':
        return <Coins className="w-4 h-4 text-purple-400" />;
      default:
        return <Layers className="w-4 h-4 text-indigo-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>Master Gateway Kill-Switch &amp; Catalog</span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
              52+ Channels
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Network-wide kill switch to instantaneously disable compromised or maintenance-locked payment channels
          </p>
        </div>

        <button
          onClick={() => fetchGateways(true)}
          disabled={isRefreshing}
          className="px-3.5 py-2 text-xs font-semibold text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition flex items-center gap-2"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Refresh Switches</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
            <span>Total Catalog</span>
            <Layers className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-black text-white">{totalChannels}</p>
          <p className="text-[10px] text-slate-400 mt-1">Integrated payment channels</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-emerald-400 text-xs font-medium mb-1">
            <span>Globally Enabled</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400">{enabledCount}</p>
          <p className="text-[10px] text-slate-400 mt-1">Active across all merchants</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-rose-400 text-xs font-medium mb-1">
            <span>Emergency Disabled</span>
            <Power className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl font-black text-rose-400">{disabledCount}</p>
          <p className="text-[10px] text-slate-400 mt-1">Network kill-switch activated</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-amber-400 text-xs font-medium mb-1">
            <span>Combined Routed Volume</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-400">৳{(totalVolume / 1000000).toFixed(2)}M</p>
          <p className="text-[10px] text-slate-400 mt-1">Across all gateway transactions</p>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Type Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto w-full md:w-auto">
          {(
            [
              { id: 'all', label: 'All Channels (52+)' },
              { id: 'mfs', label: 'MFS (Mobile)' },
              { id: 'bank', label: 'Bank Transfer' },
              { id: 'international', label: 'Cards & Int.' },
              { id: 'crypto', label: 'Crypto Assets' }
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search channels..."
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Gateways Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredGateways.map((g) => {
          const isEnabled = g.isGloballyEnabled;
          const isUpdating = updatingId === g.id;

          return (
            <div
              key={g.id}
              className={`p-5 rounded-2xl border transition-all ${
                isEnabled
                  ? 'bg-slate-900/90 border-slate-800 hover:border-slate-700 shadow-lg shadow-black/20'
                  : 'bg-rose-950/20 border-rose-900/40 opacity-75'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0 shadow-inner">
                    {getTypeIcon(g.type)}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{g.name}</h4>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                      Type: {g.type.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Switch Toggle Button */}
                <button
                  onClick={() => handleToggle(g.id, isEnabled)}
                  disabled={isUpdating}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isEnabled ? 'bg-indigo-600' : 'bg-slate-700'
                  }`}
                  title={isEnabled ? 'Click to kill-switch' : 'Click to enable globally'}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      isEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Status and Metrics Strip */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 text-[11px] block">Active Merchants</span>
                  <span className="font-bold text-white">{g.activeMerchantsCount} Stores</span>
                </div>

                <div className="text-right">
                  <span className="text-slate-400 text-[11px] block">Total Processed</span>
                  <span className="font-bold text-emerald-400">৳{g.totalVolume.toLocaleString()}</span>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                    isEnabled
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isEnabled ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                  {isEnabled ? 'Globally Active' : 'Master Kill Switch Active'}
                </span>

                <span className="text-[10px] font-mono text-slate-400">ID: {g.id}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminGateways;
