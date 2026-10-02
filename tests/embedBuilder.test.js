const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { voidEmbeds } = require('../src/embeds/builder');
const { COLORS } = require('../src/embeds/colors');
const { getEmoji, setCustomEmojis, isCustomLoaded } = require('../src/embeds/emojiRegistry');
const { CANONICAL_EMOJI_NAMES } = require('../src/config/emojis');

describe('VOID Embed System & 76 Canonical Emojis', () => {
  test('uses correct pure black palette (#000000) for all embeds', () => {
    assert.equal(COLORS.BLACK, 0x000000);
    assert.equal(COLORS.CHARCOAL, 0x000000);
    assert.equal(COLORS.PANEL, 0x000000);
    assert.equal(COLORS.DEFAULT, 0x000000);
    assert.equal(COLORS.SUCCESS, 0x000000);
    assert.equal(COLORS.ERROR, 0x000000);
    assert.equal(COLORS.WARN, 0x000000);
    assert.equal(COLORS.INFO, 0x000000);
  });

  test('canonical emoji registry defines all 76 emojis with clean fallbacks', () => {
    assert.equal(CANONICAL_EMOJI_NAMES.length, 76, 'Must define exactly 76 canonical emoji names');

    for (const name of CANONICAL_EMOJI_NAMES) {
      const fallback = getEmoji(name);
      assert.ok(fallback, `Canonical emoji '${name}' must return a valid string`);
      assert.equal(typeof fallback, 'string');
      assert.ok(fallback.length > 0, `Emoji fallback for '${name}' must not be empty`);
    }
  });

  test('emoji registry returns Unicode fallbacks and handles unknown keys', () => {
    assert.equal(getEmoji('success'), '✓');
    assert.equal(getEmoji('error'), '✕');
    assert.equal(getEmoji('warning'), '⚠');
    assert.equal(getEmoji('moderator'), '⚔');
    assert.equal(getEmoji('case'), '#');
    assert.equal(getEmoji('unknown_random_key'), '▪');
  });

  test('emoji registry supports custom emoji overrides', () => {
    setCustomEmojis({
      ban: '<:ban:123456789012345678>',
      shield: '<:shield:987654321098765432>'
    });

    assert.equal(getEmoji('ban'), '<:ban:123456789012345678>');
    assert.equal(getEmoji('shield'), '<:shield:987654321098765432>');
    assert.ok(isCustomLoaded('ban'));
  });

  test('builds reference standard multi-section moderation action report', () => {
    const embed = voidEmbeds.moderationAction({
      action: 'Banned',
      target: {
        id: '123456789012345678',
        tag: 'BadActor#0001',
        createdTimestamp: Date.now() - 1000000000,
        bot: false,
        displayAvatarURL: () => 'https://cdn.discordapp.com/avatars/123/abc.png'
      },
      targetMember: {
        joinedTimestamp: Date.now() - 500000000,
        roles: {
          cache: new Map([
            ['111', { id: '111', name: 'Member' }],
            ['222', { id: '222', name: 'Verified' }]
          ])
        }
      },
      moderator: { id: '987654321098765432', tag: 'HeadMod#0001' },
      reason: 'Automated raid coordination',
      caseNumber: 42,
      guild: { id: '55555', name: 'Void Nexus' },
      dmStatus: { delivered: true },
      history: { caseCount: 3, warningCount: 2, noteCount: 1 },
      channelName: 'mod-ops'
    });

    const json = embed.toJSON();
    assert.equal(json.color, COLORS.CHARCOAL);
    assert.match(json.title, /BANNED \[Case #42\]/);
    assert.equal(json.author.name, 'BadActor#0001');
    assert.equal(json.thumbnail.url, 'https://cdn.discordapp.com/avatars/123/abc.png');

    // Asserts 4 distinct sections
    assert.equal(json.fields.length, 4);
    assert.match(json.fields[0].name, /Target Identity/);
    assert.match(json.fields[0].value, /BadActor#0001/);
    assert.match(json.fields[0].value, /123456789012345678/);

    assert.match(json.fields[1].name, /Action Details/);
    assert.match(json.fields[1].value, /BANNED/);
    assert.match(json.fields[1].value, /Automated raid coordination/);
    assert.match(json.fields[1].value, /HeadMod#0001/);
    assert.match(json.fields[1].value, /Void Nexus/);

    assert.match(json.fields[2].name, /Moderation History/);
    assert.match(json.fields[2].value, /Total Cases:\*\*\s*`3`/);
    assert.match(json.fields[2].value, /Warnings:\*\*\s*`2`/);
    assert.match(json.fields[2].value, /Staff Notes:\*\*\s*`1`/);

    assert.match(json.fields[3].name, /Execution Details/);
    assert.match(json.fields[3].value, /Direct Message Delivered/);
    assert.match(json.fields[3].value, /Verified Discord REST Action/);
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
    assert.match(json.title, /TIMED OUT \[Case #7\]/);
    assert.equal(json.fields.length, 4);
    assert.match(json.fields[1].value, /Duration.*10m/);
  });

  test('builds moderation log embed with author and fields', () => {
    const embed = voidEmbeds.moderationLog({
      action: 'BAN',
      target: { id: '123', tag: 'User#123' },
      moderator: { id: '456', tag: 'Mod#456' },
      reason: 'Malicious link',
      caseNumber: 15,
      channelName: 'general',
      dmStatus: { delivered: true }
    });

    const json = embed.toJSON();
    assert.equal(json.color, COLORS.BLACK);
    assert.equal(json.author.name, 'Case #15 • BAN');
    assert.ok(json.fields.some(f => f.name.includes('Target')));
    assert.ok(json.fields.some(f => f.name.includes('Moderator')));
    assert.ok(json.fields.some(f => f.name.includes('Reason')));
  });

  test('builds purge report embed', () => {
    const embed = voidEmbeds.purgeReport({
      deletedCount: 25,
      channel: { id: 'chan_123', name: 'general' },
      moderator: { id: 'mod_123', tag: 'Mod#0001' },
      requestedCount: 30
    });

    const json = embed.toJSON();
    assert.match(json.title, /Purge Complete/);
    assert.ok(json.fields.some(f => f.value.includes('25')));
  });

  test('builds lock and unlock report embeds', () => {
    const lock = voidEmbeds.lockReport({
      channel: { id: 'chan_1', name: 'lounge' },
      moderator: { id: 'mod_1', tag: 'Mod#0001' },
      reason: 'Raid incident'
    });
    const lockJson = lock.toJSON();
    assert.match(lockJson.title, /Channel Locked/);

    const unlock = voidEmbeds.unlockReport({
      channel: { id: 'chan_1', name: 'lounge' },
      moderator: { id: 'mod_1', tag: 'Mod#0001' }
    });
    const unlockJson = unlock.toJSON();
    assert.match(unlockJson.title, /Channel Unlocked/);
  });

  test('builds serverinfo embed with complete metrics', () => {
    const mockGuild = {
      id: '999888777',
      name: 'Test Server',
      ownerId: '111222333',
      createdTimestamp: Date.now() - 1000000,
      memberCount: 150,
      verificationLevel: 2,
      explicitContentFilter: 1,
      mfaLevel: 1,
      premiumTier: 2,
      premiumSubscriptionCount: 7,
      members: { cache: new Map() },
      channels: { cache: new Map() },
      roles: { cache: new Map() },
      emojis: { cache: new Map() },
      stickers: { cache: new Map() }
    };

    const embed = voidEmbeds.serverInfo({ guild: mockGuild });
    const json = embed.toJSON();
    assert.match(json.title, /Test Server/);
    assert.ok(json.fields.some(f => f.name.includes('Population')));
    assert.ok(json.fields.some(f => f.name.includes('Channels')));
    assert.ok(json.fields.some(f => f.name.includes('Security')));
  });

  test('builds warnings archive embed', () => {
    const embed = voidEmbeds.warningsList({
      target: { id: '123', tag: 'User#123' },
      warnings: [
        { reason: 'First warning', moderator_id: '456', created_at: new Date().toISOString() }
      ],
      total: 1
    });

    const json = embed.toJSON();
    assert.match(json.title, /Warnings Archive.*User#123/);
    assert.equal(json.fields.length, 1);
  });

  test('builds error, permission, and validation embeds', () => {
    const err = voidEmbeds.error('Invalid user target.');
    assert.match(err.toJSON().description, /Invalid user target\./);

    const perm = voidEmbeds.permissionError('You lack BanMembers permission.');
    assert.match(perm.toJSON().description, /Permission Denied/);

    const val = voidEmbeds.validationError('Number out of range', 'purge <1-100>');
    assert.match(val.toJSON().description, /Validation Error/);
    assert.match(val.toJSON().description, /purge <1-100>/);
  });

  test('enforces pure black color (#000000 / 0x000000) consistently across all embed types', () => {
    const embeds = [
      voidEmbeds.moderationAction({
        action: 'Banned',
        target: { id: '111', tag: 'User#111' },
        moderator: { id: '222', tag: 'Mod#222' }
      }),
      voidEmbeds.moderationLog({
        action: 'KICK',
        target: { id: '111', tag: 'User#111' },
        moderator: { id: '222', tag: 'Mod#222' }
      }),
      voidEmbeds.purgeReport({
        deletedCount: 10,
        channel: { id: 'chan_1', name: 'general' },
        moderator: { id: '222', tag: 'Mod#222' }
      }),
      voidEmbeds.lockReport({
        channel: { id: 'chan_1', name: 'general' },
        moderator: { id: '222', tag: 'Mod#222' }
      }),
      voidEmbeds.unlockReport({
        channel: { id: 'chan_1', name: 'general' },
        moderator: { id: '222', tag: 'Mod#222' }
      }),
      voidEmbeds.slowmodeReport({
        channel: { id: 'chan_1', name: 'general' },
        seconds: 5,
        moderator: { id: '222', tag: 'Mod#222' }
      }),
      voidEmbeds.clearWarningsReport({
        target: { id: '111', tag: 'User#111' },
        clearedCount: 2,
        moderator: { id: '222', tag: 'Mod#222' }
      }),
      voidEmbeds.warningsList({
        target: { id: '111', tag: 'User#111' },
        warnings: []
      }),
      voidEmbeds.caseDetails({
        id: 1,
        action: 'BAN',
        target_id: '111',
        moderator_id: '222'
      }),
      voidEmbeds.userInfo({
        user: { id: '111', username: 'user1' }
      }),
      voidEmbeds.serverInfo({
        guild: { id: 'guild_1', name: 'Test Guild', ownerId: '222' }
      }),
      voidEmbeds.botInfo({
        uptime: '1h',
        guildsCount: 5,
        usersCount: 100,
        nodeVersion: 'v20',
        djsVersion: '14.18.0'
      }),
      voidEmbeds.config({ prefix: '.?' }),
      voidEmbeds.setup({ prefix: '.?' }),
      voidEmbeds.help({ prefix: '.?', categories: { moderation: [] } }),
      voidEmbeds.notesList({
        target: { id: '111', tag: 'User#111' },
        notes: []
      }),
      voidEmbeds.modHistory({
        target: { id: '111', tag: 'User#111' },
        cases: []
      }),
      voidEmbeds.automodOverview({
        config: { enabled: true },
        guildName: 'Test Guild'
      }),
      voidEmbeds.antiraidOverview({
        config: { enabled: true },
        guildName: 'Test Guild'
      }),
      voidEmbeds.noPrefixStatus({
        isEnabled: true,
        isUserAuthorized: true,
        allowedCount: 1,
        userId: '111',
        prefix: '.?'
      }),
      voidEmbeds.success('Success message'),
      voidEmbeds.error('Error message'),
      voidEmbeds.permissionError('Permission message'),
      voidEmbeds.validationError('Validation message')
    ];

    for (const em of embeds) {
      assert.equal(em.toJSON().color, 0x000000, 'Embed must have pure black color (#000000)');
    }
  });

  test('strictly eliminates raw user (<@ID>) and role (<@&ID>) mentions inside embeds', () => {
    const modAction = voidEmbeds.moderationAction({
      action: 'Banned',
      target: { id: '111222333444555666', tag: 'BadUser#0001' },
      moderator: { id: '999888777666555444', tag: 'GoodMod#0001' },
      reason: 'Raid coordination',
      caseNumber: 99
    });
    const actionJson = JSON.stringify(modAction.toJSON());
    assert.ok(!actionJson.includes('<@111222333444555666>'), 'Must not contain target user mention');
    assert.ok(!actionJson.includes('<@999888777666555444>'), 'Must not contain moderator user mention');
    assert.ok(!actionJson.includes('<@&'), 'Must not contain raw role mentions');

    const modLog = voidEmbeds.moderationLog({
      action: 'MUTE',
      target: { id: '111222333444555666', tag: 'BadUser#0001' },
      moderator: { id: '999888777666555444', tag: 'GoodMod#0001' },
      caseNumber: 100
    });
    const logJson = JSON.stringify(modLog.toJSON());
    assert.ok(!logJson.includes('<@111222333444555666>'), 'Log embed must not contain raw target mention');
    assert.ok(!logJson.includes('<@999888777666555444>'), 'Log embed must not contain raw moderator mention');
  });

  test('uses disciplined section headings with plain text and at most 1 emoji in title', () => {
    const modAction = voidEmbeds.moderationAction({
      action: 'Banned',
      target: { id: '111', tag: 'User#111' },
      moderator: { id: '222', tag: 'Mod#222' }
    });
    const json = modAction.toJSON();

    // Section field names are clean plain text
    assert.equal(json.fields[0].name, 'Target Identity');
    assert.equal(json.fields[1].name, 'Action Details');
    assert.equal(json.fields[2].name, 'Moderation History');
    assert.equal(json.fields[3].name, 'Execution Details');

    // Title has at most one emoji followed by action
    assert.match(json.title, /^(\S+)\s+BANNED/);
  });
});
