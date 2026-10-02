/**
 * VOID Unlock Command
 * Unlocks the current channel and accurately restores its pre-lock overwrite state.
 */

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { checkMemberPermissions, checkBotPermissions } = require('../../utils/permissions');
const { voidEmbeds } = require('../../embeds/builder');

module.exports = {
  name: 'unlock',
  description: 'Unlock the current channel and restore its pre-lock state.',
  category: 'moderation',
  permissions: [PermissionFlagsBits.ManageChannels],
  botPermissions: [PermissionFlagsBits.ManageChannels],
  prefixUsage: 'unlock [reason]',
  slashUsage: '/unlock [reason:<text>]',

  slashBuilder: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Unlock the current channel and restore its pre-lock state.')
    .addStringOption(opt =>
      opt.setName('reason')
        .setDescription('Reason for unlocking the channel')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  parsePrefixArgs(tokens, rawArgs) {
    const reason = rawArgs.trim() ? rawArgs.trim().replace(/^["']|["']$/g, '') : null;
    return { reason };
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

    const reason = ctx.getString('reason') || 'No reason specified';

    // 2. Adjust channel permissions using lockService
    try {
      await ctx.services.lockService.unlockChannel({
        channel: ctx.channel,
        guild: ctx.guild,
        moderatorId: ctx.user.id,
        reason
      });
    } catch (err) {
      return ctx.error(`Failed to unlock channel: ${err.message}`);
    }

    // 3. Record action
    await ctx.services.moderationService.recordAction({
      guild: ctx.guild,
      target: { id: ctx.channel.id, tag: `#${ctx.channel.name}` },
      moderator: ctx.user,
      action: 'UNLOCK',
      reason,
      channelName: ctx.channel.name
    });

    // 4. Response
    const embed = voidEmbeds.unlockReport({
      channel: ctx.channel,
      moderator: ctx.user,
      reason
    });
    return ctx.reply({ embeds: [embed] });
  }
};
