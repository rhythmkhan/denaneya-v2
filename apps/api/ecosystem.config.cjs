/**
 * DenaNeya v2.0 - Hostinger Production PM2 Cluster Configuration (CommonJS)
 * File: apps/api/ecosystem.config.cjs
 */

module.exports = {
  apps: [
    {
      name: 'denaneya-api',
      script: './src/server.js',
      instances: process.env.PM2_INSTANCES || 'max',
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      listen_timeout: 8000,
      kill_timeout: 5000,
      wait_ready: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 4000
      },
      out_file: './logs/pm2-out.log',
      error_file: './logs/pm2-err.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      time: true
    }
  ]
};
