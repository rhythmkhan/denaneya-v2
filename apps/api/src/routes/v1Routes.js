/**
 * DenaNeya v2.0 - Server-to-Server (S2S) 2-Step API Routes
 * File: apps/api/src/routes/v1Routes.js
 *
 * All routes are guarded by apiKeyAuth middleware (X-API-KEY and X-API-SECRET).
 */

import express from 'express';
import apiKeyAuth from '../middlewares/apiKeyAuth.js';
import v1TrxController from '../controllers/v1TrxController.js';

const router = express.Router();

// Enforce S2S API Key & Secret Authentication
router.use(apiKeyAuth);

// Step 1: Verify UNUSED transaction exists and deduct 1 credit
router.post('/trx/verify', v1TrxController.verifyTrx);

// Step 2: Confirm transaction consumption to USED status
router.post('/trx/confirm', v1TrxController.confirmTrx);

export default router;
