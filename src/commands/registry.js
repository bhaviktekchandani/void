/**
 * VOID Command Registry
 * Loads, organizes, and exposes all commands for slash and prefix execution.
 */

const fs = require('fs');
const path = require('path');
const { logger } = require('../utils/logger');

class CommandRegistry {
  constructor() {
    /** @type {Map<string, object>} */
    this.commands = new Map();
    /** @type {Map<string, string>} */
    this.aliases = new Map();
  }

  /**
   * Register a command module.
   * @param {object} command
   */
  register(command) {
    if (!command.name || !command.execute) {
      throw new Error(`Invalid command definition: missing name or execute handler`);
    }

    const name = command.name.toLowerCase();
    this.commands.set(name, command);

    if (Array.isArray(command.aliases)) {
      for (const alias of command.aliases) {
        this.aliases.set(alias.toLowerCase(), name);
      }
    }

    logger.debug(`Registered command: ${name} [${command.category || 'general'}]`);
  }

  /**
   * Get a command by name or alias.
   * @param {string} name
   * @returns {object|null}
   */
  get(name) {
    if (!name) return null;
    const lower = name.toLowerCase();
    const resolvedName = this.aliases.get(lower) || lower;
    return this.commands.get(resolvedName) || null;
  }

  /**
   * Get all registered commands as an array.
   * @returns {object[]}
   */
  getAll() {
    return Array.from(this.commands.values());
  }

  /**
   * Get commands grouped by category.
   * @returns {Record<string, object[]>}
   */
  getByCategory() {
    const categories = {};
    for (const cmd of this.commands.values()) {
      const cat = cmd.category || 'other';
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(cmd);
    }
    return categories;
  }

  /**
   * Build slash command data JSON payloads for Discord API registration.
   * @returns {object[]}
   */
  getSlashData() {
    const slashList = [];
    for (const cmd of this.commands.values()) {
      if (cmd.slashBuilder) {
        if (typeof cmd.slashBuilder.toJSON === 'function') {
          slashList.push(cmd.slashBuilder.toJSON());
        } else {
          slashList.push(cmd.slashBuilder);
        }
      }
    }
    return slashList;
  }

  /**
   * Automatically load all command files from standard directories.
   */
  loadAll() {
    const categories = ['moderation', 'utility', 'configuration'];
    for (const category of categories) {
      const dirPath = path.join(__dirname, category);
      if (fs.existsSync(dirPath)) {
        const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.js'));
        for (const file of files) {
          try {
            const cmd = require(path.join(dirPath, file));
            this.register(cmd);
          } catch (err) {
            logger.error(`Failed to load command file ${file} in ${category}`, err);
          }
        }
      }
    }
    logger.info(`Loaded ${this.commands.size} commands across ${categories.length} categories.`);
  }
}

const commandRegistry = new CommandRegistry();

module.exports = { commandRegistry, CommandRegistry };
