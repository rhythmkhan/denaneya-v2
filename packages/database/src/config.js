/**
 * DenaNeya v2.0 - Dynamic Database Configuration Loader
 * Supports dynamic environment variables, test isolation, and dual-driver switching.
 */

'use strict';

const path = require('path');
const dotenv = require('dotenv');

function isTestEnvironment() {
  return (
    process.env.NODE_ENV === 'test' ||
    process.env.npm_lifecycle_event === 'test' ||
    process.argv.some((arg) => /test|\.test\.js|\.spec\.js/i.test(arg))
  );
}

// Load environment variables from .env only if NOT running in test mode
// or if explicitly requested via LOAD_DOTENV_IN_TEST=true
const isTestMode = isTestEnvironment();
if (!isTestMode || process.env.LOAD_DOTENV_IN_TEST === 'true') {
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
  dotenv.config();
}

/**
 * Dynamically evaluate database configuration based on current process.env.
 * @returns {Object} Database configuration object
 */
function resolveDbConfig() {
  const isTest = isTestEnvironment();

  let client;
  if (isTest && process.env.ALLOW_REMOTE_TEST_DB !== 'true') {
    client = 'sqlite';
  } else {
    client = (process.env.DB_CLIENT || (isTest ? 'sqlite' : 'mysql')).toLowerCase();
  }

  const sqlitePath =
    isTest && process.env.ALLOW_REMOTE_TEST_DB !== 'true'
      ? (process.env.DB_SQLITE_PATH || ':memory:')
      : (process.env.DB_SQLITE_PATH || path.resolve(__dirname, '../data/denaneya.sqlite'));

  return {
    client,
    sqlitePath,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'denaneya_v2',
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10),
    isTest
  };
}

const getDbConfig = resolveDbConfig;

// Export dynamic proxy to ensure any read of dbConfig reflects current env state
const dbConfig = new Proxy({}, {
  get(target, prop) {
    return resolveDbConfig()[prop];
  },
  ownKeys() {
    return Reflect.ownKeys(resolveDbConfig());
  },
  getOwnPropertyDescriptor(target, prop) {
    return Object.getOwnPropertyDescriptor(resolveDbConfig(), prop);
  }
});

module.exports = {
  dbConfig,
  resolveDbConfig,
  getDbConfig,
  isTestEnvironment
};

