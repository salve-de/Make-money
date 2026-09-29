-- Small-business sale listings: a seller posts, a buyer sends an inquiry.
-- Figures are seller-declared unless revenue_basis says otherwise. Make-Money
-- does not broker the sale, guarantee the price or draft the contract.
-- verification_id points at a revenue-verification record owned by another
-- feature; it is deliberately not a foreign key and the API never accepts it.
CREATE TABLE IF NOT EXISTS business_sale_listings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL CHECK(length(title) BETWEEN 2 AND 100),
  summary TEXT NOT NULL DEFAULT '' CHECK(length(summary) <= 600),
  category TEXT NOT NULL CHECK(category IN ('ai_automation','business_tool','media','other','ecommerce','content','saas','service')),
  established_year INTEGER NOT NULL CHECK(established_year BETWEEN 1900 AND 2100),
  monthly_revenue_jpy INTEGER NOT NULL CHECK(monthly_revenue_jpy >= 0),
  monthly_profit_jpy INTEGER NOT NULL CHECK(monthly_profit_jpy >= 0),
  asking_price_jpy INTEGER NOT NULL CHECK(asking_price_jpy >= 0),
  revenue_basis TEXT NOT NULL DEFAULT 'self_reported' CHECK(revenue_basis IN ('self_reported','stripe_verified')),
  verification_id TEXT,
  reason_for_sale TEXT NOT NULL DEFAULT '' CHECK(length(reason_for_sale) <= 400),
  included_assets TEXT NOT NULL DEFAULT '' CHECK(length(included_assets) <= 400),
  seller_name TEXT NOT NULL DEFAULT '' CHECK(length(seller_name) <= 50),
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','closed')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- One row per buyer message. The buyer's contact email is only ever read back
-- through the listing owner's own view; the once-a-day limit per buyer and
-- listing is enforced by the application in a single conditional INSERT.
CREATE TABLE IF NOT EXISTS business_sale_inquiries (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL,
  buyer_user_id TEXT NOT NULL,
  message TEXT NOT NULL CHECK(length(message) BETWEEN 10 AND 2000),
  contact_email TEXT NOT NULL CHECK(length(contact_email) BETWEEN 3 AND 254),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(listing_id) REFERENCES business_sale_listings(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS business_sale_listings_public
  ON business_sale_listings(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS business_sale_listings_owner
  ON business_sale_listings(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS business_sale_inquiries_listing
  ON business_sale_inquiries(listing_id, created_at DESC);
