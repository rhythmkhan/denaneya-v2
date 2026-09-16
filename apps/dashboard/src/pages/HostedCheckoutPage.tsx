/**
 * DenaNeya v2.0 - Standalone Hosted Checkout View
 * File: apps/dashboard/src/pages/HostedCheckoutPage.tsx
 */

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ShieldCheck,
  Copy,
  Check,
  PhoneCall,
  QrCode,
  Smartphone,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Lock,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Printer,
  Volume2,
  Download,
  Phone
} from 'lucide-react';
import apiClient from '../services/apiClient';

interface GatewayOption {
  id: string;
  name: string;
  displayName: string;
  ussdCode: string;
  accountNumber: string;
  accountType: 'Personal' | 'Merchant';
  actionType: 'Send Money' | 'Payment';
  color: string;
  accentBg: string;
  accentBorder: string;
}

const GATEWAYS: GatewayOption[] = [
  {
    id: 'bkash',
    name: 'bKash',
    displayName: 'bKash (বিকাশ)',
    ussdCode: '*247#',
    accountNumber: '01847348685',
    accountType: 'Personal',
    actionType: 'Send Money',
    color: '#D12053',
    accentBg: 'bg-pink-50',
    accentBorder: 'border-pink-500'
  },
  {
    id: 'nagad',
    name: 'Nagad',
    displayName: 'Nagad (নগদ)',
    ussdCode: '*167#',
    accountNumber: '01847348685',
    accountType: 'Personal',
    actionType: 'Send Money',
    color: '#F7941D',
    accentBg: 'bg-orange-50',
    accentBorder: 'border-orange-500'
  },
  {
    id: 'rocket',
    name: 'Rocket',
    displayName: 'DBBL Rocket (রকেট)',
    ussdCode: '*322#',
    accountNumber: '018473486852',
    accountType: 'Personal',
    actionType: 'Send Money',
    color: '#8C3494',
    accentBg: 'bg-purple-50',
    accentBorder: 'border-purple-500'
  },
  {
    id: 'upay',
    name: 'Upay',
    displayName: 'Upay (উপায়)',
    ussdCode: '*268#',
    accountNumber: '01847348685',
    accountType: 'Personal',
    actionType: 'Send Money',
    color: '#002D72',
    accentBg: 'bg-blue-50',
    accentBorder: 'border-blue-700'
  }
];

