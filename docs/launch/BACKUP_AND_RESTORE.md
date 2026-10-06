# 公開後のバックアップと復元

作成: 2026-10-06。対象: 公開後に毎日何をバックアップし、どう復元するか。
状態: **手順書。実機のバックアップ・復元はこの作業では1回も実行していない**（本番の D1・R2 には接続していない）。確認できたのは、手元の復元演習（後述）だけ。

既存の正本は先に読むこと: `docs/architecture/RECOVERY.md`（D1 の export・別 D1 への復元・比較）、`docs/architecture/R2_100_YEAR_OPERATIONS.md`（R2 の create-only・読み戻し・復旧テスト）。この文書は、それを「公開後の毎日の運用」に並べ直し、足りない点を明記したもの。

## 0. 先に結論

- 守る対象は4つ: **D1（利用者・決済）**、**R2 の研究データ（Foundation）**、**公開版（catalog release）**、**コードと秘密の名前**。
- D1 は「Time Travel（直近の巻き戻し）」と「毎日の export を非公開 R2 へ保存（独立コピー）」の二重にする。Time Travel だけを頼らない（RECOVERY.md の方針どおり）。
- R2 の研究データは、そもそも上書き・削除をしない設計（create-only）。守るのは「消さない」「読み戻して一致を確かめる」こと。
- **毎日の D1 export を自動で回す仕組みは、まだ無い**（RECOVERY.md にも「定期実行・保持期間はまだ自動化していない」とある）。公開時点では手動で毎日、または公開直後だけ週数回から始める。自動化は定期実行の有効化にあたるため、オーナー確認が先（`AUTOPILOT_OPERATIONS.md` の条件）。
- RPO・RTO は**仮の目標値**（後述）。実測するまで「未確定」と呼ぶ（R2_100_YEAR_OPERATIONS.md の「想定値を書かず実測を採用」に合わせ、仮であることを明記する）。

## 1. この作業で実行して確認したこと

| 実行 | 結果 |
|---|---|
| `pnpm test:recovery`（`python3 scripts/architecture/verify-d1-recovery.py` と `unittest`） | 成功。`status: PASS`、`scope: offline-synthetic-sqlite-only`。migration 14本（0001〜0014）を空のローカル SQLite に適用、架空の2人の利用者のデータ（20テーブル・13行）を投入し、export → 別の空 DB へ復元 → スキーマと全行のハッシュ・件数が一致。`integrity_check`・`foreign_key_check`・既存先への上書き拒否・改ざん検知・COMMIT 直前の失敗でのロールバック・元 DB 不変、の8項目すべて成功。`unittest` 6件 OK |

**この演習が証明しないこと**（出力にも `production_restore_tested: false` とある）: Cloudflare D1 本番での復旧、D1 へのインポート全体の原子性、Time Travel、R2 の復旧。

## 2. 何をどこにバックアップするか

| 対象 | 正本 | バックアップ | 頻度（初期案） | 状態 |
|---|---|---|---|---|
| 利用者・決済・メモ・保存条件など | D1 `make-money-production-app` | ① Time Travel（Cloudflare 内、自動）<br>② `wrangler d1 export` を非公開 R2 `make-money-production-private` の `backups/d1/` へ保存 | ①常時 ②毎日1回（日本時間の早朝など低負荷の時間） | ①設定は未確認 ②**手順のみ・未実行・自動化なし** |
| 研究データ（収集の原本・journal・view） | R2 `foundation-raw` / `-lake` / `-public` / `-restricted` | R2 自体が正本。上書き・削除をしない。受領記録（receipt）に key・bytes・SHA-256 を残す | 書き込みのたび | 既存運用（`R2_100_YEAR_OPERATIONS.md`）。外部の保護設定（Bucket Lock など）は未完 |
| 公開版（catalog release） | R2 `views/make-money/catalog-v1/...`（不変） | 不変のオブジェクト。入れ替えは「コード側のハッシュを切り替える」だけで、古い版は残る。`data/catalog-release.json` を Git で保持 | 公開のたび | 既存仕様（`STORAGE.md`） |
| 元の台帳 | `data/entities-index.json` ほか（Git） | GitHub が正本。R2 にも復元可能な形で保管 | 変更のたび | 下の注意を参照 |
| アプリの非公開ファイル | R2 `make-money-production-private` | 同上。別の専用バケットへ create-only で複製する案（未実施） | 週1回（案） | 未実施 |
| コード | GitHub `salve-de/Make-money` | GitHub が正本 | 常時 | — |
| 秘密（鍵・Secret） | Cloudflare の Secret、macOS キーチェーン | **値はバックアップしない（Git・チャット・R2 に置かない）**。必要な「名前の一覧」と再発行の場所だけ記録する | 変更のたび | 下の一覧 |

