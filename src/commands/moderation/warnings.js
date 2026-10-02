/**
 * VOID Warnings Command
 * Supports /warnings and .?warnings @user
 */

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { extractUserId } = require('../../utils/argumentParser');
const { checkMemberPermissions } = require('../../utils/permissions');
const { voidEmbeds } = require('../../embeds/builder');

module.exports = {
  name: 'warnings',
  description: 'View recorded warnings for a member.',
  category: 'moderation',
  permissions: [PermissionFlagsBits.ModerateMembers],
  botPermissions: [PermissionFlagsBits.SendMessages],
  prefixUsage: 'warnings <@user|id>',
  slashUsage: '/warnings user:<@user>',

  slashBuilder: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('View recorded warnings for a member.')
    .addUserOption(opt =>
      opt.setName('user')
        .setDescription('The member whose warnings to inspect')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  parsePrefixArgs(tokens) {
    if (tokens.length === 0) return {};
    const targetId = extractUserId(tokens[0]);
    return { targetId };
  },

  async execute(ctx) {
    // 1. Permission checks
    const memberCheck = checkMemberPermissions(ctx.member, this.permissions);
    if (!memberCheck.has) {
      return ctx.permissionError(`You lack permission: \`${memberCheck.missing.join(', ')}\``);
    }

    // 2. Resolve target member
    const targetUser = await ctx.getUser('user');
    if (!targetUser) {
      return ctx.error(`Please specify a valid user.\nUsage: \`${ctx.prefix}${this.prefixUsage}\``);
    }

    // 3. Fetch warnings
    const warnings = await ctx.services.warningService.getWarnings(ctx.guild.id, targetUser.id);
    const totalCount = await ctx.services.warningService.countWarnings(ctx.guild.id, targetUser.id);

    // 4. Response
    const embed = voidEmbeds.warningsList({
      target: targetUser,
      warnings,
      total: totalCount
    });

    return ctx.reply({ embeds: [embed] });
  }
};
