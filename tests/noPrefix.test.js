const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { noPrefixService } = require('../src/services/noPrefixService');
const { commandRegistry } = require('../src/commands/registry');
const { handleMessage } = require('../src/handlers/messageHandler');
const { prefixService } = require('../src/services/prefixService');

describe('VOID No-Prefix Access System', () => {
  beforeEach(() => {
    commandRegistry.loadAll();
    noPrefixService.setTestConfig(null);
  });

  afterEach(() => {
    noPrefixService.setTestConfig(null);
  });

  test('validates and parses comma-separated snowflake IDs', () => {
    noPrefixService.setTestConfig({
      enabled: true,
      userIds: ['111111111111111111', ' 222222222222222222 ', '111111111111111111', 'invalid_id', '']
    });

    const allowed = noPrefixService.getAllowedUserIds();
    assert.equal(allowed.length, 2);
    assert.ok(allowed.includes('111111111111111111'));
    assert.ok(allowed.includes('222222222222222222'));
    assert.equal(noPrefixService.isUserAllowed('111111111111111111'), true);
    assert.equal(noPrefixService.isUserAllowed('222222222222222222'), true);
    assert.equal(noPrefixService.isUserAllowed('333333333333333333'), false);
  });

  test('disables no-prefix access when NO_PREFIX_ENABLED is false', () => {
    noPrefixService.setTestConfig({
      enabled: false,
      userIds: ['111111111111111111']
    });

    assert.equal(noPrefixService.isEnabled(), false);
    assert.equal(noPrefixService.isUserAllowed('111111111111111111'), false);
  });

  test('empty allowlist grants nobody access', () => {
    noPrefixService.setTestConfig({
      enabled: true,
      userIds: []
    });

    assert.equal(noPrefixService.getAllowedUserIds().length, 0);
    assert.equal(noPrefixService.isUserAllowed('111111111111111111'), false);
  });

  test('parses registered commands and aliases without prefix', () => {
    const res = noPrefixService.parseNoPrefixMessage('help ban', commandRegistry);
    assert.equal(res.isCommand, true);
    assert.equal(res.commandName, 'help');
    assert.deepEqual(res.tokens, ['ban']);

    // Test alias (e.g. server -> serverinfo)
    const aliasRes = noPrefixService.parseNoPrefixMessage('server', commandRegistry);
    assert.equal(aliasRes.isCommand, true);
    assert.equal(aliasRes.commandName, 'serverinfo');
  });

  test('ignores casual conversation and unknown words without prefix', () => {
    const res1 = noPrefixService.parseNoPrefixMessage('hello everyone how are you', commandRegistry);
    assert.equal(res1.isCommand, false);

    const res2 = noPrefixService.parseNoPrefixMessage('banana', commandRegistry);
    assert.equal(res2.isCommand, false);

    const res3 = noPrefixService.parseNoPrefixMessage('', commandRegistry);
    assert.equal(res3.isCommand, false);
  });

  test('executes command without prefix for authorized user via handleMessage', async () => {
    const AUTHORIZED_ID = '123456789012345678';
    noPrefixService.setTestConfig({
      enabled: true,
      userIds: [AUTHORIZED_ID]
    });

    let repliedPayload = null;
    const mockMessage = {
      content: 'help',
      author: { id: AUTHORIZED_ID, bot: false, tag: 'AuthorizedUser#0001' },
      guild: { id: 'guild_np_test', name: 'Test Guild' },
      channel: {
        id: 'chan_1',
        name: 'general',
        send: async (payload) => { repliedPayload = payload; return { id: 'm1' }; }
      },
      member: {
        id: AUTHORIZED_ID,
        roles: { cache: new Map(), highest: { position: 1 } },
        permissions: { has: () => true }
      },
      reply: async (payload) => { repliedPayload = payload; return { id: 'm1' }; }
    };

    await handleMessage(mockMessage);
    assert.ok(repliedPayload, 'Authorized user should trigger command reply without prefix');
    assert.ok(repliedPayload.embeds && repliedPayload.embeds.length > 0);
  });

  test('does not execute command without prefix for unauthorized user', async () => {
    const UNAUTHORIZED_ID = '999999999999999999';
    noPrefixService.setTestConfig({
      enabled: true,
      userIds: ['111111111111111111']
    });

    let repliedPayload = null;
    const mockMessage = {
      content: 'help',
      author: { id: UNAUTHORIZED_ID, bot: false, tag: 'NormalUser#0001' },
      guild: { id: 'guild_np_test', name: 'Test Guild' },
      channel: {
        id: 'chan_1',
        name: 'general',
        send: async (payload) => { repliedPayload = payload; return { id: 'm1' }; }
      },
      member: { id: UNAUTHORIZED_ID, roles: { cache: new Map() } },
      reply: async (payload) => { repliedPayload = payload; return { id: 'm1' }; }
    };

    await handleMessage(mockMessage);
    assert.equal(repliedPayload, null, 'Unauthorized user should be silently ignored without prefix');
  });

  test('normal prefixed command works for all users and with custom guild prefixes', async () => {
    const USER_ID = '888888888888888888';
    noPrefixService.setTestConfig({
      enabled: false,
      userIds: []
    });

    // Mock custom prefix
    await prefixService.setPrefix('guild_custom_pref', '!');

    let repliedPayload = null;
    const mockMessage = {
      content: '!help',
      author: { id: USER_ID, bot: false, tag: 'User#0001' },
      guild: { id: 'guild_custom_pref', name: 'Test Guild' },
      channel: {
        id: 'chan_1',
        name: 'general',
        send: async (payload) => { repliedPayload = payload; return { id: 'm1' }; }
      },
      member: { id: USER_ID, roles: { cache: new Map() } },
      reply: async (payload) => { repliedPayload = payload; return { id: 'm1' }; }
    };

    await handleMessage(mockMessage);
    assert.ok(repliedPayload, 'Custom prefix command should execute successfully');
  });

  test('no-prefix user cannot bypass command permission checks', async () => {
    const AUTHORIZED_ID = '123456789012345678';
    noPrefixService.setTestConfig({
      enabled: true,
      userIds: [AUTHORIZED_ID]
    });

    let repliedPayload = null;
    const mockMessage = {
      content: 'ban @target',
      author: { id: AUTHORIZED_ID, bot: false, tag: 'AuthorizedUser#0001' },
      guild: {
        id: 'guild_np_test',
        name: 'Test Guild',
        members: { me: { permissions: { has: () => true } } }
      },
      channel: { id: 'chan_1', name: 'general' },
      member: {
        id: AUTHORIZED_ID,
        guild: { id: 'guild_np_test' },
        roles: { cache: new Map(), highest: { position: 1 } },
        // Simulate missing BanMembers permission
        permissions: {
          has: () => false
        }
      },
      reply: async (payload) => { repliedPayload = payload; return { id: 'm1' }; }
    };

    await handleMessage(mockMessage);
    assert.ok(repliedPayload, 'Command should process and return permission error');
    assert.ok(repliedPayload.embeds && repliedPayload.embeds.length > 0);
    const desc = repliedPayload.embeds[0].data.description;
    assert.match(desc, /Permission Denied/i);
  });

  test('noprefix diagnostic command displays accurate status', async () => {
    const AUTHORIZED_ID = '123456789012345678';
    noPrefixService.setTestConfig({
      enabled: true,
      userIds: [AUTHORIZED_ID]
    });

    const noprefixCmd = commandRegistry.get('noprefix');
    assert.ok(noprefixCmd);

    // Test status subcommand
    let statusReply = null;
    const ctxStatus = {
      isSlash: false,
      prefix: '.?',
      user: { id: AUTHORIZED_ID },
      services: { noPrefixService },
      parsedArgs: { subcommand: 'status' },
      getSubcommand: () => null,
      reply: async (payload) => { statusReply = payload; }
    };
    await noprefixCmd.execute(ctxStatus);
    assert.ok(statusReply);
    assert.match(statusReply.embeds[0].data.title, /No-Prefix Access System/);

    // Test test subcommand
    let testReply = null;
    const ctxTest = {
      isSlash: false,
      prefix: '.?',
      user: { id: AUTHORIZED_ID },
      services: { noPrefixService },
      parsedArgs: { subcommand: 'test' },
      getSubcommand: () => 'test',
      reply: async (payload) => { testReply = payload; }
    };
    await noprefixCmd.execute(ctxTest);
    assert.ok(testReply);
    assert.match(testReply.embeds[0].data.title, /No-Prefix Access Diagnostic/);
  });
});
