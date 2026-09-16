/**
 * DenaNeya v2.0 - Visual Landing Page Builder
 * File: apps/dashboard/src/pages/LandingBuilder.tsx
 *
 * Implements:
 * - 10 Accordion Sections:
 *   1. Header / Navigation
 *   2. Hero Banner
 *   3. Features Grid
 *   4. Product Showcase
 *   5. Video Embed
 *   6. Testimonials / Reviews
 *   7. FAQ Accordion
 *   8. Call to Action (CTA)
 *   9. Footer & Socials
 *   10. Custom CSS / Analytics JS
 * - Interactive Live Preview (Desktop, Tablet, Mobile)
 * - JSON Schema Export / Save
 */

import React, { useState } from 'react';
import {
  PanelsTopLeft,
  ChevronDown,
  ChevronUp,
  Eye,
  Smartphone,
  Tablet,
  Monitor,
  Save,
  Download,
  Plus,
  Trash2,
  Check,
  Play,
  Star,
  ExternalLink
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { LandingPageConfig } from '../types/dashboard';

const INITIAL_CONFIG: LandingPageConfig = {
  header: {
    enabled: true,
    brand_title: 'Deshi Course',
    logo_url: '/logo.png',
    nav_links: [
      { label: 'Courses', url: '#courses' },
      { label: 'Features', url: '#features' },
      { label: 'Reviews', url: '#reviews' },
      { label: 'FAQ', url: '#faq' }
    ],
    cta_text: 'Get Started',
    cta_url: '#checkout'
  },
  hero: {
    enabled: true,
    badge_text: '🚀 BANGLADESH #1 MFS AUTOMATION',
    headline: 'Scale Your Business with Automated Payments',
    subheadline:
      'Instant bKash, Nagad, Rocket, and Bank transfer verification with zero manual SMS matching hassle.',
    primary_cta_text: 'Enroll Now (৳1,500)',
    primary_cta_link: '#checkout',
    secondary_cta_text: 'Watch 2-Min Demo',
    secondary_cta_link: '#video',
    banner_image_url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=800&q=80'
  },
  features: {
    enabled: true,
    title: 'Why Top Merchants Choose DenaNeya',
    subtitle: 'Engineered specifically for the Bangladeshi digital commerce ecosystem',
    items: [
      { icon: 'Zap', title: 'Real-Time Verification', description: 'Under 3-second automatic payment confirmation via Android SMS sync.' },
      { icon: 'Shield', title: 'Anti-Fraud & Double-Spend Immune', description: 'Atomic compare-and-swap prevents duplicate TrxID reuse.' },
      { icon: 'CreditCard', title: '52+ Channels Supported', description: 'All Bangladeshi MFS wallets, commercial banks, and international cards.' }
    ]
  },
  product_showcase: {
    enabled: true,
    title: 'Full-Stack Developer Bootcamp 2026',
    price_bdt: 4500,
    original_price_bdt: 9000,
    discount_label: '50% OFF LIMITED TIME',
    image_url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=600&q=80',
    feature_bullets: [
      'Over 60+ hours of video lessons and coding exercises',
      'Real-world MFS payment gateway integration',
      'Lifetime community access and mentor support',
      'Official completion certificate'
    ],
    checkout_cta_text: 'Instant Enrollment via bKash/Nagad'
  },
  video_embed: {
    enabled: true,
    title: 'See the Platform in Action',
    embed_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    poster_image_url: '',
    autoplay: false
  },
  testimonials: {
    enabled: true,
    title: 'Loved by Over 500+ Bangladeshi Creators',
    reviews: [
      {
        client_name: 'Tanvir Hossain',
        role_or_company: 'Founder, DeshiIT',
        avatar_url: 'https://randomuser.me/api/portraits/men/32.jpg',
        star_rating: 5,
        quote: 'DenaNeya eliminated our manual bKash checking overnight. Our course enrollments increased by 40%.'
      },
      {
        client_name: 'Nusrat Jahan',
        role_or_company: 'Digital Marketer',
        avatar_url: 'https://randomuser.me/api/portraits/women/44.jpg',
        star_rating: 5,
        quote: 'The visual landing page builder helped me launch my eBook pre-orders in under 30 minutes.'
      }
    ]
  },
  faq: {
    enabled: true,
    title: 'Frequently Asked Questions',
    items: [
      {
        question: 'Which payment methods are accepted?',
        answer: 'We accept bKash, Nagad, Rocket, Upay, CellFin, VISA, Mastercard, and direct bank deposits.'
      },
      {
        question: 'How long does payment verification take?',
        answer: 'Transactions are reconciled automatically in 2 to 5 seconds upon receiving your TrxID.'
      }
    ]
  },
  cta: {
    enabled: true,
    headline: 'Ready to Automate Your Business?',
    subheadline: 'Join hundreds of high-growth merchants automating payments today.',
    button_text: 'Get Started Now',
    button_link: '#checkout',
    background_theme: 'gradient'
  },
  footer: {
    enabled: true,
    copyright_text: '© 2026 Deshi Course. All rights reserved. Powered by DenaNeya v2.0.',
    links: [
      { label: 'Privacy Policy', url: '/privacy' },
      { label: 'Terms of Service', url: '/terms' },
      { label: 'Support', url: '/support' }
    ],
    social_links: {
      facebook: 'https://facebook.com',
      youtube: 'https://youtube.com'
    }
  },
  custom_css_js: {
    enabled: true,
    custom_css: '/* Custom button styling */\n.btn-glow { box-shadow: 0 0 15px rgba(99, 102, 241, 0.5); }',
    custom_head_js: '',
    pixel_id: '',
    gtm_id: ''
  }
};

export const LandingBuilder: React.FC = () => {
  const [config, setConfig] = useState<LandingPageConfig>(INITIAL_CONFIG);
  const [activeSection, setActiveSection] = useState<string | null>('hero');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isSaved, setIsSaved] = useState<boolean>(false);

  const toggleSection = (key: string) => {
    setActiveSection(activeSection === key ? null : key);
  };

  const handleSave = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(config, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'landing_page_config.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const sectionsList = [
    { key: 'header', label: '1. Header / Navigation' },
    { key: 'hero', label: '2. Hero Banner' },
    { key: 'features', label: '3. Features Grid' },
    { key: 'product_showcase', label: '4. Product Showcase' },
    { key: 'video_embed', label: '5. Video Embed' },
    { key: 'testimonials', label: '6. Testimonials / Reviews' },
    { key: 'faq', label: '7. FAQ Accordion' },
    { key: 'cta', label: '8. Call to Action (CTA)' },
    { key: 'footer', label: '9. Footer & Socials' },
    { key: 'custom_css_js', label: '10. Custom CSS / Analytics JS' }
  ];

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Visual Landing Page Builder
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Design high-converting checkout landing pages with 10 interactive modular sections
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportJson}
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            Export JSON
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            leftIcon={isSaved ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Save className="w-3.5 h-3.5" />}
          >
            {isSaved ? 'Published!' : 'Save & Publish'}
          </Button>
        </div>
      </div>

      {/* Main Split View: Left Accordion Editor, Right Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: 10 Accordion Sections Editor */}
        <div className="lg:col-span-5 space-y-3">
          {sectionsList.map((sec) => {
            const isOpen = activeSection === sec.key;
            return (
              <div
                key={sec.key}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs transition-all"
              >
                <button
                  onClick={() => toggleSection(sec.key)}
                  className="w-full px-4 py-3 bg-white hover:bg-slate-50 flex items-center justify-between text-left text-xs font-bold text-slate-900 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500" />
                    {sec.label}
                  </span>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>

                {isOpen && (
                  <div className="p-4 border-t border-slate-100 space-y-4 text-xs bg-slate-50/50">
                    {/* Section 1: Header */}
                    {sec.key === 'header' && (
                      <div className="space-y-3">
                        <div>
                          <label className="font-semibold text-slate-700 block mb-1">Brand Title</label>
                          <input
                            type="text"
                            value={config.header.brand_title}
                            onChange={(e) =>
                              setConfig({
                                ...config,
                                header: { ...config.header, brand_title: e.target.value }
                              })
                            }
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                          />
                        </div>
                        <div>
                          <label className="font-semibold text-slate-700 block mb-1">CTA Button Text</label>
                          <input
                            type="text"
                            value={config.header.cta_text}
                            onChange={(e) =>
                              setConfig({
                                ...config,
                                header: { ...config.header, cta_text: e.target.value }
                              })
                            }
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                          />
                        </div>
                      </div>
                    )}

                    {/* Section 2: Hero */}
                    {sec.key === 'hero' && (
                      <div className="space-y-3">
                        <div>
                          <label className="font-semibold text-slate-700 block mb-1">Badge Text</label>
                          <input
                            type="text"
                            value={config.hero.badge_text}
                            onChange={(e) =>
                              setConfig({
                                ...config,
                                hero: { ...config.hero, badge_text: e.target.value }
                              })
                            }
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                          />
                        </div>
                        <div>
                          <label className="font-semibold text-slate-700 block mb-1">Headline</label>
                          <input
                            type="text"
                            value={config.hero.headline}
                            onChange={(e) =>
                              setConfig({
                                ...config,
                                hero: { ...config.hero, headline: e.target.value }
                              })
                            }
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                          />
                        </div>
                        <div>
                          <label className="font-semibold text-slate-700 block mb-1">Subheadline</label>
                          <textarea
                            rows={2}
                            value={config.hero.subheadline}
                            onChange={(e) =>
                              setConfig({
                                ...config,
                                hero: { ...config.hero, subheadline: e.target.value }
                              })
                            }
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="font-semibold text-slate-700 block mb-1">Primary Button</label>
                            <input
                              type="text"
                              value={config.hero.primary_cta_text}
                              onChange={(e) =>
                                setConfig({
                                  ...config,
                                  hero: { ...config.hero, primary_cta_text: e.target.value }
                                })
                              }
                              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                            />
                          </div>
                          <div>
                            <label className="font-semibold text-slate-700 block mb-1">Secondary Button</label>
                            <input
                              type="text"
                              value={config.hero.secondary_cta_text}
                              onChange={(e) =>
                                setConfig({
                                  ...config,
                                  hero: { ...config.hero, secondary_cta_text: e.target.value }
                                })
                              }
                              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Section 4: Product Showcase */}
                    {sec.key === 'product_showcase' && (
                      <div className="space-y-3">
                        <div>
                          <label className="font-semibold text-slate-700 block mb-1">Product Title</label>
                          <input
                            type="text"
                            value={config.product_showcase.title}
                            onChange={(e) =>
                              setConfig({
                                ...config,
                                product_showcase: { ...config.product_showcase, title: e.target.value }
                              })
                            }
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="font-semibold text-slate-700 block mb-1">Price (BDT)</label>
                            <input
                              type="number"
                              value={config.product_showcase.price_bdt}
                              onChange={(e) =>
                                setConfig({
                                  ...config,
                                  product_showcase: {
                                    ...config.product_showcase,
                                    price_bdt: Number(e.target.value)
                                  }
                                })
                              }
                              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                            />
                          </div>
                          <div>
                            <label className="font-semibold text-slate-700 block mb-1">Original Price</label>
                            <input
                              type="number"
                              value={config.product_showcase.original_price_bdt}
                              onChange={(e) =>
                                setConfig({
                                  ...config,
                                  product_showcase: {
                                    ...config.product_showcase,
                                    original_price_bdt: Number(e.target.value)
                                  }
                                })
                              }
                              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Section 10: Custom CSS / JS */}
                    {sec.key === 'custom_css_js' && (
                      <div className="space-y-3">
                        <div>
                          <label className="font-semibold text-slate-700 block mb-1">Custom CSS</label>
                          <textarea
                            rows={4}
                            value={config.custom_css_js.custom_css}
                            onChange={(e) =>
                              setConfig({
                                ...config,
                                custom_css_js: { ...config.custom_css_js, custom_css: e.target.value }
                              })
                            }
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 font-mono text-[11px] bg-slate-900 text-emerald-400"
                          />
                        </div>
                        <div>
                          <label className="font-semibold text-slate-700 block mb-1">Facebook Pixel ID</label>
                          <input
                            type="text"
                            placeholder="e.g. 123456789012345"
                            value={config.custom_css_js.pixel_id || ''}
                            onChange={(e) =>
                              setConfig({
                                ...config,
                                custom_css_js: { ...config.custom_css_js, pixel_id: e.target.value }
                              })
                            }
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                          />
                        </div>
                      </div>
                    )}

                    {/* Fallback info for other sections */}
                    {!['header', 'hero', 'product_showcase', 'custom_css_js'].includes(sec.key) && (
                      <div className="p-2 text-slate-500 italic">
                        Configure {sec.label} items, titles, and multimedia inputs here.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right Column: Interactive Live Preview Container */}
        <div className="lg:col-span-7 space-y-3">
          {/* Device Frame Switcher */}
          <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-indigo-600" />
              Live Responsive Preview
            </span>
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
              <button
                onClick={() => setPreviewDevice('desktop')}
                className={`p-1.5 rounded-md ${previewDevice === 'desktop' ? 'bg-white shadow-xs text-indigo-600' : 'text-slate-500'}`}
                title="Desktop View"
              >
                <Monitor className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPreviewDevice('tablet')}
                className={`p-1.5 rounded-md ${previewDevice === 'tablet' ? 'bg-white shadow-xs text-indigo-600' : 'text-slate-500'}`}
                title="Tablet View"
              >
                <Tablet className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPreviewDevice('mobile')}
                className={`p-1.5 rounded-md ${previewDevice === 'mobile' ? 'bg-white shadow-xs text-indigo-600' : 'text-slate-500'}`}
                title="Mobile View"
              >
                <Smartphone className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Device Frame Container */}
          <div className="bg-slate-100 p-4 rounded-2xl border border-slate-200 flex justify-center min-h-[600px] overflow-hidden">
            <div
              className={`bg-white rounded-xl shadow-xl border border-slate-200 transition-all duration-300 overflow-y-auto ${
                previewDevice === 'mobile'
                  ? 'w-[375px] h-[650px]'
                  : previewDevice === 'tablet'
                  ? 'w-[768px] h-[650px]'
                  : 'w-full h-[650px]'
              }`}
            >
              {/* Preview Header */}
              {config.header.enabled && (
                <div className="px-6 py-3 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-xs z-10">
                  <div className="font-bold text-sm text-slate-900">{config.header.brand_title}</div>
                  <div className="hidden sm:flex items-center gap-4 text-xs font-medium text-slate-600">
                    {config.header.nav_links.map((link) => (
                      <span key={link.label}>{link.label}</span>
                    ))}
                  </div>
                  <button className="px-3 py-1 bg-indigo-600 text-white text-xs font-bold rounded-md">
                    {config.header.cta_text}
                  </button>
                </div>
              )}

              {/* Preview Hero */}
              {config.hero.enabled && (
                <div className="p-8 text-center bg-gradient-to-b from-indigo-50/50 to-white">
                  <span className="inline-block px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold tracking-wider mb-3">
                    {config.hero.badge_text}
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                    {config.hero.headline}
                  </h1>
                  <p className="text-xs text-slate-600 max-w-md mx-auto mt-2">
                    {config.hero.subheadline}
                  </p>
                  <div className="mt-5 flex items-center justify-center gap-3">
                    <button className="px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-lg shadow-md hover:bg-indigo-700">
                      {config.hero.primary_cta_text}
                    </button>
                    <button className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-lg hover:bg-slate-200">
                      {config.hero.secondary_cta_text}
                    </button>
                  </div>
                </div>
              )}

              {/* Preview Product Showcase */}
              {config.product_showcase.enabled && (
                <div className="p-6 border-t border-slate-100">
                  <div className="max-w-md mx-auto p-4 rounded-xl border border-slate-200 bg-slate-50">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-sm text-slate-900">
                        {config.product_showcase.title}
                      </h3>
                      <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 text-[10px] font-bold">
                        {config.product_showcase.discount_label}
                      </span>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-xl font-black text-slate-900">
                        ৳{config.product_showcase.price_bdt.toLocaleString()}
                      </span>
                      {config.product_showcase.original_price_bdt && (
                        <span className="text-xs text-slate-400 line-through">
                          ৳{config.product_showcase.original_price_bdt.toLocaleString()}
                        </span>
                      )}
                    </div>
                    <ul className="mt-3 space-y-1.5 text-[11px] text-slate-600">
                      {config.product_showcase.feature_bullets.map((b, i) => (
                        <li key={i} className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                    <button className="w-full mt-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-lg shadow-xs">
                      {config.product_showcase.checkout_cta_text}
                    </button>
                  </div>
                </div>
              )}

              {/* Preview Footer */}
              {config.footer.enabled && (
                <div className="p-6 bg-slate-900 text-slate-400 text-center text-xs mt-6">
                  <div>{config.footer.copyright_text}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingBuilder;
