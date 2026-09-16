/**
 * DenaNeya v2.0 - Dashboard Analytics Routes
 * File: apps/api/src/routes/dashboardRoutes.js
 *
 * GET /api/dashboard/stats - Strictly authenticated & tenant-scoped
 */

import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.js';
import { tenantMiddleware } from '../middlewares/tenant.js';
import { getDashboardStats } from '../controllers/dashboardController.js';

const router = Router();

// GET /api/dashboard/stats - Strictly authenticated & tenant-scoped
router.get('/stats', authMiddleware, tenantMiddleware, getDashboardStats);

export default router;
