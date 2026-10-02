/**
 * VOID Warning Service
 * Tracks, retrieves, and clears member warnings per guild.
 */

const { query } = require('../database/pool');
const { logger } = require('../utils/logger');

class WarningService {
  /**
   * Add a warning for a user in a guild.
   * @param {object} params
   * @param {string} params.guildId
   * @param {string} params.targetId
   * @param {string} params.moderatorId
   * @param {string} params.reason
   * @param {number|null} [params.caseId]
   * @returns {Promise<object|null>}
   */
  async addWarning({ guildId, targetId, moderatorId, reason, caseId = null }) {
    if (!guildId || !targetId || !moderatorId || !reason) {
      throw new Error('Missing required arguments for warning creation');
    }

    try {
      const res = await query(
        `INSERT INTO warnings (guild_id, target_id, moderator_id, reason, case_id, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING id, guild_id, target_id, moderator_id, reason, case_id, created_at`,
        [guildId, targetId, moderatorId, reason, caseId]
      );
      return res.rows[0];
    } catch (err) {
      logger.error(`Failed to add warning for user ${targetId} in guild ${guildId}`, err);
      return null;
    }
  }

  /**
   * Get warnings for a target user in a guild with pagination support.
   * @param {string} guildId
   * @param {string} targetId
   * @param {number} [limit=10]
   * @param {number} [offset=0]
   * @returns {Promise<object[]>}
   */
  async getWarnings(guildId, targetId, limit = 10, offset = 0) {
    if (!guildId || !targetId) return [];

    try {
      const res = await query(
        `SELECT w.id, w.guild_id, w.target_id, w.moderator_id, w.reason, w.case_id, w.created_at,
                c.case_number
         FROM warnings w
         LEFT JOIN moderation_cases c ON w.case_id = c.id
         WHERE w.guild_id = $1 AND w.target_id = $2
         ORDER BY w.created_at DESC
         LIMIT $3 OFFSET $4`,
        [guildId, targetId, limit, offset]
      );
      return res.rows;
    } catch (err) {
      logger.error(`Failed to fetch warnings for user ${targetId} in guild ${guildId}`, err);
      return [];
    }
  }

  /**
   * Count warnings for a user in a guild.
   * @param {string} guildId
   * @param {string} targetId
   * @returns {Promise<number>}
   */
  async countWarnings(guildId, targetId) {
    if (!guildId || !targetId) return 0;

    try {
      const res = await query(
        'SELECT COUNT(*) AS count FROM warnings WHERE guild_id = $1 AND target_id = $2',
        [guildId, targetId]
      );
      return parseInt(res.rows[0].count, 10) || 0;
    } catch (err) {
      logger.error(`Failed to count warnings for user ${targetId} in guild ${guildId}`, err);
      return 0;
    }
  }

  /**
   * Clear all warnings for a user in a guild.
   * @param {string} guildId
   * @param {string} targetId
   * @returns {Promise<number>} Number of deleted warnings
   */
  async clearWarnings(guildId, targetId) {
    if (!guildId || !targetId) return 0;

    try {
      const res = await query(
        'DELETE FROM warnings WHERE guild_id = $1 AND target_id = $2 RETURNING id',
        [guildId, targetId]
      );
      return res.rowCount || 0;
    } catch (err) {
      logger.error(`Failed to clear warnings for user ${targetId} in guild ${guildId}`, err);
      return 0;
    }
  }
}

const warningService = new WarningService();

module.exports = { warningService };
