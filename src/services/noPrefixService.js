/**
 * VOID No-Prefix Service
 * Manages prefix-free access for designated Discord user IDs configured via environment variables.
 * Enforces strict authorization, snowflake validation, and command-name validation.
 */

const { tokenize } = require('../utils/argumentParser');
const { logger } = require('../utils/logger');

// Regex for valid Discord Snowflake IDs (17 to 20 digits)
const SNOWFLAKE_REGEX = /^\d{17,20}$/;

class NoPrefixService {
  constructor() {
    /** @type {{ enabled?: boolean, userIds?: string[] } | null} */
    this._testOverride = null;
  }

  /**
   * Set configuration overrides for testing purposes.
   * @param {{ enabled?: boolean, userIds?: string[] } | null} config
   */
  setTestConfig(config) {
    this._testOverride = config;
  }

  /**
   * Check if the no-prefix access system is enabled.
   * @returns {boolean}
   */
  isEnabled() {
    if (this._testOverride && typeof this._testOverride.enabled === 'boolean') {
      return this._testOverride.enabled;
    }

    const envVal = String(process.env.NO_PREFIX_ENABLED || '').trim().toLowerCase();
    return envVal === 'true' || envVal === '1';
  }

  /**
   * Parse and validate allowed Discord user IDs from environment variables.
   * Discards invalid tokens, placeholder text, and duplicates.
   * @returns {string[]} Array of authorized snowflake IDs
   */
  getAllowedUserIds() {
    if (this._testOverride && Array.isArray(this._testOverride.userIds)) {
      return Array.from(new Set(
        this._testOverride.userIds
          .map(id => String(id).trim())
          .filter(id => SNOWFLAKE_REGEX.test(id))
      ));
    }

    const raw = process.env.NO_PREFIX_USERS;
    if (!raw || typeof raw !== 'string') {
      return [];
    }

    const tokens = raw.split(',');
    const validIds = new Set();

    for (const token of tokens) {
      const clean = token.trim();
      // Ignore placeholder strings like YOUR_DISCORD_USER_ID
      if (clean && SNOWFLAKE_REGEX.test(clean)) {
        validIds.add(clean);
      }
    }

    return Array.from(validIds);
  }

  /**
   * Verify if a specific Discord user ID is authorized for no-prefix commands.
   * @param {string|number} userId
   * @returns {boolean}
   */
  isUserAllowed(userId) {
    if (!this.isEnabled()) return false;
    if (!userId) return false;

    const idStr = String(userId).trim();
    if (!SNOWFLAKE_REGEX.test(idStr)) return false;

    const allowed = this.getAllowedUserIds();
    return allowed.includes(idStr);
  }

  /**
   * Parse a message string without a prefix.
   * Only recognizes the message as a command if the first word matches a registered command or alias.
   * Prevents ordinary conversation from being treated as unknown commands.
   *
   * @param {string} content Raw message content
   * @param {import('../commands/registry').CommandRegistry} registry
   * @returns {{ isCommand: boolean, command?: object, commandName?: string, rawArgs?: string, tokens?: string[] }}
   */
  parseNoPrefixMessage(content, registry) {
    if (!content || typeof content !== 'string') {
      return { isCommand: false };
    }

    const trimmed = content.trim();
    if (trimmed.length === 0) {
      return { isCommand: false };
    }

    // Extract first token as candidate command name
    const firstSpaceIndex = trimmed.search(/\s/);
    let candidateName = '';
    let rawArgs = '';

    if (firstSpaceIndex === -1) {
      candidateName = trimmed.toLowerCase();
      rawArgs = '';
    } else {
      candidateName = trimmed.slice(0, firstSpaceIndex).toLowerCase();
      rawArgs = trimmed.slice(firstSpaceIndex).trim();
    }

    if (!registry || typeof registry.get !== 'function') {
      return { isCommand: false };
    }

    // Check if the first word is an actual registered command or alias
    const command = registry.get(candidateName);
    if (!command) {
      // Not a registered command name or alias; treat as casual conversation
      return { isCommand: false };
    }

    const tokens = tokenize(rawArgs);

    return {
      isCommand: true,
      command,
      commandName: command.name,
      rawArgs,
      tokens
    };
  }
}

const noPrefixService = new NoPrefixService();

module.exports = {
  noPrefixService,
  NoPrefixService,
  SNOWFLAKE_REGEX
};
