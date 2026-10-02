/**
 * VOID Prefix Command
 * View or modify the server prefix.
 * Usage:
 *   .?prefix
 *   .?prefix set !
 *   /prefix view
 *   /prefix set new_prefix:!
 */

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { checkMemberPermissions } = require('../../utils/permissions');
const { voidEmbeds } = require('../../embeds/builder');

module.exports = {
  name: 'prefix',
  description: 'View or configure the server command prefix.',
  category: 'configuration',
  permissions: [], // Anyone can view; only admins can set
  botPermissions: [],
  prefixUsage: 'prefix [set <new_prefix>]',
  slashUsage: '/prefix view OR /prefix set new_prefix:<new>',

  slashBuilder: new SlashCommandBuilder()
    .setName('prefix')
    .setDescription('View or configure the server command prefix.')
    .addSubcommand(sub =>
      sub.setName('view')
        .setDescription('View the current server prefix')
    )
    .addSubcommand(sub =>
      sub.setName('set')
        .setDescription('Change the server prefix')
        .addStringOption(opt =>
          opt.setName('new_prefix')
            .setDescription('The new prefix to set')
            .setRequired(true)
        )
    ),

  parsePrefixArgs(tokens) {
    if (tokens.length === 0) {
      return { subcommand: 'view' };
    }

    if (tokens[0].toLowerCase() === 'set') {
      return {
        subcommand: 'set',
        new_prefix: tokens[1] || ''
      };
    }

    // Direct value given: .?prefix ! -> treat as set
    return {
      subcommand: 'set',
      new_prefix: tokens[0]
    };
  },

  async execute(ctx) {
    const subcommand = ctx.getSubcommand() || 'view';

    if (subcommand === 'set') {
      // Admin permission check required for setting prefix
      const adminCheck = checkMemberPermissions(ctx.member, [PermissionFlagsBits.Administrator]);
      if (!adminCheck.has) {
        return ctx.permissionError('You need `Administrator` permission to change the server prefix.');
      }

      const newPrefix = ctx.getString('new_prefix') || ctx.parsedArgs.new_prefix;
      if (!newPrefix) {
        return ctx.error(`Please provide a new prefix.\nUsage: \`${ctx.prefix}prefix set <new_prefix>\``);
      }

      const res = await ctx.services.prefixService.setPrefix(ctx.guild.id, newPrefix);
      if (!res.success) {
        return ctx.error(res.error || 'Failed to update prefix.');
      }

      const config = await ctx.services.configService.getConfig(ctx.guild.id);
      const embed = voidEmbeds.config({
        prefix: res.prefix,
        logChannelId: config.log_channel_id,
        guildName: ctx.guild.name,
        updatedField: 'Prefix',
        updatedValue: res.prefix
      });

      return ctx.reply({ embeds: [embed] });
    }

    // View current prefix
    const currentPrefix = await ctx.services.prefixService.getPrefix(ctx.guild.id);
    const config = await ctx.services.configService.getConfig(ctx.guild.id);

    const embed = voidEmbeds.config({
      prefix: currentPrefix,
      logChannelId: config.log_channel_id,
      guildName: ctx.guild.name
    });

    return ctx.reply({ embeds: [embed] });
  }
};
