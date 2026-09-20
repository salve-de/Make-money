# R2 100年運用契約

更新日: 2026-09-19
状態: 運用設計 v1（`reconcile-v1-080c1ec9401e40bbb29920ae`の投入・全件readbackは完了。外部保護設定の完了はまだ宣言しない）

## 目的

Make-Money、Universal Foundation、Investrader、将来のプロジェクトが、同じ一次資料を再収集せずに利用できる共通データ基盤を維持する。

ここでいう「100年」は、Cloudflareや現在の担当者が100年間変わらないという保証ではない。担当者・プロジェクト・プロバイダー・スキーマが変わっても、原本の同一性、出典、復旧可能性を失わない運用目標である。

## 変更しないもの

- `foundation-raw`、`foundation-lake`、`foundation-public`、`foundation-restricted`の役割
- `foundation-raw`の原本キーと`foundation-lake`の保存票キー
- `Raw -> Lake -> Catalog`の論理構造
- 既存Foundationオブジェクトの移動、コピー、改名、削除、上書き
- 既存`universal`およびEDINET正本領域

整理はR2の物理フォルダーを掘り直して行わず、Catalog / D1の論理JOINで行う。

## 不変条件

1. 原本はSHA-256をキーまたはメタデータとして記録し、同一キーの別内容を拒否する。
2. 新規書き込みはCreate-Only。既存同一内容は冪等な重複、別内容は衝突として停止する。
3. すべての成功書き込みは、件数・バイト数・SHA-256・R2 readbackをReceiptに残す。
4. `universal`を新しいFoundation処理の書き込み先にしない。
5. Catalogは正本原本ではなく再生成可能な派生物として扱う。
6. 書き込み・鍵変更・保持設定の完了を、画面表示やプロセス終了だけで宣言しない。

## Raw保存経路の役割分担

Rawには、用途の異なる2つの入口がある。これは物理構造を二重化するためではなく、通常の研究収集と単独原本アーカイブを分けるための役割分担である。

- 通常の研究収集（`research-bundle.v1`）は、`src/lib/foundation/ingest.ts` の
  `evidence/<source_id>/YYYY/MM/DD/<evidence_id>/payload.<ext>` と
  `manifest.json` を使う。出典、権利状態、取得時刻、内容SHAをmanifestに束ね、Lakeの
  bundle/journal/datasetと論理的に関連付ける。
- 単独原本・検証用アーティファクトの保存は、`scripts/foundation-simple-ingest.ts` の
  `blobs/sha256/<aa>/<bb>/<hash>.<ext>`（Content-Addressed Storage）を使う。
  同じ内容を再投入しても同じキーになり、別内容で同じキーを上書きできない。

Universal Foundation main（2026-09-19確認、commit
`e9b920698d1d7a58c108c628cdb55ba4110caa70`）の現行registry/schemaは、通常の研究収集に
evidence形式を定義し、raw evidence・Lake bundle・journal・typed datasetを役割別に扱って
いる。したがって、既存オブジェクトを移動・コピーして統一する必要はない。今後も用途を
偽って入口を選ばず、研究収集はevidence形式、独立原本はCAS形式とする。

## 保存層と保持方針

| 層 | 役割 | 標準方針 | 保持設定 |
|---|---|---|---|
| `foundation-raw` | HTML、PDF、XBRL等の原本 | 不変・削除禁止 | 権利確認済みの原本は無期限Lock。権利・法令に期限があるものは期限付きLock |
| `foundation-lake` | Journal、Entity、Claim、Metric等 | 追記専用 | Journalは原則長期保持。訂正は新しい版を追加し、旧版を上書きしない |
| `foundation-restricted` | 権利・個人情報等に制約がある原本 | 最小権限・目的限定 | 個別の権利・法令・契約に従う。無期限保存を一律適用しない |
| `foundation-public` | 公開可能な投影物 | 再生成可能 | 原本の代替にしない。公開停止・再生成手順を別管理 |
| `universal` | 既存レガシー領域 | 新規Foundation処理から隔離 | 移行・削除は別承認なしに行わない |

Bucket Lockは保持期間を先に決めてから適用する。全バケットへの無期限Lockは、権利上削除が必要なデータを閉じ込めるため禁止する。

## 認証と権限

- Workerは、必要なバケットだけをR2 Bindingで参照する。
- User APIトークンをサービスの共通鍵にしない。
- ローカル収集は、限定されたAccountトークンをKeychain等の秘密保管庫から一時注入する。
- 複数プロジェクト・個別ジョブには、可能な限りバケット・Prefix・操作・有効期限を絞ったTemporary Credentialsを使う。
- `Universal-Storage-Token`のような全バケット管理権限を通常処理で使用しない。
- 管理者用Break-glass権限は通常の収集鍵と分離し、利用時に理由・実行者・対象・結果を記録する。

