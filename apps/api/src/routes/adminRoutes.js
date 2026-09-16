/**
 * DenaNeya v2.0 - Super Admin Router
 * Mounts super admin authentication, profile, 2FA, telemetry, merchant governance,
 * cross-tenant SMS stream, impersonation, and runtime system master controls.
 */

import { Router } from 'express';
import { superAdminGuard } from '../middlewares/superAdmin.js';
import { adminGoogleLogin, getAdminMe } from '../controllers/adminAuthController.js';
import { generate2FA, verify2FA, login2FA, loginBackup } from '../controllers/admin2faController.js';
import {
  getKpis,
  getTransactionsChart,
  getChannelDistribution,
  getSmsThroughput,
  getHealth
} from '../controllers/adminTelemetryController.js';
import {
  getMerchants,
  getMerchantById,
  updateMerchantStatus,
  adjustMerchantCredits
} from '../controllers/adminMerchantController.js';
import { getAuditLogs } from '../controllers/adminAuditController.js';
import { impersonateMerchant, exitImpersonation } from '../controllers/adminImpersonationController.js';
import { getSmsStream, manualReconcile } from '../controllers/adminSmsController.js';
import {
  getMasterGateways,
  updateMasterGatewayChannel,
  getPricingSettings,
  updatePricingSettings,
  getCustomizerSettings,
  updateCustomizerSettings,
  getMaintenanceSettings,
  updateMaintenanceSettings
} from '../controllers/adminSettingsController.js';
import { authLimiter } from '../middlewares/rateLimiter.js';

const router = Router();

// ==============================================================================
// 1. PUBLIC SUPER ADMIN AUTHENTICATION & 2FA LOGIN
// ==============================================================================
router.post('/auth/google', authLimiter, adminGoogleLogin);
router.post('/auth/login-2fa', authLimiter, login2FA);
router.post('/auth/login-backup', authLimiter, loginBackup);

// ==============================================================================
// 2. PROTECTED SUPER ADMIN PROFILE & 2FA MANAGEMENT
// ==============================================================================
router.get('/me', superAdminGuard, getAdminMe);
router.post('/2fa/generate', superAdminGuard, generate2FA);
router.post('/2fa/verify', superAdminGuard, verify2FA);

// ==============================================================================
// 3. GLOBAL PLATFORM TELEMETRY & KPIS
// ==============================================================================
router.get('/telemetry/kpis', superAdminGuard, getKpis);
router.get('/telemetry/transactions-chart', superAdminGuard, getTransactionsChart);
router.get('/telemetry/volume-chart', superAdminGuard, getTransactionsChart);
router.get('/telemetry/channel-distribution', superAdminGuard, getChannelDistribution);
router.get('/telemetry/sms-throughput', superAdminGuard, getSmsThroughput);
router.get('/telemetry/health', superAdminGuard, getHealth);

// ==============================================================================
// 4. MERCHANT GOVERNANCE & DIRECTORY
// ==============================================================================
router.get('/merchants', superAdminGuard, getMerchants);
router.get('/merchants/:id', superAdminGuard, getMerchantById);
router.put('/merchants/:id/status', superAdminGuard, updateMerchantStatus);
router.patch('/merchants/:id/status', superAdminGuard, updateMerchantStatus);
router.post('/merchants/:id/adjust-credits', superAdminGuard, adjustMerchantCredits);

// ==============================================================================
// 5. ADMINISTRATIVE AUDIT LOGS
// ==============================================================================
router.get('/audit-logs', superAdminGuard, getAuditLogs);

// ==============================================================================
// 6. MERCHANT IMPERSONATION & SESSION REVERSION
// ==============================================================================
router.post('/impersonate/exit', exitImpersonation);
router.post('/impersonate/:merchantId', superAdminGuard, impersonateMerchant);

// ==============================================================================
// 7. CROSS-TENANT SMS STREAM & MANUAL RECONCILIATION
// ==============================================================================
router.get('/sms/stream', superAdminGuard, getSmsStream);
router.post('/reconcile/manual', superAdminGuard, manualReconcile);

// ==============================================================================
// 8. MASTER GATEWAY SWITCHES & SYSTEM MASTER CONTROLS
// ==============================================================================
router.get('/gateways/master', superAdminGuard, getMasterGateways);
router.put('/gateways/master/:channel', superAdminGuard, updateMasterGatewayChannel);
router.post('/gateways/master/:channel', superAdminGuard, updateMasterGatewayChannel);

router.get('/settings/pricing', superAdminGuard, getPricingSettings);
router.put('/settings/pricing', superAdminGuard, updatePricingSettings);
router.post('/settings/pricing', superAdminGuard, updatePricingSettings);

router.get('/settings/customizer', superAdminGuard, getCustomizerSettings);
router.put('/settings/customizer', superAdminGuard, updateCustomizerSettings);
router.post('/settings/customizer', superAdminGuard, updateCustomizerSettings);

router.get('/settings/maintenance', superAdminGuard, getMaintenanceSettings);
router.put('/settings/maintenance', superAdminGuard, updateMaintenanceSettings);
router.post('/settings/maintenance', superAdminGuard, updateMaintenanceSettings);

export default router;
