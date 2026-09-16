'use client';
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PricingPage;
const react_1 = __importDefault(require("react"));
const LanguageContext_1 = require("../../components/LanguageContext");
const CreditCalculator_1 = require("../../components/CreditCalculator");
const lucide_react_1 = require("lucide-react");
function PricingPage() {
    const { t, language } = (0, LanguageContext_1.useLanguage)();
    const dashboardUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL || 'http://localhost:5173';
    const plans = [
        {
            name: t.pricing.starterName,
            price: t.pricing.starterPrice,
            desc: t.pricing.starterDesc,
            rate: t.pricing.starterRate,
            rateSub: t.pricing.perVerif,
            badge: null,
            isPopular: false,
            features: [
                t.pricing.starterFeature1,
                t.pricing.starterFeature2,
                t.pricing.starterFeature3,
                t.pricing.starterFeature4,
                t.pricing.starterFeature5
            ],
            ctaText: t.pricing.freeForever,
            ctaLink: `${dashboardUrl}/register?plan=starter`,
            borderClass: 'border-slate-200 bg-white'
        },
        {
            name: t.pricing.growthName,
            price: t.pricing.growthPrice,
            desc: t.pricing.growthDesc,
            rate: t.pricing.growthRate,
            rateSub: t.pricing.perVerif,
            badge: t.pricing.growthBadge,
            isPopular: true,
            features: [
                t.pricing.growthFeature1,
                t.pricing.growthFeature2,
                t.pricing.growthFeature3,
                t.pricing.growthFeature4,
                t.pricing.growthFeature5,
                t.pricing.growthFeature6
            ],
            ctaText: t.pricing.choosePlan,
            ctaLink: `${dashboardUrl}/register?plan=growth`,
            borderClass: 'border-indigo-500 bg-white shadow-xl shadow-indigo-100 ring-2 ring-indigo-500/20'
        },
        {
            name: t.pricing.enterpriseName,
            price: t.pricing.enterprisePrice,
            desc: t.pricing.enterpriseDesc,
            rate: t.pricing.enterpriseRate,
            rateSub: t.pricing.perVerif,
            badge: null,
            isPopular: false,
            features: [
                t.pricing.enterpriseFeature1,
                t.pricing.enterpriseFeature2,
                t.pricing.enterpriseFeature3,
                t.pricing.enterpriseFeature4,
                t.pricing.enterpriseFeature5,
                t.pricing.enterpriseFeature6
            ],
            ctaText: t.pricing.choosePlan,
            ctaLink: `${dashboardUrl}/register?plan=enterprise`,
            borderClass: 'border-slate-200 bg-white'
        }
    ];
    const faqs = [
        {
            q: language === 'bn' ? 'ক্রেডিট কীভাবে কাজ করে?' : 'How does the credit system work?',
            a: language === 'bn'
                ? 'প্রতিটি সফল ইনভয়েস বা ট্রানজেকশন ভেরিফিকেশনে আপনার অ্যাকাউন্ট থেকে ১টি ক্রেডিট বিয়োগ হবে। কোনো আনভেরিফাইড বা ফেইলড রিকোয়েস্টে কোনো ক্রেডিট কাটা হয় না।'
                : '1 credit is deducted only upon successful transaction reconciliation. Failed, duplicate, or unverified attempts consume 0 credits.'
        },
        {
            q: language === 'bn' ? 'আমার কী ধরনের ফোন বা সিম লাগবে?' : 'What kind of phone or SIM do I need?',
            a: language === 'bn'
                ? 'যেকোনো কম দামের অ্যান্ড্রয়েড স্মার্টফোন (Android 8.0+) যেখানে আপনার bKash, Nagad বা Rocket সিমটি রয়েছে। আমাদের হালকা অ্যাপটি ব্যাকগ্রাউন্ডে নিরাপদে SMS সিঙ্ক করে।'
                : 'Any Android smartphone (Android 8.0+) with your active MFS SIM. Our lightweight sync engine securely streams SMS confirmations in under 800ms.'
        },
        {
            q: language === 'bn' ? 'কাস্টমারদের টাকা সরাসরি কোথায় যাবে?' : 'Where does the customer payment go?',
            a: language === 'bn'
                ? '১০০% টাকা সরাসরি আপনার নিজের bKash, Nagad বা ব্যাংক অ্যাকাউন্টে জমা হবে। দেনা নেয়া কোনো টাকা হোল্ড করে না।'
                : '100% of the funds go directly into your personal or merchant MFS wallet or bank account. DenaNeya never touches or holds your funds.'
        }
    ];
    return (<div className="py-16 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold mb-3 border border-indigo-100">
            <lucide_react_1.Sparkles className="w-3.5 h-3.5 text-indigo-600"/>
            <span>0% Commission Architecture</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
            {t.pricing.title}
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-600">
            {t.pricing.subtitle}
          </p>
        </div>

        {/* 3 Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch mb-24">
          {plans.map((plan, idx) => (<div key={idx} className={`rounded-3xl p-8 border ${plan.borderClass} flex flex-col justify-between relative transition-all duration-200 hover:shadow-xl`}>
              {plan.badge && (<div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full bg-indigo-600 text-white font-extrabold text-[10px] tracking-wider uppercase shadow-md">
                  {plan.badge}
                </div>)}

              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {plan.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1 min-h-[32px]">
                  {plan.desc}
                </p>

                {/* Price Display */}
                <div className="mt-6 pb-6 border-b border-slate-100">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-slate-900 font-mono tracking-tight">
                      {plan.price}
                    </span>
                    <span className="text-xs text-slate-500 font-semibold">
                      {t.pricing.monthly}
                    </span>
                  </div>
                  <div className="mt-2 text-xs font-bold text-indigo-600">
                    {plan.rate} <span className="text-slate-400 font-normal">{plan.rateSub}</span>
                  </div>
                </div>

                {/* Features List */}
                <ul className="mt-6 space-y-3.5 text-xs text-slate-600">
                  {plan.features.map((feat, fIdx) => (<li key={fIdx} className="flex items-center gap-2.5">
                      <div className="w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <lucide_react_1.Check className="w-3 h-3"/>
                      </div>
                      <span>{feat}</span>
                    </li>))}
                </ul>
              </div>

              {/* Action Button */}
              <div className="pt-8 mt-6">
                <a href={plan.ctaLink} className={`w-full py-3.5 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition ${plan.isPopular
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800'}`}>
                  <span>{plan.ctaText}</span>
                  <lucide_react_1.ArrowRight className="w-3.5 h-3.5"/>
                </a>
              </div>
            </div>))}
        </div>

        {/* Interactive Savings & Credit Calculator */}
        <CreditCalculator_1.CreditCalculator />

        {/* FAQ Section */}
        <div className="mt-24 max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-slate-900">
              {language === 'bn' ? 'সাধারণ জিজ্ঞাসা (FAQ)' : 'Frequently Asked Questions'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {language === 'bn' ? 'দেনা নেয়ার প্রাইসিং ও অটোমেশন সম্পর্কে গুরুত্বপূর্ণ তথ্য' : 'Everything you need to know about DenaNeya credits & billing.'}
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, i) => (<div key={i} className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <lucide_react_1.HelpCircle className="w-4 h-4 text-indigo-600 shrink-0"/>
                  <span>{faq.q}</span>
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed pl-6">
                  {faq.a}
                </p>
              </div>))}
          </div>
        </div>

      </div>
    </div>);
}
//# sourceMappingURL=page.js.map