-- Make-Money private application state. Public research remains in Foundation R2.
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, email TEXT NOT NULL, display_name TEXT,
  stripe_customer_id TEXT, stripe_subscription_id TEXT, legacy_is_pro INTEGER NOT NULL DEFAULT 0 CHECK(legacy_is_pro IN (0,1)), pro_expires_at TEXT,
  role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('member', 'admin')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS bookmarks (
  user_id TEXT NOT NULL, item_type TEXT NOT NULL CHECK(item_type IN ('business','idea','signal')),
  item_id TEXT NOT NULL, saved INTEGER NOT NULL DEFAULT 1 CHECK(saved IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(user_id,item_type,item_id)
);
CREATE INDEX IF NOT EXISTS bookmarks_owner ON bookmarks(user_id,saved);
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, source TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','unsubscribed')),
  subscribed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY, user_id TEXT, business_name TEXT NOT NULL, url TEXT NOT NULL,
  monthly_revenue INTEGER NOT NULL CHECK(monthly_revenue>=0), monthly_profit INTEGER NOT NULL,
  tools_used TEXT NOT NULL DEFAULT '', acquisition_channel TEXT NOT NULL DEFAULT '', proof_screenshot_url TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS analyst_notes (
  user_id TEXT NOT NULL, entity_id TEXT NOT NULL, content TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(user_id,entity_id)
);
CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL, conversation_id TEXT NOT NULL,
  stripe_customer_id TEXT, stripe_subscription_id TEXT, legacy_is_pro INTEGER NOT NULL DEFAULT 0 CHECK(legacy_is_pro IN (0,1)), pro_expires_at TEXT,
  role TEXT NOT NULL CHECK(role IN ('user','assistant','system')), content TEXT NOT NULL,
  context_entity_id TEXT, suggested_prompts TEXT, sources TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS chat_messages_owner ON chat_messages(user_id,conversation_id,created_at);
CREATE TABLE IF NOT EXISTS synthesized_ideas (
  id TEXT NOT NULL, user_id TEXT NOT NULL, payload TEXT NOT NULL CHECK(json_valid(payload)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(user_id,id)
);
