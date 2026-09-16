# দেনা নেয়া ভার্সন টু (DenaNeya v2.0)
> **Next-Generation Enterprise MFS Payment Automation & Merchant Settlement Platform**

![Node.js](https://img.shields.io/badge/Node.js-v18%2B-green.svg)
![React](https://img.shields.io/badge/React-18-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-14%2B-black.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)
![License](https://img.shields.io/badge/License-Proprietary-red.svg)
![Tests](https://img.shields.io/badge/Tests-528%20Passed-brightgreen.svg)

---

## 🌟 ওভারভিউ (Overview)

**দেনা নেয়া ভার্সন টু (DenaNeya v2.0)** হলো একটি হাই-পারফরম্যান্স, আর্কিটেকচারালি হার্ডেনড স্বয়ংক্রিয় পেমেন্ট গেটওয়ে ও মার্চেন্ট কালেকশন প্ল্যাটফর্ম। এটি সম্পূর্ণ স্বাধীনভাবে মোবাইল ব্যাংকিং (bKash, Nagad, Rocket, Upay), বাণিজ্যিক ব্যাংক ও আন্তর্জাতিক পেমেন্ট চ্যানেলগুলোর লেনদেন অ্যান্ড্রয়েড ডিভাইস এসএমএস ফরওয়ার্ডিং এবং সার্ভার-টু-সার্ভার রিকনসিলিয়েশনের মাধ্যমে স্বয়ংক্রিয়ভাবে ভেরিফাই করে।

প্ল্যাটফর্মটিতে প্রথাগত সিস্টেমের সকল সিকিউরিটি ঝুঁকি (IDOR, Concurrency Double-Spend, SMS Spoofing, SSRF, Amount Oracle) সমূলে নির্মূল করা হয়েছে।

---

## 🏗️ সিস্টেম আর্কিটেকচার (Monorepo Architecture)

```text
denaneya_v2/
├── apps/
│   ├── api/             # Core REST API Engine (Node.js Express, Helmet, Rate Limiters)
│   ├── dashboard/       # Merchant Management SPA (React 18 + Vite + Tailwind CSS)
│   └── web/             # Marketing & Docs Site (Next.js 14+ App Router, Bilingual)
├── packages/
│   ├── shared/          # BTRC Telecom Whitelist, MFS Regex Parsers, HMAC Signers, SSRF Firewall
│   └── database/        # 9 Relational Tables DDL (MySQL 8 & SQLite Dialects, 52-Gateway Catalog)
├── scripts/             # Playwright Chromium End-to-End Browser Client Simulation
└── tests/               # 528 Comprehensive Unit, Integration, Concurrency Stress & E2E Suites
```

---

## 🛡️ প্রধান সিকিউরিটি বৈশিষ্ট্যসমূহ (Security Features)

1. **Anti-IDOR Multi-Tenant Isolation**: প্রতিটি রিকোয়েস্টে সেশন-বাউন্ড টেন্যান্ট ফিল্টারিং ও জিরো-সিক্রেট প্রজেকশন (`api_secret` ও `webhook_secret` রেসপন্সে কখনো উন্মুক্ত হয় না)।
2. **Atomic CAS Concurrency**: পেমেন্ট ম্যাচিংয়ের ক্ষেত্রে ডাটাবেস লেভেলে Compare-and-Swap (Atomic CAS) ব্যবহারের ফলে একই TrxID দিয়ে সমসাময়িক একাধিক রিকোয়েস্ট করলেও কোনো ডাবল-স্পেন্ড বা রেস কন্ডিশন সম্ভব নয়।
3. **BTRC Whitelisted Telecom Masking**: অ্যান্ড্রয়েড ডিভাইস থেকে আসা এসএমএস যাচাইয়ে শুধুমাত্র অনুমোদিত টেলিযোগাযোগ প্রেরক আইডি (`bKash`, `16216`, `Nagad`, `16222`, `Upay`) গৃহীত হয়।
4. **Outbound Debit / Cash-Out Blacklist**: এসএমএসে ক্যাশ-আউট বা সেন্ড-মানি কিওয়ার্ড থাকলে তা স্বয়ংক্রিয়ভাবে বাতিল করা হয় (`Fee Tk 0.00` অনুমোদিত)।
5. **SSRF Pre-Flight DNS Pinning**: ওয়েবহুক পাঠানোর সময় ১৫টি প্রাইভেট সিআইডিআর সাবনেট ও মেটাডাটা আইপি ব্লক করা হয়।
6. **RFC 8785 Canonical Webhook HMAC-SHA256**: ৩০০ সেকেন্ডের রি-প্লে প্রোটেকশন ও ননস ভ্যালিডেশন সহ ক্রিপ্টোগ্রাফিক সিগনেচার।
7. **15-Minute Dynamic Invoice TTL**: প্রতিটি ইনভয়েসে সুনির্দিষ্ট ১৫ মিনিটের লাইফসাইকেল ও ব্যাকগ্রাউন্ড রিপার সার্ভিস।

---

## 💳 পেমেন্ট গেটওয়ে লাইব্রেরি (৫২+ চ্যানেল)

- **Mobile Banking (MFS)**: বিকাশ, নগদ, রকেট, উপায়, সেলফিন, ওকে ওয়ালেট, ট্যাপ, আমানত, শিওরক্যাশ ইত্যাদি।
- **International & Crypto**: স্ট্রাইপ, পেপ্যাল, বাইন্যান্স পে, ইউএসডিটি, পারফেক্ট মানি।
- **Commercial Bank**: সিটি ব্যাংক, ব্র্যাক ব্যাংক, ডাচ-বাংলা ব্যাংক, ইস্টার্ন ব্যাংক, ইসলামী ব্যাংক বাংলাদেশ ইত্যাদি।

---

## 🚀 লোকাল ডেভেলপমেন্ট (Local Setup)

```bash
# ১. ডিপেন্ডেন্সি ইনস্টল করুন
npm install

# ২. ডাটাবেস মাইগ্রেশন ও সীডার রান করুন
node -e "const { getDatabase, runMigrations, runSeed } = require('./packages/database'); const db = getDatabase(); runMigrations(db).then(() => runSeed(db, { seedAll52: true }));"

# ৩. এপিআই ইঞ্জিন চালু করুন (Port 4000)
npm run start --workspace=@denaneya/api

# ৪. মার্চেন্ট ড্যাশবোর্ড চালু করুন (Port 5173)
npm run dev --workspace=@denaneya/dashboard
```

---

## 🧪 টেস্ট এক্সিকিউশন (Automated Tests)

```bash
# সম্পূর্ণ E2E ও সিকিউরিটি টেস্ট স্যুট রান করতে:
node tests/e2e/master_e2e_runner.js

# ব্রাউজার ক্লায়েন্ট সিমুলেশন (Playwright):
python scripts/browser_client_journey_simulation.py
```

---

## 🌐 ডিপ্লয়মেন্ট (Production Deployment)

### Hostinger Unlimited
- **ডাটাবেস**: MySQL 8 (স্কিমা: `packages/database/src/migrations/001_initial_schema.mysql.sql`)
- **ব্যাকএন্ড ইঞ্জিন**: Node.js v18+ with PM2 (`pm2 start ecosystem.config.js`)
- **রিভার্স প্রক্সি**: Apache `.htaccess` (প্রি-কনফিগার করা আছে)

### Vercel
- **মার্চেন্ট ড্যাশবোর্ড**: React 18 SPA (`apps/dashboard` -> Build: `npm run build`, Output: `dist`)
- **পাবলিক ল্যান্ডিং ওয়েবসাইট**: Next.js 14 (`apps/web`)

---

## 📄 লাইসেন্স
© 2026 দেনা নেয়া (DenaNeya). সর্বস্বত্ব সংরক্ষিত।
