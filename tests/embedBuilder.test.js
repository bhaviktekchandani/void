const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { voidEmbeds } = require('../src/embeds/builder');
const { COLORS } = require('../src/embeds/colors');
const { getEmoji } = require('../src/embeds/emojiRegistry');

describe('VOID Embed System & Styling', () => {
  test('uses correct charcoal and black palette', () => {
    assert.equal(COLORS.BLACK, 0x000000);
    assert.equal(COLORS.CHARCOAL, 0x111111);
    assert.equal(COLORS.PANEL, 0x181818);
  });

  test('emoji registry returns Unicode fallback when no custom emoji is configured', () => {
    assert.equal(getEmoji('SUCCESS'), '✓');
    assert.equal(getEmoji('FAILURE'), '✕');
    assert.equal(getEmoji('WARNING'), '⚠');
    assert.equal(getEmoji('MOD'), '◆');
    assert.equal(getEmoji('CASE'), '◇');
    assert.equal(getEmoji('UNKNOWN_KEY'), '▪');
  });

  test('builds moderation action embed correctly', () => {
    const embed = voidEmbeds.moderationAction({
      action: 'Banned',
      target: { id: '123456789012345678', tag: 'BadActor#0001' },
      moderator: { id: '987654321098765432', tag: 'Mod#0001' },
      reason: 'Rule 1 violation',
      caseNumber: 42
    });

    const json = embed.toJSON();
    assert.equal(json.color, COLORS.CHARCOAL);
    assert.match(json.title, /BANNED \[Case #42\]/);
    assert.equal(json.fields.length, 3);
    assert.equal(json.fields[0].name, 'User');
    assert.equal(json.fields[1].name, 'Moderator');
    assert.equal(json.fields[2].name, 'Reason');
    assert.equal(json.fields[2].value, 'Rule 1 violation');
  });

  test('builds moderation action embed with duration for timeouts', () => {
    const embed = voidEmbeds.moderationAction({
      action: 'Timed Out',
      target: { id: '123456789012345678', tag: 'BadActor#0001' },
      moderator: { id: '987654321098765432', tag: 'Mod#0001' },
      reason: 'Spamming',
      duration: '10m',
      caseNumber: 7
    });

    const json = embed.toJSON();
    assert.equal(json.fields.length, 4);
    assert.equal(json.fields[2].name, 'Duration');
    assert.match(json.fields[2].value, /10m/);
  });

  test('builds moderation log embed with author and fields', () => {
    const embed = voidEmbeds.moderationLog({
      action: 'BAN',
      target: { id: '123', tag: 'User#123' },
      moderator: { id: '456', tag: 'Mod#456' },
      reason: 'Malicious link',
      caseNumber: 15,
      channelName: 'general'
    });

    const json = embed.toJSON();
    assert.equal(json.color, COLORS.BLACK);
    assert.equal(json.author.name, 'Case #15 • BAN');
  });

  test('builds warnings list embed', () => {
    const embed = voidEmbeds.warningsList({
      target: { id: '123', tag: 'User#123' },
      warnings: [
        { reason: 'First warning', moderator_id: '456', created_at: new Date().toISOString() }
      ],
      total: 1
    });

    const json = embed.toJSON();
    assert.match(json.title, /Warnings for User#123/);
    assert.equal(json.fields.length, 1);
  });

  test('builds error embed without technical clutter', () => {
    const embed = voidEmbeds.error('Invalid user target.');
    const json = embed.toJSON();
    assert.match(json.description, /Invalid user target\./);
    assert.equal(json.fields, undefined);
  });

  test('builds permission failure embed', () => {
    const embed = voidEmbeds.permissionError('You lack BanMembers permission.');
    const json = embed.toJSON();
    assert.match(json.description, /Permission Denied/);
  });
});
