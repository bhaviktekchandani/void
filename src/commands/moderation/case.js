/**
 * VOID Case Command
 * Inspect details of a moderation case by case number.
 */

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { checkMemberPermissions } = require('../../utils/permissions');
const { voidEmbeds } = require('../../embeds/builder');

module.exports = {
  name: 'case',
  description: 'View details of a specific moderation case.',
  category: 'moderation',
  permissions: [PermissionFlagsBits.ModerateMembers],
  botPermissions: [PermissionFlagsBits.SendMessages],
  prefixUsage: 'case <case_number>',
  slashUsage: '/case number:<case_number>',

  slashBuilder: new SlashCommandBuilder()
    .setName('case')
    .setDescription('View details of a specific moderation case.')
    .addIntegerOption(opt =>
      opt.setName('number')
        .setDescription('The case number to view')
        .setMinValue(1)
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  parsePrefixArgs(tokens) {
    if (tokens.length === 0) return {};
    return { number: tokens[0] };
  },

  async execute(ctx) {
    // 1. Permission checks
    const memberCheck = checkMemberPermissions(ctx.member, this.permissions);
    if (!memberCheck.has) {
      return ctx.permissionError(`You lack permission: \`${memberCheck.missing.join(', ')}\``);
    }

    // 2. Resolve case number
    const caseNum = ctx.getInteger('number') || ctx.parsedArgs.number;
    if (!caseNum || isNaN(caseNum) || caseNum <= 0) {
      return ctx.error(`Please specify a valid case number.\nUsage: \`${ctx.prefix}${this.prefixUsage}\``);
    }

    // 3. Fetch from case service
    const caseData = await ctx.services.caseService.getCase(ctx.guild.id, caseNum);
    if (!caseData) {
      return ctx.error(`Case #${caseNum} does not exist in this server.`);
    }

    // 4. Response
    const embed = voidEmbeds.caseDetails(caseData);
    return ctx.reply({ embeds: [embed] });
  }
};
