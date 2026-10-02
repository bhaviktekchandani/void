/**
 * VOID Setup Command
 * Quick interactive server configuration for moderation features.
 */

const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { extractChannelId } = require('../../utils/argumentParser');
const { checkMemberPermissions } = require('../../utils/permissions');
const { voidEmbeds } = require('../../embeds/builder');

module.exports = {
  name: 'setup',
  description: 'Configure moderation features and channels for VOID.',
  category: 'configuration',
  permissions: [PermissionFlagsBits.Administrator],
  botPermissions: [],
  prefixUsage: 'setup [logchannel <#channel>]',
  slashUsage: '/setup [logchannel channel:<#channel>]',

  slashBuilder: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Configure moderation features and channels for VOID.')
    .addSubcommand(sub =>
      sub.setName('overview')
        .setDescription('View current setup status and guidelines')
    )
    .addSubcommand(sub =>
      sub.setName('logchannel')
        .setDescription('Set moderation log channel')
        .addChannelOption(opt =>
          opt.setName('channel')
            .setDescription('Channel where moderation actions will be logged')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  parsePrefixArgs(tokens) {
    if (tokens.length === 0) return { subcommand: 'overview' };

    const first = tokens[0].toLowerCase();
    if (first === 'logchannel' || first === 'logs') {
      const channelId = tokens[1] ? extractChannelId(tokens[1]) : null;
      return {
        subcommand: 'logchannel',
        channel: channelId
      };
    }

    return { subcommand: 'overview' };
  },

  async execute(ctx) {
    // 1. Permission checks
    const memberCheck = checkMemberPermissions(ctx.member, this.permissions);
    if (!memberCheck.has) {
      return ctx.permissionError(`You lack permission: \`${memberCheck.missing.join(', ')}\``);
    }

    const subcommand = ctx.getSubcommand() || 'overview';

    if (subcommand === 'logchannel') {
      const channel = await ctx.getChannel('channel');
      if (!channel) {
        return ctx.error(`Please provide a valid text channel.\nUsage: \`${ctx.prefix}setup logchannel #channel\``);
      }

      await ctx.services.configService.setLogChannel(ctx.guild.id, channel.id);

      const embed = voidEmbeds.setup({
        prefix: ctx.prefix,
        logChannelId: channel.id,
        message: `Moderation logs will now be posted in <#${channel.id}>.`
      });

      return ctx.reply({ embeds: [embed] });
    }

    // Default: Setup overview
    const cfg = await ctx.services.configService.getConfig(ctx.guild.id);
    const embed = voidEmbeds.setup({
      prefix: cfg.prefix,
      logChannelId: cfg.log_channel_id,
      message: 'VOID moderation is active. Use the commands below to adjust settings.'
    });

    return ctx.reply({ embeds: [embed] });
  }
};
