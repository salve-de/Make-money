-- Revenue confirmed from an operator's read-only payment key (Stripe first).
-- The key itself is never stored. The payment account id is kept only as a
-- SHA-256 digest, and user_id is used for the per-user cooldown and for account
-- deletion; neither is ever returned by the public API.
-- Amounts are in the currency's minor unit; times are UNIX seconds.
CREATE TABLE IF NOT EXISTS verified_revenue (
  id TEXT PRIMARY KEY,
  entity_id TEXT NOT NULL CHECK(length(entity_id) BETWEEN 1 AND 200),
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  account_id_hash TEXT NOT NULL CHECK(length(account_id_hash) = 64),
  account_domain TEXT NOT NULL,
  currency TEXT NOT NULL,
  last30d_revenue_minor INTEGER NOT NULL,
  mrr_minor INTEGER CHECK(mrr_minor IS NULL OR mrr_minor >= 0),
  active_subscriptions INTEGER CHECK(active_subscriptions IS NULL OR active_subscriptions >= 0),
  period_start INTEGER NOT NULL,
  period_end INTEGER NOT NULL CHECK(period_end >= period_start),
  verified_at INTEGER NOT NULL
);

-- Latest verification per case (public read).
CREATE INDEX IF NOT EXISTS verified_revenue_entity_latest
  ON verified_revenue(entity_id, verified_at DESC);
-- Most recent verifications across all cases.
CREATE INDEX IF NOT EXISTS verified_revenue_recent
  ON verified_revenue(verified_at DESC);
-- One verification per user and case per hour, and account deletion.
CREATE INDEX IF NOT EXISTS verified_revenue_user_entity
  ON verified_revenue(user_id, entity_id, verified_at DESC);
