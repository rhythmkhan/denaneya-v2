/**
 * DenaNeya v2.0 - Database Configuration Loader
 */

'use strict';

const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env if present
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const client = (process.env.DB_CLIENT || 'sqlite').toLowerCase();

const dbConfig = {
  client,
  // SQLite settings
  sqlitePath: process.env.DB_SQLITE_PATH || path.resolve(__dirname, '../data/denaneya.sqlite'),
  // MySQL settings
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'denaneya_v2',
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10)
};

module.exports = {
  dbConfig
};
