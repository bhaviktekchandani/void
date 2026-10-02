/**
 * VOID Warn Command
 * Supports /warn and .?warn @user <reason>
 */

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { extractUserId } = require('../../utils/argumentParser');
const { checkMemberPermissions, validateHierarchy } = require('../../utils/permissions');
const { voidEmbeds } = require('../../embeds/builder');

module.exports = {
  name: 'warn',
  description: 'Issue a formal warning to a member.',
  category: 'moderation',
  permissions: [PermissionFlagsBits.ModerateMembers],
  botPermissions: [PermissionFlagsBits.SendMessages],
  prefixUsage: 'warn <@user|id> <reason>',
  slashUsage: '/warn user:<@user> reason:<text>',

  slashBuilder: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Issue a formal warning to a member.')
    .addUserOption(opt =>
      opt.setName('user')
        .setDescription('The member to warn')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('reason')
        .setDescription('Reason for the warning')
        .setRequired(true)
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

    // 2. Resolve target member
    const targetUser = await ctx.getUser('user');
    if (!targetUser) {
      return ctx.error(`Please specify a valid member to warn.\nUsage: \`${ctx.prefix}${this.prefixUsage}\``);
    }

    const reason = ctx.getString('reason');
    if (!reason || reason.trim().length === 0) {
      return ctx.error(`Please provide a reason for the warning.\nUsage: \`${ctx.prefix}${this.prefixUsage}\``);
    }

    const targetMember = await ctx.guild.members.fetch(targetUser.id).catch(() => null);

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

    // 4. Create case and record warning
    let caseNumber = null;
    let caseId = null;

    try {
      const caseRecord = await ctx.services.caseService.createCase({
        guildId: ctx.guild.id,
        targetId: targetUser.id,
        targetTag: targetUser.tag || targetUser.username || targetUser.id,
        moderatorId: ctx.user.id,
        moderatorTag: ctx.user.tag || ctx.user.username || ctx.user.id,
        action: 'WARN',
        reason
      });

      if (caseRecord) {
        caseNumber = caseRecord.case_number;
        caseId = caseRecord.id;
      }

      await ctx.services.warningService.addWarning({
        guildId: ctx.guild.id,
        targetId: targetUser.id,
        moderatorId: ctx.user.id,
        reason,
        caseId
      });
    } catch (err) {
      return ctx.error(`Failed to record warning: ${err.message}`);
    }

    // 5. Attempt DM notification safely
    try {
      await targetUser.send({
        content: `You received a warning in **${ctx.guild.name}**: ${reason}`
      }).catch(() => null);
    } catch {
      // DMs closed, ignore safely
    }

    // 6. Log to mod log channel
    await ctx.services.moderationService.sendLogMessage({
      guild: ctx.guild,
      target: targetUser,
      moderator: ctx.user,
      action: 'WARN',
      reason,
      caseNumber,
      channelName: ctx.channel.name
    });

    // 7. Response
    const embed = voidEmbeds.moderationAction({
      action: 'Warned',
      target: targetUser,
      moderator: ctx.user,
      reason,
      caseNumber
    });

    return ctx.reply({ embeds: [embed] });
  }
};
