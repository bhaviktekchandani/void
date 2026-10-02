/**
 * VOID Centralized Embed Builder
 * Pure black UI (#000000 / 0x000000) across all embeds.
 * Restrained emoji usage: at most 1 emoji in major titles/action headings.
 * Clean, readable section headings with zero unnecessary pings and no emoji clutter.
 */

const { EmbedBuilder } = require('discord.js');
const { COLORS } = require('./colors');
const { getEmoji } = require('./emojiRegistry');

/**
 * Base embed creator enforcing VOID pure black styling (#000000).
 * @param {number} [color=COLORS.BLACK]
 * @returns {EmbedBuilder}
 */
function createBaseEmbed(color = COLORS.BLACK) {
  return new EmbedBuilder()
    .setColor(color)
    .setTimestamp();
}

/**
 * Resilient filter supporting Discord Collections, JS Maps, and Arrays.
 */
function safeFilter(collection, predicate) {
  if (!collection) return [];
  if (typeof collection.filter === 'function') {
    const res = collection.filter(predicate);
    return typeof res.values === 'function' ? Array.from(res.values()) : Array.from(res);
  }
  if (collection instanceof Map) {
    const matched = [];
    for (const val of collection.values()) {
      if (predicate(val)) matched.push(val);
    }
    return matched;
  }
  if (Array.isArray(collection)) {
    return collection.filter(predicate);
  }
  return [];
}

/**
 * Resilient size/count getter for collections, maps, and arrays.
 */
function safeCount(collection, predicate) {
  if (!collection) return 0;
  if (predicate) {
    return safeFilter(collection, predicate).length;
  }
  if (typeof collection.size === 'number') return collection.size;
  if (typeof collection.length === 'number') return collection.length;
  return 0;
}

/**
 * Resolve the appropriate action emoji based on action name.
 * @param {string} action
 * @returns {string}
 */
function getActionEmoji(action) {
  if (!action) return getEmoji('shield');
  const act = action.toLowerCase().trim();
  if (act.includes('unban')) return getEmoji('unban');
  if (act.includes('ban')) return getEmoji('ban');
  if (act.includes('kick')) return getEmoji('kick');
  if (act.includes('untimeout')) return getEmoji('untimeout');
  if (act.includes('timeout')) return getEmoji('timeout');
  if (act.includes('warn')) return getEmoji('warn');
  if (act.includes('purge')) return getEmoji('purge');
  if (act.includes('unlock')) return getEmoji('unlock');
  if (act.includes('lock')) return getEmoji('lock');
  if (act.includes('slowmode')) return getEmoji('slowmode');
  return getEmoji('shield');
}

