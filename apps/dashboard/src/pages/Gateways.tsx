/**
 * DenaNeya v2.0 - Payment Gateways Activation Library
 * File: apps/dashboard/src/pages/Gateways.tsx
 *
 * Implements:
 * - 52+ Channels across 4 Specialized Tabs:
 *   1. All: 52
 *   2. Mobile Banking (MFS): 33
 *   3. International & Crypto: 8
 *   4. Commercial Banks: 11
 * - Activation toggle switches
 * - Per-channel credentials & fee configuration modal
 */

import React, { useState } from 'react';
import {
  CreditCard,
  Search,
  Check,
  Settings2,
  ExternalLink,
  ShieldCheck,
  Smartphone,
  Globe,
  Building,
  Download,
  Sparkles
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { GATEWAY_CATALOG, GATEWAY_TABS, GatewayDefinition } from '../data/gatewayCatalog';

export const Gateways: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeGatewayStates, setActiveGatewayStates] = useState<Record<string, boolean>>({
    bkash: true,
    nagad: true,
    rocket: true,
    stripe: false,
    dutch_bangla_bank_plc: true
  });

  const [selectedGateway, setSelectedGateway] = useState<GatewayDefinition | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState<boolean>(false);
  const [configValues, setConfigValues] = useState<Record<string, string>>({});

  // Filter channels based on active tab and search term
  const filteredGateways = GATEWAY_CATALOG.filter((g) => {
    const matchesTab = activeTab === 'all' || g.tab === activeTab;
    const matchesSearch =
      g.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const handleToggle = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveGatewayStates((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleOpenConfig = (g: GatewayDefinition) => {
    setSelectedGateway(g);
    setIsConfigOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Payment Gateways Library
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure, activate, and manage 52+ payment channels across Bangladesh and globally
          </p>
        </div>
      </div>

      {/* WooCommerce Plugin Integration Card */}
      <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl border border-indigo-500/30 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-600/30 border border-indigo-500/40 text-indigo-400 flex items-center justify-center shrink-0 shadow-md">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-white">
                Official WooCommerce WordPress Gateway Plugin
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                v2.0.0 Production Ready
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
              Connect your WooCommerce store in 60 seconds. Accept automated bKash, Nagad, Rocket & Upay payments directly with 0% gateway commission.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <a
            href="/denaneya-payment-gateway.zip"
            download="denaneya-payment-gateway.zip"
            className="w-full md:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-md shadow-indigo-950/50"
          >
            <Download className="w-4 h-4" />
            <span>Download Plugin (.ZIP)</span>
          </a>
        </div>
      </div>

      {/* 4 Tabs Filter & Search */}
      <Card>
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            {GATEWAY_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search 52+ gateways..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Gateways Grid */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGateways.map((g) => {
            const isChannelActive = Boolean(activeGatewayStates[g.id]);
            return (
              <div
                key={g.id}
                onClick={() => handleOpenConfig(g)}
                className={`p-4 rounded-xl border transition-all cursor-pointer relative group flex flex-col justify-between ${
                  isChannelActive
                    ? 'border-indigo-200 bg-white shadow-xs hover:border-indigo-300'
                    : 'border-slate-200 bg-slate-50/60 opacity-80 hover:opacity-100'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700">
                        {g.displayName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {g.displayName}
                        </h3>
                        <span className="text-[10px] text-slate-400 block font-medium">
                          {g.tab} • {g.ussdCode ? `USSD: ${g.ussdCode}` : 'Online API'}
                        </span>
                      </div>
                    </div>

                    {/* Activation Switch */}
                    <button
                      type="button"
                      onClick={(e) => handleToggle(g.id, e)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isChannelActive ? 'bg-indigo-600' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          isChannelActive ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">
                    {isChannelActive ? (
                      <span className="text-emerald-600 font-semibold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Ready for Checkout
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">Inactive</span>
                    )}
                  </span>
                  <span className="text-indigo-600 font-semibold group-hover:underline flex items-center gap-1">
                    <Settings2 className="w-3.5 h-3.5" />
                    Configure
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Gateway Configuration Modal */}
      {selectedGateway && (
        <Modal
          isOpen={isConfigOpen}
          onClose={() => setIsConfigOpen(false)}
          title={`Configure ${selectedGateway.displayName}`}
          subtitle={`Set up credentials, fees, and account parameters for ${selectedGateway.tab}`}
          maxWidth="lg"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setIsConfigOpen(false);
            }}
            className="space-y-4"
          >
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-xs text-indigo-800 flex items-center justify-between">
              <span className="font-semibold">
                Status: {activeGatewayStates[selectedGateway.id] ? 'Active (Ready)' : 'Inactive'}
              </span>
              <button
                type="button"
                onClick={(e) => handleToggle(selectedGateway.id, e)}
                className="text-xs font-bold text-indigo-600 hover:underline"
              >
                {activeGatewayStates[selectedGateway.id] ? 'Deactivate' : 'Activate Now'}
              </button>
            </div>

            {selectedGateway.fields.map((field) => (
              <div key={field.key}>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {field.label} {field.required && '*'}
                </label>
                {field.type === 'select' ? (
                  <select
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 capitalize"
                    defaultValue={field.options?.[0]}
                  >
                    {field.options?.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type}
                    placeholder={field.placeholder}
                    required={field.required}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                )}
              </div>
            ))}

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsConfigOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm">
                Save Configuration
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default Gateways;
