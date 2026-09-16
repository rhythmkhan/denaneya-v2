/**
 * DenaNeya v2.0 - Express Application Definition
 * Fully hardened REST API pipeline with Helmet, restricted CORS,
 * body parser limits, input sanitization, and tiered rate limiters.
 */

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { globalLimiter } from './middlewares/rateLimiter.js';
import { sanitizeInput } from './middlewares/sanitize.js';
import authRoutes from './routes/authRoutes.js';
import brandRoutes from './routes/brandRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import { deviceSyncRouter, deviceManageRouter } from './routes/deviceRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import invoiceRoutes, { checkoutPageHandler } from './routes/invoiceRoutes.js';
import gatewayRoutes from './routes/gatewayRoutes.js';
import staffRoutes from './routes/staffRoutes.js';
import billingRoutes from './routes/billingRoutes.js';
import v1Routes from './routes/v1Routes.js';

export function createApp() {
  const app = express();

  // 1. Trust Reverse Proxy (Hostinger / Apache / Cloudflare)
  app.set('trust proxy', 1);

  // 2. Helmet Security Headers (VULN-13 Defense)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          fontSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          frameAncestors: ["'none'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"]
        }
      },
      crossOriginEmbedderPolicy: false,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      },
      noSniff: true,
      frameguard: { action: 'deny' },
      xssFilter: true,
      hidePoweredBy: true
    })
  );

  // 3. Domain-Restricted CORS Configuration (VULN-13 Defense)
  const defaultAllowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173'
  ];

  const envOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
    : [];

  const allowedOrigins = [...new Set([...defaultAllowedOrigins, ...envOrigins])];

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (curl, mobile apps, server-to-server sync)
        if (!origin) return callback(null, true);
        if (
          allowedOrigins.includes(origin) ||
          (process.env.NODE_ENV !== 'production' && /^http:\/\/localhost(:\d+)?$/.test(origin))
        ) {
          return callback(null, true);
        }
        return callback(new Error('CORS_ORIGIN_NOT_ALLOWED'), false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'x-brand-id',
        'device-api-key',
        'x-device-token',
        'x-api-key',
        'x-api-secret',
        'X-API-KEY',
        'X-API-SECRET',
        'x-zinipay-signature',
        'x-zinipay-timestamp',
        'x-zinipay-nonce'
      ],
      exposedHeaders: ['ratelimit-remaining', 'ratelimit-reset'],
      maxAge: 86400
    })
  );

  // 4. Request Body Parsers with Strict Size Limits (DoS Mitigation)
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: true, limit: '100kb' }));

  // 5. Input Sanitization & Anti-Prototype Pollution (VULN-08 Defense)
  app.use(sanitizeInput);

  // 6. Global API Rate Limiter
  app.use('/api', globalLimiter);

  // 7. Health Check Endpoints (Opaque, zero secret exposure)
  const healthHandler = (req, res) => {
    res.status(200).json({
      status: 'ok',
      platform: 'DenaNeya v2.0',
      timestamp: new Date().toISOString()
    });
  };
  app.get('/health', healthHandler);
  app.get('/api/health', healthHandler);

  // 7b. Hosted Checkout Direct Page
  app.get('/pay/:invoiceId', checkoutPageHandler);

  // 8. Core API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/brands', brandRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/device', deviceSyncRouter);
  app.use('/api/devices', deviceManageRouter);
  app.use('/api/payment', paymentRoutes);
  app.use('/api/invoices', invoiceRoutes);
  app.use('/api/gateways', gatewayRoutes);
  app.use('/api/staff', staffRoutes);
  app.use('/api/billing', billingRoutes);
  app.use('/v1', v1Routes);

  // 9. 404 Route Handler
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      code: 'ROUTE_NOT_FOUND',
      message: `Cannot ${req.method} ${req.path}`
    });
  });

  // 10. Centralized Error Handling Middleware
  app.use((err, req, res, next) => {
    // Handle JSON syntax errors from body-parser
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_JSON',
        message: 'Malformed JSON payload in request body.'
      });
    }

    // Handle CORS origin rejection
    if (err.message === 'CORS_ORIGIN_NOT_ALLOWED') {
      return res.status(403).json({
        success: false,
        code: 'CORS_FORBIDDEN',
        message: 'Origin is not permitted by CORS policy.'
      });
    }

    // Handle payload too large
    if (err.type === 'entity.too.large' || err.status === 413) {
      return res.status(413).json({
        success: false,
        code: 'PAYLOAD_TOO_LARGE',
        message: 'Request payload exceeds the 100kb limit.'
      });
    }

    // Fallthrough error logger (sanitized, zero secrets logged)
    console.error(`[API Error] ${req.method} ${req.path} ->`, err.message || err);

    const statusCode = err.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message:
        process.env.NODE_ENV === 'production'
          ? 'An unexpected error occurred. Please contact support.'
          : err.message || 'Internal Server Error'
    });
  });

  return app;
}

export const app = createApp();
export default app;
