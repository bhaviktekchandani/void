# VOID

VOID is a fast, reliable, visually distinctive Discord moderation bot built with Node.js, `discord.js` v14, and PostgreSQL. It features a unified dual-command interface (Discord Slash Commands and traditional Prefix Commands), an original minimalist charcoal-and-black embed design, strict role-hierarchy checks, sequential case tracking, and server-isolated persistence.

---

## Features

- **Dual-Interface System**: Every command works identically through both Discord Slash Commands (`/`) and traditional Prefix Commands (`.?`).
- **Dynamic Server Prefixes**: Default prefix is `.?`, configurable per server via database storage with in-memory caching.
- **Shared Execution Architecture**: A single command handler drives both interfaces, ensuring consistent validation, permission checking, error reporting, and logging.
- **Restrained Visual Design**: Pure black (`#000000`) and charcoal (`#111111`) layout without colorful distractions, technical clutter, or promotional footers.
- **Resilient Emoji System**: Centralized emoji registry with automatic Unicode fallbacks (`✓`, `✕`, `⚠`, `◆`, `◇`, `⚙`).
- **Role Hierarchy & Safety**: Comprehensive checks prevent self-targeting, bot-targeting, server-owner targeting, and moderating members with equal or higher roles.
- **PostgreSQL Persistence**: Isolated per-guild tables for sequential case tracking, warnings history, and server configurations.
- **Configurable Moderation Logging**: Real-time audit logs dispatched to a designated channel.

---

## Commands

All 17 commands are implemented and functional across both interfaces:

| Command | Category | Description | Prefix Example | Slash Equivalent |
| :--- | :--- | :--- | :--- | :--- |
| `help` | Utility | Display command list & syntax | `.?help` / `.?help ban` | `/help [command]` |
| `userinfo` | Utility | View account & member information | `.?userinfo @user` | `/userinfo [user]` |
| `ban` | Moderation | Ban a user from the server | `.?ban @user Spamming` | `/ban user:<@user> [reason]` |
| `unban` | Moderation | Unban a user by their user ID | `.?unban 123456789 Appeal accepted` | `/unban user_id:<id> [reason]` |
| `kick` | Moderation | Kick a member from the server | `.?kick @user Inappropriate language` | `/kick user:<@user> [reason]` |
| `timeout` | Moderation | Timeout a member (1s to 28d) | `.?timeout @user 10m Flooding chat` | `/timeout user:<@user> duration:<10m> [reason]` |
| `untimeout` | Moderation | Remove active timeout from member | `.?untimeout @user Apologized` | `/untimeout user:<@user> [reason]` |
| `warn` | Moderation | Issue a formal recorded warning | `.?warn @user Please review #rules` | `/warn user:<@user> reason:<text>` |
| `warnings` | Moderation | View stored warnings for a member | `.?warnings @user` | `/warnings user:<@user>` |
| `purge` | Moderation | Bulk-delete messages (1-100) | `.?purge 25` | `/purge amount:<25>` |
| `lock` | Moderation | Prevent members from chatting | `.?lock Maintenance in progress` | `/lock [reason]` |
| `unlock` | Moderation | Re-enable chatting for members | `.?unlock Resuming discussions` | `/unlock [reason]` |
| `slowmode` | Moderation | Set channel rate limit (0-21600s) | `.?slowmode 5` | `/slowmode seconds:<5>` |
| `case` | Moderation | View case details by number | `.?case 12` | `/case number:<12>` |
| `prefix` | Configuration| View or change server prefix | `.?prefix set !` | `/prefix view` / `/prefix set new_prefix:!` |
| `config` | Configuration| Manage server configuration | `.?config logchannel #mod-logs` | `/config <view \| prefix \| logchannel>` |
| `setup` | Configuration| Onboard & review server settings | `.?setup logchannel #mod-logs` | `/setup <overview \| logchannel>` |

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
- **Message Content Intent** (Required): **MUST be enabled** for the bot to read message content for prefix commands (`.?`).
- Server Members Intent: Recommended if fetching non-cached members across large servers.

### 2. Required Bot Permissions
Generate the bot invite URL under **OAuth2 > URL Generator** with the `bot` and `applications.commands` scopes and the following permissions (integer `1099511627798` or Administrator):
- Ban Members
- Kick Members
- Moderate Members (Timeout)
- Manage Messages (Purge)
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
# Edit .env with your credentials

# 3. Run database migrations (if DATABASE_URL is configured)
npm run migrate

# 4. Register slash commands with Discord
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

- **`guild_configs`**: Stores per-server settings (`guild_id`, `prefix`, `log_channel_id`, timestamps).
- **`moderation_cases`**: Guild-isolated sequential case records (`guild_id`, `case_number`, `target_id`, `moderator_id`, `action`, `reason`, `duration`, `created_at`).
- **`warnings`**: Member warning logs linked to cases (`guild_id`, `target_id`, `moderator_id`, `reason`, `case_id`, `created_at`).
- **`moderator_notes`**: Internal staff notes table prepared for future extensions.

---

## Railway Deployment Guide

Deploying VOID to Railway takes less than 5 minutes:

### 1. Push Code to GitHub
```bash
git init
git add .
git commit -m "feat: initial VOID release"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

### 2. Create Railway Project
1. Log in to [Railway](https://railway.com/).
2. Click **New Project** > **Provision PostgreSQL**.
3. In the same project, click **New** > **GitHub Repo** and select your repository.

### 3. Configure Environment Variables in Railway
In your application service settings under **Variables**:
- `DATABASE_URL`: Add Reference > select the PostgreSQL service's `DATABASE_URL`.
- `DISCORD_TOKEN`: Paste your Discord bot token.
- `CLIENT_ID`: Paste your Discord application ID.
- `LOG_LEVEL`: `INFO`.

### 4. Deploy & Verify
1. Railway will automatically build the service using `railway.json` and run `npm start`.
2. Inspect the **Deployment Logs** to confirm the bot logs in:
   ```
   [INFO] Initializing VOID...
   [INFO] Connected to PostgreSQL database successfully.
   [INFO] Database schema migration completed successfully.
   [INFO] Loaded 17 commands across 3 categories.
   [INFO] VOID online as VOID#0000 (ID: ...)
   ```
3. Run the slash command deployer once locally or in Railway's CLI:
   ```bash
   npm run register
   ```
4. Test in Discord using both `.?help` and `/help`.

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
