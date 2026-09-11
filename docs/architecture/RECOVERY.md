# Make-Moneyの復旧手順と検証範囲

復旧先を空の別環境に作り、データの一致を確認してから接続先を切り替える。元のDB・R2を消したり、復元先へ本番を指定して上書きしたりしない。

## 正本の対応

|対象|現在の正本|復旧時の確認|
|---|---|---|
|ユーザー、所有者別メモ・保存、決済イベント|D1 `make-money-production-app` / `07affd4c-cac4-4998-843c-b5881fccab5e`|所有者ID、決済イベントID・resource_id・livemode、各テーブル件数、内容ハッシュ|
|Make-Money固有の非公開オブジェクト|R2 `make-money-production-private`|object key、所有者・プロジェクト境界、bytes、SHA-256、metadata|
|共有調査データ|登録済みFoundation R2契約|consumer側から削除・上書きしない。Foundation側の復旧責任者・契約を確認|
|DB構造|`migrations/d1/*.sql`|対象リリースのGit SHA、SQLファイル順序と各SHA-256|
|環境と接続先|`wrangler.jsonc` / 環境変数・秘密管理|PROJECT_ID、ENVIRONMENT、APP_DBのID、APP_R2。別製品やstagingと共有しない|

ID・bindingの正本は現在の`wrangler.jsonc`。この文書の値との相違があれば実行前に解決する。秘密値と実バックアップはGit、公開R2、チャット添付へ置かない。

## 自動で繰り返すローカル復旧演習

```sh
python3 scripts/architecture/verify-d1-recovery.py
```

Python 3標準ライブラリのSQLiteを使用し、追加パッケージ・外部通信・本番認証は不要。毎回一時ディレクトリを作成し、終了時に削除する。

1. 現在のmigrationをファイル名順に空DBへ適用する。
2. 2人の架空所有者、別々のメモ・保存、購入と返金などを投入する。固定時刻、`example.invalid`の架空アドレスだけを使う。
3. SQL dumpをファイルに書き、読み戻したbytesのSHA-256を確認する。
4. 別の空DBへ復元し、schemaと全行の正規化ハッシュ・テーブル別件数を照合する。SQLite integrity/foreign-key検査も行う。
5. 既存復元先への上書きとハッシュ不一致を拒否する。
6. COMMIT直前に不正な決済kindを挿入し、途中失敗後のrollbackでテーブル・行が残らないことを確認する。元DBが変化しないことも確認する。

出力JSONにはmigrationのSHA-256、backupのSHA-256、内容ハッシュ、件数、合否がある。2026-09-11に8テーブル・12行で成功。将来migrationが増えるとschemaとハッシュは変わる。固定の古いハッシュに合わせず、そのリリースの演習結果を保管する。

**この演習はローカルSQLiteの証明であり、Cloudflare D1の本番復旧成功やD1インポート全体の原子性を証明しない。**

## 本番D1のバックアップを取得する手順

