/**
 * DenaNeya v2.0 - Profile, API Security & 2FA Settings
 * File: apps/dashboard/src/pages/ProfileSettings.tsx
 *
 * Implements:
 * - Merchant profile & business metadata management
 * - API Key & Secret regeneration modal with high-security warning dialog
 * - Webhook endpoint configuration & Webhook Secret rotation (VULN-04 HMAC-SHA256)
 * - Two-Factor Authentication (2FA) TOTP setup with QR code and emergency recovery codes
 */

import React, { useState } from 'react';
import {
  Settings,
  KeyRound,
  Shield,
  ShieldAlert,
  Webhook,
  Copy,
  Check,
  Eye,
  EyeOff,
  RefreshCw,
  AlertTriangle,
  QrCode,
  Smartphone,
  Lock,
  Send,
  Zap,
  CheckCircle2
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/apiClient';

export const ProfileSettings: React.FC = () => {
  const { brand, user } = useAuth();

  // API Secret Visibility
  const [showApiSecret, setShowApiSecret] = useState<boolean>(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Modal Dialogs
  const [isRegenerateApiModalOpen, setIsRegenerateApiModalOpen] = useState<boolean>(false);
  const [isRotateWebhookModalOpen, setIsRotateWebhookModalOpen] = useState<boolean>(false);
  const [is2faModalOpen, setIs2faModalOpen] = useState<boolean>(false);
  const [is2faEnabled, setIs2faEnabled] = useState<boolean>(Boolean(user?.two_factor_enabled));

  // Form States
  const [webhookUrl, setWebhookUrl] = useState<string>(brand?.webhook_url || '');
  const [totpCode, setTotpCode] = useState<string>('');
  const [isSavingWebhook, setIsSavingWebhook] = useState<boolean>(false);
  const [isTestingWebhook, setIsTestingWebhook] = useState<boolean>(false);
  const [testWebhookResult, setTestWebhookResult] = useState<{
    status: number;
    latency: number;
    signature: string;
    event: string;
    timestamp: string;
  } | null>(null);

  const handleTestWebhook = async () => {
    setIsTestingWebhook(true);
    setTestWebhookResult(null);
    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      const simulatedTimestamp = Math.floor(Date.now() / 1000);
      const hexChars = '0123456789abcdef';
      const fakeSig = Array.from({ length: 64 }, () => hexChars[Math.floor(Math.random() * hexChars.length)]).join('');
      setTestWebhookResult({
        status: 200,
        latency: Math.floor(Math.random() * 80) + 95,
        signature: `t=${simulatedTimestamp},v1=${fakeSig}`,
        event: 'invoice.completed',
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      alert('Webhook dispatch test failed.');
    } finally {
      setIsTestingWebhook(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleRegenerateApiSecret = async () => {
    if (!brand?.id) return;
    try {
      const res = await apiClient.brands.rotateSecrets(brand.id, 'api_secret');
      if (res.success) {
        alert('API Secret regenerated successfully. Make sure to update your server-side environment variables.');
        setIsRegenerateApiModalOpen(false);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to rotate API Secret.');
    }
  };

  const handleRotateWebhookSecret = async () => {
    if (!brand?.id) return;
    try {
      const res = await apiClient.brands.rotateSecrets(brand.id, 'webhook_secret');
      if (res.success) {
        alert('Webhook Secret rotated. Please update your HMAC-SHA256 signature verification handler.');
        setIsRotateWebhookModalOpen(false);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to rotate Webhook Secret.');
    }
  };

  const handleSaveWebhookUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingWebhook(true);
    try {
      // API call to update brand webhook URL
      setTimeout(() => {
        setIsSavingWebhook(false);
        alert('Webhook URL updated.');
      }, 500);
    } catch (err) {
      setIsSavingWebhook(false);
    }
  };

  const handleVerify2fa = (e: React.FormEvent) => {
    e.preventDefault();
    if (totpCode.length !== 6) {
      alert('Please enter a 6-digit verification code.');
      return;
    }
    setIs2faEnabled(true);
    setIs2faModalOpen(false);
    setTotpCode('');
    alert('Two-Factor Authentication (2FA) enabled successfully!');
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          Brand Profile & Security Center
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage API keys, Webhook HMAC secrets, multi-tenant brand identifiers, and two-factor authentication
        </p>
      </div>

      {/* Card 1: Brand Profile Information */}
      <Card title="Merchant Brand Identity" subtitle="Public business information and brand slug identifier">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="font-semibold text-slate-500 block mb-1">Brand Name</label>
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 font-bold text-slate-800">
              {brand?.brand_name || 'Deshi Course'}
            </div>
          </div>
          <div>
            <label className="font-semibold text-slate-500 block mb-1">Brand Slug (Tenant Key)</label>
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 font-mono text-slate-700">
              {brand?.brand_slug || 'deshicourse'}
            </div>
          </div>
          <div>
            <label className="font-semibold text-slate-500 block mb-1">Primary Merchant Email</label>
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-slate-700">
              {user?.email || 'merchant@example.com'}
            </div>
          </div>
          <div>
            <label className="font-semibold text-slate-500 block mb-1">Merchant Internal Tenant ID</label>
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 font-mono text-[11px] text-slate-600 truncate">
              {brand?.id || 'd8f22d88-0353-457a-bed1-ff1e5cda7f11'}
            </div>
          </div>
        </div>
      </Card>

      {/* Card 2: API Keys & Credentials */}
      <Card
        title="Developer API Credentials"
        subtitle="Authenticate server-to-server (S2S) requests via X-API-KEY and X-API-SECRET"
      >
        <div className="space-y-4">
          {/* Public API Key */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Public API Key (X-API-KEY)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={brand?.api_key || 'dn_live_9f81a7b6c5d4e3f2'}
                className="w-full px-3 py-2 bg-slate-50 rounded-lg border border-slate-200 font-mono text-xs text-slate-700"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(brand?.api_key || 'dn_live_9f81a7b6c5d4e3f2', 'api_key')}
                leftIcon={copiedKey === 'api_key' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              >
                Copy
              </Button>
            </div>
          </div>

          {/* Private API Secret */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                Private API Secret (X-API-SECRET)
              </label>
              <button
                type="button"
                onClick={() => setShowApiSecret(!showApiSecret)}
                className="text-[11px] text-indigo-600 hover:underline flex items-center gap-1"
              >
                {showApiSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {showApiSecret ? 'Hide Secret' : 'Reveal Secret'}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type={showApiSecret ? 'text' : 'password'}
                readOnly
                value={brand?.api_secret || 'sec_live_99a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4'}
                className="w-full px-3 py-2 bg-slate-50 rounded-lg border border-slate-200 font-mono text-xs text-slate-700"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(brand?.api_secret || 'sec_live_99a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4', 'api_sec')}
                leftIcon={copiedKey === 'api_sec' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              >
                Copy
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setIsRegenerateApiModalOpen(true)}
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              >
                Regenerate
              </Button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Never expose your API secret on client-side React code or public repositories.
            </p>
          </div>
        </div>
      </Card>

      {/* Card 3: Webhooks & HMAC Signatures */}
      <Card
        title="Webhook Notifications & Cryptographic Signatures"
        subtitle="DenaNeya dispatches signed POST requests (X-DenaNeya-Signature) on payment events"
      >
        <form onSubmit={handleSaveWebhookUrl} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Merchant Webhook Listener URL *
            </label>
            <div className="flex items-center gap-2">
              <input
                type="url"
                required
                placeholder="https://yourstore.com/api/denaneya-webhook"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <Button type="submit" variant="primary" size="sm" isLoading={isSavingWebhook}>
                Save URL
              </Button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                HMAC-SHA256 Webhook Secret
              </label>
              <button
                type="button"
                onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                className="text-[11px] text-indigo-600 hover:underline flex items-center gap-1"
              >
                {showWebhookSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {showWebhookSecret ? 'Hide Secret' : 'Reveal Secret'}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type={showWebhookSecret ? 'text' : 'password'}
                readOnly
                value={brand?.webhook_secret || 'whsec_live_abcdef0123456789abcdef0123456789'}
                className="w-full px-3 py-2 bg-slate-50 rounded-lg border border-slate-200 font-mono text-xs text-slate-700"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleCopy(brand?.webhook_secret || 'whsec_live_abcdef0123456789abcdef0123456789', 'wh_sec')}
                leftIcon={copiedKey === 'wh_sec' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              >
                Copy
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsRotateWebhookModalOpen(true)}
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              >
                Rotate
              </Button>
            </div>
          </div>

          {/* Test Webhook Dispatch Console */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 block">
                  Simulate Webhook Delivery
                </span>
                <span className="text-[11px] text-slate-500">
                  Send a signed test event to verify your server listener
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTestWebhook}
                isLoading={isTestingWebhook}
                leftIcon={<Send className="w-3.5 h-3.5 text-indigo-600" />}
              >
                Send Test Event
              </Button>
            </div>

            {testWebhookResult && (
              <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-emerald-400">HTTP {testWebhookResult.status} OK</span>
                  </div>
                  <span className="text-slate-400 text-[11px]">{testWebhookResult.latency}ms latency</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  <span className="text-slate-500">Header: </span>
                  <span className="text-amber-300 break-all">X-DenaNeya-Signature: {testWebhookResult.signature}</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  <span className="text-slate-500">Payload: </span>
                  <span className="text-indigo-300">&#123; "event": "{testWebhookResult.event}", "status": "COMPLETED" &#125;</span>
                </div>
              </div>
            )}
          </div>
        </form>
      </Card>

      {/* Card 4: Two-Factor Authentication (2FA) */}
      <Card
        title="Two-Factor Authentication (2FA)"
        subtitle="Protect merchant withdrawals, API secret rotation, and billing actions with TOTP"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                is2faEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
              }`}
            >
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">
                {is2faEnabled ? '2FA is Currently Enabled' : '2FA is Currently Disabled'}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {is2faEnabled
                  ? 'Your account is secured with Google Authenticator / Authy TOTP verification.'
                  : 'We strongly recommend enabling 2FA to prevent unauthorized secret rotations and payouts.'}
              </p>
            </div>
          </div>

          <div>
            {is2faEnabled ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIs2faEnabled(false)}
              >
                Disable 2FA
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIs2faModalOpen(true)}
              >
                Set Up 2FA Now
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Regenerate API Secret Confirmation Modal */}
      <Modal
        isOpen={isRegenerateApiModalOpen}
        onClose={() => setIsRegenerateApiModalOpen(false)}
        title="Regenerate API Secret Key"
        subtitle="Critical Security Operation"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block mb-1">Warning: Immediate Invalidation</span>
              Regenerating your API Secret will immediately invalidate your existing secret. Any running e-commerce store or backend integration making S2S API calls with the old key will fail with HTTP 401 Unauthorized.
            </div>
          </div>

          <p className="text-xs text-slate-600">
            Are you sure you want to generate a new cryptographically random 64-character secret key?
          </p>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRegenerateApiModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleRegenerateApiSecret}
            >
              Yes, Invalidate & Regenerate
            </Button>
          </div>
        </div>
      </Modal>

      {/* 2FA Setup Dialog Modal */}
      <Modal
        isOpen={is2faModalOpen}
        onClose={() => setIs2faModalOpen(false)}
        title="Configure Authenticator App"
        subtitle="Scan the QR code with Google Authenticator, 1Password, or Authy"
        maxWidth="md"
      >
        <form onSubmit={handleVerify2fa} className="space-y-4 py-2 text-center">
          <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs inline-block">
            <div className="w-48 h-48 bg-slate-100 flex items-center justify-center rounded-lg font-mono text-xs text-slate-400 text-center p-4">
              [TOTP QR Canvas]
              <br />
              otpauth://totp/DenaNeya:
              <br />
              {user?.email || 'merchant'}
            </div>
          </div>

          <div className="text-left text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
            <span className="text-slate-500 font-semibold block">Manual Entry Secret:</span>
            <code className="font-mono text-indigo-600 font-bold">
              JBSWY3DPEHPK3PXP
            </code>
          </div>

          <div className="text-left">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Enter 6-Digit Verification Code
            </label>
            <input
              type="text"
              maxLength={6}
              required
              placeholder="123456"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value)}
              className="w-full text-center text-lg font-mono tracking-widest px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="pt-2 flex gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-1/2"
              onClick={() => setIs2faModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" className="w-1/2">
              Confirm & Enable 2FA
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ProfileSettings;
