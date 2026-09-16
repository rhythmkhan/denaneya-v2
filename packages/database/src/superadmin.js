/**
 * DenaNeya v2.0 - Super Admin & System Settings Database Operations
 * Dual-driver support (SQLite 3 and MySQL 8) with JSON parsing and foreign key cascades.
 */

'use strict';

const crypto = require('node:crypto');
const { getDatabase } = require('./connection.js');

function resolveDb(dbOrParam) {
  if (dbOrParam && (typeof dbOrParam.query === 'function' || typeof dbOrParam.get === 'function')) {
    return dbOrParam;
  }
  return getDatabase();
}

function parseJsonField(val, fallback = null) {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'object') return val;
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch (_) {
      return fallback;
    }
  }
  return fallback;
}

// -----------------------------------------------------------------------------
// 1. SYSTEM SETTINGS HELPERS
// -----------------------------------------------------------------------------

/**
 * Fetch a system setting value by key, returning default if not found.
 */
async function getSystemSetting(dbOrKey, keyOrDefault, defaultVal = null) {
  let db, keyName, fallback;
  if (typeof dbOrKey === 'string') {
    db = getDatabase();
    keyName = dbOrKey;
    fallback = keyOrDefault !== undefined ? keyOrDefault : null;
  } else {
    db = resolveDb(dbOrKey);
    keyName = keyOrDefault;
    fallback = defaultVal !== undefined ? defaultVal : null;
  }

  const row = await db.get(
    'SELECT key_name, category, value_json, description, updated_by, created_at, updated_at FROM system_settings WHERE key_name = ?',
    [keyName]
  );

  if (!row) return fallback;
  return parseJsonField(row.value_json, fallback);
}

/**
 * Upsert a system setting value (dual-driver ON CONFLICT / ON DUPLICATE KEY UPDATE).
 */
async function setSystemSetting(dbOrKey, keyOrCategory, categoryOrValue, valueOrUpdatedBy, updatedByOrDesc, descParam) {
  let db, keyName, category, value, updatedBy, description;

  if (typeof dbOrKey === 'object' && dbOrKey && (typeof dbOrKey.query === 'function' || typeof dbOrKey.get === 'function')) {
    db = dbOrKey;
    keyName = keyOrCategory;
    category = categoryOrValue;
    value = valueOrUpdatedBy;
    updatedBy = updatedByOrDesc || null;
    description = descParam || null;
  } else if (typeof dbOrKey === 'object' && dbOrKey && dbOrKey.keyName) {
    db = resolveDb(keyOrCategory);
    keyName = dbOrKey.keyName;
    category = dbOrKey.category;
    value = dbOrKey.value;
    updatedBy = dbOrKey.updatedBy || null;
    description = dbOrKey.description || null;
  } else {
    db = getDatabase();
    keyName = dbOrKey;
    category = keyOrCategory;
    value = categoryOrValue;
    updatedBy = valueOrUpdatedBy || null;
    description = updatedByOrDesc || null;
  }

  const jsonStr = typeof value === 'string' ? value : JSON.stringify(value);

  if (db.type === 'mysql') {
    const sql = `
      INSERT INTO \`system_settings\` (\`key_name\`, \`category\`, \`value_json\`, \`updated_by\`, \`description\`, \`updated_at\`)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON DUPLICATE KEY UPDATE
        \`category\` = VALUES(\`category\`),
        \`value_json\` = VALUES(\`value_json\`),
        \`updated_by\` = VALUES(\`updated_by\`),
        \`description\` = COALESCE(VALUES(\`description\`), \`system_settings\`.\`description\`),
        \`updated_at\` = CURRENT_TIMESTAMP
    `;
    await db.query(sql, [keyName, category, jsonStr, updatedBy, description]);
  } else {
    const sql = `
      INSERT INTO system_settings (key_name, category, value_json, updated_by, description, updated_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key_name) DO UPDATE SET
        category = excluded.category,
        value_json = excluded.value_json,
        updated_by = excluded.updated_by,
        description = COALESCE(excluded.description, system_settings.description),
        updated_at = CURRENT_TIMESTAMP
    `;
    await db.query(sql, [keyName, category, jsonStr, updatedBy, description]);
  }

  return {
    key_name: keyName,
    category,
    value: parseJsonField(jsonStr, value),
    updated_by: updatedBy,
    description
  };
}

