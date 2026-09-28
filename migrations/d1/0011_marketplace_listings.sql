-- Public product pages for user-owned Builder projects and externally built products.
-- The product itself stays on the seller's hosting and checkout provider.
CREATE TABLE IF NOT EXISTS marketplace_listings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  build_session_id TEXT UNIQUE,
  source_type TEXT NOT NULL CHECK(source_type IN ('builder','external')),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL CHECK(length(title) BETWEEN 2 AND 100),
  summary TEXT NOT NULL DEFAULT '' CHECK(length(summary) <= 240),
  category TEXT NOT NULL CHECK(category IN ('ai_automation','business_tool','media','other')),
  product_url TEXT,
  checkout_url TEXT,
  price_label TEXT NOT NULL DEFAULT '' CHECK(length(price_label) <= 80),
  seller_name TEXT NOT NULL DEFAULT '' CHECK(length(seller_name) <= 50),
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(build_session_id) REFERENCES build_sessions(id) ON DELETE CASCADE,
  CHECK ((source_type='builder' AND build_session_id IS NOT NULL) OR (source_type='external' AND build_session_id IS NULL))
);

CREATE INDEX IF NOT EXISTS marketplace_listings_public
  ON marketplace_listings(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS marketplace_listings_owner
  ON marketplace_listings(user_id, updated_at DESC);
