/**
 * VOID Database Migration Runner
 * Executes database schema initialization safely.
 */

const fs = require('fs');
const path = require('path');
const { query, testConnection, closePool } = require('./pool');
const { logger } = require('../utils/logger');

async function runMigrations() {
  logger.info('Starting VOID database migration...');

  const connected = await testConnection();
  if (!connected) {
    logger.warn('Skipping migration: Database connection could not be established.');
    return false;
  }

  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    await query(sql);
    logger.info('Database schema migration completed successfully.');
    return true;
  } catch (err) {
    logger.error('Database migration failed', err);
    throw err;
  }
}

// Allow direct execution: node src/database/migrate.js
if (require.main === module) {
  runMigrations()
    .then(() => {
      logger.info('Migration process finished.');
      return closePool();
    })
    .catch((err) => {
      logger.error('Migration failed with fatal error', err);
      process.exit(1);
    });
}

module.exports = { runMigrations };
