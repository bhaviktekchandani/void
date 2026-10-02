/**
 * VOID Anti-Raid Safeguards Command
 * View, configure, and release join-spike safeguards.
 */

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { checkMemberPermissions } = require('../../utils/permissions');
const { voidEmbeds } = require('../../embeds/builder');

module.exports = {
  name: 'antiraid',
  description: 'Configure join-spike safeguards and manage raid states.',
  category: 'configuration',
  permissions: [PermissionFlagsBits.ManageGuild],
  botPermissions: [PermissionFlagsBits.SendMessages],
  prefixUsage: 'antiraid [toggle | threshold <joins> [interval] | action <alert|lockdown> | clear]',
  slashUsage: '/antiraid <view | toggle | threshold | action | clear>',

  slashBuilder: new SlashCommandBuilder()
    .setName('antiraid')
    .setDescription('Configure join-spike safeguards and manage raid states.')
    .addSubcommand(sub => sub.setName('view').setDescription('View current Anti-Raid status'))
    .addSubcommand(sub =>
      sub.setName('toggle')
        .setDescription('Toggle Anti-Raid protection')
        .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable protection').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('threshold')
        .setDescription('Set join spike rate threshold')
        .addIntegerOption(opt => opt.setName('joins').setDescription('Max joins allowed').setMinValue(3).setMaxValue(100).setRequired(true))
        .addIntegerOption(opt => opt.setName('interval').setDescription('Time interval in seconds').setMinValue(3).setMaxValue(60))
    )
    .addSubcommand(sub =>
      sub.setName('action')
        .setDescription('Set action on join spike')
        .addStringOption(opt =>
          opt.setName('type')
            .setDescription('Action type')
            .setRequired(true)
            .addChoices({ name: 'Alert Mod Log Only', value: 'ALERT' }, { name: 'Flag Lockdown', value: 'LOCKDOWN' })
        )
    )
    .addSubcommand(sub => sub.setName('clear').setDescription('Clear active raid lockdown state'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  parsePrefixArgs(tokens) {
    if (tokens.length === 0) return { subcommand: 'view' };

    const first = tokens[0].toLowerCase();
    if (first === 'toggle') {
      const val = tokens[1] ? (tokens[1].toLowerCase() === 'on' || tokens[1].toLowerCase() === 'true') : true;
      return { subcommand: 'toggle', enabled: val };
    }
    if (first === 'threshold') {
      const joins = tokens[1] ? parseInt(tokens[1], 10) : 10;
      const interval = tokens[2] ? parseInt(tokens[2], 10) : 10;
      return { subcommand: 'threshold', joins, interval };
    }
    if (first === 'action') {
      const action = (tokens[1] || 'ALERT').toUpperCase();
      return { subcommand: 'action', type: action };
    }
    if (first === 'clear') {
      return { subcommand: 'clear' };
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

    if (subcommand === 'toggle') {
      const enabled = ctx.isSlash ? ctx.interaction.options.getBoolean('enabled') : ctx.parsedArgs.enabled;
      const updated = await ctx.services.antiraidService.updateConfig(ctx.guild.id, { enabled });
      return ctx.reply({
        embeds: [voidEmbeds.success(`Anti-Raid protection is now **${updated.enabled ? 'ACTIVE' : 'DISABLED'}**.`)]
      });
    }

    if (subcommand === 'threshold') {
      const joins = ctx.isSlash ? ctx.interaction.options.getInteger('joins') : ctx.parsedArgs.joins;
      const interval = (ctx.isSlash ? ctx.interaction.options.getInteger('interval') : ctx.parsedArgs.interval) || 10;

      const updated = await ctx.services.antiraidService.updateConfig(ctx.guild.id, {
        join_threshold: joins,
        interval_sec: interval
      });

      return ctx.reply({
        embeds: [voidEmbeds.success(`Anti-Raid threshold set to **${updated.join_threshold} joins in ${updated.interval_sec}s**.`)]
      });
    }

    if (subcommand === 'action') {
      const act = (ctx.isSlash ? ctx.interaction.options.getString('type') : ctx.parsedArgs.type) || 'ALERT';
      const updated = await ctx.services.antiraidService.updateConfig(ctx.guild.id, { action: act });
      return ctx.reply({
        embeds: [voidEmbeds.success(`Anti-Raid trigger action set to **${updated.action}**.`)]
      });
    }

    if (subcommand === 'clear') {
      await ctx.services.antiraidService.clearLockdown(ctx.guild.id);
      return ctx.reply({
        embeds: [voidEmbeds.success('Active Anti-Raid lockdown status has been **cleared**.')]
      });
    }

    // Default: View
    const config = await ctx.services.antiraidService.getConfig(ctx.guild.id);
    return ctx.reply({
      embeds: [voidEmbeds.antiraidOverview({ config, guildName: ctx.guild.name })]
    });
  }
};
