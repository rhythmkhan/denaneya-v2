/**
 * DenaNeya v2.0 - Invoice & Hosted Checkout Routes
 * File: apps/api/src/routes/invoiceRoutes.js
 */

import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.js';
import { tenantMiddleware, requirePermission } from '../middlewares/tenant.js';
import { trxSubmissionLimiter } from '../middlewares/rateLimiter.js';
import invoiceController, {
  getPublicInvoice,
  renderHostedCheckout,
  createInvoice,
  listInvoices,
  getInvoiceById
} from '../controllers/invoiceController.js';
import paymentController from '../controllers/paymentController.js';

const router = Router();

// ==============================================================================
// 1. PUBLIC CHECKOUT ROUTES (Zero Authentication Required)
// ==============================================================================

// Public checkout details for client application / hosted checkout UI
router.get('/:id/public', getPublicInvoice);

// Short-polling invoice payment status endpoint
router.get('/:id/status', paymentController.getInvoiceStatus);

// Transaction verification submission on invoice
router.post('/:id/verify', trxSubmissionLimiter, paymentController.verifyInvoice);

// ==============================================================================
// 2. AUTHENTICATED MERCHANT INVOICE MANAGEMENT
// Protected by JWT and Multi-Tenant Isolation
// ==============================================================================

// Create new invoice with 15-min TTL
router.post(
  '/',
  authMiddleware,
  tenantMiddleware,
  requirePermission('invoices', 'create'),
  createInvoice
);

// List invoices for active brand
router.get(
  '/',
  authMiddleware,
  tenantMiddleware,
  requirePermission('invoices', 'read'),
  listInvoices
);

// Get single invoice detailed inspection
router.get(
  '/:id',
  authMiddleware,
  tenantMiddleware,
  requirePermission('invoices', 'read'),
  getInvoiceById
);

// Standalone checkout route handler export for direct mount at /pay/:invoiceId
export const checkoutPageHandler = renderHostedCheckout;

export default router;
