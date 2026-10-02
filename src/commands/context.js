/**
 * VOID Command Context
 * Unifies Discord Interactions and Prefix Messages into an identical execution context.
 */

const { voidEmbeds } = require('../embeds/builder');
const { configService } = require('../services/configService');
const { prefixService } = require('../services/prefixService');
const { caseService } = require('../services/caseService');
const { warningService } = require('../services/warningService');
const { moderationService } = require('../services/moderationService');
const { notesService } = require('../services/notesService');
const { automodService } = require('../services/automodService');
const { antiraidService } = require('../services/antiraidService');
const { lockService } = require('../services/lockService');
const { eventLogService } = require('../services/eventLogService');
const { noPrefixService } = require('../services/noPrefixService');

class CommandContext {
  /**
   * @param {object} params
   * @param {boolean} params.isSlash
   * @param {import('discord.js').ChatInputCommandInteraction|null} [params.interaction]
   * @param {import('discord.js').Message|null} [params.message]
   * @param {string} params.commandName
   * @param {string} params.prefix
   * @param {object} [params.parsedArgs] Key-value pairs for prefix commands
   * @param {string[]} [params.tokens] Raw positional tokens
   * @param {boolean} [params.usedNoPrefix] True if invoked via no-prefix system
   */
  constructor({ isSlash, interaction = null, message = null, commandName, prefix = '.?', parsedArgs = {}, tokens = [], usedNoPrefix = false }) {
    this.isSlash = isSlash;
    this.interaction = interaction;
    this.message = message;
    this.commandName = commandName;
    this.prefix = prefix;
    this.parsedArgs = parsedArgs;
    this.tokens = tokens;
    this.usedNoPrefix = usedNoPrefix;

    this.guild = isSlash ? interaction.guild : message.guild;
    this.channel = isSlash ? interaction.channel : message.channel;
    this.member = isSlash ? interaction.member : message.member;
    this.user = isSlash ? interaction.user : message.author;
    this.client = isSlash ? interaction.client : message.client;

    this.services = {
      configService,
      prefixService,
      caseService,
      warningService,
      moderationService,
      notesService,
      automodService,
      antiraidService,
      lockService,
      eventLogService,
      noPrefixService
    };

    this.replied = false;
    this.deferred = false;
  }

  /**
   * Get an argument string value.
   * @param {string} name
   * @returns {string|null}
   */
  getString(name) {
    if (this.isSlash) {
      return this.interaction.options.getString(name);
    }
    return this.parsedArgs[name] !== undefined ? String(this.parsedArgs[name]) : null;
  }

  /**
   * Get an integer argument value.
   * @param {string} name
   * @returns {number|null}
   */
  getInteger(name) {
    if (this.isSlash) {
      return this.interaction.options.getInteger(name);
    }
    const val = this.parsedArgs[name];
    if (val === undefined || val === null) return null;
    const num = parseInt(val, 10);
    return isNaN(num) ? null : num;
  }

  /**
   * Get target User object.
   * @param {string} name
   * @returns {Promise<import('discord.js').User|null>}
   */
  async getUser(name) {
    if (this.isSlash) {
      return this.interaction.options.getUser(name);
    }

    const userId = this.parsedArgs[name] || this.parsedArgs['targetId'] || this.parsedArgs['user'];
    if (!userId) return null;

    try {
      return await this.client.users.fetch(userId);
    } catch {
      return null;
    }
  }

  /**
   * Get target GuildMember object.
   * @param {string} name
   * @returns {Promise<import('discord.js').GuildMember|null>}
   */
  async getMember(name) {
    if (this.isSlash) {
      return this.interaction.options.getMember(name);
    }

    const userId = this.parsedArgs[name] || this.parsedArgs['targetId'] || this.parsedArgs['user'];
    if (!userId || !this.guild) return null;

    try {
      return await this.guild.members.fetch(userId);
    } catch {
      return null;
    }
  }

  /**
   * Get Channel argument.
   * @param {string} name
   * @returns {Promise<import('discord.js').GuildChannel|null>}
   */
  async getChannel(name) {
    if (this.isSlash) {
      return this.interaction.options.getChannel(name);
    }

    const channelId = this.parsedArgs[name] || this.parsedArgs['channel'];
    if (!channelId || !this.guild) return null;

    try {
      return await this.guild.channels.fetch(channelId);
    } catch {
      return null;
    }
  }

  /**
   * Get subcommand name.
   * @returns {string|null}
   */
  getSubcommand() {
    if (this.isSlash) {
      try {
        return this.interaction.options.getSubcommand();
      } catch {
        return null;
      }
    }
    return this.parsedArgs.subcommand || null;
  }

  /**
   * Defer reply if command execution takes time.
   */
  async deferReply() {
    if (this.isSlash && !this.interaction.deferred && !this.interaction.replied) {
      await this.interaction.deferReply();
      this.deferred = true;
    }
  }

  /**
   * Send response back to the channel or interaction. Public by default.
   * @param {string|object} options
   */
  async reply(options) {
    const rawPayload = typeof options === 'string' ? { content: options } : (options || {});
    const payload = {
      ...rawPayload,
      allowedMentions: {
        parse: [],
        repliedUser: false,
        ...(rawPayload && rawPayload.allowedMentions ? rawPayload.allowedMentions : {})
      }
    };

    if (this.isSlash) {
      if (this.interaction.deferred) {
        this.replied = true;
        return await this.interaction.editReply(payload);
      }
      if (this.interaction.replied) {
        return await this.interaction.followUp(payload);
      }
      this.replied = true;
      return await this.interaction.reply(payload);
    }

    this.replied = true;
    return await this.message.reply(payload);
  }

  /**
   * Convenience helper to send error embed.
   * @param {string} message
   */
  async error(message) {
    return await this.reply({ embeds: [voidEmbeds.error(message)] });
  }

  /**
   * Convenience helper to send permission failure embed.
   * @param {string} message
   */
  async permissionError(message) {
    return await this.reply({ embeds: [voidEmbeds.permissionError(message)] });
  }

  /**
   * Convenience helper to send success embed.
   * @param {string} message
   */
  async success(message) {
    return await this.reply({ embeds: [voidEmbeds.success(message)] });
  }
}

module.exports = { CommandContext };
