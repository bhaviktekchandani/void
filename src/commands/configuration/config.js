/**
 * VOID Config Command
 * Manage server settings (prefix, log channel).
 */

const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { extractChannelId } = require('../../utils/argumentParser');
const { checkMemberPermissions } = require('../../utils/permissions');
const { voidEmbeds } = require('../../embeds/builder');

module.exports = {
  name: 'config',
  description: 'View or modify VOID server configuration.',
  category: 'configuration',
  permissions: [PermissionFlagsBits.ManageGuild],
  botPermissions: [],
  prefixUsage: 'config [prefix <new> | logchannel <#channel>]',
  slashUsage: '/config <view | prefix | logchannel>',

  slashBuilder: new SlashCommandBuilder()
    .setName('config')
    .setDescription('View or modify VOID server configuration.')
    .addSubcommand(sub =>
      sub.setName('view')
        .setDescription('View current server configuration')
    )
    .addSubcommand(sub =>
      sub.setName('prefix')
        .setDescription('Set the server prefix')
        .addStringOption(opt =>
          opt.setName('new_prefix')
            .setDescription('New prefix')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('logchannel')
        .setDescription('Set the moderation log channel')
        .addChannelOption(opt =>
          opt.setName('channel')
            .setDescription('Text channel for mod logs')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  parsePrefixArgs(tokens) {
    if (tokens.length === 0) return { subcommand: 'view' };

    const first = tokens[0].toLowerCase();
    if (first === 'prefix') {
      return {
        subcommand: 'prefix',
        new_prefix: tokens[1] || ''
      };
    }
    if (first === 'logchannel' || first === 'logs') {
      const channelId = tokens[1] ? extractChannelId(tokens[1]) : null;
      return {
        subcommand: 'logchannel',
        channel: channelId
      };
    }

    return { subcommand: 'view' };
  },

  async execute(ctx) {
    // 1. Permission checks
    const memberCheck = checkMemberPermissions(ctx.member, this.permissions);
    if (!memberCheck.has) {
      return ctx.permissionError(`You lack permission: \`${memberCheck.missing.join(', ')}\``);
    }

    const subcommand = ctx.getSubcommand() || 'view';

    if (subcommand === 'prefix') {
      const newPrefix = ctx.getString('new_prefix') || ctx.parsedArgs.new_prefix;
      if (!newPrefix) {
        return ctx.error(`Please provide a new prefix.\nUsage: \`${ctx.prefix}config prefix <new>\``);
      }

      const res = await ctx.services.prefixService.setPrefix(ctx.guild.id, newPrefix);
      if (!res.success) {
        return ctx.error(res.error || 'Failed to update prefix.');
      }

      const cfg = await ctx.services.configService.getConfig(ctx.guild.id);
      return ctx.reply({
        embeds: [voidEmbeds.config({
          prefix: res.prefix,
          logChannelId: cfg.log_channel_id,
          guildName: ctx.guild.name,
          updatedField: 'Prefix',
          updatedValue: res.prefix
        })]
      });
    }

    if (subcommand === 'logchannel') {
      const channel = await ctx.getChannel('channel');
      if (!channel) {
        return ctx.error(`Please specify a valid text channel.\nUsage: \`${ctx.prefix}config logchannel #channel\``);
      }

      await ctx.services.configService.setLogChannel(ctx.guild.id, channel.id);
      const cfg = await ctx.services.configService.getConfig(ctx.guild.id);

      return ctx.reply({
        embeds: [voidEmbeds.config({
          prefix: cfg.prefix,
          logChannelId: channel.id,
          guildName: ctx.guild.name,
          updatedField: 'Mod Log Channel',
          updatedValue: `<#${channel.id}>`
        })]
      });
    }

    // View configuration
    const cfg = await ctx.services.configService.getConfig(ctx.guild.id);
    return ctx.reply({
      embeds: [voidEmbeds.config({
        prefix: cfg.prefix,
        logChannelId: cfg.log_channel_id,
        guildName: ctx.guild.name
      })]
    });
  }
};
