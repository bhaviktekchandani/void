/**
 * VOID Centralized Embed Builder
 * Produces minimalist, charcoal-and-black embeds with clean typography.
 */

const { EmbedBuilder } = require('discord.js');
const { COLORS } = require('./colors');
const { getEmoji } = require('./emojiRegistry');

/**
 * Base embed creator enforcing VOID styling.
 */
function createBaseEmbed(color = COLORS.DEFAULT) {
  return new EmbedBuilder()
    .setColor(color)
    .setTimestamp();
}

const voidEmbeds = {
  /**
   * Embed for moderation actions (ban, kick, timeout, etc.)
   */
  moderationAction({ action, target, moderator, reason, duration, caseNumber }) {
    const embed = createBaseEmbed(COLORS.CHARCOAL);
    const modIcon = getEmoji('MOD');
    const caseTag = caseNumber ? ` [Case #${caseNumber}]` : '';

    embed.setTitle(`${modIcon} ${action.toUpperCase()}${caseTag}`);

    const fields = [
      { name: 'User', value: `${target.tag || target.username || target.id} \`(${target.id})\``, inline: true },
      { name: 'Moderator', value: `${moderator.tag || moderator.username || moderator.id}`, inline: true }
    ];

    if (duration) {
      fields.push({ name: 'Duration', value: `${getEmoji('TIME')} ${duration}`, inline: true });
    }

    fields.push({ name: 'Reason', value: reason || 'No reason specified', inline: false });

    embed.addFields(fields);
    return embed;
  },

  /**
   * Embed for moderation logs in the dedicated log channel
   */
  moderationLog({ action, target, moderator, reason, duration, caseNumber, channelName }) {
    const embed = createBaseEmbed(COLORS.BLACK);
    const caseStr = caseNumber ? `Case #${caseNumber} • ` : '';

    embed.setAuthor({ name: `${caseStr}${action.toUpperCase()}` });

    const fields = [
      { name: 'Target', value: `${target.tag || target.username || target.id} \`(${target.id})\``, inline: true },
      { name: 'Moderator', value: `${moderator.tag || moderator.username || moderator.id} \`(${moderator.id})\``, inline: true }
    ];

    if (duration) {
      fields.push({ name: 'Duration', value: duration, inline: true });
    }

    if (channelName) {
      fields.push({ name: 'Channel', value: channelName, inline: true });
    }

    fields.push({ name: 'Reason', value: reason || 'No reason provided', inline: false });

    embed.addFields(fields);
    return embed;
  },

  /**
   * Embed for user warnings list
   */
  warningsList({ target, warnings, total }) {
    const embed = createBaseEmbed(COLORS.CHARCOAL);
    const userTag = target.tag || target.username || target.id;
    embed.setTitle(`${getEmoji('WARNING')} Warnings for ${userTag}`);

    if (!warnings || warnings.length === 0) {
      embed.setDescription('No recorded warnings on record.');
      return embed;
    }

    embed.setDescription(`Showing ${warnings.length} of ${total || warnings.length} warning(s).`);

    const fields = warnings.slice(0, 10).map((w, index) => {
      const date = w.created_at ? new Date(w.created_at).toLocaleDateString() : 'Unknown date';
      const caseLabel = w.case_number ? ` [Case #${w.case_number}]` : (w.case_id ? ` [Case #${w.case_id}]` : '');
      return {
        name: `#${index + 1}${caseLabel} • ${date}`,
        value: `**Reason:** ${w.reason || 'None'}\n**Mod:** <@${w.moderator_id}>`,
        inline: false
      };
    });

    embed.addFields(fields);
    return embed;
  },

  /**
   * Embed for single case inspection
   */
  caseDetails(caseData) {
    const embed = createBaseEmbed(COLORS.CHARCOAL);
    embed.setTitle(`${getEmoji('CASE')} Case #${caseData.case_number || caseData.id} • ${caseData.action.toUpperCase()}`);

    const date = caseData.created_at ? new Date(caseData.created_at).toUTCString() : 'N/A';

    const fields = [
      { name: 'Target', value: `<@${caseData.target_id}> \`(${caseData.target_id})\``, inline: true },
      { name: 'Moderator', value: `<@${caseData.moderator_id}> \`(${caseData.moderator_id})\``, inline: true },
      { name: 'Timestamp', value: date, inline: false }
    ];

    if (caseData.duration) {
      fields.push({ name: 'Duration', value: caseData.duration, inline: true });
    }

    fields.push({ name: 'Reason', value: caseData.reason || 'No reason specified', inline: false });

    embed.addFields(fields);
    return embed;
  },

  /**
   * Embed for userinfo command
   */
  userInfo({ user, member }) {
    const embed = createBaseEmbed(COLORS.CHARCOAL);
    embed.setAuthor({
      name: `${user.tag || user.username}`,
      iconURL: user.displayAvatarURL ? user.displayAvatarURL({ dynamic: true }) : undefined
    });

    const fields = [
      { name: 'User ID', value: `\`${user.id}\``, inline: true },
      { name: 'Bot Account', value: user.bot ? 'Yes' : 'No', inline: true },
      { name: 'Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true }
    ];

    if (member) {
      if (member.joinedTimestamp) {
        fields.push({ name: 'Joined Server', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true });
      }

      const roles = member.roles?.cache
        ? member.roles.cache.filter(r => r.id !== member.guild.id).map(r => `<@&${r.id}>`).slice(0, 10).join(' ') || 'None'
        : 'None';
      fields.push({ name: 'Key Roles', value: roles, inline: false });
    }

    embed.addFields(fields);
    return embed;
  },

  /**
   * Embed for configuration view or updates
   */
  config({ prefix, logChannelId, guildName, updatedField, updatedValue }) {
    const embed = createBaseEmbed(COLORS.CHARCOAL);
    embed.setTitle(`${getEmoji('CONFIG')} Server Configuration`);

    if (updatedField) {
      embed.setDescription(`${getEmoji('SUCCESS')} Updated **${updatedField}** to \`${updatedValue}\`.`);
    }

    const logDisplay = logChannelId ? `<#${logChannelId}> \`(${logChannelId})\`` : 'Not configured';

    embed.addFields([
      { name: 'Current Prefix', value: `\`${prefix}\``, inline: true },
      { name: 'Mod Log Channel', value: logDisplay, inline: true }
    ]);

    return embed;
  },

  /**
   * Embed for setup guide
   */
  setup({ prefix, logChannelId, message }) {
    const embed = createBaseEmbed(COLORS.CHARCOAL);
    embed.setTitle(`${getEmoji('CONFIG')} Setup & Overview`);
    embed.setDescription(message || 'Configure your moderation settings below.');

    embed.addFields([
      { name: 'Prefix', value: `Current: \`${prefix}\`\nChange: \`${prefix}prefix set <new>\` or \`/prefix set\``, inline: false },
      { name: 'Mod Log Channel', value: logChannelId ? `<#${logChannelId}>` : `Set with: \`${prefix}setup logchannel #channel\` or \`/setup logchannel\``, inline: false }
    ]);

    return embed;
  },

  /**
   * Embed for help menu
   */
  help({ prefix, categories }) {
    const embed = createBaseEmbed(COLORS.CHARCOAL);
    embed.setTitle(`VOID Moderation`);
    embed.setDescription(
      `Fast, reliable server moderation.\n` +
      `Active prefix: \`${prefix}\` • Slash commands supported for all actions.`
    );

    for (const [catName, cmds] of Object.entries(categories)) {
      const formatted = cmds.map(c => `\`${prefix}${c.name}\` / \`/${c.name}\` — ${c.description}`).join('\n');
      embed.addFields({
        name: `${catName.toUpperCase()}`,
        value: formatted || 'No commands',
        inline: false
      });
    }

    return embed;
  },

  /**
   * Embed for error notification
   */
  error(message) {
    const embed = createBaseEmbed(COLORS.ERROR);
    embed.setDescription(`${getEmoji('FAILURE')} ${message}`);
    return embed;
  },

  /**
   * Embed for permission failures
   */
  permissionError(message) {
    const embed = createBaseEmbed(COLORS.ERROR);
    embed.setDescription(`${getEmoji('FAILURE')} **Permission Denied:** ${message}`);
    return embed;
  },

  /**
   * Generic success embed
   */
  success(message) {
    const embed = createBaseEmbed(COLORS.CHARCOAL);
    embed.setDescription(`${getEmoji('SUCCESS')} ${message}`);
    return embed;
  }
};

module.exports = { voidEmbeds, createBaseEmbed };
