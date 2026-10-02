/**
 * VOID Moderation Case Service
 * Manages guild-isolated moderation case records in PostgreSQL.
 */

const { query, transaction } = require('../database/pool');
const { logger } = require('../utils/logger');

class CaseService {
  /**
   * Create a new moderation case record.
   * Atomically computes the next sequential case number for the specific guild.
   * @param {object} params
   * @param {string} params.guildId
   * @param {string} params.targetId
   * @param {string} [params.targetTag]
   * @param {string} params.moderatorId
   * @param {string} [params.moderatorTag]
   * @param {string} params.action
   * @param {string} [params.reason]
   * @param {string} [params.duration]
   * @returns {Promise<{ id: number, case_number: number }|null>}
   */
  async createCase({ guildId, targetId, targetTag, moderatorId, moderatorTag, action, reason, duration }) {
    if (!guildId || !targetId || !moderatorId || !action) {
      throw new Error('Missing required arguments for case creation');
    }

    try {
      return await transaction(async (client) => {
        // Query next case number for this specific guild
        const numRes = await client.query(
          'SELECT COALESCE(MAX(case_number), 0) + 1 AS next_case FROM moderation_cases WHERE guild_id = $1',
          [guildId]
        );
        const nextCaseNumber = parseInt(numRes.rows[0].next_case, 10);

        const insertRes = await client.query(
          `INSERT INTO moderation_cases
           (guild_id, case_number, target_id, target_tag, moderator_id, moderator_tag, action, reason, duration, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
           RETURNING id, case_number, guild_id, action, created_at`,
          [
            guildId,
            nextCaseNumber,
            targetId,
            targetTag || 'Unknown',
            moderatorId,
            moderatorTag || 'Unknown',
            action.toUpperCase(),
            reason || null,
            duration || null
          ]
        );

        return insertRes.rows[0];
      });
    } catch (err) {
      logger.error(`Failed to record moderation case for guild ${guildId}`, err);
      return null;
    }
  }

  /**
   * Fetch a case by guild ID and case number.
   * @param {string} guildId
   * @param {number} caseNumber
   * @returns {Promise<object|null>}
   */
  async getCase(guildId, caseNumber) {
    if (!guildId || !caseNumber) return null;

    try {
      const res = await query(
        'SELECT * FROM moderation_cases WHERE guild_id = $1 AND case_number = $2',
        [guildId, parseInt(caseNumber, 10)]
      );
      return res.rows[0] || null;
    } catch (err) {
      logger.error(`Failed to fetch case #${caseNumber} for guild ${guildId}`, err);
      return null;
    }
  }

  /**
   * Fetch cases for a specific user in a guild.
   * @param {string} guildId
   * @param {string} targetId
   * @param {number} [limit=10]
   * @returns {Promise<object[]>}
   */
  async getUserCases(guildId, targetId, limit = 10) {
    if (!guildId || !targetId) return [];

    try {
      const res = await query(
        'SELECT * FROM moderation_cases WHERE guild_id = $1 AND target_id = $2 ORDER BY case_number DESC LIMIT $3',
        [guildId, targetId, limit]
      );
      return res.rows;
    } catch (err) {
      logger.error(`Failed to fetch cases for user ${targetId} in guild ${guildId}`, err);
      return [];
    }
  }
}

const caseService = new CaseService();

module.exports = { caseService };
