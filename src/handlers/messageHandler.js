/**
 * VOID Message Handler
 * Evaluates messages against AutoMod rules and processes prefix-based commands.
 */

const { commandRegistry } = require('../commands/registry');
const { CommandContext } = require('../commands/context');
const { prefixService } = require('../services/prefixService');
const { automodService } = require('../services/automodService');
const { parsePrefixMessage } = require('../utils/argumentParser');
const { handleCommandError } = require('./errorHandler');

async function handleMessage(message) {
  // Ignore bots and direct messages
  if (message.author.bot || !message.guild) return;

  // 1. Evaluate AutoMod rules before any processing
  try {
    const automodCheck = await automodService.evaluateMessage(message);
    if (automodCheck && automodCheck.violated) {
      await automodService.handleViolation(message, automodCheck);
      return; // Do not process violated messages as commands
    }
  } catch (err) {
    // Prevent automod exceptions from halting message handling
  }

  // 2. Retrieve server prefix (cached with .? default)
  const prefix = await prefixService.getPrefix(message.guild.id);

  // Fast check: message must start with active prefix
  const parsed = parsePrefixMessage(message.content, prefix);
  if (!parsed.isCommand) return;

  const command = commandRegistry.get(parsed.commandName);
  if (!command) {
    // Unrecognized command name, silently ignore
    return;
  }

  // 3. Parse command arguments using command's specific parser or default tokens
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
