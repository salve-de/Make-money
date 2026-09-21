# データとコードの置き場所（正本）

この文書は、担当者・AIが交代しても保存先、変更箇所、理由、確認方法を判断するための入口です。技術を永久固定せず、データを検証して移し替えられる状態を維持します。

## 現在地

2026-09-11時点の記録（履歴）: D1 + R2への移行を実装中。専用D1・非公開R2を作成し、D1 migration 0001〜0003を適用済みだった。設計文書はGitHub/R2保存・読み戻し確認済み（[保存記録](PUBLICATION_RECEIPT.md)）。初期バックアップの隔離D1復元も確認済み。この段階は本番切替・利用者データの移行や復旧完了を意味しない。Neonは今後の実行時保存先として使用しない。旧実装が残っていても新規利用しない。既存データの移行は所有プロジェクトを確認し、原本を保全してから行う。

2026-09-12: migration 0004（ニュースレター所有者・匿名解除トークンのハッシュ）と0005（匿名書込みの一時レート制限）を本番D1 `07affd4c-cac4-4998-843c-b5881fccab5e`へ適用した。適用前に全アプリテーブル0行を確認し、事前exportを非公開R2へcreate-only保存した。適用後に「No migrations to apply」、新列・index・`request_rate_limits`表、同表0行を読み戻した。R2保全物は[保存記録](PUBLICATION_RECEIPT.md)を参照。

2026-09-19: First Dollar実行レイヤー用にmigration 0009（`execution_projects`）と0010（server-issued `revision` / `generation`、`execution_resets`）をrepoへ追加した。これはGit上のschema変更であり、この記録だけでは本番D1への適用を意味しない。`execution_projects` はユーザー所有の実行途中データ、`execution_resets` は退会後に別端末の古い下書きが復活することを防ぐ世代tombstoneである。tombstoneの主キーはFirebase UIDそのものではなく一方向SHA-256化した `owner_key` とし、本文・URL・売上・メモ等は保持しない。

2026-09-12: Neon管理APIを読み取り専用で再監査した。接続可能な所有プロジェクトは `Investrader-hub` だけで、Make-MoneyというNeonプロジェクトは存在しなかった。そのDBでMake-Money旧schema名（`businesses`、`business_ideas`、`market_signals`、`saved_items`、`submissions`、`newsletter_subscribers`、`analyst_notes`、`chat_conversations`、`synthesized_ideas`）を照会した結果は0件。`users`等の一般名テーブルには別プロジェクトのデータがあるため、所有境界を証明できないままMake-MoneyのR2へコピーしていない。Neonは引き続きMake-Moneyの実行時保存先にしない。

## 認証環境の作成状況（2026-09-11）

ユーザーの明示承認によりFirebaseプロジェクト `make-money-salve-prod`（Make-Money Production、project number `58988611995`）とWebアプリ `1:58988611995:web:8e69e3432164586d3ab93e` を新規作成した。既存Investraderの認証環境は変更していない。課金設定は追加していない。

2026-09-12: 表示承認後にFirebase Authenticationを初期化し、メール・パスワード認証とGoogleログインを有効化。認証設定APIでもメール認証の `enabled: true` / `passwordRequired: true` と許可ドメインを読み戻し、コンソールでGoogleのステータス有効を確認した。Google設定には専用プロジェクトのサポートメールを指定。Spark無料プランを維持。専用SDK設定をGit管理対象外の `.env.local` に接続し、設定値はGit/R2本文へ保存しない。許可ドメインは `localhost` と専用Firebaseの標準ドメイン2件。Workerの実行時検証は`wrangler.jsonc`の非秘密変数`FIREBASE_PROJECT_ID`を優先し、Nodeの明示実行だけ`NEXT_PUBLIC_FIREBASE_PROJECT_ID`へフォールバックする。

実Firebaseで使い捨てアカウント2件を登録・メールログインし、ビルド済みOpenNext Workerから隔離したローカルD1へメモを保存・読み戻した。未認証・不正トークンの401、別ユーザーから対象メモが見えないことを確認。検証後に作成アカウント2件を削除した。本番D1は変更していない。この証拠は実認証とWorker/D1経路の結合検証であり、本番D1への切替・実利用者の移行・Googleログイン・Stripe決済の本番検証を意味しない。詳細は[認証・保存の検証記録](AUTH_VERIFICATION.md)。

## データをどこへ入れるか

