/**
 * VOID Moderator Notes Command
 * Add, view, and remove private internal staff notes on members.
 */

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { extractUserId } = require('../../utils/argumentParser');
const { checkMemberPermissions } = require('../../utils/permissions');
const { voidEmbeds } = require('../../embeds/builder');
const { sendPaginatedEmbed } = require('../../embeds/pagination');

module.exports = {
  name: 'notes',
  description: 'Manage internal staff notes on members.',
  category: 'moderation',
  permissions: [PermissionFlagsBits.ModerateMembers],
  botPermissions: [PermissionFlagsBits.SendMessages],
  prefixUsage: 'notes <add @user <note> | view @user | del <id>>',
  slashUsage: '/notes <add | view | remove>',

  slashBuilder: new SlashCommandBuilder()
    .setName('notes')
    .setDescription('Manage internal staff notes on members.')
    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('Add a staff note to a user')
        .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true))
        .addStringOption(opt => opt.setName('note').setDescription('Note content').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('view')
        .setDescription('View staff notes for a user')
        .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('Delete a staff note by its ID')
        .addIntegerOption(opt => opt.setName('id').setDescription('Note ID').setMinValue(1).setRequired(true))
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  parsePrefixArgs(tokens, rawArgs) {
    if (tokens.length === 0) return { subcommand: 'help' };

    const action = tokens[0].toLowerCase();
    if (action === 'add') {
      const targetId = tokens[1] ? extractUserId(tokens[1]) : null;
      let note = null;
      if (tokens.length > 2) {
        const afterTarget = rawArgs.indexOf(tokens[1]);
        if (afterTarget !== -1) {
          note = rawArgs.slice(afterTarget + tokens[1].length).trim().replace(/^["']|["']$/g, '');
        }
      }
      return { subcommand: 'add', targetId, note };
    }

    if (action === 'view' || action === 'list') {
      const targetId = tokens[1] ? extractUserId(tokens[1]) : null;
      return { subcommand: 'view', targetId };
    }

    if (action === 'del' || action === 'remove' || action === 'delete') {
      const id = tokens[1] ? parseInt(tokens[1], 10) : null;
      return { subcommand: 'remove', id };
    }

    // Default: treat as view if user mention passed: .?notes @user
    const directUser = extractUserId(tokens[0]);
    if (directUser) {
      return { subcommand: 'view', targetId: directUser };
    }

    return { subcommand: 'help' };
  },

  async execute(ctx) {
    // 1. Permission checks
    const memberCheck = checkMemberPermissions(ctx.member, this.permissions);
    if (!memberCheck.has) {
      return ctx.permissionError(`You lack permission: \`${memberCheck.missing.join(', ')}\``);
    }

    const subcommand = ctx.getSubcommand() || 'view';

    // 2. Subcommand: ADD
    if (subcommand === 'add') {
      const targetUser = await ctx.getUser('user');
      const noteText = ctx.getString('note') || ctx.parsedArgs.note;

      if (!targetUser) {
        return ctx.error(`Please specify a valid user.\nUsage: \`${ctx.prefix}notes add @user <note>\``);
      }
      if (!noteText || noteText.trim().length === 0) {
        return ctx.error(`Please provide note content.\nUsage: \`${ctx.prefix}notes add @user <note>\``);
      }

      const noteRecord = await ctx.services.notesService.addNote({
        guildId: ctx.guild.id,
        targetId: targetUser.id,
        moderatorId: ctx.user.id,
        note: noteText.trim()
      });

      if (!noteRecord) {
        return ctx.error('Failed to save staff note.');
      }

      const userTag = targetUser.tag || targetUser.username;
      return ctx.reply({
        embeds: [voidEmbeds.success(`Added Staff Note **#${noteRecord.id}** for **${userTag}**.`)]
      });
    }

    // 3. Subcommand: REMOVE
    if (subcommand === 'remove') {
      const noteId = ctx.getInteger('id') || ctx.parsedArgs.id;
      if (!noteId || isNaN(noteId) || noteId <= 0) {
        return ctx.error(`Please specify a valid note ID.\nUsage: \`${ctx.prefix}notes del <id>\``);
      }

      const deleted = await ctx.services.notesService.deleteNote(ctx.guild.id, noteId);
      if (!deleted) {
        return ctx.error(`Note #${noteId} not found or could not be removed.`);
      }

      return ctx.reply({
        embeds: [voidEmbeds.success(`Deleted Staff Note **#${noteId}**.`)]
      });
    }

    // 4. Subcommand: VIEW
    if (subcommand === 'view') {
      const targetUser = await ctx.getUser('user');
      if (!targetUser) {
        return ctx.error(`Please specify a valid user.\nUsage: \`${ctx.prefix}notes view @user\``);
      }

      const totalCount = await ctx.services.notesService.countNotes(ctx.guild.id, targetUser.id);
      const pageSize = 5;
      const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

      return await sendPaginatedEmbed({
        ctx,
        totalPages,
        getEmbedForPage: async (page) => {
          const offset = (page - 1) * pageSize;
          const notes = await ctx.services.notesService.getNotes(ctx.guild.id, targetUser.id, pageSize, offset);
          return voidEmbeds.notesList({
            target: targetUser,
            notes,
            total: totalCount,
            page,
            totalPages
          });
        }
      });
    }

    // Help overview
    return ctx.reply({
      embeds: [voidEmbeds.createBaseEmbed()
        .setTitle('Staff Notes Usage')
        .setDescription(
          `• \`${ctx.prefix}notes add @user <note>\` — Add staff note\n` +
          `• \`${ctx.prefix}notes view @user\` — View member's notes\n` +
          `• \`${ctx.prefix}notes del <id>\` — Delete a note by ID`
        )]
    });
  }
};
