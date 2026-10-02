/**
 * VOID Update Case Reason Command
 * Allows authorized staff to amend the reason for an existing moderation case.
 */

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { checkMemberPermissions } = require('../../utils/permissions');
const { voidEmbeds } = require('../../embeds/builder');

module.exports = {
  name: 'reason',
  description: 'Update or set the reason for an existing moderation case.',
  category: 'moderation',
  permissions: [PermissionFlagsBits.ModerateMembers],
  botPermissions: [PermissionFlagsBits.SendMessages],
  prefixUsage: 'reason <case_number> <new_reason>',
  slashUsage: '/reason number:<case_number> reason:<new_reason>',

  slashBuilder: new SlashCommandBuilder()
    .setName('reason')
    .setDescription('Update or set the reason for an existing moderation case.')
    .addIntegerOption(opt =>
      opt.setName('number')
        .setDescription('Case number to update')
        .setMinValue(1)
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('reason')
        .setDescription('New reason for the case')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  parsePrefixArgs(tokens, rawArgs) {
    if (tokens.length < 2) return { number: tokens[0] ? parseInt(tokens[0], 10) : null };
    const caseNum = parseInt(tokens[0], 10);
    const numToken = tokens[0];
    const idx = rawArgs.indexOf(numToken);
    let reason = null;
    if (idx !== -1) {
      reason = rawArgs.slice(idx + numToken.length).trim().replace(/^["']|["']$/g, '');
    }
    return { number: caseNum, reason };
  },

  async execute(ctx) {
    // 1. Permission checks
    const memberCheck = checkMemberPermissions(ctx.member, this.permissions);
    if (!memberCheck.has) {
      return ctx.permissionError(`You lack permission: \`${memberCheck.missing.join(', ')}\``);
    }

    // 2. Resolve arguments
    const caseNum = ctx.getInteger('number') || ctx.parsedArgs.number;
    const newReason = ctx.getString('reason') || ctx.parsedArgs.reason;

    if (!caseNum || isNaN(caseNum) || caseNum <= 0) {
      return ctx.error(`Please provide a valid case number.\nUsage: \`${ctx.prefix}${this.prefixUsage}\``);
    }

    if (!newReason || newReason.trim().length === 0) {
      return ctx.error(`Please provide the updated reason.\nUsage: \`${ctx.prefix}${this.prefixUsage}\``);
    }

    // 3. Update case
    const updated = await ctx.services.caseService.updateReason(
      ctx.guild.id,
      caseNum,
      newReason.trim(),
      ctx.user.id
    );

    if (!updated) {
      return ctx.error(`Case #${caseNum} does not exist in this server or could not be updated.`);
    }

    // 4. Response with updated case embed
    return ctx.reply({
      content: `Updated reason for **Case #${caseNum}**:`,
      embeds: [voidEmbeds.caseDetails(updated)]
    });
  }
};
