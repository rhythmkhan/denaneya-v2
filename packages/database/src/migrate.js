/**
 * DenaNeya v2.0 - Universal Migration Runner
 * Supports both SQLite 3 and MySQL 8
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { getDatabase } = require('./connection.js');
const { dbConfig } = require('./config.js');

const TABLES_DROP_ORDER = [
  'affiliate_referrals',
  'staff_permissions',
  'webhook_logs',
  'stored_data',
  'invoices',
  'gateways',
  'devices',
  'brands',
  'users',
  '_migrations'
];

/**
 * Execute schema migrations against the configured database.
 * @param {Object} [dbInstance] - Optional existing database driver
 * @param {Object} [options]
 * @param {boolean} [options.reset=false] - Drop all tables before migration
 * @returns {Promise<{ success: boolean, tablesCreated: string[], dialect: string }>}
 */
async function runMigrations(dbInstance = null, options = {}) {
  const db = dbInstance || getDatabase();
  const reset = options.reset || process.argv.includes('--reset');

  console.log(`[Migrator] Starting database migration for dialect: ${db.type}...`);

  if (reset) {
    // HARDENED SAFETY GUARD: Prevent accidental drop of production or remote MySQL database
    if (db.type === 'mysql') {
      const isProd = process.env.NODE_ENV === 'production' || !process.env.NODE_ENV;
      const host = (dbConfig.host || '').toLowerCase();
      const isRemote = host && !['localhost', '127.0.0.1', '::1'].includes(host);
      const isAuthorized =
        process.env.CONFIRM_PRODUCTION_RESET === 'true' ||
        process.env.ALLOW_PRODUCTION_DROP === 'true' ||
        process.env.ALLOW_PRODUCTION_RESET === 'true' ||
        process.argv.includes('--force-production-reset');

      if ((isProd || isRemote) && !isAuthorized) {
        const errorMsg =
          `[Migrator FATAL SAFETY ABORT] Table drop/reset requested against MySQL database ` +
          `(host: ${dbConfig.host}, database: ${dbConfig.database}, NODE_ENV: ${process.env.NODE_ENV}). ` +
          `Refusing to drop tables! Production/remote resets are permanently blocked without explicit authorization. ` +
          `To override, you must supply CONFIRM_PRODUCTION_RESET=true or ALLOW_PRODUCTION_DROP=true.`;
        console.error(errorMsg);
        throw new Error(errorMsg);
      }
    }

    console.log('[Migrator] Reset requested. Dropping all existing tables...');

    if (db.type === 'sqlite') {
      db.raw.pragma('foreign_keys = OFF');
      for (const table of TABLES_DROP_ORDER) {
        db.raw.prepare(`DROP TABLE IF EXISTS ${table}`).run();
      }
      db.raw.pragma('foreign_keys = ON');
    } else {
      // MySQL
      await db.query('SET FOREIGN_KEY_CHECKS = 0');
      for (const table of TABLES_DROP_ORDER) {
        await db.query(`DROP TABLE IF EXISTS \`${table}\``);
      }
      await db.query('SET FOREIGN_KEY_CHECKS = 1');
    }
    console.log('[Migrator] All tables dropped.');
  }

  // Ensure migration tracking table exists
  if (db.type === 'sqlite') {
    db.raw.prepare(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
  } else {
    await db.query(`
      CREATE TABLE IF NOT EXISTS \`_migrations\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`name\` VARCHAR(255) NOT NULL UNIQUE,
        \`applied_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  const migrationFile = db.type === 'mysql'
    ? path.resolve(__dirname, 'migrations/001_initial_schema.mysql.sql')
    : path.resolve(__dirname, 'migrations/001_initial_schema.sql');

  const migrationName = '001_initial_schema';
  const alreadyApplied = await db.get(
    'SELECT * FROM _migrations WHERE name = ?',
    [migrationName]
  );

  if (alreadyApplied && !reset) {
    console.log(`[Migrator] Migration '${migrationName}' is already applied.`);
  } else {
    console.log(`[Migrator] Applying '${migrationName}' from ${path.basename(migrationFile)}...`);
    const sqlContent = fs.readFileSync(migrationFile, 'utf8');

    if (db.type === 'sqlite') {
      db.raw.exec(sqlContent);
      db.raw.prepare('INSERT OR REPLACE INTO _migrations (name) VALUES (?)').run(migrationName);
    } else {
      // MySQL: Strip comments and execute individual statements
      const cleanedSql = sqlContent.replace(/--[^\r\n]*/g, '');
      const statements = cleanedSql
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      for (const stmt of statements) {
        await db.query(stmt);
      }
      await db.query('INSERT INTO `_migrations` (`name`) VALUES (?) ON DUPLICATE KEY UPDATE `name` = `name`', [migrationName]);
    }
    console.log(`[Migrator] Migration '${migrationName}' successfully applied!`);
  }

  // Verify created tables
  let tables = [];
  if (db.type === 'sqlite') {
    const rows = db.raw.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
    tables = rows.map((r) => r.name);
  } else {
    const res = await db.query("SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() ORDER BY table_name");
    tables = res.rows.map((r) => r.table_name || r.TABLE_NAME);
  }

  console.log('[Migrator] Current tables in database:', tables);
  return {
    success: true,
    dialect: db.type,
    tablesCreated: tables
  };
}

if (require.main === module) {
  runMigrations()
    .then((res) => {
      console.log('[Migrator] Finished with result:', res.success ? 'OK' : 'FAILED');
      process.exit(res.success ? 0 : 1);
    })
    .catch((err) => {
      console.error('[Migrator] Unhandled migration error:', err);
      process.exit(1);
    });
}

module.exports = {
  runMigrations,
  TABLES_DROP_ORDER
};
