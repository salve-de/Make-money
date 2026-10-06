-- Make-Money 内で掲載した商品を買う・紹介して売るための記録。
-- 支払いは「テスト購入」（実際の請求なし）だけ。実決済の接続は別途で、この表は売上や分配を約束しない。
-- 掲載（marketplace_listings）への外部キーは張らない。退会で掲載が消えても取引の記録は残す。
-- 注文・支払いの出来事・紹介の台帳・クリックは追記だけ（更新・削除は拒否する）。

-- 出品者が掲載ごとに決める販売条件。購入時の価格と報酬率は注文側に写して固定する。
CREATE TABLE IF NOT EXISTS commerce_offers (
  listing_id TEXT PRIMARY KEY,
  seller_id TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0,1)),
  price_jpy INTEGER NOT NULL CHECK(price_jpy BETWEEN 100 AND 10000000),
  referral_rate_bp INTEGER NOT NULL DEFAULT 0 CHECK(referral_rate_bp BETWEEN 0 AND 5000),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TRIGGER IF NOT EXISTS commerce_offers_owner_fixed BEFORE UPDATE ON commerce_offers
WHEN NEW.listing_id != OLD.listing_id OR NEW.seller_id != OLD.seller_id
BEGIN SELECT RAISE(ABORT, 'commerce offer owner is fixed'); END;

-- 紹介者ごと・掲載ごとに1本の紹介リンク。
CREATE TABLE IF NOT EXISTS commerce_referral_links (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE CHECK(length(code) BETWEEN 8 AND 32),
  listing_id TEXT NOT NULL,
  referrer_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(listing_id, referrer_id)
);
CREATE TRIGGER IF NOT EXISTS commerce_referral_links_no_update BEFORE UPDATE ON commerce_referral_links
BEGIN SELECT RAISE(ABORT, 'referral links are append-only'); END;
CREATE TRIGGER IF NOT EXISTS commerce_referral_links_no_delete BEFORE DELETE ON commerce_referral_links
BEGIN SELECT RAISE(ABORT, 'referral links are append-only'); END;

-- 紹介リンクの訪問。訪問者は「日付・接続元・リンク」の一方向の要約だけを持ち、同じ日の重複は数えない。
CREATE TABLE IF NOT EXISTS commerce_referral_clicks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  link_id TEXT NOT NULL REFERENCES commerce_referral_links(id),
  visitor_hash TEXT NOT NULL CHECK(length(visitor_hash) = 64),
  created_at TEXT NOT NULL,
  UNIQUE(link_id, visitor_hash)
);
CREATE TRIGGER IF NOT EXISTS commerce_referral_clicks_no_update BEFORE UPDATE ON commerce_referral_clicks
BEGIN SELECT RAISE(ABORT, 'referral clicks are append-only'); END;
CREATE TRIGGER IF NOT EXISTS commerce_referral_clicks_no_delete BEFORE DELETE ON commerce_referral_clicks
BEGIN SELECT RAISE(ABORT, 'referral clicks are append-only'); END;

-- 注文。価格・商品名・紹介者・報酬率は購入時点の写し。自分の商品の購入と、自分の紹介での報酬は作れない。
CREATE TABLE IF NOT EXISTS commerce_orders (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL,
  listing_slug TEXT NOT NULL,
  seller_id TEXT NOT NULL,
  buyer_id TEXT NOT NULL,
  mode TEXT NOT NULL CHECK(mode IN ('test')),
  title_snapshot TEXT NOT NULL CHECK(length(title_snapshot) BETWEEN 1 AND 100),
  price_jpy INTEGER NOT NULL CHECK(price_jpy BETWEEN 100 AND 10000000),
  request_key_hash TEXT NOT NULL CHECK(length(request_key_hash) = 64),
  referral_link_id TEXT REFERENCES commerce_referral_links(id),
  referrer_id TEXT,
  referral_rate_bp INTEGER NOT NULL DEFAULT 0 CHECK(referral_rate_bp BETWEEN 0 AND 5000),
  referral_note TEXT NOT NULL DEFAULT 'none' CHECK(referral_note IN ('none','credited','self_excluded','seller_excluded','other_listing','no_reward')),
  created_at TEXT NOT NULL,
  UNIQUE(buyer_id, request_key_hash),
  CHECK(buyer_id != seller_id),
  CHECK((referral_link_id IS NULL AND referrer_id IS NULL) OR (referral_link_id IS NOT NULL AND referrer_id IS NOT NULL)),
  CHECK(referrer_id IS NULL OR (referrer_id != buyer_id AND referrer_id != seller_id))
);
CREATE TRIGGER IF NOT EXISTS commerce_orders_no_update BEFORE UPDATE ON commerce_orders
BEGIN SELECT RAISE(ABORT, 'orders are append-only'); END;
CREATE TRIGGER IF NOT EXISTS commerce_orders_no_delete BEFORE DELETE ON commerce_orders
BEGIN SELECT RAISE(ABORT, 'orders are append-only'); END;

-- 支払い・返金の出来事。状態はここから導く（注文を書き換えない）。
CREATE TABLE IF NOT EXISTS commerce_order_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL REFERENCES commerce_orders(id),
  kind TEXT NOT NULL CHECK(kind IN ('paid','refunded')),
  actor_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(order_id, kind)
);
CREATE TRIGGER IF NOT EXISTS commerce_order_events_no_update BEFORE UPDATE ON commerce_order_events
BEGIN SELECT RAISE(ABORT, 'order events are append-only'); END;
CREATE TRIGGER IF NOT EXISTS commerce_order_events_no_delete BEFORE DELETE ON commerce_order_events
BEGIN SELECT RAISE(ABORT, 'order events are append-only'); END;

-- 紹介報酬の台帳。付与（accrued）と返金による取り消し（reversed、負の額）を別の行で残す。
CREATE TABLE IF NOT EXISTS commerce_referral_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL REFERENCES commerce_orders(id),
  link_id TEXT NOT NULL REFERENCES commerce_referral_links(id),
  referrer_id TEXT NOT NULL,
  listing_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('accrued','reversed')),
  amount_jpy INTEGER NOT NULL CHECK((kind = 'accrued' AND amount_jpy >= 0) OR (kind = 'reversed' AND amount_jpy <= 0)),
  rate_bp INTEGER NOT NULL CHECK(rate_bp BETWEEN 0 AND 5000),
  created_at TEXT NOT NULL,
  UNIQUE(order_id, kind)
);
CREATE TRIGGER IF NOT EXISTS commerce_referral_ledger_no_update BEFORE UPDATE ON commerce_referral_ledger
BEGIN SELECT RAISE(ABORT, 'referral ledger is append-only'); END;
CREATE TRIGGER IF NOT EXISTS commerce_referral_ledger_no_delete BEFORE DELETE ON commerce_referral_ledger
BEGIN SELECT RAISE(ABORT, 'referral ledger is append-only'); END;

CREATE INDEX IF NOT EXISTS commerce_orders_buyer ON commerce_orders(buyer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS commerce_orders_seller ON commerce_orders(seller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS commerce_referral_links_referrer ON commerce_referral_links(referrer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS commerce_referral_ledger_referrer ON commerce_referral_ledger(referrer_id, created_at DESC);
