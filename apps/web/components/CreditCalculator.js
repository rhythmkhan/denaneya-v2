'use client';
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreditCalculator = void 0;
const react_1 = __importStar(require("react"));
const LanguageContext_1 = require("./LanguageContext");
const lucide_react_1 = require("lucide-react");
const CreditCalculator = () => {
    const { t, language } = (0, LanguageContext_1.useLanguage)();
    const [monthlyInvoices, setMonthlyInvoices] = (0, react_1.useState)(3000);
    const [aov, setAov] = (0, react_1.useState)(1200);
    // Financial calculations
    const stats = (0, react_1.useMemo)(() => {
        const gmv = monthlyInvoices * aov;
        // Traditional Gateway Average: 2.2% (1.8% MFS + Gateway margin + fees)
        const traditionalFee = Math.round(gmv * 0.022);
        // DenaNeya v2.0 Plan Tier Estimation
        let denaneyaCost = 0;
        let planTier = 'Starter';
        if (monthlyInvoices <= 500) {
            denaneyaCost = 0; // Free starter credits
            planTier = 'Starter (Free)';
        }
        else if (monthlyInvoices <= 2000) {
            denaneyaCost = Math.round(monthlyInvoices * 0.20);
            planTier = 'Starter (Pay As You Go)';
        }
        else if (monthlyInvoices <= 15000) {
            // Growth plan: ৳1500 includes 12,000 credits
            const extra = Math.max(0, monthlyInvoices - 12000);
            denaneyaCost = 1500 + Math.round(extra * 0.15);
            planTier = 'Growth Plan';
        }
        else {
            // Enterprise: ৳4999 includes 50,000 credits
            const extra = Math.max(0, monthlyInvoices - 50000);
            denaneyaCost = 4999 + Math.round(extra * 0.08);
            planTier = 'Enterprise Plan';
        }
        const monthlySavings = Math.max(0, traditionalFee - denaneyaCost);
        const yearlySavings = monthlySavings * 12;
        const savingsPercent = traditionalFee > 0 ? Math.round((monthlySavings / traditionalFee) * 100) : 0;
        return {
            gmv,
            traditionalFee,
            denaneyaCost,
            monthlySavings,
            yearlySavings,
            savingsPercent,
            planTier
        };
    }, [monthlyInvoices, aov]);
    const dashboardUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL || 'http://localhost:5173';
    return (<section id="calculator" className="py-20 bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold mb-3 border border-emerald-100">
            <lucide_react_1.Calculator className="w-3.5 h-3.5 text-emerald-600"/>
            <span>ROI & Savings Engine</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            {t.calculator.title}
          </h2>
          <p className="mt-3 text-base text-slate-600">
            {t.calculator.subtitle}
          </p>
        </div>

        {/* Calculator Main Box */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          
          {/* Controls Panel (Left 7 Cols) */}
          <div className="p-8 lg:p-10 lg:col-span-7 space-y-8">
            
            {/* Slider 1: Monthly Invoices */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-bold text-slate-700">
                  {t.calculator.monthlyVolumeLabel}
                </label>
                <span className="text-lg font-black text-indigo-600 font-mono bg-indigo-50 px-3 py-0.5 rounded-lg">
                  {monthlyInvoices.toLocaleString()} {language === 'bn' ? 'টি' : 'tx'}
                </span>
              </div>
              <input type="range" min={200} max={50000} step={200} value={monthlyInvoices} onChange={(e) => setMonthlyInvoices(Number(e.target.value))} className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"/>
              <div className="flex justify-between text-[11px] text-slate-400 mt-1 font-mono">
                <span>200</span>
                <span>10,000</span>
                <span>25,000</span>
                <span>50,000+</span>
              </div>
            </div>

            {/* Slider 2: Average Order Value */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-bold text-slate-700">
                  {t.calculator.aovLabel}
                </label>
                <span className="text-lg font-black text-indigo-600 font-mono bg-indigo-50 px-3 py-0.5 rounded-lg">
                  ৳ {aov.toLocaleString()}
                </span>
              </div>
              <input type="range" min={200} max={15000} step={100} value={aov} onChange={(e) => setAov(Number(e.target.value))} className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"/>
              <div className="flex justify-between text-[11px] text-slate-400 mt-1 font-mono">
                <span>৳ 200</span>
                <span>৳ 3,000</span>
                <span>৳ 7,500</span>
                <span>৳ 15,000+</span>
              </div>
            </div>

            {/* Total GMV Banner */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase">
                {t.calculator.calculatedGMV}
              </span>
              <span className="text-xl font-black text-slate-900 font-mono">
                ৳ {stats.gmv.toLocaleString()} BDT
              </span>
            </div>

            {/* Breakdown Comparison Table */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100">
                <span className="text-slate-600">{t.calculator.traditionalFeeLabel}</span>
                <span className="font-mono font-bold text-red-600 line-through">
                  - ৳ {stats.traditionalFee.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100">
                <span className="text-slate-600">
                  {t.calculator.denaneyaFeeLabel} ({stats.planTier})
                </span>
                <span className="font-mono font-bold text-indigo-600">
                  ৳ {stats.denaneyaCost.toLocaleString()}
                </span>
              </div>
            </div>

          </div>

          {/* Results Card (Right 5 Cols) */}
          <div className="p-8 lg:p-10 lg:col-span-5 bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white flex flex-col justify-between">
            
            <div className="space-y-6">
              
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                <lucide_react_1.Sparkles className="w-3.5 h-3.5"/>
                <span>{stats.savingsPercent}% Cost Reduction</span>
              </div>

              <div>
                <span className="text-xs text-indigo-200 uppercase tracking-wider font-semibold block">
                  {t.calculator.monthlySavingsLabel}
                </span>
                <div className="text-4xl sm:text-5xl font-black text-emerald-400 font-mono mt-1 tracking-tight">
                  ৳ {stats.monthlySavings.toLocaleString()}
                </div>
                <span className="text-xs text-slate-300 block mt-1">
                  Kept directly in your bank account every month.
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-white/10 backdrop-blur border border-white/10 space-y-1">
                <span className="text-[11px] text-indigo-200 block uppercase font-bold">
                  {t.calculator.yearlySavingsLabel}
                </span>
                <span className="text-2xl font-extrabold text-white font-mono">
                  ৳ {stats.yearlySavings.toLocaleString()} BDT
                </span>
              </div>

            </div>

            <div className="pt-8 space-y-3">
              <a href={`${dashboardUrl}/register`} className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2">
                <span>{language === 'bn' ? 'এই টাকা সাশ্রয় শুরু করুন' : 'Claim Your Monthly Savings'}</span>
                <lucide_react_1.ArrowRight className="w-4 h-4"/>
              </a>
              <p className="text-[10px] text-slate-400 text-center">
                {t.calculator.comparisonNote}
              </p>
            </div>

          </div>

        </div>

      </div>
    </section>);
};
exports.CreditCalculator = CreditCalculator;
//# sourceMappingURL=CreditCalculator.js.map