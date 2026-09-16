/**
 * DenaNeya v2.0 - Super Admin Cross-Tenant SMS Stream & Reconciliation
 * File: apps/dashboard/src/pages/admin/AdminSmsStream.tsx
 */

import React, { useState, useEffect } from 'react';
import {
  Radio,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ExternalLink,
  Smartphone,
  Building2,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';
import apiClient, { getStoredCrossSms, setStoredCrossSms } from '../../services/apiClient';
import { CrossTenantSms } from '../../types/admin';

export const AdminSmsStream: React.FC = () => {
  const [smsLogs, setSmsLogs] = useState<CrossTenantSms[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<CrossTenantSms[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [carrierFilter, setCarrierFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Manual Reconcile Modal
  const [selectedSms, setSelectedSms] = useState<CrossTenantSms | null>(null);
  const [targetInvoiceNumber, setTargetInvoiceNumber] = useState('');
  const [isReconciling, setIsReconciling] = useState(false);
  const [reconcileSuccess, setReconcileSuccess] = useState<string | null>(null);

  const fetchSmsLogs = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const res = await apiClient.admin.sms.list();
      if (res.success && res.sms_logs) {
        setSmsLogs(res.sms_logs);
      }
    } catch (e) {
      setSmsLogs(getStoredCrossSms());
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSmsLogs();
  }, []);

  useEffect(() => {
    let list = smsLogs;
    if (statusFilter !== 'ALL') {
      list = list.filter((s) => s.status === statusFilter);
    }
    if (carrierFilter !== 'ALL') {
      list = list.filter((s) => s.sender.toLowerCase().includes(carrierFilter.toLowerCase()));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (s) =>
          (s.trxId && s.trxId.toLowerCase().includes(q)) ||
          s.rawText.toLowerCase().includes(q) ||
          s.brandName.toLowerCase().includes(q) ||
          s.deviceName.toLowerCase().includes(q) ||
          s.sender.toLowerCase().includes(q)
      );
    }
    setFilteredLogs(list);
  }, [smsLogs, searchQuery, statusFilter, carrierFilter]);

  const handleManualReconcile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSms || !targetInvoiceNumber.trim()) return;

    setIsReconciling(true);
    try {
      const res = await apiClient.admin.sms.reconcile(selectedSms.id, targetInvoiceNumber.trim());
      if (res.success) {
        setReconcileSuccess(`SMS ${selectedSms.trxId || selectedSms.id} manually matched with invoice ${targetInvoiceNumber}!`);
        await fetchSmsLogs();
        setTimeout(() => {
          setSelectedSms(null);
          setTargetInvoiceNumber('');
          setReconcileSuccess(null);
        }, 1500);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to reconcile SMS');
    } finally {
      setIsReconciling(false);
    }
  };

  const totalSms = smsLogs.length;
  const matchedCount = smsLogs.filter((s) => s.status === 'MATCHED').length;
  const unmatchedCount = smsLogs.filter((s) => s.status === 'UNUSED').length;
  const rejectedCount = smsLogs.filter((s) => s.status === 'REJECTED_DEBIT').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>Cross-Tenant Realtime SMS Stream</span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Live Ingestion
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Centralized telecommunications feed across all merchant Android forwarder handsets
          </p>
        </div>

        <button
          onClick={() => fetchSmsLogs(true)}
          disabled={isRefreshing}
          className="px-3.5 py-2 text-xs font-semibold text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition flex items-center gap-2"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Sync SMS Stream</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
            <span>Total Ingested SMS</span>
            <Radio className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-black text-white">{totalSms}</p>
          <p className="text-[10px] text-slate-400 mt-1">Across all paired Android devices</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-emerald-400 text-xs font-medium mb-1">
            <span>Reconciled &amp; Paid</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400">{matchedCount}</p>
          <p className="text-[10px] text-slate-400 mt-1">Automatically matched to invoices</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-amber-400 text-xs font-medium mb-1">
            <span>Unmatched / Unused</span>
            <AlertCircle className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-400">{unmatchedCount}</p>
          <p className="text-[10px] text-slate-400 mt-1">Awaiting customer payment claim</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-rose-400 text-xs font-medium mb-1">
            <span>Rejected Debits</span>
            <XCircle className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl font-black text-rose-400">{rejectedCount}</p>
          <p className="text-[10px] text-slate-400 mt-1">Anti-exploit blocked cash-outs</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search TrxID, SMS body text, brand name, sender phone..."
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="MATCHED">Matched</option>
            <option value="UNUSED">Unmatched / Unused</option>
            <option value="REJECTED_DEBIT">Rejected Debit</option>
          </select>

          <select
            value={carrierFilter}
            onChange={(e) => setCarrierFilter(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Senders</option>
            <option value="bKash">bKash</option>
            <option value="16216">Nagad (16216)</option>
            <option value="16213">Rocket (16213)</option>
            <option value="Upay">Upay</option>
          </select>
        </div>
      </div>

      {/* SMS Stream Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/70 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Carrier / Time</th>
                <th className="px-5 py-3.5">Brand &amp; Handset</th>
                <th className="px-5 py-3.5">TrxID &amp; Amount</th>
                <th className="px-5 py-3.5">Full SMS Content</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                    No SMS matching current filters.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((sms) => {
                  const isDebit = sms.status === 'REJECTED_DEBIT';
                  const isMatched = sms.status === 'MATCHED';

                  return (
                    <tr key={sms.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isDebit ? 'bg-rose-500' : isMatched ? 'bg-emerald-500' : 'bg-amber-400'
                            }`}
                          />
                          <span>{sms.sender}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3" />
                          <span>{sms.receivedAt}</span>
                        </div>
                      </td>

                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="font-semibold text-white flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                          <span>{sms.brandName}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Smartphone className="w-3 h-3 text-slate-400" />
                          <span>{sms.deviceName} ({sms.simOperator})</span>
                        </div>
                      </td>

                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="font-mono font-bold text-amber-300">
                          {sms.trxId || 'N/A'}
                        </div>
                        <div className="text-xs font-bold text-emerald-400 mt-0.5">
                          {sms.amount ? `৳${sms.amount.toLocaleString()}` : '—'}
                          {sms.fee ? <span className="text-[10px] text-slate-400 font-normal"> (Fee ৳{sms.fee})</span> : null}
                        </div>
                      </td>

                      <td className="px-5 py-3.5 max-w-xs">
                        <p className="text-[11px] font-mono text-slate-300 bg-slate-950 p-2 rounded border border-slate-800 line-clamp-2" title={sms.rawText}>
                          {sms.rawText}
                        </p>
                      </td>

                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {isMatched && (
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3" /> MATCHED
                            </span>
                            {sms.matchedInvoiceNumber && (
                              <span className="text-[10px] font-mono text-slate-400">
                                {sms.matchedInvoiceNumber}
                              </span>
                            )}
                          </div>
                        )}
                        {sms.status === 'UNUSED' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            <AlertCircle className="w-3 h-3" /> UNMATCHED
                          </span>
                        )}
                        {isDebit && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            <XCircle className="w-3 h-3" /> REJECTED DEBIT
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        {sms.status === 'UNUSED' && (
                          <button
                            onClick={() => {
                              setSelectedSms(sms);
                              setTargetInvoiceNumber('');
                            }}
                            className="px-2.5 py-1 text-xs font-semibold text-indigo-300 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 rounded-lg transition"
                          >
                            Manual Match
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Match Modal */}
      {selectedSms && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Radio className="w-4 h-4 text-indigo-400" />
                <span>Manual Invoice Match</span>
              </h3>
              <button
                onClick={() => setSelectedSms(null)}
                className="text-slate-400 hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">TrxID:</span>
                <span className="font-mono font-bold text-amber-300">{selectedSms.trxId || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Amount:</span>
                <span className="font-bold text-emerald-400">৳{selectedSms.amount?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Brand:</span>
                <span className="text-white">{selectedSms.brandName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Handset:</span>
                <span className="text-white">{selectedSms.deviceName}</span>
              </div>
            </div>

            {reconcileSuccess ? (
              <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{reconcileSuccess}</span>
              </div>
            ) : (
              <form onSubmit={handleManualReconcile} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Enter Merchant Invoice Number to Reconcile:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. INV-2026-0002"
                    value={targetInvoiceNumber}
                    onChange={(e) => setTargetInvoiceNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    This will mark the invoice as COMPLETED, record the TrxID, and trigger webhook dispatch.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedSms(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/80 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isReconciling}
                    className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-indigo-950/50"
                  >
                    {isReconciling ? 'Reconciling...' : 'Confirm Reconcile'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSmsStream;
