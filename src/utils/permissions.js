/**
 * VOID Permission and Role Hierarchy Validation
 * Ensures all moderation actions adhere to strict safety rules.
 */

const { PermissionsBitField } = require('discord.js');

/**
 * Format permission names cleanly.
 * @param {bigint|string} perm
 * @returns {string}
 */
function formatPermissionName(perm) {
  if (typeof perm === 'string') return perm;
  const bitfield = new PermissionsBitField(perm);
  return bitfield.toArray().join(', ') || 'Unknown Permission';
}

/**
 * Check if the invoking member has the required permissions.
 * @param {import('discord.js').GuildMember} member
 * @param {bigint[]} requiredPermissions
 * @returns {{ has: boolean, missing: string[] }}
 */
function checkMemberPermissions(member, requiredPermissions = []) {
  if (!member || !member.permissions) {
    return { has: false, missing: ['Unknown'] };
  }

  // Guild owner always has permission
  if (member.guild && member.guild.ownerId === member.id) {
    return { has: true, missing: [] };
  }

  const missing = [];
  for (const perm of requiredPermissions) {
    if (!member.permissions.has(perm)) {
      missing.push(new PermissionsBitField(perm).toArray()[0] || 'Required Permission');
    }
  }

  return {
    has: missing.length === 0,
    missing
  };
}

/**
 * Check if the bot member has the required permissions in guild and channel.
 * @param {import('discord.js').GuildMember} botMember
 * @param {bigint[]} requiredPermissions
 * @param {import('discord.js').GuildChannel} [channel]
 * @returns {{ has: boolean, missing: string[] }}
 */
function checkBotPermissions(botMember, requiredPermissions = [], channel = null) {
  if (!botMember || !botMember.permissions) {
    return { has: false, missing: ['Bot permissions unavailable'] };
  }

  const permissions = channel && channel.permissionsFor
    ? channel.permissionsFor(botMember)
    : botMember.permissions;

  const missing = [];
  for (const perm of requiredPermissions) {
    if (!permissions.has(perm)) {
      missing.push(new PermissionsBitField(perm).toArray()[0] || 'Required Permission');
    }
  }

  return {
    has: missing.length === 0,
    missing
  };
}

/**
 * Validate role hierarchy and moderation target eligibility.
 * @param {object} params
 * @param {import('discord.js').GuildMember} params.moderatorMember
 * @param {import('discord.js').GuildMember} params.botMember
 * @param {import('discord.js').GuildMember|null} params.targetMember
 * @param {string} params.targetUserId
 * @returns {{ canAct: boolean, reason?: string }}
 */
function validateHierarchy({ moderatorMember, botMember, targetMember, targetUserId }) {
  const guild = moderatorMember.guild;

  // 1. Prevent self-targeting
  if (moderatorMember.id === targetUserId) {
    return { canAct: false, reason: 'You cannot perform moderation actions against yourself.' };
  }

  // 2. Prevent targeting the bot itself
  if (botMember.id === targetUserId) {
    return { canAct: false, reason: 'You cannot perform moderation actions against VOID.' };
  }

  // 3. Prevent targeting the guild owner
  if (guild.ownerId === targetUserId) {
    return { canAct: false, reason: 'The server owner cannot be targeted for moderation.' };
  }

  // If target member is not in the guild (e.g., already left, or ID ban),
  // role hierarchy doesn't apply to the member object, but other checks succeeded.
  if (!targetMember) {
    return { canAct: true };
  }

  // 4. Check if moderator has hierarchy over target (unless moderator is guild owner)
  if (moderatorMember.id !== guild.ownerId) {
    const modHighest = moderatorMember.roles.highest.position;
    const targetHighest = targetMember.roles.highest.position;

    if (modHighest <= targetHighest) {
      return {
        canAct: false,
        reason: 'You cannot moderate this user because their highest role is equal to or higher than yours.'
      };
    }
  }

  // 5. Check if bot has hierarchy over target
  const botHighest = botMember.roles.highest.position;
  const targetHighest = targetMember.roles.highest.position;

  if (botHighest <= targetHighest) {
    return {
      canAct: false,
      reason: 'VOID cannot moderate this user because their highest role is equal to or higher than the bot\'s highest role.'
    };
  }

  // 6. Check if target is manageable/kickable/bannable by discord.js standards if applicable
  if (targetMember.manageable === false) {
    // Note: Some actions might still be possible or checked separately, but this is a strong indicator
    // We let individual commands check specific flags (bannable, kickable, moderatable) if needed.
  }

  return { canAct: true };
}

module.exports = {
  checkMemberPermissions,
  checkBotPermissions,
  validateHierarchy,
  formatPermissionName
};