注意（容量）: `data/entities-index.json` は **98,580,097 bytes**（2026-10-06 時点）。GitHub は 100MB 超のファイルの push を拒否する。あと約1.4MB で上限に達するため、増えた時にバックアップ（Git への保存）自体が失敗する。上限に近づいたら分割・圧縮・R2 への退避を決める（要判断）。これは公開前準備の範囲外だが、「元の台帳のバックアップ」に直結するので指摘する。

### 復旧に必要な秘密の「名前」（値は書かない）

コードが読む名前（`getRuntimeEnvValue` / `process.env` の検索で確認）: `STRIPE_SECRET_KEY`、`STRIPE_WEBHOOK_SECRET`、`RESEND_API_KEY`、`NOTIFY_FROM_EMAIL`、`NOTIFY_CRON_SECRET`、`NOTIFY_UNSUBSCRIBE_SECRET`、`FOUNDATION_INGEST_TOKEN`、`GEMINI_API_KEY` / `GOOGLE_GENERATIVE_AI_API_KEY`、`V0_API_KEY`、`NEXT_PUBLIC_FIREBASE_*`（公開用）、`CLOUDFLARE_R2_ACCOUNT_ID` / `_ACCESS_KEY_ID` / `_SECRET_ACCESS_KEY`（ローカルの収集用。キーチェーン `make-money-foundation-ingest`）。

- 実際に本番へ入っているかは**未確認**。復旧の演習の最初に、「これらを再発行できる場所（Stripe・Resend・Cloudflare・Firebase の管理画面）にオーナーがログインできるか」を確認する（人に依存する復旧の弱点）。

## 3. 毎日の手順（D1 のバックアップ）

**実行はしていない。** 本番 D1 へ接続し、非公開 R2 へ書き込むため、実行前にオーナーの確認を取る。

前提: `docs/architecture/RECOVERY.md` の「本番D1のバックアップを取得する手順」。export 中は D1 へのリクエストがブロックされ得るため、低負荷の時間に行う（現在のデータは小さい。データが増えたら所要時間を実測して窓を決める）。

1. 取得（手元で）
   ```sh
   umask 077
   dir="$(mktemp -d "${TMPDIR:-/tmp}/make-money-backup.XXXXXX")"
   stamp="$(date -u +%Y%m%dT%H%M%SZ)"
   pnpm exec wrangler d1 export make-money-production-app --remote --output="$dir/app.sql"
   shasum -a 256 "$dir/app.sql" | tee "$dir/app.sql.sha256"
   ```
2. 記録（manifest）に残す: 取得時刻（UTC）、対象 D1 の ID（`07affd4c-…`。`wrangler.jsonc` の値と一致すること）、Git SHA、migration の一覧とハッシュ、SQL の bytes と SHA-256、各テーブルの件数。**個人情報（メール等）を含むので公開しない。** チャット・Git に貼らない。
3. 保存: 非公開 R2 `make-money-production-private` の `backups/d1/<stamp>/app.sql` と `manifest.json`。**上書き禁止（create-only）**。キーに時刻を入れて衝突させない。既存の実績は `backups/d1/2026-09-11-initial/`、`backups/d1/2026-09-12-pre-0004-0005/`（`PUBLICATION_RECEIPT.md`、`RECOVERY.md`）。
   - 保存に使える既存部品: `src/lib/storage/r2.ts` の `putR2ObjectCreateOnly`（存在すれば同一内容は冪等、別内容は衝突で停止、保存直後に読み戻して bytes と SHA-256 を照合）。
   - **この保存を1コマンドで行うスクリプトは、まだ無い**（`scripts/ops/` に置く案。書き込みを行うので、作る・動かす前にオーナー確認）。`wrangler r2 object put` は上書きになり得るので、毎回ユニークなキーを使うこと。
