const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { lockService } = require('../src/services/lockService');
const { PermissionFlagsBits } = require('discord.js');

describe('LockService State Preservation & Restoration', () => {
  test('accurately records and restores previous unset permissions', async () => {
    let appliedOverwrite = null;
    const mockChannel = {
      id: 'channel_lock_test_1',
      permissionOverwrites: {
        cache: new Map(), // No overwrite exists initially
        edit: async (role, perms) => {
          appliedOverwrite = perms;
        }
      }
    };
    const mockGuild = {
      id: 'guild_lock_test',
      roles: { everyone: { id: 'everyone_role' } }
    };

    // 1. Lock
    const lockRes = await lockService.lockChannel({
      channel: mockChannel,
      guild: mockGuild,
      moderatorId: 'mod_1',
      reason: 'Raid lockdown'
    });

    assert.equal(lockRes.success, true);
    assert.equal(lockRes.previousState, 'unset');
    assert.equal(appliedOverwrite.SendMessages, false);
    assert.equal(lockService.isLocked('channel_lock_test_1'), true);

    // 2. Unlock
    const unlockRes = await lockService.unlockChannel({
      channel: mockChannel,
      guild: mockGuild,
      moderatorId: 'mod_1'
    });

    assert.equal(unlockRes.success, true);
    assert.equal(unlockRes.restoredState, 'unset');
    assert.equal(appliedOverwrite.SendMessages, null); // restored to unset
    assert.equal(lockService.isLocked('channel_lock_test_1'), false);
  });

  test('accurately records and restores previous explicit allow permissions', async () => {
    let appliedOverwrite = null;
    const existingAllowOverwrite = {
      allow: { has: (perm) => perm === PermissionFlagsBits.SendMessages },
      deny: { has: () => false }
    };

    const mockChannel = {
      id: 'channel_lock_test_2',
      permissionOverwrites: {
        cache: new Map([['everyone_role', existingAllowOverwrite]]),
        edit: async (role, perms) => {
          appliedOverwrite = perms;
        }
      }
    };
    const mockGuild = {
      id: 'guild_lock_test',
      roles: { everyone: { id: 'everyone_role' } }
    };

    // Lock
    const lockRes = await lockService.lockChannel({
      channel: mockChannel,
      guild: mockGuild,
      moderatorId: 'mod_1'
    });
    assert.equal(lockRes.previousState, 'allow');

    // Unlock
    const unlockRes = await lockService.unlockChannel({
      channel: mockChannel,
      guild: mockGuild,
      moderatorId: 'mod_1'
    });
    assert.equal(unlockRes.restoredState, 'allow');
    assert.equal(appliedOverwrite.SendMessages, true); // restored to explicit true
  });
});
