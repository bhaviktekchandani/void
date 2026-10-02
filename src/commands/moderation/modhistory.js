/**
 * VOID Moderation History Command
 * View full history of moderation actions (bans, kicks, timeouts, warnings) for a member.
 */

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { extractUserId } = require('../../utils/argumentParser');
const { checkMemberPermissions } = require('../../utils/permissions');
const { voidEmbeds } = require('../../embeds/builder');
const { sendPaginatedEmbed } = require('../../embeds/pagination');

module.exports = {
  name: 'modhistory',
  aliases: ['history'],
  description: 'View the complete moderation case history for a user.',
  category: 'moderation',
  permissions: [PermissionFlagsBits.ModerateMembers],
  botPermissions: [PermissionFlagsBits.SendMessages],
  prefixUsage: 'modhistory <@user|id>',
  slashUsage: '/modhistory user:<@user>',

  slashBuilder: new SlashCommandBuilder()
    .setName('modhistory')
    .setDescription('View the complete moderation case history for a user.')
    .addUserOption(opt =>
      opt.setName('user')
        .setDescription('The member whose moderation history to view')
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

    // 3. Count total cases
    const totalCount = await ctx.services.caseService.countUserCases(ctx.guild.id, targetUser.id);
    const pageSize = 5;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    // 4. Send paginated embed
    return await sendPaginatedEmbed({
      ctx,
      totalPages,
      getEmbedForPage: async (page) => {
        const offset = (page - 1) * pageSize;
        const cases = await ctx.services.caseService.getUserCases(ctx.guild.id, targetUser.id, pageSize, offset);
        return voidEmbeds.modHistory({
          target: targetUser,
          cases,
          total: totalCount,
          page,
          totalPages
        });
      }
    });
  }
};
