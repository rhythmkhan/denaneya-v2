/**
 * DenaNeya v2.0 - Super Admin Platform Audit Logs
 * File: apps/dashboard/src/pages/admin/AdminAuditLogs.tsx
 */

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  RefreshCw,
  Calendar,
  Globe,
  Shield,
  Layers,
  Users,
  Coins,
  Sliders,
  Radio
} from 'lucide-react';
import apiClient, { getStoredAuditLogs } from '../../services/apiClient';
import { AdminAuditLog } from '../../types/admin';

export const AdminAuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AdminAuditLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [targetFilter, setTargetFilter] = useState<string>('ALL');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchLogs = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const res = await apiClient.admin.auditLogs.list();
      if (res.success && res.logs) {
        setLogs(res.logs);
      }
    } catch (e) {
      setLogs(getStoredAuditLogs());
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    let list = logs;
    if (targetFilter !== 'ALL') {
      list = list.filter((l) => l.targetType === targetFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (l) =>
          l.action.toLowerCase().includes(q) ||
          l.description.toLowerCase().includes(q) ||
          l.adminEmail.toLowerCase().includes(q) ||
          l.targetId.toLowerCase().includes(q) ||
          l.ipAddress.includes(q)
      );
    }
    setFilteredLogs(list);
  }, [logs, targetFilter, searchQuery]);

  const getTargetBadge = (type: string) => {
    switch (type) {
      case 'merchant':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            <Users className="w-3 h-3" /> Merchant
          </span>
        );
      case 'credits':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <Coins className="w-3 h-3" /> Credits
          </span>
        );
      case 'gateway':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
            <Sliders className="w-3 h-3" /> Gateway
          </span>
        );
      case 'sms':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <Radio className="w-3 h-3" /> SMS Reconcile
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-700 text-slate-300">
            <Shield className="w-3 h-3" /> Settings
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>Platform Governance Audit Trail</span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Immutable Log
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Complete cryptographic audit records of every administrative action, merchant override, and gateway switch
          </p>
        </div>

        <button
          onClick={() => fetchLogs(true)}
          disabled={isRefreshing}
          className="px-3.5 py-2 text-xs font-semibold text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition flex items-center gap-2"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Refresh Audit Logs</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search action name, admin email, IP address, target ID..."
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={targetFilter}
            onChange={(e) => setTargetFilter(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Categories</option>
            <option value="merchant">Merchant</option>
            <option value="credits">Credits</option>
            <option value="gateway">Gateway</option>
            <option value="sms">SMS</option>
            <option value="settings">Settings</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/70 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Timestamp</th>
                <th className="px-5 py-3.5">Admin Email</th>
                <th className="px-5 py-3.5">Action &amp; Target</th>
                <th className="px-5 py-3.5">Description</th>
                <th className="px-5 py-3.5 text-right">Client IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-slate-400">
                    No audit records matching criteria.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-5 py-3.5 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                      {log.timestamp}
                    </td>

                    <td className="px-5 py-3.5 whitespace-nowrap font-semibold text-white">
                      {log.adminEmail}
                    </td>

                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getTargetBadge(log.targetType)}
                        <span className="font-mono text-xs font-bold text-amber-300">
                          {log.action}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                        Target: {log.targetId}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-slate-200">
                      {log.description}
                    </td>

                    <td className="px-5 py-3.5 text-right whitespace-nowrap font-mono text-slate-400 text-[11px]">
                      {log.ipAddress}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminAuditLogs;
