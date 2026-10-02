/**
 * VOID Channel Lock State Service
 * Tracks and restores original channel permission overwrites upon unlocking.
 */

const { PermissionFlagsBits } = require('discord.js');
const { query } = require('../database/pool');
const { logger } = require('../utils/logger');

class LockService {
  constructor() {
    /** @type {Map<string, { previousState: 'allow'|'deny'|'unset', lockedBy: string, reason: string }>} */
    this.memoryCache = new Map();
  }

  /**
   * Lock a channel while safely recording its previous overwrite state.
   * @param {object} params
   * @param {import('discord.js').GuildChannel} params.channel
   * @param {import('discord.js').Guild} params.guild
   * @param {string} params.moderatorId
   * @param {string} [params.reason]
   * @returns {Promise<{ success: boolean, previousState: string }>}
   */
  async lockChannel({ channel, guild, moderatorId, reason = 'No reason specified' }) {
    const everyoneRole = guild.roles.everyone;
    const existingOverwrite = channel.permissionOverwrites.cache.get(everyoneRole.id);

    let previousState = 'unset';
    if (existingOverwrite) {
      if (existingOverwrite.allow.has(PermissionFlagsBits.SendMessages)) {
        previousState = 'allow';
      } else if (existingOverwrite.deny.has(PermissionFlagsBits.SendMessages)) {
        previousState = 'deny';
      }
    }

    // Save state to DB and memory cache
    try {
      await query(
        `INSERT INTO channel_locks (channel_id, guild_id, locked_at, locked_by, previous_deny, reason)
         VALUES ($1, $2, NOW(), $3, $4, $5)
         ON CONFLICT (channel_id)
         DO UPDATE SET locked_at = NOW(), locked_by = $3, previous_deny = $4, reason = $5`,
        [channel.id, guild.id, moderatorId, previousState, reason]
      );
    } catch (err) {
      logger.debug(`Could not persist channel lock state in DB for ${channel.id}: ${err.message}`);
    }

    this.memoryCache.set(channel.id, { previousState, lockedBy: moderatorId, reason });

    // Apply the lock
    await channel.permissionOverwrites.edit(everyoneRole, {
      SendMessages: false
    }, { reason: `${reason} | Locked by ${moderatorId}` });

    return { success: true, previousState };
  }

  /**
   * Unlock a channel and restore its exact pre-lock overwrite state.
   * @param {object} params
   * @param {import('discord.js').GuildChannel} params.channel
   * @param {import('discord.js').Guild} params.guild
   * @param {string} params.moderatorId
   * @param {string} [params.reason]
   * @returns {Promise<{ success: boolean, restoredState: string }>}
   */
  async unlockChannel({ channel, guild, moderatorId, reason = 'No reason specified' }) {
    const everyoneRole = guild.roles.everyone;

    // Retrieve previous state from memory or DB
    let previousState = 'unset';
    if (this.memoryCache.has(channel.id)) {
      previousState = this.memoryCache.get(channel.id).previousState;
      this.memoryCache.delete(channel.id);
    } else {
      try {
        const res = await query(
          'SELECT previous_deny FROM channel_locks WHERE channel_id = $1 AND guild_id = $2',
          [channel.id, guild.id]
        );
        if (res.rows.length > 0 && res.rows[0].previous_deny) {
          previousState = res.rows[0].previous_deny;
        }
      } catch (err) {
        logger.debug(`Could not read channel lock state from DB: ${err.message}`);
      }
    }

    // Clean up record from DB
    try {
      await query('DELETE FROM channel_locks WHERE channel_id = $1 AND guild_id = $2', [channel.id, guild.id]);
    } catch {
      // Ignore
    }

    // Restore overwrite accurately
    const targetValue = previousState === 'allow' ? true : (previousState === 'deny' ? false : null);

    await channel.permissionOverwrites.edit(everyoneRole, {
      SendMessages: targetValue
    }, { reason: `${reason} | Unlocked by ${moderatorId}` });

    return { success: true, restoredState: previousState };
  }

  /**
   * Check if a channel is currently tracked as locked.
   * @param {string} channelId
   * @returns {boolean}
   */
  isLocked(channelId) {
    return this.memoryCache.has(channelId);
  }
}

const lockService = new LockService();

module.exports = { lockService };
