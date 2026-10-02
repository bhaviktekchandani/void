/**
 * VOID Database Connection Pool
 * Robust PostgreSQL connection management using pg.Pool.
 */

require('dotenv').config();
const { Pool } = require('pg');
const { logger } = require('../utils/logger');

let pool = null;
let isConnected = false;

function getPool() {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    logger.warn('DATABASE_URL is not configured. Database operations will run in degraded/mock mode.');
    return null;
  }

  const sslConfig = process.env.DATABASE_SSL === 'false'
    ? false
    : (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('railway')
        ? { rejectUnauthorized: false }
        : (process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false));

  pool = new Pool({
    connectionString,
    ssl: sslConfig,
    max: 15,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
  });

  pool.on('error', (err) => {
    logger.error('Unexpected PostgreSQL client error on idle pool', err);
  });

  return pool;
}

/**
 * Execute parameterized query safely.
 * @param {string} text SQL statement
 * @param {any[]} params Query values
 */
async function query(text, params = []) {
  const p = getPool();
  if (!p) {
    throw new Error('Database is not configured or unavailable.');
  }

  const start = Date.now();
  try {
    const res = await p.query(text, params);
    const duration = Date.now() - start;
    logger.debug('Executed query', { duration, rows: res.rowCount });
    return res;
  } catch (err) {
    logger.error('Database query execution failure', { query: text, error: err.message });
    throw err;
  }
}

/**
 * Execute a function within a database transaction.
 * @param {Function} callback async (client) => result
 */
async function transaction(callback) {
  const p = getPool();
  if (!p) throw new Error('Database is not configured or unavailable.');

  const client = await p.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Test database connectivity.
 */
async function testConnection() {
  try {
    const p = getPool();
    if (!p) return false;
    await p.query('SELECT 1');
    isConnected = true;
    logger.info('Connected to PostgreSQL database successfully.');
    return true;
  } catch (err) {
    isConnected = false;
    logger.warn(`Could not connect to PostgreSQL database: ${err.message}`);
    return false;
  }
}

/**
 * Close database pool gracefully.
 */
async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
    isConnected = false;
    logger.info('PostgreSQL connection pool closed.');
  }
}

module.exports = {
  getPool,
  query,
  transaction,
  testConnection,
  closePool,
  isReady: () => isConnected
};
