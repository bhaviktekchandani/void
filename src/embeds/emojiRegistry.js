/**
 * VOID Emoji Registry
 * Centralized emoji management with resilient Unicode fallbacks.
 * Custom emojis can be configured via environment or mapped at runtime.
 */

const FALLBACK_EMOJIS = {
  SUCCESS: '✓',
  FAILURE: '✕',
  WARNING: '⚠',
  MOD: '◆',
  CASE: '◇',
  CONFIG: '⚙',
  INFO: 'ℹ',
  HELP: '▪',
  DOT: '•',
  ARROW: '›',
  LOCK: '▣',
  UNLOCK: '▢',
  TIME: '◷',
  USER: '◈',
  SHIELD: '◆'
};

// Custom emojis can be set via env var (JSON string) or dynamically registered
let customOverrides = {};

try {
  if (process.env.VOID_CUSTOM_EMOJIS) {
    customOverrides = JSON.parse(process.env.VOID_CUSTOM_EMOJIS);
  }
} catch {
  customOverrides = {};
}

/**
 * Get an emoji for a semantic key.
 * @param {string} key Semantic name (SUCCESS, FAILURE, MOD, etc.)
 * @returns {string} Custom emoji string or standard Unicode fallback.
 */
function getEmoji(key) {
  const upperKey = String(key || '').toUpperCase();
  if (customOverrides[upperKey]) {
    return customOverrides[upperKey];
  }
  return FALLBACK_EMOJIS[upperKey] || '▪';
}

/**
 * Register custom emoji overrides at runtime.
 * @param {Record<string, string>} overrides
 */
function setCustomEmojis(overrides) {
  if (typeof overrides === 'object' && overrides !== null) {
    customOverrides = { ...customOverrides, ...overrides };
  }
}

module.exports = {
  getEmoji,
  setCustomEmojis,
  FALLBACK_EMOJIS
};
