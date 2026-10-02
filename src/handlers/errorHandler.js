/**
 * VOID Centralized Error Handler
 * Safely handles and logs execution exceptions without leaking internals to Discord.
 */

const { logger } = require('../utils/logger');
const { voidEmbeds } = require('../embeds/builder');

async function handleCommandError(err, ctx) {
  logger.error(`Error executing command '${ctx?.commandName || 'unknown'}' in guild '${ctx?.guild?.id || 'DM'}'`, err);

  const userMessage = 'An unexpected error occurred while executing this command. Please try again.';

  try {
    if (ctx) {
      if (ctx.isSlash && ctx.interaction) {
        if (ctx.interaction.deferred) {
          await ctx.interaction.editReply({ embeds: [voidEmbeds.error(userMessage)] }).catch(() => null);
        } else if (ctx.interaction.replied) {
          await ctx.interaction.followUp({ embeds: [voidEmbeds.error(userMessage)] }).catch(() => null);
        } else {
          await ctx.interaction.reply({ embeds: [voidEmbeds.error(userMessage)], ephemeral: true }).catch(() => null);
        }
      } else if (ctx.message) {
        await ctx.message.reply({
          embeds: [voidEmbeds.error(userMessage)],
          allowedMentions: { parse: [], repliedUser: false }
        }).catch(() => null);
      }
    }
  } catch (replyErr) {
    logger.error('Failed to send error notification back to Discord user', replyErr);
  }
}

module.exports = { handleCommandError };