| データ | 正本・保存先 | 保存経路と形式 | 理由 |
|---|---|---|---|
| ログイン資格情報 | Firebase Authentication | 認証SDK。サーバーでトークン検証 | パスワードや認証処理を自作しない |
| ユーザー設定、保存企業、投稿、会話 | プロジェクト専用D1 | 認証済みAPI → 所有者を限定したSQL。構造変更はSQL migration | 更新・検索・整合性制約が必要 |
| First Dollar実行プロジェクト | プロジェクト専用D1 `execution_projects` | 認証済みAPI。server-issued `generation` と `revision` のCASで保存。匿名開始時だけブラウザlocalStorage | 別端末・同時PUT・ブラウザ時計ずれで新しい編集を失わない |
| 実行データ削除tombstone | プロジェクト専用D1 `execution_resets` | UIDを直接保存せずSHA-256化した `owner_key` と世代番号・reset時刻だけ保持 | 退会後に他端末の古いlocal draftがD1へ再生成されるのを防ぐ |
| ニュースレター購読 | プロジェクト専用D1 | 認証済みならUIDを紐付け、匿名なら解除トークンのハッシュだけを保存。解除APIで削除 | メール本文をAPI応答へ返さず、匿名でも本人が削除できる |
| 決済イベント、購入・返金・利用権 | プロジェクト専用D1 | 署名検証済みStripe webhook → 重複排除・原子的更新 | 二重処理、順序逆転、返金後の権限残存を防ぐ |
| 課金そのもの | Stripe | サーバーのみ。決済IDをD1で参照 | ブラウザの成功画面やlocalStorageは支払い証明にならない |
| アプリ添付・大きな生成物 | プロジェクト専用の非公開R2 | サーバー経由。D1には所有者、object key、schema version、hash等の参照 | バイナリをDBへ詰め込まず、認可と内容を分離 |
| D1エクスポート・移行原本 | プロジェクト専用の非公開R2 | 世代別objectとmanifest。読み戻し・hash照合 | 障害復旧と他DBへの移行に備える |
| 外部調査の事実・出典 | Foundationの登録済みR2契約 | 既存収集CLI、schema検証、create-only | 事実を不変に保ち、解釈・表示と分離 |
| 表示用の企業一覧・詳細 | 上記正本からのprojection | 読み取り時の変換、公開DTO | UI都合で第二の正本を作らない |
| 秘密鍵・APIトークン | ホストのsecret管理 | 環境ごとのsecret注入 | Git、R2本文、ブラウザへ入れない |
| 一時キャッシュ | 再生成可能なキャッシュ | 消えても正本から再作成 | 権利やユーザー記録の正本にしない |

### 調査候補の検疫

`data/intelligence-blacklist.json` は、記事URLやプレースホルダーURLを企業の正規レコードとして再採用しないための、Make-Money専用のバージョン管理レジストリです。`src/lib/foundation/blacklist.ts` の `checkBlacklist` はインデックス生成時の入力projectionにだけ適用し、R2の原本・Foundationの登録データ・収集JSONを削除または上書きしません。除外候補にはID、URL、理由、登録時刻を残し、企業の存在そのものを否定する名前だけの規則は追加しません。

新しい除外を追加するときは、元の候補を保全したまま、根拠URLと理由を記録し、`pnpm test`・`pnpm lint`・`pnpm typecheck` と索引再生成の差分を確認します。別プロジェクトへルールを共有する場合は、対象プロジェクト、版、根拠、適用範囲を別途記録し、共有Foundationの事実レイクへプロジェクト固有の除外判定を混ぜません。

Workersの配布物は `pnpm workers:build`（`bundle:workers`、`deploy:workers`、`upload:workers`から利用）を入口にする。このビルドはdotenvから公開設定だけを一時的に取り出し、秘密鍵・APIトークンをビルドへ渡さず、生成された `.open-next` を秘密値で照合する。`deploy:workers` は公開Firebase設定だけでなく、`wrangler.jsonc` の専用Firebase project、APP_DB、APP_R2 bindingも事前検査する。Stripe/Gemini/R2/D1の秘密はCloudflare Worker secretまたは対象ホストのsecret管理へ実行時に注入する。直接 `opennextjs-cloudflare build` を本番配布手順に使わない。

APIのリクエスト本文は`readJsonBody` / `readTextBody`でバイト上限を適用し、`Content-Length`がないchunked本文も上限を超えた時点で拒否する。routeへ直接`request.json()`や`request.text()`を追加するとarchitecture検査で失敗する。外部JSONは上限後にschema検証し、決済署名本文も検証前に上限を適用する。

