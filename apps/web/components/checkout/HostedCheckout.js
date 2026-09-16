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
exports.HostedCheckout = void 0;
const react_1 = __importStar(require("react"));
const LanguageContext_1 = require("../LanguageContext");
const lucide_react_1 = require("lucide-react");
const DEFAULT_GATEWAYS = [
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
const HostedCheckout = ({ invoiceId, initialInvoice }) => {
    const { t, language } = (0, LanguageContext_1.useLanguage)();
    const [invoice, setInvoice] = (0, react_1.useState)(initialInvoice || null);
    const [loading, setLoading] = (0, react_1.useState)(!initialInvoice);
    const [errorMsg, setErrorMsg] = (0, react_1.useState)(null);
    // Selected gateway & tab mode
    const [selectedGatewayId, setSelectedGatewayId] = (0, react_1.useState)('bkash');
    const [activeInstructionTab, setActiveInstructionTab] = (0, react_1.useState)('ussd');
    // Trx input & validation
    const [trxId, setTrxId] = (0, react_1.useState)('');
    const [isSubmitting, setIsSubmitting] = (0, react_1.useState)(false);
    const [submitFeedback, setSubmitFeedback] = (0, react_1.useState)(null);
    // Copy feedback
    const [copiedKey, setCopiedKey] = (0, react_1.useState)(null);
    // Polling & timer
    const [timeLeftSec, setTimeLeftSec] = (0, react_1.useState)(900); // 15 mins
    const [isExpired, setIsExpired] = (0, react_1.useState)(false);
    const [isPaid, setIsPaid] = (0, react_1.useState)(false);
    const [redirectCount, setRedirectCount] = (0, react_1.useState)(3);
    const pollTimerRef = (0, react_1.useRef)(null);
    const selectedGateway = DEFAULT_GATEWAYS.find(g => g.id === selectedGatewayId) || DEFAULT_GATEWAYS[0];
    const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
    // 1. Fetch Invoice Details
    const fetchInvoiceStatus = async () => {
        try {
            const res = await fetch(`${apiBase}/api/payment/status/${invoiceId}`);
            if (!res.ok) {
                if (res.status === 404) {
                    setErrorMsg('Invoice not found.');
                    return;
                }
            }
            const data = await res.json();
            if (data.success) {
                setInvoice(data);
                if (data.status === 'PAID' || data.status === 'COMPLETED') {
                    setIsPaid(true);
                }
                if (data.is_expired || data.status === 'EXPIRED') {
                    setIsExpired(true);
                }
                // Calculate remaining seconds
                if (data.expires_at) {
                    const expiresMs = new Date(data.expires_at).getTime();
                    const remaining = Math.max(0, Math.floor((expiresMs - Date.now()) / 1000));
                    setTimeLeftSec(remaining);
                    if (remaining <= 0) {
                        setIsExpired(true);
                    }
                }
            }
        }
        catch (err) {
            // Fallback for standalone preview / mock mode
            if (!invoice) {
                setInvoice({
                    invoice_id: invoiceId,
                    invoice_number: `INV-${invoiceId.slice(0, 8).toUpperCase()}`,
                    amount: 1250,
                    currency: 'BDT',
                    status: 'PENDING',
                    brand_name: 'Deshi Course (দেশি কোর্স)',
                    expires_at: new Date(Date.now() + 14 * 60 * 1000).toISOString()
                });
            }
        }
        finally {
            setLoading(false);
        }
    };
    // Initial load
    (0, react_1.useEffect)(() => {
        fetchInvoiceStatus();
    }, [invoiceId]);
    // 2. Real-time short polling (Every 3 seconds when pending and not paid/expired)
    (0, react_1.useEffect)(() => {
        if (isPaid || isExpired) {
            if (pollTimerRef.current)
                clearInterval(pollTimerRef.current);
            return;
        }
        pollTimerRef.current = setInterval(async () => {
            try {
                const res = await fetch(`${apiBase}/api/payment/status/${invoiceId}`);
                const data = await res.json();
                if (data.success) {
                    if (data.status === 'PAID' || data.status === 'COMPLETED') {
                        setIsPaid(true);
                        setInvoice(data);
                        if (pollTimerRef.current)
                            clearInterval(pollTimerRef.current);
                    }
                    else if (data.is_expired || data.status === 'EXPIRED') {
                        setIsExpired(true);
                        if (pollTimerRef.current)
                            clearInterval(pollTimerRef.current);
                    }
                }
            }
            catch (_) { }
        }, 3000);
        return () => {
            if (pollTimerRef.current)
                clearInterval(pollTimerRef.current);
        };
    }, [invoiceId, isPaid, isExpired]);
    // 3. Countdown timer tick
    (0, react_1.useEffect)(() => {
        if (isPaid || isExpired)
            return;
        const timer = setInterval(() => {
            setTimeLeftSec(prev => {
                if (prev <= 1) {
                    setIsExpired(true);
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [isPaid, isExpired]);
    // 4. Auto-redirect countdown on payment completion
    (0, react_1.useEffect)(() => {
        if (!isPaid || !invoice?.redirect_url)
            return;
        const redTimer = setInterval(() => {
            setRedirectCount(prev => {
                if (prev <= 1) {
                    clearInterval(redTimer);
                    window.location.href = invoice.redirect_url;
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(redTimer);
    }, [isPaid, invoice?.redirect_url]);
    // Format mm:ss
    const formatTime = (secs) => {
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };
    const copyToClipboard = (text, key) => {
        navigator.clipboard.writeText(text);
        setCopiedKey(key);
        setTimeout(() => setCopiedKey(null), 2000);
    };
    // Trx format validation (6-32 alphanumeric)
    const isTrxFormatValid = /^[A-Za-z0-9_-]{6,32}$/.test(trxId.trim());
    // Submit TrxID handler
    const handleVerifyTrx = async (e) => {
        e.preventDefault();
        if (!isTrxFormatValid) {
            setSubmitFeedback({
                type: 'error',
                message: language === 'bn'
                    ? 'অনুগ্রহ করে সঠিক ফরম্যাটের Transaction ID প্রদান করুন (যেমন: 75TD2K9J)।'
                    : 'Please enter a valid Transaction ID format (e.g. 75TD2K9J).'
            });
            return;
        }
        setIsSubmitting(true);
        setSubmitFeedback(null);
        try {
            const res = await fetch(`${apiBase}/api/payment/submit-trx`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    invoice_id: invoiceId,
                    trx_id: trxId.trim()
                })
            });
            const result = await res.json();
            if (res.ok && result.success) {
                setIsPaid(true);
                setInvoice((prev) => ({ ...prev, ...result, trx_id: trxId.trim() }));
                setSubmitFeedback({
                    type: 'success',
                    message: t.checkout.paymentSuccessTitle
                });
            }
            else {
                setSubmitFeedback({
                    type: 'error',
                    message: result.message || t.checkout.errorInvalidTrx
                });
            }
        }
        catch (err) {
            setSubmitFeedback({
                type: 'error',
                message: t.checkout.errorGeneric
            });
        }
        finally {
            setIsSubmitting(false);
        }
    };
    if (loading) {
        return (<div className="min-h-screen flex items-center justify-center p-4 bg-slate-100">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"/>
      </div>);
    }
    // EXPIRED STATE
    if (isExpired && !isPaid) {
        return (<div className="min-h-screen flex items-center justify-center p-4 bg-slate-100">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center space-y-4 border border-slate-200">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <lucide_react_1.AlertTriangle className="w-7 h-7"/>
          </div>
          <h2 className="text-xl font-bold text-slate-900">{t.checkout.invoiceExpiredTitle}</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            {t.checkout.invoiceExpiredDesc}
          </p>
          <div className="p-3 bg-slate-50 rounded-xl font-mono text-xs text-slate-500">
            Invoice: {invoice?.invoice_number || invoiceId}
          </div>
        </div>
      </div>);
    }
    // CONFIRMED PAID RECEIPT STATE
    if (isPaid) {
        return (<div className="min-h-screen flex items-center justify-center p-4 bg-slate-100">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
          
          {/* Header */}
          <div className="bg-emerald-600 p-8 text-white text-center space-y-2">
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center mx-auto shadow-inner">
              <lucide_react_1.CheckCircle2 className="w-10 h-10 text-white"/>
            </div>
            <h2 className="text-xl font-extrabold">{t.checkout.paymentSuccessTitle}</h2>
            <p className="text-xs text-emerald-100">{t.checkout.paymentSuccessDesc}</p>
          </div>

          {/* Receipt Body */}
          <div className="p-6 space-y-4 text-xs">
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">{t.checkout.invoiceNo}:</span>
                <span className="font-mono font-bold text-slate-900">{invoice?.invoice_number || invoiceId}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">{t.checkout.paidAmount}:</span>
                <span className="font-black text-sm text-slate-900 font-mono">
                  ৳ {(Number(invoice?.amount) || 1250).toLocaleString()} BDT
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">{t.checkout.trxVerified}:</span>
                <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {invoice?.trx_id || trxId || '75TD2K9J'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">{t.checkout.paymentChannel}:</span>
                <span className="font-bold text-slate-800 uppercase">{invoice?.payment_method || selectedGateway.name}</span>
              </div>
            </div>

            {/* Redirect Banner */}
            {invoice?.redirect_url && (<div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-800 text-center font-semibold">
                <span>{t.checkout.redirectCountdown} {redirectCount}s...</span>
              </div>)}

            <div className="pt-2 flex gap-2">
              <button onClick={() => window.print()} className="w-full py-3 rounded-xl border border-slate-200 hover:bg-slate-50 font-bold text-slate-700 flex items-center justify-center gap-2 transition">
                <lucide_react_1.Printer className="w-4 h-4"/>
                <span>{language === 'bn' ? 'রসিদ প্রিন্ট করুন' : 'Print Receipt'}</span>
              </button>
              {invoice?.redirect_url && (<a href={invoice.redirect_url} className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-center flex items-center justify-center gap-2 transition">
                  <span>{language === 'bn' ? 'ফিরে যান' : 'Return Now'}</span>
                  <lucide_react_1.ExternalLink className="w-4 h-4"/>
                </a>)}
            </div>

          </div>

        </div>
      </div>);
    }
    // ACTIVE CHECKOUT FORM STATE
    return (<div className="min-h-screen flex items-center justify-center p-3 sm:p-6 bg-gradient-to-br from-slate-100 via-indigo-50/40 to-slate-200">
      
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
        
        {/* Brand Top Header */}
        <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-700 p-6 text-white text-center relative">
          
          <div className="flex items-center justify-between text-[11px] text-indigo-200 mb-2">
            <span className="flex items-center gap-1">
              <lucide_react_1.Lock className="w-3 h-3 text-emerald-400"/>
              <span>{t.checkout.secureCheckout}</span>
            </span>
            
            {/* 15-Min Expiration Countdown */}
            <span className="flex items-center gap-1 font-mono font-bold bg-white/10 px-2 py-0.5 rounded-full border border-white/20">
              <lucide_react_1.Clock className="w-3 h-3 text-amber-300"/>
              <span>{formatTime(timeLeftSec)}</span>
            </span>
          </div>

          <h2 className="text-xl font-bold tracking-tight">
            {invoice?.brand_name || 'Deshi Course (দেশি কোর্স)'}
          </h2>
          <p className="text-[11px] text-indigo-200 mt-0.5 font-mono">
            {t.checkout.invoiceNo}: <span className="font-bold text-white">{invoice?.invoice_number || invoiceId}</span>
          </p>

          {/* Amount Box */}
          <div className="mt-4 bg-white/10 rounded-2xl p-3 backdrop-blur border border-white/20">
            <span className="text-[11px] text-indigo-200 uppercase tracking-wider font-semibold block">
              {t.checkout.amountToPay}
            </span>
            <span className="text-3xl font-extrabold tracking-tight mt-0.5 block font-mono">
              ৳ {(Number(invoice?.amount) || 1250).toLocaleString()} <span className="text-sm font-sans font-bold">BDT</span>
            </span>
          </div>

        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-5">
          
          {/* Gateway Selector Tabs */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              {t.checkout.selectMethod}
            </label>
            <div className="grid grid-cols-4 gap-2">
              {DEFAULT_GATEWAYS.map(gw => {
            const isSelected = gw.id === selectedGatewayId;
            return (<button key={gw.id} onClick={() => setSelectedGatewayId(gw.id)} className={`p-2.5 rounded-2xl border text-center transition-all ${isSelected
                    ? `${gw.accentBorder} ${gw.accentBg} shadow-sm ring-2 ring-indigo-500/20`
                    : 'border-slate-200 hover:bg-slate-50 opacity-80'}`}>
                    <div className="w-7 h-7 rounded-lg mx-auto flex items-center justify-center font-bold text-xs text-white shadow-sm mb-1" style={{ backgroundColor: gw.color }}>
                      {gw.name.slice(0, 2)}
                    </div>
                    <span className="block text-[11px] font-bold text-slate-800 leading-tight">
                      {gw.name}
                    </span>
                    <span className="text-[9px] font-mono text-slate-400">
                      {gw.ussdCode}
                    </span>
                  </button>);
        })}
            </div>
          </div>

          {/* Guide Mode Toggle: USSD vs QR */}
          <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
            <button onClick={() => setActiveInstructionTab('ussd')} className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${activeInstructionTab === 'ussd'
            ? 'bg-white text-indigo-700 shadow-sm'
            : 'text-slate-500 hover:text-slate-800'}`}>
              <lucide_react_1.Smartphone className="w-3.5 h-3.5"/>
              <span>{t.checkout.tabUssd}</span>
            </button>
            <button onClick={() => setActiveInstructionTab('qr')} className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${activeInstructionTab === 'qr'
            ? 'bg-white text-indigo-700 shadow-sm'
            : 'text-slate-500 hover:text-slate-800'}`}>
              <lucide_react_1.QrCode className="w-3.5 h-3.5"/>
              <span>{t.checkout.tabQr}</span>
            </button>
          </div>

          {/* Instruction Details Box */}
          {activeInstructionTab === 'ussd' ? (<div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              
              {/* Account Number & 1-Click Copy */}
              <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                    {selectedGateway.displayName} ({selectedGateway.accountType})
                  </span>
                  <span className="text-base font-mono font-black text-slate-900 tracking-wider">
                    {selectedGateway.accountNumber}
                  </span>
                </div>
                <button onClick={() => copyToClipboard(selectedGateway.accountNumber, 'acc_no')} className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition flex items-center gap-1">
                  {copiedKey === 'acc_no' ? (<>
                      <lucide_react_1.Check className="w-3.5 h-3.5 text-emerald-600"/>
                      <span>{t.common.copied}</span>
                    </>) : (<>
                      <lucide_react_1.Copy className="w-3.5 h-3.5"/>
                      <span>{t.checkout.copyNumber}</span>
                    </>)}
                </button>
              </div>

              {/* Step-by-Step Instructions */}
              <ol className="text-xs text-slate-600 space-y-1.5 pl-4 list-decimal leading-relaxed">
                <li>
                  {t.checkout.step1}{' '}
                  <button onClick={() => copyToClipboard(selectedGateway.ussdCode, 'ussd_str')} className="font-mono font-bold text-indigo-600 underline">
                    {selectedGateway.ussdCode}
                  </button>
                </li>
                <li>
                  {t.checkout.step2}{' '}
                  <strong className="text-slate-800">{selectedGateway.actionType}</strong>
                </li>
                <li>
                  {t.checkout.step3}{' '}
                  <span className="font-mono font-bold text-slate-800">{selectedGateway.accountNumber}</span>
                </li>
                <li>
                  {t.checkout.step4}{' '}
                  <strong className="text-slate-900 font-mono">৳{(Number(invoice?.amount) || 1250).toLocaleString()}</strong>
                </li>
                <li>{t.checkout.step5}</li>
              </ol>

            </div>) : (
        /* QR Code Scan View */
        <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-3">
              <div className="w-44 h-44 mx-auto bg-white p-3 rounded-2xl border border-slate-300 shadow-sm flex items-center justify-center">
                {/* SVG Mock of EMVCo Bangla QR Code */}
                <svg viewBox="0 0 100 100" className="w-full h-full text-slate-900">
                  <rect width="100" height="100" fill="white"/>
                  {/* Position squares */}
                  <rect x="5" y="5" width="25" height="25" fill="black"/>
                  <rect x="9" y="9" width="17" height="17" fill="white"/>
                  <rect x="13" y="13" width="9" height="9" fill="black"/>
                  
                  <rect x="70" y="5" width="25" height="25" fill="black"/>
                  <rect x="74" y="9" width="17" height="17" fill="white"/>
                  <rect x="78" y="13" width="9" height="9" fill="black"/>

                  <rect x="5" y="70" width="25" height="25" fill="black"/>
                  <rect x="9" y="74" width="17" height="17" fill="white"/>
                  <rect x="13" y="78" width="9" height="9" fill="black"/>

                  {/* QR Pattern dots */}
                  <rect x="36" y="8" width="6" height="6" fill="black"/>
                  <rect x="48" y="12" width="8" height="4" fill="black"/>
                  <rect x="38" y="24" width="18" height="6" fill="black"/>
                  <rect x="12" y="38" width="10" height="8" fill="black"/>
                  <rect x="36" y="38" width="14" height="14" fill="black"/>
                  <rect x="62" y="38" width="8" height="6" fill="black"/>
                  <rect x="78" y="44" width="12" height="12" fill="black"/>
                  <rect x="38" y="62" width="12" height="10" fill="black"/>
                  <rect x="62" y="62" width="16" height="16" fill="black"/>
                  <rect x="38" y="80" width="8" height="12" fill="black"/>
                  <rect x="54" y="84" width="14" height="6" fill="black"/>
                </svg>
              </div>

              <span className="text-xs font-bold text-slate-700 block">
                {language === 'bn' ? `${selectedGateway.displayName} অ্যাপ দিয়ে স্ক্যান করুন` : `Scan with ${selectedGateway.displayName} App`}
              </span>
              <p className="text-[10px] text-slate-500">
                Bangla QR standard supported by all BD banking apps.
              </p>
            </div>)}

          {/* TrxID Input Form */}
          <form onSubmit={handleVerifyTrx} className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">
                  {t.checkout.trxIdLabel}
                </label>
                {trxId.length > 0 && (<span className={`text-[10px] font-bold ${isTrxFormatValid ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {isTrxFormatValid ? '✓ Valid format' : 'Min 6 alphanumeric'}
                  </span>)}
              </div>
              <input type="text" value={trxId} onChange={(e) => setTrxId(e.target.value.toUpperCase())} placeholder={t.checkout.trxIdPlaceholder} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm font-mono tracking-wider uppercase text-slate-900 bg-white"/>
              <span className="text-[10px] text-slate-400 block mt-1">
                {t.checkout.trxIdHelp}
              </span>
            </div>

            {/* Error or Feedback Alert Box */}
            {submitFeedback && (<div className={`p-3 rounded-xl text-xs font-semibold ${submitFeedback.type === 'error'
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                {submitFeedback.message}
              </div>)}

            {/* Submit Verification Button */}
            <button type="submit" disabled={isSubmitting || !trxId} className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:pointer-events-none active:scale-98 text-white text-xs font-bold shadow-lg shadow-indigo-200 transition flex items-center justify-center gap-2">
              {isSubmitting ? (<>
                  <span className="animate-spin text-sm">⏳</span>
                  <span>{t.checkout.verifying}</span>
                </>) : (<>
                  <lucide_react_1.CheckCircle2 className="w-4 h-4"/>
                  <span>{t.checkout.verifyButton}</span>
                </>)}
            </button>
          </form>

          {/* Real-time Polling Status Indicator */}
          <div className="pt-2 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-50 text-slate-500 text-[11px] border border-slate-200">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
              <span>{t.checkout.statusPolling}</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-2">
              {t.checkout.sslNote}
            </p>
          </div>

        </div>

      </div>

    </div>);
};
exports.HostedCheckout = HostedCheckout;
//# sourceMappingURL=HostedCheckout.js.map