-- User-owned AI builder sessions. Generated source code remains with the provider
-- until export/claim; Make-Money stores only orchestration state and the build spec.
CREATE TABLE IF NOT EXISTS build_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  idea_id TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'v0' CHECK(provider IN ('v0')),
  provider_chat_id TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','generating','ready','error')),
  build_spec TEXT NOT NULL CHECK(json_valid(build_spec)),
  preview_access_token TEXT NOT NULL,
  credits_cost REAL NOT NULL DEFAULT 0 CHECK(credits_cost >= 0),
  last_error TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS build_sessions_owner ON build_sessions(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS build_sessions_idea ON build_sessions(user_id, idea_id, updated_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS build_sessions_provider_chat
  ON build_sessions(provider, provider_chat_id)
  WHERE provider_chat_id IS NOT NULL;
