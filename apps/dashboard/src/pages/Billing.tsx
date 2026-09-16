/**
 * DenaNeya v2.0 - Credits & Billing Engine
 * File: apps/dashboard/src/pages/Billing.tsx
 *
 * Implements:
 * - 50 Starter Credits display banner
 * - Live credits balance counter with 30-day rolling expiration notice
 * - Transaction usage history log (-1 credit per verified transaction)
 * - Top-Up Packages purchase modal (Starter 500, Growth 2,500, Enterprise 10,000)
 */

import React, { useState } from 'react';
import {
  Coins,
  Zap,
  Clock,
  ArrowDownRight,
  PlusCircle,
  CreditCard,
  ShieldCheck,
  Check,
  AlertTriangle
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { useAuth } from '../context/AuthContext';
import { CreditTransaction } from '../types/dashboard';

export const Billing: React.FC = () => {
  const { user } = useAuth();
  const [isTopupModalOpen, setIsTopupModalOpen] = useState<boolean>(false);
  const [selectedTier, setSelectedTier] = useState<'starter' | 'growth' | 'enterprise'>('growth');

  const [history, setHistory] = useState<CreditTransaction[]>([
    {
      id: 'ctx_01',
      user_id: 'usr_01',
      delta: 50,
      balance_after: 50,
      type: 'bonus',
      description: 'DenaNeya v2.0 Merchant Onboarding Bonus (50 Free Credits)',
      created_at: '2026-03-01T10:00:00Z'
    },
    {
      id: 'ctx_02',
      user_id: 'usr_01',
      invoice_id: 'INV_77192',
      trx_id: '9N7102948A',
      delta: -1,
      balance_after: 49,
      type: 'usage',
      description: 'Verified bKash payment for Invoice INV_77192 (৳1,500.00)',
      created_at: '2026-03-02T14:22:10Z'
    },
    {
      id: 'ctx_03',
      user_id: 'usr_01',
      invoice_id: 'INV_77198',
      trx_id: 'BL98129033',
      delta: -1,
      balance_after: 48,
      type: 'usage',
      description: 'Verified Nagad payment for Invoice INV_77198 (৳3,200.00)',
      created_at: '2026-03-03T18:45:00Z'
    }
  ]);

  const currentBalance = user?.credits ?? 48;

  const handlePurchase = (tier: 'starter' | 'growth' | 'enterprise') => {
    setSelectedTier(tier);
    setIsTopupModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Credits Balance & Automated Billing
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Transparent consumption model: Exactly 1 credit deducted per verified customer transaction
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={() => setIsTopupModalOpen(true)}
          leftIcon={<PlusCircle className="w-4 h-4" />}
        >
          Purchase Credit Top-Up
        </Button>
      </div>

      {/* 50 Starter Credits Allocation Notice */}
      <div className="p-4 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-transparent border border-indigo-200 rounded-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-900 block">
              50 Free Starter Credits Active
            </span>
            <span className="text-xs text-slate-600">
              Allocated upon brand registration. Use them to test automated MFS verification.
            </span>
          </div>
        </div>
        <Badge variant="success" size="md">
          Starter Tier
        </Badge>
      </div>

      {/* Balance Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-emerald-500">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Available Credit Balance
          </span>
          <div className="mt-2 text-3xl font-black text-slate-900">
            {currentBalance} Credits
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Sufficient for {currentBalance} more verified transactions.
          </p>
        </Card>

        <Card className="border-l-4 border-l-indigo-500">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Pricing Unit Cost
          </span>
          <div className="mt-2 text-3xl font-black text-indigo-600">
            ৳1.00 / Trx
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Zero percent gateway fees. You keep 100% of collected revenue.
          </p>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Expiration Policy
          </span>
          <div className="mt-2 text-base font-bold text-slate-900 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-500" />
            <span>30-Day Rolling Window</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Purchasing any top-up resets all unused credit expiration dates.
          </p>
        </Card>
      </div>

      {/* Top-Up Packages Section */}
      <div>
        <h3 className="text-base font-bold text-slate-900 mb-3">Top-Up Packages</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Tier 1: Starter */}
          <Card className="hover:border-indigo-300 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-900">Starter Pack</h4>
                <Badge variant="neutral">Starter</Badge>
              </div>
              <div className="mt-3 text-2xl font-black text-slate-900">
                ৳500 <span className="text-xs text-slate-400 font-normal">/ 500 Credits</span>
              </div>
              <ul className="mt-4 space-y-2 text-xs text-slate-600">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>500 Verified Transactions</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Full 52+ Gateway Catalog</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>30-Day Validity</span>
                </li>
              </ul>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-5"
              onClick={() => handlePurchase('starter')}
            >
              Choose Starter
            </Button>
          </Card>

          {/* Tier 2: Growth (Recommended) */}
          <Card className="border-2 border-indigo-600 shadow-md relative flex flex-col justify-between">
            <div className="absolute -top-3 right-4 bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
              Most Popular (10% Bonus)
            </div>
            <div>
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-900">Growth Pack</h4>
                <Badge variant="info">Popular</Badge>
              </div>
              <div className="mt-3 text-2xl font-black text-slate-900">
                ৳2,250 <span className="text-xs text-slate-400 font-normal">/ 2,500 Credits</span>
              </div>
              <div className="text-[11px] text-emerald-600 font-bold mt-0.5">
                Save ৳250 (৳0.90 per transaction)
              </div>
              <ul className="mt-4 space-y-2 text-xs text-slate-600">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>2,500 Verified Transactions</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Priority SMS Synchronization</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>60-Day Extended Validity</span>
                </li>
              </ul>
            </div>
            <Button
              variant="primary"
              size="sm"
              className="w-full mt-5"
              onClick={() => handlePurchase('growth')}
            >
              Choose Growth
            </Button>
          </Card>

          {/* Tier 3: Enterprise */}
          <Card className="hover:border-indigo-300 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-900">Enterprise High-Volume</h4>
                <Badge variant="success">20% Bonus</Badge>
              </div>
              <div className="mt-3 text-2xl font-black text-slate-900">
                ৳8,000 <span className="text-xs text-slate-400 font-normal">/ 10,000 Credits</span>
              </div>
              <div className="text-[11px] text-emerald-600 font-bold mt-0.5">
                Save ৳2,000 (৳0.80 per transaction)
              </div>
              <ul className="mt-4 space-y-2 text-xs text-slate-600">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>10,000 Verified Transactions</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Unlimited Handset Pairings</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Dedicated Telegram Support</span>
                </li>
              </ul>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-5"
              onClick={() => handlePurchase('enterprise')}
            >
              Choose Enterprise
            </Button>
          </Card>
        </div>
      </div>

      {/* Transaction Usage History Table */}
      <Card
        title="Credit Usage & Ledger"
        subtitle="Itemized record of credit deductions per verified payment"
      >
        <div className="overflow-x-auto -mx-6 -mb-6">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-y border-slate-100 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3">Timestamp</th>
                <th className="px-6 py-3">Activity Description</th>
                <th className="px-6 py-3">Reference / TrxID</th>
                <th className="px-6 py-3">Change</th>
                <th className="px-6 py-3">Balance After</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {history.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-3 text-slate-400">
                    {new Date(tx.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-3 text-slate-800">{tx.description}</td>
                  <td className="px-6 py-3 font-mono text-[11px] text-slate-600">
                    {tx.trx_id ? `${tx.invoice_id} • ${tx.trx_id}` : 'Platform Action'}
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className={`font-bold ${
                        tx.delta > 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {tx.delta > 0 ? `+${tx.delta}` : `${tx.delta}`}
                    </span>
                  </td>
                  <td className="px-6 py-3 font-bold text-slate-900">
                    {tx.balance_after} Credits
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Top-up Checkout Modal */}
      <Modal
        isOpen={isTopupModalOpen}
        onClose={() => setIsTopupModalOpen(false)}
        title="Purchase Credit Top-Up"
        subtitle="Pay instantly via bKash, Nagad, or Bank Transfer to top up your balance"
        maxWidth="sm"
      >
        <div className="space-y-4 py-2 text-center">
          <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-900">
            <div className="text-xs uppercase font-bold tracking-wider text-indigo-600">
              Selected Package
            </div>
            <div className="text-2xl font-black mt-1">
              {selectedTier === 'starter'
                ? '500 Credits (৳500)'
                : selectedTier === 'growth'
                ? '2,500 Credits (৳2,250)'
                : '10,000 Credits (৳8,000)'}
            </div>
          </div>

          <p className="text-xs text-slate-500 text-left">
            Upon clicking &quot;Proceed to Checkout&quot;, you will be redirected to the secure DenaNeya Hosted Checkout session to complete your payment with instant balance crediting.
          </p>

          <div className="pt-2 flex gap-3">
            <Button
              variant="outline"
              size="sm"
              className="w-1/2"
              onClick={() => setIsTopupModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="w-1/2"
              onClick={() => {
                alert('Redirecting to DenaNeya Hosted Checkout...');
                setIsTopupModalOpen(false);
              }}
            >
              Proceed to Pay
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Billing;
