/**
 * DenaNeya v2.0 - Hosted Checkout Payment Routes
 * File: apps/api/src/routes/paymentRoutes.js
 */

import express from 'express';
import { trxSubmissionLimiter } from '../middlewares/rateLimiter.js';
import paymentController from '../controllers/paymentController.js';

const router = express.Router();

// Hosted Checkout Payment Submission (Throttled: 5 attempts/min per IP to eliminate Oracle probing)
router.post('/submit-trx', trxSubmissionLimiter, paymentController.submitTrx);
router.post('/verify', trxSubmissionLimiter, paymentController.submitTrx);

// Parametrized invoice verification endpoint (handles both /api/payment/invoices/:id/verify and /api/invoices/:id/verify)
router.post('/invoices/:id/verify', trxSubmissionLimiter, paymentController.verifyInvoice);
router.post('/:id/verify', trxSubmissionLimiter, paymentController.verifyInvoice);

// Short-polling invoice status endpoints
router.get('/status/:id', paymentController.getInvoiceStatus);
router.get('/invoices/:id/status', paymentController.getInvoiceStatus);
router.get('/:id/status', paymentController.getInvoiceStatus);

export default router;
