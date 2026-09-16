'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useLanguage } from './LanguageContext';
import { 
  ShieldCheck, 
  Layers, 
  CreditCard, 
  Code2, 
  Calculator, 
  Menu, 
  X, 
  ArrowRight, 
  Globe,
  Sparkles
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { language, toggleLanguage, t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const dashboardUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL || 'https://dashboard-tawny-gamma-28.vercel.app';

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-200 group-hover:scale-105 transition-transform">
            <span className="font-black text-lg tracking-tight">দন</span>
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-xl leading-none text-slate-900 tracking-tight flex items-center gap-1.5">
              DenaNeya <span className="text-xs px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold border border-indigo-100">v2.0</span>
            </span>
            <span className="text-[11px] font-medium text-slate-500 tracking-wide mt-0.5">
              {language === 'bn' ? 'স্বয়ংক্রিয় পেমেন্ট প্ল্যাটফর্ম' : 'Payment Automation Engine'}
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-semibold text-slate-600">
          <Link href="/#features" className="hover:text-indigo-600 transition-colors flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-slate-400" />
            {t.nav.features}
          </Link>
          <Link href="/#channels" className="hover:text-indigo-600 transition-colors flex items-center gap-1.5">
            <CreditCard className="w-4 h-4 text-slate-400" />
            {t.nav.channels}
          </Link>
          <Link href="/pricing" className="hover:text-indigo-600 transition-colors flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-slate-400" />
            {t.nav.pricing}
          </Link>
          <Link href="/pricing#calculator" className="hover:text-indigo-600 transition-colors flex items-center gap-1.5">
            <Calculator className="w-4 h-4 text-slate-400" />
            {t.nav.calculator}
          </Link>
          <Link href="/docs" className="hover:text-indigo-600 transition-colors flex items-center gap-1.5">
            <Code2 className="w-4 h-4 text-slate-400" />
            {t.nav.docs}
          </Link>
        </nav>

        {/* Right Actions: Language Switcher + Dashboard CTA */}
        <div className="hidden md:flex items-center gap-3">
          {/* Language Toggle */}
          <button
            onClick={toggleLanguage}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 transition shadow-sm"
            title="Toggle English / Bengali"
          >
            <Globe className="w-3.5 h-3.5 text-indigo-600" />
            <span>{language === 'bn' ? 'বাংলা (BN)' : 'English (EN)'}</span>
          </button>

          {/* Sign In Link */}
          <a
            href={`${dashboardUrl}/login`}
            className="px-4 py-2 text-xs font-bold text-slate-700 hover:text-indigo-600 transition"
          >
            {t.nav.signIn}
          </a>

          {/* Launch Dashboard Button */}
          <a
            href={dashboardUrl}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 shadow-md shadow-indigo-200 transition"
          >
            <span>{t.nav.merchantPortal}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={toggleLanguage}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50"
          >
            {language === 'bn' ? 'BN' : 'EN'}
          </button>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white px-4 pt-3 pb-6 space-y-3">
          <Link
            href="/#features"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-sm font-semibold text-slate-700 hover:text-indigo-600"
          >
            {t.nav.features}
          </Link>
          <Link
            href="/#channels"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-sm font-semibold text-slate-700 hover:text-indigo-600"
          >
            {t.nav.channels}
          </Link>
          <Link
            href="/pricing"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-sm font-semibold text-slate-700 hover:text-indigo-600"
          >
            {t.nav.pricing}
          </Link>
          <Link
            href="/pricing#calculator"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-sm font-semibold text-slate-700 hover:text-indigo-600"
          >
            {t.nav.calculator}
          </Link>
          <Link
            href="/docs"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-sm font-semibold text-slate-700 hover:text-indigo-600"
          >
            {t.nav.docs}
          </Link>
          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
            <a
              href={`${dashboardUrl}/login`}
              className="w-full text-center py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700"
            >
              {t.nav.signIn}
            </a>
            <a
              href={dashboardUrl}
              className="w-full text-center py-2.5 rounded-xl bg-indigo-600 text-xs font-bold text-white shadow-md"
            >
              {t.nav.merchantPortal}
            </a>
          </div>
        </div>
      )}
    </header>
  );
};
