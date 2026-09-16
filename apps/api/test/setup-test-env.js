/**
 * DenaNeya v2.0 - Dedicated Test Environment Preloader
 * Ensures test environment variables are set before any database modules are loaded.
 */

process.env.NODE_ENV = 'test';
process.env.DB_CLIENT = 'sqlite';
process.env.DB_SQLITE_PATH = ':memory:';
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'denaneya_development_jwt_secret_min_32_bytes_long_12345';
}
