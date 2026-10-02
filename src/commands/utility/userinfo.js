/**
 * VOID UserInfo Command
 * Supports /userinfo and .?userinfo [@user]
 */

const { SlashCommandBuilder } = require('discord.js');
const { extractUserId } = require('../../utils/argumentParser');
const { voidEmbeds } = require('../../embeds/builder');

module.exports = {
  name: 'userinfo',
  description: 'View information about a member or account.',
  category: 'utility',
  permissions: [],
  botPermissions: [PermissionFlagsBits => []],
  prefixUsage: 'userinfo [@user|id]',
  slashUsage: '/userinfo [user:<@user>]',

  slashBuilder: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('View information about a member or account.')
    .addUserOption(opt =>
      opt.setName('user')
        .setDescription('The user to inspect (defaults to yourself)')
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

    let targetMember = null;
    if (ctx.guild) {
      targetMember = await ctx.guild.members.fetch(targetUser.id).catch(() => null);
    }

    const embed = voidEmbeds.userInfo({
      user: targetUser,
      member: targetMember
    });

    return ctx.reply({ embeds: [embed] });
  }
};
