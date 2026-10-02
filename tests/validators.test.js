const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  parseDuration,
  formatDuration,
  validateTimeoutDuration,
  validatePurgeCount,
  validateSlowmode,
  isValidSnowflake,
  validatePrefix
} = require('../src/utils/validators');

describe('Validators & Formatters', () => {
  test('parses duration strings accurately', () => {
    assert.equal(parseDuration('10s'), 10 * 1000);
    assert.equal(parseDuration('5m'), 5 * 60 * 1000);
    assert.equal(parseDuration('2h'), 2 * 60 * 60 * 1000);
    assert.equal(parseDuration('3d'), 3 * 24 * 60 * 60 * 1000);
    assert.equal(parseDuration('1w'), 7 * 24 * 60 * 60 * 1000);
    assert.equal(parseDuration('invalid'), null);
    assert.equal(parseDuration('0m'), null);
    assert.equal(parseDuration('-5m'), null);
  });

  test('formats durations into human-readable strings', () => {
    assert.equal(formatDuration(30 * 1000), '30s');
    assert.equal(formatDuration(5 * 60 * 1000), '5m 0s');
    assert.equal(formatDuration(2 * 60 * 60 * 1000 + 15 * 60 * 1000), '2h 15m');
    assert.equal(formatDuration(3 * 24 * 60 * 60 * 1000), '3d 0h');
  });

  test('validates Discord timeout constraints (1s to 28d)', () => {
    // 500ms is too short
    assert.equal(validateTimeoutDuration(500).valid, false);
    // 10 minutes is valid
    assert.equal(validateTimeoutDuration(10 * 60 * 1000).valid, true);
    // 29 days is too long
    assert.equal(validateTimeoutDuration(29 * 24 * 60 * 60 * 1000).valid, false);
  });

  test('validates purge count (1 to 100)', () => {
    assert.equal(validatePurgeCount(0).valid, false);
    assert.equal(validatePurgeCount(1).valid, true);
    assert.equal(validatePurgeCount(50).valid, true);
    assert.equal(validatePurgeCount(100).valid, true);
    assert.equal(validatePurgeCount(101).valid, false);
    assert.equal(validatePurgeCount('abc').valid, false);
  });

  test('validates slowmode bounds (0 to 21600 seconds)', () => {
    assert.equal(validateSlowmode(0).valid, true);
    assert.equal(validateSlowmode(60).valid, true);
    assert.equal(validateSlowmode(21600).valid, true);
    assert.equal(validateSlowmode(-1).valid, false);
    assert.equal(validateSlowmode(21601).valid, false);
  });

  test('validates snowflake IDs', () => {
    assert.equal(isValidSnowflake('123456789012345678'), true);
    assert.equal(isValidSnowflake('123456'), false);
    assert.equal(isValidSnowflake('non-numeric-id'), false);
  });

  test('validates custom prefix constraints', () => {
    assert.equal(validatePrefix('.?').valid, true);
    assert.equal(validatePrefix('!').valid, true);
    assert.equal(validatePrefix('void.').valid, true);
    assert.equal(validatePrefix('').valid, false);
    assert.equal(validatePrefix('   ').valid, false);
    assert.equal(validatePrefix('toolongprefix123').valid, false);
    assert.equal(validatePrefix('"').valid, false);
  });
});
