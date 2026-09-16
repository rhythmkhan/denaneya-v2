/**
 * DenaNeya v2.0 - Server Runtime Bootstrap
 * PM2 and Production Process Entrypoint
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createApp } from './app.js';
import dbPkg from '@denaneya/database';
import { startInvoiceReaper } from './services/invoiceReaperService.js';

const { getDatabase } = dbPkg;

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const PORT = process.env.PORT || 4000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// 1. Startup Security Precondition Validation
function validateEnvironment() {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    if (NODE_ENV === 'production') {
      console.error('FATAL: JWT_SECRET environment variable is missing.');
      process.exit(1);
    } else {
      process.env.JWT_SECRET = 'denaneya_development_jwt_secret_min_32_bytes_long_12345';
    }
  } else if (jwtSecret.length < 32) {
    if (NODE_ENV === 'production') {
      console.error('FATAL: JWT_SECRET must be at least 32 characters long for cryptographically secure HS256.');
      process.exit(1);
    }
  }
}

async function startServer(options = {}) {
  validateEnvironment();

  // 2. Database Connectivity Pre-flight
  let db = options.db;
  if (!db) {
    try {
      db = getDatabase(options.dbConfig);
      await db.query('SELECT 1');
      console.log(`[Database] Connected successfully (type: ${db.type}).`);
    } catch (err) {
      console.error('[Database] Pre-flight connection failed:', err.message);
      process.exit(1);
    }
  }

  // 3. Initialize Express App
  const app = createApp({ db });


  const server = app.listen(PORT, () => {
    console.log('=======================================================');
    console.log(`🚀 DenaNeya v2.0 API running on port ${PORT} [${NODE_ENV}]`);
    console.log(`🛡️  Security Headers & Rate Limiters active`);
    console.log(`🔒 Authentication & Tenant Isolation active`);
    console.log('=======================================================');
  });

  // Start 15-Minute Invoice TTL Background Reaper Daemon
  let reaper = null;
  try {
    reaper = startInvoiceReaper(getDatabase(), 60000);
  } catch (reaperErr) {
    console.error('[TTL Reaper] Failed to start reaper daemon:', reaperErr.message);
  }

  // 4. Graceful Shutdown Handlers
  const shutdown = async (signal) => {
    console.log(`\n[Process] Received ${signal}. Draining connections...`);
    if (reaper) {
      try {
        reaper.stop();
      } catch (_) {}
    }
    server.close(async () => {
      try {
        const db = getDatabase();
        await db.close();
        console.log('[Process] Database connection pool closed.');
      } catch (err) {
        console.error('[Process] Error closing database:', err.message);
      }
      console.log('[Process] Graceful shutdown complete. Exiting.');
      process.exit(0);
    });

    // Force shutdown if connections do not close in 10s
    setTimeout(() => {
      console.error('[Process] Forced shutdown after timeout.');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  return server;
}

// Execute server start if invoked as main entrypoint
if (process.argv[1] === __filename) {
  startServer().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

export { startServer };
export default startServer;