/**
 * Fetch all system settings, optionally filtered by category.
 */
async function getAllSystemSettings(dbOrCategory = null, categoryParam = null) {
  let db, category;
  if (typeof dbOrCategory === 'string') {
    db = getDatabase();
    category = dbOrCategory;
  } else if (dbOrCategory && (typeof dbOrCategory.query === 'function' || typeof dbOrCategory.get === 'function')) {
    db = dbOrCategory;
    category = categoryParam;
  } else {
    db = getDatabase();
    category = null;
  }

  let sql = 'SELECT key_name, category, value_json, description, updated_by, created_at, updated_at FROM system_settings';
  const params = [];
  if (category) {
    sql += ' WHERE category = ?';
    params.push(category);
  }
  sql += ' ORDER BY category ASC, key_name ASC';

  const result = await db.query(sql, params);
  const rows = result.rows || [];
  const settings = {};
  for (const row of rows) {
    settings[row.key_name] = {
      key_name: row.key_name,
      category: row.category,
      value: parseJsonField(row.value_json),
      description: row.description,
      updated_by: row.updated_by,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
  return settings;
}

// -----------------------------------------------------------------------------
// 2. ADMIN AUDIT LOGS HELPERS
// -----------------------------------------------------------------------------

/**
 * Create a new admin audit log record.
 */
async function createAdminAuditLog(dbOrData, dataParam = null) {
  let db, data;
  if (dataParam) {
    db = resolveDb(dbOrData);
    data = dataParam;
  } else {
    db = getDatabase();
    data = dbOrData;
  }

  const id = data.id || `audit_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`;
  const adminId = data.adminId || data.admin_id;
  const action = data.action;
  const targetType = data.targetType || data.target_type || null;
  const targetId = data.targetId || data.target_id || null;
  const details = data.details || data.details_json || null;
  const ipAddress = data.ipAddress || data.ip_address || null;
  const userAgent = data.userAgent || data.user_agent || null;

  if (!adminId) throw new Error('adminId is required for admin_audit_logs');
  if (!action) throw new Error('action is required for admin_audit_logs');

  const detailsJson = details !== null ? (typeof details === 'string' ? details : JSON.stringify(details)) : null;

  const sql = `
    INSERT INTO admin_audit_logs (id, admin_id, action, target_type, target_id, details_json, ip_address, user_agent, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `;

  await db.query(sql, [id, adminId, action, targetType, targetId, detailsJson, ipAddress, userAgent]);

  return {
    id,
    admin_id: adminId,
    action,
    target_type: targetType,
    target_id: targetId,
    details: parseJsonField(detailsJson),
    ip_address: ipAddress,
    user_agent: userAgent
  };
}

/**
 * Query paginated admin audit logs with optional filters and admin details.
 */
async function getAdminAuditLogs(dbOrFilters = {}, filtersParam = {}) {
  let db, filters;
  if (dbOrFilters && (typeof dbOrFilters.query === 'function' || typeof dbOrFilters.get === 'function')) {
    db = dbOrFilters;
    filters = filtersParam || {};
  } else {
    db = getDatabase();
    filters = dbOrFilters || {};
  }

  const limit = Math.min(Math.max(parseInt(filters.limit, 10) || 50, 1), 500);
  const offset = Math.max(parseInt(filters.offset, 10) || 0, 0);

  const conditions = [];
  const params = [];

  if (filters.adminId || filters.admin_id) {
    conditions.push('a.admin_id = ?');
    params.push(filters.adminId || filters.admin_id);
  }
  if (filters.action) {
    conditions.push('a.action = ?');
    params.push(filters.action);
  }
  if (filters.targetType || filters.target_type) {
    conditions.push('a.target_type = ?');
    params.push(filters.targetType || filters.target_type);
  }
  if (filters.targetId || filters.target_id) {
    conditions.push('a.target_id = ?');
    params.push(filters.targetId || filters.target_id);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countSql = `SELECT COUNT(*) AS total FROM admin_audit_logs a ${whereClause}`;
  const countRow = await db.get(countSql, params);
  const total = countRow ? Number(countRow.total || countRow['COUNT(*)'] || 0) : 0;

  const listSql = `
    SELECT 
      a.id, a.admin_id, a.action, a.target_type, a.target_id, a.details_json,
      a.ip_address, a.user_agent, a.created_at,
      u.name AS admin_name, u.email AS admin_email
    FROM admin_audit_logs a
    LEFT JOIN users u ON a.admin_id = u.id
    ${whereClause}
    ORDER BY a.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const rowsRes = await db.query(listSql, [...params, limit, offset]);
  const rows = (rowsRes.rows || []).map(r => ({
    ...r,
    details: parseJsonField(r.details_json)
  }));

  return { logs: rows, total, limit, offset };
}

// -----------------------------------------------------------------------------
// 3. CREDIT AUDIT LOGS HELPERS
// -----------------------------------------------------------------------------

/**
 * Record a manual credit balance adjustment.
 */
async function createCreditAuditLog(dbOrData, dataParam = null) {
  let db, data;
  if (dataParam) {
    db = resolveDb(dbOrData);
    data = dataParam;
  } else {
    db = getDatabase();
    data = dbOrData;
  }

  const id = data.id || `c_audit_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`;
  const userId = data.userId || data.user_id;
  const adminId = data.adminId || data.admin_id;
  const deltaCredits = parseInt(data.deltaCredits !== undefined ? data.deltaCredits : data.delta_credits, 10);
  const previousCredits = parseInt(data.previousCredits !== undefined ? data.previousCredits : data.previous_credits, 10);
  const newCredits = parseInt(data.newCredits !== undefined ? data.newCredits : data.new_credits, 10);
  const reason = data.reason;

  if (!userId) throw new Error('userId is required for credit_audit_logs');
  if (!adminId) throw new Error('adminId is required for credit_audit_logs');
  if (isNaN(deltaCredits)) throw new Error('deltaCredits must be an integer');
  if (isNaN(previousCredits)) throw new Error('previousCredits must be an integer');
  if (isNaN(newCredits)) throw new Error('newCredits must be an integer');
  if (!reason || !reason.trim()) throw new Error('reason is mandatory for credit adjustments');

  const sql = `
    INSERT INTO credit_audit_logs (id, user_id, admin_id, delta_credits, previous_credits, new_credits, reason, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `;

  await db.query(sql, [id, userId, adminId, deltaCredits, previousCredits, newCredits, reason.trim()]);

  return {
    id,
    user_id: userId,
    admin_id: adminId,
    delta_credits: deltaCredits,
    previous_credits: previousCredits,
    new_credits: newCredits,
    reason: reason.trim()
  };
}

/**
 * Fetch credit audit logs with user and admin metadata.
 */
async function getCreditAuditLogs(dbOrFilters = {}, filtersParam = {}) {
  let db, filters;
  if (dbOrFilters && (typeof dbOrFilters.query === 'function' || typeof dbOrFilters.get === 'function')) {
    db = dbOrFilters;
    filters = filtersParam || {};
  } else {
    db = getDatabase();
    filters = dbOrFilters || {};
  }

  const limit = Math.min(Math.max(parseInt(filters.limit, 10) || 50, 1), 500);
  const offset = Math.max(parseInt(filters.offset, 10) || 0, 0);

  const conditions = [];
  const params = [];

  if (filters.userId || filters.user_id) {
    conditions.push('c.user_id = ?');
    params.push(filters.userId || filters.user_id);
  }
  if (filters.adminId || filters.admin_id) {
    conditions.push('c.admin_id = ?');
    params.push(filters.adminId || filters.admin_id);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countSql = `SELECT COUNT(*) AS total FROM credit_audit_logs c ${whereClause}`;
  const countRow = await db.get(countSql, params);
  const total = countRow ? Number(countRow.total || countRow['COUNT(*)'] || 0) : 0;

  const listSql = `
    SELECT 
      c.id, c.user_id, c.admin_id, c.delta_credits, c.previous_credits, c.new_credits, c.reason, c.created_at,
      u.name AS user_name, u.email AS user_email,
      a.name AS admin_name, a.email AS admin_email
    FROM credit_audit_logs c
    LEFT JOIN users u ON c.user_id = u.id
    LEFT JOIN users a ON c.admin_id = a.id
    ${whereClause}
    ORDER BY c.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const rowsRes = await db.query(listSql, [...params, limit, offset]);

  return { logs: rowsRes.rows || [], total, limit, offset };
}

// -----------------------------------------------------------------------------
// 4. IMPERSONATION LOGS HELPERS
// -----------------------------------------------------------------------------

/**
 * Record an impersonation session transition (START / EXIT).
 */
async function createImpersonationLog(dbOrData, dataParam = null) {
  let db, data;
  if (dataParam) {
    db = resolveDb(dbOrData);
    data = dataParam;
  } else {
    db = getDatabase();
    data = dbOrData;
  }

  const id = data.id || `imp_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`;
  const adminId = data.adminId || data.admin_id;
  const targetUserId = data.targetUserId || data.target_user_id;
  const action = data.action; // 'START_IMPERSONATION' | 'EXIT_IMPERSONATION'
  const ipAddress = data.ipAddress || data.ip_address || null;
  const userAgent = data.userAgent || data.user_agent || null;
  const metadata = data.metadata || data.metadata_json || null;

  if (!adminId) throw new Error('adminId is required for impersonation_logs');
  if (!targetUserId) throw new Error('targetUserId is required for impersonation_logs');
  if (!action) throw new Error('action is required for impersonation_logs');

  const metadataJson = metadata !== null ? (typeof metadata === 'string' ? metadata : JSON.stringify(metadata)) : null;

  const sql = `
    INSERT INTO impersonation_logs (id, admin_id, target_user_id, action, ip_address, user_agent, metadata_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `;

  await db.query(sql, [id, adminId, targetUserId, action, ipAddress, userAgent, metadataJson]);

  return {
    id,
    admin_id: adminId,
    target_user_id: targetUserId,
    action,
    ip_address: ipAddress,
    user_agent: userAgent,
    metadata: parseJsonField(metadataJson)
  };
}

/**
 * Fetch impersonation history with merchant and super admin details.
 */
async function getImpersonationLogs(dbOrFilters = {}, filtersParam = {}) {
  let db, filters;
  if (dbOrFilters && (typeof dbOrFilters.query === 'function' || typeof dbOrFilters.get === 'function')) {
    db = dbOrFilters;
    filters = filtersParam || {};
  } else {
    db = getDatabase();
    filters = dbOrFilters || {};
  }

  const limit = Math.min(Math.max(parseInt(filters.limit, 10) || 50, 1), 500);
  const offset = Math.max(parseInt(filters.offset, 10) || 0, 0);

  const conditions = [];
  const params = [];

  if (filters.adminId || filters.admin_id) {
    conditions.push('i.admin_id = ?');
    params.push(filters.adminId || filters.admin_id);
  }
  if (filters.targetUserId || filters.target_user_id) {
    conditions.push('i.target_user_id = ?');
    params.push(filters.targetUserId || filters.target_user_id);
  }
  if (filters.action) {
    conditions.push('i.action = ?');
    params.push(filters.action);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countSql = `SELECT COUNT(*) AS total FROM impersonation_logs i ${whereClause}`;
  const countRow = await db.get(countSql, params);
  const total = countRow ? Number(countRow.total || countRow['COUNT(*)'] || 0) : 0;

  const listSql = `
    SELECT 
      i.id, i.admin_id, i.target_user_id, i.action, i.ip_address, i.user_agent, i.metadata_json, i.created_at,
      u.name AS target_name, u.email AS target_email,
      a.name AS admin_name, a.email AS admin_email
    FROM impersonation_logs i
    LEFT JOIN users u ON i.target_user_id = u.id
    LEFT JOIN users a ON i.admin_id = a.id
    ${whereClause}
    ORDER BY i.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const rowsRes = await db.query(listSql, [...params, limit, offset]);
  const rows = (rowsRes.rows || []).map(r => ({
    ...r,
    metadata: parseJsonField(r.metadata_json)
  }));

  return { logs: rows, total, limit, offset };
}

module.exports = {
  getSystemSetting,
  setSystemSetting,
  getAllSystemSettings,
  createAdminAuditLog,
  getAdminAuditLogs,
  createCreditAuditLog,
  getCreditAuditLogs,
  createImpersonationLog,
  getImpersonationLogs
};
