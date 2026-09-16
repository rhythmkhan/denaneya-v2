/**
 * DenaNeya v2.0 - Staff Management & RBAC Routes
 * File: apps/api/src/routes/staffRoutes.js
 */

import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.js';
import { tenantMiddleware } from '../middlewares/tenant.js';
import {
  listStaff,
  addStaff,
  removeStaff
} from '../controllers/staffController.js';

const router = Router();

// Protect all staff routes with JWT auth and multi-tenant boundary
router.use(authMiddleware);
router.use(tenantMiddleware);

// List staff members for active brand
router.get('/', listStaff);

// Invite or add staff member with permissions (Owner only)
router.post('/', addStaff);

// Revoke staff member access (Owner only)
router.delete('/:id', removeStaff);

export default router;
