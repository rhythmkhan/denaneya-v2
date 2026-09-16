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
exports.GatewayCatalogShowcase = void 0;
const react_1 = __importStar(require("react"));
const LanguageContext_1 = require("./LanguageContext");
const gatewayData_1 = require("../lib/gatewayData");
const lucide_react_1 = require("lucide-react");
const GatewayCatalogShowcase = () => {
    const { t, language } = (0, LanguageContext_1.useLanguage)();
    const [activeTab, setActiveTab] = (0, react_1.useState)('All');
    const [searchQuery, setSearchQuery] = (0, react_1.useState)('');
    const [copiedUssd, setCopiedUssd] = (0, react_1.useState)(null);
    // Tab Counts
    const counts = (0, react_1.useMemo)(() => {
        return {
            All: gatewayData_1.PAYMENT_GATEWAYS.length,
            Mobile: gatewayData_1.PAYMENT_GATEWAYS.filter(g => g.tab === 'Mobile').length,
            International: gatewayData_1.PAYMENT_GATEWAYS.filter(g => g.tab === 'International').length,
            Bank: gatewayData_1.PAYMENT_GATEWAYS.filter(g => g.tab === 'Bank').length,
        };
    }, []);
    // Filtered Channels
    const filteredGateways = (0, react_1.useMemo)(() => {
        return gatewayData_1.PAYMENT_GATEWAYS.filter(gw => {
            const matchesTab = activeTab === 'All' || gw.tab === activeTab;
            const query = searchQuery.toLowerCase().trim();
            if (!query)
                return matchesTab;
            const matchesSearch = gw.name.toLowerCase().includes(query) ||
                gw.displayName.toLowerCase().includes(query) ||
                gw.category.toLowerCase().includes(query) ||
                (gw.ussdCode && gw.ussdCode.toLowerCase().includes(query)) ||
                gw.accountTypes.some(acc => acc.toLowerCase().includes(query));
            return matchesTab && matchesSearch;
        });
    }, [activeTab, searchQuery]);
    const handleCopyUssd = (code) => {
        navigator.clipboard.writeText(code);
        setCopiedUssd(code);
        setTimeout(() => setCopiedUssd(null), 2000);
    };
    const getTabIcon = (tab) => {
        switch (tab) {
            case 'Mobile': return <lucide_react_1.Smartphone className="w-4 h-4"/>;
            case 'International': return <lucide_react_1.Globe2 className="w-4 h-4"/>;
            case 'Bank': return <lucide_react_1.Landmark className="w-4 h-4"/>;
            default: return <lucide_react_1.Layers className="w-4 h-4"/>;
        }
    };
    return (<section id="channels" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold mb-3 border border-indigo-100">
            <lucide_react_1.Sparkles className="w-3.5 h-3.5 text-indigo-600"/>
            <span>52+ Payment Channels Catalog</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            {t.channels.title}
          </h2>
          <p className="mt-3 text-base sm:text-lg text-slate-600">
            {t.channels.subtitle}
          </p>
        </div>

        {/* Tab Selection Bar & Search Input */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-10">
          
          {/* Tabs */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-1.5 rounded-2xl w-full md:w-auto">
            {['All', 'Mobile', 'International', 'Bank'].map(tab => {
            const isActive = activeTab === tab;
            const count = counts[tab];
            return (<button key={tab} onClick={() => setActiveTab(tab)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${isActive
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'}`}>
                  {getTabIcon(tab)}
                  <span>
                    {tab === 'All' && t.channels.tabAll}
                    {tab === 'Mobile' && t.channels.tabMobile}
                    {tab === 'International' && t.channels.tabInternational}
                    {tab === 'Bank' && t.channels.tabBank}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${isActive ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-200 text-slate-600'}`}>
                    {count}
                  </span>
                </button>);
        })}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <lucide_react_1.Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={t.channels.searchPlaceholder} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition bg-slate-50/50"/>
            {searchQuery && (<button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600">
                ✕
              </button>)}
          </div>

        </div>

        {/* Counter Summary */}
        <div className="flex items-center justify-between text-xs text-slate-500 mb-6 px-1">
          <span>
            {t.channels.totalChannels}: <strong className="text-slate-900">{filteredGateways.length}</strong>
          </span>
          <span className="text-[11px] text-slate-400">
            {language === 'bn' ? 'সকল গেটওয়ে সরাসরি কনফিগার করা সম্ভব' : 'All channels deployable in 1-click'}
          </span>
        </div>

        {/* Gateway Cards Grid */}
        {filteredGateways.length > 0 ? (<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredGateways.map((gw) => (<div key={gw.id} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between group">
                <div>
                  
                  {/* Top Bar: Icon/Initials + Badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs text-white shadow-sm" style={{ backgroundColor: gw.color || '#4F46E5' }}>
                        {gw.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors">
                          {gw.displayName}
                        </h4>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {gw.category}
                        </span>
                      </div>
                    </div>

                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                      {gw.currency}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-[11px] text-slate-600 leading-relaxed mb-4 line-clamp-2">
                    {gw.description}
                  </p>

                </div>

                {/* Bottom Bar: USSD copy or Account Types */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  {gw.ussdCode ? (<button onClick={() => handleCopyUssd(gw.ussdCode)} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-pink-50 hover:bg-pink-100 text-pink-700 text-[11px] font-mono font-bold transition" title="Click to copy USSD string">
                      <lucide_react_1.PhoneCall className="w-3 h-3 text-pink-600"/>
                      <span>{gw.ussdCode}</span>
                      {copiedUssd === gw.ussdCode ? (<lucide_react_1.Check className="w-3 h-3 text-emerald-600"/>) : (<lucide_react_1.Copy className="w-3 h-3 text-pink-400"/>)}
                    </button>) : (<span className="text-[10px] font-medium text-slate-400 truncate max-w-[150px]">
                      {gw.accountTypes.join(', ')}
                    </span>)}

                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                    Active
                  </span>
                </div>

              </div>))}
          </div>) : (<div className="py-16 text-center bg-slate-50 rounded-3xl border border-slate-200">
            <p className="text-sm font-semibold text-slate-500">
              {t.channels.noResults}
            </p>
            <button onClick={() => { setActiveTab('All'); setSearchQuery(''); }} className="mt-3 text-xs font-bold text-indigo-600 hover:underline">
              {language === 'bn' ? 'সব চ্যানেল দেখুন' : 'View All Channels'}
            </button>
          </div>)}

      </div>
    </section>);
};
exports.GatewayCatalogShowcase = GatewayCatalogShowcase;
//# sourceMappingURL=GatewayCatalogShowcase.js.map