/**
 * VOID Anti-Raid Safeguards Service
 * Detects abnormal join spikes and triggers alert notifications or lockdowns.
 */

const { query } = require('../database/pool');
const { logger } = require('../utils/logger');
const { configService } = require('./configService');
const { voidEmbeds } = require('../embeds/builder');

const DEFAULT_ANTIRAID = {
  enabled: false,
  join_threshold: 10,
  interval_sec: 10,
  action: 'ALERT', // 'ALERT' or 'LOCKDOWN'
  is_locked_down: false
};

class AntiRaidService {
  constructor() {
    /** @type {Map<string, object>} */
    this.configCache = new Map();
    /** @type {Map<string, number[]>} guildId -> join timestamps */
    this.joinTimestamps = new Map();
  }

  /**
   * Fetch Anti-Raid configuration for a guild.
   * @param {string} guildId
   * @returns {Promise<object>}
   */
  async getConfig(guildId) {
    if (!guildId) return { ...DEFAULT_ANTIRAID };

    if (this.configCache.has(guildId)) {
      return this.configCache.get(guildId);
    }

    try {
      const res = await query('SELECT * FROM antiraid_configs WHERE guild_id = $1', [guildId]);
      if (res.rows.length > 0) {
        const row = res.rows[0];
        const cfg = {
          enabled: Boolean(row.enabled),
          join_threshold: row.join_threshold || 10,
          interval_sec: row.interval_sec || 10,
          action: row.action || 'ALERT',
          is_locked_down: Boolean(row.is_locked_down)
        };
        this.configCache.set(guildId, cfg);
        return cfg;
      }
    } catch (err) {
      logger.debug(`Could not load Anti-Raid config from DB for ${guildId}: ${err.message}`);
    }

    const fallback = { ...DEFAULT_ANTIRAID };
    this.configCache.set(guildId, fallback);
    return fallback;
  }

  /**
   * Update Anti-Raid configuration for a guild.
   * @param {string} guildId
   * @param {Partial<typeof DEFAULT_ANTIRAID>} updates
   * @returns {Promise<object>}
   */
  async updateConfig(guildId, updates) {
    const current = await this.getConfig(guildId);
    const updated = { ...current, ...updates };

    try {
      await query(
        `INSERT INTO antiraid_configs (
          guild_id, enabled, join_threshold, interval_sec, action, is_locked_down, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (guild_id) DO UPDATE SET
          enabled = $2, join_threshold = $3, interval_sec = $4, action = $5, is_locked_down = $6, updated_at = NOW()`,
        [
          guildId,
          updated.enabled,
          updated.join_threshold,
          updated.interval_sec,
          updated.action,
          updated.is_locked_down
        ]
      );
    } catch (err) {
      logger.error(`Failed to update Anti-Raid config for guild ${guildId}`, err);
    }

    this.configCache.set(guildId, updated);
    return updated;
  }

  /**
   * Process a member join event to detect join floods.
   * @param {import('discord.js').GuildMember} member
   */
  async handleMemberJoin(member) {
    const guild = member.guild;
    const cfg = await this.getConfig(guild.id);
    if (!cfg.enabled) return;

    const now = Date.now();
    let timestamps = this.joinTimestamps.get(guild.id) || [];
    const windowMs = cfg.interval_sec * 1000;

    timestamps.push(now);
    timestamps = timestamps.filter(t => now - t <= windowMs);
    this.joinTimestamps.set(guild.id, timestamps);

    if (timestamps.length >= cfg.join_threshold) {
      // Clear recent timestamps so alert isn't duplicated every single subsequent join
      this.joinTimestamps.set(guild.id, []);

      await this.triggerRaidAlert(guild, timestamps.length, cfg);
    }
  }

  /**
   * Trigger raid warning and dispatch to mod-log channel.
   * @param {import('discord.js').Guild} guild
   * @param {number} joinCount
   * @param {object} cfg
   */
  async triggerRaidAlert(guild, joinCount, cfg) {
    logger.warn(`Join spike detected in guild ${guild.name} (${guild.id}): ${joinCount} joins in ${cfg.interval_sec}s`);

    if (cfg.action === 'LOCKDOWN') {
      await this.updateConfig(guild.id, { is_locked_down: true });
    }

    try {
      const gCfg = await configService.getConfig(guild.id);
      if (!gCfg.log_channel_id) return;

      const logChan = await guild.channels.fetch(gCfg.log_channel_id).catch(() => null);
      if (!logChan || !logChan.isTextBased()) return;

      const alertEmbed = voidEmbeds.createBaseEmbed();
      alertEmbed.setTitle(`⚠ ANTI-RAID: JOIN SPIKE DETECTED`);
      alertEmbed.setDescription(
        `**High Join Rate Alert**\n` +
        `Observed **${joinCount}** member joins in **${cfg.interval_sec}** seconds (Threshold: ${cfg.join_threshold}).\n\n` +
        `**Status:** ${cfg.action === 'LOCKDOWN' ? '🔒 Lockdown flag active' : 'ℹ Notification only'}\n` +
        `Use \`${gCfg.prefix}antiraid clear\` or \`/antiraid clear\` to reset.`
      );

      await logChan.send({ embeds: [alertEmbed], allowedMentions: { parse: [] } });
    } catch (err) {
      logger.error('Failed to dispatch anti-raid alert', err);
    }
  }

  /**
   * Clear an active lockdown state.
   * @param {string} guildId
   */
  async clearLockdown(guildId) {
    return await this.updateConfig(guildId, { is_locked_down: false });
  }
}

const antiraidService = new AntiRaidService();

module.exports = { antiraidService, DEFAULT_ANTIRAID };
