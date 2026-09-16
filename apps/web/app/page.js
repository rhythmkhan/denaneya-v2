'use client';
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = HomePage;
const react_1 = __importDefault(require("react"));
const link_1 = __importDefault(require("next/link"));
const LanguageContext_1 = require("../components/LanguageContext");
const HeroSection_1 = require("../components/HeroSection");
const ValueProps_1 = require("../components/ValueProps");
const FeatureShowcase_1 = require("../components/FeatureShowcase");
const GatewayCatalogShowcase_1 = require("../components/GatewayCatalogShowcase");
const lucide_react_1 = require("lucide-react");
function HomePage() {
    const { t, language } = (0, LanguageContext_1.useLanguage)();
    const dashboardUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL || 'http://localhost:5173';
    return (<div className="flex flex-col min-h-screen">
      
      {/* 1. Hero Section */}
      <HeroSection_1.HeroSection />

      {/* 2. 4 Core Value Propositions */}
      <ValueProps_1.ValueProps />

      {/* 3. Deep-Dive Feature Showcase */}
      <FeatureShowcase_1.FeatureShowcase />

      {/* 4. 52+ Payment Channels Tabbed Showcase */}
      <GatewayCatalogShowcase_1.GatewayCatalogShowcase />

      {/* 5. Bottom Conversion Banner */}
      <section className="py-20 bg-gradient-to-tr from-indigo-900 via-indigo-800 to-purple-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none"/>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-indigo-200 text-xs font-bold border border-white/15 backdrop-blur">
            <lucide_react_1.Sparkles className="w-3.5 h-3.5 text-amber-400"/>
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
            <a href={`${dashboardUrl}/register`} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-white hover:bg-slate-100 active:scale-95 text-indigo-900 font-bold text-sm shadow-xl transition">
              <span>{t.common.getStarted}</span>
              <lucide_react_1.ArrowRight className="w-4 h-4 text-indigo-600"/>
            </a>

            <link_1.default href="/pay/demo_inv_1089" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-indigo-700/60 hover:bg-indigo-700 active:scale-95 text-white font-bold text-sm border border-indigo-500/50 shadow-sm transition">
              <lucide_react_1.Smartphone className="w-4 h-4 text-emerald-300"/>
              <span>{t.common.tryDemo}</span>
            </link_1.default>
          </div>

          <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-indigo-200">
            <span className="flex items-center gap-1.5">
              <lucide_react_1.CheckCircle2 className="w-4 h-4 text-emerald-400"/>
              No credit card required
            </span>
            <span className="flex items-center gap-1.5">
              <lucide_react_1.CheckCircle2 className="w-4 h-4 text-emerald-400"/>
              Instant SMS sync
            </span>
            <span className="flex items-center gap-1.5">
              <lucide_react_1.CheckCircle2 className="w-4 h-4 text-emerald-400"/>
              Cancel anytime
            </span>
          </div>

        </div>
      </section>

    </div>);
}
//# sourceMappingURL=page.js.map