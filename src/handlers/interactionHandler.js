/**
 * VOID Interaction Handler
 * Processes Discord slash command interactions.
 */

const { commandRegistry } = require('../commands/registry');
const { CommandContext } = require('../commands/context');
const { prefixService } = require('../services/prefixService');
const { handleCommandError } = require('./errorHandler');
const { logger } = require('../utils/logger');

async function handleInteraction(interaction) {
  if (!interaction.isChatInputCommand()) return;

  if (!interaction.guild) {
    return interaction.reply({
      content: 'VOID commands can only be executed within a server.',
      ephemeral: true
    });
  }

  const command = commandRegistry.get(interaction.commandName);
  if (!command) {
    logger.warn(`Received unknown slash command: ${interaction.commandName}`);
    return interaction.reply({
      content: 'This command is not recognized or has been decommissioned.',
      ephemeral: true
    });
  }

  const prefix = await prefixService.getPrefix(interaction.guild.id);

  const ctx = new CommandContext({
    isSlash: true,
    interaction,
    commandName: interaction.commandName,
    prefix
  });

  try {
    await command.execute(ctx);
  } catch (err) {
    await handleCommandError(err, ctx);
  }
}

module.exports = { handleInteraction };
