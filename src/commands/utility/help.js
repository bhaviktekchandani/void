/**
 * VOID Help Command
 * Supports /help and .?help [command]
 */

const { SlashCommandBuilder } = require('discord.js');
const { voidEmbeds } = require('../../embeds/builder');

module.exports = {
  name: 'help',
  description: 'Display available VOID commands and usage syntax.',
  category: 'utility',
  permissions: [],
  botPermissions: [],
  prefixUsage: 'help [command]',
  slashUsage: '/help [command:<name>]',

  slashBuilder: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Display available VOID commands and usage syntax.')
    .addStringOption(opt =>
      opt.setName('command')
        .setDescription('Specific command to inspect')
        .setRequired(false)
    ),

  parsePrefixArgs(tokens) {
    if (tokens.length === 0) return {};
    return { command: tokens[0].toLowerCase() };
  },

  async execute(ctx) {
    const specific = ctx.getString('command') || ctx.parsedArgs.command;
    const { commandRegistry } = require('../registry');

    if (specific) {
      const cmd = commandRegistry.get(specific);
      if (!cmd) {
        return ctx.error(`Command \`${specific}\` does not exist.`);
      }

      const embed = voidEmbeds.createBaseEmbed();
      embed.setTitle(`Command: ${cmd.name}`);
      embed.setDescription(cmd.description || 'No description provided.');
      embed.addFields([
        { name: 'Prefix Usage', value: `\`${ctx.prefix}${cmd.prefixUsage || cmd.name}\``, inline: true },
        { name: 'Slash Usage', value: `\`${cmd.slashUsage || `/${cmd.name}`}\``, inline: true },
        { name: 'Category', value: (cmd.category || 'general').toUpperCase(), inline: true }
      ]);
      return ctx.reply({ embeds: [embed] });
    }

    const categories = commandRegistry.getByCategory();
    const embed = voidEmbeds.help({
      prefix: ctx.prefix,
      categories
    });

    return ctx.reply({ embeds: [embed] });
  }
};
