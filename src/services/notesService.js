/**
 * VOID Moderator Notes Service
 * Private, staff-only notes stored per user per guild.
 */

const { query } = require('../database/pool');
const { logger } = require('../utils/logger');

class NotesService {
  /**
   * Add a note for a user.
   * @param {object} params
   * @param {string} params.guildId
   * @param {string} params.targetId
   * @param {string} params.moderatorId
   * @param {string} params.note
   * @returns {Promise<object|null>}
   */
  async addNote({ guildId, targetId, moderatorId, note }) {
    if (!guildId || !targetId || !moderatorId || !note) {
      throw new Error('Missing required arguments for note creation');
    }

    try {
      const res = await query(
        `INSERT INTO moderator_notes (guild_id, target_id, moderator_id, note, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         RETURNING id, guild_id, target_id, moderator_id, note, created_at`,
        [guildId, targetId, moderatorId, note]
      );
      return res.rows[0];
    } catch (err) {
      logger.error(`Failed to add note for user ${targetId} in guild ${guildId}`, err);
      return null;
    }
  }

  /**
   * Get notes for a user with pagination.
   * @param {string} guildId
   * @param {string} targetId
   * @param {number} [limit=10]
   * @param {number} [offset=0]
   * @returns {Promise<object[]>}
   */
  async getNotes(guildId, targetId, limit = 10, offset = 0) {
    if (!guildId || !targetId) return [];

    try {
      const res = await query(
        `SELECT id, guild_id, target_id, moderator_id, note, created_at
         FROM moderator_notes
         WHERE guild_id = $1 AND target_id = $2
         ORDER BY created_at DESC
         LIMIT $3 OFFSET $4`,
        [guildId, targetId, limit, offset]
      );
      return res.rows;
    } catch (err) {
      logger.error(`Failed to fetch notes for user ${targetId} in guild ${guildId}`, err);
      return [];
    }
  }

  /**
   * Count notes for a user in a guild.
   * @param {string} guildId
   * @param {string} targetId
   * @returns {Promise<number>}
   */
  async countNotes(guildId, targetId) {
    if (!guildId || !targetId) return 0;

    try {
      const res = await query(
        'SELECT COUNT(*) AS count FROM moderator_notes WHERE guild_id = $1 AND target_id = $2',
        [guildId, targetId]
      );
      return parseInt(res.rows[0].count, 10) || 0;
    } catch (err) {
      logger.error(`Failed to count notes for user ${targetId} in guild ${guildId}`, err);
      return 0;
    }
  }

  /**
   * Delete a note by its ID in a guild.
   * @param {string} guildId
   * @param {number} noteId
   * @returns {Promise<boolean>}
   */
  async deleteNote(guildId, noteId) {
    if (!guildId || !noteId) return false;

    try {
      const res = await query(
        'DELETE FROM moderator_notes WHERE guild_id = $1 AND id = $2 RETURNING id',
        [guildId, parseInt(noteId, 10)]
      );
      return res.rowCount > 0;
    } catch (err) {
      logger.error(`Failed to delete note #${noteId} in guild ${guildId}`, err);
      return false;
    }
  }
}

const notesService = new NotesService();

module.exports = { notesService };
