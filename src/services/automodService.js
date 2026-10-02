/**
 * VOID AutoMod Service
 * Evaluates messages against configurable rules and enforces conservative actions.
 */

const { PermissionFlagsBits } = require('discord.js');
const { query } = require('../database/pool');
const { logger } = require('../utils/logger');
const { caseService } = require('./caseService');
const { warningService } = require('./warningService');
const { configService } = require('./configService');
const { voidEmbeds } = require('../embeds/builder');

const DEFAULT_CONFIG = {
  enabled: false,
  spam_enabled: false,
  spam_max_messages: 5,
  spam_interval_sec: 5,
  mention_limit: 5,
  invites_blocked: false,
  links_blocked: false,
  blocked_words: [],
  action: 'DELETE', // DELETE, WARN, TIMEOUT
  timeout_duration_sec: 300 // 5 minutes
};

const INVITE_REGEX = /(discord\.(gg|io|me|li)|discord(?:app)?\.com\/invite)\/[a-zA-Z0-9_\-]+/i;
const URL_REGEX = /https?:\/\/[^\s<]+[^<.,:;"')\]\s]/i;

class AutoModService {
  constructor() {
    /** @type {Map<string, object>} */
    this.configCache = new Map();
    /** @type {Map<string, { timestamps: number[], lastContent: string, repeatCount: number }>} */
    this.userHistory = new Map();

    // Clean user message history every 60 seconds
    setInterval(() => this.cleanupHistory(), 60000).unref();
  }

  cleanupHistory() {
    const now = Date.now();
    for (const [key, record] of this.userHistory.entries()) {
      record.timestamps = record.timestamps.filter(t => now - t < 15000);
      if (record.timestamps.length === 0) {
        this.userHistory.delete(key);
      }
    }
  }

  /**
   * Get AutoMod configuration for a guild.
   * @param {string} guildId
   * @returns {Promise<object>}
   */
  async getConfig(guildId) {
    if (!guildId) return { ...DEFAULT_CONFIG };

    if (this.configCache.has(guildId)) {
      return this.configCache.get(guildId);
    }

    try {
      const res = await query('SELECT * FROM automod_configs WHERE guild_id = $1', [guildId]);
      if (res.rows.length > 0) {
        const row = res.rows[0];
        const cfg = {
          enabled: Boolean(row.enabled),
          spam_enabled: Boolean(row.spam_enabled),
          spam_max_messages: row.spam_max_messages || 5,
          spam_interval_sec: row.spam_interval_sec || 5,
          mention_limit: row.mention_limit || 5,
          invites_blocked: Boolean(row.invites_blocked),
          links_blocked: Boolean(row.links_blocked),
          blocked_words: Array.isArray(row.blocked_words) ? row.blocked_words : [],
          action: row.action || 'DELETE',
          timeout_duration_sec: row.timeout_duration_sec || 300
        };
        this.configCache.set(guildId, cfg);
        return cfg;
      }
    } catch (err) {
      logger.debug(`Could not load AutoMod config from DB for ${guildId}: ${err.message}`);
    }

    const fallback = { ...DEFAULT_CONFIG };
    this.configCache.set(guildId, fallback);
    return fallback;
  }

  /**
   * Update AutoMod configuration for a guild.
   * @param {string} guildId
   * @param {Partial<typeof DEFAULT_CONFIG>} updates
   * @returns {Promise<object>}
   */
  async updateConfig(guildId, updates) {
    const current = await this.getConfig(guildId);
    const updated = { ...current, ...updates };

    try {
      await query(
        `INSERT INTO automod_configs (
          guild_id, enabled, spam_enabled, spam_max_messages, spam_interval_sec,
          mention_limit, invites_blocked, links_blocked, blocked_words, action,
          timeout_duration_sec, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
        ON CONFLICT (guild_id) DO UPDATE SET
          enabled = $2, spam_enabled = $3, spam_max_messages = $4, spam_interval_sec = $5,
          mention_limit = $6, invites_blocked = $7, links_blocked = $8, blocked_words = $9,
          action = $10, timeout_duration_sec = $11, updated_at = NOW()`,
        [
          guildId,
          updated.enabled,
          updated.spam_enabled,
          updated.spam_max_messages,
          updated.spam_interval_sec,
          updated.mention_limit,
          updated.invites_blocked,
          updated.links_blocked,
          updated.blocked_words,
          updated.action,
          updated.timeout_duration_sec
        ]
      );
    } catch (err) {
      logger.error(`Failed to persist AutoMod config for guild ${guildId}`, err);
    }

    this.configCache.set(guildId, updated);
    return updated;
  }

  /**
   * Evaluate an incoming message against active AutoMod rules.
   * @param {import('discord.js').Message} message
   * @returns {Promise<{ violated: boolean, rule?: string, reason?: string, action?: string }>}
   */
  async evaluateMessage(message) {
    if (!message.guild || message.author.bot || !message.content) {
      return { violated: false };
    }

    // Bypass for members with ManageMessages or Administrator permissions
    if (message.member && (
      message.member.permissions.has(PermissionFlagsBits.ManageMessages) ||
      message.member.permissions.has(PermissionFlagsBits.Administrator)
    )) {
      return { violated: false };
    }

    const cfg = await this.getConfig(message.guild.id);
    if (!cfg.enabled) {
      return { violated: false };
    }

    const content = message.content;

    // 1. Invite Link Check
    if (cfg.invites_blocked && INVITE_REGEX.test(content)) {
      return {
        violated: true,
        rule: 'INVITE_LINK',
        reason: 'Unauthorized Discord invite link detected',
        action: cfg.action
      };
    }

    // 2. Generic Link Restriction Check
    if (cfg.links_blocked && URL_REGEX.test(content)) {
      return {
        violated: true,
        rule: 'EXTERNAL_LINKS',
        reason: 'External link sharing restricted by AutoMod',
        action: cfg.action
      };
    }

    // 3. Blocked Words Check
    if (cfg.blocked_words && cfg.blocked_words.length > 0) {
      const lower = content.toLowerCase();
      for (const word of cfg.blocked_words) {
        if (!word) continue;
        const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (regex.test(lower)) {
          return {
            violated: true,
            rule: 'BLOCKED_WORD',
            reason: `Message contained a restricted phrase`,
            action: cfg.action
          };
        }
      }
    }

    // 4. Mention Limit Check
    if (cfg.mention_limit > 0 && message.mentions) {
      const userMentions = message.mentions.users ? message.mentions.users.size : 0;
      const roleMentions = message.mentions.roles ? message.mentions.roles.size : 0;
      const totalMentions = userMentions + roleMentions;
      if (totalMentions > cfg.mention_limit) {
        return {
          violated: true,
          rule: 'MENTION_FLOOD',
          reason: `Exceeded mention limit (${totalMentions}/${cfg.mention_limit})`,
          action: cfg.action
        };
      }
    }

    // 5. Spam / Rapid Message Flood & Duplicate Check
    if (cfg.spam_enabled) {
      const key = `${message.guild.id}:${message.author.id}`;
      const now = Date.now();
      let record = this.userHistory.get(key);
      if (!record) {
        record = { timestamps: [], lastContent: '', repeatCount: 0 };
        this.userHistory.set(key, record);
      }

      // Check duplicates
      if (record.lastContent && record.lastContent === content.trim() && (now - (record.timestamps[record.timestamps.length - 1] || 0) < 10000)) {
        record.repeatCount++;
        if (record.repeatCount >= 3) {
          return {
            violated: true,
            rule: 'DUPLICATE_SPAM',
            reason: 'Repeated duplicate message spam detected',
            action: cfg.action
          };
        }
      } else {
        record.lastContent = content.trim();
        record.repeatCount = 1;
      }

      // Rate limit check
      const windowMs = cfg.spam_interval_sec * 1000;
      record.timestamps.push(now);
      record.timestamps = record.timestamps.filter(t => now - t <= windowMs);

      if (record.timestamps.length > cfg.spam_max_messages) {
        return {
          violated: true,
          rule: 'MESSAGE_SPAM',
          reason: `Exceeded message rate (${record.timestamps.length} msgs in ${cfg.spam_interval_sec}s)`,
          action: cfg.action
        };
      }
    }

    return { violated: false };
  }

  /**
   * Enforce AutoMod action upon violation.
   * @param {import('discord.js').Message} message
   * @param {object} violation
   */
  async handleViolation(message, violation) {
    try {
      // 1. Delete offending message
      await message.delete().catch(() => null);

      const action = violation.action || 'DELETE';
      let caseNumber = null;

      // 2. Apply action if WARN or TIMEOUT
      if (action === 'WARN') {
        const caseRecord = await caseService.createCase({
          guildId: message.guild.id,
          targetId: message.author.id,
          targetTag: message.author.tag || message.author.username,
          moderatorId: message.client.user.id,
          moderatorTag: message.client.user.tag || 'VOID AutoMod',
          action: 'WARN',
          reason: `[AutoMod: ${violation.rule}] ${violation.reason}`
        });

        if (caseRecord) {
          caseNumber = caseRecord.case_number;
          await warningService.addWarning({
            guildId: message.guild.id,
            targetId: message.author.id,
            moderatorId: message.client.user.id,
            reason: `[AutoMod: ${violation.rule}] ${violation.reason}`,
            caseId: caseRecord.id
          });
        }
      } else if (action === 'TIMEOUT' && message.member && message.member.moderatable) {
        const cfg = await this.getConfig(message.guild.id);
        const durationMs = (cfg.timeout_duration_sec || 300) * 1000;
        await message.member.timeout(durationMs, `[AutoMod: ${violation.rule}] ${violation.reason}`).catch(() => null);

        const caseRecord = await caseService.createCase({
          guildId: message.guild.id,
          targetId: message.author.id,
          targetTag: message.author.tag || message.author.username,
          moderatorId: message.client.user.id,
          moderatorTag: message.client.user.tag || 'VOID AutoMod',
          action: 'TIMEOUT',
          duration: `${cfg.timeout_duration_sec}s`,
          reason: `[AutoMod: ${violation.rule}] ${violation.reason}`
        });

        if (caseRecord) {
          caseNumber = caseRecord.case_number;
        }
      }

      // 3. Log to moderation log channel
      const guildCfg = await configService.getConfig(message.guild.id);
      if (guildCfg.log_channel_id) {
        const logChan = await message.guild.channels.fetch(guildCfg.log_channel_id).catch(() => null);
        if (logChan && logChan.isTextBased()) {
          const logEmbed = voidEmbeds.moderationLog({
            action: `AUTOMOD_${violation.rule}`,
            target: message.author,
            moderator: message.client.user,
            reason: violation.reason,
            duration: action === 'TIMEOUT' ? `${(await this.getConfig(message.guild.id)).timeout_duration_sec}s` : undefined,
            caseNumber,
            channelName: message.channel.name
          });
          await logChan.send({ embeds: [logEmbed] }).catch(() => null);
        }
      }

      // 4. Temporary channel warning notice
      const notice = await message.channel.send({
        content: `**VOID AutoMod:** <@${message.author.id}>, your message was removed (${violation.reason}).`
      }).catch(() => null);

      if (notice) {
        setTimeout(() => notice.delete().catch(() => null), 4000).unref();
      }
    } catch (err) {
      logger.error('Failed to handle AutoMod violation', err);
    }
  }
}

const automodService = new AutoModService();

module.exports = { automodService, DEFAULT_CONFIG };
