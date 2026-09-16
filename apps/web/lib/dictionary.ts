export type Language = 'en' | 'bn';

export interface Dictionary {
  common: {
    brandName: string;
    tagline: string;
    getStarted: string;
    login: string;
    dashboard: string;
    viewDocs: string;
    tryDemo: string;
    bdtSymbol: string;
    currencyBdt: string;
    copy: string;
    copied: string;
    learnMore: string;
    contactSales: string;
    loading: string;
  };
  nav: {
    features: string;
    channels: string;
    pricing: string;
    docs: string;
    calculator: string;
    signIn: string;
    merchantPortal: string;
  };
  hero: {
    badge: string;
    titleLine1: string;
    titleHighlight: string;
    titleLine2: string;
    subtitle: string;
    ctaPrimary: string;
    ctaSecondary: string;
    trustText: string;
    statProcessed: string;
    statProcessedLabel: string;
    statUptime: string;
    statUptimeLabel: string;
    statFee: string;
    statFeeLabel: string;
    statGateways: string;
    statGatewaysLabel: string;
  };
  valueProps: {
    title: string;
    subtitle: string;
    prop1Title: string;
    prop1Desc: string;
    prop2Title: string;
    prop2Desc: string;
    prop3Title: string;
    prop3Desc: string;
    prop4Title: string;
    prop4Desc: string;
  };
  features: {
    title: string;
    subtitle: string;
    casTitle: string;
    casDesc: string;
    casBadge: string;
    smsTitle: string;
    smsDesc: string;
    smsBadge: string;
    webhookTitle: string;
    webhookDesc: string;
    webhookBadge: string;
    ttlTitle: string;
    ttlDesc: string;
    ttlBadge: string;
    s2sTitle: string;
    s2sDesc: string;
    s2sBadge: string;
    rbacTitle: string;
    rbacDesc: string;
    rbacBadge: string;
  };
  channels: {
    title: string;
    subtitle: string;
    tabAll: string;
    tabMobile: string;
    tabInternational: string;
    tabBank: string;
    searchPlaceholder: string;
    noResults: string;
    ussdTag: string;
    accountTypes: string;
    totalChannels: string;
  };
  pricing: {
    title: string;
    subtitle: string;
    monthly: string;
    perVerif: string;
    freeForever: string;
    starterName: string;
    starterPrice: string;
    starterDesc: string;
    starterRate: string;
    starterFeature1: string;
    starterFeature2: string;
    starterFeature3: string;
    starterFeature4: string;
    starterFeature5: string;
    growthName: string;
    growthPrice: string;
    growthDesc: string;
    growthRate: string;
    growthFeature1: string;
    growthFeature2: string;
    growthFeature3: string;
    growthFeature4: string;
    growthFeature5: string;
    growthFeature6: string;
    growthBadge: string;
    enterpriseName: string;
    enterprisePrice: string;
    enterpriseDesc: string;
    enterpriseRate: string;
    enterpriseFeature1: string;
    enterpriseFeature2: string;
    enterpriseFeature3: string;
    enterpriseFeature4: string;
    enterpriseFeature5: string;
    enterpriseFeature6: string;
    choosePlan: string;
  };
  calculator: {
    title: string;
    subtitle: string;
    monthlyVolumeLabel: string;
    aovLabel: string;
    calculatedGMV: string;
    traditionalFeeLabel: string;
    traditionalFeeDetail: string;
    denaneyaFeeLabel: string;
    denaneyaFeeDetail: string;
    monthlySavingsLabel: string;
    yearlySavingsLabel: string;
    effectiveSavingsRate: string;
    comparisonNote: string;
  };
  docs: {
    title: string;
    subtitle: string;
    quickstart: string;
    baseUrls: string;
    authHeaders: string;
    endpointsTitle: string;
    requestBody: string;
    responseBody: string;
    copyCode: string;
    tabCurl: string;
    tabNode: string;
    tabPython: string;
    tabPhp: string;
  };
  checkout: {
    secureCheckout: string;
    invoiceNo: string;
    merchantLabel: string;
    amountToPay: string;
    expiresIn: string;
    selectMethod: string;
    tabUssd: string;
    tabQr: string;
    ussdInstructions: string;
    step1: string;
    step2: string;
    step3: string;
    step4: string;
    step5: string;
    recipientNumber: string;
    copyNumber: string;
    copiedAlert: string;
    dialUssd: string;
    trxIdLabel: string;
    trxIdPlaceholder: string;
    trxIdHelp: string;
    verifyButton: string;
    verifying: string;
    statusWaiting: string;
    statusPolling: string;
    paymentSuccessTitle: string;
    paymentSuccessDesc: string;
    trxVerified: string;
    paidAmount: string;
    paymentChannel: string;
    paidAt: string;
    redirectCountdown: string;
    invoiceExpiredTitle: string;
    invoiceExpiredDesc: string;
    errorInvalidTrx: string;
    errorGeneric: string;
    sslNote: string;
  };
  footer: {
    tagline: string;
    rights: string;
    productHeading: string;
    resourcesHeading: string;
    securityHeading: string;
    privacy: string;
    terms: string;
    securityPolicy: string;
    documentation: string;
    apiStatus: string;
    pciCompliance: string;
    isoStandard: string;
  };
}

