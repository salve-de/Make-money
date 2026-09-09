# Make-Money / business-case 収集対象の完全目録

この文書は、Make-Moneyの事例調査で「何を調べ、何を残すか」をAIが迷わないように固定する横断契約です。新しいスキーマ、データベース、R2バケット、R2保存方式を追加する文書ではありません。意味の正本は `salve-de/universal-foundation` の登録済み契約、`research-bundle.v1`、`journal-entry.v1`、および `business-case.v2` です。

この文書は [Universal Foundationの同名正本](https://github.com/salve-de/universal-foundation/blob/main/docs/MAKE_MONEY_COLLECTION_SCOPE.md) と同じ内容をMake-Money側にも置いたものです。内容が食い違う場合はUniversal Foundationのmainを上位正本とし、差分を放置しないでください。

## 0. 横断再利用の境界

ここで集める事例は、Make-Moneyの記事専用素材ではなく、Foundationの共通資産です。出典付きの事実、過去時点のスナップショット、金の流れ、運営制約、調査状態、出典・権利・未知を残し、Make-Money、Idea Spark、GOLDMINE、Investrader、今後の新規プロジェクトが同じ記録を再利用できるようにします。ランキング、物語、画面ラベル、行動提案などのプロジェクト固有の表現は、元の事実を書き換えず、再生成可能なderived / serving viewとして扱います。将来のAIは、安定したIDと明示的な出典を使って既存のEntity / Claim / Metric / MoneySignal / Event / Relationship / observation / Journalを選び、各プロジェクト独自のViewを作ります。複数プロジェクトで使える観測は、特定プロダクト前提に埋め込まず、既存フィールド・observations・Journalのまま保持します。

## 1. 絶対に止めてはいけない調査範囲

各事例について、単なる会社紹介ではなく、次を一体として調べて保存します。

- 何を、誰の、どんな痛み・欲望・リスクに対して売ったか
- 顧客がどこから来て、誰が支払い、どの経路で継続・離脱したか
- 価格、割引、手数料、原価、運営費、税・返金・再投資、資金の到着時期
- 創業者・チームの実作業、外注、サポート、技術、データ、プラットフォーム依存
- 立ち上げ、最初の顧客、急成長、失敗、ピボット、買収、終了、現在の生存状態
- 出典、時点、引用箇所、推定の計算根拠、矛盾、まだ分からないこと
- 既存項目に入らないが、成功・失敗・収益構造を説明する重要な観測

現在の画面、過去の91細目、1つのサイト、一次情報だけに調査を限定しません。一次情報は優先しますが、排他的な条件ではありません。

### 必ず試す情報源の9レーン

1. **公式・当事者** — 会社サイト、料金表、利用規約、変更履歴、届出、公開ダッシュボード、創業者発言。
2. **創業者・運営者** — インタビュー、ポッドキャスト、講演、ニュースレター、ブログ、build in public、デモ。
3. **公開アーカイブ** — Wayback等の合法的な公開アーカイブ、旧LP、旧価格、旧名称、ローンチ・ピボットの痕跡。
4. **信頼できる二次情報** — 報道、専門媒体、調査、資金調達、買収、閉鎖・失敗記事。
5. **市場の売り場** — Product Hunt、マーケットプレイス、アプリストア、ディレクトリ、比較サイト、レビュー、公開ランキング。
6. **顧客・コミュニティ** — 公開レビュー、フォーラム、Reddit/HN、Issue、要望、返金・解約・不満、公開SNS。宣伝と独立した摩擦を分離し、根拠なく偽物扱いしない。
7. **公開シグナル** — 検索・トラフィック推定、SEO、技術構成、求人、連携、紹介、アフィリエイト、パートナー経路。推定値は推定値のまま保存する。
8. **失敗・結果** — 閉鎖、失敗商品、失敗チャネル、買収、売却、ピボット、再挑戦、清算、衰退。
9. **出典未回収の手掛かり** — 公開上は存在するが、まだ元ページを回収できない言及・候補。`UNVERIFIED` / `unknown` のまま残し、確認済み事実に昇格しない。

調べて該当しなかった場合は `attempted_unavailable`、まだ調べていない場合は `not_attempted`、対象外の場合は `not_applicable`、見つかった場合は `found`、判断できない場合は `unknown` として区別します。これらを「情報なし」の一語に潰しません。

## 2. 全事例で確認する12領域

12領域は画面項目の一覧ではなく、調査の抜けを防ぐための必須チェックです。これ以外の有用な情報も捨てず、既存の `observations` とUniversal Journalへ残します。

| 領域 | 調べる内容 |
| --- | --- |
| `identity` | 名称、別名、URL・ドメイン、法人・主体、所在地、創業・開始、現在状態、所有・買収、対象範囲。 |
| `people` | 創業者、役割、経歴、人数、特定人物への集中、採用・チーム変化、過去の挑戦。 |
| `product` | 解決する問題、仕事、仕組み、商品・サービス、提供方法、用途、差別化、変わった使われ方。 |
| `customer_and_demand` | 支払者、購買担当、顧客層、痛み、緊急度、支払意思、最初の顧客、継続・解約・再購入、代替・回避策。 |
| `pricing` | プラン、価格、単位、値引き、年払い・買い切り・前払い、価格の変遷、返金、手数料、紹介者・代理店の取り分。 |
| `money_and_economics` | 売上、MRR/ARR/GMV、期間・ピーク・直近、原価、粗利・営業利益・純利益、費用、利益率、資金調達、売却価値、現金時期、創業者手残り。 |
| `distribution` | 最初の顧客・10人・100人、ローンチ面、検索・SEO、コミュニティ、Product Hunt、売り場、コンテンツ、広告、アフィリエイト、提携、紹介、プラットフォーム依存。 |
| `operations` | 作業量、サポート、手作業、外注、自動化、納品、業者、必要資本、ボトルネック、失敗条件。 |
| `technology` | フロント・バックエンド、DB、ホスティング、決済、分析、メール、自動化、サポート、AI/API、モデル費、データ・業務依存。 |
| `competition_and_market` | 直接・間接競合、代替、構造変化、大手の制約、規制、決済・プラットフォーム依存、集中リスク。 |
| `timeline_and_outcomes` | 開始、初回販売、節目、価格・チーム変更、急成長、失敗、ピボット、買収、終了・衰退、なぜその時期だったか。 |
| `provenance_rights_and_uncertainty` | 出典・証拠ID、発行者、日付、URL・位置、権利・raw保存可否、情報源の種類、検証状態、確度、矛盾、未知、アクセス失敗。 |

## 3. 必須の「表に出にくい」4領域

次の4つは任意のUIカードではなく、全事例で調べる研究対象です。根拠がなければ、試したことと不明を保存します。

1. **初動突破ログ** — 最初の顧客・最初の100人に至った合法的で観測可能な経路。ローンチ、公開開発、コミュニティ、営業、提携、バッジ・紹介ループなど。
2. **大手の自爆・カニバリ障壁** — 大手が単純コピー・配布すると、高単価商品、既存顧客、業務、価格、社内インセンティブを壊すために真似しにくい理由。
3. **痛みの財布** — 顧客が払う具体的な仕事、恐怖、遅延、費用、恥、損失、規制・コンプライアンス負担。資料の事実と分析者の解釈を分ける。
4. **手残りの資金ウォーターフォール** — 売上を決済手数料、原価、ホスティング/API/ツール、広告、労働、税、返金、再投資に分解し、最後に創業者現金の推計を置く。

## 4. 必須の「暗部」5パラメータ

5. **寄生宿主・プラットフォーム依存** — 外部オーディエンス、API、アプリストア、マーケットプレイス、検索、SNS、決済、配布面と、そのレバー・停止リスク。
6. **データ・業務の監禁** — 蓄積データ、業務への埋込み、API依存、移行・エクスポート負担、解約時の損失。
7. **賄賂紹介網・紹介経済** — アフィリエイト、代理店、リセラー、スポンサー、紹介報酬、支払期間、CACと粗利への影響。
8. **前金総取り・負の運転資本** — 年払い、買い切り、デポジット、予約など、仕入・提供コストより先に現金が入る構造。
9. **ピボット魚拓・失敗墓場** — 前商品、失敗チャネル、閉鎖、再挑戦、最終的に条件が変わった境界。

## 5. 見落としやすい3つと時間軸

二巡目では必ず次を試します。

- **アーカイブの履歴** — 初期ページ、最初の告知、初期価格、ローンチ面、ピボットを公開アーカイブで確認する。
- **顧客の摩擦と宣伝の分離** — 独立した苦情、返金、解約理由、Issue、導入阻害をPR・アフィリエイト称賛と分ける。
- **獲得配管と表向きの主張の分離** — 創業者の説明を検索・流入推定・比較・紹介シグナルで照合し、確認済み経路と未確認主張を分ける。

現在のページだけで過去を上書きしません。価格・製品版・チーム・状態・成長・衰退・買収・終了には、可能な限り時点、適用期間、時代、状態遷移、存続可能性のシグナルを付けます。

## 6. お金の扱い

金額や利益は必ず次の種類を付けます。

- `reported`: 出典が明示的に報告している
- `observed`: 公開資料から直接観測できる
- `estimated`: 入力値と計算式を示した推計
- `inferred`: 複数事実からの解釈
- `unknown` / `UNVERIFIED`: 支持できる根拠がない

利益や個人手残りが公開されていなくても、そこで調査を止めません。判明した入力から別枠で推計し、仮定を全て残します。たとえば決済手数料（適用時の2.9% + 0.30ドル等）、原価、ホスティング、モデル/API、ツール、給与・外注、広告、税引当、返金、再投資を順に分けます。「売上 − Stripe手数料」は創業者手残りではありません。実際の個人手取りは直接根拠がない限り `unknown` のままです。

## 7. 調査の深さと完了宣言

- `CAPTURE`: 身元、概要、時点、情報源、未知を残した候補。
- `CORE`: 12領域を広く試した事例。
- `ENRICHED`: 追加出典、Make-Money固有の手口、資金・摩擦・配管を加えた事例。
- `DEEP_RECONCILED`: 宣言した範囲について、資料台帳、関連箇所・年の確認、二巡目、保持レコードとの突合、`collection_audit.v2`、Journal系譜、create-only保存とreadbackまで実施した事例。

大量収集は `CAPTURE` / `CORE` / `ENRICHED` のまま保存して構いません。R2保存が成功しただけで `DEEP_RECONCILED` と呼びません。分からない情報は捨てず、実際の試行を添えて `attempted_unavailable`、`unknown`、`UNVERIFIED` として残します。

## 8. 既存の保存経路とR2の位置

既存経路だけを使います。

```text
source / lead
  -> evidence（権利が許す場合だけraw、それ以外はmetadata-only）
  -> research-bundle.v1
  -> journal-entry.v1 / ds.foundation.journal.core
  -> typed projections
  -> analytical / derived / serving views
```

既存の論理R2ロールは次のとおりです。

- `foundation-raw`: 権利が確認できた非公開・raw証拠
- `foundation-restricted`: 制限付き・非公開資料
- `foundation-lake`: Journal、immutable bundle、typed projection、分析・derived・view
- `foundation-public`: 公開承認済み成果物のみ

Journalキーは `journal/v1/YYYY/MM/DD/<journal_id>.json`、typed/derivedキーは登録済みFoundation datasetと`research-bundle.v1` plannerが決める既存キーを使います。新しいschema、bucket、prefix規則、保存方式を作りません。既存項目に入らない有用な事実は、既存Journal payloadと`observations`へ入れます。

新規書込みは `write_authorized:true`、create-only、事前存在確認、保存後readback、SHA/バイト一致確認を必須にし、planned/created/identical/conflictを報告します。既存の `universal`、EDINET、Investraderデータは読み取り専用境界です。delete、move、rename、overwrite、移行は新規収集の許可に含まれません。

## 9. GitHubとR2だけを受け取ったAI向けの引継ぎ

作業開始前に、次を読みます。

1. `salve-de/universal-foundation` mainの `AGENTS.md`、`README.md`、`docs/MAKE_MONEY_COLLECTION_SCOPE.md`、該当する `docs/COLLECTION_RECONCILIATION.md`、`docs/R2_NEW_DATA_WRITE_RUNBOOK.md`。
2. このリポジトリの `AGENTS.md`、`docs/COLLECT_AND_STORE.md`、この文書。
3. 対象R2ロールの `_README.vN.md` と `_manifest.vN.json`。
4. 登録済みの `research-bundle.v1`、`journal-entry.v1`、`business-case.v2` と、実行するcollectorのreadme・validator。

完了報告には必ず次を含めます。

1. collection tierと宣言した範囲
2. 事例、source、evidence、typed、Journal、derivedの件数
3. 12領域と9情報源レーンごとの状態
4. unknown、矛盾、attempted-unavailable、残った手掛かり
5. `collection_audit.v2` の有無と、実際にカバーした範囲
6. planned/created/identical/conflict/readback件数とSHA/バイト検証
7. R2 descriptorの反映状態
8. 既存データへの変更件数。新規収集ではdelete/move/rename/overwriteを全て0とする

必須項目を推測で埋めたり、未調査を調査済み扱いしたりして「完了」と報告してはいけません。
