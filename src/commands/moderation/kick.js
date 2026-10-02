/**
 * VOID Kick Command
 * Supports /kick and .?kick @user [reason]
 */

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { extractUserId } = require('../../utils/argumentParser');
const { checkMemberPermissions, checkBotPermissions, validateHierarchy } = require('../../utils/permissions');
const { voidEmbeds } = require('../../embeds/builder');

module.exports = {
  name: 'kick',
  description: 'Kick a member from the server.',
  category: 'moderation',
  permissions: [PermissionFlagsBits.KickMembers],
  botPermissions: [PermissionFlagsBits.KickMembers],
  prefixUsage: 'kick <@user|id> [reason]',
  slashUsage: '/kick user:<@user> [reason:<text>]',

  slashBuilder: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member from the server.')
    .addUserOption(opt =>
      opt.setName('user')
        .setDescription('The member to kick')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('reason')
        .setDescription('Reason for the kick')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

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

    // 2. Resolve target member
    const targetUser = await ctx.getUser('user');
    if (!targetUser) {
      return ctx.error(`Please specify a valid member to kick.\nUsage: \`${ctx.prefix}${this.prefixUsage}\``);
    }

    const targetMember = await ctx.guild.members.fetch(targetUser.id).catch(() => null);
    if (!targetMember) {
      return ctx.error(`That user is not currently in this server.`);
    }

    const reason = ctx.getString('reason') || 'No reason specified';

    // 3. Hierarchy checks
    const hierarchy = validateHierarchy({
      moderatorMember: ctx.member,
      botMember,
      targetMember,
      targetUserId: targetUser.id
    });

    if (!hierarchy.canAct) {
      return ctx.error(hierarchy.reason);
    }

    if (!targetMember.kickable) {
      return ctx.error('VOID is unable to kick this member due to role hierarchy.');
    }

    // 4. Attempt DM notification before kick
    const dmStatus = await ctx.services.moderationService.notifyTargetDM({
      target: targetUser,
      action: 'KICK',
      guild: ctx.guild,
      reason
    });

    // 5. Execute kick
    try {
      await targetMember.kick(`${reason} | Moderator: ${ctx.user.tag || ctx.user.username}`);
    } catch (err) {
      return ctx.error(`Failed to kick member: ${err.message}`);
    }

    // 6. Record case
    const { caseNumber } = await ctx.services.moderationService.recordAction({
      guild: ctx.guild,
      target: targetUser,
      moderator: ctx.user,
      action: 'KICK',
      reason,
      channelName: ctx.channel.name,
      dmStatus
    });

    // 7. Query history
    const history = await ctx.services.moderationService.getTargetStats(ctx.guild.id, targetUser.id);

    // 8. Response
    const embed = voidEmbeds.moderationAction({
      action: 'Kicked',
      target: targetUser,
      targetMember,
      moderator: ctx.user,
      reason,
      caseNumber,
      guild: ctx.guild,
      dmStatus,
      history,
      channelName: ctx.channel.name
    });

    return ctx.reply({ embeds: [embed] });
  }
};
