/**
 * VOID Logger
 * Minimalist, safe logger. Prevents credential leaks and formats output cleanly.
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

const CURRENT_LEVEL = process.env.LOG_LEVEL ? (LOG_LEVELS[process.env.LOG_LEVEL.toUpperCase()] ?? LOG_LEVELS.INFO) : LOG_LEVELS.INFO;

function sanitize(data) {
  if (typeof data === 'string') {
    // Redact tokens or database passwords if they accidentally appear
    return data
      .replace(/([a-zA-Z0-9_\-]{24,}\.[a-zA-Z0-9_\-]{6,}\.[a-zA-Z0-9_\-]+)/g, '[REDACTED_DISCORD_TOKEN]')
      .replace(/(postgres(ql)?:\/\/[^:]+:)[^@]+(@)/g, '$1[REDACTED_PASSWORD]$3');
  }
  return data;
}

function formatMessage(level, message, meta) {
  const timestamp = new Date().toISOString();
  let text = `[${timestamp}] [${level}] ${sanitize(message)}`;
  if (meta !== undefined) {
    if (meta instanceof Error) {
      text += `\n${sanitize(meta.stack || meta.message)}`;
    } else if (typeof meta === 'object') {
      try {
        text += ` ${JSON.stringify(meta)}`;
      } catch {
        text += ` [Object]`;
      }
    } else {
      text += ` ${meta}`;
    }
  }
  return text;
}

const logger = {
  debug(message, meta) {
    if (CURRENT_LEVEL <= LOG_LEVELS.DEBUG) {
      console.debug(formatMessage('DEBUG', message, meta));
    }
  },
  info(message, meta) {
    if (CURRENT_LEVEL <= LOG_LEVELS.INFO) {
      console.log(formatMessage('INFO', message, meta));
    }
  },
  warn(message, meta) {
    if (CURRENT_LEVEL <= LOG_LEVELS.WARN) {
      console.warn(formatMessage('WARN', message, meta));
    }
  },
  error(message, meta) {
    if (CURRENT_LEVEL <= LOG_LEVELS.ERROR) {
      console.error(formatMessage('ERROR', message, meta));
    }
  }
};

module.exports = { logger };
