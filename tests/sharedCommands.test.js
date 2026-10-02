const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');
const { commandRegistry } = require('../src/commands/registry');
const { CommandContext } = require('../src/commands/context');
const { PermissionFlagsBits } = require('discord.js');

describe('Shared Command Registry & Execution Layer', () => {
  before(() => {
    commandRegistry.loadAll();
  });

  const EXPECTED_COMMANDS = [
    'ban', 'unban', 'kick', 'timeout', 'untimeout',
    'warn', 'warnings', 'clearwarnings', 'softban', 'purge',
    'lock', 'unlock', 'slowmode', 'case', 'reason',
    'modhistory', 'notes', 'help', 'userinfo', 'serverinfo', 'avatar', 'botinfo',
    'prefix', 'config', 'setup', 'automod', 'antiraid', 'noprefix'
  ];

  test('loads all 28 expected commands', () => {
    for (const cmdName of EXPECTED_COMMANDS) {
      const cmd = commandRegistry.get(cmdName);
      assert.ok(cmd, `Command '${cmdName}' should be registered`);
      assert.equal(typeof cmd.execute, 'function', `Command '${cmdName}' should have execute function`);
      assert.ok(cmd.description, `Command '${cmdName}' should have a description`);
      assert.ok(cmd.category, `Command '${cmdName}' should have a category`);
    }
  });

  test('generates valid slash command definitions', () => {
    const slashData = commandRegistry.getSlashData();
    assert.equal(slashData.length, EXPECTED_COMMANDS.length);

    const banSlash = slashData.find(s => s.name === 'ban');
    assert.ok(banSlash);
    assert.equal(banSlash.name, 'ban');
    assert.ok(banSlash.options.some(o => o.name === 'user'));
  });

  test('prefix command argument parsing maps correctly for timeout', () => {
    const timeoutCmd = commandRegistry.get('timeout');
    const parsed = timeoutCmd.parsePrefixArgs(
      ['123456789012345678', '15m', 'Flooding', 'the', 'chat'],
      '123456789012345678 15m Flooding the chat'
    );

    assert.equal(parsed.targetId, '123456789012345678');
    assert.equal(parsed.duration, '15m');
    assert.equal(parsed.reason, 'Flooding the chat');
  });

  test('prefix command argument parsing maps correctly for ban with quotes', () => {
    const banCmd = commandRegistry.get('ban');
    const parsed = banCmd.parsePrefixArgs(
      ['123456789012345678', 'Spamming repeatedly'],
      '123456789012345678 "Spamming repeatedly"'
    );

    assert.equal(parsed.targetId, '123456789012345678');
    assert.equal(parsed.reason, 'Spamming repeatedly');
  });

  test('shared execution layer works identically for slash and prefix help command', async () => {
    const helpCmd = commandRegistry.get('help');

    // 1. Mock Slash Context
    let slashRepliedPayload = null;
    const slashCtx = new CommandContext({
      isSlash: true,
      interaction: {
        guild: { id: 'guild_1' },
        user: { id: 'user_1', tag: 'User#1' },
        options: { getString: () => null },
        reply: async (payload) => { slashRepliedPayload = payload; },
        deferred: false,
        replied: false
      },
      commandName: 'help',
      prefix: '.?'
    });

    await helpCmd.execute(slashCtx);
    assert.ok(slashRepliedPayload);
    assert.ok(slashRepliedPayload.embeds);
    assert.equal(slashRepliedPayload.embeds.length, 1);
    const slashEmbedJson = slashRepliedPayload.embeds[0].toJSON();

    // 2. Mock Prefix Context
    let prefixRepliedPayload = null;
    const prefixCtx = new CommandContext({
      isSlash: false,
      message: {
        guild: { id: 'guild_1' },
        author: { id: 'user_1', tag: 'User#1' },
        reply: async (payload) => { prefixRepliedPayload = payload; }
      },
      commandName: 'help',
      prefix: '.?',
      parsedArgs: {}
    });

    await helpCmd.execute(prefixCtx);
    assert.ok(prefixRepliedPayload);
    assert.ok(prefixRepliedPayload.embeds);
    assert.equal(prefixRepliedPayload.embeds.length, 1);
    const prefixEmbedJson = prefixRepliedPayload.embeds[0].toJSON();

    // Verify both produce identical title, fields count, and categories
    assert.equal(slashEmbedJson.title, prefixEmbedJson.title);
    assert.equal(slashEmbedJson.fields.length, prefixEmbedJson.fields.length);

    // Verify both enforce pure black (#000000) and zero unnecessary pings
    assert.equal(slashEmbedJson.color, 0x000000);
    assert.equal(prefixEmbedJson.color, 0x000000);
    assert.deepEqual(slashRepliedPayload.allowedMentions, { parse: [], repliedUser: false });
    assert.deepEqual(prefixRepliedPayload.allowedMentions, { parse: [], repliedUser: false });
  });
});
