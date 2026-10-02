const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { automodService } = require('../src/services/automodService');
const { PermissionFlagsBits } = require('discord.js');

describe('AutoMod Service Evaluation & Rules', () => {
  const guild = { id: 'guild_automod_test' };

  test('ignores messages from bots', async () => {
    const mockMsg = {
      guild,
      author: { id: 'bot_1', bot: true },
      content: 'discord.gg/scamlink'
    };
    const res = await automodService.evaluateMessage(mockMsg);
    assert.equal(res.violated, false);
  });

  test('bypasses staff with ManageMessages permission', async () => {
    await automodService.updateConfig('guild_automod_test', {
      enabled: true,
      invites_blocked: true
    });

    const mockMsg = {
      guild,
      author: { id: 'mod_1', bot: false },
      member: {
        permissions: {
          has: (perm) => perm === PermissionFlagsBits.ManageMessages
        }
      },
      content: 'Join discord.gg/legit-server'
    };

    const res = await automodService.evaluateMessage(mockMsg);
    assert.equal(res.violated, false);
  });

  test('detects unauthorized discord invite links', async () => {
    await automodService.updateConfig('guild_automod_test', {
      enabled: true,
      invites_blocked: true,
      action: 'DELETE'
    });

    const mockMsg = {
      guild,
      author: { id: 'user_1', bot: false },
      member: { permissions: { has: () => false } },
      content: 'Come check out https://discord.gg/testing123 right now!'
    };

    const res = await automodService.evaluateMessage(mockMsg);
    assert.equal(res.violated, true);
    assert.equal(res.rule, 'INVITE_LINK');
  });

  test('detects blocked words with word boundary matching', async () => {
    await automodService.updateConfig('guild_automod_test', {
      enabled: true,
      blocked_words: ['badword', 'phishing'],
      action: 'WARN'
    });

    const mockMsg = {
      guild,
      author: { id: 'user_2', bot: false },
      member: { permissions: { has: () => false } },
      content: 'This message contains badword inside it.'
    };

    const res = await automodService.evaluateMessage(mockMsg);
    assert.equal(res.violated, true);
    assert.equal(res.rule, 'BLOCKED_WORD');

    // Safe substring test: "notbadwordhere" should NOT trigger if whole word is required
    const mockSafeMsg = {
      guild,
      author: { id: 'user_2', bot: false },
      member: { permissions: { has: () => false } },
      content: 'This is notbadwordhere'
    };
    const safeRes = await automodService.evaluateMessage(mockSafeMsg);
    assert.equal(safeRes.violated, false);
  });

  test('detects excessive mention flooding', async () => {
    await automodService.updateConfig('guild_automod_test', {
      enabled: true,
      mention_limit: 3
    });

    const mockMsg = {
      guild,
      author: { id: 'user_3', bot: false },
      member: { permissions: { has: () => false } },
      content: 'Pinging everyone',
      mentions: {
        users: { size: 4 },
        roles: { size: 0 }
      }
    };

    const res = await automodService.evaluateMessage(mockMsg);
    assert.equal(res.violated, true);
    assert.equal(res.rule, 'MENTION_FLOOD');
  });

  test('detects message rate limit spam', async () => {
    await automodService.updateConfig('guild_automod_test', {
      enabled: true,
      spam_enabled: true,
      spam_max_messages: 3,
      spam_interval_sec: 5
    });

    const author = { id: 'spammer_1', bot: false };
    const member = { permissions: { has: () => false } };

    // Send 3 messages quickly
    await automodService.evaluateMessage({ guild, author, member, content: 'msg 1' });
    await automodService.evaluateMessage({ guild, author, member, content: 'msg 2' });
    await automodService.evaluateMessage({ guild, author, member, content: 'msg 3' });

    // 4th message should trigger
    const res = await automodService.evaluateMessage({ guild, author, member, content: 'msg 4' });
    assert.equal(res.violated, true);
    assert.equal(res.rule, 'MESSAGE_SPAM');
  });
});
