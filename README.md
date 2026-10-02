# VOID

VOID is a fast, reliable, visually distinctive Discord moderation system built with Node.js, `discord.js` v14, and PostgreSQL. It features a unified dual-command interface (Discord Slash Commands and traditional Prefix Commands), an original minimalist charcoal-and-black embed design, strict role-hierarchy checks, sequential case tracking, automated moderation rules, anti-raid safeguards, and server-isolated persistence.

---

## Features

- **Dual-Interface System**: Every command works identically through both Discord Slash Commands (`/`) and traditional Prefix Commands (`.?`).
- **Dynamic Server Prefixes**: Default prefix is `.?`, configurable per server via database storage with in-memory caching.
- **Shared Execution Architecture**: A single command handler drives both interfaces, ensuring consistent validation, permission checking, error reporting, and logging.
- **Restrained Visual Design**: Pure black (`#000000`) and charcoal (`#111111`) layout without colorful distractions, technical clutter, or promotional footers.
- **Resilient Emoji System**: Centralized emoji registry with automatic Unicode fallbacks (`✓`, `✕`, `⚠`, `◆`, `◇`, `⚙`).
- **Stateful Channel Locking**: Preserves pre-existing channel permission overwrites and accurately restores them on unlock.
- **Advanced AutoMod Engine**: Configurable spam rate limiting, duplicate message detection, mention bomb protection, invite blocking, and word blacklisting.
- **Anti-Raid Protection**: Sliding-window join spike detection with automatic mod-log alerting and optional lockdown mode.
- **Staff Notes & Warning Clear**: Internal staff notes and full warning lifecycle management with interactive pagination.
- **Role Hierarchy & Safety**: Comprehensive checks prevent self-targeting, bot-targeting, server-owner targeting, and moderating members with equal or higher roles.
- **PostgreSQL Persistence**: Isolated per-guild tables for sequential case tracking, warnings history, moderator notes, and server configurations.
- **Audit Logging**: Real-time audit logs dispatched to designated log channels for member joins, leaves, role updates, timeouts, and bans.

---

## Commands

All 26 commands are fully implemented and functional across both slash and prefix interfaces:

### Moderation Commands (17)
| Command | Purpose | Prefix Example | Slash Equivalent |
| :--- | :--- | :--- | :--- |
| `ban` | Ban a member from the server | `.?ban @user Spamming` | `/ban user:<@user> [reason]` |
| `unban` | Unban a user by user ID | `.?unban 123456789 Appeal accepted` | `/unban user_id:<id> [reason]` |
| `kick` | Kick a member from the server | `.?kick @user Inappropriate behavior` | `/kick user:<@user> [reason]` |
| `softban` | Ban and unban to purge messages | `.?softban @user Clean chat` | `/softban user:<@user> [reason]` |
| `timeout` | Timeout member (1s to 28d) | `.?timeout @user 10m Flooding` | `/timeout user:<@user> duration:<10m> [reason]` |
| `untimeout` | Remove active timeout | `.?untimeout @user Apologized` | `/untimeout user:<@user> [reason]` |
| `warn` | Issue a formal recorded warning | `.?warn @user Rule 1 violation` | `/warn user:<@user> reason:<text>` |
| `warnings` | View warnings for a member | `.?warnings @user` | `/warnings user:<@user>` |
| `clearwarnings` | Clear all warnings for member | `.?clearwarnings @user` | `/clearwarnings user:<@user>` |
| `purge` | Bulk-delete messages (1-100) | `.?purge 25` | `/purge amount:<25>` |
| `lock` | Lock channel (stateful) | `.?lock Maintenance` | `/lock [reason]` |
| `unlock` | Unlock channel (restore state)| `.?unlock Resuming chat` | `/unlock [reason]` |
| `slowmode` | Set rate limit (0-21600s) | `.?slowmode 5` | `/slowmode seconds:<5>` |
| `case` | View specific case details | `.?case 12` | `/case number:<12>` |
| `reason` | Update reason of an existing case | `.?reason 12 Updated evidence` | `/reason number:<12> reason:<text>` |
| `modhistory` | Member moderation history | `.?modhistory @user` | `/modhistory user:<@user>` |
| `notes` | Manage staff notes | `.?notes add @user Suspicious alt` | `/notes <add \| view \| remove>` |

### Configuration & Automation Commands (5)
| Command | Purpose | Prefix Example | Slash Equivalent |
| :--- | :--- | :--- | :--- |
| `prefix` | View or change server prefix | `.?prefix set !` | `/prefix view` / `/prefix set new_prefix:!` |
| `config` | Server configuration manager | `.?config logchannel #mod-logs` | `/config <view \| prefix \| logchannel>` |
| `setup` | Onboarding & settings overview | `.?setup logchannel #mod-logs` | `/setup <overview \| logchannel>` |
| `automod` | Configure automated rules | `.?automod spam on 5` | `/automod <view \| toggle \| spam \| invites \| mentions \| action \| word>` |
| `antiraid` | Configure join spike safeguards | `.?antiraid threshold 8 10` | `/antiraid <view \| toggle \| threshold \| action \| clear>` |

### Utility Commands (4)
| Command | Purpose | Prefix Example | Slash Equivalent |
| :--- | :--- | :--- | :--- |
| `help` | Interactive category help explorer | `.?help` / `.?help ban` | `/help [command]` |
| `userinfo` | View account & member details | `.?userinfo @user` | `/userinfo [user]` |
| `avatar` | View high-res user avatar | `.?avatar @user` | `/avatar [user]` |
| `botinfo` | View system specs & uptime | `.?botinfo` | `/botinfo` |

