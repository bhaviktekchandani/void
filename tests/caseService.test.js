const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { caseService } = require('../src/services/caseService');
const { warningService } = require('../src/services/warningService');

describe('Case & Warning Service Resiliency', () => {
  test('caseService returns null gracefully when database is unavailable', async () => {
    // With no DATABASE_URL configured during test, caseService should handle the failure safely
    const res = await caseService.createCase({
      guildId: 'guild_offline_1',
      targetId: 'target_1',
      moderatorId: 'mod_1',
      action: 'BAN',
      reason: 'Testing offline resiliency'
    });

    assert.equal(res, null);
  });

  test('caseService getCase returns null gracefully without database', async () => {
    const res = await caseService.getCase('guild_offline_1', 1);
    assert.equal(res, null);
  });

  test('caseService getUserCases returns empty array gracefully without database', async () => {
    const res = await caseService.getUserCases('guild_offline_1', 'target_1');
    assert.deepEqual(res, []);
  });

  test('warningService returns empty array gracefully without database', async () => {
    const warnings = await warningService.getWarnings('guild_offline_1', 'target_1');
    assert.deepEqual(warnings, []);

    const count = await warningService.countWarnings('guild_offline_1', 'target_1');
    assert.equal(count, 0);
  });

  test('caseService updateReason returns null gracefully without database', async () => {
    const res = await caseService.updateReason('guild_offline_1', 1, 'Updated reason');
    assert.equal(res, null);
  });

  test('caseService countUserCases returns 0 gracefully without database', async () => {
    const count = await caseService.countUserCases('guild_offline_1', 'target_1');
    assert.equal(count, 0);
  });

  test('warningService clearWarnings returns 0 gracefully without database', async () => {
    const count = await warningService.clearWarnings('guild_offline_1', 'target_1');
    assert.equal(count, 0);
  });

  test('rejects case creation with missing parameters', async () => {
    await assert.rejects(
      async () => {
        await caseService.createCase({
          guildId: '',
          targetId: 'target_1',
          moderatorId: 'mod_1',
          action: 'BAN'
        });
      },
      /Missing required arguments/
    );
  });
});
