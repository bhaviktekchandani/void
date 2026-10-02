/**
 * VOID Slash Command Registration Script
 * Deploys slash commands to Discord via the REST API.
 * 
 * Usage:
 *   node src/scripts/deployCommands.js
 */

require('dotenv').config();
const { REST, Routes } = require('discord.js');
const { commandRegistry } = require('../commands/registry');
const { logger } = require('../utils/logger');

async function deployCommands() {
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.CLIENT_ID;
  const guildId = process.env.GUILD_ID;

  if (!token || !clientId) {
    logger.error('Cannot deploy slash commands: Missing DISCORD_TOKEN or CLIENT_ID in environment variables.');
    process.exit(1);
  }

  // Ensure commands are loaded
  commandRegistry.loadAll();
  const commands = commandRegistry.getSlashData();

  logger.info(`Deploying ${commands.length} slash command definitions to Discord...`);

  const rest = new REST({ version: '10' }).setToken(token);

  try {
    if (guildId) {
      // Development server deployment (instant update)
      logger.info(`Deploying commands to development guild ID: ${guildId}`);
      const data = await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: commands }
      );
      logger.info(`Successfully registered ${data.length} guild slash commands.`);
    } else {
      // Global deployment
      logger.info('Deploying commands globally to Discord...');
      const data = await rest.put(
        Routes.applicationCommands(clientId),
        { body: commands }
      );
      logger.info(`Successfully registered ${data.length} global slash commands.`);
    }
  } catch (err) {
    logger.error('Failed to deploy slash commands to Discord', err);
    process.exit(1);
  }
}

if (require.main === module) {
  deployCommands();
}

module.exports = { deployCommands };