---

## AutoMod Engine

AutoMod runs before command dispatching on incoming messages. Members with `ManageMessages` or `Administrator` automatically bypass AutoMod.

- **Invite Links**: Blocks `discord.gg/...`, `discord.com/invite/...`.
- **External Links**: Blocks generic URLs (`https://...`).
- **Blocked Words**: Matches restricted phrases using word-boundary regexes.
- **Mention Flood**: Blocks messages with excessive user/role pings.
- **Message Flood**: Rate limits rapid message bursts.
- **Duplicate Spam**: Detects identical messages sent repeatedly.
- **Configurable Actions**: `DELETE`, `WARN`, or `TIMEOUT` (with audit log notification).

---

## Anti-Raid Safeguards

Detects coordinated join spikes using sliding-window metrics:
- Tracks member joins per guild over configurable interval.
- When threshold is breached:
  - Dispatches immediate alert embed to the moderation log channel.
  - Can optionally flag server lockdown.
  - Moderators can inspect status and clear lockdown via `.?antiraid clear` or `/antiraid clear`.
- Does **not** mass-ban automatically to prevent false positives.

---

## Prefix System

- The default prefix is **`.?`**.
- Example usage: `.?ban @user "Mass advertising"`
- Supports quoted reasons (`"..."` or `'...'`) as well as unquoted trailing arguments.
- Server administrators can configure custom prefixes:
  - Via Prefix: `.?prefix set !`
  - Via Slash: `/prefix set new_prefix:!`
- Validations:
  - Rejects empty or whitespace-only prefixes.
  - Limits prefix length to 10 characters maximum.
  - Rejects prefixes containing quote characters (`"`, `'`, `` ` ``).

---

## Discord Developer Portal Setup

### 1. Required Privileged Gateway Intents
Under **Discord Developer Portal > Applications > [Your App] > Bot**:
- **Message Content Intent** (Mandatory): Required for the bot to read message content for prefix commands (`.?`) and AutoMod rules.
- **Server Members Intent** (Optional / Recommended): Required if tracking join/leave events across servers larger than unverified limits.

### 2. Required Bot Permissions
Generate the bot invite URL under **OAuth2 > URL Generator** with the `bot` and `applications.commands` scopes and the following permissions (integer `1099511627798` or Administrator):
- Ban Members
- Kick Members
- Moderate Members (Timeout)
- Manage Messages (Purge / AutoMod deletion)
- Manage Channels (Lock / Unlock / Slowmode)
- View Channels
- Send Messages
- Embed Links
- Read Message History

---

## Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

| Variable | Description | Example |
| :--- | :--- | :--- |
| `DISCORD_TOKEN` | Discord Bot Token from Developer Portal | `MTA...` |
| `CLIENT_ID` | Application Client ID from General Information | `123456789012345678` |
| `GUILD_ID` | (Optional) Test Guild ID for instant slash command registration | `987654321098765432` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:pass@localhost:5432/void` |
| `LOG_LEVEL` | Log level (`DEBUG`, `INFO`, `WARN`, `ERROR`) | `INFO` |

---

## Local Setup & Quickstart

### Prerequisites
- Node.js 18.0.0 or higher (v24+ recommended).
- PostgreSQL 14+ (optional for local mock testing; required for persistence).

### Installation
```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env

# 3. Run database migrations (if DATABASE_URL is configured)
npm run migrate

# 4. Register all 26 slash commands with Discord
npm run register

# 5. Start the bot
npm start
```

### Running Tests
Automated unit tests use the Node.js test runner (`node --test`). No external services or Discord servers are required:
```bash
npm test
```

---

## Database Architecture

The schema initializes automatically on bot launch or via `npm run migrate`.

- **`guild_configs`**: Stores per-server settings (`guild_id`, `prefix`, `log_channel_id`, `event_log_channel_id`, audit flags).
- **`moderation_cases`**: Guild-isolated sequential case records (`guild_id`, `case_number`, `target_id`, `moderator_id`, `action`, `reason`, `duration`).
- **`warnings`**: Member warning logs linked to cases (`guild_id`, `target_id`, `moderator_id`, `reason`, `case_id`).
- **`moderator_notes`**: Internal staff notes table (`guild_id`, `target_id`, `moderator_id`, `note`, `created_at`).
- **`channel_locks`**: Pre-lock channel overwrite bitfields for stateful restoration.
- **`automod_configs`**: Per-server AutoMod rules, thresholds, and word blacklists.
- **`antiraid_configs`**: Join-rate thresholds and lockdown status.

---

## Troubleshooting

- **Prefix commands (`.?`) do not respond**:
  - Verify that the **Message Content Intent** is toggled ON under Bot settings in the Discord Developer Portal.
  - Verify the bot has the **View Channel** and **Send Messages** permissions in the channel.
- **"VOID is unable to moderate this user due to role hierarchy"**:
  - Discord enforces role position: the bot's highest role must be placed **higher** than the target user's highest role in Server Settings > Roles.
- **Slash commands do not appear in Discord**:
  - Run `npm run register` with `GUILD_ID` set in `.env` for instantaneous guild registration. Global registrations can take up to an hour to propagate across Discord's cache.
- **Database connection error**:
  - Check that `DATABASE_URL` is accurate and that SSL certificates are accepted (`DATABASE_SSL=false` if using local unsecured Postgres). VOID will safely run with in-memory caching if the database is temporarily unreachable.