4. 読み戻して照合: R2 から GET し、SQL の SHA-256 が手順1と一致することを確認してから、手元の一時ファイルを消す（`rm -P` は不要。`umask 077` の一時ディレクトリを削除）。
5. 結果を記録: 日付・キー・SHA-256・件数を運用記録に1行残す（置き場所は未決。`docs/operations/` に月別ファイルを置く案）。**読み戻しが済むまで「バックアップ済み」と書かない**。

保持期間（案）: 直近 **30日分**を残し、それより古いものは削除する。削除は「永久削除」にあたるため、削除の実行は都度オーナー確認（または R2 のライフサイクルルールを `backups/d1/` にだけ設定。設定変更は人が行う。設定可否・費用は未確認）。理由は退会データの扱い（後述）。

## 4. 復元の手順

### 4-1. 誤操作・データ破損に気づいた直後（巻き戻し）

- D1 Time Travel を使う。確認（読み取り）: `pnpm exec wrangler d1 time-travel info make-money-production-app`。復元（**同じ DB を過去の時点に戻す・破壊的**）: `pnpm exec wrangler d1 time-travel restore make-money-production-app --timestamp=<ISO8601>`。
- 実行前に、戻す前の現在のブックマークを控える（取り消せるように）。書き込みを止め（メンテナンスモード）、直前に export を取ってから行う。
- 保持期間は契約プランによる（無料プランと有料プランで異なると理解しているが、**現在の契約と公式の数字は未確認**。実施前に公式ドキュメントで確認）。
- 本番では**まだ1度も実行していない**（RECOVERY.md の「未実施」に同じ）。

### 4-2. 本番が使えない・Time Travel の範囲外（独立コピーから復元）

`docs/architecture/RECOVERY.md` の「空の別D1へ復元・検証する手順」に従う。要点だけ再掲:

1. 本番の書き込みを止め、直前の export と、停止後に届く決済イベントの扱いを決める。
2. **新しい空の D1** を作る（本番の ID を使い回さない）。
3. R2 から対象日の `app.sql` と `manifest.json` を読み戻し、SHA-256 を照合する。
4. 新 D1 へ `wrangler d1 execute … --file app.sql`（専用の設定ファイル経由。本番の設定を触らない）。
5. 復元後に export し、`python3 scripts/architecture/compare-d1-exports.py` で元と比較（スキーマと全行のハッシュ・件数）。
6. 専用の検証環境で、所有者 A が B のデータを読めないこと、決済イベントの再読込を確認。
7. 承認後に、本番の `wrangler.jsonc` の `APP_DB` を新 DB に切り替えてデプロイ。旧 DB と直前のバックアップは残す。
8. 停止中・復元中に届いた Stripe のイベントは、イベント ID で重複排除して再処理する（Stripe 管理画面から再送できる。手順は未確認）。

### 4-3. R2 の研究データ

- 通常は復元不要（上書き・削除をしない）。破損・誤削除が疑われるときは、受領記録（receipt）から `pnpm r2:100-year:restore RECEIPT.json /path/to/new-restore-directory` で別の場所へ読み戻し、bytes と SHA-256 を照合する（R2 側への書き込み・削除はしない）。
- 公開版（catalog release）の不具合: R2 の古い版は残っている。コード側で前の `data/catalog-release.json` に戻して再デプロイするだけで切り替わる（`AUTOPILOT_OPERATIONS.md`）。

## 5. 復元の演習（いつ・どうやって）

