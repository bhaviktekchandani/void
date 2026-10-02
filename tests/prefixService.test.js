const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { prefixService } = require('../src/services/prefixService');
const { configService } = require('../src/services/configService');

describe('PrefixService', () => {
  beforeEach(() => {
    configService.clearCache();
  });

  test('returns default prefix .? when guild has no custom prefix', async () => {
    const prefix = await prefixService.getPrefix('guild_test_1');
    assert.equal(prefix, '.?');
  });

  test('sets valid custom prefix successfully', async () => {
    const res = await prefixService.setPrefix('guild_test_2', '!');
    assert.equal(res.success, true);
    assert.equal(res.prefix, '!');

    const retrieved = await prefixService.getPrefix('guild_test_2');
    assert.equal(retrieved, '!');
  });

  test('rejects invalid prefixes (empty, whitespace, quotes, too long)', async () => {
    const resEmpty = await prefixService.setPrefix('guild_test_3', '');
    assert.equal(resEmpty.success, false);

    const resWhitespace = await prefixService.setPrefix('guild_test_3', '   ');
    assert.equal(resWhitespace.success, false);

    const resQuotes = await prefixService.setPrefix('guild_test_3', 'prefix"');
    assert.equal(resQuotes.success, false);

    const resTooLong = await prefixService.setPrefix('guild_test_3', '12345678901');
    assert.equal(resTooLong.success, false);
  });
});
