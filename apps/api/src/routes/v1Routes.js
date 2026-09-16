/**
 * DenaNeya v2.0 - Server-to-Server (S2S) 2-Step API Routes
 * File: apps/api/src/routes/v1Routes.js
 *
 * All routes are guarded by apiKeyAuth middleware (X-API-KEY and X-API-SECRET).
 */

import express from 'express';
import apiKeyAuth from '../middlewares/apiKeyAuth.js';
import v1TrxController from '../controllers/v1TrxController.js';
import v1PaymentController from '../controllers/v1PaymentController.js';

const router = express.Router();

// Enforce S2S API Key & Secret Authentication
router.use(apiKeyAuth);

// WooCommerce / S2S Payment Invoice Creation & Verification
router.post('/payment/create', v1PaymentController.createPaymentInvoice);
router.post('/payment/verify', v1PaymentController.verifyPaymentInvoice);

// Step 1: Verify UNUSED transaction exists and deduct 1 credit
router.post('/trx/verify', v1TrxController.verifyTrx);

// Step 2: Confirm transaction consumption to USED status
router.post('/trx/confirm', v1TrxController.confirmTrx);

export default router;
