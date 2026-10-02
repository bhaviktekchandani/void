/**
 * VOID Bot Information Command
 * Displays safe system stats and uptime.
 */

const { SlashCommandBuilder, version: djsVersion } = require('discord.js');
const { formatDuration } = require('../../utils/validators');
const { voidEmbeds } = require('../../embeds/builder');

module.exports = {
  name: 'botinfo',
  aliases: ['about', 'info'],
  description: 'View VOID bot uptime, statistics, and system specifications.',
  category: 'utility',
  permissions: [],
  botPermissions: [],
  prefixUsage: 'botinfo',
  slashUsage: '/botinfo',

  slashBuilder: new SlashCommandBuilder()
    .setName('botinfo')
    .setDescription('View VOID bot uptime, statistics, and system specifications.'),

  parsePrefixArgs() {
    return {};
  },

  async execute(ctx) {
    const uptimeStr = formatDuration(ctx.client.uptime || 0);
    const guildsCount = ctx.client.guilds.cache.size;
    const usersCount = ctx.client.users.cache.size;
    const nodeVersion = process.version;

    return ctx.reply({
      embeds: [voidEmbeds.botInfo({
        uptime: uptimeStr,
        guildsCount,
        usersCount,
        nodeVersion,
        djsVersion
      })]
    });
  }
};
