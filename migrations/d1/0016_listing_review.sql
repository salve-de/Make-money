-- 掲載の審査方式。掲載者が公開を申請すると pending_review になり、
-- 運営者が承認したものだけが published（公開）になる。却下は rejected（理由は review_note）。
-- SQLite の CHECK 制約は ALTER で変えられないため、テーブルを作り直す。
-- 既存の published 行は安全側に倒し、pending_review に戻す（再審査）。
-- revision は掲載者が内容を保存するたびに1ずつ増え、承認・却下は「審査者が見た版」にだけ効く。
--
-- business_sale_inquiries は business_sale_listings への外部キー（ON DELETE CASCADE）を持つ。
-- 親を DROP すると連鎖削除で問い合わせが消えるため、問い合わせを先に退避して作り直す。

-- 1) 事業の売買: 問い合わせを退避してから、掲載のテーブルを作り直す
CREATE TABLE business_sale_inquiries_0016_backup AS SELECT * FROM business_sale_inquiries;
DROP TABLE business_sale_inquiries;

CREATE TABLE business_sale_listings_0016 (
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
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','pending_review','published','rejected','closed')),
  review_note TEXT CHECK(review_note IS NULL OR length(review_note) <= 200),
  reviewed_at TEXT,
  reviewed_by TEXT,
  revision INTEGER NOT NULL DEFAULT 0 CHECK(revision >= 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO business_sale_listings_0016(
  id,user_id,slug,title,summary,category,established_year,monthly_revenue_jpy,monthly_profit_jpy,
  asking_price_jpy,revenue_basis,verification_id,reason_for_sale,included_assets,seller_name,
  status,created_at,updated_at
)
SELECT
  id,user_id,slug,title,summary,category,established_year,monthly_revenue_jpy,monthly_profit_jpy,
  asking_price_jpy,revenue_basis,verification_id,reason_for_sale,included_assets,seller_name,
  CASE WHEN status='published' THEN 'pending_review' ELSE status END,created_at,updated_at
FROM business_sale_listings;

DROP TABLE business_sale_listings;
ALTER TABLE business_sale_listings_0016 RENAME TO business_sale_listings;

CREATE TABLE business_sale_inquiries (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL,
  buyer_user_id TEXT NOT NULL,
  message TEXT NOT NULL CHECK(length(message) BETWEEN 10 AND 2000),
  contact_email TEXT NOT NULL CHECK(length(contact_email) BETWEEN 3 AND 254),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(listing_id) REFERENCES business_sale_listings(id) ON DELETE CASCADE
);
INSERT INTO business_sale_inquiries(id,listing_id,buyer_user_id,message,contact_email,created_at)
  SELECT id,listing_id,buyer_user_id,message,contact_email,created_at FROM business_sale_inquiries_0016_backup;
DROP TABLE business_sale_inquiries_0016_backup;

CREATE INDEX IF NOT EXISTS business_sale_listings_public
  ON business_sale_listings(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS business_sale_listings_owner
  ON business_sale_listings(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS business_sale_inquiries_listing
  ON business_sale_inquiries(listing_id, created_at DESC);

-- 2) Builder・外部サービスの掲載
CREATE TABLE marketplace_listings_0016 (
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
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','pending_review','published','rejected')),
  review_note TEXT CHECK(review_note IS NULL OR length(review_note) <= 200),
  reviewed_at TEXT,
  reviewed_by TEXT,
  revision INTEGER NOT NULL DEFAULT 0 CHECK(revision >= 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(build_session_id) REFERENCES build_sessions(id) ON DELETE CASCADE,
  CHECK ((source_type='builder' AND build_session_id IS NOT NULL) OR (source_type='external' AND build_session_id IS NULL))
);

INSERT INTO marketplace_listings_0016(
  id,user_id,build_session_id,source_type,slug,title,summary,category,product_url,checkout_url,
  price_label,seller_name,status,created_at,updated_at
)
SELECT
  id,user_id,build_session_id,source_type,slug,title,summary,category,product_url,checkout_url,
  price_label,seller_name,CASE WHEN status='published' THEN 'pending_review' ELSE status END,created_at,updated_at
FROM marketplace_listings;

DROP TABLE marketplace_listings;
ALTER TABLE marketplace_listings_0016 RENAME TO marketplace_listings;

CREATE INDEX IF NOT EXISTS marketplace_listings_public
  ON marketplace_listings(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS marketplace_listings_owner
  ON marketplace_listings(user_id, updated_at DESC);
