import type { Metadata } from 'next';
import { Inter, Hind_Siliguri } from 'next/font/google';
import './globals.css';
import { LanguageProvider } from '../components/LanguageContext';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap'
});

const hindSiliguri = Hind_Siliguri({
  weight: ['400', '500', '600', '700'],
  subsets: ['bengali'],
  variable: '--font-hind-siliguri',
  display: 'swap'
});

export const metadata: Metadata = {
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="bn" className={`${inter.variable} ${hindSiliguri.variable}`}>
      <body className="bg-white text-slate-900 antialiased selection:bg-indigo-500 selection:text-white min-h-screen flex flex-col">
        <LanguageProvider>
          <Navbar />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
        </LanguageProvider>
      </body>
    </html>
  );
}
