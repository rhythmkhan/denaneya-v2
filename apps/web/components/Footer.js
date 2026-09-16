'use client';
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Footer = void 0;
const react_1 = __importDefault(require("react"));
const link_1 = __importDefault(require("next/link"));
const LanguageContext_1 = require("./LanguageContext");
const lucide_react_1 = require("lucide-react");
const Footer = () => {
    const { t, language } = (0, LanguageContext_1.useLanguage)();
    return (<footer className="bg-slate-900 text-slate-400 text-xs border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10">
          
          {/* Col 1 & 2: Brand and Mission */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-black text-lg">
                দন
              </div>
              <span className="font-extrabold text-xl text-white tracking-tight">
                DenaNeya <span className="text-indigo-400 text-sm">v2.0</span>
              </span>
            </div>
            <p className="text-slate-400 leading-relaxed max-w-sm">
              {t.footer.tagline}
            </p>

            <div className="flex flex-wrap gap-2 pt-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 text-emerald-400 text-[11px] font-semibold border border-slate-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                {t.footer.apiStatus}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/80 text-indigo-400 text-[11px] font-semibold border border-slate-700">
                <lucide_react_1.ShieldCheck className="w-3 h-3 text-indigo-400"/>
                {t.footer.isoStandard}
              </span>
            </div>
          </div>

          {/* Col 3: Product Navigation */}
          <div className="space-y-3">
            <h4 className="text-white font-bold uppercase tracking-wider text-[11px]">
              {t.footer.productHeading}
            </h4>
            <ul className="space-y-2">
              <li><link_1.default href="/#features" className="hover:text-white transition">{t.nav.features}</link_1.default></li>
              <li><link_1.default href="/#channels" className="hover:text-white transition">{t.nav.channels}</link_1.default></li>
              <li><link_1.default href="/pricing" className="hover:text-white transition">{t.nav.pricing}</link_1.default></li>
              <li><link_1.default href="/pricing#calculator" className="hover:text-white transition">{t.nav.calculator}</link_1.default></li>
              <li><link_1.default href="/pay/demo_inv_1089" className="hover:text-white transition">{t.common.tryDemo}</link_1.default></li>
            </ul>
          </div>

          {/* Col 4: Developers & Resources */}
          <div className="space-y-3">
            <h4 className="text-white font-bold uppercase tracking-wider text-[11px]">
              {t.footer.resourcesHeading}
            </h4>
            <ul className="space-y-2">
              <li><link_1.default href="/docs" className="hover:text-white transition">{t.footer.documentation}</link_1.default></li>
              <li><link_1.default href="/docs#create-invoice" className="hover:text-white transition">Create Invoice API</link_1.default></li>
              <li><link_1.default href="/docs#s2s-verify-trx" className="hover:text-white transition">S2S 2-Step API</link_1.default></li>
              <li><link_1.default href="/docs#webhook-verification" className="hover:text-white transition">HMAC Webhooks</link_1.default></li>
              <li><a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-white transition flex items-center gap-1">
                <lucide_react_1.Terminal className="w-3 h-3"/> Android Sync APK
              </a></li>
            </ul>
          </div>

          {/* Col 5: Security & Compliance */}
          <div className="space-y-3">
            <h4 className="text-white font-bold uppercase tracking-wider text-[11px]">
              {t.footer.securityHeading}
            </h4>
            <ul className="space-y-2">
              <li className="flex items-center gap-1.5 text-slate-300">
                <lucide_react_1.Lock className="w-3 h-3 text-emerald-400"/>
                <span>256-Bit SSL Enforced</span>
              </li>
              <li className="flex items-center gap-1.5 text-slate-300">
                <lucide_react_1.CheckCircle2 className="w-3 h-3 text-indigo-400"/>
                <span>Zero Double-Spend CAS</span>
              </li>
              <li className="flex items-center gap-1.5 text-slate-300">
                <lucide_react_1.CheckCircle2 className="w-3 h-3 text-indigo-400"/>
                <span>SSRF Subnet Firewall</span>
              </li>
              <li><a href="#security" className="hover:text-white transition">{t.footer.securityPolicy}</a></li>
              <li><a href="#privacy" className="hover:text-white transition">{t.footer.privacy}</a></li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-slate-500">
            © 2026 DenaNeya Technologies. {t.footer.rights}
          </p>
          <div className="flex items-center gap-4 text-slate-500">
            <span className="flex items-center gap-1">
              Engineered with <lucide_react_1.Heart className="w-3 h-3 text-red-500 fill-red-500"/> in Bangladesh
            </span>
            <span>•</span>
            <span className="font-mono text-[10px] text-slate-600">Dual-Cloud: Vercel + Hostinger</span>
          </div>
        </div>

      </div>
    </footer>);
};
exports.Footer = Footer;
//# sourceMappingURL=Footer.js.map