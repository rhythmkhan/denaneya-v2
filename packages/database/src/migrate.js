/**
 * DenaNeya v2.0 - Universal Migration Runner
 * Supports dynamic sequential discovery and execution for SQLite 3 and MySQL 8
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { getDatabase } = require('./connection.js');
const { dbConfig } = require('./config.js');

const TABLES_DROP_ORDER = [
  'admin_audit_logs',
  'credit_audit_logs',
  'impersonation_logs',
  'system_settings',
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
 * Robustly split SQL script by semicolons, preserving semicolons inside quotes.
 * @param {string} sql
 * @returns {string[]}
 */
function splitSqlStatements(sql) {
  const cleaned = sql.replace(/\/\*[\s\S]*?\*\/|--[^\r\n]*/g, '');
  const statements = [];
  let current = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inBacktick = false;

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    const prev = i > 0 ? cleaned[i - 1] : '';

    if (char === "'" && !inDoubleQuote && !inBacktick && prev !== '\\') {
      inSingleQuote = !inSingleQuote;
    } else if (char === '"' && !inSingleQuote && !inBacktick && prev !== '\\') {
      inDoubleQuote = !inDoubleQuote;
    } else if (char === '`' && !inSingleQuote && !inDoubleQuote && prev !== '\\') {
      inBacktick = !inBacktick;
    }

    if (char === ';' && !inSingleQuote && !inDoubleQuote && !inBacktick) {
      const trimmed = current.trim();
      if (trimmed) statements.push(trimmed);
      current = '';
    } else {
      current += char;
    }
  }

  const trimmed = current.trim();
  if (trimmed) statements.push(trimmed);

  return statements;
}

/**
 * Scan migrations directory for dialect-specific files in sorted order.
 * @param {string} migrationsDir
 * @param {string} dialect - 'sqlite' | 'mysql'
 * @returns {Array<{ name: string, filename: string, filepath: string }>}
 */
function getMigrationFiles(migrationsDir, dialect) {
  if (!fs.existsSync(migrationsDir)) return [];
  const allFiles = fs.readdirSync(migrationsDir);
  const migrationMap = new Map();

  for (const file of allFiles) {
    if (dialect === 'mysql') {
      const match = file.match(/^(\d+_[a-zA-Z0-9_]+)\.mysql\.sql$/);
      if (match) {
        migrationMap.set(match[1], {
          name: match[1],
          filename: file,
          filepath: path.join(migrationsDir, file)
        });
      }
    } else {
      // sqlite
      const match = file.match(/^(\d+_[a-zA-Z0-9_]+)\.sql$/);
      if (match && !file.endsWith('.mysql.sql')) {
        migrationMap.set(match[1], {
          name: match[1],
          filename: file,
          filepath: path.join(migrationsDir, file)
        });
      }
    }
  }

  return Array.from(migrationMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
  );
}

/**
 * Execute schema migrations against the configured database.
 * @param {Object} [dbInstance] - Optional existing database driver
 * @param {Object} [options]
 * @param {boolean} [options.reset=false] - Drop all tables before migration
 * @returns {Promise<{ success: boolean, tablesCreated: string[], dialect: string, migrationsApplied: string[] }>}
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

  const migrationsDir = path.resolve(__dirname, 'migrations');
  const migrationFiles = getMigrationFiles(migrationsDir, db.type);

  if (migrationFiles.length === 0) {
    console.warn(`[Migrator] No migration files found in ${migrationsDir} for dialect ${db.type}`);
  }

  const appliedMigrations = [];

  for (const m of migrationFiles) {
    const alreadyApplied = await db.get(
      'SELECT * FROM _migrations WHERE name = ?',
      [m.name]
    );

    if (alreadyApplied && !reset) {
      console.log(`[Migrator] Migration '${m.name}' is already applied.`);
      continue;
    }

    console.log(`[Migrator] Applying '${m.name}' from ${m.filename}...`);
    const sqlContent = fs.readFileSync(m.filepath, 'utf8');

    if (db.type === 'sqlite') {
      db.raw.exec(sqlContent);
      db.raw.prepare('INSERT OR REPLACE INTO _migrations (name) VALUES (?)').run(m.name);
    } else {
      // MySQL: Execute individual statements
      const statements = splitSqlStatements(sqlContent);
      for (const stmt of statements) {
        await db.query(stmt);
      }
      await db.query(
        'INSERT INTO `_migrations` (`name`) VALUES (?) ON DUPLICATE KEY UPDATE `name` = `name`',
        [m.name]
      );
    }

    console.log(`[Migrator] Migration '${m.name}' successfully applied!`);
    appliedMigrations.push(m.name);
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
    tablesCreated: tables,
    migrationsApplied: appliedMigrations
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
  TABLES_DROP_ORDER,
  splitSqlStatements,
  getMigrationFiles
};
