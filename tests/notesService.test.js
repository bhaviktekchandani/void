const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { notesService } = require('../src/services/notesService');

describe('NotesService Resiliency & Operations', () => {
  test('returns empty array gracefully without database', async () => {
    const notes = await notesService.getNotes('guild_offline_test', 'user_1', 5, 0);
    assert.deepEqual(notes, []);

    const count = await notesService.countNotes('guild_offline_test', 'user_1');
    assert.equal(count, 0);

    const deleted = await notesService.deleteNote('guild_offline_test', 999);
    assert.equal(deleted, false);
  });

  test('validates required parameters for addNote', async () => {
    await assert.rejects(
      async () => {
        await notesService.addNote({
          guildId: '',
          targetId: 'user_1',
          moderatorId: 'mod_1',
          note: 'test note'
        });
      },
      /Missing required arguments/
    );
  });
});
