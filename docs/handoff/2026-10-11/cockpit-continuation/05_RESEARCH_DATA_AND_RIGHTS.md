# 05｜競合・UX・需要データ・権利の調査履歴

**これはこの会話で参照・収録された情報源と判断の引継ぎ。今回のGitHub記録時に全サイト/価格/規約を再調査した台帳ではない。** 元資料の対象、期間、確認方法、未許諾を保持する。前段の[03](../03_MARKET_DATA_SOURCES_AND_RIGHTS.md)・[06](../06_SOURCE_AND_REFERENCE_REGISTER.md)も必読。

## 1. 競合から何を比較したか

|サービス/領域|会話で比較した情報価値|そのまま採用しない点|
|---|---|---|
|Google Trends|検索関心、関連語、時系列、地域、急上昇一覧→詳細|ニュース検索の急上昇を購買/利益と同義にしない|
|Exploding Topics|テーマ・商品発見、成長分野、Meta Trendsと内訳|見た目のカードや成長ラベルだけをコピーしない|
|Pinterest Trends / Predicts|趣味、生活、季節、憧れ・表現などの幅広い関心|Pinterestの対象を全世界の人口・販売実績へ一般化しない|
|Amazon Product Opportunity Explorer|商品検索と購入、競合、未充足の手掛かり|出品者向けのアクセスと、第三者への再配信を区別|
|Etsy|マーケット内の商品検索・販売、出品料金と対価|同じレポートの複数値を独立した調査数に数えない|
|Similarweb|市場、流入、競争、地域の推計|トラフィック推計と実売上・利益を混同しない|
|Trends.vc|市場の構造・機会・事業者・条件・リスク|横断分析を単なる一般論や標語へ薄めない|
|Starter Story|実在事業の創業・収益・費用・集客|企業ごとの成功談を傾向トップへ並べるだけにしない|
|Trend Hunter|新商品・文化・複数事例のパターン、広い探索|発見の数や奇抜さだけで有料価値を判断しない|
|Upwork|実際の業務契約・検索の変化|米国の同プラットフォーム内と世界の全仕事を区別|
|eBay|中古購入者調査、商品成約の分析機能|購入意向/回答者割合と実際の取引数を区別|
|Koyfin|複数パネル、同一グループの選択連動|黒い画面・パネル数だけを真似しない。API/データは利用していない|
|TradingView|表・ヒートマップの面積/色に使う指標の意味|異なる指標を色/面積で一つの需要強度に見せない|

Bloomberg/Palantir/作戦室という表現はアシスタント側の感覚の比喩。オーナーが特定製品のレイアウトを採用した意味ではない。

## 2. UXの参照先と設計への適用

- Koyfin My Dashboards: https://www.koyfin.com/help/mydashboards-myd/
- Koyfin Groups: https://www.koyfin.com/help/my-dashboards-groups/
  - 学ぶ対象：選択対象がグループ内の表・グラフへ反映される。V2の対象連動の参考。
- TradingView Size by / Color by: https://www.tradingview.com/support/solutions/43000707144-how-to-set-up-a-heatmap-what-is-size-by-and-color-by/
  - 学ぶ対象：面積/色/数値の意味を定義する。比較不能なデータでは熱量や成功スコアを作らない。
- NN/g Dashboard: https://www.nngroup.com/articles/dashboards-preattentive/
- NN/g Visual hierarchy: https://www.nngroup.com/articles/visual-hierarchy-ux-definition/
- NN/g Information scent: https://www.nngroup.com/articles/information-scent/
- NN/g Progressive disclosure: https://www.nngroup.com/articles/progressive-disclosure/
- NN/g Categories: https://www.nngroup.com/articles/category-names-suck/
- NN/g Keyword foraging: https://www.nngroup.com/articles/keyword-foraging/
- NN/g Recommendations: https://www.nngroup.com/articles/recommendation-guidelines/
- NN/g Aesthetic usability: https://www.nngroup.com/articles/aesthetic-usability-effect/
- Baymardのホームから品揃えを推測する研究: https://baymard.com/research-articles/inferring-product-catalog-from-homepage
  - 学ぶ対象：抽象カテゴリだけでも、偏った数例だけでも提供範囲が伝わらない。ただし通販研究をMAKEMONEYの実測としない。
