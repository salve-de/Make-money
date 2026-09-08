# Buffer — 収集済み事業データ（2026-09-08）

対象は **Buffer 1社の深掘り**。Universalの共通要件とMake-Moneyの必要項目を合わせて調査した。世界中の事例の全件収集ではない。

## いくら儲かったか

| 項目 | 金額・割合 | 期間・扱い |
| --- | ---: | --- |
| 売上 | $22,462,000 | 2025年、会社報告・丸め値 |
| 純利益 | $2,513,367 | 2025年、後日の詳細開示 |
| 純利益率 | 約11.19% | 上記2値から計算。個人手取り率ではない |
| 従業員への利益分配 | $377,005 | FY2025分、75人への合計 |
| 月商 | $2,008,000 | 2025年12月、確認できた最新の月次売上報告 |
| 月次純利益 | $341,037 | 2025年12月 |
| 粗利率 | 83.6% | 2025年10月。年間へ流用しない |
| 粗利益／原価 | 約$1,661,132／$325,868 | 10月売上$1,987,000と粗利率から推計 |
| 営業利益 | 不明 | EBITDAや純利益で代用しない |
| 創業者の個人手取り | 不明 | 給与・会社利益・株式売却額と区別 |

[2025年末の売上・月次利益](https://buffer.com/shareholders/december-2025)、[年間純利益と分配の詳細](https://buffer.com/resources/7th-profit-share/)、[10月の粗利・EBITDA](https://buffer.com/shareholders/october-2025)。

2024年純利益は、以前の公式開示が **$202,459**、2026年の履歴表が **$156,244**。解決理由は未取得。両方を保存した。分配記事の平均額も合計÷人数と一致しないため、そのまま確定平均にしない。[以前の開示](https://buffer.com/resources/2024-profit-share/)、[後日の履歴表](https://buffer.com/resources/7th-profit-share/)。

## 誰が、何を売り、誰が払ったか

- 会社：Buffer, Inc.。創業者Joel Gascoigne、初期共同創業・集客担当Leo Widrich。英国Birmingham発、現在は分散勤務。米国の法的連絡所在地と創業地を混同しない。
- 商品：SNSの予約投稿、分析、複数人の承認・共同作業。
- 顧客実例：WebFXのSNS担当Katie Goodling。CSVを1人に集約していた運用から移行し、月40時間の作業削減を報告。契約額は未取得。
- 課金：現在の年額表示ではEssentialsが1チャネル年$60、Teamが年$120。少額入口からチャネル数・チーム運用に応じて継続課金。

[創業の経緯](https://buffer.com/resources/from-0-to-1000000-users-the-journey-and-statistics-of-buffer/)、[顧客の実例](https://buffer.com/resources/webpagefx-case-study/)、[現行価格](https://buffer.com/pricing)、[法人・契約情報](https://buffer.com/legal)。

## 最初の金と、その後の集客

2010-11-30に公開。夜・週末の7週間で作り、TwitterとHacker Newsから反応を得た。公開後4日以内に初の有料客、最初の支払いは$5。初期約100人は登録者であり、有料100人ではない。[創業者の当時の記事](https://buffer.com/resources/idea-to-paying-customers-in-7-weeks-how-we-did-it/)、[初期の数字](https://buffer.com/resources/from-0-to-1000000-users-the-journey-and-statistics-of-buffer/)。

その後Leoが外部ブログへ寄稿を提案。創業者談では受諾率約20%。初期10万人の集客に寄稿が貢献したが、全部が有料客だったという意味ではない。[提案の実態](https://buffer.com/resources/the-habits-of-successful-people-thinking-in-ratios/)。

2025年の担当者報告では、有料獲得CACを約50%削減、回収約3週間。登録後の初期利用・継続利用を改善した。絶対CAC、媒体別比率は不明。[担当者報告](https://www.linkedin.com/feed/update/urn:li:activity:7416880282403840002)。

## 原価・運営・個人の現金を分ける

- 実額の歴史：2022年のOperating Costsは$19,757,852。現在年度の費用ではない。[費用と価格履歴](https://buffer.com/resources/transparent-pricing-dashboard/)
- 公開費用配分には給与、ホスティング、決済、ツール、広告、税などがある。ただし取得テキストでは対象年を特定できず、2025年売上へ掛け算していない。[配分表](https://buffer.com/transparent-pricing)
- AIツール手当は1人年$250、当時71人で予算上限$17,750。実際の推論API原価ではない。[手当の条件](https://buffer.com/resources/ai-tools-stipend/)
- 2025年末は74人。四日勤務方針はあるが、創業者が週何時間働くかは未取得。サポートには担当者・交代勤務が必要。[年末人員](https://buffer.com/shareholders/december-2025)、[勤務方針](https://buffer.com/timeoff)、[サポート運用](https://buffer.com/resources/customer-advocacy-4-day-workweek/)
- 公開CEO給与$310,320は、税引後手取りではない。[給与表示](https://buffer.com/open)
- 2014年調達$3.5Mには創業者・初期社員への合計$2.5Mの株式流動化を含む。2018年には投資家への$3.3Mの買い戻し。会社売上・Joel個人の純着金へ置き換えていない。[資金の行き先](https://buffer.com/resources/buying-out-investors/)

## 技術と依存

報告された構成はReact/TypeScript、Node、GraphQL/Apollo、MongoDB、AWS/Kubernetesなど。法的な委託先一覧にはStripe、OpenAI、Anthropic、Help Scout、Customer.ioなどがある。カテゴリ別のツール表をJSONに保持した。**利用中の正確なAIモデル、ツールごとの月額実費、自動化率は未取得**。[開発職の構成](https://buffer.com/journey/f005468d-5d8b-4e80-bc59-7b797a38498d)、[委託先一覧](https://buffer.com/legal)。

## 競争・失敗・読み取れる仕組み

2016年には資金不足で10人削減。成功後も2022・2023年に赤字だった。[人員削減](https://buffer.com/resources/layoffs-and-moving-forward/)、[利益の履歴](https://buffer.com/resources/7th-profit-share/)。

Sprout Socialは年払い換算でEssentials $79/席/月、Standard $199/席/月を提供。機能・課金単位が違うため単純な価格倍率で優劣を断定しない。**「大手は小口向けを売れない」という筋書きは反証された。** [競合自身の価格](https://sproutsocial.com/pricing/)。

分析としては「反復する投稿・承認作業を継続課金へ変換する事業」。顧客心理、4 STAGES、継続利用の理由、競争・API依存、隣接する業種別運用の機会を、事実とは別の12件の推論にした。データ監禁、自作自演、規約悪用、個人の確実な再現利益は作っていない。

## 何が保存されるか

- 30件の根拠記録（以前の1件を含む）、26のソース識別子。
- 9主体、23主張、56数値、11金の動き、9イベント、8関係。
- 12分析、10追加観測。48調査項目の状態、FinancialEntityの76項目への対応。
- 期間、通貨、出典、未確認・推計・推論、矛盾、調べたが出なかった事項。
- 原文丸ごとの複製は0。根拠メタデータと独自要約はresearch bundle内。R2原文バケットにコピーしたという意味ではない。

[機械可読データ](./buffer-comprehensive-20260908.request.json) の `observations` に画面対応表、ツール表、追加情報を保持。`collection_coverage` は未調査0だが、未公開の数値まで全部判明した意味ではない。現状UIはmockデータ参照のまま。今回の対象は収集・R2新規保存であり、画面接続変更ではない。

## 保存証明

保存結果は `buffer-comprehensive-20260908.saved.json`、予定キーは `buffer-comprehensive-20260908.plan.json` を参照。

実行結果：新規115件、内容同一の既存3件、読戻しSHA・bytes一致118件。PutObject 115、GetObject 351、HeadBucket 236。Copy/Delete/Move/Rename/Overwrite/既存universal変更/設定変更はいずれも0。4テスト・型検査・正本schema・実コード76項目照合はPASS。

対象バケット：`foundation-lake`

一括データのキー：

```text
datasets/ds.business.research-bundles.derived/v1/2026/09/08/run_buffer_comprehensive_20260908_02.json
```

既存のUniversal、EDINET、shadow、旧Buffer記録は整理・上書き・削除しない。

## 根拠台帳

以下は参照先の索引。公開日不明と取得日を混同しない。財務数値は主に当事者開示であり、監査証明ではない。

| ID | 資料 | 公開日 | 発言・発行 |
| --- | --- | --- | --- |
| 0 | [December 2024 shareholder update](https://buffer.com/shareholders/december-2024) | 2025-01-31 | Joel Gascoigne |
| 1 | [December 2025 shareholder update](https://buffer.com/shareholders/december-2025) | 2026-01-20 | Jenny Terry |
| 2 | [October 2025 shareholder update](https://buffer.com/shareholders/october-2025) | 2025-11-19 | Jenny Terry |
| 3 | [August 2025 shareholder update](https://buffer.com/shareholders/august-2025) | 2025-09-19 | Joel Gascoigne |
| 4 | [Transparent Metrics Dashboard](https://buffer.com/metrics) | 未特定 | Buffer |
| 5 | [Open dashboard](https://buffer.com/open) | 未特定 | Buffer |
| 6 | [Pricing](https://buffer.com/pricing) | 未特定 | Buffer |
| 7 | [Transparent Pricing](https://buffer.com/transparent-pricing) | 未特定 | Buffer |
| 8 | [Where Your Money Goes When You Buy a Buffer Subscription](https://buffer.com/resources/transparent-pricing-dashboard/) | 2023-08-16 | Jenny Terry |
| 9 | [Idea to Paying Customers in 7 Weeks](https://buffer.com/resources/idea-to-paying-customers-in-7-weeks-how-we-did-it/) | 2011-02-16 | Joel Gascoigne |
| 10 | [From 0 to 1,000,000 Users: The Journey and Statistics of Buffer](https://buffer.com/resources/from-0-to-1000000-users-the-journey-and-statistics-of-buffer/) | 2013-09-19 | Leo Widrich |
| 11 | [The Habits of Successful People: Thinking in Ratios](https://buffer.com/resources/the-habits-of-successful-people-thinking-in-ratios/) | 未特定 | Joel Gascoigne |
| 12 | [5 Key Lessons We Learned From Pivoting Our Blog](https://buffer.com/resources/5-key-lessons-we-learned-from-pivoting-our-blog/) | 2012-11-01 | Leo Widrich |
| 13 | [Simon Heaton on 2025 customer acquisition; reposted by Buffer](https://www.linkedin.com/feed/update/urn:li:activity:7416880282403840002) | 未特定 | Simon Heaton |
| 14 | [Buying Out Investors](https://buffer.com/resources/buying-out-investors/) | 2018-08-29 | Joel Gascoigne |
| 15 | [Layoffs and Moving Forward](https://buffer.com/resources/layoffs-and-moving-forward/) | 2016-06-16 | Joel Gascoigne |
| 16 | [Time Off](https://buffer.com/timeoff) | 未特定 | Buffer |
| 17 | [Customer Advocacy and the Four-Day Workweek](https://buffer.com/resources/customer-advocacy-4-day-workweek/) | 2021-06-08 | Åsa Nyström |
| 18 | [How Much Do You Work Without Set Hours? A Buffer Case Study](https://buffer.com/resources/how-much-do-you-work-without-set-hours-a-buffer-case-study/) | 2015-04-13 | Courtney Seiter |
| 19 | [Buffer engineering role: technology stack](https://buffer.com/journey/f005468d-5d8b-4e80-bc59-7b797a38498d) | 未特定 | Buffer |
| 20 | [Buffer infrastructure engineering role](https://buffer.com/journey/1ee8b707-48a0-40cc-a319-3fb7c665a1e8) | 未特定 | Buffer |
| 21 | [Buffer Legal: Terms, Privacy, DPA and Subprocessors](https://buffer.com/legal) | 未特定 | Buffer |
| 22 | [WebFX Customer Case Study](https://buffer.com/resources/webpagefx-case-study/) | 2016-04-06 | Kevan Lee; interview with Katie Goodling |
| 23 | [Buffer vs. Sprout Social (2026)](https://buffer.com/resources/buffer-vs-sprout-social/) | 2026-07-01 | Shivani Shah |
| 24 | [Sprout Social Pricing](https://sproutsocial.com/pricing/) | 未特定 | Sprout Social |
| 25 | [About Buffer](https://buffer.com/about) | 未特定 | Buffer |
| 26 | [Returning to Profitability: Buffer's 2024 Profit Share & Formula](https://buffer.com/resources/2024-profit-share/) | 2025-02-07 | Joel Gascoigne |
| 27 | [Our 7th Profit Share: Behind the $377,005 We Distributed](https://buffer.com/resources/7th-profit-share/) | 2026-02-04 | Jenny Terry |
| 28 | [We Added a $250 AI Tools Stipend](https://buffer.com/resources/ai-tools-stipend/) | 2025-02-28 | Jenny Terry |
| 29 | [September 2025 shareholder update](https://buffer.com/shareholders/september-2025) | 2025-11-14 | Jenny Terry |
