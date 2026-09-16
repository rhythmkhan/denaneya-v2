'use client';
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeatureShowcase = void 0;
const react_1 = __importDefault(require("react"));
const LanguageContext_1 = require("./LanguageContext");
const lucide_react_1 = require("lucide-react");
const FeatureShowcase = () => {
    const { t } = (0, LanguageContext_1.useLanguage)();
    const featureCards = [
        {
            icon: lucide_react_1.Database,
            title: t.features.casTitle,
            desc: t.features.casDesc,
            badge: t.features.casBadge,
            spec: 'UPDATE stored_data SET status = USED WHERE trx_id = ? AND status = UNUSED',
            accent: 'border-emerald-200 bg-emerald-50/30'
        },
        {
            icon: lucide_react_1.Radio,
            title: t.features.smsTitle,
            desc: t.features.smsDesc,
            badge: t.features.smsBadge,
            spec: 'Alphanumeric Carrier Whitelist: [bKash, Nagad, 16216, Upay]',
            accent: 'border-blue-200 bg-blue-50/30'
        },
        {
            icon: lucide_react_1.Send,
            title: t.features.webhookTitle,
            desc: t.features.webhookDesc,
            badge: t.features.webhookBadge,
            spec: 'X-DenaNeya-Signature: t=timestamp,v1=HMAC_SHA256',
            accent: 'border-purple-200 bg-purple-50/30'
        },
        {
            icon: lucide_react_1.Clock,
            title: t.features.ttlTitle,
            desc: t.features.ttlDesc,
            badge: t.features.ttlBadge,
            spec: 'Cron Reaper Worker: PENDING -> EXPIRED after 900s',
            accent: 'border-amber-200 bg-amber-50/30'
        },
        {
            icon: lucide_react_1.KeyRound,
            title: t.features.s2sTitle,
            desc: t.features.s2sDesc,
            badge: t.features.s2sBadge,
            spec: 'POST /v1/trx/verify & POST /v1/trx/confirm',
            accent: 'border-pink-200 bg-pink-50/30'
        },
        {
            icon: lucide_react_1.UserCheck,
            title: t.features.rbacTitle,
            desc: t.features.rbacDesc,
            badge: t.features.rbacBadge,
            spec: 'Roles: Owner, Admin, Manager, Viewer across 10 modules',
            accent: 'border-indigo-200 bg-indigo-50/30'
        }
    ];
    return (<section id="features" className="py-24 bg-slate-50 border-t border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-100/80 text-indigo-700 text-xs font-bold mb-3">
            <lucide_react_1.Lock className="w-3.5 h-3.5"/>
            <span>Bank-Grade Architecture</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            {t.features.title}
          </h2>
          <p className="mt-3 text-base sm:text-lg text-slate-600">
            {t.features.subtitle}
          </p>
        </div>

        {/* 6 Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {featureCards.map((feat, idx) => {
            const Icon = feat.icon;
            return (<div key={idx} className="p-7 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <Icon className="w-5 h-5"/>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {feat.badge}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900">
                    {feat.title}
                  </h3>
                  <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                    {feat.desc}
                  </p>
                </div>

                <div className={`mt-5 p-2.5 rounded-xl border font-mono text-[10px] text-slate-600 truncate ${feat.accent}`}>
                  <code>{feat.spec}</code>
                </div>
              </div>);
        })}
        </div>

      </div>
    </section>);
};
exports.FeatureShowcase = FeatureShowcase;
//# sourceMappingURL=FeatureShowcase.js.map