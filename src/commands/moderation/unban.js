/**
 * VOID Unban Command
 * Supports /unban and .?unban <user_id> [reason]
 */

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { extractUserId } = require('../../utils/argumentParser');
const { isValidSnowflake } = require('../../utils/validators');
const { checkMemberPermissions, checkBotPermissions } = require('../../utils/permissions');
const { voidEmbeds } = require('../../embeds/builder');

module.exports = {
  name: 'unban',
  description: 'Unban a user by their user ID.',
  category: 'moderation',
  permissions: [PermissionFlagsBits.BanMembers],
  botPermissions: [PermissionFlagsBits.BanMembers],
  prefixUsage: 'unban <user_id> [reason]',
  slashUsage: '/unban user_id:<id> [reason:<text>]',

  slashBuilder: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Unban a user by their user ID.')
    .addStringOption(opt =>
      opt.setName('user_id')
        .setDescription('The user ID to unban')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('reason')
        .setDescription('Reason for unbanning')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  parsePrefixArgs(tokens, rawArgs) {
    if (tokens.length === 0) return {};
    const targetId = extractUserId(tokens[0]);
    const targetToken = tokens[0];
    const targetIdx = rawArgs.indexOf(targetToken);
    let reason = null;
    if (targetIdx !== -1) {
      const rest = rawArgs.slice(targetIdx + targetToken.length).trim();
      reason = rest.length > 0 ? rest.replace(/^["']|["']$/g, '') : null;
    }
    return { user_id: targetId, reason };
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

    // 2. Validate user ID
    const rawId = ctx.getString('user_id') || ctx.parsedArgs.user_id;
    if (!rawId || !isValidSnowflake(rawId)) {
      return ctx.error(`Please provide a valid numeric Discord user ID.\nUsage: \`${ctx.prefix}${this.prefixUsage}\``);
    }

    const reason = ctx.getString('reason') || 'No reason specified';

    // 3. Verify user is actually banned
    let banInfo = null;
    try {
      banInfo = await ctx.guild.bans.fetch(rawId);
    } catch {
      return ctx.error(`No active ban found for user ID \`${rawId}\`.`);
    }

    const targetUser = banInfo.user;

    // 4. Remove ban
    try {
      await ctx.guild.bans.remove(rawId, `${reason} | Moderator: ${ctx.user.tag || ctx.user.username}`);
    } catch (err) {
      return ctx.error(`Failed to unban user: ${err.message}`);
    }

    // 5. Record case
    const { caseNumber } = await ctx.services.moderationService.recordAction({
      guild: ctx.guild,
      target: targetUser,
      moderator: ctx.user,
      action: 'UNBAN',
      reason,
      channelName: ctx.channel.name
    });

    // 6. Response
    const embed = voidEmbeds.moderationAction({
      action: 'Unbanned',
      target: targetUser,
      moderator: ctx.user,
      reason,
      caseNumber
    });

    return ctx.reply({ embeds: [embed] });
  }
};
