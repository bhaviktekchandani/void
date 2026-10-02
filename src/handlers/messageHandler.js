/**
 * VOID Message Handler
 * Processes prefix-based commands with custom prefix support.
 */

const { commandRegistry } = require('../commands/registry');
const { CommandContext } = require('../commands/context');
const { prefixService } = require('../services/prefixService');
const { parsePrefixMessage } = require('../utils/argumentParser');
const { handleCommandError } = require('./errorHandler');

async function handleMessage(message) {
  // Ignore bots and direct messages
  if (message.author.bot || !message.guild) return;

  // Retrieve server prefix (cached with .? default)
  const prefix = await prefixService.getPrefix(message.guild.id);

  // Fast check: message must start with active prefix
  const parsed = parsePrefixMessage(message.content, prefix);
  if (!parsed.isCommand) return;

  const command = commandRegistry.get(parsed.commandName);
  if (!command) {
    // Unrecognized command name, silently ignore
    return;
  }

  // Parse command arguments using command's specific parser or default tokens
  let parsedArgs = {};
  if (typeof command.parsePrefixArgs === 'function') {
    parsedArgs = command.parsePrefixArgs(parsed.tokens, parsed.rawArgs);
  }

  const ctx = new CommandContext({
    isSlash: false,
    message,
    commandName: parsed.commandName,
    prefix,
    parsedArgs,
    tokens: parsed.tokens
  });

  try {
    await command.execute(ctx);
  } catch (err) {
    await handleCommandError(err, ctx);
  }
}

module.exports = { handleMessage };
