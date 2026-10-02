/**
 * VOID Timeout Command
 * Supports /timeout and .?timeout @user 10m [reason]
 */

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { extractUserId } = require('../../utils/argumentParser');
const { parseDuration, formatDuration, validateTimeoutDuration } = require('../../utils/validators');
const { checkMemberPermissions, checkBotPermissions, validateHierarchy } = require('../../utils/permissions');
const { voidEmbeds } = require('../../embeds/builder');

module.exports = {
  name: 'timeout',
  description: 'Timeout a member for a specified duration.',
  category: 'moderation',
  permissions: [PermissionFlagsBits.ModerateMembers],
  botPermissions: [PermissionFlagsBits.ModerateMembers],
  prefixUsage: 'timeout <@user|id> <duration> [reason]',
  slashUsage: '/timeout user:<@user> duration:<10m|1h|1d> [reason:<text>]',

  slashBuilder: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Timeout a member for a specified duration.')
    .addUserOption(opt =>
      opt.setName('user')
        .setDescription('The member to timeout')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('duration')
        .setDescription('Duration (e.g. 10m, 1h, 1d)')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('reason')
        .setDescription('Reason for the timeout')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  parsePrefixArgs(tokens, rawArgs) {
    if (tokens.length < 2) {
      const targetId = tokens.length > 0 ? extractUserId(tokens[0]) : null;
      return { targetId };
    }

    const targetId = extractUserId(tokens[0]);
    const duration = tokens[1];

    // Reason is everything after the second token
    let reason = null;
    if (tokens.length > 2) {
      const firstTwo = `${tokens[0]} ${tokens[1]}`;
      const idx = rawArgs.indexOf(tokens[1]);
      if (idx !== -1) {
        const rest = rawArgs.slice(idx + tokens[1].length).trim();
        reason = rest.length > 0 ? rest.replace(/^["']|["']$/g, '') : null;
      }
    }

    return { targetId, duration, reason };
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
      return ctx.error(`Please specify a valid member to timeout.\nUsage: \`${ctx.prefix}${this.prefixUsage}\``);
    }

    const targetMember = await ctx.guild.members.fetch(targetUser.id).catch(() => null);
    if (!targetMember) {
      return ctx.error(`That user is not currently in this server.`);
    }

    // 3. Duration validation
    const rawDuration = ctx.getString('duration');
    const durationMs = parseDuration(rawDuration);
    const validation = validateTimeoutDuration(durationMs);
    if (!validation.valid) {
      return ctx.error(validation.error);
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

    if (!targetMember.moderatable) {
      return ctx.error('VOID is unable to timeout this member due to role hierarchy.');
    }

    // 5. Apply timeout
    try {
      await targetMember.timeout(durationMs, `${reason} | Moderator: ${ctx.user.tag || ctx.user.username}`);
    } catch (err) {
      return ctx.error(`Failed to timeout member: ${err.message}`);
    }

    const formattedDuration = formatDuration(durationMs);

    // 6. Record case
    const { caseNumber } = await ctx.services.moderationService.recordAction({
      guild: ctx.guild,
      target: targetUser,
      moderator: ctx.user,
      action: 'TIMEOUT',
      reason,
      duration: formattedDuration,
      channelName: ctx.channel.name
    });

    // 7. Response
    const embed = voidEmbeds.moderationAction({
      action: 'Timed Out',
      target: targetUser,
      moderator: ctx.user,
      duration: formattedDuration,
      reason,
      caseNumber
    });

    return ctx.reply({ embeds: [embed] });
  }
};
