/**
 * VOID Clear Warnings Command
 * Removes all recorded warnings for a member in the current guild.
 */

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { extractUserId } = require('../../utils/argumentParser');
const { checkMemberPermissions } = require('../../utils/permissions');
const { voidEmbeds } = require('../../embeds/builder');

module.exports = {
  name: 'clearwarnings',
  description: 'Clear all recorded warnings for a member.',
  category: 'moderation',
  permissions: [PermissionFlagsBits.ModerateMembers],
  botPermissions: [PermissionFlagsBits.SendMessages],
  prefixUsage: 'clearwarnings <@user|id>',
  slashUsage: '/clearwarnings user:<@user>',

  slashBuilder: new SlashCommandBuilder()
    .setName('clearwarnings')
    .setDescription('Clear all recorded warnings for a member.')
    .addUserOption(opt =>
      opt.setName('user')
        .setDescription('The member whose warnings will be cleared')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  parsePrefixArgs(tokens) {
    if (tokens.length === 0) return {};
    const targetId = extractUserId(tokens[0]);
    return { targetId };
  },

  async execute(ctx) {
    // 1. Permission checks
    const memberCheck = checkMemberPermissions(ctx.member, this.permissions);
    if (!memberCheck.has) {
      return ctx.permissionError(`You lack permission: \`${memberCheck.missing.join(', ')}\``);
    }

    // 2. Resolve target member
    const targetUser = await ctx.getUser('user');
    if (!targetUser) {
      return ctx.error(`Please specify a valid user.\nUsage: \`${ctx.prefix}${this.prefixUsage}\``);
    }

    // 3. Clear warnings
    const clearedCount = await ctx.services.warningService.clearWarnings(ctx.guild.id, targetUser.id);

    // 4. Record action in audit log
    await ctx.services.moderationService.recordAction({
      guild: ctx.guild,
      target: targetUser,
      moderator: ctx.user,
      action: 'CLEAR_WARNINGS',
      reason: `Cleared ${clearedCount} warning(s)`,
      channelName: ctx.channel.name
    });

    const userTag = targetUser.tag || targetUser.username || targetUser.id;
    return ctx.reply({
      embeds: [voidEmbeds.success(`Cleared **${clearedCount}** warning(s) for **${userTag}**.`)]
    });
  }
};
