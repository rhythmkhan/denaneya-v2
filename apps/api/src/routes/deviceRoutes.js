/**
 * DenaNeya v2.0 - Device & Carrier SMS Sync Routes
 * File: apps/api/src/routes/deviceRoutes.js
 *
 * Implements two route surfaces:
 * 1. Device Hardware Sync Surface (/api/device):
 *    - POST /api/device/sync-sms   -> Carrier SMS Ingestion (Rate limited & deviceAuth protected)
 *    - POST /api/device/heartbeat  -> Handset telemetry / battery ping
 *    - POST /api/device/ping       -> Heartbeat alias
 *    - GET  /api/device/status     -> Handset self-verification
 * 2. Merchant Device Management Surface (/api/devices):
 *    - GET    /api/devices            -> List brand devices
 *    - POST   /api/devices            -> Pair new device (generates token & QR data)
 *    - GET    /api/devices/:id        -> Get device details
 *    - PATCH  /api/devices/:id        -> Update device configuration
 *    - POST   /api/devices/:id/rotate-token -> Rotate compromised device token
 *    - DELETE /api/devices/:id        -> Unpair / delete device
 */

import { Router } from 'express';
import { deviceAuthMiddleware } from '../middlewares/deviceAuth.js';
import { authMiddleware } from '../middlewares/auth.js';
import { tenantMiddleware, requirePermission } from '../middlewares/tenant.js';
import { deviceSyncLimiter } from '../middlewares/rateLimiter.js';
import {
  syncSMS,
  deviceHeartbeat,
  getDeviceSelfStatus,
  listDevices,
  createDevice,
  getDeviceById,
  rotateDeviceToken,
  updateDevice,
  deleteDevice
} from '../controllers/deviceController.js';

// ==============================================================================
// 1. HARDWARE SYNC ROUTER (Mount at /api/device)
// ==============================================================================
export const deviceSyncRouter = Router();

// Handset carrier SMS ingestion (Throttled at 120 req/min, authenticated via device token)
deviceSyncRouter.post(
  '/sync-sms',
  deviceSyncLimiter,
  deviceAuthMiddleware,
  syncSMS
);

// Handset telemetry & liveness heartbeat
deviceSyncRouter.post(
  '/heartbeat',
  deviceAuthMiddleware,
  deviceHeartbeat
);

// Heartbeat alias for legacy Android forwarders
deviceSyncRouter.post(
  '/ping',
  deviceAuthMiddleware,
  deviceHeartbeat
);

// Handset self-check and connection diagnostics
deviceSyncRouter.get(
  '/status',
  deviceAuthMiddleware,
  getDeviceSelfStatus
);

deviceSyncRouter.get(
  '/me',
  deviceAuthMiddleware,
  getDeviceSelfStatus
);

// ==============================================================================
// 2. MERCHANT DASHBOARD MANAGEMENT ROUTER (Mount at /api/devices)
// ==============================================================================
export const deviceManageRouter = Router();

// Protect all merchant device management endpoints with JWT and Tenant Isolation
deviceManageRouter.use(authMiddleware);
deviceManageRouter.use(tenantMiddleware);

// List paired devices
deviceManageRouter.get(
  '/',
  requirePermission('devices', 'read'),
  listDevices
);

// Pair new device
deviceManageRouter.post(
  '/',
  requirePermission('devices', 'create'),
  createDevice
);

// Get device details
deviceManageRouter.get(
  '/:id',
  requirePermission('devices', 'read'),
  getDeviceById
);

// Update device configuration
deviceManageRouter.patch(
  '/:id',
  requirePermission('devices', 'update'),
  updateDevice
);

// Rotate device pairing token
deviceManageRouter.post(
  '/:id/rotate-token',
  requirePermission('devices', 'update'),
  rotateDeviceToken
);

// Unpair / delete device
deviceManageRouter.delete(
  '/:id',
  requirePermission('devices', 'delete'),
  deleteDevice
);

// Default export: Hardware Sync Router
export default deviceSyncRouter;