R2は強整合でも、複数レコードをまとめたSQL transactionの代わりではありません。複数の更新を一緒に成功させる必要があるデータはD1へ置きます。[Cloudflareの保存先選択](https://developers.cloudflare.com/use-cases/web-apps/store-data/)、[R2整合性](https://developers.cloudflare.com/r2/reference/consistency/)、[D1 batch](https://developers.cloudflare.com/d1/worker-api/d1-database/)を参照。

## コードをどこへ入れるか

| 変更したいこと | 置き場所 | 守る境界 |
|---|---|---|
| URL、HTTP、ページの組み立て | `src/app/` | APIで認証・入力検証し、業務処理へ渡す |
| Inspectorの表示・計算 | `src/features/company-inspector/` | 固定UIはComposition、可変EvidenceだけRegistry |
| 新機能のUI・業務処理 | `src/features/<feature>/ui`, `model`, 必要なら`server` | 一緒に変わる小さな型・関数は同居。外部はPublic API経由 |
| 機能非依存の型・純粋関数 | `src/shared/` | Featureやアプリへ逆依存しない |
| 現行のD1/R2接続 | `src/lib/storage/` | 接続、読み書き、エラー変換。料金や業務判定は入れない |
| 現行の購入・利用権判定 | `src/lib/payments/` | Stripeイベントと権利の規則を集約 |
| DB構造変更 | `migrations/d1/`（移行先） | 順番付きSQLを追加。適用済みファイルを書き換えない |
| 公開・有料データの分離 | `src/lib/company-access/` | サーバーで公開項目を選び、非公開本文を配信しない |
| 既存企業資料・財務照合 | `src/platform/data/` | 原資料と検証済みprojectionを区別。未確認を実績0にしない |
| 依存制約・配信漏れの検査 | `scripts/architecture/` | 人の目だけで守らない |
| 単体テスト | 対象の隣の`*.test.ts` | 境界値、他人のアクセス、失敗時、再実行を検証 |
| 主要導線テスト | `e2e/` | ユーザーの操作と表示を確認 |

`lib/`と`platform/`は既存配置です。一度に全面移動せず、変更理由が揃った単位でFeatureへ移します。server専用実装をclient用indexへ混ぜないでください。新しい階層を増やす前に、同じ責務の既存ファイルを探します。

## 新しいデータを追加する手順

1. 正本を一つ決める。誰のデータか、誰が書けるか、削除・保持期間、機密性を決める。
2. 上の表で保存先と担当コードを選ぶ。不明なデータを汎用JSON置き場へ投げ込まない。
3. D1はmigration・制約・index、R2はversion付きschema・key規則を定義する。外部JSONは境界で検証する。Worker実行時は`@cfworker/json-schema`（eval/new Function不要）を使い、AJVはNode専用のschema生成・収集CLIに限定する。
4. 認証から得たユーザーIDで所有者を限定する。リクエスト内のuser IDを権限の根拠にしない。
5. 重複、同時更新、途中失敗、削除を設計する。D1とR2を跨ぐ処理はDBにpending/ready等を記録し、再実行・照合で回復できるようにする。両者を一つのtransactionと呼ばない。
6. 他ユーザーからの拒否、不正schema、重複イベント、途中失敗をテストする。保存後の読み戻しを確認する。
7. この表に該当しない保存先・重要な判断変更は、理由・代案・移行方法をこの文書へ追記する。説明をコードから離れたチャットだけに残さない。

## 複数プロジェクト・環境

各プロジェクトのrepoにこの契約を持たせ、project IDとenvironmentを固定します。原則、D1、アプリ非公開R2、secret、migration履歴、バックアップはプロジェクト別・環境別です。開発環境から本番へ暗黙fallbackしません。認証も別プロジェクトを既定とし、共有するならissuer/audience・利用者の関連付けを明示します。Workerのデプロイ入口は専用Firebaseの公開設定が揃わない場合に失敗させます。ローカル表示用の未設定ビルドを許しても、認証なしの配布物を成功扱いにしません。

名前の例は `<project>-<environment>-app`（D1）、`<project>-<environment>-private`（R2）。例は作成済みリソースではありません。実際のID/bindingは各repoの`wrangler.jsonc`が正本です。メールアドレスや個人情報をobject keyに含めず、不透明IDを使います。

共有Foundationは例外的な調査基盤です。Make-Moneyはconsumer契約に従い、ユーザー情報・決済情報をFoundationへ混ぜません。別プロジェクトのDBに同名テーブルがあっても移行対象と見なしません。

共通化するのは接続、schema検証、検査手順など安定した技術部分です。利用権、価格、業務ルールまで一つの巨大共通パッケージにまとめません。共通ライブラリ化は複数の実利用ができてから、version付きで行います。

## 移行・バックアップ・復元の完了条件

- 移行元のproject/environment/tableと所有根拠を記録。件数だけで所有者を推測しない。
- エクスポートは非公開領域にcreate-only保存。manifestにproject、環境、schema版、日時、件数、hash、migration版を記録。本文や資格情報をログへ出さない。
- 移行先で件数・主キー・参照整合性・hashを照合し、APIから読み戻す。稼働中データは書き込み停止か差分移行を計画し、取りこぼしを防ぐ。
- 空の隔離DBへ復元し、所有者認可と主要導線を確認する。バックアップファイルがあるだけでは復元成功ではない。
- 切替後の照合を終えるまで旧原本を削除しない。切戻し先、判断条件、責任者を記録する。
- 個人情報は永久保持しない。保持期間・削除依頼・バックアップからの削除反映方針をデータ種別ごとに決める。

D1には容量等の上限があり、Time Travelにも保持期間があります。長期運用は無制限保存ではなく、計測、世代バックアップ、復元訓練、移行可能性で支えます。[D1上限](https://developers.cloudflare.com/d1/platform/limits/)、[Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/)。復元手順と合成データによる自動演習は [RECOVERY.md](RECOVERY.md) に記載します。本プロジェクトの具体的なRPO/RTO、保持日数、定期バックアップ稼働の確認は未完了です。

アカウント削除は認証済みの `DELETE /api/user/me` で、ブックマーク、メモ、会話、合成アイデア、投稿、紐付いたニュースレター購読、First Dollar実行プロジェクト、`users` 行をD1の一括処理で削除する。同じbatchで `execution_resets` の世代を1つ進める。これにより、削除を実行したブラウザ以外の端末に古いlocalStorageが残っていても、旧generationのPUTをD1が拒否し、削除済み本文を復活させない。`execution_resets` に保持するのは一方向ハッシュ化owner key、generation、reset時刻だけで、実行本文・顧客・URL・売上・メモ・生UIDは保持しない。決済監査に必要な `payment_events` はUIDとfact内のUIDを取り除いて匿名化して残す。レスポンスのscopeは `application_data` で、Firebase Authenticationのアカウント失効・削除までを意味しない。匿名ニュースレターは `DELETE /api/newsletter/subscribe` に一度だけ返した解除トークンを渡して削除する。現在の実装にはユーザー所有R2 objectがないため、添付を追加する場合は所有者キーと削除・バックアップ反映を同じ設計で追加し、孤児objectの定期検査を必須にする。法定保存が必要な決済記録の期間と、その他のデータの具体的な保持日数は運用開始前に決める。

匿名のニュースレター登録と掲載申請には、Cloudflareのクライアント識別子を一方向ハッシュ化したD1の時間窓カウンタを適用する。これは最低限のスパム抑制であり、WAF・Turnstile・分散攻撃への完全な防御を意味しない。実運用の閾値はトラフィックを観測して調整する。

## 100年壊れないR2完璧構造（原物・保存票・目録の3層アーキテクチャ）

右チャット（Codex IR担当 / ChatGPT Pro）との徹底ディスカッションおよびデータエンジニアリングの物理限界監査を経て確立した、**「AI・少人数運用において100年運用しても絶対に壊れないR2データ構造と自走運用モデル」**の最高規範です。

### 1. なぜ物理フォルダ整理を全廃し「物理移動ゼロ」にするのか？
* **物理移動の自爆性**: 「年度別」「業界別」のように人間が物理フォルダを掘り直すと、社名変更や年度またぎのたびにパスが壊れ、参照切れが起き、R2のコピー課金（Class A）が爆発する。
* **物理は「巨大な不変倉庫（Flat/Hash）」、整理は「単一の台帳（Catalog）」**: 物理実体は「変更不可（Append-Only）なハッシュキー」で放り込むだけに徹し、検索・整理・リレーションはすべて**単一のメタデータ台帳（D1 / entities-index）**側で管理する。

### 2. 3大物理階層（Medallion Architecture on R2）

| レイヤー | バケット / プレフィックス | 格納形式 | 性質 | 用途・書き手 |
|:---|:---|:---|:---|:---|
| **Layer 1: 原物<br>（Bronze / Raw）** | `foundation-raw/blobs/sha256/<hash>`<br>`data-assets/financials/edinet-raw/...`（既存固定） | HTML, PDF, XBRL, 魚拓（そのまま） | **完全不変<br>（Write-Once, 削除禁止）** | 一次資料の永久原本。改ざん不能。AIが取得したWeb記事やEDINET生開示をそのままPUT。 |
| **Layer 2: 保存票<br>（Silver / Lake）** | `foundation-lake/journal-entry.v1/<id>.json`<br>`data-assets/financials/edinet-canonical-document-set/v2/...`（既存固定） | 構造化JSON（事実・数値のみ、解釈ゼロ） | **追記専用<br>（Append-Only）** | EDINETのパース済み正規ドキュメント（Canonical）、Make-Moneyの調査事実ログ（Journal）。 |
| **Layer 3: 目録・提供ビュー<br>（Gold / Serving View）** | `datasets/ds.business.makemoney-dossiers.v1/<id>.json`<br>（またはD1キャッシュ / entities-index.json） | 完成体Dossier（P&L逆算・裏帳簿・UI直結） | **再生成可能<br>（Derived）** | Bloomberg端末UIが0.1秒で引く完成データ。Layer 1と2からいつでも100%全自動再生成可能。 |

### 3. EDINET継続蓄積とMake-Money新規収集の完全自走パイプライン

今後データがどれだけ増大しても、以下の**一本道（パイプライン）**のみで自走する。

```text
［EDINET側の自走経路］
  開示発生 ➔ edinet-raw（原本保存） ➔ パース ➔ edinet-canonical（事実保存）
                                                    │
                                                    ▼
［合流地点（台帳）］  === entities-index.json (D1) で EDINETコード と 企業ID を1行でJOIN ===
                                                    ▲
［Make-Money側の自走経路］                           │
  新規調査 ➔ foundation-raw（Web原本） ➔ foundation-lake（事実） ➔ Gold裏帳簿（精錬）
```

1. **EDINET開示が新規に来た時**:
   * 物理パスは `data-assets/financials/...` のまま永久固定（一切触らない・移動しない）。
   * パース完了結果を台帳（`edinetCode`）に登録するだけで、Make-Money側と自動結合される。
2. **Make-Moneyで新規データを集める時**:
   * `foundation-raw`（生原本） ➔ `foundation-lake`（保存票・Journal）へ追記保存。
   * 既存ファイルを一切上書きしないため、複数チャット・複数AIが並行で何万件集めても衝突確率はゼロ。

### 4. 100年運用の4大鉄則（The 4 Invariants）
1. **原物を解析結果で置き換えない**: 原本は永久不変。訂正や再解析も新しい履歴・観測として追記する。
2. **保存完了を先に宣言しない**: 不完全な取得・保留・失敗はその状態で保持し、保存票が確定した時のみ完了とする。
3. **同じ依頼を再送しても壊れない**: ユニークなハッシュキーにより、重複再送されても安全に同一結果へ収斂する（冪等性）。
4. **復元できることを実際に試す**: 最上位のGoldデータやUIキャッシュが全損しても、原物と保存票からいつでも100%再生成できることをテストで担保する。

---

## 1億事例（100M Scale）時代のシャード目録とゼロファットクライアント規律

事例が1万件・100万件・1億件へと増大した際に、単一巨大JSON（`entities-index.json`）やクライアント全量展開に依存したシステムは**100%確実に即死**する（550GBのHTML送信、GitHubファイル制限100MB超過、V8ヒープ上限超過、ブラウザクラッシュ）。
また、どれほど表示速度が0.01秒であろうと、データが重複・過去の誤情報・デマで汚染されていれば無価値である。

外部大規模企業情報プラットフォーム（Bloomberg Terminal, PitchBook, Crunchbase, ZoomInfo等）の公開設計原則、Cloudflare R2/D1の物理仕様監査、およびChatGPT Pro Webとの5往復にわたる極限の批判的相互討議を経て導出された、**「100年耐久・1億事例スケールを保証する4大恒久契約 ＆ 最高不変条件」**を本プラットフォームの最高正本として定める。

### 0. 優先順位の最高規律（The 8-Stage Pipeline） ＆ 最高不変条件

100年耐久において、設計の優先順位は以下に完全固定する。速度（Speed）は最も最後である。

```
Identity → Time → Provenance → Truth → Promotion → Immutable Dossier → Serving Index → Cache / Speed
```

データ経路の全容：
```
WORLD（一次ソース・開示・Web・告発）
  ↓
FOUNDATION（Universal Raw & Lake: Create-Only, 不可逆原本保存）
  ↓
CLAIM & FACT EXTRACTION（Evidence Locator による章・表・行・引用の厳格紐付け）
  ↓
IDENTITY & RELATIONSHIP GRAPH（無意味な不変ID ent_xxx ＋ 買収・親子・エイリアス）
  ↓
BITEMPORAL FACT HISTORY（Valid Time × Recorded At の2軸時間管理）
  ↓
CURRENT RESOLUTION（最新値の導出投影。過去のResolution決定も保全）
  ↓
PROMOTION GATE（RAW / PARTIAL / PUBLISHABLE / ARCHIVED / REJECTED_AS_CASE）
  ↓
IMMUTABLE DOSSIER（views/make-money/dossier-v1/objects/xx/ent_yyy/<hash>.json.gz）
  ↓
SERVING INDEX（Tiny Record: Query Contract ＋ Safe Generation Pointer ＋ Freshness Revision）
  ↓
EDGE CDN（PUBLICATION_APPROVED のみ長期キャッシュ。キャッシュは成立要件ではなく単なる最適化）
  ↓
ZERO-FAT CLIENT（仮想ウィンドウ描画、オンデマンドLazy Loading）
```

#### 【100M耐久の最高不変条件（The 100M Invariant）】
> **「1KBファイルサイズを保証しない。CDN 99%キャッシュHit率を保証しない。D1を永久保証しない。ClickHouse等の特定DBも永久固定しない。**
> **システムが唯一永久に保証するのは、『Fact・Identity・時間・Evidenceの不変性を1ミリも壊さず、Serving View（Dossier）と検索エンジン（D1 / ClickHouse）をいつでもR2から全自動で再生成・交換できること』である。」**

---

### 【契約A：Identity ＆ バイテンポラルTruth ＆ Evidence Locator契約】
1. **無意味な恒久ID（Permanent Entity ID）**:
   - カノニカルID（`entity_id: ent_xxx`）はFoundationが一度だけ発行する意味を持たない不変識別子とする（ドメイン売却、社名変更、法人番号不在に耐える）。
   - ドメイン、法人番号、LEI、FIGI、Ticker、GitHub org等はすべて独立した「Identity Claim / Alias」として紐付ける。決定論的ハッシュはID生成ではなく重複候補（`identity_candidate_key`）の検出にのみ使用する。
2. **関係性のグラフ化（Entity Relationships）**:
   - 買収（`ACQUIRED_BY`）、同一（`SAME_AS`）、子会社（`SUBSIDIARY_OF`）等を独立した関係性エッジとして保持し、過去のファクトを絶対に上書きしない。
   - 関係性自体にも `validTime`（効力発生日）、`announcedAt`（発表日）、`recordedAt`、`evidenceIds` を記録する。
3. **Evidence Locator ＆ 支持検証（単なるSHA一致の脆弱性を根絶）**:
   - 原本ファイルのSHA-256一致は「そのファイルがそのバイト列で存在したこと」しか証明せず、LLMの抽出ミス・幻覚（例: 原本$12Mを$120Mと誤読）を1ミリも防げない。
   - 全てのClaim/Factには原本内の厳格な位置情報 **`evidenceLocator`** を必須化する：
     - PDF: `{ type: 'pdf', page, table?, row?, column?, bbox? }`
     - HTML/Web: `{ type: 'html', cssSelector?, textHash? }`
     - JSON/API: `{ type: 'json', jsonPointer }`
     - Text/記事: `{ type: 'text', start, end, excerptHash? }`
     - 音声/動画: `{ type: 'media', startMs, endMs }`
   - 数字・日付・価格・人数等は、LLMとは別の決定論的Extractorによって原本Locatorと再照合（Support Check）し、「Evidence actually supports this claim（根拠が主張を本当に支持している）」ことを機械検証する。
4. **直交する4大ステータス軸 ＆ 一次資料至上主義の脱却**:
   - **`originType`（出所の性質）**: `reported`（公式発表） | `observed`（実測） | `estimated`（推計） | `inferred`（論理演繹） | `unknown`
   - **`verificationStatus`（裏付けの確定度）**: `SUPPORTED`（検証済） | `UNVERIFIED`（未検証） | `CONFLICTED`（矛盾有） | `SUPERSEDED`（新版有） | `RETRACTED`（撤回）
   - **`sourceClass`（情報源の独立性）**: `PRIMARY`（一次公表） | `INDEPENDENT_SECONDARY`（独立第三者報道・実測） | `COMMUNITY`（現場告発・口コミ） | `MODEL`（LLM演繹）
     - ※ 破綻・不正・顧客トラブルにおいては企業の一次公表よりも独立報道（`INDEPENDENT_SECONDARY`）の方が信頼性が高い。同一の一次公表を引用した100記事を100票として数えない独立性判定（Source Independence）を必須とする。
   - **`estimationLineage`（推計値の追跡可能性）**:
     - 公開価格（SUPPORTED）× 顧客数推計（SUPPORTED）× サーバー原価（Benchmark）＝ 営業利益推計値（ESTIMATED）のように、入力根拠と計算式が開示されている推計値はPublishableとする。
     - Promotionの基準は「完全VERIFIEDのみ」ではなく「読者が値・根拠・算術式・不確実性（Confidence Range）まで辿れるか」である。
     - 根拠のないLLMの思いつき仮説（LEAD / DERIVED）のみを公開面から隔離する。
5. **バイテンポラル履歴 ＆ Current Resolution**:
   - 事実（Fact）は「いつの事実か（`validTime`）」と「いつ観測・記録されたか（`recordedAt`）」を分離し、過去の訂正（Restated）も履歴として蓄積。
   - 「現在の確定値（Current Resolution）」はFactそのものを書き換えるのではなく、`resolution { resolutionKey, selectedFactIds[], competingFactIds[], state, policyVersion, resolvedAt }` という導出ビュー（Derived View）として生成し、過去の裁定履歴も保全する。

---

### 【契約B：Serving Index ＆ クエリ契約（Query Contract） ＆ 鮮度同期】
1. **Tiny Projection の現実的設計（80B幻想の破棄）**:
   - 1レコード80バイト固定は非現実的（B-tree、インデックス、行オーバーヘッド、メタデータを含め実DBでは200〜500B）。
   - 一覧用インデックスレコードは `{ entityId, name, industry, operatingMargin, monthlyRevenue, tags, snapshotYear, latestDossierHash, sourceRevision, projectionGeneration }` を保持。
2. **多段階経済的階層（Economic Tiering）とServing Engine境界**:
   - **小規模〜数万社**: Cloudflare D1（10GB上限、シングルスレッド）。低コスト・即時運用。
   - **数万〜1000万社**: R2上のColumnar Snapshot（DuckDB on Worker / R2 SQL）。
   - **1億社超（100M）**: ClickHouse 等の分散Columnar Serving Engine。
   - **Parquetの責務**: ParquetはServing DBではなく「Snapshot / Rebuild / Analytics用」のストレージ形式として位置づける。
3. **Query Contract（Provider抽象化と共通検証）**:
   - 将来DBをD1からClickHouseへ切り替えてもアプリケーションを一切壊さないよう、`search(filters, sort, cursor, limit)`、`getTiny(entityId)`、`getManyTiny(entityIds)` のセマンティクスを固定。
   - 両Providerに同一の「Conformance Test Suite」を通過させる。
   - **Cursorの完全定義**: `cursor = { indexGeneration, sortValues, entityId }`。ページング中にIndexが更新されても「重複・欠落・順序飛び」が数学的に起きない契約とする。
4. **鮮度同期契約（Serving Freshness / INDEX_STALE防止）**:
   - 100M規模ではFoundation更新と検索インデックス反映の間に遅延が生じる。
   - 検索インデックス（Tiny）の `sourceRevision` と詳細ドシエ（Dossier）の `sourceRevision` を突合し、不一致を検知した場合は `INDEX_STALE` としてUIで機械的にハンドリング（一覧で$30M、詳細で$50Mと表示される二重世界事故を完全防止）。

---

### 【契約C：イミュータブル詳細ドシエ ＆ 参照アウェアGC契約】
1. **物理パスの配置規律**:
   - 詳細ドシエはFoundationのFactそのものではなく製品向けServing Viewであるため、`views/make-money/dossier-v1/objects/<shard>/<entity_id>/<content_hash>.json.gz` に配置。
2. **「views/ 全体への一律TTL」の絶対禁止 ＆ 参照アウェアGC（Reference-aware GC）**:
   - **一律TTLの致命的欠陥**: Cloudflare R2のObject Lifecycle Rules（prefix + age）を `views/` 全体に掛けると、業績やデータが90日間変わっていない優良企業の現行Dossierまで削除され、画面が404即死する。
   - **正しいライフサイクル規律**:
     - **Foundation Fact / Evidence原本**: 永久保存（True Source）。不可侵・削除禁止。
     - **Dossier 現行版（Current）**: Tiny Indexが参照している限り永久に保持。
     - **Dossier 過去世代版（Historical Versions）**: 当面はTTLを掛けず保持（R2容量費用は極小）。将来バージョン数が増大した段階で、「Tiny Indexの最新Hashから参照されていない（Orphan）」かつ「90日以上経過した」旧世代ObjectのみをExact-key DELETEする**「参照アウェアGC（Reference-aware GC）」**を実施する。
3. **ハッシュ直指定オープン ＆ アトミックCASポインタ更新（Race Condition完全防止）**:
   - ユーザーが一覧で企業をクリックした際は、Tiny Recordに記録された `latestDossierHash` そのものを直接開く（これにより、一覧と詳細のRevision不一致事故が構造的にゼロになる）。
   - ドシエ保存 ＆ ポインタ更新の7ステップパイプライン（`src/lib/foundation/immutable-dossier-pipeline.ts`）:
     1. 決定論的 Canonical JSON 化（キーソート `stringifyDeterministic`）
     2. 非圧縮 Canonical JSON の SHA-256 計算
     3. gzip 圧縮
     4. R2 PUT（`If-None-Match: *` による CAS 保存）
     5. GET readback
     6. decompress ＆ SHA-256 再検証（破損・サイレントコラプション完全排除）
     7. アトミックCAS更新（`src/lib/storage/dossier-pointer-cas.ts`）
        - D1/SQLite: `WHERE excluded.source_revision > dossier_pointers.source_revision` による不可逆単調増加。
        - 100並行更新下でも遅延した古いワーカーによる巻き戻しを100%遮断。
4. **キャッシュ境界と安全弁（Revoke Safe）**:
   - キャッシュHit率99%を前提にしない（ロングテール閲覧では50〜80%に落ちても破綻しない設計とする）。
   - 公開承認済み（`PUBLICATION_APPROVED`）のコンテンツのみ `public, max-age=31536000, immutable` を適用。
   - 法的削除や誤情報に対する「緊急revoke経路（Purge/Takedown API）」を常時維持する。

---

### 【契約D：昇格・公開境界契約（Promotion / Publishability）】
1. **ケース状態の厳格分離**:
   - Foundation内のデータは `RAW` | `PARTIAL` | `PUBLISHABLE` | `ARCHIVED` | `REJECTED_AS_CASE` の独立ステータスで管理。
   - 例: 単なるニュースや薄い記事はFoundationとしては保全（`KEEP`）するが、Caseとしては `REJECTED_AS_CASE` とする。
2. **公開インデックスへの厳格Allow-list選抜投影**:
   - `src/lib/company-access/public-entity.ts` の `isPublishableEntity` および `publicSummaryEntity` により、審査・検証を通過した `PUBLISHABLE` のエンティティのみを公開。
   - `RAW`, `PARTIAL`, `ARCHIVED`, `REJECTED_AS_CASE` は一覧・個社直リクエスト（404 Entity not found）双方で物理遮断。
3. **カーソル世代不整合検知（CURSOR_STALE）**:
   - `src/lib/storage/query-contract.ts` において、`SearchCursor.indexGeneration` が現在のインデックス世代と不一致の場合は `CursorStaleError (CURSOR_STALE)` をスローし、安全にクライアントへ最初からの走査を促す。


## 検証と変更の記録

`pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build`、`pnpm test:e2e`を実行します。認可・保存先・決済を変えた場合は、実際の対象環境で保存と読み戻しまで確認します。ローカル成功、本番設定、データ移行、main反映は別々に記録します。

関連する正本:
- [他プロジェクトへの導入テンプレート](PROJECT_STARTER.md)
- [Inspector責務](../INSPECTOR_ARCHITECTURE.md)
- [Foundation読み取り経路](../FOUNDATION_UI_READ_PATH.md)
- [収集契約](../DATA_COLLECTION_CONTRACT.md)
- [財務照合](../FINANCIAL_RECONCILIATION.md)
- [監査修正と検証](../BROWSER_AUDIT_REPAIRS.md)

Nodeでの直接起動は明示したD1 REST設定の単文のみを扱います。複数SQLのtransactionが必要な処理はAPP_DB bindingが必須です。RESTで部分成功させるfallbackは行いません。


---

## Automatic Foundation serving-view namespaces

### Accepted checked-in catalog release (2026-09-21)

`data/entities-index.json` remains the accepted legacy source; the deferred 2,050-record revision is not an input. `pnpm catalog:prepare` derives `data/catalog-release.json`, bound to the source SHA-256, without editing source records. `pnpm catalog:publish` writes and reads back immutable private artifacts using the existing create-only R2 adapter:

- Existing dossier contract: `views/make-money/dossier-v1/objects/<shard>/<entity_id>/<hash>.json.gz`.
- Rebuildable catalog projections: `views/make-money/catalog-v1/objects/<hash>.json.gz` (summaries and Discover dataset).
- The manifest is pinned in the deployed code, not a mutable R2 root index. Switching code switches the complete release; old artifacts remain recoverable. No canonical Foundation fact, EDINET data, or raw source is rewritten.
- Preparation applies schema validation, identity aliases, reconciliation and the existing publication gate. Full dossiers remain private and are exposed only through public-field projection or authenticated paid access. Runtime verifies decompressed hashes and schemas.
- Workers read this release rather than Node filesystem paths. Local development reads the accepted JSON. `/api/catalog` delivers 100 summaries per page and searches the entire accepted catalog. Details are loaded by exact stored hash. Foundation hourly/new-arrival views remain an independent live overlay.

This is a bounded legacy catalog serving path, not a claim of 100-million-record readiness. The checked-in snapshot is rebuilt when accepted data changes; missing fields are not invented or newly approved by publishing.

These R2 prefixes are rebuildable serving/control views. They are **not canonical Foundation facts** and may be regenerated from immutable accepted history.

| Prefix | Purpose | Mutability |
|---|---|---|
| `views/make-money/v1/entities/<entity_id>.json` | Make-Money cumulative serving view per entity | CAS-protected rebuildable view |
| `views/make-money/v1/_rebuild-state.json` | Global serving-view rebuild cursor | CAS-protected control state |
| `views/make-money/v1/_projection-progress/<run_id>.json` | Per-bundle projection progress | CAS-protected control state |
| `views/make-money/r2-writer-progress/v1/<plan_sha256>/<offset>.json` | Writer readback receipts for completed 100-object chunks; plan hash includes bucket, key, bytes and content hash | Immutable create-only progress checkpoints; original datasets are never overwritten |
| `views/make-money/v1/_unresolved-by-entity/<entity_id>/<run_id>.json` | Deferred record-only references whose entity core was not yet resolvable | CAS-protected replay state |
| `views/make-money/v1/_unresolved-hydration-state/<entity_id>.json` | Per-entity cursor for bounded replay of large unresolved record-only history | CAS-protected resumable control state |
| `views/make-money/v1/_unresolved-replay-state.json` | Global unresolved replay cursor | CAS-protected control state |
| `views/foundation-ingest/v2/entity-identity/<entity_id>.json` | Accumulated durable identity authority used to validate later immutable Entity-core-compatible ingests | CAS-protected derived authority |

### Identity-authority rule

The canonical immutable Entity object is never overwritten. When later accepted bundles add durable identity information, ingestion compares the incoming identity against the accumulated authority under `views/foundation-ingest/v2/entity-identity/`.

The authority may add previously unknown durable identifiers/domain information, but it must not accept a conflicting known durable identity. It exists only to serialize and validate future compatible immutable writes; it is rebuildable from accepted canonical history.

The operational description is also maintained in `docs/architecture/AUTO_PUBLISH_TO_UI.md`. Both documents must use the same namespace/version.
