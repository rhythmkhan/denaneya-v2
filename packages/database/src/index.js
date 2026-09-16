/**
 * DenaNeya v2.0 - Database Package Entry Point
 * Exports dual-driver connection manager, dynamic migration runner, seed catalogs,
 * and Super Admin Suite helper operations.
 */

'use strict';

const { getDatabase, setDatabase, resetDatabase } = require('./connection.js');
const { dbConfig, resolveDbConfig, getDbConfig, isTestEnvironment } = require('./config.js');
const { runMigrations, TABLES_DROP_ORDER, splitSqlStatements, getMigrationFiles } = require('./migrate.js');
const { runSeed } = require('./seeds/seedRunner.js');
const { GATEWAY_CATALOG, getGatewaysByTab, getGatewayById } = require('./seeds/gatewayCatalog.seed.js');
const fixtures = require('./seeds/demoFixtures.seed.js');
const {
  getSystemSetting,
  setSystemSetting,
  getAllSystemSettings,
  createAdminAuditLog,
  getAdminAuditLogs,
  createCreditAuditLog,
  getCreditAuditLogs,
  createImpersonationLog,
  getImpersonationLogs
} = require('./superadmin.js');

module.exports = {
  getDatabase,
  setDatabase,
  resetDatabase,
  dbConfig,
  resolveDbConfig,
  getDbConfig,
  isTestEnvironment,
  runMigrations,
  TABLES_DROP_ORDER,
  splitSqlStatements,
  getMigrationFiles,
  runSeed,
  GATEWAY_CATALOG,
  getGatewaysByTab,
  getGatewayById,
  fixtures,
  // Super Admin Suite Helpers
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
