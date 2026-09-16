/**
 * DenaNeya v2.0 - Gateways Management Routes
 * File: apps/api/src/routes/gatewayRoutes.js
 */

import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.js';
import { tenantMiddleware, requirePermission } from '../middlewares/tenant.js';
import {
  listGateways,
  toggleGateway,
  createGateway,
  updateGateway,
  deleteGateway
} from '../controllers/gatewayController.js';

const router = Router();

// Protect all gateway routes with JWT auth and multi-tenant boundary
router.use(authMiddleware);
router.use(tenantMiddleware);

// List brand gateways with category metrics
router.get('/', requirePermission('gateways', 'read'), listGateways);

// Toggle gateway status (active/inactive)
router.post('/:id/toggle', requirePermission('gateways', 'update'), toggleGateway);

// Configure & activate new gateway
router.post('/', requirePermission('gateways', 'create'), createGateway);

// Update gateway credentials & fees
router.put('/:id', requirePermission('gateways', 'update'), updateGateway);
router.patch('/:id', requirePermission('gateways', 'update'), updateGateway);

// Remove gateway
router.delete('/:id', requirePermission('gateways', 'delete'), deleteGateway);

export default router;
