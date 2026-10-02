/**
 * VOID Unlock Command
 * Unlocks the current channel by resetting SendMessages for @everyone.
 */

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { checkMemberPermissions, checkBotPermissions } = require('../../utils/permissions');
const { voidEmbeds } = require('../../embeds/builder');

module.exports = {
  name: 'unlock',
  description: 'Unlock the current channel so members can chat again.',
  category: 'moderation',
  permissions: [PermissionFlagsBits.ManageChannels],
  botPermissions: [PermissionFlagsBits.ManageChannels],
  prefixUsage: 'unlock [reason]',
  slashUsage: '/unlock [reason:<text>]',

  slashBuilder: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Unlock the current channel so members can chat again.')
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

    // 2. Adjust channel permissions
    try {
      await ctx.channel.permissionOverwrites.edit(ctx.guild.roles.everyone, {
        SendMessages: null
      }, { reason: `${reason} | Moderator: ${ctx.user.tag || ctx.user.username}` });
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
    const embed = voidEmbeds.success(`Channel \`#${ctx.channel.name}\` has been **unlocked**.`);
    return ctx.reply({ embeds: [embed] });
  }
};
