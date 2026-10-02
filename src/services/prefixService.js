/**
 * VOID Prefix Service
 * Handles server-specific prefix validation and management.
 */

const { configService, DEFAULT_PREFIX } = require('./configService');
const { validatePrefix } = require('../utils/validators');

class PrefixService {
  /**
   * Get server prefix.
   * @param {string} guildId
   * @returns {Promise<string>}
   */
  async getPrefix(guildId) {
    if (!guildId) return DEFAULT_PREFIX;
    return await configService.getPrefix(guildId);
  }

  /**
   * Set custom server prefix with validation.
   * @param {string} guildId
   * @param {string} newPrefix
   * @returns {Promise<{ success: boolean, prefix?: string, error?: string }>}
   */
  async setPrefix(guildId, newPrefix) {
    const validation = validatePrefix(newPrefix);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const applied = await configService.setPrefix(guildId, validation.prefix);
    return { success: true, prefix: applied };
  }

  getDefaultPrefix() {
    return DEFAULT_PREFIX;
  }
}

const prefixService = new PrefixService();

module.exports = { prefixService, DEFAULT_PREFIX };
