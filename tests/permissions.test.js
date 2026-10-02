const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { PermissionFlagsBits } = require('discord.js');
const {
  checkMemberPermissions,
  checkBotPermissions,
  validateHierarchy
} = require('../src/utils/permissions');

describe('Permissions & Hierarchy Checks', () => {
  const guild = { ownerId: 'owner_123' };

  test('detects missing member permissions', () => {
    const member = {
      id: 'user_1',
      guild,
      permissions: {
        has: (perm) => perm !== PermissionFlagsBits.BanMembers
      }
    };

    const res = checkMemberPermissions(member, [PermissionFlagsBits.BanMembers]);
    assert.equal(res.has, false);
    assert.equal(res.missing.length, 1);
  });

  test('grants all permissions to guild owner', () => {
    const ownerMember = {
      id: 'owner_123',
      guild,
      permissions: {
        has: () => false
      }
    };

    const res = checkMemberPermissions(ownerMember, [PermissionFlagsBits.BanMembers, PermissionFlagsBits.Administrator]);
    assert.equal(res.has, true);
  });

  test('detects bot missing permissions', () => {
    const botMember = {
      permissions: {
        has: () => false
      }
    };

    const res = checkBotPermissions(botMember, [PermissionFlagsBits.KickMembers]);
    assert.equal(res.has, false);
  });

  test('blocks self-targeting', () => {
    const mod = { id: 'mod_1', guild, roles: { highest: { position: 10 } } };
    const bot = { id: 'bot_1', guild, roles: { highest: { position: 20 } } };

    const res = validateHierarchy({
      moderatorMember: mod,
      botMember: bot,
      targetMember: mod,
      targetUserId: 'mod_1'
    });

    assert.equal(res.canAct, false);
    assert.match(res.reason, /against yourself/i);
  });

  test('blocks targeting the bot itself', () => {
    const mod = { id: 'mod_1', guild, roles: { highest: { position: 10 } } };
    const bot = { id: 'bot_1', guild, roles: { highest: { position: 20 } } };

    const res = validateHierarchy({
      moderatorMember: mod,
      botMember: bot,
      targetMember: bot,
      targetUserId: 'bot_1'
    });

    assert.equal(res.canAct, false);
    assert.match(res.reason, /against VOID/i);
  });

  test('blocks targeting the server owner', () => {
    const mod = { id: 'mod_1', guild, roles: { highest: { position: 10 } } };
    const bot = { id: 'bot_1', guild, roles: { highest: { position: 20 } } };

    const res = validateHierarchy({
      moderatorMember: mod,
      botMember: bot,
      targetMember: { id: 'owner_123', roles: { highest: { position: 99 } } },
      targetUserId: 'owner_123'
    });

    assert.equal(res.canAct, false);
    assert.match(res.reason, /server owner/i);
  });

  test('blocks action when moderator has equal or lower role than target', () => {
    const mod = { id: 'mod_1', guild, roles: { highest: { position: 5 } } };
    const bot = { id: 'bot_1', guild, roles: { highest: { position: 20 } } };
    const target = { id: 'target_1', roles: { highest: { position: 5 } } };

    const res = validateHierarchy({
      moderatorMember: mod,
      botMember: bot,
      targetMember: target,
      targetUserId: 'target_1'
    });

    assert.equal(res.canAct, false);
    assert.match(res.reason, /equal to or higher/i);
  });

  test('blocks action when bot has equal or lower role than target', () => {
    const mod = { id: 'mod_1', guild, roles: { highest: { position: 25 } } };
    const bot = { id: 'bot_1', guild, roles: { highest: { position: 10 } } };
    const target = { id: 'target_1', roles: { highest: { position: 15 } } };

    const res = validateHierarchy({
      moderatorMember: mod,
      botMember: bot,
      targetMember: target,
      targetUserId: 'target_1'
    });

    assert.equal(res.canAct, false);
    assert.match(res.reason, /bot's highest role/i);
  });

  test('allows action when moderator and bot are both higher than target', () => {
    const mod = { id: 'mod_1', guild, roles: { highest: { position: 20 } } };
    const bot = { id: 'bot_1', guild, roles: { highest: { position: 25 } } };
    const target = { id: 'target_1', roles: { highest: { position: 5 } } };

    const res = validateHierarchy({
      moderatorMember: mod,
      botMember: bot,
      targetMember: target,
      targetUserId: 'target_1'
    });

    assert.equal(res.canAct, true);
  });
});
