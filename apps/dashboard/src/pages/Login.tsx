/**
 * DenaNeya v2.0 - Merchant Authentication View
 * File: apps/dashboard/src/pages/Login.tsx
 */

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';
import { Button } from '../components/common/Button';
import { useAuth } from '../context/AuthContext';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('demo@denaneya.com');
  const [password, setPassword] = useState('Secret123!');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [requires2fa, setRequires2fa] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(email, password, twoFactorCode || undefined);
      navigate('/');
    } catch (err: any) {
      if (err.code === '2FA_REQUIRED') {
        setRequires2fa(true);
      } else {
        setError(err.message || 'Invalid email or password.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 border border-slate-800">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white font-black text-2xl flex items-center justify-center mx-auto mb-3">
            দে
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            দেনা নেয়া <span className="text-indigo-600">v2.0</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Sign in to access your merchant automated payment dashboard
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="merchant@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="••••••••"
              />
            </div>
          </div>

          {requires2fa && (
            <div>
              <label className="block font-semibold text-indigo-700 mb-1">
                Two-Factor Verification Code
              </label>
              <input
                type="text"
                maxLength={6}
                required
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value)}
                className="w-full text-center text-base font-mono tracking-widest px-3 py-2 rounded-lg border border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="123456"
              />
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            className="w-full mt-2"
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Sign In to Dashboard
          </Button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-500">
          Need a new merchant account?{' '}
          <Link to="/register" className="font-bold text-indigo-600 hover:underline">
            Register Brand (50 Free Credits)
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
