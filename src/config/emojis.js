/**
 * VOID Central Canonical Emoji Registry
 * Contains the 76 canonical emoji names, semantic mappings, and clean Unicode fallbacks.
 */

const CANONICAL_EMOJI_NAMES = [
  // Branding and general (12)
  'void', 'bot', 'discord', 'developer', 'premium', 'heart', 'sparkle', 'home', 'dot', 'online', 'offline', 'loading',
  // Status and feedback (6)
  'success', 'error', 'warning', 'warning2', 'info', 'question',
  // Moderation actions (15)
  'ban', 'unban', 'kick', 'timeout', 'untimeout', 'warn', 'warnings', 'purge', 'lock', 'unlock', 'slowmode', 'case', 'note', 'reason', 'report',
  // Security and protection (9)
  'shield', 'moderator', 'admin', 'raid', 'automod', 'filter', 'privacy', 'permissions', 'key',
  // User and server information (9)
  'userinfo', 'member', 'join', 'leave', 'server', 'channel', 'role', 'calendar', 'time',
  // Configuration and administration (8)
  'setup', 'config', 'settings', 'prefix', 'logs', 'database', 'checklist', 'command',
  // Navigation and pagination (8)
  'next', 'previous', 'first', 'last', 'back', 'arrow', 'refresh', 'search',
  // Utilities and other actions (9)
  'link', 'copy', 'edit', 'delete', 'add', 'remove', 'ticket', 'support', 'bug'
];

/**
 * Resilient, clean Unicode fallbacks for all 76 canonical emojis.
 * Matches VOID's minimalist, monochrome aesthetic.
 */
const UNICODE_FALLBACKS = {
  // Branding and general
  void: '▪',
  bot: '🤖',
  discord: '💬',
  developer: '⚡',
  premium: '★',
  heart: '♥',
  sparkle: '✦',
  home: '⌂',
  dot: '•',
  online: '●',
  offline: '○',
  loading: '◌',

  // Status and feedback
  success: '✓',
  error: '✕',
  warning: '⚠',
  warning2: '▲',
  info: 'ℹ',
  question: '?',

  // Moderation actions
  ban: '⛔',
  unban: '🔓',
  kick: '👢',
  timeout: '⏱',
  untimeout: '⌛',
  warn: '⚠',
  warnings: '📋',
  purge: '🗑',
  lock: '🔒',
  unlock: '🔓',
  slowmode: '⏱',
  case: '#',
  note: '📝',
  reason: '💬',
  report: '🚨',

  // Security and protection
  shield: '🛡',
  moderator: '⚔',
  admin: '👑',
  raid: '⚡',
  automod: '🤖',
  filter: '🔍',
  privacy: '🔒',
  permissions: '🔑',
  key: '🔑',

  // User and server information
  userinfo: '👤',
  member: '👥',
  join: '📥',
  leave: '📤',
  server: '🏠',
  channel: '#',
  role: '🏷',
  calendar: '📅',
  time: '⏱',

  // Configuration and administration
  setup: '⚙',
  config: '⚙',
  settings: '⚙',
  prefix: '›',
  logs: '📜',
  database: '🗄',
  checklist: '☑',
  command: '/',

  // Navigation and pagination
  next: '›',
  previous: '‹',
  first: '«',
  last: '»',
  back: '↩',
  arrow: '›',
  refresh: '🔄',
  search: '🔍',

  // Utilities and other actions
  link: '🔗',
  copy: '📋',
  edit: '✏',
  delete: '🗑',
  add: '+',
  remove: '-',
  ticket: '🎫',
  support: '💬',
  bug: '⚡'
};

// Aliases for backward compatibility and semantic synonyms
const SEMANTIC_ALIASES = {
  FAILURE: 'error',
  MOD: 'moderator',
  HELP: 'info',
  CASE: 'case',
  CONFIG: 'config',
  USER: 'userinfo',
  TIME: 'time',
  ARROW: 'arrow',
  DOT: 'dot',
  LOCK: 'lock',
  UNLOCK: 'unlock',
  SUCCESS: 'success',
  WARNING: 'warning',
  SHIELD: 'shield'
};

module.exports = {
  CANONICAL_EMOJI_NAMES,
  UNICODE_FALLBACKS,
  SEMANTIC_ALIASES
};
