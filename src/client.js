/**
 * VOID Discord Client Setup
 * Configures required gateway intents and registers event listeners.
 */

const { Client, GatewayIntentBits, Partials, Events } = require('discord.js');
const { handleInteraction } = require('./handlers/interactionHandler');
const { handleMessage } = require('./handlers/messageHandler');
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

  client.on(Events.InteractionCreate, handleInteraction);
  client.on(Events.MessageCreate, handleMessage);

  client.on(Events.Warn, (info) => logger.warn(`Discord client warning: ${info}`));
  client.on(Events.Error, (err) => logger.error('Discord client encountered an error', err));

  return client;
}

module.exports = { createClient };
