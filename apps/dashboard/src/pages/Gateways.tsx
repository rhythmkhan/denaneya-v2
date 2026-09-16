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
  Sparkles,
  BookOpen,
  Copy
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { useAuth } from '../context/AuthContext';
import { GATEWAY_CATALOG, GATEWAY_TABS, GatewayDefinition } from '../data/gatewayCatalog';

export const Gateways: React.FC = () => {
  const { brand } = useAuth();
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
  const [isWcGuideOpen, setIsWcGuideOpen] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

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

  const handleCopyValue = (key: string, text: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text);
    }
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  const apiBaseUrl =
    typeof window !== 'undefined'
      ? window.location.origin.includes('localhost')
        ? 'http://localhost:5000'
        : window.location.origin
      : 'http://localhost:5000';
  const brandApiKey = brand?.api_key || 'dn_live_948f219b1836a0d249f53c';
  const brandApiSecret = brand?.api_secret || 'dn_sec_8a7d3f11b2c4e569';
  const webhookUrlTemplate = 'https://your-store.com/?wc-api=denaneya_webhook';

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
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-black text-white">
                Official WooCommerce WordPress Gateway Plugin
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                v2.0.0 Production Ready
              </span>
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold border border-indigo-500/30">
                16.8 KB .ZIP
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                0% Gateway Fee
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
              Connect your WooCommerce store in 60 seconds. Accept automated bKash, Nagad, Rocket &amp; Upay payments directly with 0% gateway commission.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0">
          <button
            type="button"
            onClick={() => setIsWcGuideOpen(true)}
            className="w-full md:w-auto px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition"
          >
            <BookOpen className="w-4 h-4 text-indigo-400" />
            <span>Setup Instructions</span>
          </button>
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

      {/* 4-Step Interactive WooCommerce Setup Guide Modal */}
      <Modal
        isOpen={isWcGuideOpen}
        onClose={() => setIsWcGuideOpen(false)}
        title="WooCommerce 4-Step Integration Guide"
        subtitle="Follow these steps to accept real-time MFS & Card payments on your WordPress store"
        maxWidth="2xl"
      >
        <div className="space-y-6">
          {/* Step 1 */}
          <div className="flex gap-3.5 items-start">
            <div className="w-7 h-7 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm mt-0.5">
              1
            </div>
            <div className="flex-1 space-y-2">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <span>Upload &amp; Activate the Plugin</span>
                <span className="text-[10px] font-normal text-slate-500">(WordPress Admin)</span>
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Log in to your WordPress Dashboard, go to <strong>Plugins &rarr; Add New &rarr; Upload Plugin</strong>, choose the downloaded <code className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-800 font-mono text-[11px]">denaneya-payment-gateway.zip</code> file, and click <strong>Install Now</strong> followed by <strong>Activate Plugin</strong>.
              </p>
              <div className="pt-1">
                <a
                  href="/denaneya-payment-gateway.zip"
                  download="denaneya-payment-gateway.zip"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg border border-indigo-200 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Plugin (16.8 KB .ZIP)
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100" />

          {/* Step 2 */}
          <div className="flex gap-3.5 items-start">
            <div className="w-7 h-7 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm mt-0.5">
              2
            </div>
            <div className="flex-1 space-y-2">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <span>Enable DenaNeya Gateway in WooCommerce</span>
                <span className="text-[10px] font-normal text-slate-500">(Settings)</span>
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Navigate to <strong>WooCommerce &rarr; Settings &rarr; Payments</strong>. Find <strong>DenaNeya - MFS &amp; Card Gateway</strong> in the payment methods list, toggle it to <strong>Enabled</strong>, and click <strong>Manage</strong> to configure credentials.
              </p>
            </div>
          </div>

          <div className="border-t border-slate-100" />

          {/* Step 3 */}
          <div className="flex gap-3.5 items-start">
            <div className="w-7 h-7 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm mt-0.5">
              3
            </div>
            <div className="flex-1 space-y-3">
              <h4 className="text-xs font-bold text-slate-900">
                Copy API Credentials into WordPress Settings
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Paste the following credentials into the corresponding fields in your WooCommerce DenaNeya settings page:
              </p>

              <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                {/* API Base URL */}
                <div>
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 mb-1">
                    <span>API Base URL</span>
                    <button
                      type="button"
                      onClick={() => handleCopyValue('apiUrl', apiBaseUrl)}
                      className="text-indigo-600 hover:text-indigo-700 flex items-center gap-1 font-bold"
                    >
                      {copiedKey === 'apiUrl' ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-600">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="px-3 py-1.5 bg-white border border-slate-200 rounded font-mono text-xs text-slate-800 select-all">
                    {apiBaseUrl}
                  </div>
                </div>

                {/* Brand API Key */}
                <div>
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 mb-1">
                    <span>Brand API Key</span>
                    <button
                      type="button"
                      onClick={() => handleCopyValue('apiKey', brandApiKey)}
                      className="text-indigo-600 hover:text-indigo-700 flex items-center gap-1 font-bold"
                    >
                      {copiedKey === 'apiKey' ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-600">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="px-3 py-1.5 bg-white border border-slate-200 rounded font-mono text-xs text-slate-800 select-all">
                    {brandApiKey}
                  </div>
                </div>

                {/* Brand Secret */}
                <div>
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 mb-1">
                    <span>Brand API Secret</span>
                    <button
                      type="button"
                      onClick={() => handleCopyValue('apiSecret', brandApiSecret)}
                      className="text-indigo-600 hover:text-indigo-700 flex items-center gap-1 font-bold"
                    >
                      {copiedKey === 'apiSecret' ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-600">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="px-3 py-1.5 bg-white border border-slate-200 rounded font-mono text-xs text-slate-800 select-all">
                    {brandApiSecret}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100" />

          {/* Step 4 */}
          <div className="flex gap-3.5 items-start">
            <div className="w-7 h-7 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm mt-0.5">
              4
            </div>
            <div className="flex-1 space-y-2">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <span>Webhook Notification Endpoint</span>
                <span className="text-[10px] font-normal text-slate-500">(Instant Status Sync)</span>
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                The WooCommerce plugin automatically handles incoming payment notifications at:
              </p>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 mb-1">
                  <span>Store Webhook Callback URL</span>
                  <button
                    type="button"
                    onClick={() => handleCopyValue('webhookUrl', webhookUrlTemplate)}
                    className="text-indigo-600 hover:text-indigo-700 flex items-center gap-1 font-bold"
                  >
                    {copiedKey === 'webhookUrl' ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-600">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="px-3 py-1.5 bg-white border border-slate-200 rounded font-mono text-xs text-slate-800 select-all">
                  {webhookUrlTemplate}
                </div>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Replace <code className="text-indigo-600 font-mono">https://your-store.com</code> with your WordPress domain, then register this URL in <strong>Profile &amp; Settings &rarr; Webhook URL</strong>. When a customer pays, DenaNeya sends an HMAC-SHA256 verified webhook to instantly mark orders as <em>Processing</em> or <em>Completed</em>.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end">
          <Button variant="primary" size="sm" onClick={() => setIsWcGuideOpen(false)}>
            Done &amp; Close
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default Gateways;
