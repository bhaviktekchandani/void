/**
 * VOID Argument Parser
 * Parses prefix commands with quotes, mentions, and subcommand support.
 */

/**
 * Tokenize a command string into arguments, supporting double and single quotes.
 * @param {string} text Argument string
 * @returns {string[]} Array of token strings
 */
function tokenize(text) {
  if (!text || typeof text !== 'string') return [];

  const tokens = [];
  let current = '';
  let inDoubleQuote = false;
  let inSingleQuote = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
    } else if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
    } else if (/\s/.test(char) && !inDoubleQuote && !inSingleQuote) {
      if (current.length > 0) {
        tokens.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }

  if (current.length > 0) {
    tokens.push(current);
  }

  return tokens;
}

/**
 * Extract Discord Snowflake ID from mention or raw string.
 * Supports <@123456>, <@!123456>, or raw 18-digit IDs.
 * @param {string} input Mention or ID
 * @returns {string|null} Snowflake ID or null
 */
function extractUserId(input) {
  if (!input || typeof input !== 'string') return null;
  const match = input.match(/^<@!?(\d{17,20})>$/) || input.match(/^(\d{17,20})$/);
  return match ? match[1] : null;
}

/**
 * Extract Channel ID from mention <#123456> or raw ID.
 * @param {string} input Mention or ID
 * @returns {string|null} Channel ID or null
 */
function extractChannelId(input) {
  if (!input || typeof input !== 'string') return null;
  const match = input.match(/^<#(\d{17,20})>$/) || input.match(/^(\d{17,20})$/);
  return match ? match[1] : null;
}

/**
 * Parse an incoming message against an active prefix.
 * @param {string} content Message content
 * @param {string} prefix Active guild prefix
 * @returns {{ isCommand: boolean, commandName?: string, rawArgs?: string, tokens?: string[] }}
 */
function parsePrefixMessage(content, prefix) {
  if (!content || typeof content !== 'string' || !prefix) {
    return { isCommand: false };
  }

  if (!content.startsWith(prefix)) {
    return { isCommand: false };
  }

  // Remove the prefix
  const withoutPrefix = content.slice(prefix.length).trim();
  if (withoutPrefix.length === 0) {
    return { isCommand: false };
  }

  // Extract command name (first word)
  const firstSpaceIndex = withoutPrefix.search(/\s/);
  let commandName = '';
  let rawArgs = '';

  if (firstSpaceIndex === -1) {
    commandName = withoutPrefix.toLowerCase();
    rawArgs = '';
  } else {
    commandName = withoutPrefix.slice(0, firstSpaceIndex).toLowerCase();
    rawArgs = withoutPrefix.slice(firstSpaceIndex).trim();
  }

  const tokens = tokenize(rawArgs);

  return {
    isCommand: true,
    commandName,
    rawArgs,
    tokens
  };
}

module.exports = {
  tokenize,
  extractUserId,
  extractChannelId,
  parsePrefixMessage
};
