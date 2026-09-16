/**
 * DenaNeya v2.0 - Payment Links Generator
 * File: apps/dashboard/src/pages/PaymentLinks.tsx
 *
 * Implements:
 * - Static amount payment links (Fixed price courses, products, subscriptions)
 * - Open/Dynamic amount payment links (Donations, flexible invoices, tips)
 * - Instant link copy, QR code generator, and real-time revenue counters
 */

import React, { useState } from 'react';
import {
  Link2,
  Plus,
  Copy,
  Check,
  QrCode,
  ExternalLink,
  DollarSign,
  Layers,
  Archive,
  BarChart3
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { PaymentLink } from '../types/dashboard';

export const PaymentLinks: React.FC = () => {
  const [links, setLinks] = useState<PaymentLink[]>([
    {
      id: 'pl_01',
      brand_id: 'demo-brand',
      title: 'Full-Stack Web Development Masterclass',
      description: 'Comprehensive Next.js & Node.js bootcamp with live mentoring.',
      slug: 'web-dev-course',
      amount_type: 'fixed',
      amount: 4500,
      currency: 'BDT',
      redirect_url: 'https://deshicourse.com/access',
      total_paid_count: 38,
      total_revenue: 171000,
      status: 'active',
      created_at: new Date(Date.now() - 86400000 * 5).toISOString()
    },
    {
      id: 'pl_02',
      brand_id: 'demo-brand',
      title: 'Open Donation & Community Support',
      description: 'Support open-source development and community workshops.',
      slug: 'donate',
      amount_type: 'open',
      amount: null,
      currency: 'BDT',
      redirect_url: 'https://deshicourse.com/thanks',
      total_paid_count: 14,
      total_revenue: 18500,
      status: 'active',
      created_at: new Date(Date.now() - 86400000 * 12).toISOString()
    }
  ]);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    slug: '',
    amount_type: 'fixed' as 'fixed' | 'open',
    amount: '',
    redirect_url: ''
  });

  const handleCopy = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    const newLink: PaymentLink = {
      id: `pl_${Date.now().toString(36)}`,
      brand_id: 'current-brand',
      title: formData.title.trim(),
      description: formData.description.trim(),
      slug: formData.slug.trim() || formData.title.toLowerCase().replace(/\s+/g, '-'),
      amount_type: formData.amount_type,
      amount: formData.amount_type === 'fixed' ? parseFloat(formData.amount) : null,
      currency: 'BDT',
      redirect_url: formData.redirect_url.trim() || null,
      total_paid_count: 0,
      total_revenue: 0,
      status: 'active',
      created_at: new Date().toISOString()
    };

    setLinks([newLink, ...links]);
    setIsModalOpen(false);
    setFormData({
      title: '',
      description: '',
      slug: '',
      amount_type: 'fixed',
      amount: '',
      redirect_url: ''
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Reusable Payment Links
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Create permanent payment links for courses, services, and donations without creating invoices
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={() => setIsModalOpen(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Create New Payment Link
        </Button>
      </div>

      {/* Payment Links List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {links.map((item) => {
          const publicUrl = `${window.location.origin}/link/${item.slug}`;
          return (
            <Card key={item.id} className="relative">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                    <Badge variant={item.status === 'active' ? 'success' : 'neutral'} size="sm">
                      {item.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {item.description || 'No description provided.'}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-base font-black text-indigo-600">
                    {item.amount_type === 'fixed'
                      ? `৳${item.amount?.toLocaleString()}`
                      : 'Open Amount'}
                  </div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">
                    {item.amount_type === 'fixed' ? 'Fixed Price' : 'Customer Enters'}
                  </span>
                </div>
              </div>

              {/* URL bar */}
              <div className="mt-4 p-2 bg-slate-50 rounded-lg border border-slate-200/60 flex items-center justify-between">
                <span className="font-mono text-xs text-slate-600 truncate mr-2">
                  {publicUrl}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleCopy(publicUrl, item.id)}
                    className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-white rounded transition-colors"
                    title="Copy Link"
                  >
                    {copiedId === item.id ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                  <a
                    href={publicUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-white rounded transition-colors"
                    title="Open Link"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* Performance footer */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-indigo-500" />
                  <span>
                    <strong>{item.total_paid_count}</strong> Payments Collected
                  </span>
                </div>
                <div className="font-semibold text-slate-800">
                  ৳{item.total_revenue.toLocaleString()} Revenue
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Creation Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Reusable Payment Link"
        subtitle="Generates a static or open-amount hosted URL you can share anywhere"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Link Title / Product Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Masterclass Enrollment"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Provide context for the customer..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Amount Type *
              </label>
              <select
                value={formData.amount_type}
                onChange={(e) =>
                  setFormData({ ...formData, amount_type: e.target.value as 'fixed' | 'open' })
                }
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="fixed">Fixed Price (Defined by merchant)</option>
                <option value="open">Open Amount (Customer enters amount)</option>
              </select>
            </div>
            {formData.amount_type === 'fixed' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Fixed Amount (BDT) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    ৳
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="1200.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full pl-7 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Custom Link Slug (Optional)
            </label>
            <div className="flex items-center">
              <span className="px-3 py-2 bg-slate-100 border border-r-0 border-slate-200 rounded-l-lg text-xs text-slate-500">
                /link/
              </span>
              <input
                type="text"
                placeholder="custom-slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-r-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Create Payment Link
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PaymentLinks;
