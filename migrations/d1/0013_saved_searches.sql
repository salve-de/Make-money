-- Saved catalog searches and the ledger that keeps a notification email from going out twice.
-- Searches belong to the verified Firebase UID. The ledger never stores an address:
-- recipient_hash is a one-way digest, so the table is safe to keep after a person leaves.
CREATE TABLE IF NOT EXISTS saved_searches (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 60),
  query TEXT NOT NULL CHECK(length(query) <= 200),
  filters TEXT NOT NULL CHECK(json_valid(filters)),
  notify INTEGER NOT NULL DEFAULT 1 CHECK(notify IN (0,1)),
  created_at INTEGER NOT NULL,
  last_notified_release TEXT
);
CREATE INDEX IF NOT EXISTS saved_searches_user ON saved_searches(user_id);

-- One row per (kind, recipient, edition). Sending claims the row first; a duplicate claim
-- conflicts on the UNIQUE key, which is what makes a repeated digest run harmless.
CREATE TABLE IF NOT EXISTS notification_sends (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  recipient_hash TEXT NOT NULL,
  release_key TEXT NOT NULL,
  sent_at INTEGER NOT NULL,
  UNIQUE(kind, recipient_hash, release_key)
);
-- The digest asks "who already got this edition?" once per run.
CREATE INDEX IF NOT EXISTS notification_sends_release ON notification_sends(kind, release_key);
