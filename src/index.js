/**
 * VOID — Main Process Entry Point
 */

require('dotenv').config();
const { createClient } = require('./client');
const { commandRegistry } = require('./commands/registry');
const { runMigrations } = require('./database/migrate');
const { testConnection, closePool } = require('./database/pool');
const { logger } = require('./utils/logger');

async function main() {
  logger.info('Initializing VOID...');

  const token = process.env.DISCORD_TOKEN;
  if (!token) {
    logger.error('CRITICAL: DISCORD_TOKEN is missing in environment variables. Bot cannot start.');
    logger.info('Please create a .env file based on .env.example with your Discord bot credentials.');
    process.exit(1);
  }

  // 1. Initialize Database
  if (process.env.DATABASE_URL) {
    try {
      const dbConnected = await testConnection();
      if (dbConnected) {
        await runMigrations();
      } else {
        logger.warn('Continuing startup without database. Settings and cases will not persist.');
      }
    } catch (dbErr) {
      logger.error('Database initialization encountered an error:', dbErr);
    }
  } else {
    logger.warn('DATABASE_URL is not set. VOID is running with ephemeral in-memory storage.');
  }

  // 2. Load Commands
  commandRegistry.loadAll();

  // 3. Start Discord Client
  const client = createClient();

  // 4. Graceful Shutdown
  const shutdown = async (signal) => {
    logger.info(`Received ${signal}. Shutting down VOID gracefully...`);
    try {
      if (client && client.isReady()) {
        await client.destroy();
        logger.info('Discord gateway connection terminated.');
      }
      await closePool();
      logger.info('VOID terminated cleanly.');
      process.exit(0);
    } catch (err) {
      logger.error('Error during shutdown', err);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // 5. Unhandled Exceptions
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Promise Rejection', reason);
  });

  process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception', err);
  });

  // 6. Connect to Discord
  try {
    await client.login(token);
  } catch (loginErr) {
    logger.error('Failed to log in to Discord gateway', loginErr);
    process.exit(1);
  }
}

// Start if executed directly
if (require.main === module) {
  main();
}

module.exports = { main };
