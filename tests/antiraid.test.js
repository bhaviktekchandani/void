const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { antiraidService } = require('../src/services/antiraidService');

describe('Anti-Raid Safeguards Service', () => {
  const guild = {
    id: 'guild_antiraid_test',
    name: 'Anti-Raid Test Server',
    channels: {
      fetch: async () => null
    }
  };

  test('configures and retrieves thresholds correctly', async () => {
    const cfg = await antiraidService.updateConfig('guild_antiraid_test', {
      enabled: true,
      join_threshold: 4,
      interval_sec: 5,
      action: 'LOCKDOWN'
    });

    assert.equal(cfg.enabled, true);
    assert.equal(cfg.join_threshold, 4);
    assert.equal(cfg.interval_sec, 5);
    assert.equal(cfg.action, 'LOCKDOWN');
  });

  test('triggers lockdown when join threshold is breached', async () => {
    let alertTriggered = false;
    // Intercept triggerRaidAlert
    antiraidService.triggerRaidAlert = async (g, count, c) => {
      alertTriggered = true;
      c.is_locked_down = true;
    };

    // Simulate 4 rapid joins
    for (let i = 0; i < 4; i++) {
      await antiraidService.handleMemberJoin({
        guild,
        user: { id: `member_${i}`, tag: `Member#${i}` }
      });
    }

    assert.equal(alertTriggered, true);
  });

  test('clears lockdown state on moderator command', async () => {
    await antiraidService.updateConfig('guild_antiraid_test', { is_locked_down: true });
    let cfg = await antiraidService.getConfig('guild_antiraid_test');
    assert.equal(cfg.is_locked_down, true);

    await antiraidService.clearLockdown('guild_antiraid_test');
    cfg = await antiraidService.getConfig('guild_antiraid_test');
    assert.equal(cfg.is_locked_down, false);
  });
});
