/**
 * VOID Server Configuration Service
 * Provides cached access to guild configurations in PostgreSQL.
 */

const { query } = require('../database/pool');
const { logger } = require('../utils/logger');

const DEFAULT_PREFIX = '.?';

class ConfigService {
  constructor() {
    /** @type {Map<string, { prefix: string, log_channel_id: string|null }>} */
    this.cache = new Map();
  }

  /**
   * Get configuration for a guild.
   * @param {string} guildId
   * @returns {Promise<{ prefix: string, log_channel_id: string|null }>}
   */
  async getConfig(guildId) {
    if (!guildId) return { prefix: DEFAULT_PREFIX, log_channel_id: null };

    if (this.cache.has(guildId)) {
      return this.cache.get(guildId);
    }

    try {
      const res = await query(
        'SELECT prefix, log_channel_id FROM guild_configs WHERE guild_id = $1',
        [guildId]
      );

      if (res.rows.length > 0) {
        const config = {
          prefix: res.rows[0].prefix || DEFAULT_PREFIX,
          log_channel_id: res.rows[0].log_channel_id || null
        };
        this.cache.set(guildId, config);
        return config;
      }
    } catch (err) {
      logger.warn(`Could not load guild config from DB for ${guildId}: ${err.message}`);
    }

    const fallback = { prefix: DEFAULT_PREFIX, log_channel_id: null };
    this.cache.set(guildId, fallback);
    return fallback;
  }

  /**
   * Get active prefix for a guild.
   * @param {string} guildId
   * @returns {Promise<string>}
   */
  async getPrefix(guildId) {
    const config = await this.getConfig(guildId);
    return config.prefix || DEFAULT_PREFIX;
  }

  /**
   * Update guild prefix.
   * @param {string} guildId
   * @param {string} newPrefix
   * @returns {Promise<string>}
   */
  async setPrefix(guildId, newPrefix) {
    try {
      await query(
        `INSERT INTO guild_configs (guild_id, prefix, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (guild_id)
         DO UPDATE SET prefix = $2, updated_at = NOW()`,
        [guildId, newPrefix]
      );
    } catch (err) {
      logger.error(`Failed to persist prefix update for guild ${guildId}`, err);
    }

    // Update cache regardless so current session has the prefix active
    const current = this.cache.get(guildId) || { prefix: DEFAULT_PREFIX, log_channel_id: null };
    current.prefix = newPrefix;
    this.cache.set(guildId, current);

    return newPrefix;
  }

  /**
   * Update guild moderation log channel.
   * @param {string} guildId
   * @param {string|null} channelId
   * @returns {Promise<string|null>}
   */
  async setLogChannel(guildId, channelId) {
    try {
      await query(
        `INSERT INTO guild_configs (guild_id, log_channel_id, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (guild_id)
         DO UPDATE SET log_channel_id = $2, updated_at = NOW()`,
        [guildId, channelId]
      );
    } catch (err) {
      logger.error(`Failed to persist log channel update for guild ${guildId}`, err);
    }

    const current = this.cache.get(guildId) || { prefix: DEFAULT_PREFIX, log_channel_id: null };
    current.log_channel_id = channelId;
    this.cache.set(guildId, current);

    return channelId;
  }

  /**
   * Clear cache for guild or all guilds.
   * @param {string} [guildId]
   */
  clearCache(guildId) {
    if (guildId) {
      this.cache.delete(guildId);
    } else {
      this.cache.clear();
    }
  }
}

const configService = new ConfigService();

module.exports = { configService, DEFAULT_PREFIX };
