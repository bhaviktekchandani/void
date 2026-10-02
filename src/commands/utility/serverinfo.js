/**
 * VOID Server Information Command
 * Supports /serverinfo and .?serverinfo
 * Displays complete server overview, member counts, channels, security, and nitro boost status.
 */

const { SlashCommandBuilder } = require('discord.js');
const { voidEmbeds } = require('../../embeds/builder');

module.exports = {
  name: 'serverinfo',
  description: 'View comprehensive server overview, statistics, and security settings.',
  category: 'utility',
  aliases: ['server', 'guildinfo', 'guild'],
  permissions: [],
  botPermissions: [],
  prefixUsage: 'serverinfo',
  slashUsage: '/serverinfo',

  slashBuilder: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('View comprehensive server overview, statistics, and security settings.'),

  parsePrefixArgs() {
    return {};
  },

  async execute(ctx) {
    if (!ctx.guild) {
      return ctx.error('This command can only be executed within a Discord server.');
    }

    // Ensure guild members and channels cache is populated if possible
    await ctx.guild.members.fetch().catch(() => null);

    const owner = await ctx.guild.fetchOwner().catch(() => null);

    const embed = voidEmbeds.serverInfo({
      guild: ctx.guild,
      owner
    });

    return ctx.reply({ embeds: [embed] });
  }
};
