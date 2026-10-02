/**
 * VOID Discord Client Setup
 * Configures required gateway intents and registers event listeners.
 */

const { Client, GatewayIntentBits, Partials, Events } = require('discord.js');
const { handleInteraction } = require('./handlers/interactionHandler');
const { handleMessage } = require('./handlers/messageHandler');
const { antiraidService } = require('./services/antiraidService');
const { eventLogService } = require('./services/eventLogService');
const { logger } = require('./utils/logger');

function createClient() {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent, // Required for prefix command execution
      GatewayIntentBits.GuildModeration
    ],
    partials: [
      Partials.Message,
      Partials.Channel,
      Partials.User,
      Partials.GuildMember
    ]
  });

  client.once(Events.ClientReady, (readyClient) => {
    logger.info(`VOID online as ${readyClient.user.tag} (ID: ${readyClient.user.id})`);
    logger.info(`Serving ${readyClient.guilds.cache.size} server(s). Default prefix: .?`);
  });

  // Core command listeners
  client.on(Events.InteractionCreate, handleInteraction);
  client.on(Events.MessageCreate, handleMessage);

  // Lifecycle & audit event listeners
  client.on(Events.GuildMemberAdd, async (member) => {
    try {
      await antiraidService.handleMemberJoin(member);
      await eventLogService.logMemberJoin(member);
    } catch (err) {
      logger.error('Error handling GuildMemberAdd event', err);
    }
  });

  client.on(Events.GuildMemberRemove, async (member) => {
    try {
      await eventLogService.logMemberLeave(member);
    } catch (err) {
      logger.error('Error handling GuildMemberRemove event', err);
    }
  });

  client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
    try {
      await eventLogService.logMemberUpdate(oldMember, newMember);
    } catch (err) {
      logger.error('Error handling GuildMemberUpdate event', err);
    }
  });

  client.on(Events.GuildBanAdd, async (ban) => {
    try {
      await eventLogService.logBanAdd(ban);
    } catch (err) {
      logger.error('Error handling GuildBanAdd event', err);
    }
  });

  client.on(Events.GuildBanRemove, async (ban) => {
    try {
      await eventLogService.logBanRemove(ban);
    } catch (err) {
      logger.error('Error handling GuildBanRemove event', err);
    }
  });

  client.on(Events.Warn, (info) => logger.warn(`Discord client warning: ${info}`));
  client.on(Events.Error, (err) => logger.error('Discord client encountered an error', err));

  return client;
}

module.exports = { createClient };
