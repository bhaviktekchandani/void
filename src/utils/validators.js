/**
 * VOID Validators & Formatting Helpers
 */

const TIME_FACTORS = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
  w: 7 * 24 * 60 * 60 * 1000
};

/**
 * Parse human time string into milliseconds (e.g., '10m', '2h', '1d').
 * @param {string} str Duration input
 * @returns {number|null} Milliseconds or null if invalid
 */
function parseDuration(str) {
  if (!str || typeof str !== 'string') return null;
  const match = str.trim().toLowerCase().match(/^(\d+)([smhdw])$/);
  if (!match) return null;

  const value = parseInt(match[1], 10);
  const unit = match[2];
  if (isNaN(value) || value <= 0) return null;

  const ms = value * TIME_FACTORS[unit];
  return ms;
}

/**
 * Format milliseconds into clean readable string.
 * @param {number} ms Milliseconds
 * @returns {string} Human formatted string
 */
function formatDuration(ms) {
  if (!ms || ms <= 0) return '0s';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

/**
 * Validate Discord timeout duration (1 second to 28 days max).
 * @param {number} ms Milliseconds
 * @returns {{ valid: boolean, error?: string }}
 */
function validateTimeoutDuration(ms) {
  if (!ms || isNaN(ms)) {
    return { valid: false, error: 'Invalid duration specified. Examples: `10m`, `1h`, `1d`.' };
  }
  const minMs = 1000; // 1s
  const maxMs = 28 * 24 * 60 * 60 * 1000; // 28 days

  if (ms < minMs) {
    return { valid: false, error: 'Timeout duration must be at least 1 second.' };
  }
  if (ms > maxMs) {
    return { valid: false, error: 'Timeout duration cannot exceed 28 days.' };
  }
  return { valid: true };
}

/**
 * Validate message purge count (1 to 100 messages).
 * @param {number} count Number of messages
 * @returns {{ valid: boolean, error?: string, count: number }}
 */
function validatePurgeCount(count) {
  const parsed = parseInt(count, 10);
  if (isNaN(parsed) || parsed < 1 || parsed > 100) {
    return { valid: false, error: 'Purge amount must be an integer between 1 and 100.', count: 0 };
  }
  return { valid: true, count: parsed };
}

/**
 * Validate slowmode seconds (0 to 21600 seconds = 6 hours).
 * @param {number|string} seconds
 * @returns {{ valid: boolean, seconds: number, error?: string }}
 */
function validateSlowmode(seconds) {
  const parsed = parseInt(seconds, 10);
  if (isNaN(parsed) || parsed < 0 || parsed > 21600) {
    return { valid: false, seconds: 0, error: 'Slowmode must be between 0 (disabled) and 21600 seconds (6 hours).' };
  }
  return { valid: true, seconds: parsed };
}

/**
 * Validate Discord Snowflake ID.
 * @param {string} id Discord ID
 * @returns {boolean}
 */
function isValidSnowflake(id) {
  return typeof id === 'string' && /^\d{17,20}$/.test(id.trim());
}

/**
 * Validate custom prefix.
 * @param {string} prefix
 * @returns {{ valid: boolean, error?: string }}
 */
function validatePrefix(prefix) {
  if (!prefix || typeof prefix !== 'string') {
    return { valid: false, error: 'Prefix cannot be empty.' };
  }
  const trimmed = prefix.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: 'Prefix cannot be only whitespace.' };
  }
  if (trimmed.length > 10) {
    return { valid: false, error: 'Prefix cannot be longer than 10 characters.' };
  }
  if (trimmed.includes('"') || trimmed.includes("'") || trimmed.includes('`')) {
    return { valid: false, error: 'Prefix cannot contain quote characters.' };
  }
  return { valid: true, prefix: trimmed };
}

module.exports = {
  parseDuration,
  formatDuration,
  validateTimeoutDuration,
  validatePurgeCount,
  validateSlowmode,
  isValidSnowflake,
  validatePrefix
};
