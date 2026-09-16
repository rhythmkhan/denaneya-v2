/**
 * DenaNeya v2.0 - Master Client-Side Router
 * File: apps/dashboard/src/App.tsx
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import DashboardLayout from './components/layout/DashboardLayout';
import Overview from './pages/Overview';
import Invoices from './pages/Invoices';
import PaymentLinks from './pages/PaymentLinks';
import LandingBuilder from './pages/LandingBuilder';
import Gateways from './pages/Gateways';
import Devices from './pages/Devices';
import Staff from './pages/Staff';
import Billing from './pages/Billing';
import ReferEarn from './pages/ReferEarn';
import ProfileSettings from './pages/ProfileSettings';
import Login from './pages/Login';

// Protected Route Guard Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-xs font-mono">
        Authenticating DenaNeya Session...
      </div>
    );
  }

  const token = localStorage.getItem('dn_token');
  if (!token && !user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<Login />} />

          {/* Protected Merchant Dashboard Suite */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Overview />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="payment-links" element={<PaymentLinks />} />
            <Route path="landing-builder" element={<LandingBuilder />} />
            <Route path="gateways" element={<Gateways />} />
            <Route path="devices" element={<Devices />} />
            <Route path="staff" element={<Staff />} />
            <Route path="billing" element={<Billing />} />
            <Route path="refer-earn" element={<ReferEarn />} />
            <Route path="settings" element={<ProfileSettings />} />
          </Route>

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