| 演習 | 頻度 | 内容 | 状態 |
|---|---|---|---|
| ローカル復元演習 | 毎回の自動テスト（`pnpm test` に含まれ、CI でも走る）。公開前に手動でも1回 | `pnpm test:recovery` | **実行・成功を確認済み（本日）** |
| クラウドでの復元演習 | 公開前に1回、以後は四半期ごと | 実際に取った export を、新しい空の D1 に復元し、比較スクリプトで一致を確認。所要時間・失敗箇所を記録して RTO の実測値にする。終わったら演習用 D1 を消す（**削除は都度オーナー確認**） | **未実施** |
| R2 の復旧テスト | 四半期 | `R2_100_YEAR_OPERATIONS.md` の1〜6の手順 | 既存の演習記録あり（2026-09-19 付）。公開後の再実施は未 |
| 人の手順確認 | 公開前に1回 | 秘密の再発行ができるか、手順書だけで第三者が復元できるか（手順書の読み合わせ） | 未実施 |

記録する項目: 実施日、対象のバックアップのキー、SHA-256、復元先 D1 の名前、比較結果、所要時間、失敗箇所、次回までの改善。

## 6. RPO / RTO（初期の目標案）

| 事故 | RPO（失ってよい時間の最大） | RTO（戻すまでの目標） |
|---|---|---|
| 誤操作・データ破損（Time Travel の範囲内） | 数分〜1時間（Time Travel の粒度。実測前） | 1時間 |
| D1 が使えない（独立コピーから復元） | 24時間（毎日1回の export の場合） | 4時間 |
| R2 の研究データの破損 | 0（上書きしない設計。受領記録から再取得） | 未確定 |

- **すべて仮の目標値**。クラウドでの復元演習の実測で置き換える。実測まで公式には「未確定（UNKNOWN）」と扱う。
- 決済は、D1 のバックアップ時点以降の分を Stripe 側の履歴から取り戻せる（イベント ID で重複排除）。利用者データ（メモ・保存条件・ブックマーク）は D1 にしか無いので、RPO はそのまま失う時間になる。
- 公開直後は利用者が少なく、毎日1回で足りる。利用者が増えたら頻度を上げる（未確定）。

## 7. 退会データとバックアップ

退会（`DELETE /api/user/me`、`src/app/api/user/me/route.ts`）の実装を確認した。1つの D1 トランザクションで、ブックマーク・メモ・チャット・保存条件・案件・掲載・出品などを削除し、決済イベントは利用者 ID を外して匿名の会計記録として残す。削除後は読み戻しで残りが無いことを確認する。

**バックアップには、削除前のデータが残る。** 方針（案・法務担当と合わせる）:

1. バックアップは**選択的に書き換えない**（改ざんと区別できなくなる・ハッシュが崩れる）。代わりに**保持期間を短く固定**し（初期案 30日）、期限が来たら削除する。退会データは最長でその期間のうちにバックアップからも消える。
2. プライバシーポリシーに「退会後もバックアップに最長30日残る」と書く（文言と日数は法務の担当が確定。**要確認**）。
3. **復元時の再削除**: 古いバックアップから復元すると、退会済みの人のデータが復活する。これを防ぐため、退会の記録（利用者 ID の一方向ハッシュと退会日だけ。個人を特定できない形）を、バックアップとは別の場所に追記専用で残し、復元後に再度削除を流す。**この記録の仕組みは現在無い（未実装）**。`execution_resets`（owner_key のハッシュ）は退会の痕跡になるが、全テーブルの再削除に使えるかは未確認。復元演習の項目に「退会済みの人が復活しないこと」を加える。
4. R2 の `foundation-raw` の `media/` は削除依頼に応じるため無期限ロックの対象外（`R2_100_YEAR_OPERATIONS.md`）。削除依頼の窓口・手順は `legal/contact` の担当。

## 8. 未確定・未確認のまとめ

- 毎日の export の自動化（定期実行）と保存スクリプト: 無い。作るか・どこで動かすか。
- Time Travel の保持日数（契約プラン）、Cloudflare のバックアップ関連の追加機能の有無・費用。
- 30日保持を実現する方法（ライフサイクルルールか手動削除か）と、その削除のオーナー確認の運用。
- 退会記録（再削除用）の仕組み。
- クラウドでの復元演習と RTO の実測。
- 秘密の再発行ができる人・場所の確認。
- `data/entities-index.json` が GitHub の 100MB 上限に近い（98.58MB）。
