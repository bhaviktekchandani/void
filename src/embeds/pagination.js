/**
 * VOID Interactive Pagination Helper
 * Provides functional button-based navigation for paginated embeds with invoker validation and expiration cleanup.
 */

const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

/**
 * Handle paginated embed display.
 * @param {object} params
 * @param {import('../commands/context').CommandContext} params.ctx
 * @param {number} params.totalPages
 * @param {Function} params.getEmbedForPage (page: number) => Promise<EmbedBuilder>|EmbedBuilder
 * @param {number} [params.timeout=60000]
 */
async function sendPaginatedEmbed({ ctx, totalPages, getEmbedForPage, timeout = 60000 }) {
  if (totalPages <= 1) {
    const embed = await getEmbedForPage(1);
    return await ctx.reply({ embeds: [embed] });
  }

  let currentPage = 1;

  function buildButtons(page) {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('prev_page')
        .setLabel('◀ Prev')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page <= 1),
      new ButtonBuilder()
        .setCustomId('page_indicator')
        .setLabel(`${page} / ${totalPages}`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId('next_page')
        .setLabel('Next ▶')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page >= totalPages)
    );
  }

  const initialEmbed = await getEmbedForPage(currentPage);
  const responseMessage = await ctx.reply({
    embeds: [initialEmbed],
    components: [buildButtons(currentPage)]
  });

  // Extract the target message for collector
  let targetMessage = responseMessage;
  if (ctx.isSlash && ctx.interaction && typeof ctx.interaction.fetchReply === 'function') {
    targetMessage = await ctx.interaction.fetchReply().catch(() => null);
  }

  if (!targetMessage || typeof targetMessage.createMessageComponentCollector !== 'function') {
    return responseMessage;
  }

  const collector = targetMessage.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: timeout
  });

  collector.on('collect', async (interaction) => {
    // Permission validation: Only original command invoker can control pages
    if (interaction.user.id !== ctx.user.id) {
      return interaction.reply({
        content: 'This pagination menu can only be controlled by the user who invoked it.',
        ephemeral: true
      });
    }

    if (interaction.customId === 'prev_page' && currentPage > 1) {
      currentPage--;
    } else if (interaction.customId === 'next_page' && currentPage < totalPages) {
      currentPage++;
    }

    const newEmbed = await getEmbedForPage(currentPage);
    await interaction.update({
      embeds: [newEmbed],
      components: [buildButtons(currentPage)]
    }).catch(() => null);
  });

  collector.on('end', async () => {
    // Disable buttons on expiration to avoid stale interaction errors
    const disabledRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('prev_page').setLabel('◀ Prev').setStyle(ButtonStyle.Secondary).setDisabled(true),
      new ButtonBuilder().setCustomId('page_indicator').setLabel(`${currentPage} / ${totalPages}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
      new ButtonBuilder().setCustomId('next_page').setLabel('Next ▶').setStyle(ButtonStyle.Secondary).setDisabled(true)
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

module.exports = { sendPaginatedEmbed };
