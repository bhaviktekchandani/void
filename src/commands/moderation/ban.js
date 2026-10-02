/**
 * VOID Ban Command
 * Supports /ban and .?ban @user [reason]
 */

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { extractUserId } = require('../../utils/argumentParser');
const { checkMemberPermissions, checkBotPermissions, validateHierarchy } = require('../../utils/permissions');
const { voidEmbeds } = require('../../embeds/builder');

module.exports = {
  name: 'ban',
  description: 'Ban a member from the server.',
  category: 'moderation',
  permissions: [PermissionFlagsBits.BanMembers],
  botPermissions: [PermissionFlagsBits.BanMembers],
  prefixUsage: 'ban <@user|id> [reason]',
  slashUsage: '/ban user:<@user> [reason:<text>]',

  slashBuilder: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member from the server.')
    .addUserOption(opt =>
      opt.setName('user')
        .setDescription('The user or member to ban')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('reason')
        .setDescription('Reason for the ban')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  parsePrefixArgs(tokens, rawArgs) {
    if (tokens.length === 0) return {};
    const targetId = extractUserId(tokens[0]);
    // The rest of the raw string after the target token is the reason
    const targetToken = tokens[0];
    const targetIdx = rawArgs.indexOf(targetToken);
    let reason = null;
    if (targetIdx !== -1) {
      const rest = rawArgs.slice(targetIdx + targetToken.length).trim();
      reason = rest.length > 0 ? rest.replace(/^["']|["']$/g, '') : null;
    }
    return { targetId, reason };
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

    // 2. Resolve target
    const targetUser = await ctx.getUser('user');
    if (!targetUser) {
      return ctx.error(`Please specify a valid user to ban.\nUsage: \`${ctx.prefix}${this.prefixUsage}\``);
    }

    const reason = ctx.getString('reason') || 'No reason specified';

    // 3. Hierarchy checks if user is a member
    const targetMember = await ctx.guild.members.fetch(targetUser.id).catch(() => null);
    const hierarchy = validateHierarchy({
      moderatorMember: ctx.member,
      botMember,
      targetMember,
      targetUserId: targetUser.id
    });

    if (!hierarchy.canAct) {
      return ctx.error(hierarchy.reason);
    }

    // 4. Execute action via Discord API
    try {
      await ctx.guild.bans.create(targetUser.id, {
        reason: `${reason} | Moderator: ${ctx.user.tag || ctx.user.username}`
      });
    } catch (err) {
      return ctx.error(`Failed to ban user: ${err.message}`);
    }

    // 5. Record case and mod log
    const { caseNumber } = await ctx.services.moderationService.recordAction({
      guild: ctx.guild,
      target: targetUser,
      moderator: ctx.user,
      action: 'BAN',
      reason,
      channelName: ctx.channel.name
    });

    // 6. Response
    const embed = voidEmbeds.moderationAction({
      action: 'Banned',
      target: targetUser,
      moderator: ctx.user,
      reason,
      caseNumber
    });

    return ctx.reply({ embeds: [embed] });
  }
};
