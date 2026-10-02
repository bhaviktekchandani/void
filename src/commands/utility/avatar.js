/**
 * VOID Avatar Command
 * Displays high-resolution avatar image for a user.
 */

const { SlashCommandBuilder } = require('discord.js');
const { extractUserId } = require('../../utils/argumentParser');
const { voidEmbeds } = require('../../embeds/builder');

module.exports = {
  name: 'avatar',
  aliases: ['av', 'pfp'],
  description: 'Display the avatar of a user.',
  category: 'utility',
  permissions: [],
  botPermissions: [],
  prefixUsage: 'avatar [@user|id]',
  slashUsage: '/avatar [user:<@user>]',

  slashBuilder: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Display the avatar of a user.')
    .addUserOption(opt =>
      opt.setName('user')
        .setDescription('The user whose avatar to view (defaults to yourself)')
        .setRequired(false)
    ),

  parsePrefixArgs(tokens) {
    if (tokens.length === 0) return {};
    const targetId = extractUserId(tokens[0]);
    return { targetId };
  },

  async execute(ctx) {
    let targetUser = await ctx.getUser('user');
    if (!targetUser) {
      targetUser = ctx.user;
    }

    return ctx.reply({
      embeds: [voidEmbeds.avatar({ user: targetUser })]
    });
  }
};
