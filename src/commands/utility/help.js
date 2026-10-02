/**
 * VOID Upgraded Help Command
 * Interactive navigable category explorer and detailed command syntax lookup.
 */

const {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ComponentType
} = require('discord.js');
const { voidEmbeds, createBaseEmbed } = require('../../embeds/builder');

module.exports = {
  name: 'help',
  aliases: ['commands'],
  description: 'Display available VOID commands, categories, and usage syntax.',
  category: 'utility',
  permissions: [],
  botPermissions: [],
  prefixUsage: 'help [command]',
  slashUsage: '/help [command:<name>]',

  slashBuilder: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Display available VOID commands, categories, and usage syntax.')
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

    // 1. Specific command details
    if (specific) {
      const cmd = commandRegistry.get(specific);
      if (!cmd) {
        return ctx.error(`Command \`${specific}\` does not exist or has not been loaded.`);
      }

      const embed = createBaseEmbed();
      embed.setTitle(`Command Details: ${cmd.name.toUpperCase()}`);
      embed.setDescription(cmd.description || 'No description available.');
      embed.addFields([
        { name: 'Prefix Usage', value: `\`${ctx.prefix}${cmd.prefixUsage || cmd.name}\``, inline: true },
        { name: 'Slash Usage', value: `\`${cmd.slashUsage || `/${cmd.name}`}\``, inline: true },
        { name: 'Category', value: (cmd.category || 'general').toUpperCase(), inline: true }
      ]);
      return ctx.reply({ embeds: [embed] });
    }

    // 2. Full category overview
    const categories = commandRegistry.getByCategory();
    const prefix = ctx.prefix;

    function buildCategoryEmbed(selectedCategory) {
      const embed = createBaseEmbed();
      embed.setTitle('VOID Moderation System');
      embed.setDescription(
        `Active Server Prefix: \`${prefix}\` • All commands support both Slash (\`/\`) and Prefix.\n` +
        `Use the menu below to browse categories, or type \`${prefix}help <command>\` for details.`
      );

      if (selectedCategory && categories[selectedCategory]) {
        const cmds = categories[selectedCategory];
        const formatted = cmds.map(c => `\`${prefix}${c.name}\` / \`/${c.name}\` — ${c.description}`).join('\n');
        embed.addFields({
          name: `Category: ${selectedCategory.toUpperCase()} (${cmds.length} commands)`,
          value: formatted,
          inline: false
        });
      } else {
        for (const [catName, cmds] of Object.entries(categories)) {
          const list = cmds.map(c => `\`${c.name}\``).join(', ');
          embed.addFields({
            name: `${catName.toUpperCase()} (${cmds.length})`,
            value: list || 'None',
            inline: false
          });
        }
      }

      return embed;
    }

    // Build interactive select menu
    const selectOptions = Object.keys(categories).map(cat => ({
      label: `${cat.charAt(0).toUpperCase() + cat.slice(1)} Commands`,
      value: cat,
      description: `View all commands in ${cat}`
    }));

    selectOptions.unshift({
      label: 'All Categories Overview',
      value: 'all',
      description: 'Show summary of all command categories'
    });

    const selectRow = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('help_category_select')
        .setPlaceholder('Select a category to inspect...')
        .addOptions(selectOptions)
    );

    const initialEmbed = buildCategoryEmbed(null);
    const responseMessage = await ctx.reply({
      embeds: [initialEmbed],
      components: [selectRow]
    });

    let targetMessage = responseMessage;
    if (ctx.isSlash && ctx.interaction && typeof ctx.interaction.fetchReply === 'function') {
      targetMessage = await ctx.interaction.fetchReply().catch(() => null);
    }

    if (!targetMessage || typeof targetMessage.createMessageComponentCollector !== 'function') {
      return responseMessage;
    }

    const collector = targetMessage.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 60000
    });

    collector.on('collect', async (interaction) => {
      if (interaction.user.id !== ctx.user.id) {
        return interaction.reply({
          content: 'This help menu is controlled by the user who invoked the command.',
          ephemeral: true
        });
      }

      const selected = interaction.values[0];
      const updatedEmbed = buildCategoryEmbed(selected === 'all' ? null : selected);

      await interaction.update({
        embeds: [updatedEmbed],
        components: [selectRow]
      }).catch(() => null);
    });

    collector.on('end', async () => {
      const disabledRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('help_category_select')
          .setPlaceholder('Menu expired (use help command again)')
          .setDisabled(true)
          .addOptions([{ label: 'Expired', value: 'expired' }])
      );

      try {
        if (ctx.isSlash && ctx.interaction) {
          await ctx.interaction.editReply({ components: [disabledRow] }).catch(() => null);
        } else if (targetMessage && typeof targetMessage.edit === 'function') {
          await targetMessage.edit({ components: [disabledRow] }).catch(() => null);
        }
      } catch {
        // Safe ignore
      }
    });

    return responseMessage;
  }
};