## 復旧契約

R2の冗長性だけをバックアップとはみなさない。次をReceiptとともに保存する。

- object key、bucket、bytes、SHA-256、schema version、source evidence IDs
- 収集run ID、実行時刻、使用した権限の識別子（秘密値は記録しない）
- Catalog snapshotと、CatalogをJournalから再生成する手順

復旧テストは、少なくとも四半期に一度、次を実データのコピーまたは検証用環境で行う。

1. Receiptから対象を選ぶ
2. 別の復旧先へ復元する
3. 件数・バイト数・SHA-256・JSON schemaを照合する
4. Catalogを再生成する
5. Make-Moneyの読み取り画面で代表データを確認する
6. 所要時間と失敗箇所を記録する

実行入口:

```sh
pnpm r2:100-year:restore RECEIPT.json /path/to/new-restore-directory
```

このコマンドはR2からGETし、既存の復旧先を上書きせず、ReceiptのSHA-256・バイト数を照合してからファイルを書き出す。R2側へのPUT、削除、移動は行わない。

RPO/RTOは想定値を書かず、復旧テストの実測値を採用する。未実施の場合は`UNKNOWN`とする。

## 監査と運用周期

- 収集ごと: prepare plan、Create-Only、readback、Receipt、Catalog反映
- 毎週: 新規オブジェクトとReceiptの件数・ハッシュ・衝突確認
- 毎月: Bucket Lock、Lifecycle、Data Access Logs、トークン、請求量を確認
- 四半期: 復旧テスト、アクセス権レビュー、不要なProject Bindingの確認
- 年次: スキーマ・エクスポート形式・担当者引き継ぎ・別プロバイダー復元手順を確認

監査は「検査していない項目」をPASSにしない。R2のBucket Lock、Lifecycle、Data Access Logs、請求量、復旧結果を取得できない場合は`NOT_VERIFIED`とする。Data Access Logsはアクセスの完全な監査証跡ではなく、Cloudflareの仕様上、非同期・ベストエフォートの補助証跡として扱う。

## 本番投入ゲート

次のすべてが揃うまで、大量投入を開始しない。

- `FOUNDATION_REPO`が認証済みのUniversal Foundation mainを指している
- 投入対象の実ファイル、件数、ID衝突、出典範囲が確認済み
- ローカルまたはWorkerの認証経路が確認済み
- 保存先がFoundation 4バケットのいずれかで、`universal`でない
- 1件のCanary PUTとreadback/hash検証が成功
- 同一内容の再実行が冪等、別内容の同一キーが衝突停止することを確認
- 予定ReceiptとCatalog反映方法が準備済み
- 外部保護設定と復旧状態が`PASS`または明示的な承認済み例外

## 現在の確認済み状態

2026-09-19時点で、コードのCreate-Only/readback、4つのFoundation Binding、`FOUNDATION_REPO`のストレージregistry参照を確認済み。Canaryの実行結果は[Canary証跡](./R2_100_YEAR_CANARY_EVIDENCE_2026-09-19.md)のとおり、初回作成・同一内容の冪等再実行・別内容の衝突拒否・readbackをPASSとした。Cloudflare画面では4つのFoundationバケットすべてでData Access Logsを有効化した。Bucket Lockはまだ未設定で、権利・保持期間を分類せずに無期限Lockを入れると削除義務や復旧手順を壊すため、意図的に保留している。

Windows側で正本release `reconcile-v1-080c1ec9401e40bbb29920ae`を確定し、`foundation-raw` 1件、`foundation-lake` 3,346件、`foundation-public` 3,342件の計6,689件を投入した。全件のSHA-256・バイト数readbackが`6,689 / 6,689 PASS`、衝突0、エラー0、上書き・削除・移動なしで完了している。詳細は[投入対象棚卸し](./R2_100_YEAR_INPUT_INVENTORY_2026-09-19.md)と[release引き継ぎ](./R2_100_YEAR_RELEASE_HANDOFF_2026-09-19.md)を正本とする。

したがって、release単位のR2保存は完了。一方、これは「100年保証」ではなく、Bucket Lock、費用、定期バックアップ、Foundation全体の復旧訓練、別プロバイダー復元は別監査として未完または未検証である。この文書と監査は、それらをrelease完了と混同しないために残す。
