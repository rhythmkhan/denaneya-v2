/**
 * DenaNeya v2.0 - Refer & Earn (Affiliate Program)
 * File: apps/dashboard/src/pages/ReferEarn.tsx
 *
 * Implements:
 * - Merchant affiliate referral link generator
 * - 10% lifetime commission tracker on referred merchant top-ups
 * - bKash / Nagad payout withdrawal request form
 * - Payout request history ledger
 */

import React, { useState } from 'react';
import {
  Gift,
  Copy,
  Check,
  Users,
  TrendingUp,
  Wallet,
  ArrowDownToLine,
  ExternalLink,
  DollarSign
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { useAuth } from '../context/AuthContext';
import { AffiliateStats, PayoutRequest } from '../types/dashboard';

export const ReferEarn: React.FC = () => {
  const { user } = useAuth();
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState<boolean>(false);

  const stats: AffiliateStats = {
    referral_code: 'REF88219',
    referral_url: `${window.location.origin}/register?ref=REF88219`,
    commission_rate: 10,
    total_referred_merchants: 14,
    total_earned_bdt: 12500,
    available_payout_bdt: 4200,
    total_withdrawn_bdt: 8300
  };

  const [payouts, setPayouts] = useState<PayoutRequest[]>([
    {
      id: 'po_01',
      user_id: 'usr_01',
      amount: 5000,
      mfs_provider: 'bkash',
      mfs_account_number: '01712345678',
      status: 'PAID',
      requested_at: '2026-02-10T11:00:00Z',
      processed_at: '2026-02-10T14:30:00Z'
    },
    {
      id: 'po_02',
      user_id: 'usr_01',
      amount: 3300,
      mfs_provider: 'nagad',
      mfs_account_number: '01898765432',
      status: 'PAID',
      requested_at: '2026-02-28T09:15:00Z',
      processed_at: '2026-02-28T10:00:00Z'
    }
  ]);

  // Form State
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [mfsProvider, setMfsProvider] = useState<'bkash' | 'nagad'>('bkash');
  const [mfsNumber, setMfsNumber] = useState<string>('');
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(stats.referral_url);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleWithdrawSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError(null);

    const amt = parseFloat(withdrawAmount);
    if (isNaN(amt) || amt < 500) {
      setWithdrawError('Minimum withdrawal amount is ৳500.00.');
      return;
    }

    if (amt > stats.available_payout_bdt) {
      setWithdrawError('Requested amount exceeds available balance.');
      return;
    }

    if (!/^01[3-9]\d{8}$/.test(mfsNumber.trim())) {
      setWithdrawError('Enter a valid 11-digit Bangladeshi mobile number.');
      return;
    }

    const newPayout: PayoutRequest = {
      id: `po_${Date.now().toString(36)}`,
      user_id: 'usr_01',
      amount: amt,
      mfs_provider: mfsProvider,
      mfs_account_number: mfsNumber.trim(),
      status: 'PENDING',
      requested_at: new Date().toISOString()
    };

    setPayouts([newPayout, ...payouts]);
    setIsWithdrawModalOpen(false);
    setWithdrawAmount('');
    setMfsNumber('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Refer & Earn Affiliate Hub
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Earn a recurring 10% cash commission on every credit top-up purchased by merchants you invite
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={() => setIsWithdrawModalOpen(true)}
          leftIcon={<ArrowDownToLine className="w-4 h-4" />}
        >
          Withdraw Earnings (৳{stats.available_payout_bdt.toLocaleString()})
        </Button>
      </div>

      {/* Referral Link Box */}
      <Card className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white border-0 shadow-lg">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider">
              Your Unique Referral Link
            </span>
            <h3 className="text-xl font-black mt-1">
              Invite Merchants & Earn 10% Lifetime Commission
            </h3>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              Whenever a merchant signs up via your link and purchases credit packs (৳500 to ৳8,000), 10% is immediately credited to your affiliate wallet in cash.
            </p>
          </div>

          <div className="w-full md:w-auto shrink-0">
            <div className="flex items-center gap-2 p-1.5 bg-slate-800/80 rounded-xl border border-slate-700 max-w-md">
              <span className="px-3 py-1 text-xs font-mono text-indigo-300 truncate">
                {stats.referral_url}
              </span>
              <Button
                variant="primary"
                size="sm"
                onClick={handleCopyLink}
                leftIcon={isCopied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
              >
                {isCopied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-indigo-600">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Referred Merchants
          </span>
          <div className="mt-2 text-2xl font-black text-slate-900">
            {stats.total_referred_merchants} Businesses
          </div>
          <p className="text-xs text-emerald-600 mt-1 font-medium">
            Active and verified accounts
          </p>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Total Commission Earned
          </span>
          <div className="mt-2 text-2xl font-black text-slate-900">
            ৳{stats.total_earned_bdt.toLocaleString()}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            10% net top-up commission
          </p>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Available for Payout
          </span>
          <div className="mt-2 text-2xl font-black text-amber-600">
            ৳{stats.available_payout_bdt.toLocaleString()}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Ready for instant bKash withdrawal
          </p>
        </Card>

        <Card className="border-l-4 border-l-slate-700">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Total Withdrawn to Date
          </span>
          <div className="mt-2 text-2xl font-black text-slate-900">
            ৳{stats.total_withdrawn_bdt.toLocaleString()}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Successfully disbursed to personal MFS
          </p>
        </Card>
      </div>

      {/* Payout History Table */}
      <Card
        title="Payout Withdrawal Ledger"
        subtitle="Record of all cash withdrawal requests to bKash and Nagad personal accounts"
      >
        <div className="overflow-x-auto -mx-6 -mb-6">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-y border-slate-100 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3">Reference</th>
                <th className="px-6 py-3">Disbursement MFS</th>
                <th className="px-6 py-3">Amount (BDT)</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Requested Time</th>
                <th className="px-6 py-3">Processed Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {payouts.map((po) => (
                <tr key={po.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-3 font-mono font-bold text-slate-900">{po.id}</td>
                  <td className="px-6 py-3">
                    <div className="font-semibold capitalize text-slate-800">
                      {po.mfs_provider} Personal
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {po.mfs_account_number}
                    </div>
                  </td>
                  <td className="px-6 py-3 font-black text-slate-900">
                    ৳{po.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-3">
                    <Badge variant={po.status === 'PAID' ? 'success' : 'warning'}>
                      {po.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-3 text-slate-500">
                    {new Date(po.requested_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-3 text-slate-500">
                    {po.processed_at ? new Date(po.processed_at).toLocaleDateString() : 'Pending'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Withdrawal Modal */}
      <Modal
        isOpen={isWithdrawModalOpen}
        onClose={() => setIsWithdrawModalOpen(false)}
        title="Request Affiliate Payout"
        subtitle="Withdraw your earned commission directly to your personal bKash or Nagad wallet"
        maxWidth="sm"
      >
        <form onSubmit={handleWithdrawSubmit} className="space-y-4">
          {withdrawError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
              {withdrawError}
            </div>
          )}

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs flex items-center justify-between">
            <span className="text-slate-500">Available Balance:</span>
            <span className="font-bold text-slate-900">
              ৳{stats.available_payout_bdt.toLocaleString()}
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Payout Wallet *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMfsProvider('bkash')}
                className={`p-2.5 rounded-lg border text-xs font-bold transition-all ${
                  mfsProvider === 'bkash'
                    ? 'border-[#D12053] bg-pink-50 text-[#D12053]'
                    : 'border-slate-200 text-slate-700'
                }`}
              >
                bKash Personal
              </button>
              <button
                type="button"
                onClick={() => setMfsProvider('nagad')}
                className={`p-2.5 rounded-lg border text-xs font-bold transition-all ${
                  mfsProvider === 'nagad'
                    ? 'border-[#F7941D] bg-orange-50 text-[#F7941D]'
                    : 'border-slate-200 text-slate-700'
                }`}
              >
                Nagad Personal
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Personal Mobile Account Number *
            </label>
            <input
              type="text"
              required
              placeholder="017XXXXXXXX"
              value={mfsNumber}
              onChange={(e) => setMfsNumber(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Withdrawal Amount (BDT, min ৳500) *
            </label>
            <input
              type="number"
              step="1"
              min={500}
              max={stats.available_payout_bdt}
              required
              placeholder="1000"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsWithdrawModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Submit Withdrawal Request
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ReferEarn;
