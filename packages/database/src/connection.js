/**
 * DenaNeya v2.0 - Dual-Driver Connection Abstraction
 * Supports Hostinger Production MySQL 8 and Local/Testing SQLite 3 (better-sqlite3)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const Database = require('better-sqlite3');
const { dbConfig } = require('./config.js');

let globalInstance = null;

/**
 * Instantiate or return the singleton database driver instance.
 * @param {Object} [configOverride]
 * @returns {Object} Unified database driver interface
 */
function getDatabase(configOverride = {}) {
  const cfg = { ...dbConfig, ...configOverride };

  // If a singleton exists and no override was passed, reuse it
  if (globalInstance && Object.keys(configOverride).length === 0) {
    return globalInstance;
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

  if (Object.keys(configOverride).length === 0) {
    globalInstance = driver;
  }

  return driver;
}

module.exports = {
  getDatabase
};
