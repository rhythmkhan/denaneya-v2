/**
 * DenaNeya v2.0 - Billing & Credits Routes
 * File: apps/api/src/routes/billingRoutes.js
 */

import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.js';
import { tenantMiddleware } from '../middlewares/tenant.js';
import {
  getBalance,
  topupCredits
} from '../controllers/billingController.js';

const router = Router();

// Protect all billing routes with JWT auth and multi-tenant boundary
router.use(authMiddleware);
router.use(tenantMiddleware);

// Get live credit balance, starter metrics, and recent usage
router.get('/balance', getBalance);

// Top up merchant credits
router.post('/topup', topupCredits);

export default router;
