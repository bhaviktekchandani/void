-- VOID PostgreSQL Database Schema

CREATE TABLE IF NOT EXISTS guild_configs (
    guild_id VARCHAR(32) PRIMARY KEY,
    prefix VARCHAR(10) NOT NULL DEFAULT '.?',
    log_channel_id VARCHAR(32),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

-- Indexes for fast query resolution and guild isolation
CREATE INDEX IF NOT EXISTS idx_cases_guild ON moderation_cases(guild_id);
CREATE INDEX IF NOT EXISTS idx_cases_guild_target ON moderation_cases(guild_id, target_id);
CREATE INDEX IF NOT EXISTS idx_cases_guild_num ON moderation_cases(guild_id, case_number);
CREATE INDEX IF NOT EXISTS idx_warnings_guild_target ON warnings(guild_id, target_id);
CREATE INDEX IF NOT EXISTS idx_notes_guild_target ON moderator_notes(guild_id, target_id);
