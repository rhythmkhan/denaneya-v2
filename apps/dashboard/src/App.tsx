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
import Register from './pages/Register';
import HostedCheckoutPage from './pages/HostedCheckoutPage';

// Super Admin Suite Pages
import SuperAdminLayout from './pages/admin/SuperAdminLayout';
import AdminOverview from './pages/admin/AdminOverview';
import AdminMerchants from './pages/admin/AdminMerchants';
import AdminSmsStream from './pages/admin/AdminSmsStream';
import AdminGateways from './pages/admin/AdminGateways';
import AdminCustomizer from './pages/admin/AdminCustomizer';
import AdminSecurity from './pages/admin/AdminSecurity';
import AdminAuditLogs from './pages/admin/AdminAuditLogs';
import AdminLogin from './pages/admin/AdminLogin';

// Protected Merchant Route Guard Component
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

// Protected Super Admin Route Guard Component
const AdminProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = localStorage.getItem('dn_token');
  const userRaw = localStorage.getItem('dn_user');
  let isSuperAdmin = false;

  if (userRaw) {
    try {
      const u = JSON.parse(userRaw);
      if (u.role === 'superadmin' || u.email?.includes('admin')) {
        isSuperAdmin = true;
      }
    } catch (e) {}
  }

  // Allow access if token exists or original admin token is present
  if (!token && !isSuperAdmin) {
    return <Navigate to="/super-admin/login" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Auth & Onboarding Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/super-admin/login" element={<AdminLogin />} />

          {/* Standalone Hosted Checkout Engine */}
          <Route path="/pay/:invoiceId" element={<HostedCheckoutPage />} />
          <Route path="/pay" element={<HostedCheckoutPage />} />

          {/* Super Admin Control Suite */}
          <Route
            path="/super-admin"
            element={
              <AdminProtectedRoute>
                <SuperAdminLayout />
              </AdminProtectedRoute>
            }
          >
            <Route index element={<AdminOverview />} />
            <Route path="merchants" element={<AdminMerchants />} />
            <Route path="sms" element={<AdminSmsStream />} />
            <Route path="gateways" element={<AdminGateways />} />
            <Route path="customizer" element={<AdminCustomizer />} />
            <Route path="security" element={<AdminSecurity />} />
            <Route path="audit-logs" element={<AdminAuditLogs />} />
          </Route>

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
