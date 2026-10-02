/**
 * VOID Purge Command
 * Supports /purge <amount> and .?purge <amount>
 */

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { validatePurgeCount } = require('../../utils/validators');
const { checkMemberPermissions, checkBotPermissions } = require('../../utils/permissions');
const { voidEmbeds } = require('../../embeds/builder');

module.exports = {
  name: 'purge',
  description: 'Bulk delete messages from the current channel (1-100).',
  category: 'moderation',
  permissions: [PermissionFlagsBits.ManageMessages],
  botPermissions: [PermissionFlagsBits.ManageMessages],
  prefixUsage: 'purge <amount>',
  slashUsage: '/purge amount:<1-100>',

  slashBuilder: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Bulk delete messages from the current channel (1-100).')
    .addIntegerOption(opt =>
      opt.setName('amount')
        .setDescription('Number of messages to delete (1-100)')
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  parsePrefixArgs(tokens) {
    if (tokens.length === 0) return {};
    return { amount: tokens[0] };
  },

  async execute(ctx) {
    // 1. Permission checks
    const memberCheck = checkMemberPermissions(ctx.member, this.permissions);
    if (!memberCheck.has) {
      return ctx.permissionError(`You lack permission: \`${memberCheck.missing.join(', ')}\``);
    }

    const botMember = ctx.guild.members.me || await ctx.guild.members.fetchMe().catch(() => null);
    const botCheck = checkBotPermissions(botMember, this.botPermissions, ctx.channel);
    if (!botCheck.has) {
      return ctx.error(`VOID lacks permission: \`${botCheck.missing.join(', ')}\``);
    }

    // 2. Validate amount
    const rawAmount = ctx.getInteger('amount') || ctx.parsedArgs.amount;
    const validation = validatePurgeCount(rawAmount);
    if (!validation.valid) {
      return ctx.error(validation.error);
    }

    const count = validation.count;

    // 3. Delete invoking message if prefix command
    if (!ctx.isSlash && ctx.message) {
      await ctx.message.delete().catch(() => null);
    }

    // 4. Perform bulk delete
    let deletedCount = 0;
    try {
      // filterOld: true avoids throwing an error on messages older than 14 days
      const deleted = await ctx.channel.bulkDelete(count, true);
      deletedCount = deleted.size;
    } catch (err) {
      return ctx.error(`Failed to purge messages: ${err.message}`);
    }

    // 5. Record action
    await ctx.services.moderationService.recordAction({
      guild: ctx.guild,
      target: { id: ctx.channel.id, tag: `#${ctx.channel.name}` },
      moderator: ctx.user,
      action: 'PURGE',
      reason: `Purged ${deletedCount} message(s) in #${ctx.channel.name}`,
      channelName: ctx.channel.name
    });

    // 6. Response
    const embed = voidEmbeds.purgeReport({
      deletedCount,
      channel: ctx.channel,
      moderator: ctx.user,
      requestedCount: count
    });

    const sent = await ctx.reply({ embeds: [embed] });

    // Auto-delete confirmation after 5 seconds if possible
    setTimeout(async () => {
      try {
        if (ctx.isSlash && ctx.interaction) {
          await ctx.interaction.deleteReply().catch(() => null);
        } else if (sent && typeof sent.delete === 'function') {
          await sent.delete().catch(() => null);
        }
      } catch {
        // Safe ignore
      }
    }, 5000);
  }
};
