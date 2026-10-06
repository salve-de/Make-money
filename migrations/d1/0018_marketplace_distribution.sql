-- 掲載と外部の SellRelay（紹介販売の仕組み）との対応表だけを持つ。
-- 決済・顧客・資格情報・紹介報酬の台帳は持たない（報酬の計算と支払いは SellRelay 側の責任）。
-- Make-Money 内のテスト購入・紹介（0017 の commerce_*）とは別の経路で、互いの行を参照しない。
-- 退会（users の削除）では、この対応表の行だけが連鎖で消える。作者が SellRelay に持つ商品は消さない。
-- marketplace_listings へは外部キー・トリガーを張らない（0016 のような表の作り直しで連鎖削除や失敗を起こさないため）。
-- 「公開中の自分の掲載か」は、読むたび・書くたびにアプリ側で確かめる（commerce_* と同じ方針）。

-- 掲載1件につき SellRelay の商品1件。作成の途中状態（prepared→sending→checking→linked）を持ち、
-- 応答が消えた作成を盲目的に再送せず、作者の商品一覧と照合して linked にする。
CREATE TABLE IF NOT EXISTS marketplace_distribution_links (
  listing_id TEXT PRIMARY KEY CHECK(length(listing_id) BETWEEN 1 AND 128),
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  relay_owner_id TEXT NOT NULL CHECK(length(relay_owner_id) BETWEEN 1 AND 128),
  relay_origin TEXT NOT NULL CHECK(length(relay_origin) BETWEEN 1 AND 255),
  mode TEXT NOT NULL CHECK(mode IN ('contract-test','live')),
  fingerprint TEXT NOT NULL CHECK(length(fingerprint) = 64),
  product_payload TEXT NOT NULL CHECK(json_valid(product_payload)),
  destination_url TEXT NOT NULL CHECK(length(destination_url) BETWEEN 1 AND 2048),
  relay_product_id TEXT CHECK(relay_product_id IS NULL OR length(relay_product_id) BETWEEN 1 AND 128),
  state TEXT NOT NULL CHECK(state IN ('prepared','sending','checking','linked')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK(state != 'linked' OR relay_product_id IS NOT NULL),
  UNIQUE(relay_origin, mode, relay_product_id)
);

-- 紹介者（出品者とは別の利用者）ごとに1本。公開するのは推測できない32桁のコードだけで、
-- SellRelay 側のコードはサーバーの中だけで使う。
CREATE TABLE IF NOT EXISTS marketplace_distribution_referrals (
  public_code TEXT PRIMARY KEY CHECK(length(public_code) = 32 AND public_code NOT GLOB '*[^0-9a-f]*'),
  listing_id TEXT NOT NULL REFERENCES marketplace_distribution_links(listing_id) ON DELETE CASCADE,
  partner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  relay_partner_id TEXT NOT NULL CHECK(length(relay_partner_id) BETWEEN 1 AND 128),
  relay_code TEXT NOT NULL CHECK(length(relay_code) BETWEEN 1 AND 128),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(listing_id, partner_id)
);

-- 持ち主・SellRelay 側の持ち主・接続先・送った条件は後から変えない。確定した商品の対応も外さない。
CREATE TRIGGER IF NOT EXISTS marketplace_distribution_links_fixed
BEFORE UPDATE ON marketplace_distribution_links
WHEN NEW.listing_id != OLD.listing_id OR NEW.owner_id != OLD.owner_id OR NEW.relay_owner_id != OLD.relay_owner_id
  OR NEW.relay_origin != OLD.relay_origin OR NEW.mode != OLD.mode OR NEW.product_payload != OLD.product_payload
  OR NEW.fingerprint != OLD.fingerprint OR NEW.destination_url != OLD.destination_url
  OR (OLD.relay_product_id IS NOT NULL AND (NEW.relay_product_id IS NULL OR NEW.relay_product_id != OLD.relay_product_id))
BEGIN SELECT RAISE(ABORT, 'distribution link identity is fixed'); END;

-- 出品者本人は自分の掲載の紹介者になれない。
CREATE TRIGGER IF NOT EXISTS marketplace_distribution_no_self_referral
BEFORE INSERT ON marketplace_distribution_referrals
WHEN EXISTS(SELECT 1 FROM marketplace_distribution_links WHERE listing_id=NEW.listing_id
  AND (owner_id=NEW.partner_id OR relay_owner_id=NEW.relay_partner_id))
BEGIN SELECT RAISE(ABORT, 'self referral is not allowed'); END;
CREATE TRIGGER IF NOT EXISTS marketplace_distribution_referrals_fixed
BEFORE UPDATE ON marketplace_distribution_referrals
BEGIN SELECT RAISE(ABORT, 'distribution referrals are fixed'); END;

CREATE INDEX IF NOT EXISTS marketplace_distribution_referrals_partner ON marketplace_distribution_referrals(partner_id);
