const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  tokenize,
  extractUserId,
  extractChannelId,
  parsePrefixMessage
} = require('../src/utils/argumentParser');

describe('ArgumentParser & Tokenization', () => {
  test('parses default .? prefix correctly', () => {
    const result = parsePrefixMessage('.?ban 123456789012345678 Spamming in chat', '.?');
    assert.equal(result.isCommand, true);
    assert.equal(result.commandName, 'ban');
    assert.equal(result.tokens.length, 4);
    assert.equal(result.tokens[0], '123456789012345678');
  });

  test('parses custom prefix correctly', () => {
    const result = parsePrefixMessage('!kick 123456789012345678 Inappropriate language', '!');
    assert.equal(result.isCommand, true);
    assert.equal(result.commandName, 'kick');
    assert.equal(result.tokens[0], '123456789012345678');
  });

  test('ignores message with wrong prefix', () => {
    const result = parsePrefixMessage('!help', '.?');
    assert.equal(result.isCommand, false);
  });

  test('ignores ordinary message without prefix', () => {
    const result = parsePrefixMessage('hello everyone', '.?');
    assert.equal(result.isCommand, false);
  });

  test('parses double-quoted and single-quoted arguments', () => {
    const tokens = tokenize('123456789012345678 "Spamming in public chat" \'Extra note\'');
    assert.deepEqual(tokens, [
      '123456789012345678',
      'Spamming in public chat',
      'Extra note'
    ]);
  });

  test('extracts user ID from standard and nickname mentions', () => {
    assert.equal(extractUserId('<@123456789012345678>'), '123456789012345678');
    assert.equal(extractUserId('<@!123456789012345678>'), '123456789012345678');
    assert.equal(extractUserId('123456789012345678'), '123456789012345678');
    assert.equal(extractUserId('invalid-id'), null);
  });

  test('extracts channel ID from channel mention', () => {
    assert.equal(extractChannelId('<#987654321098765432>'), '987654321098765432');
    assert.equal(extractChannelId('987654321098765432'), '987654321098765432');
    assert.equal(extractChannelId('random-text'), null);
  });

  test('parses subcommands like prefix set ! correctly', () => {
    const result = parsePrefixMessage('.?prefix set !', '.?');
    assert.equal(result.isCommand, true);
    assert.equal(result.commandName, 'prefix');
    assert.deepEqual(result.tokens, ['set', '!']);
  });
});
