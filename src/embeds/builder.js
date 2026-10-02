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
  },

  /**
   * Embed for moderator notes list
   */
  notesList({ target, notes, total, page = 1, totalPages = 1 }) {
    const embed = createBaseEmbed(COLORS.CHARCOAL);
    const userTag = target.tag || target.username || target.id;
    embed.setTitle(`Staff Notes: ${userTag}`);

    if (!notes || notes.length === 0) {
      embed.setDescription('No staff notes recorded for this user.');
      return embed;
    }

    embed.setDescription(`Showing ${notes.length} of ${total} note(s) • Page ${page}/${totalPages}`);

    const fields = notes.map((n) => {
      const date = n.created_at ? new Date(n.created_at).toLocaleDateString() : 'N/A';
      return {
        name: `Note #${n.id} • ${date} (by <@${n.moderator_id}>)`,
        value: n.note,
        inline: false
      };
    });

    embed.addFields(fields);
    return embed;
  },

  /**
   * Embed for full moderation history (cases)
   */
  modHistory({ target, cases, total, page = 1, totalPages = 1 }) {
    const embed = createBaseEmbed(COLORS.CHARCOAL);
    const userTag = target.tag || target.username || target.id;
    embed.setTitle(`Moderation History: ${userTag}`);

    if (!cases || cases.length === 0) {
      embed.setDescription('Clean record. No moderation cases found.');
      return embed;
    }

    embed.setDescription(`Total cases on file: **${total}** • Page ${page}/${totalPages}`);

    const fields = cases.map((c) => {
      const date = c.created_at ? new Date(c.created_at).toLocaleDateString() : 'N/A';
      const dur = c.duration ? ` (${c.duration})` : '';
      return {
        name: `Case #${c.case_number} • ${c.action}${dur} • ${date}`,
        value: `**Reason:** ${c.reason || 'None specified'}\n**Mod:** <@${c.moderator_id}>`,
        inline: false
      };
    });

    embed.addFields(fields);
    return embed;
  },

  /**
   * Embed for AutoMod configuration overview
   */
  automodOverview({ config, guildName }) {
    const embed = createBaseEmbed(COLORS.CHARCOAL);
    embed.setTitle(`${getEmoji('CONFIG')} AutoMod Configuration`);
    embed.setDescription(`Automated moderation rules for **${guildName}**.`);

    const status = config.enabled ? `\`ENABLED\` (Action: \`${config.action}\`)` : '`DISABLED`';
    const wordsCount = config.blocked_words ? config.blocked_words.length : 0;

    embed.addFields([
      { name: 'System Status', value: status, inline: true },
      { name: 'Spam Rate Limit', value: config.spam_enabled ? `${config.spam_max_messages} msgs / ${config.spam_interval_sec}s` : 'Off', inline: true },
      { name: 'Mention Limit', value: config.mention_limit > 0 ? `Max ${config.mention_limit} mentions` : 'Off', inline: true },
      { name: 'Discord Invites', value: config.invites_blocked ? 'Blocked' : 'Allowed', inline: true },
      { name: 'External Links', value: config.links_blocked ? 'Blocked' : 'Allowed', inline: true },
      { name: 'Blocked Words', value: `${wordsCount} phrase(s) configured`, inline: true }
    ]);

    return embed;
  },

  /**
   * Embed for Anti-Raid configuration overview
   */
  antiraidOverview({ config, guildName }) {
    const embed = createBaseEmbed(COLORS.CHARCOAL);
    embed.setTitle(`${getEmoji('CONFIG')} Anti-Raid Protection`);
    embed.setDescription(`Join spike safeguards for **${guildName}**.`);

    const status = config.enabled ? '`ACTIVE`' : '`DISABLED`';
    const lockdown = config.is_locked_down ? '`LOCKED DOWN` 🔒' : 'Normal';

    embed.addFields([
      { name: 'Status', value: status, inline: true },
      { name: 'Threshold', value: `${config.join_threshold} joins / ${config.interval_sec}s`, inline: true },
      { name: 'Raid Action', value: `\`${config.action}\``, inline: true },
      { name: 'Current State', value: lockdown, inline: false }
    ]);

    return embed;
  },

  /**
   * Embed for botinfo command
   */
  botInfo({ uptime, guildsCount, usersCount, nodeVersion, djsVersion }) {
    const embed = createBaseEmbed(COLORS.CHARCOAL);
    embed.setTitle(`VOID — System Information`);
    embed.setDescription(`Fast, reliable, extensible Discord moderation system.`);

    embed.addFields([
      { name: 'Uptime', value: uptime, inline: true },
      { name: 'Servers', value: `${guildsCount}`, inline: true },
      { name: 'Cached Members', value: `${usersCount}`, inline: true },
      { name: 'Node.js', value: nodeVersion, inline: true },
      { name: 'discord.js', value: `v${djsVersion}`, inline: true },
      { name: 'Database', value: 'PostgreSQL', inline: true }
    ]);

    return embed;
  },

  /**
   * Embed for avatar command
   */
  avatar({ user }) {
    const embed = createBaseEmbed(COLORS.CHARCOAL);
    const userTag = user.tag || user.username;
    embed.setTitle(`Avatar — ${userTag}`);
    const url = user.displayAvatarURL({ size: 1024, dynamic: true });
    embed.setImage(url);
    embed.setDescription(`[Open Image Link](${url})`);
    return embed;
  }
};

module.exports = { voidEmbeds, createBaseEmbed };
