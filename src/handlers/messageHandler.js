/**
 * VOID Message Handler
 * Evaluates messages against AutoMod rules and processes prefix-based commands.
 */

const { commandRegistry } = require('../commands/registry');
const { CommandContext } = require('../commands/context');
const { prefixService } = require('../services/prefixService');
const { automodService } = require('../services/automodService');
const { noPrefixService } = require('../services/noPrefixService');
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

  // 3. Evaluate prefix command or authorized no-prefix command
  let parsed = parsePrefixMessage(message.content, prefix);
  let usedNoPrefix = false;

  if (!parsed.isCommand) {
    // If not matching guild prefix, check if author has no-prefix authorization
    if (noPrefixService.isUserAllowed(message.author.id)) {
      const noPrefixParsed = noPrefixService.parseNoPrefixMessage(message.content, commandRegistry);
      if (noPrefixParsed.isCommand) {
        parsed = noPrefixParsed;
        usedNoPrefix = true;
      }
    }
  }

  // If not a command, silently ignore (safely ignores ordinary conversations)
  if (!parsed.isCommand) return;

  const command = commandRegistry.get(parsed.commandName);
  if (!command) {
    // Unrecognized command name, silently ignore
    return;
  }

  // 4. Parse command arguments using command's specific parser or default tokens
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
    tokens: parsed.tokens,
    usedNoPrefix
  });

  try {
    await command.execute(ctx);
  } catch (err) {
    await handleCommandError(err, ctx);
  }
}

module.exports = { handleMessage };
