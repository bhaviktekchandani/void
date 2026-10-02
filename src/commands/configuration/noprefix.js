/**
 * VOID No-Prefix Status & Diagnostics Command
 * Supports /noprefix [status|test] and .?noprefix [status|test]
 * Allows moderators to safely test and inspect their no-prefix authorization.
 */

const { SlashCommandBuilder } = require('discord.js');
const { voidEmbeds } = require('../../embeds/builder');

module.exports = {
  name: 'noprefix',
  description: 'View no-prefix system status, invoker authorization, and diagnostics.',
  category: 'configuration',
  aliases: ['np'],
  permissions: [],
  botPermissions: [],
  prefixUsage: 'noprefix [status|test]',
  slashUsage: '/noprefix [status|test]',

  slashBuilder: new SlashCommandBuilder()
    .setName('noprefix')
    .setDescription('View no-prefix system status, invoker authorization, and diagnostics.')
    .addSubcommand(sub =>
      sub.setName('status')
        .setDescription('View no-prefix system status and invoker authorization.')
    )
    .addSubcommand(sub =>
      sub.setName('test')
        .setDescription('Run a safe diagnostic to test whether you have no-prefix access.')
    ),

  parsePrefixArgs(tokens) {
    if (tokens.length > 0 && tokens[0].toLowerCase() === 'test') {
      return { subcommand: 'test' };
    }
    return { subcommand: 'status' };
  },

  async execute(ctx) {
    const subcommand = ctx.getSubcommand() || ctx.parsedArgs.subcommand || 'status';
    const isTest = subcommand.toLowerCase() === 'test';

    const noPrefixService = ctx.services.noPrefixService;
    const isEnabled = noPrefixService.isEnabled();
    const isUserAuthorized = noPrefixService.isUserAllowed(ctx.user.id);
    const allowedCount = noPrefixService.getAllowedUserIds().length;

    const embed = voidEmbeds.noPrefixStatus({
      isEnabled,
      isUserAuthorized,
      allowedCount,
      userId: ctx.user.id,
      prefix: ctx.prefix,
      isTest
    });

    return ctx.reply({ embeds: [embed] });
  }
};
