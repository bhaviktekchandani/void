/**
 * VOID Event Log Service
 * Dispatches audit embeds for joins, leaves, member role/nickname/timeout updates, and bans.
 */

const { configService } = require('./configService');
const { voidEmbeds } = require('../embeds/builder');
const { logger } = require('../utils/logger');

class EventLogService {
  /**
   * Get designated event log channel for a guild.
   */
  async getChannel(guild) {
    const cfg = await configService.getConfig(guild.id);
    const targetChannelId = cfg.event_log_channel_id || cfg.log_channel_id;
    if (!targetChannelId) return null;

    try {
      const channel = await guild.channels.fetch(targetChannelId).catch(() => null);
      return channel && channel.isTextBased() ? channel : null;
    } catch {
      return null;
    }
  }

  async logMemberJoin(member) {
    const channel = await this.getChannel(member.guild);
    if (!channel) return;

    const embed = voidEmbeds.createBaseEmbed();
    embed.setTitle(`Member Joined`);
    embed.setDescription(
      `**User:** ${member.user.tag} \`(${member.user.id})\`\n` +
      `**Account Created:** <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`
    );
    embed.setThumbnail(member.user.displayAvatarURL());

    await channel.send({ embeds: [embed] }).catch(() => null);
  }

  async logMemberLeave(member) {
    const channel = await this.getChannel(member.guild);
    if (!channel) return;

    const embed = voidEmbeds.createBaseEmbed();
    embed.setTitle(`Member Left`);
    embed.setDescription(`**User:** ${member.user.tag || member.user.username} \`(${member.user.id})\``);

    await channel.send({ embeds: [embed] }).catch(() => null);
  }

  async logMemberUpdate(oldMember, newMember) {
    const channel = await this.getChannel(newMember.guild);
    if (!channel) return;

    // 1. Nickname changes
    if (oldMember.nickname !== newMember.nickname) {
      const embed = voidEmbeds.createBaseEmbed();
      embed.setTitle(`Nickname Changed`);
      embed.setDescription(
        `**User:** <@${newMember.id}> \`(${newMember.id})\`\n` +
        `**Before:** \`${oldMember.nickname || 'None'}\`\n` +
        `**After:** \`${newMember.nickname || 'None'}\``
      );
      await channel.send({ embeds: [embed] }).catch(() => null);
      return;
    }

    // 2. Timeout changes
    const oldTimeout = oldMember.communicationDisabledUntilTimestamp;
    const newTimeout = newMember.communicationDisabledUntilTimestamp;
    const now = Date.now();

    if ((!oldTimeout || oldTimeout <= now) && (newTimeout && newTimeout > now)) {
      const embed = voidEmbeds.createBaseEmbed();
      embed.setTitle(`Timeout Applied`);
      embed.setDescription(
        `**User:** <@${newMember.id}> \`(${newMember.id})\`\n` +
        `**Expires:** <t:${Math.floor(newTimeout / 1000)}:R>`
      );
      await channel.send({ embeds: [embed] }).catch(() => null);
      return;
    }

    if ((oldTimeout && oldTimeout > now) && (!newTimeout || newTimeout <= now)) {
      const embed = voidEmbeds.createBaseEmbed();
      embed.setTitle(`Timeout Removed`);
      embed.setDescription(`**User:** <@${newMember.id}> \`(${newMember.id})\``);
      await channel.send({ embeds: [embed] }).catch(() => null);
      return;
    }

    // 3. Role changes
    const addedRoles = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
    const removedRoles = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));

    if (addedRoles.size > 0 || removedRoles.size > 0) {
      const embed = voidEmbeds.createBaseEmbed();
      embed.setTitle(`Roles Updated`);
      const lines = [`**User:** <@${newMember.id}>`];
      if (addedRoles.size > 0) {
        lines.push(`**Added:** ${addedRoles.map(r => `<@&${r.id}>`).join(' ')}`);
      }
      if (removedRoles.size > 0) {
        lines.push(`**Removed:** ${removedRoles.map(r => `<@&${r.id}>`).join(' ')}`);
      }
      embed.setDescription(lines.join('\n'));
      await channel.send({ embeds: [embed] }).catch(() => null);
    }
  }

  async logBanAdd(ban) {
    const channel = await this.getChannel(ban.guild);
    if (!channel) return;

    const embed = voidEmbeds.createBaseEmbed();
    embed.setTitle(`User Banned`);
    embed.setDescription(
      `**User:** ${ban.user.tag || ban.user.username} \`(${ban.user.id})\`\n` +
      `**Audit Reason:** ${ban.reason || 'None provided'}`
    );
    await channel.send({ embeds: [embed] }).catch(() => null);
  }

  async logBanRemove(ban) {
    const channel = await this.getChannel(ban.guild);
    if (!channel) return;

    const embed = voidEmbeds.createBaseEmbed();
    embed.setTitle(`User Unbanned`);
    embed.setDescription(`**User:** ${ban.user.tag || ban.user.username} \`(${ban.user.id})\``);
    await channel.send({ embeds: [embed] }).catch(() => null);
  }
}

const eventLogService = new EventLogService();

module.exports = { eventLogService };