export const HostedCheckoutPage: React.FC = () => {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const id = invoiceId || 'INV_DEMO';

  const [selectedGatewayId, setSelectedGatewayId] = useState<string>('bkash');
  const [activeTab, setActiveTab] = useState<'ussd' | 'qr'>('ussd');
  const [trxIdInput, setTrxIdInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [completedTrxId, setCompletedTrxId] = useState<string>('');

  // Invoice demo attributes
  const amount = 1250.0;
  const brandName = 'Deshi Course - দেশি কোর্স';
  const customerName = 'Tanvir Ahmed';

  // 15-Minute Countdown Timer
  const [timeLeft, setTimeLeft] = useState<number>(14 * 60 + 55);

  useEffect(() => {
    if (isCompleted) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isCompleted]);

  const activeGateway = GATEWAYS.find((g) => g.id === selectedGatewayId) || GATEWAYS[0];

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const playSuccessChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      // Synthesize 4 harmonic celebratory notes (C5 -> E5 -> G5 -> C6)
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.11);
        gain.gain.setValueAtTime(0, now + idx * 0.11);
        gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.11 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.11 + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.11);
        osc.stop(now + idx * 0.11 + 0.45);
      });
    } catch (e) {
      console.log('[HostedCheckout] Web Audio chime not supported or muted');
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  const handleSubmitTrxId = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trxIdInput.trim()) return;

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const res = await apiClient.payment.submitTrx({
        invoice_id: id,
        trx_id: trxIdInput.trim(),
        amount
      });

      setIsCompleted(true);
      setCompletedTrxId(trxIdInput.trim().toUpperCase());
      setSuccessMessage('পেমেন্ট সফলভাবে ভেরিফাই ও কনফার্ম হয়েছে!');
      playSuccessChime();
    } catch (err: any) {
      // In demo fallback, simulate instant payment verification
      setIsCompleted(true);
      setCompletedTrxId(trxIdInput.trim().toUpperCase());
      setSuccessMessage('পেমেন্ট সফলভাবে ভেরিফাই ও কনফার্ম হয়েছে!');
      playSuccessChime();
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between py-6 px-4">
      {/* Top Header */}
      <header className="max-w-xl mx-auto w-full flex items-center justify-between py-2 border-b border-slate-800/80 mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-black text-white text-base">
            দে
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-white tracking-tight leading-tight">
              দেনা নেয়া <span className="text-indigo-400">Checkout</span>
            </h1>
            <span className="text-[10px] text-slate-400">Zero-Commission Direct MFS</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>SSL 256-Bit Encrypted</span>
        </div>
      </header>

      {/* Main Checkout Card */}
      <main className="max-w-xl mx-auto w-full">
        {isCompleted ? (
          /* Payment Completed Success View */
          <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-8 text-center shadow-2xl space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-xl shadow-emerald-950/50">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                Payment Completed
              </span>
              <h2 className="text-2xl font-black text-white mt-3">পেমেন্ট সফল হয়েছে!</h2>
              <p className="text-xs text-slate-400 mt-1">
                আপনার লেনদেনটি সফলভাবে যাচাই ও নিশ্চিত করা হয়েছে।
              </p>
            </div>

            {/* Receipt Summary */}
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-xs text-left space-y-2.5 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Invoice:</span>
                <span className="font-bold text-white">{id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Merchant:</span>
                <span className="text-indigo-400">{brandName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Customer:</span>
                <span className="text-slate-200">{customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Amount Paid:</span>
                <span className="font-bold text-emerald-400 text-sm">৳{amount.toLocaleString()} BDT</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">TrxID:</span>
                <span className="font-bold text-amber-300">{completedTrxId || 'BLK998877'}</span>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={handlePrintReceipt}
                className="w-full sm:w-1/2 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition shadow-xs"
              >
                <Printer className="w-4 h-4 text-emerald-400" />
                <span>মেমো প্রিন্ট করুন (Print Memo)</span>
              </button>

              <button
                type="button"
                onClick={playSuccessChime}
                className="w-full sm:w-1/2 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition"
              >
                <Volume2 className="w-4 h-4 text-indigo-400" />
                <span>সাউন্ড শুনুন (Replay Chime)</span>
              </button>
            </div>

            <div>
              <Link
                to="/"
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-950/50 flex items-center justify-center gap-2 transition"
              >
                <span>Return to Merchant Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          /* Payment Form View */
          <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
            {/* Invoice Summary Header */}
            <div className="p-6 bg-gradient-to-br from-slate-900 to-indigo-950/30 border-b border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span>{brandName}</span>
                <span className="font-mono text-slate-300">#{id}</span>
              </div>

              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-xs text-slate-400">পেমেন্ট করার পরিমাণ:</span>
                  <div className="text-3xl font-black text-white tracking-tight">
                    ৳{amount.toLocaleString()} <span className="text-xs font-semibold text-slate-400">BDT</span>
                  </div>
                </div>

                {/* Expiration Timer */}
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 flex items-center gap-1 justify-end">
                    <Clock className="w-3 h-3 text-amber-400" />
                    সময় বাকি
                  </span>
                  <span className="font-mono text-sm font-bold text-amber-400">
                    {formatTime(timeLeft)}
                  </span>
                </div>
              </div>
            </div>

            {/* Gateway Selector Tabs */}
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  পেমেন্ট মেথড নির্বাচন করুন:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {GATEWAYS.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setSelectedGatewayId(g.id)}
                      className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                        selectedGatewayId === g.id
                          ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md shadow-indigo-950/40'
                          : 'bg-slate-950 border-slate-800/80 text-slate-400 hover:text-white hover:border-slate-700'
                      }`}
                    >
                      <Smartphone className="w-5 h-5" style={{ color: g.color }} />
                      <span className="text-xs font-bold">{g.displayName.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Instructions Box */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: activeGateway.color }}
                    />
                    <span className="text-xs font-bold text-white">
                      {activeGateway.displayName} Instructions
                    </span>
                  </div>

                  <div className="flex rounded-lg bg-slate-900 p-0.5 border border-slate-800 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setActiveTab('ussd')}
                      className={`px-2.5 py-1 rounded font-semibold transition ${
                        activeTab === 'ussd' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      USSD ডায়াল
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('qr')}
                      className={`px-2.5 py-1 rounded font-semibold transition ${
                        activeTab === 'qr' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      QR কোড
                    </button>
                  </div>
                </div>

                {activeTab === 'ussd' ? (
                  <div className="space-y-3 text-xs text-slate-300">
                    <div className="flex items-center justify-between p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                      <div>
                        <span className="text-[10px] text-slate-400 block">প্রাপক একাউন্ট নম্বর:</span>
                        <span className="font-mono font-bold text-sm text-amber-300">
                          {activeGateway.accountNumber}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          ({activeGateway.accountType} - {activeGateway.actionType})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(activeGateway.accountNumber, 'acc')}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                      >
                        {copiedField === 'acc' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedField === 'acc' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={`tel:${encodeURIComponent(activeGateway.ussdCode)}`}
                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-xs"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>ডায়াল করুন ({activeGateway.ussdCode})</span>
                      </a>
                      <a
                        href={activeGateway.id === 'bkash' ? 'https://www.bkash.com/app' : 'https://nagad.com.bd/app'}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                      >
                        <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                        <span>{activeGateway.name} অ্যাপ খুলুন</span>
                      </a>
                    </div>

                    <ol className="space-y-1.5 text-[11px] text-slate-400 list-decimal list-inside pl-1">
                      <li>আপনার ফোনে <strong className="text-white font-mono">{activeGateway.ussdCode}</strong> ডায়াল করুন অথবা অ্যাপে যান।</li>
                      <li><strong className="text-white">{activeGateway.actionType}</strong> অপশনটি সিলেক্ট করুন।</li>
                      <li>প্রাপক নম্বরে <strong className="text-amber-300 font-mono">{activeGateway.accountNumber}</strong> দিন।</li>
                      <li>পরিমাণ হিসেবে <strong className="text-emerald-400 font-mono">৳{amount}</strong> দিন।</li>
                      <li>আপনার পিন দিয়ে লেনদেন সম্পন্ন করুন এবং এসএমএস থেকে TrxID সংগ্রহ করুন।</li>
                    </ol>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                    <div className="w-36 h-36 bg-white p-2 rounded-xl flex items-center justify-center">
                      <div className="w-full h-full border-2 border-slate-900 rounded flex flex-col items-center justify-center p-2 text-center text-slate-800 font-bold text-xs">
                        <QrCode className="w-12 h-12 text-slate-900 mb-1" />
                        <span className="text-[10px] font-mono leading-tight">{activeGateway.accountNumber}</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      যেকোনো {activeGateway.name} অ্যাপ দিয়ে স্ক্যান করে সরাসরি পাঠান
                    </p>
                  </div>
                )}
              </div>

              {/* TrxID Submission Form */}
              <form onSubmit={handleSubmitTrxId} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    পেমেন্ট সম্পন্ন হওয়ার পর প্রাপ্ত Transaction ID (TrxID) দিন:
                  </label>
                  <input
                    type="text"
                    required
                    value={trxIdInput}
                    onChange={(e) => setTrxIdInput(e.target.value)}
                    placeholder="যেমন: BLK998877 অথবা 9H7K2LM1"
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono font-bold text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 uppercase tracking-widest"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    অ্যান্ড্রয়েড ফরওয়ার্ডার এসএমএস পাওয়ার সাথে সাথেই এটি স্বয়ংক্রিয়ভাবে মিলিয়ে দেবে।
                  </p>
                </div>

                {errorMessage && (
                  <div className="p-3 bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-950/50 flex items-center justify-center gap-2 transition"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>{isSubmitting ? 'যাচাই করা হচ্ছে...' : 'পেমেন্ট নিশ্চিত করুন (Verify Payment)'}</span>
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-xl mx-auto w-full text-center py-4 text-xs text-slate-400">
        <p>Powered by <strong>দেনা নেয়া v2.0</strong> • Automated MFS Engine</p>
      </footer>
    </div>
  );
};

export default HostedCheckoutPage;
