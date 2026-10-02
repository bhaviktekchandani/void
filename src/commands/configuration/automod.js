/**
 * VOID AutoMod Configuration Command
 * View and configure automated moderation protections.
 */

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { checkMemberPermissions } = require('../../utils/permissions');
const { voidEmbeds } = require('../../embeds/builder');

module.exports = {
  name: 'automod',
  description: 'View or configure automated moderation rules.',
  category: 'configuration',
  permissions: [PermissionFlagsBits.ManageGuild],
  botPermissions: [PermissionFlagsBits.ManageMessages],
  prefixUsage: 'automod [toggle | spam <on|off> | invites <on|off> | mentions <num> | action <delete|warn|timeout> | word add|del <word>]',
  slashUsage: '/automod <view | toggle | spam | invites | mentions | action | word>',

  slashBuilder: new SlashCommandBuilder()
    .setName('automod')
    .setDescription('View or configure automated moderation rules.')
    .addSubcommand(sub => sub.setName('view').setDescription('View current AutoMod configuration'))
    .addSubcommand(sub =>
      sub.setName('toggle')
        .setDescription('Enable or disable AutoMod')
        .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable AutoMod').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('invites')
        .setDescription('Toggle Discord invite link blocking')
        .addBooleanOption(opt => opt.setName('blocked').setDescription('Block invites').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('spam')
        .setDescription('Configure spam flood detection')
        .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable spam rate limit').setRequired(true))
        .addIntegerOption(opt => opt.setName('max_messages').setDescription('Max messages in interval (default 5)').setMinValue(2).setMaxValue(20))
        .addIntegerOption(opt => opt.setName('interval').setDescription('Interval in seconds (default 5)').setMinValue(2).setMaxValue(30))
    )
    .addSubcommand(sub =>
      sub.setName('mentions')
        .setDescription('Set mention limit per message')
        .addIntegerOption(opt => opt.setName('limit').setDescription('Max mentions allowed (0 to disable)').setMinValue(0).setMaxValue(30).setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('action')
        .setDescription('Set violation enforcement action')
        .addStringOption(opt =>
          opt.setName('type')
            .setDescription('Action to take')
            .setRequired(true)
            .addChoices(
              { name: 'Delete Message', value: 'DELETE' },
              { name: 'Warn Member', value: 'WARN' },
              { name: 'Timeout Member (5m)', value: 'TIMEOUT' }
            )
        )
    )
    .addSubcommand(sub =>
      sub.setName('word')
        .setDescription('Add or remove a blocked word')
        .addStringOption(opt =>
          opt.setName('action')
            .setDescription('Add or remove')
            .setRequired(true)
            .addChoices({ name: 'Add', value: 'add' }, { name: 'Remove', value: 'del' })
        )
        .addStringOption(opt => opt.setName('phrase').setDescription('The phrase or word').setRequired(true))
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  parsePrefixArgs(tokens) {
    if (tokens.length === 0) return { subcommand: 'view' };

    const first = tokens[0].toLowerCase();
    if (first === 'toggle') {
      const val = tokens[1] ? (tokens[1].toLowerCase() === 'on' || tokens[1].toLowerCase() === 'true') : true;
      return { subcommand: 'toggle', enabled: val };
    }
    if (first === 'invites') {
      const val = tokens[1] ? (tokens[1].toLowerCase() === 'on' || tokens[1].toLowerCase() === 'true') : true;
      return { subcommand: 'invites', blocked: val };
    }
    if (first === 'spam') {
      const val = tokens[1] ? (tokens[1].toLowerCase() === 'on' || tokens[1].toLowerCase() === 'true') : true;
      const maxMsgs = tokens[2] ? parseInt(tokens[2], 10) : 5;
      return { subcommand: 'spam', enabled: val, max_messages: maxMsgs };
    }
    if (first === 'mentions') {
      const limit = tokens[1] ? parseInt(tokens[1], 10) : 5;
      return { subcommand: 'mentions', limit };
    }
    if (first === 'action') {
      const action = (tokens[1] || 'DELETE').toUpperCase();
      return { subcommand: 'action', type: action };
    }
    if (first === 'word' || first === 'words') {
      const act = (tokens[1] || 'add').toLowerCase();
      const phrase = tokens.slice(2).join(' ').toLowerCase();
      return { subcommand: 'word', action: act, phrase };
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

    // 2. Subcommand handling
    if (subcommand === 'toggle') {
      const enabled = ctx.isSlash ? ctx.interaction.options.getBoolean('enabled') : ctx.parsedArgs.enabled;
      const updated = await ctx.services.automodService.updateConfig(ctx.guild.id, { enabled });
      return ctx.reply({
        embeds: [voidEmbeds.success(`AutoMod has been **${updated.enabled ? 'ENABLED' : 'DISABLED'}**.`)]
      });
    }

    if (subcommand === 'invites') {
      const blocked = ctx.isSlash ? ctx.interaction.options.getBoolean('blocked') : ctx.parsedArgs.blocked;
      const updated = await ctx.services.automodService.updateConfig(ctx.guild.id, { invites_blocked: blocked });
      return ctx.reply({
        embeds: [voidEmbeds.success(`Discord invite blocking is now **${updated.invites_blocked ? 'ACTIVE' : 'DISABLED'}**.`)]
      });
    }

    if (subcommand === 'spam') {
      const enabled = ctx.isSlash ? ctx.interaction.options.getBoolean('enabled') : ctx.parsedArgs.enabled;
      const maxMsgs = (ctx.isSlash ? ctx.interaction.options.getInteger('max_messages') : ctx.parsedArgs.max_messages) || 5;
      const interval = (ctx.isSlash ? ctx.interaction.options.getInteger('interval') : null) || 5;

      const updated = await ctx.services.automodService.updateConfig(ctx.guild.id, {
        spam_enabled: enabled,
        spam_max_messages: maxMsgs,
        spam_interval_sec: interval
      });

      return ctx.reply({
        embeds: [voidEmbeds.success(
          `Spam protection **${updated.spam_enabled ? 'ENABLED' : 'DISABLED'}** (${updated.spam_max_messages} msgs in ${updated.spam_interval_sec}s).`
        )]
      });
    }

    if (subcommand === 'mentions') {
      const limit = ctx.isSlash ? ctx.interaction.options.getInteger('limit') : ctx.parsedArgs.limit;
      const updated = await ctx.services.automodService.updateConfig(ctx.guild.id, { mention_limit: limit });
      return ctx.reply({
        embeds: [voidEmbeds.success(`Mention limit set to **${updated.mention_limit}** per message.`)]
      });
    }

    if (subcommand === 'action') {
      const actionType = (ctx.isSlash ? ctx.interaction.options.getString('type') : ctx.parsedArgs.type) || 'DELETE';
      const valid = ['DELETE', 'WARN', 'TIMEOUT'];
      const chosen = valid.includes(actionType) ? actionType : 'DELETE';

      const updated = await ctx.services.automodService.updateConfig(ctx.guild.id, { action: chosen });
      return ctx.reply({
        embeds: [voidEmbeds.success(`AutoMod enforcement action set to **${updated.action}**.`)]
      });
    }

    if (subcommand === 'word') {
      const act = (ctx.isSlash ? ctx.interaction.options.getString('action') : ctx.parsedArgs.action) || 'add';
      const phrase = (ctx.isSlash ? ctx.interaction.options.getString('phrase') : ctx.parsedArgs.phrase) || '';

      if (!phrase || phrase.trim().length === 0) {
        return ctx.error('Please specify a phrase or word.');
      }

      const current = await ctx.services.automodService.getConfig(ctx.guild.id);
      let list = [...current.blocked_words];

      if (act === 'add') {
        if (!list.includes(phrase.toLowerCase())) {
          list.push(phrase.toLowerCase());
        }
      } else {
        list = list.filter(w => w !== phrase.toLowerCase());
      }

      await ctx.services.automodService.updateConfig(ctx.guild.id, { blocked_words: list });
      return ctx.reply({
        embeds: [voidEmbeds.success(`Blocked words updated (${list.length} total phrases configured).`)]
      });
    }

    // Default: View
    const config = await ctx.services.automodService.getConfig(ctx.guild.id);
    return ctx.reply({
      embeds: [voidEmbeds.automodOverview({ config, guildName: ctx.guild.name })]
    });
  }
};
