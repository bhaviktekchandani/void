/**
 * VOID Moderation Service
 * Coordinates case generation, warning persistence, and mod-log dispatching.
 */

const { caseService } = require('./caseService');
const { configService } = require('./configService');
const { voidEmbeds } = require('../embeds/builder');
const { logger } = require('../utils/logger');

class ModerationService {
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
   * @returns {Promise<{ caseNumber: number|null, caseRecord: object|null }>}
   */
  async recordAction({ guild, target, moderator, action, reason, duration, channelName }) {
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
        channelName
      });
    } catch (logErr) {
      logger.warn(`Failed to dispatch mod log embed in guild ${guild.id}: ${logErr.message}`);
    }

    return { caseNumber, caseRecord };
  }

  /**
   * Send embed to the configured moderation log channel if available.
   */
  async sendLogMessage({ guild, target, moderator, action, reason, duration, caseNumber, channelName }) {
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
        channelName
      });

      await channel.send({ embeds: [embed] });
    } catch (err) {
      logger.debug(`Could not send log to channel ${config.log_channel_id} in guild ${guild.id}: ${err.message}`);
    }
  }
}

const moderationService = new ModerationService();

module.exports = { moderationService };
