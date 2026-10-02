/**
 * VOID Untimeout Command
 * Supports /untimeout and .?untimeout @user [reason]
 */

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { extractUserId } = require('../../utils/argumentParser');
const { checkMemberPermissions, checkBotPermissions, validateHierarchy } = require('../../utils/permissions');
const { voidEmbeds } = require('../../embeds/builder');

module.exports = {
  name: 'untimeout',
  description: 'Remove a timeout from a member.',
  category: 'moderation',
  permissions: [PermissionFlagsBits.ModerateMembers],
  botPermissions: [PermissionFlagsBits.ModerateMembers],
  prefixUsage: 'untimeout <@user|id> [reason]',
  slashUsage: '/untimeout user:<@user> [reason:<text>]',

  slashBuilder: new SlashCommandBuilder()
    .setName('untimeout')
    .setDescription('Remove a timeout from a member.')
    .addUserOption(opt =>
      opt.setName('user')
        .setDescription('The member to remove timeout from')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('reason')
        .setDescription('Reason for removing timeout')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

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
      return ctx.error(`Please specify a valid member.\nUsage: \`${ctx.prefix}${this.prefixUsage}\``);
    }

    const targetMember = await ctx.guild.members.fetch(targetUser.id).catch(() => null);
    if (!targetMember) {
      return ctx.error(`That user is not currently in this server.`);
    }

    // 3. Check if timed out
    const isTimedOut = targetMember.communicationDisabledUntilTimestamp && targetMember.communicationDisabledUntilTimestamp > Date.now();
    if (!isTimedOut) {
      return ctx.error(`This member does not have an active timeout.`);
    }

    const reason = ctx.getString('reason') || 'No reason specified';

    // 4. Hierarchy checks
    const hierarchy = validateHierarchy({
      moderatorMember: ctx.member,
      botMember,
      targetMember,
      targetUserId: targetUser.id
    });

    if (!hierarchy.canAct) {
      return ctx.error(hierarchy.reason);
    }

    // 5. Remove timeout
    try {
      await targetMember.timeout(null, `${reason} | Moderator: ${ctx.user.tag || ctx.user.username}`);
    } catch (err) {
      return ctx.error(`Failed to remove timeout: ${err.message}`);
    }

    // 6. Record case
    const { caseNumber } = await ctx.services.moderationService.recordAction({
      guild: ctx.guild,
      target: targetUser,
      moderator: ctx.user,
      action: 'UNTIMEOUT',
      reason,
      channelName: ctx.channel.name
    });

    // 7. Response
    const embed = voidEmbeds.moderationAction({
      action: 'Timeout Removed',
      target: targetUser,
      moderator: ctx.user,
      reason,
      caseNumber
    });

    return ctx.reply({ embeds: [embed] });
  }
};
