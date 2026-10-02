/**
 * VOID Slowmode Command
 * Configures channel slowmode rate limit per user.
 */

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { validateSlowmode } = require('../../utils/validators');
const { checkMemberPermissions, checkBotPermissions } = require('../../utils/permissions');
const { voidEmbeds } = require('../../embeds/builder');

module.exports = {
  name: 'slowmode',
  description: 'Set channel slowmode in seconds (0 to disable, up to 21600s).',
  category: 'moderation',
  permissions: [PermissionFlagsBits.ManageChannels],
  botPermissions: [PermissionFlagsBits.ManageChannels],
  prefixUsage: 'slowmode <seconds>',
  slashUsage: '/slowmode seconds:<0-21600>',

  slashBuilder: new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Set channel slowmode in seconds (0 to disable, up to 21600s).')
    .addIntegerOption(opt =>
      opt.setName('seconds')
        .setDescription('Cooldown seconds (0 to disable)')
        .setMinValue(0)
        .setMaxValue(21600)
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  parsePrefixArgs(tokens) {
    if (tokens.length === 0) return {};
    return { seconds: tokens[0] };
  },

  async execute(ctx) {
    // 1. Permission checks
    const memberCheck = checkMemberPermissions(ctx.member, this.permissions);
    if (!memberCheck.has) {
      return ctx.permissionError(`You lack permission: \`${memberCheck.missing.join(', ')}\``);
    }

    const botMember = ctx.guild.members.me || await ctx.guild.members.fetchMe().catch(() => null);
    const botCheck = checkBotPermissions(botMember, this.botPermissions, ctx.channel);
    if (!botCheck.has) {
      return ctx.error(`VOID lacks permission: \`${botCheck.missing.join(', ')}\``);
    }

    // 2. Validate slowmode duration
    const rawSeconds = ctx.getInteger('seconds') || ctx.parsedArgs.seconds;
    const validation = validateSlowmode(rawSeconds);
    if (!validation.valid) {
      return ctx.error(validation.error);
    }

    const seconds = validation.seconds;

    // 3. Apply slowmode
    try {
      await ctx.channel.setRateLimitPerUser(seconds, `Slowmode set by ${ctx.user.tag || ctx.user.username}`);
    } catch (err) {
      return ctx.error(`Failed to adjust slowmode: ${err.message}`);
    }

    // 4. Record action
    await ctx.services.moderationService.recordAction({
      guild: ctx.guild,
      target: { id: ctx.channel.id, tag: `#${ctx.channel.name}` },
      moderator: ctx.user,
      action: 'SLOWMODE',
      duration: `${seconds}s`,
      reason: seconds === 0 ? 'Disabled slowmode' : `Set slowmode to ${seconds}s`,
      channelName: ctx.channel.name
    });

    // 5. Response
    const msg = seconds === 0
      ? `Slowmode has been **disabled** in \`#${ctx.channel.name}\`.`
      : `Slowmode for \`#${ctx.channel.name}\` set to **${seconds} second${seconds === 1 ? '' : 's'}**.`;

    return ctx.reply({ embeds: [voidEmbeds.success(msg)] });
  }
};