- W3C target size: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum
  - 寸法と間隔・例外の条件を確認。44px等の設計目安や一部実測を全面WCAG適合としない。
- Apple HIG、Material/Android Adaptive Layouts等は前段資料に記録。左右ペインの固定や一律のミニマリズムを要求するものではない。

会話にはニュースへの支払いの調査や好奇心の情報ギャップ理論を使う説明もあった。これは製品仮説の参考であり、MAKEMONEYの支払意思・最適料金・継続率の証明ではない。出典を再取得せず古い数字を本番コピーに再使用しない。

## 3. V2の9市場資料

下表は同梱`SOURCE_REGISTER.md`と`data.json`にある記録を引き継ぐ。『確認方法』は当時の記録で、今回全てを再閲覧した意味ではない。

|ID/原典|対象・公表/観測|重要な限界|
|---|---|---|
|sensor / Sensor Tower State of Mobile 2026|世界のiOS/Google Play、2025年対2024年、公表2026-01|アプリ内課金等の推計。時間/ダウンロード/課金は別。日付は月精度|
|ebay / Recommerce 2026|10か国・中古購入経験者約1.05万人、2026年7月調査、公表10月7日|2025年35%→2026年47%は各年回答者比率。+12ポイント。原文の標本数に1名差があり約数表記|
|circana / US Beauty H1 2026|米国2026年上半期、公表8月11日|高価格帯/量販、売上/数量、香水/スキンケア等を分離|
|coursera / Global Skills Report 2026|学習記録の一部、98か国分析、公表9月28日|受講登録は購入とは限らず、厳密な前年比観測日付が資料にない|
|upwork / Monthly Hiring Insights Aug 2026|米国顧客のプラットフォーム内、8月、公表9月15日|技能ごとの契約の方向と検索順位は別。未掲載の成長率を創作しない|
|etsytr / Spring/Summer 2026|米国ログイン利用者、2月10日までの3か月と前年同期、公表3月17日|ニードルポイントキット等の検索と衣類販売を分ける。10月の最新売上ではない|
|ifpi / Global Music Report 2026|世界の録音音楽収入2025年、公表3月18日|7地域。ライブ市場や個人手取りではない。過年数値が遡及修正される場合がある|
|tourism / UN Tourism|世界の宿泊を伴う国際観光客到着数2025年、公表1月20日|到着数は延べ集計。支出額や利益ではない|
|meti / EC Market Survey|日本消費者向けEC2024年実績、公表2025年8月26日|2026年の値に変えない。日本政府統計は補助であり世界の具体需要の代わりではない|

原典URL：

- https://sensortower.com/blog/state-of-mobile-2026
- https://www.ebayinc.com/stories/news/ebay-recommerce-report-secondhand-shopping-rises-worldwide-as-consumers-seek-value-and-stretch-budgets/
- https://www.circana.com/post/us-beauty-industry-posts-solid-first-half-growth-as-fragrance-and-skincare-lead-across-prestige-and
- https://blog.coursera.org/global-skills-report-2026/
- https://www.upwork.com/research/upwork-monthly-hiring-insights-august-2026
- https://www.etsy.com/seller-handbook/article/1473931456647
- https://www.ifpi.org/global-music-report-2026-global-recorded-music-revenues-grow-6-4-as-record-companies-drive-innovation/
- https://www.untourism.int/news/international-tourist-arrivals-up-4-in-2025-reflecting-strong-travel-demand-around-the-world
- https://www.meti.go.jp/press/2025/08/20250826005/20250826005.html

