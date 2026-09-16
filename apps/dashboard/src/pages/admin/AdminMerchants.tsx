/**
 * DenaNeya v2.0 - Super Admin Merchant Governance & Impersonation
 * File: apps/dashboard/src/pages/admin/AdminMerchants.tsx
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Coins,
  LogIn,
  Eye,
  Key,
  Smartphone,
  TrendingUp,
  MoreVertical,
  Plus,
  Minus
} from 'lucide-react';
import apiClient, { getStoredMerchants, setStoredMerchants } from '../../services/apiClient';
import { MerchantRecord } from '../../types/admin';

export const AdminMerchants: React.FC = () => {
  const navigate = useNavigate();
  const [merchants, setMerchants] = useState<MerchantRecord[]>([]);
  const [filteredMerchants, setFilteredMerchants] = useState<MerchantRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals
  const [selectedMerchant, setSelectedMerchant] = useState<MerchantRecord | null>(null);
  const [isCreditsModalOpen, setIsCreditsModalOpen] = useState(false);
  const [creditAmount, setCreditAmount] = useState<string>('50');
  const [creditType, setCreditType] = useState<'add' | 'deduct'>('add');
  const [creditReason, setCreditReason] = useState<string>('Administrative topup');
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchMerchants = async () => {
    try {
      const res = await apiClient.admin.merchants.list();
      if (res.success && res.merchants) {
        setMerchants(res.merchants);
      }
    } catch (e) {
      setMerchants(getStoredMerchants());
    }
  };

  useEffect(() => {
    fetchMerchants();
  }, []);

  useEffect(() => {
    let list = merchants;
    if (statusFilter !== 'ALL') {
      list = list.filter((m) => m.status.toUpperCase() === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (m) =>
          m.brandName.toLowerCase().includes(q) ||
          m.name.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q) ||
          m.brandSlug.toLowerCase().includes(q)
      );
    }
    setFilteredMerchants(list);
  }, [merchants, searchQuery, statusFilter]);

  // Status toggle handler
  const handleToggleStatus = async (brandId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'blocked' : 'active';
    const reason = nextStatus === 'blocked' ? 'Suspicious activity detected by admin' : 'Re-activated by admin';
    try {
      await apiClient.admin.merchants.updateStatus(brandId, nextStatus, reason);
      await fetchMerchants();
    } catch (e) {
      alert('Failed to update status');
    }
  };

  // Adjust credits
  const handleSaveCredits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMerchant) return;
    setIsProcessing(true);
    const delta = creditType === 'add' ? Math.abs(Number(creditAmount)) : -Math.abs(Number(creditAmount));
    try {
      await apiClient.admin.merchants.adjustCredits(selectedMerchant.id, delta, creditReason);
      setIsCreditsModalOpen(false);
      await fetchMerchants();
    } catch (e) {
      alert('Failed to adjust credits');
    } finally {
      setIsProcessing(false);
    }
  };

  // 1-Click Impersonate Merchant
  const handleImpersonate = async (merchant: MerchantRecord) => {
    if (!window.confirm(`Are you sure you want to log in as "${merchant.brandName}"? You will enter the merchant's live dashboard view.`)) {
      return;
    }
    try {
      await apiClient.admin.impersonate(merchant.id);
      navigate('/');
    } catch (e) {
      alert('Impersonation failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>Merchant Governance &amp; Account Control</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {merchants.length} Registered Stores
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Activate, suspend, or block merchants, manually adjust transaction credits, or log in as any merchant.
          </p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by store, name, email or slug..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {['ALL', 'ACTIVE', 'SUSPENDED', 'BLOCKED'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                statusFilter === status
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Merchants Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Merchant &amp; Brand</th>
                <th className="py-3.5 px-4">Owner &amp; Email</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Credits</th>
                <th className="py-3.5 px-4">Total GMV</th>
                <th className="py-3.5 px-4">Devices</th>
                <th className="py-3.5 px-4 text-right">Master Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredMerchants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No merchants match the selected query.
                  </td>
                </tr>
              ) : (
                filteredMerchants.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <span>{m.brandName}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        slug: /{m.brandSlug} • id: {m.id}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-200">{m.name}</div>
                      <div className="text-[11px] text-slate-400">{m.email}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                          m.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : m.status === 'suspended'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {m.status === 'active' ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        <span>{m.status}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white">{m.credits}</span>
                        <button
                          onClick={() => {
                            setSelectedMerchant(m);
                            setIsCreditsModalOpen(true);
                          }}
                          title="Adjust Credits"
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 transition"
                        >
                          <Coins className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-200">
                      ৳{m.gmv.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      <span className="inline-flex items-center gap-1">
                        <Smartphone className="w-3 h-3 text-slate-400" />
                        {m.devicesCount}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* 1-Click Login as Merchant */}
                        <button
                          onClick={() => handleImpersonate(m)}
                          className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[11px] flex items-center gap-1 shadow-sm transition"
                          title="Login as Merchant (Impersonate)"
                        >
                          <LogIn className="w-3 h-3" />
                          <span>Login As</span>
                        </button>

                        {/* Block / Unblock Toggle */}
                        <button
                          onClick={() => handleToggleStatus(m.id, m.status)}
                          className={`px-2 py-1 rounded-lg text-[11px] font-semibold border transition ${
                            m.status === 'active'
                              ? 'border-rose-500/40 text-rose-300 hover:bg-rose-500/20'
                              : 'border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/20'
                          }`}
                        >
                          {m.status === 'active' ? 'Block' : 'Unblock'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjust Credits Modal */}
      {isCreditsModalOpen && selectedMerchant && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm">
                Adjust Credits: {selectedMerchant.brandName}
              </h3>
              <button
                onClick={() => setIsCreditsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCredits} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Action Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCreditType('add')}
                    className={`py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 border transition ${
                      creditType === 'add'
                        ? 'bg-emerald-600 border-emerald-500 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-300'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Credits (+)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreditType('deduct')}
                    className={`py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 border transition ${
                      creditType === 'deduct'
                        ? 'bg-rose-600 border-rose-500 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-300'
                    }`}
                  >
                    <Minus className="w-3.5 h-3.5" />
                    <span>Deduct (-)</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Amount of Credits
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Reason for Audit Log
                </label>
                <input
                  type="text"
                  required
                  value={creditReason}
                  onChange={(e) => setCreditReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  placeholder="e.g. Promotional bonus or manual bank payment received"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreditsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg shadow-md shadow-indigo-950"
                >
                  {isProcessing ? 'Processing...' : 'Apply Credit Change'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMerchants;