const voidEmbeds = {
  createBaseEmbed,

  /**
   * Reference Standard Moderation Report Embed.
   * Pure black (#000000) styling with disciplined layout and 4 clean sections:
   * 1. Target Identity (plain tag, inline code ID, account age, join date, type, roles)
   * 2. Action Details (action, reason, moderator, duration, guild, channel)
   * 3. Moderation History (total cases, warnings, staff notes)
   * 4. Execution Details (DM delivery status, member state, verified REST action)
   *
   * @param {object} params
   * @returns {EmbedBuilder}
   */
  moderationAction({
    action = 'Moderation Action',
    target,
    moderator,
    reason,
    duration,
    caseNumber,
    targetMember = null,
    guild = null,
    dmStatus = null,
    history = null,
    channelName = null
  }) {
    const embed = createBaseEmbed(COLORS.BLACK);
    const actionEmoji = getActionEmoji(action);
    const caseTag = caseNumber ? ` [Case #${caseNumber}]` : '';

    const targetTag = target?.tag || target?.username || String(target?.id || 'Unknown');
    const targetId = String(target?.id || 'N/A');

    embed.setTitle(`${actionEmoji} ${action.toUpperCase()}${caseTag}`);

    // Author thumbnail & header
    const avatarUrl = target?.displayAvatarURL
      ? target.displayAvatarURL({ dynamic: true })
      : targetMember?.displayAvatarURL
        ? targetMember.displayAvatarURL({ dynamic: true })
        : null;

    if (avatarUrl) {
      embed.setThumbnail(avatarUrl);
      embed.setAuthor({
        name: `${targetTag}`,
        iconURL: avatarUrl
      });
    } else {
      embed.setAuthor({ name: targetTag });
    }

    // --- SECTION 1: Target Identity (Plain text header, zero ping) ---
    let accountCreated = 'N/A';
    if (target?.createdTimestamp) {
      const createdSec = Math.floor(target.createdTimestamp / 1000);
      accountCreated = `<t:${createdSec}:f> (<t:${createdSec}:R>)`;
    }

    let joinedServer = 'N/A';
    if (targetMember?.joinedTimestamp) {
      const joinedSec = Math.floor(targetMember.joinedTimestamp / 1000);
      joinedServer = `<t:${joinedSec}:f> (<t:${joinedSec}:R>)`;
    }

    let rolesDisplay = 'None';
    if (targetMember?.roles?.cache) {
      const roleList = safeFilter(targetMember.roles.cache, r => r.id !== (guild?.id || targetMember.guild?.id))
        .map(r => `@${r.name}`)
        .slice(0, 5);
      if (roleList.length > 0) {
        rolesDisplay = roleList.join(', ');
      }
    }

    const accountType = target?.bot ? 'Bot Application' : 'Standard User';

    const identityValue = [
      `**User:** ${targetTag} (\`${targetId}\`)`,
      `**ID:** \`${targetId}\` • **Type:** ${accountType}`,
      `**Created:** ${accountCreated}`,
      ...(joinedServer !== 'N/A' ? [`**Joined:** ${joinedServer}`] : []),
      `**Roles:** ${rolesDisplay}`
    ].join('\n');

    // --- SECTION 2: Action Details (Plain text header, zero ping) ---
    const modTag = moderator?.tag || moderator?.username || String(moderator?.id || 'System');
    const modId = String(moderator?.id || 'N/A');
    const actionDetails = [
      `**Action:** \`${action.toUpperCase()}\`${duration ? ` • **Duration:** \`${duration}\`` : ''}`,
      `**Moderator:** ${modTag} (\`${modId}\`)`,
      `**Reason:** ${reason || 'No reason specified'}`,
      ...(guild?.name ? [`**Guild:** ${guild.name}`] : []),
      ...(channelName ? [`**Channel:** #${channelName}`] : [])
    ].join('\n');

    // --- SECTION 3: Moderation History (Clean single line, no emoji clusters) ---
    const casesCount = history?.caseCount ?? 0;
    const warnsCount = history?.warningCount ?? 0;
    const notesCount = history?.noteCount ?? 0;
    const historyValue = [
      `**Total Cases:** \`${casesCount}\`  •  `,
      `**Warnings:** \`${warnsCount}\`  •  `,
      `**Staff Notes:** \`${notesCount}\``
    ].join('');

    // --- SECTION 4: Execution Details ---
    let dmValue = 'DM Undelivered / Closed';
    if (dmStatus) {
      if (dmStatus.delivered) {
        dmValue = 'Direct Message Delivered';
      } else if (dmStatus.reason) {
        dmValue = `DM Undelivered (${dmStatus.reason})`;
      }
    }

    const memberStatus = targetMember ? 'Member in guild' : 'Outside guild';

    const executionValue = [
      `**DM Notification:** ${dmValue}`,
      `**Target Status:** ${memberStatus}`,
      `**API Enforcement:** Verified Discord REST Action`
    ].join('\n');

    embed.addFields([
      { name: 'Target Identity', value: identityValue, inline: false },
      { name: 'Action Details', value: actionDetails, inline: false },
      { name: 'Moderation History', value: historyValue, inline: false },
      { name: 'Execution Details', value: executionValue, inline: false }
    ]);

    embed.setFooter({
      text: `VOID Security System • Case #${caseNumber || 'N/A'}`
    });

    return embed;
  },

  /**
   * Embed for moderation logs in dedicated audit channels.
   * Pure black (#000000) with zero ping target/mod formats.
   */
  moderationLog({ action, target, moderator, reason, duration, caseNumber, channelName, dmStatus = null }) {
    const embed = createBaseEmbed(COLORS.BLACK);
    const caseStr = caseNumber ? `Case #${caseNumber} • ` : '';

    embed.setAuthor({ name: `${caseStr}${action.toUpperCase()}` });

    const targetTag = target?.tag || target?.username || String(target?.id || 'Unknown');
    const targetId = String(target?.id || 'N/A');
    const modTag = moderator?.tag || moderator?.username || String(moderator?.id || 'System');
    const modId = String(moderator?.id || 'N/A');

    const fields = [
      {
        name: 'Target',
        value: `${targetTag} (\`${targetId}\`)`,
        inline: false
      },
      {
        name: 'Moderator',
        value: `${modTag} (\`${modId}\`)`,
        inline: true
      }
    ];

    if (duration) {
      fields.push({ name: 'Duration', value: `\`${duration}\``, inline: true });
    }

    if (channelName) {
      fields.push({ name: 'Channel', value: `#${channelName}`, inline: true });
    }

    fields.push({
      name: 'Reason',
      value: reason || 'No reason provided',
      inline: false
    });

    if (dmStatus) {
      fields.push({
        name: 'Delivery Status',
        value: dmStatus.delivered ? 'Direct Message Delivered' : 'DM Not Delivered',
        inline: true
      });
    }

    embed.addFields(fields);
    embed.setFooter({ text: `VOID Security Audit Log • Case #${caseNumber || 'N/A'}` });
    return embed;
  },

  /**
   * Embed for message purge reports.
   */
  purgeReport({ deletedCount, channel, moderator, filterUser = null, requestedCount = null }) {
    const embed = createBaseEmbed(COLORS.BLACK);
    embed.setTitle(`${getEmoji('purge')} Message Purge Complete`);

    const fields = [
      {
        name: 'Channel',
        value: `#${channel.name} (\`${channel.id}\`)`,
        inline: true
      },
      {
        name: 'Messages Purged',
        value: `**${deletedCount}** message${deletedCount === 1 ? '' : 's'}${
          requestedCount && deletedCount < requestedCount
            ? ` (of ${requestedCount} requested; messages >14 days old excluded)`
            : ''
        }`,
        inline: true
      },
      {
        name: 'Moderator',
        value: `${moderator.tag || moderator.username} (\`${moderator.id}\`)`,
        inline: false
      }
    ];

    if (filterUser) {
      fields.push({
        name: 'Filtered Target',
        value: `${filterUser.tag || filterUser.username} (\`${filterUser.id}\`)`,
        inline: true
      });
    }

    fields.push({
      name: 'Status',
      value: 'Bulk deletion executed successfully',
      inline: false
    });

    embed.addFields(fields);
    embed.setFooter({ text: `VOID Moderation System • Channel Purge` });
    return embed;
  },

  /**
   * Embed for channel lock reports.
   */
  lockReport({ channel, moderator, reason, overwrittenRole = null }) {
    const embed = createBaseEmbed(COLORS.BLACK);
    embed.setTitle(`${getEmoji('lock')} Channel Locked`);
    embed.setDescription(`Channel #${channel.name} permissions have been locked. Message sending is suspended.`);

    const fields = [
      {
        name: 'Channel',
        value: `#${channel.name} (\`${channel.id}\`)`,
        inline: true
      },
      {
        name: 'Moderator',
        value: `${moderator.tag || moderator.username} (\`${moderator.id}\`)`,
        inline: true
      },
      {
        name: 'Target Role',
        value: overwrittenRole ? `@${overwrittenRole.name}` : '@everyone',
        inline: true
      },
      {
        name: 'Reason',
        value: reason || 'No reason specified',
        inline: false
      },
      {
        name: 'Permission State',
        value: '`SendMessages` permission denied',
        inline: false
      }
    ];

    embed.addFields(fields);
    embed.setFooter({ text: `VOID Moderation System • Lockdown` });
    return embed;
  },

  /**
   * Embed for channel unlock reports.
   */
  unlockReport({ channel, moderator, reason, restoredRole = null }) {
    const embed = createBaseEmbed(COLORS.BLACK);
    embed.setTitle(`${getEmoji('unlock')} Channel Unlocked`);
    embed.setDescription(`Channel #${channel.name} permissions have been restored to their standard state.`);

    const fields = [
      {
        name: 'Channel',
        value: `#${channel.name} (\`${channel.id}\`)`,
        inline: true
      },
      {
        name: 'Moderator',
        value: `${moderator.tag || moderator.username} (\`${moderator.id}\`)`,
        inline: true
      },
      {
        name: 'Restored Role',
        value: restoredRole ? `@${restoredRole.name}` : '@everyone',
        inline: true
      },
      {
        name: 'Reason',
        value: reason || 'No reason specified',
        inline: false
      },
      {
        name: 'Permission State',
        value: '`SendMessages` permission restored',
        inline: false
      }
    ];

    embed.addFields(fields);
    embed.setFooter({ text: `VOID Moderation System • Channel Unlock` });
    return embed;
  },

  /**
   * Embed for slowmode configuration reports.
   */
  slowmodeReport({ channel, seconds, duration, moderator, reason }) {
    const embed = createBaseEmbed(COLORS.BLACK);
    embed.setTitle(`${getEmoji('slowmode')} Channel Slowmode Configured`);

    const rateText = seconds === 0
      ? 'Disabled (0 seconds)'
      : `1 message every **${duration || `${seconds}s`}**`;

    const fields = [
      {
        name: 'Channel',
        value: `#${channel.name} (\`${channel.id}\`)`,
        inline: true
      },
      {
        name: 'Rate Limit',
        value: rateText,
        inline: true
      },
      {
        name: 'Moderator',
        value: `${moderator.tag || moderator.username} (\`${moderator.id}\`)`,
        inline: false
      },
      {
        name: 'Reason',
        value: reason || (seconds === 0 ? 'Slowmode removed' : `Rate limit adjusted to ${seconds}s`),
        inline: false
      }
    ];

    embed.addFields(fields);
    embed.setFooter({ text: `VOID Moderation System • Slowmode` });
    return embed;
  },

  /**
   * Embed for clearing user warnings.
   */
  clearWarningsReport({ target, clearedCount, moderator, remainingWarnings = 0 }) {
    const embed = createBaseEmbed(COLORS.BLACK);
    const targetTag = target?.tag || target?.username || String(target?.id || 'Unknown');

    embed.setTitle(`${getEmoji('warnings')} Warnings Cleared`);
    embed.setDescription(`Member warning archive updated for **${targetTag}**.`);

    embed.addFields([
      {
        name: 'Target',
        value: `${targetTag} (\`${target.id}\`)`,
        inline: true
      },
      {
        name: 'Removed Records',
        value: `**${clearedCount}** warning(s)`,
        inline: true
      },
      {
        name: 'Moderator',
        value: `${moderator.tag || moderator.username} (\`${moderator.id}\`)`,
        inline: false
      },
      {
        name: 'Active Balance',
        value: `**${remainingWarnings}** active warning(s) remaining`,
        inline: true
      }
    ]);

    embed.setFooter({ text: `VOID Moderation System • Warnings Cleared` });
    return embed;
  },

  /**
   * Embed for user warnings list with pagination support.
   */
  warningsList({ target, warnings, total, page = 1, totalPages = 1 }) {
    const embed = createBaseEmbed(COLORS.BLACK);
    const userTag = target?.tag || target?.username || target?.id || 'Unknown';
    embed.setTitle(`${getEmoji('warnings')} Warnings Archive: ${userTag}`);

    if (target?.displayAvatarURL) {
      embed.setThumbnail(target.displayAvatarURL({ dynamic: true }));
    }

    if (!warnings || warnings.length === 0) {
      embed.setDescription('Clean record. No recorded warnings on file.');
      return embed;
    }

    embed.setDescription(`Total warnings on file: **${total || warnings.length}** • Page ${page}/${totalPages}`);

    const fields = warnings.slice(0, 10).map((w, index) => {
      const date = w.created_at ? new Date(w.created_at).toLocaleDateString() : 'Unknown date';
      const caseLabel = w.case_number ? ` [Case #${w.case_number}]` : (w.case_id ? ` [Case #${w.case_id}]` : '');
      return {
        name: `#${index + 1}${caseLabel} • ${date}`,
        value: `**Reason:** ${w.reason || 'None'}\n**Mod:** \`${w.moderator_id}\``,
        inline: false
      };
    });

    embed.addFields(fields);
    embed.setFooter({ text: `VOID Security Record • User ID: ${target?.id || 'N/A'}` });
    return embed;
  },

  /**
   * Embed for single case inspection.
   */
  caseDetails(caseData) {
    const embed = createBaseEmbed(COLORS.BLACK);
    const actionEmoji = getActionEmoji(caseData.action);
    embed.setTitle(`${actionEmoji} Case #${caseData.case_number || caseData.id} • ${caseData.action.toUpperCase()}`);

    const date = caseData.created_at
      ? `<t:${Math.floor(new Date(caseData.created_at).getTime() / 1000)}:F>`
      : 'N/A';

    const fields = [
      {
        name: 'Target',
        value: `${caseData.target_tag || caseData.target_id} (\`${caseData.target_id}\`)`,
        inline: false
      },
      {
        name: 'Moderator',
        value: `${caseData.moderator_tag || caseData.moderator_id} (\`${caseData.moderator_id}\`)`,
        inline: true
      },
      {
        name: 'Timestamp',
        value: date,
        inline: true
      }
    ];

    if (caseData.duration) {
      fields.push({
        name: 'Duration',
        value: `\`${caseData.duration}\``,
        inline: true
      });
    }

    fields.push({
      name: 'Reason',
      value: caseData.reason || 'No reason specified',
      inline: false
    });

    embed.addFields(fields);
    embed.setFooter({ text: `VOID Case Archive • #${caseData.case_number || caseData.id}` });
    return embed;
  },

  /**
   * Embed for userinfo command with clean typography and zero-ping formats.
   */
  userInfo({ user, member = null, history = null }) {
    const embed = createBaseEmbed(COLORS.BLACK);
    const userTag = user?.tag || user?.username || String(user?.id || 'Unknown');

    embed.setTitle(`${getEmoji('userinfo')} User Profile: ${userTag}`);

    const avatarUrl = user?.displayAvatarURL
      ? user.displayAvatarURL({ dynamic: true, size: 256 })
      : null;

    if (avatarUrl) {
      embed.setThumbnail(avatarUrl);
      embed.setAuthor({ name: userTag, iconURL: avatarUrl });
    } else {
      embed.setAuthor({ name: userTag });
    }

    // Identity field
    const createdSec = user?.createdTimestamp ? Math.floor(user.createdTimestamp / 1000) : null;
    const identityValue = [
      `**Username:** \`${user.tag || user.username}\` • **ID:** \`${user.id}\``,
      `**Account:** ${user.bot ? 'Bot Application' : 'Standard User'}`,
      createdSec ? `**Created:** <t:${createdSec}:F> (<t:${createdSec}:R>)` : null
    ].filter(Boolean).join('\n');

    const fields = [
      { name: 'Target Identity', value: identityValue, inline: false }
    ];

    // Member presence field
    if (member) {
      const joinedSec = member.joinedTimestamp ? Math.floor(member.joinedTimestamp / 1000) : null;
      let rolesDisplay = 'None';
      if (member.roles?.cache) {
        const roles = safeFilter(member.roles.cache, r => r.id !== member.guild?.id)
          .map(r => `@${r.name}`)
          .slice(0, 8);
        if (roles.length > 0) rolesDisplay = roles.join(', ');
      }

      const presenceValue = [
        `**Nickname:** ${member.nickname ? `\`${member.nickname}\`` : 'None'}`,
        joinedSec ? `**Joined:** <t:${joinedSec}:F> (<t:${joinedSec}:R>)` : null,
        `**Highest Role:** ${member.roles.highest ? `@${member.roles.highest.name}` : 'None'}`,
        `**Roles (${Math.max(0, safeCount(member.roles.cache) - 1)}):** ${rolesDisplay}`
      ].filter(Boolean).join('\n');

      fields.push({ name: 'Guild Membership', value: presenceValue, inline: false });
    }

    // Moderation history field
    if (history) {
      const historyValue = [
        `**Total Cases:** \`${history.caseCount ?? 0}\`  •  `,
        `**Active Warnings:** \`${history.warningCount ?? 0}\`  •  `,
        `**Staff Notes:** \`${history.noteCount ?? 0}\``
      ].join('');
      fields.push({ name: 'Moderation Record', value: historyValue, inline: false });
    }

    embed.addFields(fields);
    embed.setFooter({ text: `VOID System • ID: ${user.id}` });
    return embed;
  },

  /**
   * Embed for serverinfo command with full server statistics.
   */
  serverInfo({ guild, owner = null }) {
    const embed = createBaseEmbed(COLORS.BLACK);
    embed.setTitle(`${getEmoji('server')} ${guild.name}`);

    if (guild.iconURL) {
      const icon = guild.iconURL({ dynamic: true, size: 256 });
      if (icon) embed.setThumbnail(icon);
    }

    if (guild.description) {
      embed.setDescription(guild.description);
    }

    const createdSec = Math.floor(guild.createdTimestamp / 1000);
    const ownerDisplay = owner ? `${owner.user.tag} (\`${owner.id}\`)` : `ID: \`${guild.ownerId}\``;

    // Calculate members breakdown
    const totalMembers = guild.memberCount || safeCount(guild.members?.cache) || 0;
    const botCount = safeCount(guild.members?.cache, m => m.user?.bot);
    const humanCount = Math.max(0, totalMembers - botCount);

    // Channel breakdown
    const totalChannels = safeCount(guild.channels?.cache);
    const textCount = safeCount(guild.channels?.cache, c => (typeof c.isTextBased === 'function' ? c.isTextBased() : c.type === 0) && (typeof c.isVoiceBased === 'function' ? !c.isVoiceBased() : true));
    const voiceCount = safeCount(guild.channels?.cache, c => typeof c.isVoiceBased === 'function' ? c.isVoiceBased() : c.type === 2);
    const categoryCount = safeCount(guild.channels?.cache, c => c.type === 4);

    // Verification mapping
    const verifLevels = {
      0: 'None',
      1: 'Low (Verified Email)',
      2: 'Medium (Registered >5m)',
      3: 'High (Member >10m)',
      4: 'Highest (Verified Phone)'
    };
    const verification = verifLevels[guild.verificationLevel] || `Level ${guild.verificationLevel}`;

    embed.addFields([
      {
        name: 'Server Overview',
        value: [
          `**Name:** ${guild.name}`,
          `**Server ID:** \`${guild.id}\``,
          `**Owner:** ${ownerDisplay}`,
          `**Created:** <t:${createdSec}:F> (<t:${createdSec}:R>)`
        ].join('\n'),
        inline: false
      },
      {
        name: 'Population',
        value: [
          `**Total Members:** \`${totalMembers.toLocaleString()}\``,
          `**Humans:** \`${humanCount.toLocaleString()}\` • **Bots:** \`${botCount.toLocaleString()}\``
        ].join('\n'),
        inline: true
      },
      {
        name: `Channels (${totalChannels})`,
        value: [
          `**Text Channels:** \`${textCount}\``,
          `**Voice Channels:** \`${voiceCount}\``,
          `**Categories:** \`${categoryCount}\``
        ].join('\n'),
        inline: true
      },
      {
        name: 'Security & Verification',
        value: [
          `**Verification:** \`${verification}\``,
          `**Content Filter:** \`${guild.explicitContentFilter}\``,
          `**2FA Required:** \`${guild.mfaLevel === 1 ? 'Yes' : 'No'}\``
        ].join('\n'),
        inline: false
      },
      {
        name: 'Boost & Assets',
        value: [
          `**Boost Tier:** Tier ${guild.premiumTier} (\`${guild.premiumSubscriptionCount || 0}\` Boosts)`,
          `**Roles:** \`${safeCount(guild.roles?.cache)}\` • **Emojis:** \`${safeCount(guild.emojis?.cache)}\` • **Stickers:** \`${safeCount(guild.stickers?.cache)}\``
        ].join('\n'),
        inline: false
      }
    ]);

    embed.setFooter({ text: `VOID System • Server ID: ${guild.id}` });
    return embed;
  },

  /**
   * Embed for botinfo command.
   */
  botInfo({ uptime, guildsCount, usersCount, nodeVersion, djsVersion, memory = null, ping = null, commandCount = 28 }) {
    const embed = createBaseEmbed(COLORS.BLACK);
    embed.setTitle(`${getEmoji('bot')} VOID — System Overview`);
    embed.setDescription('High-performance, secure Discord moderation platform.');

    embed.addFields([
      {
        name: 'Platform & Architecture',
        value: [
          `**VOID Engine:** \`v2.0.0\` • **Palette:** \`Pure Black (#000000)\``,
          `**discord.js:** \`v${djsVersion}\` • **Node.js:** \`${nodeVersion}\``,
          `**Database:** PostgreSQL Connection Pool`
        ].join('\n'),
        inline: false
      },
      {
        name: 'Runtime Metrics',
        value: [
          `**Process Uptime:** ${uptime}`,
          `**WebSocket Ping:** \`${ping !== null ? ping : 0}ms\``,
          `**RAM Usage:** \`${memory?.rss || 'Normal'}\``
        ].join('\n'),
        inline: true
      },
      {
        name: 'Infrastructure',
        value: [
          `**Guilds Served:** \`${guildsCount}\``,
          `**Cached Users:** \`${usersCount.toLocaleString()}\``,
          `**Active Commands:** \`${commandCount}\` (Slash & Prefix)`
        ].join('\n'),
        inline: true
      }
    ]);

    embed.setFooter({ text: `VOID Security Platform` });
    return embed;
  },

  /**
   * Embed for configuration view or updates.
   */
  config({ prefix, logChannelId, eventLogChannelId, guildName, updatedField, updatedValue }) {
    const embed = createBaseEmbed(COLORS.BLACK);
    embed.setTitle(`${getEmoji('config')} Server Configuration`);

    if (updatedField) {
      embed.setDescription(`${getEmoji('success')} Updated **${updatedField}** to \`${updatedValue}\`.`);
    } else {
      embed.setDescription(`Active settings for **${guildName || 'Server'}**.`);
    }

    const logDisplay = logChannelId ? `#channel (\`${logChannelId}\`)` : 'Not configured';
    const eventDisplay = eventLogChannelId ? `#channel (\`${eventLogChannelId}\`)` : 'Not configured';

    embed.addFields([
      { name: 'Active Prefix', value: `\`${prefix}\``, inline: true },
      { name: 'Mod Log Channel', value: logDisplay, inline: true },
      { name: 'Event Log Channel', value: eventDisplay, inline: true }
    ]);

    embed.setFooter({ text: `VOID System Configuration` });
    return embed;
  },

  /**
   * Embed for setup guide.
   */
  setup({ prefix, logChannelId, eventLogChannelId, message }) {
    const embed = createBaseEmbed(COLORS.BLACK);
    embed.setTitle(`${getEmoji('setup')} Setup & System Architecture`);
    embed.setDescription(message || 'Configure your moderation settings below.');

    embed.addFields([
      {
        name: 'Prefix Command Configuration',
        value: `Current: \`${prefix}\`\nChange: \`${prefix}prefix set <new>\` or \`/prefix set\``,
        inline: false
      },
      {
        name: 'Mod Log Channel',
        value: logChannelId ? `\`${logChannelId}\`` : `Set with: \`${prefix}setup logchannel #channel\` or \`/setup logchannel\``,
        inline: false
      },
      {
        name: 'Event Audit Channel',
        value: eventLogChannelId ? `\`${eventLogChannelId}\`` : `Set with: \`${prefix}config logchannel #channel\``,
        inline: false
      }
    ]);

    embed.setFooter({ text: `VOID System Setup Guide` });
    return embed;
  },

  /**
   * Embed for help menu with categorized sections and disciplined emoji headers.
   */
  help({ prefix, categories }) {
    const embed = createBaseEmbed(COLORS.BLACK);
    embed.setTitle(`${getEmoji('shield')} VOID Moderation Suite`);
    embed.setDescription(
      `Fast, reliable, extensible moderation platform.\n` +
      `**Active Prefix:** \`${prefix}\` • **Slash Commands:** Fully supported for all operations.`
    );

    const categoryIcons = {
      moderation: getEmoji('shield'),
      configuration: getEmoji('config'),
      utility: getEmoji('server')
    };

    for (const [catName, cmds] of Object.entries(categories)) {
      const catIcon = categoryIcons[catName.toLowerCase()] || getEmoji('command');
      const formatted = cmds.map(c => `\`${prefix}${c.name}\` / \`/${c.name}\` — ${c.description}`).join('\n');
      embed.addFields({
        name: `${catIcon} ${catName.toUpperCase()} (${cmds.length})`,
        value: formatted || 'No commands available',
        inline: false
      });
    }

    embed.setFooter({ text: `VOID Moderation Suite` });
    return embed;
  },

  /**
   * Embed for staff notes list.
   */
  notesList({ target, notes, total, page = 1, totalPages = 1 }) {
    const embed = createBaseEmbed(COLORS.BLACK);
    const userTag = target?.tag || target?.username || target?.id || 'Unknown';
    embed.setTitle(`${getEmoji('note')} Staff Notes: ${userTag}`);

    if (target?.displayAvatarURL) {
      embed.setThumbnail(target.displayAvatarURL({ dynamic: true }));
    }

    if (!notes || notes.length === 0) {
      embed.setDescription('No internal staff notes recorded for this user.');
      return embed;
    }

    embed.setDescription(`Total notes on file: **${total}** • Page ${page}/${totalPages}`);

    const fields = notes.map((n) => {
      const date = n.created_at ? new Date(n.created_at).toLocaleDateString() : 'N/A';
      return {
        name: `Note #${n.id} • ${date}`,
        value: `**Note:** ${n.note}\n**Staff ID:** \`${n.moderator_id}\``,
        inline: false
      };
    });

    embed.addFields(fields);
    embed.setFooter({ text: `VOID Internal Staff Record • User ID: ${target?.id || 'N/A'}` });
    return embed;
  },

  /**
   * Embed for full moderation history (cases archive).
   */
  modHistory({ target, cases, total, page = 1, totalPages = 1 }) {
    const embed = createBaseEmbed(COLORS.BLACK);
    const userTag = target?.tag || target?.username || target?.id || 'Unknown';
    embed.setTitle(`${getEmoji('logs')} Moderation History: ${userTag}`);

    if (target?.displayAvatarURL) {
      embed.setThumbnail(target.displayAvatarURL({ dynamic: true }));
    }

    if (!cases || cases.length === 0) {
      embed.setDescription('Clean record. No moderation cases found in database.');
      return embed;
    }

    embed.setDescription(`Total cases on file: **${total}** • Page ${page}/${totalPages}`);

    const fields = cases.map((c) => {
      const date = c.created_at ? new Date(c.created_at).toLocaleDateString() : 'N/A';
      const dur = c.duration ? ` (${c.duration})` : '';
      return {
        name: `Case #${c.case_number} • ${c.action}${dur} • ${date}`,
        value: `**Reason:** ${c.reason || 'None specified'}\n**Mod ID:** \`${c.moderator_id}\``,
        inline: false
      };
    });

    embed.addFields(fields);
    embed.setFooter({ text: `VOID Case Archive • User ID: ${target?.id || 'N/A'}` });
    return embed;
  },

  /**
   * Embed for AutoMod configuration overview.
   */
  automodOverview({ config, guildName }) {
    const embed = createBaseEmbed(COLORS.BLACK);
    embed.setTitle(`${getEmoji('automod')} AutoMod Configuration`);
    embed.setDescription(`Automated moderation rules and filters for **${guildName}**.`);

    const status = config.enabled ? '`ENABLED`' : '`DISABLED`';
    const wordsCount = config.blocked_words ? config.blocked_words.length : 0;

    embed.addFields([
      { name: 'Engine Status', value: status, inline: true },
      { name: 'Spam Rate Limit', value: config.spam_enabled ? `${config.spam_max_messages} msgs / ${config.spam_interval_sec}s` : 'Disabled', inline: true },
      { name: 'Mention Limit', value: config.mention_limit > 0 ? `Max ${config.mention_limit} mentions` : 'Disabled', inline: true },
      { name: 'Discord Invites', value: config.invites_blocked ? 'Blocked' : 'Allowed', inline: true },
      { name: 'External Links', value: config.links_blocked ? 'Blocked' : 'Allowed', inline: true },
      { name: 'Blocked Words', value: `${wordsCount} phrase(s) configured`, inline: true }
    ]);

    embed.setFooter({ text: `VOID AutoMod System` });
    return embed;
  },

  /**
   * Embed for Anti-Raid configuration overview.
   */
  antiraidOverview({ config, guildName }) {
    const embed = createBaseEmbed(COLORS.BLACK);
    embed.setTitle(`${getEmoji('raid')} Anti-Raid Protection System`);
    embed.setDescription(`Join-spike safeguards and automated perimeter defenses for **${guildName}**.`);

    const status = config.enabled ? '`ACTIVE`' : '`DISABLED`';
    const lockdown = config.is_locked_down ? '`LOCKED DOWN`' : 'Normal State';

    embed.addFields([
      { name: 'Protection Status', value: status, inline: true },
      { name: 'Threshold Window', value: `${config.join_threshold} joins in ${config.interval_sec}s`, inline: true },
      { name: 'Enforcement Action', value: `\`${config.action}\``, inline: true },
      { name: 'Perimeter State', value: lockdown, inline: false }
    ]);

    embed.setFooter({ text: `VOID Anti-Raid Defense` });
    return embed;
  },

  /**
   * Embed for avatar command.
   */
  avatar({ user }) {
    const embed = createBaseEmbed(COLORS.BLACK);
    const userTag = user.tag || user.username;
    embed.setTitle(`${getEmoji('userinfo')} Avatar: ${userTag}`);
    const url = user.displayAvatarURL({ size: 1024, dynamic: true });
    embed.setImage(url);
    embed.setDescription(`[Open Original Image Link](${url})`);
    embed.setFooter({ text: `VOID System • User ID: ${user.id}` });
    return embed;
  },

  /**
   * Embed for no-prefix system status and diagnostic.
   */
  noPrefixStatus({ isEnabled, isUserAuthorized, allowedCount, userId, prefix, isTest = false }) {
    const embed = createBaseEmbed(COLORS.BLACK);

    if (isTest) {
      embed.setTitle(`${getEmoji('settings')} No-Prefix Access Diagnostic`);
      embed.setDescription(`Diagnostic assessment for user ID \`${userId}\`.`);
    } else {
      embed.setTitle(`${getEmoji('settings')} No-Prefix Access System`);
      embed.setDescription('Configure prefix-free command access for authorized Discord accounts.');
    }

    const stateDisplay = isEnabled ? '`ENABLED`' : '`DISABLED`';

    const authDisplay = isUserAuthorized
      ? '**AUTHORIZED** (Prefix-free commands active)'
      : '**NOT AUTHORIZED** (Prefix required)';

    const countText = allowedCount > 0
      ? `\`${allowedCount}\` authorized user ID(s) configured`
      : 'None configured (Access inactive for all users)';

    const fields = [
      {
        name: 'System Status',
        value: `**State:** ${stateDisplay}\n**Allowlist Size:** ${countText}`,
        inline: false
      },
      {
        name: 'Invoker Authorization',
        value: `**Caller ID:** \`${userId}\`\n**Access Level:** ${authDisplay}`,
        inline: false
      }
    ];

    if (isTest) {
      let diagDetails = '';
      if (!isEnabled) {
        diagDetails = 'The no-prefix system is currently disabled globally. Set `NO_PREFIX_ENABLED=true` in `.env` to activate.';
      } else if (isUserAuthorized) {
        diagDetails = 'You can invoke commands directly without a prefix (e.g. `help`, `serverinfo`, `warnings @user`).\n*Note: Normal Discord permissions and role hierarchy checks are still strictly enforced.*';
      } else {
        diagDetails = `You are not on the allowlist. Prefix \`${prefix}\` is required.\nTo grant access, add your Discord user ID (\`${userId}\`) to \`NO_PREFIX_USERS\` in \`.env\` and restart VOID.`;
      }

      fields.push({
        name: 'Diagnostic Result',
        value: diagDetails,
        inline: false
      });
    } else {
      fields.push({
        name: 'Configuration Guide',
        value: [
          'Add your Discord user ID to `.env` on the host machine:',
          '```env',
          'NO_PREFIX_USERS=YOUR_DISCORD_USER_ID',
          'NO_PREFIX_ENABLED=true',
          '```',
          '• Multiple IDs can be separated by commas.',
          '• After saving `.env`, restart the bot process (`npm start`).',
          '• For security, the global allowlist cannot be edited via Discord commands.'
        ].join('\n'),
        inline: false
      });
    }

    embed.addFields(fields);
    embed.setFooter({ text: 'VOID Security System • No-Prefix Controller' });
    return embed;
  },

  /**
   * Generic success embed.
   */
  success(message) {
    const embed = createBaseEmbed(COLORS.BLACK);
    embed.setDescription(`${getEmoji('success')} ${message}`);
    return embed;
  },

  /**
   * Error notification embed.
   */
  error(message) {
    const embed = createBaseEmbed(COLORS.BLACK);
    embed.setDescription(`${getEmoji('error')} ${message}`);
    return embed;
  },

  /**
   * Permission denied embed.
   */
  permissionError(message) {
    const embed = createBaseEmbed(COLORS.BLACK);
    embed.setDescription(`${getEmoji('error')} **Permission Denied:** ${message}`);
    return embed;
  },

  /**
   * Validation error embed.
   */
  validationError(message, usage = null) {
    const embed = createBaseEmbed(COLORS.BLACK);
    const desc = `${getEmoji('warning')} **Validation Error:** ${message}${usage ? `\n\n**Usage:** \`${usage}\`` : ''}`;
    embed.setDescription(desc);
    return embed;
  }
};

module.exports = { voidEmbeds, createBaseEmbed };