eBay/Circana/Coursera/Upwork/UN Tourism/METIは同梱記録上、直接取得失敗のため公式URLの検索結果本文を使ったと記されている。出典リンクがあることと全文・全条件の確認済みを混同しない。

## 4. 参考事業の情報

V2の14参考事業は、収益の仕組みを具体化する参照であって、その会社の利益・成功確率を実証する標本ではない。

Polarsteps、Mixbook、Printful、Button Shy、Wildgrain、Coursera、Geocodio、Gumroad、NoteForms、Data Fetcher、Etsy、Snipcart、eBay、Bandcampの公式提供/料金/機能ページ等を使用。Notionのフォーム標準追加は補完商品の依存先による競争の参考。特定社の売上減を証明しない。

代表URL：
- https://support.polarsteps.com/hc/en-us/articles/29003435822866-Is-Polarsteps-free
- https://www.mixbook.com/
- https://www.printful.com/how-printful-works
- https://buttonshygames.com/pages/welcome
- https://wildgrain.com/collections/subscriptions-for-carb-lovers
- https://www.coursera.org/courseraplus
- https://www.geocod.io/pricing
- https://gumroad.com/pricing
- https://noteforms.com/features/white-label
- https://datafetcher.com/pricing
- https://datafetcher.com/airtable-integrations/api
- https://www.etsy.com/legal/fees/
- https://snipcart.com/pricing
- https://www.notion.com/ja/releases/2024-10-24
- https://www.ebay.com/sellercenter/selling/start-selling-on-ebay/seller-fees
- https://get.bandcamp.help/en/articles/15263193-what-are-bandcamp-s-fees

## 5. 継続収集と商用利用を分ける

Google Trendsは会話でCSV/埋込/帰属付き利用案内と、限定アルファAPIの状態を調べた。UIの再利用案内から、定期大量取得や有料DBへの無制限再配信まで許可されたとはしない。

確認先：
- https://support.google.com/trends/answer/4365538
- https://support.google.com/trends/answer/3076011
- https://developers.google.com/search/apis/trends
- https://developers.google.com/search/blog/2025/07/trends-api
- https://developers.google.com/google-ads/api/docs/keyword-planning/overview
- https://developers.google.com/google-ads/api/docs/policy
- https://dataforseo.com/pricing/keywords-data/dataforseo-trends-api-pricing
- https://docs.dataforseo.com/v3/
- https://redditinc.com/policies/data-api-terms

DataForSEO、Google Ads、Semrush、Similarweb、Pinterest/Etsy、Reddit/SNS/レビュー、SAM.gov/TED等は前段からの継続候補。正式な採用は未決。

**各ソースで別々に判定すること**：取得経路/自動アクセス、内部分析、原文/データの保存と期間、無料公開、会員向け数値表示、派生指標の販売、DB/API/CSVとしての再配信、引用・画像・商標、削除/訂正/契約終了時の義務、料金・上限。

欠けたオープンライセンスだけを理由に全ての独立した事実を違法と決めない一方、公開URL・AI言い換え・購入したAPIを理由に全て許可ともしない。根拠、利用行為、契約条件を確認し、必要なら別の原典で確認する。未確認の原データを本番公開へ自動昇格しない。

## 6. 継続価値・採算の論点

- 新着記事数ではなく、同じ需要の証拠追加/訂正/変化が追えることを評価。
- 世界を広く扱うが、有料APIを多数同時契約するのではなく、意味があり合法的に継続供給できる少数の経路を実証。
- 取得、LLM抽出、照合、重複排除、保存、公開審査、更新、修正対応、人の工数を含め原価を測る。
- 過去の2,980円/月・29,800円/年は旧案。無料/有料境界、今の原価、利用者の支払意思で再判断。
- 無料で広さや面白さが伝わることと、深い調査・継続監視に払うことは両立し得るが、実測前の仮説。

情報源の取りやすさだけで画面を埋めない。選んだ需要に関係がなくても表示できる音楽データを置く、例が手芸とAIに偏る、といった旧版の失敗を繰り返さない。
