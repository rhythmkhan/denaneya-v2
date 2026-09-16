'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from './LanguageContext';
import { 
  ArrowRight, 
  ShieldCheck, 
  Zap, 
  CheckCircle2, 
  Smartphone, 
  Sparkles,
  TrendingUp,
  Cpu
} from 'lucide-react';

export const HeroSection: React.FC = () => {
  const { t, language } = useLanguage();
  const dashboardUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL || 'https://dashboard-tawny-gamma-28.vercel.app';

  return (
    <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28 bg-gradient-to-b from-indigo-50/50 via-white to-slate-50/80">
      
      {/* Background Decorative Blur Orbs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-tr from-indigo-200/40 via-purple-200/30 to-pink-200/20 blur-3xl -z-10 pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Hero Copy & Actions */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            
            {/* Release Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200/60 shadow-sm text-xs font-bold text-indigo-700">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
              <span>{t.hero.badge}</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.15]">
              {t.hero.titleLine1}{' '}
              <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent underline decoration-indigo-300 decoration-wavy decoration-2">
                {t.hero.titleHighlight}
              </span>
              <br className="hidden sm:inline" />
              <span className="text-slate-800 text-2xl sm:text-4xl lg:text-5xl block mt-2 font-bold">
                {t.hero.titleLine2}
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto lg:mx-0">
              {t.hero.subtitle}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
              <a
                href={`${dashboardUrl}/register`}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-sm shadow-xl shadow-indigo-200 transition"
              >
                <span>{t.hero.ctaPrimary}</span>
                <ArrowRight className="w-4 h-4" />
              </a>

              <Link
                href="/docs"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-white hover:bg-slate-50 active:scale-95 text-slate-800 font-bold text-sm border border-slate-200 shadow-sm transition"
              >
                <Cpu className="w-4 h-4 text-indigo-600" />
                <span>{t.hero.ctaSecondary}</span>
              </Link>
            </div>

            {/* Trust Proof */}
            <p className="text-xs text-slate-500 flex items-center justify-center lg:justify-start gap-2 pt-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>{t.hero.trustText}</span>
            </p>

          </div>

          {/* Right Column: Interactive Phone Mockup with Live Reconciliation Simulation */}
          <div className="lg:col-span-5 relative">
            
            {/* Phone Container */}
            <div className="relative mx-auto max-w-sm rounded-[2.5rem] p-3 bg-slate-900 shadow-2xl ring-1 ring-slate-900/10 shadow-indigo-500/10">
              
              {/* Camera Notch */}
              <div className="absolute top-6 left-1/2 -translate-x-1/2 w-28 h-4 bg-slate-900 rounded-full z-20 flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-800"></div>
              </div>

              {/* Inner Screen */}
              <div className="relative rounded-[2rem] bg-slate-50 overflow-hidden p-5 border border-slate-200 space-y-4 pt-8">
                
                {/* Simulated App Header */}
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center">
                      DN
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Deshi Shop BD</h4>
                      <p className="text-[10px] text-slate-400">Invoice: #INV-2026-089</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                    Live Engine
                  </span>
                </div>

                {/* Amount Display */}
                <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl p-4 text-white text-center shadow-lg shadow-indigo-100">
                  <span className="text-[11px] text-indigo-200 block uppercase font-semibold">
                    {language === 'bn' ? 'মোট প্রদেয় টাকা' : 'Total Payable Amount'}
                  </span>
                  <span className="text-3xl font-extrabold tracking-tight mt-1 block">
                    ৳ 1,250.00
                  </span>
                  <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-[10px] font-medium backdrop-blur">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-ping"></span>
                    <span>15:00 Security Window</span>
                  </div>
                </div>

                {/* Gateway Pills */}
                <div className="grid grid-cols-4 gap-1.5">
                  <div className="p-2 rounded-xl bg-pink-50 border-2 border-pink-500 text-center">
                    <span className="block text-[11px] font-bold text-pink-700">bKash</span>
                    <span className="text-[8px] font-mono text-pink-500">*247#</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-slate-200 text-center opacity-70">
                    <span className="block text-[11px] font-bold text-orange-600">Nagad</span>
                    <span className="text-[8px] font-mono text-slate-400">*167#</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-slate-200 text-center opacity-70">
                    <span className="block text-[11px] font-bold text-purple-600">Rocket</span>
                    <span className="text-[8px] font-mono text-slate-400">*322#</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-slate-200 text-center opacity-70">
                    <span className="block text-[11px] font-bold text-blue-800">Upay</span>
                    <span className="text-[8px] font-mono text-slate-400">*268#</span>
                  </div>
                </div>

                {/* Live Floating Ingestion Notification */}
                <div className="rounded-xl p-3 bg-white border border-slate-200 shadow-lg space-y-2 animate-bounce-short">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-indigo-600 flex items-center gap-1">
                      <Zap className="w-3 h-3 text-indigo-600 fill-indigo-600" />
                      SIM Sync Detected (0.42s)
                    </span>
                    <span className="text-[9px] text-slate-400">Just Now</span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg font-mono text-[10px] text-slate-700 border border-slate-100">
                    Received Tk 1,250 from 01712****78. TrxID: <span className="font-bold text-emerald-600">75TD2K9J</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-emerald-600 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Reconciled via Atomic CAS
                    </span>
                    <span className="text-slate-400">Webhook Dispatched</span>
                  </div>
                </div>

                {/* Action button */}
                <div className="pt-1">
                  <div className="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-center font-bold text-xs shadow-md shadow-emerald-200 flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? 'পেমেন্ট সফলভাবে সম্পন্ন' : 'Payment Completed'}</span>
                  </div>
                </div>

              </div>

            </div>

            {/* Side Floating Badge */}
            <div className="absolute -bottom-6 -left-6 bg-white p-4 rounded-2xl shadow-xl border border-slate-200 hidden sm:flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-extrabold text-slate-900 block">৳0.00 Commission</span>
                <span className="text-[11px] text-slate-500">Save ~৳22,000 per ৳10L sales</span>
              </div>
            </div>

          </div>

        </div>

        {/* Live Metrics Showcase Bar */}
        <div className="mt-16 pt-10 border-t border-slate-200/80 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="p-4 rounded-2xl bg-white border border-slate-200/60 shadow-sm">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {t.hero.statProcessed}
            </span>
            <span className="block text-xs font-semibold text-slate-500 mt-1">
              {t.hero.statProcessedLabel}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/60 shadow-sm">
            <span className="text-2xl sm:text-3xl font-black text-emerald-600 tracking-tight">
              {t.hero.statUptime}
            </span>
            <span className="block text-xs font-semibold text-slate-500 mt-1">
              {t.hero.statUptimeLabel}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/60 shadow-sm">
            <span className="text-2xl sm:text-3xl font-black text-indigo-600 tracking-tight">
              {t.hero.statFee}
            </span>
            <span className="block text-xs font-semibold text-slate-500 mt-1">
              {t.hero.statFeeLabel}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/60 shadow-sm">
            <span className="text-2xl sm:text-3xl font-black text-purple-600 tracking-tight">
              {t.hero.statGateways}
            </span>
            <span className="block text-xs font-semibold text-slate-500 mt-1">
              {t.hero.statGatewaysLabel}
            </span>
          </div>
        </div>

      </div>
    </section>
  );
};
