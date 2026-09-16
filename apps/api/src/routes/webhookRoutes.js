/**
 * DenaNeya v2.0 - Webhook Routes
 * File: apps/api/src/routes/webhookRoutes.js
 */

import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.js';
import { tenantMiddleware } from '../middlewares/tenant.js';
import { testWebhookDispatch } from '../controllers/webhookController.js';

const router = Router();

// Protect webhook testing with auth and tenant resolution
router.use(authMiddleware);
router.use(tenantMiddleware);

// POST /api/webhooks/test
router.post('/test', testWebhookDispatch);

export default router;
