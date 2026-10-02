/**
 * VOID Moderation Service
 * Coordinates case generation, warning persistence, DM dispatching, and mod-log dispatching.
 */

const { caseService } = require('./caseService');
const { warningService } = require('./warningService');
const { notesService } = require('./notesService');
const { configService } = require('./configService');
const { voidEmbeds, createBaseEmbed } = require('../embeds/builder');
const { COLORS } = require('../embeds/colors');
const { getEmoji } = require('../embeds/emojiRegistry');
const { logger } = require('../utils/logger');

class ModerationService {
  /**
   * Safely attempt to dispatch a direct message notification to target user.
   * @param {object} params
   * @param {import('discord.js').User} params.target
   * @param {string} params.action
   * @param {import('discord.js').Guild} params.guild
   * @param {string} [params.reason]
   * @param {string} [params.duration]
   * @returns {Promise<{ delivered: boolean, reason?: string }>}
   */
  async notifyTargetDM({ target, action, guild, reason, duration }) {
    if (!target || target.bot) {
      return { delivered: false, reason: target?.bot ? 'Target is a bot account' : 'Invalid target' };
    }

    try {
      const dmEmbed = createBaseEmbed(COLORS.BLACK)
        .setTitle(`${getEmoji(action.toLowerCase())} Moderation Notice: ${action.toUpperCase()}`)
        .setDescription(`You have received a moderation action in **${guild?.name || 'Server'}**.`)
        .addFields([
          { name: 'Action', value: `\`${action.toUpperCase()}\``, inline: true },
          { name: 'Server', value: guild?.name || 'Unknown', inline: true },
          ...(duration ? [{ name: 'Duration', value: duration, inline: true }] : []),
          { name: 'Reason', value: reason || 'No reason specified', inline: false }
        ])
        .setFooter({ text: `VOID Security Notification • ${guild?.name || 'Server'}` });

      const dmChannel = await target.createDM();
      await dmChannel.send({ embeds: [dmEmbed], allowedMentions: { parse: [] } });
      return { delivered: true };
    } catch (err) {
      return { delivered: false, reason: 'Direct messages disabled or blocked' };
    }
  }

  /**
   * Fetch aggregate moderation counts for a target member.
   * @param {string} guildId
   * @param {string} targetId
   * @returns {Promise<{ caseCount: number, warningCount: number, noteCount: number }>}
   */
  async getTargetStats(guildId, targetId) {
    if (!guildId || !targetId) {
      return { caseCount: 0, warningCount: 0, noteCount: 0 };
    }
    const [caseCount, warningCount, noteCount] = await Promise.all([
      caseService.countUserCases(guildId, targetId).catch(() => 0),
      warningService.countWarnings(guildId, targetId).catch(() => 0),
      notesService.countNotes(guildId, targetId).catch(() => 0)
    ]);
    return {
      caseCount: caseCount || 0,
      warningCount: warningCount || 0,
      noteCount: noteCount || 0
    };
  }

  /**
   * Log and record a completed moderation action.
   * @param {object} params
   * @param {import('discord.js').Guild} params.guild
   * @param {import('discord.js').User|object} params.target
   * @param {import('discord.js').User|object} params.moderator
   * @param {string} params.action BAN, KICK, TIMEOUT, UNTIMEOUT, WARN, PURGE, LOCK, UNLOCK, SLOWMODE
   * @param {string} [params.reason]
   * @param {string} [params.duration]
   * @param {string} [params.channelName]
   * @param {{ delivered: boolean, reason?: string }} [params.dmStatus]
   * @returns {Promise<{ caseNumber: number|null, caseRecord: object|null }>}
   */
  async recordAction({ guild, target, moderator, action, reason, duration, channelName, dmStatus = null }) {
    let caseRecord = null;
    let caseNumber = null;

    try {
      caseRecord = await caseService.createCase({
        guildId: guild.id,
        targetId: target.id,
        targetTag: target.tag || target.username || target.id,
        moderatorId: moderator.id,
        moderatorTag: moderator.tag || moderator.username || moderator.id,
        action,
        reason,
        duration
      });

      if (caseRecord) {
        caseNumber = caseRecord.case_number;
      }
    } catch (err) {
      logger.error(`Database record error during moderation action for guild ${guild.id}`, err);
    }

    // Attempt to send log to the configured mod-log channel
    try {
      await this.sendLogMessage({
        guild,
        target,
        moderator,
        action,
        reason,
        duration,
        caseNumber,
        channelName,
        dmStatus
      });
    } catch (logErr) {
      logger.warn(`Failed to dispatch mod log embed in guild ${guild.id}: ${logErr.message}`);
    }

    return { caseNumber, caseRecord };
  }

  /**
   * Send embed to the configured moderation log channel if available.
   */
  async sendLogMessage({ guild, target, moderator, action, reason, duration, caseNumber, channelName, dmStatus = null }) {
    const config = await configService.getConfig(guild.id);
    if (!config || !config.log_channel_id) return;

    try {
      const channel = await guild.channels.fetch(config.log_channel_id).catch(() => null);
      if (!channel || !channel.isTextBased()) return;

      const embed = voidEmbeds.moderationLog({
        action,
        target,
        moderator,
        reason,
        duration,
        caseNumber,
        channelName,
        dmStatus
      });

      await channel.send({ embeds: [embed], allowedMentions: { parse: [] } });
    } catch (err) {
      logger.debug(`Could not send log to channel ${config.log_channel_id} in guild ${guild.id}: ${err.message}`);
    }
  }
}

const moderationService = new ModerationService();

module.exports = { moderationService };
