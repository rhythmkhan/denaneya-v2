"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.default = RootLayout;
const google_1 = require("next/font/google");
require("./globals.css");
const LanguageContext_1 = require("../components/LanguageContext");
const Navbar_1 = require("../components/Navbar");
const Footer_1 = require("../components/Footer");
const inter = (0, google_1.Inter)({
    subsets: ['latin'],
    variable: '--font-inter',
    display: 'swap'
});
const hindSiliguri = (0, google_1.Hind_Siliguri)({
    weight: ['400', '500', '600', '700'],
    subsets: ['bengali'],
    variable: '--font-hind-siliguri',
    display: 'swap'
});
exports.metadata = {
    title: 'DenaNeya v2.0 | দেনা নেয়া - 0% Commission Payment Automation Platform',
    description: 'Enterprise payment automation engine for Bangladesh. Automate bKash, Nagad, Rocket & 52+ channels with zero gateway cuts and real-time SMS reconciliation.',
    keywords: ['bKash payment gateway', 'Nagad payment automation', '0% commission gateway', 'Rocket payment API', 'Bangla QR', 'DenaNeya v2.0'],
    openGraph: {
        title: 'DenaNeya v2.0 - 0% Commission Payment Automation',
        description: 'Transform personal & merchant SIMs into carrier-grade automated payment gateways in Bangladesh.',
        url: 'https://denaneya.com',
        siteName: 'DenaNeya v2.0',
        locale: 'bn_BD',
        type: 'website'
    },
    twitter: {
        card: 'summary_large_image',
        title: 'DenaNeya v2.0 - Autonomous Payment Engine',
        description: 'Automate bKash, Nagad & Rocket with 0% gateway commission.'
    }
};
function RootLayout({ children, }) {
    return (<html lang="bn" className={`${inter.variable} ${hindSiliguri.variable}`}>
      <body className="bg-white text-slate-900 antialiased selection:bg-indigo-500 selection:text-white min-h-screen flex flex-col">
        <LanguageContext_1.LanguageProvider>
          <Navbar_1.Navbar />
          <main className="flex-1">
            {children}
          </main>
          <Footer_1.Footer />
        </LanguageContext_1.LanguageProvider>
      </body>
    </html>);
}
//# sourceMappingURL=layout.js.map