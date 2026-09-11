# データとコードの置き場所（正本）

この文書は、担当者・AIが交代しても保存先、変更箇所、理由、確認方法を判断するための入口です。技術を永久固定せず、データを検証して移し替えられる状態を維持します。

## 現在地

2026-09-11: D1 + R2への移行を実装中。専用D1・非公開R2を作成し、D1 migration 0001〜0003を適用済み。設計文書はGitHub/R2保存・読み戻し確認済み（[保存記録](PUBLICATION_RECEIPT.md)）。初期バックアップの隔離D1復元も確認済み。本番切替・利用者データの移行や復旧完了を意味しません。Neonは今後の実行時保存先として使用しません。旧実装が残っていても新規利用しないでください。既存データの移行は所有プロジェクトを確認し、原本を保全してから行います。

## 認証環境の作成状況（2026-09-11）

ユーザーの明示承認によりFirebaseプロジェクト `make-money-salve-prod`（Make-Money Production、project number `58988611995`）とWebアプリ `1:58988611995:web:8e69e3432164586d3ab93e` を新規作成した。既存Investraderの認証環境は変更していない。課金設定は追加していない。

2026-09-12: 表示承認後にFirebase Authenticationを初期化し、メール・パスワード認証とGoogleログインを有効化。認証設定APIでもメール認証の `enabled: true` / `passwordRequired: true` と許可ドメインを読み戻し、コンソールでGoogleのステータス有効を確認した。Google設定には専用プロジェクトのサポートメールを指定。Spark無料プランを維持。専用SDK設定をGit管理対象外の `.env.local` に接続し、設定値はGit/R2本文へ保存しない。許可ドメインは `localhost` と専用Firebaseの標準ドメイン2件。Workerの実行時検証は`wrangler.jsonc`の非秘密変数`FIREBASE_PROJECT_ID`を優先し、Nodeの明示実行だけ`NEXT_PUBLIC_FIREBASE_PROJECT_ID`へフォールバックする。

実Firebaseで使い捨てアカウント2件を登録・メールログインし、ビルド済みOpenNext Workerから隔離したローカルD1へメモを保存・読み戻した。未認証・不正トークンの401、別ユーザーから対象メモが見えないことを確認。検証後に作成アカウント2件を削除した。本番D1は変更していない。この証拠は実認証とWorker/D1経路の結合検証であり、本番D1への切替・実利用者の移行・Googleログイン・Stripe決済の本番検証を意味しない。詳細は[認証・保存の検証記録](AUTH_VERIFICATION.md)。

## データをどこへ入れるか

| データ | 正本・保存先 | 保存経路と形式 | 理由 |
|---|---|---|---|
| ログイン資格情報 | Firebase Authentication | 認証SDK。サーバーでトークン検証 | パスワードや認証処理を自作しない |
| ユーザー設定、保存企業、投稿、会話 | プロジェクト専用D1 | 認証済みAPI → 所有者を限定したSQL。構造変更はSQL migration | 更新・検索・整合性制約が必要 |
| 決済イベント、購入・返金・利用権 | プロジェクト専用D1 | 署名検証済みStripe webhook → 重複排除・原子的更新 | 二重処理、順序逆転、返金後の権限残存を防ぐ |
| 課金そのもの | Stripe | サーバーのみ。決済IDをD1で参照 | ブラウザの成功画面やlocalStorageは支払い証明にならない |
| アプリ添付・大きな生成物 | プロジェクト専用の非公開R2 | サーバー経由。D1には所有者、object key、schema version、hash等の参照 | バイナリをDBへ詰め込まず、認可と内容を分離 |
| D1エクスポート・移行原本 | プロジェクト専用の非公開R2 | 世代別objectとmanifest。読み戻し・hash照合 | 障害復旧と他DBへの移行に備える |
| 外部調査の事実・出典 | Foundationの登録済みR2契約 | 既存収集CLI、schema検証、create-only | 事実を不変に保ち、解釈・表示と分離 |
| 表示用の企業一覧・詳細 | 上記正本からのprojection | 読み取り時の変換、公開DTO | UI都合で第二の正本を作らない |
| 秘密鍵・APIトークン | ホストのsecret管理 | 環境ごとのsecret注入 | Git、R2本文、ブラウザへ入れない |
| 一時キャッシュ | 再生成可能なキャッシュ | 消えても正本から再作成 | 権利やユーザー記録の正本にしない |

Workersの配布物は `pnpm workers:build`（`bundle:workers`、`deploy:workers`、`upload:workers`から利用）を入口にする。このビルドはdotenvから公開設定だけを一時的に取り出し、秘密鍵・APIトークンをビルドへ渡さず、生成された `.open-next` を秘密値で照合する。Stripe/Gemini/R2/D1の秘密はCloudflare Worker secretまたは対象ホストのsecret管理へ実行時に注入する。直接 `opennextjs-cloudflare build` を本番配布手順に使わない。

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
3. D1はmigration・制約・index、R2はversion付きschema・key規則を定義する。外部JSONはAJV等で検証する。
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

アカウント削除は認証済みの `DELETE /api/user/me` で、ブックマーク、メモ、会話、合成アイデア、投稿、`users` 行をD1の一括処理で削除する。決済監査に必要な `payment_events` はUIDとfact内のUIDを取り除いて匿名化して残す。現在の実装にはユーザー所有R2 objectがないため、添付を追加する場合は所有者キーと削除・バックアップ反映を同じ設計で追加し、孤児objectの定期検査を必須にする。法定保存が必要な決済記録の期間と、その他のデータの具体的な保持日数は運用開始前に決める。

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
