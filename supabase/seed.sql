-- Safe initial taxonomy. Re-runnable.
insert into public.categories (id, label, icon, description, sort_order) values
  ('ai-automation', 'AI・自動化', 'AI', '人手で行われている反復業務を置き換える市場', 10),
  ('vertical-saas', '業界特化SaaS', 'VS', '業界固有の面倒を月額課金で解決する市場', 20),
  ('commerce', 'EC・販売支援', 'EC', '売る人の売上・利益・運用を改善する市場', 30),
  ('creator', 'クリエイター', 'CR', '発信・販売・コミュニティ運営を支援する市場', 40),
  ('regulation', '制度・規制対応', 'RG', '変更対応が必須になるため支払意思が生まれる市場', 50),
  ('local-business', '地域・店舗', 'LB', '現場の人手不足や集客を改善する市場', 60),
  ('developer-tools', '開発者ツール', 'DT', '開発速度・品質・運用コストを改善する市場', 70),
  ('data-intelligence', 'データ・調査', 'DI', '判断に必要な情報を集約・比較・監視する市場', 80)
on conflict (id) do update set
  label = excluded.label,
  icon = excluded.icon,
  description = excluded.description,
  sort_order = excluded.sort_order;

-- The browser prototype already contains clearly marked demo records.
-- Production Money Signals, Opportunities, Services and Demands should be inserted
-- only after source review. This seed intentionally avoids publishing invented numbers.
