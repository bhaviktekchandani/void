# VOID

VOID is a fast, reliable, visually distinctive Discord moderation system built with Node.js, `discord.js` v14, and PostgreSQL. It features a unified dual-command interface (Discord Slash Commands and traditional Prefix Commands), an original minimalist charcoal-and-black embed design, strict role-hierarchy checks, sequential case tracking, automated moderation rules, anti-raid safeguards, 76 custom emojis, a secure No-Prefix Access System, and server-isolated persistence.

---

## Features

- **Dual-Interface System**: Every command works identically through both Discord Slash Commands (`/`) and traditional Prefix Commands (`.?`).
- **Dynamic Server Prefixes**: Default prefix is `.?`, configurable per server via database storage with in-memory caching.
- **No-Prefix Access System**: Authorized Discord user IDs configured via environment variables can execute commands directly without typing a prefix. Ordinary conversations are safely ignored without generating command errors or spam. Normal Discord permissions and role hierarchy checks are strictly preserved with zero bypasses.
- **Shared Execution Architecture**: A single command handler drives both interfaces, ensuring consistent validation, permission checking, error reporting, and logging.
- **Pure Black Visual Identity & Zero Unnecessary Pings**: Every embed uses genuinely pure black (`#000000` / `0x000000`) with no colored accents. Disciplined emoji design features at most one emoji in major headings, plain readable section headers, and zero emoji clutter. Accidental notifications are neutralized through strict ping suppression: command invoker replies suppress author pings (`repliedUser: false`), user and role mentions in embeds are formatted as plain names with inline code IDs (\`123456789\`), and message payloads globally enforce `allowedMentions: { parse: [], repliedUser: false }`.
- **76 Custom Canonical Emojis**: Full native integration with Discord Developer Portal Application Emojis (`client.application.emojis.fetch()`) plus resilient monochrome Unicode fallbacks (`✓`, `✕`, `⚠`, `⚔`, `#`, `🛡`).
- **Reference Standard Moderation Dossiers**: Modeled after the `/ban` reference standard: Target Identity, Action Details, Moderation History, and Execution Details with real direct message delivery tracking.
- **Stateful Channel Locking**: Preserves pre-existing channel permission overwrites and accurately restores them on unlock.
- **Advanced AutoMod Engine**: Configurable spam rate limiting, duplicate message detection, mention bomb protection, invite blocking, and word blacklisting.
- **Anti-Raid Protection**: Sliding-window join spike detection with automatic mod-log alerting and optional lockdown mode.
- **Staff Notes & Warning Clear**: Internal staff notes and full warning lifecycle management with interactive pagination.
- **Role Hierarchy & Safety**: Comprehensive checks prevent self-targeting, bot-targeting, server-owner targeting, and moderating members with equal or higher roles.
- **PostgreSQL Persistence**: Isolated per-guild tables for sequential case tracking, warnings history, moderator notes, and server configurations.
- **Audit Logging**: Real-time audit logs dispatched to designated log channels for member joins, leaves, role updates, timeouts, and bans.

---

## 76 Canonical Custom Emojis

VOID integrates 76 canonical emojis uploaded to your Discord Developer Portal application. On startup, the client automatically fetches and caches all application emojis:

1. **Branding & Status (18)**: `void`, `bot`, `discord`, `developer`, `premium`, `heart`, `sparkle`, `home`, `dot`, `online`, `offline`, `loading`, `success`, `error`, `warning`, `warning2`, `info`, `question`
2. **Moderation Actions (15)**: `ban`, `unban`, `kick`, `timeout`, `untimeout`, `warn`, `warnings`, `purge`, `lock`, `unlock`, `slowmode`, `case`, `note`, `reason`, `report`
3. **Security & Protection (9)**: `shield`, `moderator`, `admin`, `raid`, `automod`, `filter`, `privacy`, `permissions`, `key`
4. **User & Server Information (9)**: `userinfo`, `member`, `join`, `leave`, `server`, `channel`, `role`, `calendar`, `time`
5. **Configuration & Administration (8)**: `setup`, `config`, `settings`, `prefix`, `logs`, `database`, `checklist`, `command`
6. **Navigation & Pagination (8)**: `next`, `previous`, `first`, `last`, `back`, `arrow`, `refresh`, `search`
7. **Utilities & Other Actions (9)**: `link`, `copy`, `edit`, `delete`, `add`, `remove`, `ticket`, `support`, `bug`

*Fallback Guarantee*: If an application emoji is not configured or fails to load, VOID automatically renders a clean monochrome Unicode symbol, ensuring embeds never render broken raw markup (`<:name:undefined>`).

---

## Commands

All 28 commands are fully implemented and functional across both slash and prefix interfaces:

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

### Configuration & Automation Commands (6)
| Command | Purpose | Prefix Example | Slash Equivalent |
| :--- | :--- | :--- | :--- |
| `prefix` | View or change server prefix | `.?prefix set !` | `/prefix view` / `/prefix set new_prefix:!` |
| `config` | Server configuration manager | `.?config logchannel #mod-logs` | `/config <view \| prefix \| logchannel>` |
| `setup` | Onboarding & settings overview | `.?setup logchannel #mod-logs` | `/setup <overview \| logchannel>` |
| `noprefix` | View no-prefix status & diagnostics | `.?noprefix status` | `/noprefix <status \| test>` |
| `automod` | Configure automated rules | `.?automod spam on 5` | `/automod <view \| toggle \| spam \| invites \| mentions \| action \| word>` |
| `antiraid` | Configure join spike safeguards | `.?antiraid threshold 8 10` | `/antiraid <view \| toggle \| threshold \| action \| clear>` |

### Utility Commands (5)
| Command | Purpose | Prefix Example | Slash Equivalent |
| :--- | :--- | :--- | :--- |
| `help` | Categorized help suite | `.?help` / `.?help ban` | `/help [command]` |
| `userinfo` | Multi-section account & member profile | `.?userinfo @user` | `/userinfo [user]` |
| `serverinfo` | Complete server statistics & overview | `.?serverinfo` | `/serverinfo` |
| `avatar` | View high-res user avatar | `.?avatar @user` | `/avatar [user]` |
| `botinfo` | System specifications, memory & ping | `.?botinfo` | `/botinfo` |

---

## No-Prefix Access System

The No-Prefix Access System allows authorized bot administrators and server managers to execute any VOID command directly without typing the `.??` prefix.

### Key Rules & Behavior
1. **Security & Zero Permission Bypass**: No-prefix access is strictly a prefix-free dispatch layer. It does **not** grant Administrator or Moderator privileges, nor does it bypass Discord role hierarchy checks. If an authorized user does not hold `BanMembers` in a server, typing `ban @user` will still be rejected with a Permission Denied error.
2. **Casual Conversation Protection**: If an authorized user sends ordinary chat (e.g. `hello everyone`, `what time is it`), VOID checks if the first word matches a registered command or alias. If not, it is silently ignored without sending error responses or spam.
3. **Multi-User Allowlist**: Multiple Discord user IDs are supported, separated by commas.
4. **Environment Isolation**: The allowlist is configured securely via `.env` on the host machine and cannot be modified via Discord chat.

### Diagnostics
Run `.?noprefix status` or `.?noprefix test` (or slash `/noprefix status`, `/noprefix test`) to inspect:
- System enabled/disabled status.
- Whether your user ID is authorized.
- Safe execution diagnostic.

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
- **Message Content Intent** (Mandatory): Required for the bot to read message content for prefix commands (`.?`), no-prefix commands, and AutoMod rules.
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
| `NO_PREFIX_USERS` | Discord user IDs authorized for prefix-free access (comma-separated) | `123456789012345678,987654321098765432` |
| `NO_PREFIX_ENABLED` | Global toggle for no-prefix system (`true` / `false`) | `true` |

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

# 4. Register all 28 slash commands with Discord
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

- **Prefix / No-prefix commands do not respond**:
  - Verify that the **Message Content Intent** is toggled ON under Bot settings in the Discord Developer Portal.
  - Verify the bot has the **View Channel** and **Send Messages** permissions in the channel.
  - For no-prefix commands, verify your Discord user ID is in `NO_PREFIX_USERS` in `.env` and `NO_PREFIX_ENABLED=true`, then restart the bot. Run `.?noprefix status` to verify.
- **"VOID is unable to moderate this user due to role hierarchy"**:
  - Discord enforces role position: the bot's highest role must be placed **higher** than the target user's highest role in Server Settings > Roles.
- **Slash commands do not appear in Discord**:
  - Run `npm run register` with `GUILD_ID` set in `.env` for instantaneous guild registration. Global registrations can take up to an hour to propagate across Discord's cache.
- **Database connection error**:
  - Check that `DATABASE_URL` is accurate and that SSL certificates are accepted (`DATABASE_SSL=false` if using local unsecured Postgres). VOID will safely run with in-memory caching if the database is temporarily unreachable.
