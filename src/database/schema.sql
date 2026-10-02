-- VOID PostgreSQL Database Schema

CREATE TABLE IF NOT EXISTS guild_configs (
    guild_id VARCHAR(32) PRIMARY KEY,
    prefix VARCHAR(10) NOT NULL DEFAULT '.?',
    log_channel_id VARCHAR(32),
    event_log_channel_id VARCHAR(32),
    log_joins BOOLEAN DEFAULT FALSE,
    log_leaves BOOLEAN DEFAULT FALSE,
    log_updates BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- In case table already existed, ensure new columns are added safely
ALTER TABLE guild_configs ADD COLUMN IF NOT EXISTS event_log_channel_id VARCHAR(32);
ALTER TABLE guild_configs ADD COLUMN IF NOT EXISTS log_joins BOOLEAN DEFAULT FALSE;
ALTER TABLE guild_configs ADD COLUMN IF NOT EXISTS log_leaves BOOLEAN DEFAULT FALSE;
ALTER TABLE guild_configs ADD COLUMN IF NOT EXISTS log_updates BOOLEAN DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS moderation_cases (
    id SERIAL PRIMARY KEY,
    guild_id VARCHAR(32) NOT NULL,
    case_number INTEGER NOT NULL,
    target_id VARCHAR(32) NOT NULL,
    target_tag VARCHAR(64),
    moderator_id VARCHAR(32) NOT NULL,
    moderator_tag VARCHAR(64),
    action VARCHAR(32) NOT NULL,
    reason TEXT,
    duration VARCHAR(32),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_guild_case UNIQUE (guild_id, case_number)
);

CREATE TABLE IF NOT EXISTS warnings (
    id SERIAL PRIMARY KEY,
    guild_id VARCHAR(32) NOT NULL,
    target_id VARCHAR(32) NOT NULL,
    moderator_id VARCHAR(32) NOT NULL,
    reason TEXT NOT NULL,
    case_id INTEGER REFERENCES moderation_cases(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS moderator_notes (
    id SERIAL PRIMARY KEY,
    guild_id VARCHAR(32) NOT NULL,
    target_id VARCHAR(32) NOT NULL,
    moderator_id VARCHAR(32) NOT NULL,
    note TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS channel_locks (
    channel_id VARCHAR(32) PRIMARY KEY,
    guild_id VARCHAR(32) NOT NULL,
    locked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    locked_by VARCHAR(32) NOT NULL,
    previous_deny VARCHAR(64),
    previous_allow VARCHAR(64),
    reason TEXT
);

CREATE TABLE IF NOT EXISTS automod_configs (
    guild_id VARCHAR(32) PRIMARY KEY,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    spam_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    spam_max_messages INT NOT NULL DEFAULT 5,
    spam_interval_sec INT NOT NULL DEFAULT 5,
    mention_limit INT NOT NULL DEFAULT 5,
    invites_blocked BOOLEAN NOT NULL DEFAULT FALSE,
    links_blocked BOOLEAN NOT NULL DEFAULT FALSE,
    blocked_words TEXT[] NOT NULL DEFAULT '{}',
    action VARCHAR(32) NOT NULL DEFAULT 'DELETE',
    timeout_duration_sec INT NOT NULL DEFAULT 300,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS antiraid_configs (
    guild_id VARCHAR(32) PRIMARY KEY,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    join_threshold INT NOT NULL DEFAULT 10,
    interval_sec INT NOT NULL DEFAULT 10,
    action VARCHAR(32) NOT NULL DEFAULT 'ALERT',
    is_locked_down BOOLEAN NOT NULL DEFAULT FALSE,
    locked_down_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast query resolution and guild isolation
CREATE INDEX IF NOT EXISTS idx_cases_guild ON moderation_cases(guild_id);
CREATE INDEX IF NOT EXISTS idx_cases_guild_target ON moderation_cases(guild_id, target_id);
CREATE INDEX IF NOT EXISTS idx_cases_guild_num ON moderation_cases(guild_id, case_number);
CREATE INDEX IF NOT EXISTS idx_cases_guild_created ON moderation_cases(guild_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_warnings_guild_target ON warnings(guild_id, target_id);
CREATE INDEX IF NOT EXISTS idx_warnings_guild_created ON warnings(guild_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_guild_target ON moderator_notes(guild_id, target_id);
CREATE INDEX IF NOT EXISTS idx_channel_locks_guild ON channel_locks(guild_id);
