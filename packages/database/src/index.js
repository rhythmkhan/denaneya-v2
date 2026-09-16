/**
 * DenaNeya v2.0 - Database Package Entry Point
 * Exports dual-driver connection manager, migration runner, and seed catalogs.
 */

'use strict';

const { getDatabase } = require('./connection.js');
const { dbConfig } = require('./config.js');
const { runMigrations, TABLES_DROP_ORDER } = require('./migrate.js');
const { runSeed } = require('./seeds/seedRunner.js');
const { GATEWAY_CATALOG, getGatewaysByTab, getGatewayById } = require('./seeds/gatewayCatalog.seed.js');
const fixtures = require('./seeds/demoFixtures.seed.js');

module.exports = {
  getDatabase,
  dbConfig,
  runMigrations,
  TABLES_DROP_ORDER,
  runSeed,
  GATEWAY_CATALOG,
  getGatewaysByTab,
  getGatewayById,
  fixtures
};
