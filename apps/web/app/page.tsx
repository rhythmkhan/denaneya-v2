'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '../components/LanguageContext';
import { HeroSection } from '../components/HeroSection';
import { ValueProps } from '../components/ValueProps';
import { FeatureShowcase } from '../components/FeatureShowcase';
import { GatewayCatalogShowcase } from '../components/GatewayCatalogShowcase';
import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles, Smartphone } from 'lucide-react';

export default function HomePage() {
  const { t, language } = useLanguage();
  const dashboardUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL || 'https://dashboard-tawny-gamma-28.vercel.app';

  return (
    <div className="flex flex-col min-h-screen">
      
      {/* 1. Hero Section */}
      <HeroSection />

      {/* 2. 4 Core Value Propositions */}
      <ValueProps />

      {/* 3. Deep-Dive Feature Showcase */}
      <FeatureShowcase />

      {/* 4. 52+ Payment Channels Tabbed Showcase */}
      <GatewayCatalogShowcase />

      {/* 5. Bottom Conversion Banner */}
      <section className="py-20 bg-gradient-to-tr from-indigo-900 via-indigo-800 to-purple-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-indigo-200 text-xs font-bold border border-white/15 backdrop-blur">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>500 Free Verification Credits on Sign-up</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            {language === 'bn' 
              ? 'আজই আপনার পেমেন্ট অটোমেশন শুরু করুন' 
              : 'Ready to Eliminate 2.5% Payment Gateway Deductions?'}
          </h2>

          <p className="text-base sm:text-lg text-indigo-200 max-w-2xl mx-auto leading-relaxed">
            {language === 'bn'
              ? 'মাত্র ৫ মিনিটে যেকোনো অ্যান্ড্রয়েড সিম কানেক্ট করুন এবং সরাসরি আপনার ওয়ালেটে কাস্টমারদের টাকা রিসিভ করুন।'
              : 'Deploy DenaNeya v2.0 in 5 minutes. Connect your Android SIM and start receiving direct MFS payments with zero middleman deductions.'}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <a
              href={`${dashboardUrl}/register`}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-white hover:bg-slate-100 active:scale-95 text-indigo-900 font-bold text-sm shadow-xl transition"
            >
              <span>{t.common.getStarted}</span>
              <ArrowRight className="w-4 h-4 text-indigo-600" />
            </a>

            <Link
              href="/pay/demo_inv_1089"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-indigo-700/60 hover:bg-indigo-700 active:scale-95 text-white font-bold text-sm border border-indigo-500/50 shadow-sm transition"
            >
              <Smartphone className="w-4 h-4 text-emerald-300" />
              <span>{t.common.tryDemo}</span>
            </Link>
          </div>

          <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-indigo-200">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              No credit card required
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Instant SMS sync
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Cancel anytime
            </span>
          </div>

        </div>
      </section>

    </div>
  );
}