export const DICTIONARY: Record<Language, Dictionary> = {
  en: {
    common: {
      brandName: 'DenaNeya v2.0',
      tagline: 'Carrier-Grade Autonomous Payment Automation Platform for Bangladesh & Beyond',
      getStarted: 'Get Started Free',
      login: 'Sign In',
      dashboard: 'Merchant Dashboard',
      viewDocs: 'API Reference',
      tryDemo: 'Simulate Live Payment',
      bdtSymbol: '৳',
      currencyBdt: 'BDT',
      copy: 'Copy',
      copied: 'Copied!',
      learnMore: 'Learn More',
      contactSales: 'Contact Sales',
      loading: 'Loading...'
    },
    nav: {
      features: 'Features',
      channels: '52+ Gateways',
      pricing: 'Pricing',
      docs: 'Developers',
      calculator: 'Savings Calculator',
      signIn: 'Merchant Sign In',
      merchantPortal: 'Launch Dashboard'
    },
    hero: {
      badge: 'v2.0 Enterprise Release • Dual-Cloud Ready',
      titleLine1: 'Automate bKash, Nagad & Rocket with',
      titleHighlight: '0% Merchant Gateway Fees',
      titleLine2: 'Direct to Your Own Wallets & Bank Accounts',
      subtitle: 'Transform any personal, merchant, or agent SIM into an automated high-throughput payment gateway. Zero 2.5% transaction cuts, instant carrier SMS verification, and sub-second HMAC signed webhooks.',
      ctaPrimary: 'Start Collecting Free',
      ctaSecondary: 'Interactive API Docs',
      trustText: 'Securing over ৳50,000,000+ monthly GMV for 2,400+ online businesses & startups.',
      statProcessed: '৳50Cr+',
      statProcessedLabel: 'Processed Volume',
      statUptime: '99.98%',
      statUptimeLabel: 'Reconciliation Uptime',
      statFee: '0.00%',
      statFeeLabel: 'Merchant Commission',
      statGateways: '52+',
      statGatewaysLabel: 'Payment Channels'
    },
    valueProps: {
      title: 'Engineered for High-Growth Bangladeshi Merchants',
      subtitle: 'Eliminate middleman gateway fees while maintaining bank-grade reliability and automated checkout UX.',
      prop1Title: 'Zero Gateway Commission',
      prop1Desc: 'Keep 100% of your revenue. Traditional payment aggregators charge 1.8% to 2.5% per sale. DenaNeya operates on flat-credit micro-fees from ৳0.08 per verification.',
      prop2Title: 'Real-Time Android SMS Ingestion',
      prop2Desc: 'Our carrier-verified background sync engine securely streams SMS confirmations directly from your paired Android devices in under 800 milliseconds.',
      prop3Title: 'Carrier-Grade Anti-Exploit Security',
      prop3Desc: 'Hardened against all 13 audited payment vulnerabilities: Atomic compare-and-swap (CAS) double-spend defense, SSRF private IP firewalls, and cash-out keyword filters.',
      prop4Title: '52+ Channels: Mobile, Bank & Crypto',
      prop4Desc: 'Give your customers ultimate freedom: bKash, Nagad, Rocket, CellFin, 11 Commercial Bank transfers, Bangla QR, Stripe, and Binance Pay in one checkout.'
    },
    features: {
      title: 'Battle-Tested Fintech Architecture',
      subtitle: 'Built from ground up with defensive security, high-concurrency database transactions, and deterministic reconciliation.',
      casTitle: 'Atomic CAS Reconciliation',
      casDesc: 'Guarantees single-consumer execution via ACID transactions. Prevents concurrent double-spending attempts under heavy flash sale loads.',
      casBadge: 'Zero Double-Spend',
      smsTitle: 'Carrier Header Verification',
      smsDesc: 'Validates authentic alphanumeric carrier shortcodes (bKash, Nagad, 16216, Upay) and automatically purges malicious fake SMS or debit alerts.',
      smsBadge: 'SMS Spoofing Immune',
      webhookTitle: 'HMAC-SHA256 Signed Webhooks',
      webhookDesc: 'Outbound instant webhook notifications signed with timestamp replay protection and private-IP SSRF filtering.',
      webhookBadge: 'Replay-Proof',
      ttlTitle: '15-Minute Invoice Auto-TTL',
      ttlDesc: 'Automated invoice expiration reaper prevents stale transaction matching and closes payment replay attack windows.',
      ttlBadge: 'Automated Reaper',
      s2sTitle: 'Server-to-Server 2-Step API',
      s2sDesc: 'Dedicated /v1/trx/verify and /v1/trx/confirm endpoints with API key and secret authentication for custom ERP and eCommerce integration.',
      s2sBadge: 'Developer Ready',
      rbacTitle: 'Granular Multi-Tenant RBAC',
      rbacDesc: 'Owner, Admin, Manager, and Viewer roles across 10 dashboard modules with strict session-bound tenant isolation.',
      rbacBadge: 'Strict Isolation'
    },
    channels: {
      title: 'Unmatched 52+ Payment Channels Catalog',
      subtitle: 'Every payment channel in Bangladesh and the globe, catalogued and ready for immediate merchant deployment.',
      tabAll: 'All Channels (52)',
      tabMobile: 'Mobile & MFS (33)',
      tabInternational: 'International & Crypto (8)',
      tabBank: 'Bank Accounts (11)',
      searchPlaceholder: 'Search gateway by name, provider, or code (e.g. bKash, *247#, IBBL)...',
      noResults: 'No payment gateways match your search query.',
      ussdTag: 'USSD',
      accountTypes: 'Supported Accounts',
      totalChannels: 'Displaying Channels'
    },
    pricing: {
      title: 'Simple, Transparent Credit-Based Pricing',
      subtitle: 'No monthly setup traps. Pay only a few paisa per verified transaction and save thousands of Taka every month.',
      monthly: '/month',
      perVerif: 'per verified transaction',
      freeForever: 'Free to start',
      starterName: 'Starter',
      starterPrice: '৳ 0',
      starterDesc: 'Perfect for new eCommerce shops and indie businesses getting started.',
      starterRate: '৳0.20',
      starterFeature1: '500 Free Verification Credits included',
      starterFeature2: '1 Brand / Store configuration',
      starterFeature3: '1 Android SMS Sync Device',
      starterFeature4: 'Standard Webhook dispatch',
      starterFeature5: 'Hosted Checkout & QR Support',
      growthName: 'Growth (Most Popular)',
      growthPrice: '৳ 1,500',
      growthDesc: 'Ideal for scaling online brands, Facebook live sellers, and SaaS startups.',
      growthRate: '৳0.15',
      growthFeature1: '12,000 Verification Credits included',
      growthFeature2: 'Up to 5 Brands / Multi-Tenants',
      growthFeature3: 'Up to 3 Android Sync Devices',
      growthFeature4: 'Priority High-Throughput Webhooks',
      growthFeature5: 'Staff RBAC (Admin, Manager, Viewer)',
      growthFeature6: '24/7 Priority Telegram & WhatsApp Support',
      growthBadge: 'POPULAR CHOICE',
      enterpriseName: 'Enterprise',
      enterprisePrice: '৳ 4,999',
      enterpriseDesc: 'Designed for high-volume marketplaces, corporate retailers, and fintech aggregators.',
      enterpriseRate: '৳0.08',
      enterpriseFeature1: '50,000 Verification Credits included',
      enterpriseFeature2: 'Unlimited Brands & Stores',
      enterpriseFeature3: 'Unlimited Android Sync Devices',
      enterpriseFeature4: 'Dedicated Outbound Webhook Cluster',
      enterpriseFeature5: 'Custom SLA & 99.99% Guaranteed Uptime',
      enterpriseFeature6: 'Dedicated Account Engineer',
      choosePlan: 'Select Plan'
    },
    calculator: {
      title: 'Calculate Your Monthly Fee Savings',
      subtitle: 'Compare traditional 2.0% - 2.5% gateway deductions against DenaNeya v2.0 flat micro-credits.',
      monthlyVolumeLabel: 'Expected Monthly Invoices:',
      aovLabel: 'Average Order Value (AOV in BDT):',
      calculatedGMV: 'Estimated Monthly GMV Volume:',
      traditionalFeeLabel: 'Traditional Gateway Cut (2.2% Avg):',
      traditionalFeeDetail: 'Includes payment aggregator fees, VAT, and processing deductions.',
      denaneyaFeeLabel: 'DenaNeya v2.0 Credit Cost:',
      denaneyaFeeDetail: 'Flat verification credits only. Zero percentage taken from your sales.',
      monthlySavingsLabel: 'Monthly Cash Kept in Pocket:',
      yearlySavingsLabel: 'Estimated Annual Cash Saved:',
      effectiveSavingsRate: '98.5% Cost Reduction',
      comparisonNote: 'Merchants processing ৳1,000,000/month save over ৳21,000 every single month with DenaNeya.'
    },
    docs: {
      title: 'Developer REST API Reference',
      subtitle: 'Integrate automated payment reconciliation into your custom web, mobile, or backend stack in minutes.',
      quickstart: 'Quick Integration Guide',
      baseUrls: 'Base URLs',
      authHeaders: 'Authentication Headers',
      endpointsTitle: 'Core S2S Endpoints',
      requestBody: 'Request Payload',
      responseBody: 'Response Payload',
      copyCode: 'Copy Snippet',
      tabCurl: 'cURL',
      tabNode: 'Node.js',
      tabPython: 'Python',
      tabPhp: 'PHP'
    },
    checkout: {
      secureCheckout: 'Secure Hosted Checkout',
      invoiceNo: 'Invoice No',
      merchantLabel: 'Merchant Store',
      amountToPay: 'Payable Amount',
      expiresIn: 'Invoice Expires In',
      selectMethod: 'Select Payment Method',
      tabUssd: 'USSD / App Guide',
      tabQr: 'Scan QR Code',
      ussdInstructions: 'Follow these steps to complete payment:',
      step1: 'Dial the USSD code on your registered SIM or open the official MFS app.',
      step2: 'Select the designated transfer option:',
      step3: 'Send exact payment to the following account:',
      step4: 'Input the exact invoice amount:',
      step5: 'Enter invoice reference number if prompted, and input your secret PIN to confirm.',
      recipientNumber: 'Account Number',
      copyNumber: 'Copy Number',
      copiedAlert: 'Number copied to clipboard!',
      dialUssd: 'Tap to Dial USSD',
      trxIdLabel: 'Enter Transaction ID (TrxID):',
      trxIdPlaceholder: 'e.g. 75TD2K9J or BKB84L091Q',
      trxIdHelp: 'You will receive the TrxID in the SMS confirmation from the provider immediately after sending money.',
      verifyButton: 'Verify Payment Now',
      verifying: 'Reconciling Transaction...',
      statusWaiting: 'Waiting for your payment...',
      statusPolling: 'Auto-detecting payment confirmation in real time...',
      paymentSuccessTitle: 'Payment Successfully Completed!',
      paymentSuccessDesc: 'Your payment has been atomically verified and settled.',
      trxVerified: 'Transaction ID:',
      paidAmount: 'Amount Paid:',
      paymentChannel: 'Channel:',
      paidAt: 'Verified At:',
      redirectCountdown: 'Redirecting back to merchant in',
      invoiceExpiredTitle: 'Invoice Expired',
      invoiceExpiredDesc: 'This invoice has exceeded its 15-minute security window. Please generate a new invoice.',
      errorInvalidTrx: 'Verification failed. Please check your TrxID and ensure exact amount was sent.',
      errorGeneric: 'Unable to communicate with the reconciliation server. Please retry.',
      sslNote: '🔒 256-Bit Military Grade Encryption • Powered by DenaNeya v2.0 Engine'
    },
    footer: {
      tagline: 'Autonomous payment infrastructure powering the next generation of Bangladeshi digital commerce.',
      rights: 'All rights reserved. DenaNeya v2.0.',
      productHeading: 'Product',
      resourcesHeading: 'Developers',
      securityHeading: 'Compliance',
      privacy: 'Privacy Policy',
      terms: 'Terms of Service',
      securityPolicy: 'Security & Bug Bounty',
      documentation: 'API Documentation',
      apiStatus: 'System Status: 100% Operational',
      pciCompliance: 'Zero-Storage Card Compliant',
      isoStandard: 'OWASP Top 10 Hardened'
    }
  },
  bn: {
    common: {
      brandName: 'দেনা নেয়া ভার্সন ২.০',
      tagline: 'বাংলাদেশের আধুনিক মার্চেন্টদের জন্য স্বয়ংক্রিয় পেমেন্ট অটোমেশন প্ল্যাটফর্ম',
      getStarted: 'ফ্রিতে শুরু করুন',
      login: 'লগইন',
      dashboard: 'মার্চেন্ট ড্যাশবোর্ড',
      viewDocs: 'এপিআই ডকুমেন্টেশন',
      tryDemo: 'পেমেন্ট টেস্ট করুন',
      bdtSymbol: '৳',
      currencyBdt: 'টাকা',
      copy: 'কপি',
      copied: 'কপি হয়েছে!',
      learnMore: 'বিস্তারিত জানুন',
      contactSales: 'সেলস টিম',
      loading: 'লোড হচ্ছে...'
    },
    nav: {
      features: 'ফিচারসমূহ',
      channels: '৫২+ চ্যানেল',
      pricing: 'প্রাইসিং',
      docs: 'ডেভেলপার এপিআই',
      calculator: 'সেভিংস ক্যালকুলেটর',
      signIn: 'লগইন করুন',
      merchantPortal: 'ড্যাশবোর্ডে যান'
    },
    hero: {
      badge: 'ভার্সন ২.০ এন্টারপ্রাইজ রিলিজ • ডুয়াল-ক্লাউড রেডি',
      titleLine1: 'বিকাশ, নগদ ও রকেটে পেমেন্ট নিন',
      titleHighlight: '০% গেটওয়ে কমিশনে',
      titleLine2: 'সরাসরি আপনার নিজস্ব পার্সোনাল ও মার্চেন্ট ওয়ালেটে',
      subtitle: 'যেকোনো পার্সোনাল বা মার্চেন্ট সিমকে বানিয়ে ফেলুন স্বয়ংক্রিয় পেমেন্ট গেটওয়ে। মধ্যস্বত্বভোগীদের ২.৫% কমিশন ছাড়াই তাৎক্ষণিক SMS ভেরিফিকেশন ও মিলি-সেকেন্ড HMAC সিকিউরড ওয়েব হুক।',
      ctaPrimary: 'বিনা খরচে শুরু করুন',
      ctaSecondary: 'ইন্টারেক্টিভ এপিআই ডক্স',
      trustText: '২,৪০০+ অনলাইন ব্যবসা ও স্টার্টআপের প্রতি মাসে ৫০+ কোটি টাকার ট্রানজেকশন সুরক্ষিত রাখছে।',
      statProcessed: '৳ ৫০ কোটি+',
      statProcessedLabel: 'প্রসেসড ভলিউম',
      statUptime: '৯৯.৯৮%',
      statUptimeLabel: 'রিকনসিলিয়েশন আপটাইম',
      statFee: '০.০০%',
      statFeeLabel: 'মার্চেন্ট কমিশন',
      statGateways: '৫২+',
      statGatewaysLabel: 'পেমেন্ট চ্যানেল'
    },
    valueProps: {
      title: 'বাংলাদেশের হাই-গ্রোথ ব্যবসার জন্য বিশেষভাবে নির্মিত',
      subtitle: 'গেটওয়ে চার্জ বাঁচিয়ে লাভ দ্বিগুণ করুন, উপভোগ করুন ব্যাংক-লেভেল নির্ভরযোগ্যতা ও অটোমেটেড চেকআউট।',
      prop1Title: '০% গেটওয়ে কমিশন',
      prop1Desc: 'আপনার বিক্রির পুরো টাকাই আপনার। গতানুগতিক গেটওয়ে যেখানে ১.৮% থেকে ২.৫% কেটে নেয়, দেনা নেয়াতে প্রতি ট্রানজেকশনে খরচ মাত্র কয়েক পয়সা।',
      prop2Title: 'রিয়েল-টাইম অ্যান্ড্রয়েড SMS সিঙ্ক',
      prop2Desc: 'আমাদের ক্যারিয়ার-ভেরিফাইড ব্যাকগ্রাউন্ড সিঙ্ক ইঞ্জিন আপনার অ্যান্ড্রয়েড ফোন থেকে সরাসরি মাত্র ৮০০ মিলি-সেকেন্ডে SMS রিসিভ ও ম্যাচ করে।',
      prop3Title: 'ক্যারিয়ার-গ্রেড অ্যান্টি-এক্সপ্লয়েট সিকিউরিটি',
      prop3Desc: '১৩টি অডিটেড সিকিউরিটি রিস্ক থেকে সম্পূর্ণ সুরক্ষিত: অটোমিক CAS ডাবল-স্পেন্ড রোধ, প্রাইভেট আইপি SSRF ফায়ারওয়াল ও ক্যাশ-আউট ব্ল্যাকলিস্ট।',
      prop4Title: '৫২+ চ্যানেল: মোবাইল, ব্যাংক ও ক্রিপ্টো',
      prop4Desc: 'কাস্টমারকে দিন পেমেন্টের সর্বোচ্চ স্বাধীনতা: বিকাশ, নগদ, রকেট, সেলফিন, ১১টি কমার্শিয়াল ব্যাংক ট্রান্সফার, বাংলা কিউআর ও স্ট্রাইপ।',
    },
    features: {
      title: 'পরীক্ষিত ও অত্যন্ত শক্তিশালী ফিনটেক আর্কিটেকচার',
      subtitle: 'নিরাপত্তা, উচ্চ কনকারেন্সি ও শতভাগ নিখুঁত রিকনসিলিয়েশন নিশ্চিত করার জন্য তৈরি।',
      casTitle: 'অটোমিক CAS রিকনসিলিয়েশন',
      casDesc: 'ACID ট্রানজেকশনের মাধ্যমে সিঙ্গেল-কনজিউমার গ্যারান্টি দেয়। ফ্ল্যাশ সেলের সময়ও কোনো ডাবল-স্পেন্ড হওয়া অসম্ভব।',
      casBadge: 'জিরো ডাবল-স্পেন্ড',
      smsTitle: 'ক্যারিয়ার হেডার ভেরিফিকেশন',
      smsDesc: 'অরিজিনাল টেলকো শর্টকোড (bKash, Nagad, 16216, Upay) যাচাই করে এবং ভুয়া SMS বা ডেবিট অ্যালার্ট স্বয়ংক্রিয়ভাবে বাতিল করে।',
      smsBadge: 'স্পুফিং প্রতিরোধী',
      webhookTitle: 'HMAC-SHA256 সাইনড ওয়েব হুক',
      webhookDesc: 'টাইমস্ট্যাম্প রিপ্লে প্রোটেকশন ও SSRF ফিল্টারিং সহ প্রতিটি পেমেন্টের তাৎক্ষণিক ক্রিপ্টোগ্রাফিক নোটিফিকেশন।',
      webhookBadge: 'রিপ্লে-প্রুফ',
      ttlTitle: '১৫-মিনিট অটো ইনভয়েস TTL',
      ttlDesc: 'অটোমেটেড ইনভয়েস এক্সপায়ারি রিপার পুরনো ট্রানজেকশনের ভুয়া দাবি রোধ করে এবং নিরাপত্তা নিশ্চিত করে।',
      ttlBadge: 'অটো রিপার',
      s2sTitle: 'সার্ভার-টু-সার্ভার ২-স্টেপ এপিআই',
      s2sDesc: 'কাস্টম ই-কমার্স, ERP বা সফটওয়্যার ইন্টিগ্রেশনের জন্য শক্তিশালী /v1/trx/verify এবং confirm এন্ডপয়েন্ট।',
      s2sBadge: 'ডেভেলপার ফ্রেন্ডলি',
      rbacTitle: 'মাল্টি-টেন্যান্ট স্টাফ পারমিশন',
      rbacDesc: '১০টি ড্যাশবোর্ড মডিউলে ওনার, অ্যাডমিন, ম্যানেজার ও ভিউয়ার রোলের মাধ্যমে কঠোর ডাটা আইসোলেশন।',
      rbacBadge: 'কঠোর নিরাপত্তা'
    },
    channels: {
      title: 'বিশাল ৫২+ পেমেন্ট চ্যানেলের পূর্ণাঙ্গ লাইব্রেরি',
      subtitle: 'বাংলাদেশের প্রতিটি MFS ও কমার্শিয়াল ব্যাংক এবং আন্তর্জাতিক চ্যানেল এক ক্লিকেই মার্চেন্টদের জন্য প্রস্তুত।',
      tabAll: 'সকল চ্যানেল (৫২)',
      tabMobile: 'মোবাইল ও MFS (৩৩)',
      tabInternational: 'আন্তর্জাতিক ও ক্রিপ্টো (৮)',
      tabBank: 'ব্যাংক অ্যাকাউন্টস (১১)',
      searchPlaceholder: 'গেটওয়ের নাম, কোড দিয়ে খুঁজুন (যেমন: বিকাশ, *২৪৭#, রকেট, IBBL)...',
      noResults: 'আপনার সার্চ অনুযায়ী কোনো গেটওয়ে খুঁজে পাওয়া যায়নি।',
      ussdTag: 'USSD কোড',
      accountTypes: 'সমর্থিত অ্যাকাউন্ট',
      totalChannels: 'মোট প্রদর্শিত চ্যানেল'
    },
    pricing: {
      title: 'স্বচ্ছ ও সহজ ক্রেডিট ভিত্তিক প্রাইসিং',
      subtitle: 'কোনো হিডেন চার্জ বা মাসিক সেটআপের ফাঁদ নেই। প্রতি সফল ট্রানজেকশনে খরচ মাত্র কয়েক পয়সা।',
      monthly: '/প্রতি মাস',
      perVerif: 'প্রতি সফল ভেরিফিকেশন',
      freeForever: 'শুরু করুন ফ্রিতে',
      starterName: 'শুরুয়াত (Starter)',
      starterPrice: '৳ ০',
      starterDesc: 'নতুন ব্যবসা, ফেসবুক পেজ ও ড্রপশিপিংয়ের জন্য একদম নিখুঁত।',
      starterRate: '৳০.২০',
      starterFeature1: '৫০০টি ফ্রি ভেরিফিকেশন ক্রেডিট উপহার',
      starterFeature2: '১টি ব্র্যান্ড / স্টোর সেটআপ',
      starterFeature3: '১টি অ্যান্ড্রয়েড SMS সিঙ্ক ডিভাইস',
      starterFeature4: 'স্ট্যান্ডার্ড ওয়েব হুক সাপোর্ট',
      starterFeature5: 'হোস্টেড চেকআউট ও কিউআর কোড',
      growthName: 'গ্রোথ (Growth - সর্বাধিক জনপ্রিয়)',
      growthPrice: '৳ ১,৫০০',
      growthDesc: 'দ্রুত বর্ধনশীল ব্র্যান্ড, লাইভ সেলার ও স্টার্টআপদের জন্য সেরা সমাধান।',
      growthRate: '৳০.১৫',
      growthFeature1: '১২,০০০ ভেরিফিকেশন ক্রেডিট অন্তর্ভুক্ত',
      growthFeature2: '৫টি ব্র্যান্ড / মাল্টি-টেন্যান্ট সাপোর্ট',
      growthFeature3: '৩টি অ্যান্ড্রয়েড সিঙ্ক ডিভাইস কানেকশন',
      growthFeature4: 'হাই-স্পিড প্রায়োরিটি ওয়েব হুক',
      growthFeature5: 'স্টাফ RBAC রোল কন্ট্রোল (Admin, Manager)',
      growthFeature6: '২৪/৭ সরাসরি টেলিগ্রাম ও হোয়াটসঅ্যাপ সাপোর্ট',
      growthBadge: 'সবচেয়ে জনপ্রিয়',
      enterpriseName: 'এন্টারপ্রাইজ (Enterprise)',
      enterprisePrice: '৳ ৪,৯৯৯',
      enterpriseDesc: 'লার্জ মার্কেটপ্লেস, কর্পোরেট রিটেইলার ও পেমেন্ট এগ্রিগেটরদের জন্য।',
      enterpriseRate: '৳০.০৮',
      enterpriseFeature1: '৫০,০০০ ভেরিফিকেশন ক্রেডিট অন্তর্ভুক্ত',
      enterpriseFeature2: 'আনলিমিটেড ব্র্যান্ড ও স্টোর',
      enterpriseFeature3: 'আনলিমিটেড ডিভাইস সিঙ্কিং',
      enterpriseFeature4: 'ডেডিকেটেড ক্লাউড ওয়েব হুক ক্লাস্টার',
      enterpriseFeature5: 'কাস্টম এসএলএ ও ৯৯.৯৯% গ্যারান্টিড আপটাইম',
      enterpriseFeature6: 'ডেডিকেটেড টেকনিক্যাল অ্যাকাউন্ট ইঞ্জিনিয়ার',
      choosePlan: 'প্ল্যান বেছে নিন'
    },
    calculator: {
      title: 'আপনার মাসিক খরচের সাশ্রয় হিসেব করুন',
      subtitle: 'গতানুগতিক ২.২% গেটওয়ে কমিশনের সাথে দেনা নেয়ার ফ্ল্যাট ক্রেডিটের তুলনামূলক হিসেব দেখুন।',
      monthlyVolumeLabel: 'প্রতি মাসে সম্ভাব্য ইনভয়েস সংখ্যা:',
      aovLabel: 'গড় অর্ডার ভ্যালু (টাকায়):',
      calculatedGMV: 'সম্ভাব্য মাসিক মোট বিক্রয় (GMV):',
      traditionalFeeLabel: 'সাধারণ গেটওয়ের খরচ (গড় ২.২%):',
      traditionalFeeDetail: 'সাধারণ পেমেন্ট গেটওয়ের ১.৮% থেকে ২.৫% কমিশন ও অন্যান্য ফি।',
      denaneyaFeeLabel: 'দেনা নেয়া ২.০ এর মোট খরচ:',
      denaneyaFeeDetail: 'শুধুমাত্র নামমাত্র ক্রেডিট চার্জ। বিক্রয় থেকে কোনো পার্সেন্টেজ কাটা হয় না।',
      monthlySavingsLabel: 'প্রতি মাসে সরাসরি সাশ্রয়:',
      yearlySavingsLabel: 'বছরে আনুমানিক মোট সাশ্রয়:',
      effectiveSavingsRate: '৯৮.৫% পর্যন্ত ফি সাশ্রয়',
      comparisonNote: 'প্রতি মাসে ১০ লাখ টাকা বিক্রয়ে সাধারণ গেটওয়ে নেয় ২২,০০০+ টাকা, দেনা নেয়াতে খরচ মাত্র ১,৫০০ টাকা!'
    },
    docs: {
      title: 'ডেভেলপার REST API রেফারেন্স',
      subtitle: 'কয়েক মিনিটেই যেকোনো ওয়েবসাইট, মোবাইল অ্যাপ বা কাস্টম ব্যাকএন্ডে যুক্ত করুন দেনা নেয়ার অটোমেশন।',
      quickstart: 'কুইক ইন্টিগ্রেশন গাইড',
      baseUrls: 'বেস ইউআরএল (Base URLs)',
      authHeaders: 'অথেনটিকেশন হেডার',
      endpointsTitle: 'মূল S2S এন্ডপয়েন্টসমূহ',
      requestBody: 'রিকোয়েস্ট বডি (Request Body)',
      responseBody: 'রেসপন্স বডি (Response Body)',
      copyCode: 'কোড কপি করুন',
      tabCurl: 'cURL',
      tabNode: 'Node.js',
      tabPython: 'Python',
      tabPhp: 'PHP'
    },
    checkout: {
      secureCheckout: 'সুরক্ষিত হোস্টেড চেকআউট',
      invoiceNo: 'ইনভয়েস নম্বর',
      merchantLabel: 'মার্চেন্ট স্টোর',
      amountToPay: 'মোট প্রদেয় টাকা',
      expiresIn: 'পেমেন্টের সময় বাকি',
      selectMethod: 'পেমেন্ট মাধ্যম বেছে নিন',
      tabUssd: 'USSD / অ্যাপ নির্দেশিকা',
      tabQr: 'QR কোড স্ক্যান করুন',
      ussdInstructions: 'নিচের ধাপগুলো অনুসরণ করে পেমেন্ট সম্পন্ন করুন:',
      step1: 'আপনার ফোনে USSD কোড ডায়াল করুন অথবা অফিশিয়াল অ্যাপ ওপেন করুন।',
      step2: 'সঠিক মেনু অপশন সিলেক্ট করুন:',
      step3: 'নিচের নম্বরে নির্ধারিত টাকা পাঠান:',
      step4: 'ইনভয়েসের সমপরিমাণ টাকার অঙ্ক লিখুন:',
      step5: 'রেফারেন্স চাইলে ইনভয়েস নম্বর দিন এবং গোপন পিন (PIN) দিয়ে কনফার্ম করুন।',
      recipientNumber: 'অ্যাকাউন্ট নম্বর',
      copyNumber: 'নম্বর কপি করুন',
      copiedAlert: 'নম্বর ক্লিপবোর্ডে কপি করা হয়েছে!',
      dialUssd: 'USSD ডায়াল করতে ট্যাপ করুন',
      trxIdLabel: 'ট্রানজেকশন আইডি (TrxID) লিখুন:',
      trxIdPlaceholder: 'যেমন: 75TD2K9J বা BKB84L091Q',
      trxIdHelp: 'টাকা পাঠানোর পর প্রোভাইডার থেকে প্রাপ্ত ফিরতি SMS-এ এই TrxID পাবেন।',
      verifyButton: 'পেমেন্ট ভেরিফাই করুন',
      verifying: 'ট্রানজেকশন যাচাই করা হচ্ছে...',
      statusWaiting: 'আপনার পেমেন্টের অপেক্ষায়...',
      statusPolling: 'স্বয়ংক্রিয়ভাবে পেমেন্ট ডিটেক্ট করা হচ্ছে...',
      paymentSuccessTitle: 'পেমেন্ট সফলভাবে সম্পন্ন হয়েছে!',
      paymentSuccessDesc: 'আপনার ট্রানজেকশন সফলভাবে ভেরিফাই ও সেটেল হয়েছে।',
      trxVerified: 'ট্রানজেকশন আইডি:',
      paidAmount: 'পরিশোধিত টাকা:',
      paymentChannel: 'পেমেন্ট চ্যানেল:',
      paidAt: 'ভেরিফিকেশনের সময়:',
      redirectCountdown: 'মার্চেন্ট ওয়েবসাইটে রিডাইরেক্ট হচ্ছে',
      invoiceExpiredTitle: 'ইনভয়েসের মেয়াদ শেষ',
      invoiceExpiredDesc: 'নিরাপত্তার স্বার্থে এই ইনভয়েসের ১৫ মিনিটের মেয়াদ উত্তীর্ণ হয়েছে। দয়া করে নতুন ইনভয়েস তৈরি করুন।',
      errorInvalidTrx: 'ভেরিফিকেশন ব্যর্থ হয়েছে। ট্রানজেকশন আইডি ও টাকার পরিমাণ চেক করে আবার চেষ্টা করুন।',
      errorGeneric: 'সার্ভারের সাথে সংযোগে সমস্যা হয়েছে। আবার চেষ্টা করুন।',
      sslNote: '🔒 ২৫৬-বিট মিলিটারি গ্রেড এনক্রিপশন • দেনা নেয়া ভার্সন ২.০ ইঞ্জিন'
    },
    footer: {
      tagline: 'বাংলাদেশের ডিজিটাল কমার্সকে নতুন গতি দিতে স্বয়ংক্রিয় পেমেন্ট অবকাঠামো।',
      rights: 'সর্বস্বত্ব সংরক্ষিত। দেনা নেয়া ভার্সন ২.০।',
      productHeading: 'প্রোডাক্ট',
      resourcesHeading: 'রিসোর্স ও ডক্স',
      securityHeading: 'কমপ্লায়েন্স',
      privacy: 'প্রাইভেসি পলিসি',
      terms: 'শর্তাবলী',
      securityPolicy: 'সিকিউরিটি ও বাগ বাউন্টি',
      documentation: 'এপিআই ডক্স',
      apiStatus: 'সিস্টেম স্ট্যাটাস: ১০০% সচল',
      pciCompliance: 'জিরো-স্টোরেজ কমপ্লায়েন্ট',
      isoStandard: 'OWASP Top 10 সিকিউরড'
    }
  }
};
