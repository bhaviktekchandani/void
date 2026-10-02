/**
 * VOID Centralized Emoji Registry
 * Manages all 76 canonical custom emojis with resilient Unicode fallbacks.
 * Dynamically resolves application emojis upon client connection or via configuration.
 */

const { CANONICAL_EMOJI_NAMES, UNICODE_FALLBACKS, SEMANTIC_ALIASES } = require('../config/emojis');
const { logger } = require('../utils/logger');

// In-memory cache for resolved emoji markup (e.g. <:ban:123456...>)
const resolvedEmojis = new Map();

// Load initial overrides from environment if present (JSON string: {"ban": "<:ban:123...>"})
try {
  if (process.env.VOID_CUSTOM_EMOJIS) {
    const parsed = JSON.parse(process.env.VOID_CUSTOM_EMOJIS);
    for (const [key, val] of Object.entries(parsed)) {
      resolvedEmojis.set(key.toLowerCase(), val);
    }
  }
} catch (err) {
  logger.warn('Failed to parse VOID_CUSTOM_EMOJIS from environment', err);
}

/**
 * Resolve semantic key to canonical lowercase name.
 * @param {string} key
 * @returns {string}
 */
function normalizeKey(key) {
  if (!key) return 'dot';
  const clean = String(key).trim();
  const upper = clean.toUpperCase();
  if (SEMANTIC_ALIASES[upper]) {
    return SEMANTIC_ALIASES[upper];
  }
  return clean.toLowerCase();
}

/**
 * Get the formatted custom emoji or its Unicode fallback.
 * Guaranteed to never return broken markup or throw.
 * @param {string} key Semantic or canonical emoji name
 * @returns {string} Custom emoji string (e.g. <:name:id>) or clean Unicode symbol
 */
function getEmoji(key) {
  const normalized = normalizeKey(key);

  // 1. Check if a custom emoji is loaded and valid
  if (resolvedEmojis.has(normalized)) {
    const custom = resolvedEmojis.get(normalized);
    if (custom && typeof custom === 'string' && custom.trim().length > 0) {
      return custom;
    }
  }

  // 2. Return canonical Unicode fallback
  if (UNICODE_FALLBACKS[normalized]) {
    return UNICODE_FALLBACKS[normalized];
  }

  return '▪';
}

/**
 * Register custom emoji overrides at runtime.
 * @param {Record<string, string>} overrides Key-value pairs of emoji name -> markup
 */
function setCustomEmojis(overrides) {
  if (typeof overrides === 'object' && overrides !== null) {
    for (const [key, val] of Object.entries(overrides)) {
      if (typeof val === 'string' && val.trim().length > 0) {
        resolvedEmojis.set(key.toLowerCase(), val);
      }
    }
    logger.debug(`Registered ${Object.keys(overrides).length} custom emoji overrides.`);
  }
}

/**
 * Automatically fetch and cache application emojis from the Discord client.
 * Uses Discord API's application emoji manager (discord.js v14.15+).
 * @param {import('discord.js').Client} client
 */
async function loadFromApplication(client) {
  if (!client || !client.application) return;

  try {
    if (client.application.emojis && typeof client.application.emojis.fetch === 'function') {
      const appEmojis = await client.application.emojis.fetch();
      let matchedCount = 0;

      for (const [id, emoji] of appEmojis) {
        const nameLower = emoji.name.toLowerCase();
        // If this emoji name matches one of our canonical emojis or any key
        resolvedEmojis.set(nameLower, emoji.toString());
        matchedCount++;
      }

      logger.info(`Loaded ${matchedCount} custom application emojis from Discord Developer Portal.`);
    }
  } catch (err) {
    logger.debug(`Could not auto-fetch application emojis: ${err.message}`);
  }
}

/**
 * Get map of all currently loaded custom emojis.
 * @returns {Record<string, string>}
 */
function getAllLoadedEmojis() {
  const obj = {};
  for (const [k, v] of resolvedEmojis.entries()) {
    obj[k] = v;
  }
  return obj;
}

/**
 * Check if a custom emoji is currently loaded for a given key.
 * @param {string} key
 * @returns {boolean}
 */
function isCustomLoaded(key) {
  const norm = normalizeKey(key);
  return resolvedEmojis.has(norm);
}

// Backward compatibility for existing tests referencing FALLBACK_EMOJIS
const FALLBACK_EMOJIS = {
  SUCCESS: UNICODE_FALLBACKS.success,
  FAILURE: UNICODE_FALLBACKS.error,
  WARNING: UNICODE_FALLBACKS.warning,
  MOD: UNICODE_FALLBACKS.moderator,
  CASE: UNICODE_FALLBACKS.case,
  CONFIG: UNICODE_FALLBACKS.config,
  INFO: UNICODE_FALLBACKS.info,
  HELP: UNICODE_FALLBACKS.info,
  DOT: UNICODE_FALLBACKS.dot,
  ARROW: UNICODE_FALLBACKS.arrow,
  LOCK: UNICODE_FALLBACKS.lock,
  UNLOCK: UNICODE_FALLBACKS.unlock,
  TIME: UNICODE_FALLBACKS.time,
  USER: UNICODE_FALLBACKS.userinfo,
  SHIELD: UNICODE_FALLBACKS.shield
};

module.exports = {
  getEmoji,
  setCustomEmojis,
  loadFromApplication,
  getAllLoadedEmojis,
  isCustomLoaded,
  CANONICAL_EMOJI_NAMES,
  UNICODE_FALLBACKS,
  FALLBACK_EMOJIS
};
