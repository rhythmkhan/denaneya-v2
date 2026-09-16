/**
 * DenaNeya v2.0 - Dual-Driver Connection Abstraction
 * Supports Hostinger Production MySQL 8 and Local/Testing SQLite 3 (better-sqlite3)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const Database = require('better-sqlite3');
const { dbConfig, getDbConfig, isTestEnvironment } = require('./config.js');

let globalInstance = null;

/**
 * Explicitly set the active database singleton instance (Dependency Injection).
 * @param {Object} instance - Database driver interface
 * @returns {Object} Active driver instance
 */
function setDatabase(instance) {
  globalInstance = instance;
  return globalInstance;
}

/**
 * Reset/clear the active singleton database driver instance.
 * @returns {Promise<void>}
 */
function resetDatabase() {
  const prev = globalInstance;
  globalInstance = null;
  if (prev && typeof prev.close === 'function') {
    try {
      const p = prev.close();
      if (p && typeof p.then === 'function') {
        return p.catch(() => {});
      }
    } catch (_) {}
  }
  return Promise.resolve();
}

/**
 * Instantiate or return the singleton database driver instance.
 * @param {Object} [configOverride]
 * @returns {Object} Unified database driver interface
 */
function getDatabase(configOverride = {}) {
  const currentCfg = typeof getDbConfig === 'function' ? getDbConfig() : dbConfig;
  const cfg = { ...currentCfg, ...configOverride };

  // If a singleton exists and no override was passed, reuse it
  if (globalInstance && Object.keys(configOverride).length === 0) {
    return globalInstance;
  }

  // CIRCUIT BREAKER / KILL SWITCH:
  // Hard block against accidental remote MySQL connections during test runs
  const isTest = typeof isTestEnvironment === 'function'
    ? isTestEnvironment()
    : (process.env.NODE_ENV === 'test' || process.env.npm_lifecycle_event === 'test');

  if (cfg.client === 'mysql') {
    const isRemote = cfg.host && !['localhost', '127.0.0.1', '::1'].includes(cfg.host);
    if (isTest && isRemote && process.env.ALLOW_REMOTE_TEST_DB !== 'true') {
      throw new Error(
        `[DATABASE CIRCUIT BREAKER FATAL] Remote MySQL connection BLOCKED in test environment!\n` +
        `Attempted target: ${cfg.host}:${cfg.port}/${cfg.database}.\n` +
        `All automated tests MUST use in-memory SQLite ({ client: 'sqlite', sqlitePath: ':memory:' }).\n` +
        `If running an authorized live DB check, set ALLOW_REMOTE_TEST_DB=true.`
      );
    }
  }

  let driver = null;


  if (cfg.client === 'mysql') {
    const pool = mysql.createPool({
      host: cfg.host,
      port: cfg.port,
      user: cfg.user,
      password: cfg.password,
      database: cfg.database,
      waitForConnections: true,
      connectionLimit: cfg.connectionLimit || 10,
      queueLimit: 0,
      decimalNumbers: true,
      timezone: 'Z'
    });

    driver = {
      type: 'mysql',
      raw: pool,

      async query(sql, params = []) {
        const [result] = await pool.execute(sql, params);
        if (Array.isArray(result)) {
          return { rows: result, affectedRows: 0, insertId: null };
        }
        return {
          rows: [],
          affectedRows: result.affectedRows || 0,
          insertId: result.insertId || null
        };
      },

      async get(sql, params = []) {
        const [rows] = await pool.execute(sql, params);
        return (Array.isArray(rows) && rows[0]) || null;
      },

      async transaction(callback) {
        const conn = await pool.getConnection();
        await conn.beginTransaction();
        try {
          const txClient = {
            async query(sql, params = []) {
              const [result] = await conn.execute(sql, params);
              if (Array.isArray(result)) {
                return { rows: result, affectedRows: 0, insertId: null };
              }
              return {
                rows: [],
                affectedRows: result.affectedRows || 0,
                insertId: result.insertId || null
              };
            },
            async get(sql, params = []) {
              const [rows] = await conn.execute(sql, params);
              return (Array.isArray(rows) && rows[0]) || null;
            }
          };

          const res = await callback(txClient);
          await conn.commit();
          return res;
        } catch (err) {
          await conn.rollback();
          throw err;
        } finally {
          conn.release();
        }
      },

      async close() {
        await pool.end();
        if (globalInstance === driver) {
          globalInstance = null;
        }
      }
    };
  } else {
    // SQLite mode (better-sqlite3)
    const sqlitePath = cfg.sqlitePath || ':memory:';

    // Ensure parent directory exists for file-based SQLite
    if (sqlitePath !== ':memory:' && !sqlitePath.startsWith(':memory:')) {
      const dir = path.dirname(path.resolve(sqlitePath));
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    const db = new Database(sqlitePath);
    db.pragma('foreign_keys = ON');
    if (sqlitePath !== ':memory:') {
      db.pragma('journal_mode = WAL');
    }

    let sqliteTxQueue = Promise.resolve();

    driver = {
      type: 'sqlite',
      raw: db,

      async query(sql, params = []) {
        const trimmed = sql.trim().toUpperCase();
        const stmt = db.prepare(sql);
        if (trimmed.startsWith('SELECT') || trimmed.startsWith('PRAGMA')) {
          const rows = stmt.all(...params);
          return { rows, affectedRows: 0, insertId: null };
        }
        const info = stmt.run(...params);
        return {
          rows: [],
          affectedRows: info.changes,
          insertId: info.lastInsertRowid
        };
      },

      async get(sql, params = []) {
        const stmt = db.prepare(sql);
        return stmt.get(...params) || null;
      },

      async transaction(callback) {
        const run = async () => {
          db.prepare('BEGIN IMMEDIATE').run();
          try {
            const txClient = {
              async query(sql, params = []) {
                const trimmed = sql.trim().toUpperCase();
                const stmt = db.prepare(sql);
                if (trimmed.startsWith('SELECT') || trimmed.startsWith('PRAGMA')) {
                  const rows = stmt.all(...params);
                  return { rows, affectedRows: 0, insertId: null };
                }
                const info = stmt.run(...params);
                return {
                  rows: [],
                  affectedRows: info.changes,
                  insertId: info.lastInsertRowid
                };
              },
              async get(sql, params = []) {
                const stmt = db.prepare(sql);
                return stmt.get(...params) || null;
              }
            };

            const res = await callback(txClient);
            db.prepare('COMMIT').run();
            return res;
          } catch (err) {
            try {
              db.prepare('ROLLBACK').run();
            } catch (_) {}
            throw err;
          }
        };

        const resPromise = sqliteTxQueue.then(run, run);
        sqliteTxQueue = resPromise.catch(() => {});
        return resPromise;
      },

      async close() {
        db.close();
        if (globalInstance === driver) {
          globalInstance = null;
        }
      }
    };
  }

  // Bind to globalInstance if:
  // 1. No global instance currently exists, OR
  // 2. configOverride explicitly specifies setAsGlobal: true, OR
  // 3. No configOverride keys were supplied, OR
  // 4. In test mode and configOverride creates an isolated SQLite instance
  if (
    !globalInstance ||
    configOverride.setAsGlobal ||
    Object.keys(configOverride).length === 0 ||
    (isTest && configOverride.client === 'sqlite')
  ) {
    globalInstance = driver;
  }

  return driver;
}

module.exports = {
  getDatabase,
  setDatabase,
  resetDatabase
};