以下は運用時の手順。2026-09-11に初期D1のexport・R2保存・読み戻しとローカル復元を実施済み。対象とハッシュは [保存記録](PUBLICATION_RECEIPT.md) を参照。export中はDBリクエストがブロックされ得るため、書き込み停止・メンテナンス窓を決める。Webhook受信の再送・再処理計画も記録する。[Cloudflare公式のimport/export仕様](https://developers.cloudflare.com/d1/best-practices/import-export-data/)

```sh
umask 077
recovery_dir="$(mktemp -d "${TMPDIR:-/tmp}/make-money-recovery.XXXXXX")"
pnpm exec wrangler d1 export make-money-production-app --remote --output="$recovery_dir/app.sql"
shasum -a 256 "$recovery_dir/app.sql" > "$recovery_dir/app.sql.sha256"
```

- exportの成功終了とファイルサイズを確認。生成SQLを公開せず、対象DB ID、取得時刻、Git SHA、migrationハッシュ、全テーブル件数を非公開の実行記録へ残す。
- バックアップを暗号化された組織のバックアップ保管先へ移し、保管後のbytes/hashを読み戻して照合する。このプロジェクトの保管先は専用非公開R2。定期実行・保持期間の運用設定はまだ自動化していない。
- DBの永続化確認と独立したバックアップは別。DBを作成しただけでバックアップ済みとはしない。

## 空の別D1へ復元・検証する手順

1. 本番の書き込みを停止し、直前exportと、停止後に届く決済イベントの扱いを記録する。
2. 目的・環境が識別できる一意の復旧DBを作る。例の名前は実行日・時刻で置き換える。

```sh
recovery_db="make-money-recovery-YYYYMMDD-HHMMSS"
pnpm exec wrangler d1 create "$recovery_db"
```

3. 作成結果のDB IDを使い、バックアップ作業ディレクトリ内に専用設定を作成する。**本番のIDをコピーしない。** 本番設定はまだ変更しない。

```json
{
  "name": "make-money-recovery-check",
  "compatibility_date": "2026-09-08",
  "d1_databases": [{
    "binding": "APP_DB",
    "database_name": "make-money-recovery-YYYYMMDD-HHMMSS",
    "database_id": "作成結果の新しいDB-ID"
  }]
}
```

4. 保存先を`$recovery_dir/restore.wrangler.jsonc`として、対象が空で本番IDと異なることを確認する。取得した完全exportをそのまま使い、先にmigrationを適用して二重作成しない。

```sh
pnpm exec wrangler d1 execute "$recovery_db" --config "$recovery_dir/restore.wrangler.jsonc" --remote --command "SELECT name FROM sqlite_schema WHERE type='table' ORDER BY name;"
shasum -a 256 -c "$recovery_dir/app.sql.sha256"
pnpm exec wrangler d1 execute "$recovery_db" --config "$recovery_dir/restore.wrangler.jsonc" --remote --file "$recovery_dir/app.sql"
pnpm exec wrangler d1 export "$recovery_db" --config "$recovery_dir/restore.wrangler.jsonc" --remote --output="$recovery_dir/restored.sql"
```

D1の内部テーブルはアプリの空判定・件数比較から区別する。インポート途中で失敗したDBを本番へ接続しない。新しい空の復旧先を作り直し、原因を解消して再試行する。元DBへ逆書き込みして辻褄を合わせない。

5. 復元後のexportから全アプリテーブルについて件数と全行内容を照合する。SQLテキストの並びやSQLiteファイルの物理配置は変わり得るので、ファイルハッシュ一致だけで復元判定しない。ローカル演習の`inventory()`と同様にschema・全行を並べ替えた内容ハッシュを比較する。
6. 専用staging接続で、所有者AがBのメモ・保存を読めないこと、購入・返金・紛争の既存イベントを再読して権限が一致すること、R2参照が別環境へ漏れないことを検証する。
7. これらが成功した証拠と切替対象IDをレビューし、承認後に本番bindingを新DBへ切り替える。旧DBと直前backupを保持し、切替後に追加された決済イベントはイベントIDで重複排除して処理する。復元だけで未処理イベントがなくなったとは扱わない。

SQLiteの`.dump`をD1へ持ち込む場合はD1互換化が別途必要。Cloudflare公式手順に従いtransaction制御文・予約内部テーブルを扱う。上のローカル障害注入用dumpをそのままD1へ送らない。[公式変換手順](https://developers.cloudflare.com/d1/best-practices/import-export-data/)

## Time TravelとR2

D1 Time Travelは別の復旧手段であり、長期保管する独立バックアップの代わりにはしない。保持範囲・利用可能なbookmarkはアカウントの実状態と[公式Time Travel仕様](https://developers.cloudflare.com/d1/reference/time-travel/)を確認する。ここでは本番にTime Travel restoreを実行していない。

R2は元bucketへ上書き復元せず、対象objectのkey・version相当の識別子・metadata・SHA-256を一覧化し、別の専用bucketまたは衝突しない復旧prefixでbytesを読み戻して比較する。DBとR2を同じ復旧時点に揃え、DBから参照する全objectの存在を確認してから切り替える。初期D1バックアップのR2保存・読み戻しは実施済み。アプリ添付の実データ復元まで実施したものではない。

## 未実施

Time Travel復元、実Stripeイベントの再同期、保持期間の自動運用、復旧時間目標の実測は未実施。初期DBはアプリデータ0行のため、本番ユーザーデータを持つDBの復旧実証と混同しない。

## 2026-09-12 本番D1 migration適用と事前保全

本番D1 `make-money-production-app`（ID `07affd4c-cac4-4998-843c-b5881fccab5e`）について、適用前に全アプリテーブルの行数が0であることを読み取り確認した。直前の完全exportを非公開R2へcreate-only保存し、保存直後のGETでbytesとSHA-256を照合した。

- SQL: `backups/d1/2026-09-12-pre-0004-0005/schema.sql`、3,569 bytes、SHA-256 `ef0e120ef1eeb268a5119ff291743a53da0251d805d904f569c59d10cce6ea31`
- manifest: `backups/d1/2026-09-12-pre-0004-0005/manifest.json`、884 bytes、SHA-256 `0683b09961068e3f33075ea7142f55e8b8d6c5bbac2d6cfb552474a64cc9ddfc`
- 適用: migration `0004_newsletter_privacy.sql`、`0005_request_rate_limits.sql`を順序どおり適用
- 読み戻し: `No migrations to apply`、`newsletter_subscribers`の`user_id`・`unsubscribe_token_hash`、所有者index・解除tokenのpartial unique index、`request_rate_limits`表と制約を確認。同表の行数は0。

これは加算migrationの適用と空の本番D1のschema確認であり、利用者データの移行・本番アプリの保存導線・復旧訓練を意味しない。バックアップの保存記録は [PUBLICATION_RECEIPT.md](PUBLICATION_RECEIPT.md) にある。現在の本番migration状態は、実行前の古い記述ではなくこの追補と`wrangler d1 migrations list --remote`の読み取り結果を正本とする。

## 復元後のexportを機械比較する

```sh
python3 scripts/architecture/compare-d1-exports.py "$recovery_dir/app.sql" "$recovery_dir/restored.sql" --expected-sha256 "manifestに記録した元SQLのSHA-256"
```

原本のhashを検証してから、二つのexportを隔離したメモリDBへ読み込む。全schemaと全行のハッシュ・件数を比較し、件数が同じでも所有者や内容が異なれば失敗する。外部DBのATTACHを拒否し、レコード本文は出力しない。対象SQLは信頼できるバックアップに限定する。schema定義の表現が変わった場合も安全側に失敗するため、手動で元と先の差を確認し、期待ハッシュを書き換えて成功させない。

比較器の回帰テストも `pnpm test:recovery` に含める。保存と復元の実データはGitへ入れず、合否・対象・件数・ハッシュだけを記録する。

## 2026-09-11 実クラウド復元の証拠

R2から読み戻した初期SQLを、新規の `make-money-recovery-20260911`（ID `d8baf384-5233-46a2-ab6a-371e5cc5e020`）へ復元。投入前に本番IDと異なること、アプリテーブル0個を確認した。復元後のD1 exportを元SQLと比較し、schema・全行内容ハッシュが一致。SQLファイル自体のSHA-256も一致した。

[機械可読の実行証拠](recovery-evidence/2026-09-11-initial-d1.json)。アプリ8テーブルは0行、migration履歴のみ3行の初期バックアップであり、利用者がいる本番DBやログイン・決済再同期の復旧証明ではない。復元先はアプリへ接続せず、隔離して残してある。本番bindingは変更していない。

## 配布物の検証

D1を使う本番配布物はCloudflare Worker。`pnpm build` の後に `pnpm bundle:workers` を実行し、Next.jsを再ビルドせずWorkerを生成する。この順序をCIの必須buildチェックへ組み込んだ。`next.config.ts` は `output: "standalone"` を明示し、クリーン環境でもWorkerが必要とする成果物を生成する。古い `.next/standalone` の残存を成功条件にしない。2026-09-11にOpenNextの完全ビルドでも生成成功を確認した。Worker生成成功はデプロイ・本番認証設定・ユーザー導線の成功を意味しない。
