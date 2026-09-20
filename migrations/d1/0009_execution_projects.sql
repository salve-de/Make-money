-- User-owned execution state for the FIND -> BUILD -> LIST -> DISTRIBUTE -> SELL -> EARN flow.
CREATE TABLE IF NOT EXISTS execution_projects (
  user_id TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  source_name TEXT NOT NULL,
  offer_name TEXT NOT NULL DEFAULT '',
  target_customer TEXT NOT NULL DEFAULT '',
  target_price_jpy INTEGER NOT NULL DEFAULT 0 CHECK(target_price_jpy >= 0),
  first_dollar_target_jpy INTEGER NOT NULL DEFAULT 1000 CHECK(first_dollar_target_jpy >= 0),
  completed_steps TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(completed_steps)),
  build_url TEXT NOT NULL DEFAULT '',
  launch_url TEXT NOT NULL DEFAULT '',
  checkout_url TEXT NOT NULL DEFAULT '',
  revenue_jpy INTEGER NOT NULL DEFAULT 0 CHECK(revenue_jpy >= 0),
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(user_id, entity_id)
);

CREATE INDEX IF NOT EXISTS execution_projects_owner_updated
  ON execution_projects(user_id, updated_at DESC);
