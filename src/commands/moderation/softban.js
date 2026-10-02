/**
 * VOID Softban Command
 * Bans and immediately unbans a member to purge recent message history.
 */

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { extractUserId } = require('../../utils/argumentParser');
const { checkMemberPermissions, checkBotPermissions, validateHierarchy } = require('../../utils/permissions');
const { voidEmbeds } = require('../../embeds/builder');

module.exports = {
  name: 'softban',
  description: 'Ban and instantly unban a member to purge their recent messages.',
  category: 'moderation',
  permissions: [PermissionFlagsBits.BanMembers],
  botPermissions: [PermissionFlagsBits.BanMembers],
  prefixUsage: 'softban <@user|id> [reason]',
  slashUsage: '/softban user:<@user> [reason:<text>]',

  slashBuilder: new SlashCommandBuilder()
    .setName('softban')
    .setDescription('Ban and instantly unban a member to purge their recent messages.')
    .addUserOption(opt =>
      opt.setName('user')
        .setDescription('The member to softban')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('reason')
        .setDescription('Reason for the softban')
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
      return ctx.error(`Please specify a valid member to softban.\nUsage: \`${ctx.prefix}${this.prefixUsage}\``);
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

    // 4. Execute softban: Ban with 7-day message delete, then unban immediately
    try {
      await ctx.guild.bans.create(targetUser.id, {
        deleteMessageSeconds: 7 * 86400,
        reason: `[Softban] ${reason} | Moderator: ${ctx.user.tag || ctx.user.username}`
      });

      await ctx.guild.bans.remove(targetUser.id, `[Softban Unban] Message purge completed.`);
    } catch (err) {
      return ctx.error(`Failed to softban member: ${err.message}`);
    }

    // 5. Record case
    const { caseNumber } = await ctx.services.moderationService.recordAction({
      guild: ctx.guild,
      target: targetUser,
      moderator: ctx.user,
      action: 'SOFTBAN',
      reason,
      channelName: ctx.channel.name
    });

    // 6. Response
    const embed = voidEmbeds.moderationAction({
      action: 'Softbanned',
      target: targetUser,
      moderator: ctx.user,
      reason,
      caseNumber
    });

    return ctx.reply({ embeds: [embed] });
  }
};
