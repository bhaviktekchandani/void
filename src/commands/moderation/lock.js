/**
 * VOID Lock Command
 * Locks the current channel while preserving original overwrite configuration for restoration.
 */

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { checkMemberPermissions, checkBotPermissions } = require('../../utils/permissions');
const { voidEmbeds } = require('../../embeds/builder');

module.exports = {
  name: 'lock',
  description: 'Lock the current channel to prevent members from sending messages.',
  category: 'moderation',
  permissions: [PermissionFlagsBits.ManageChannels],
  botPermissions: [PermissionFlagsBits.ManageChannels],
  prefixUsage: 'lock [reason]',
  slashUsage: '/lock [reason:<text>]',

  slashBuilder: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Lock the current channel to prevent members from sending messages.')
    .addStringOption(opt =>
      opt.setName('reason')
        .setDescription('Reason for locking the channel')
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

    // 2. Adjust channel permissions using lockService to preserve state
    try {
      await ctx.services.lockService.lockChannel({
        channel: ctx.channel,
        guild: ctx.guild,
        moderatorId: ctx.user.id,
        reason
      });
    } catch (err) {
      return ctx.error(`Failed to lock channel: ${err.message}`);
    }

    // 3. Record action
    await ctx.services.moderationService.recordAction({
      guild: ctx.guild,
      target: { id: ctx.channel.id, tag: `#${ctx.channel.name}` },
      moderator: ctx.user,
      action: 'LOCK',
      reason,
      channelName: ctx.channel.name
    });

    // 4. Response
    const embed = voidEmbeds.success(`Channel \`#${ctx.channel.name}\` has been **locked**.\nReason: ${reason}`);
    return ctx.reply({ embeds: [embed] });
  }
};
