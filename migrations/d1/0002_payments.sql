-- Immutable normalized payment facts. No PII/card data is stored in this ledger.
CREATE TABLE IF NOT EXISTS payment_events (
  id TEXT PRIMARY KEY NOT NULL,
  resource_id TEXT NOT NULL,
  user_id TEXT,
  kind TEXT NOT NULL CHECK (kind IN ('purchase','refund','dispute','subscription')),
  occurred_at INTEGER NOT NULL,
  livemode INTEGER NOT NULL CHECK (livemode IN (0,1)),
  fact TEXT NOT NULL CHECK (json_valid(fact)),
  received_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS payment_events_user_idx ON payment_events(user_id, livemode);
CREATE INDEX IF NOT EXISTS payment_events_resource_idx ON payment_events(resource_id, livemode);
