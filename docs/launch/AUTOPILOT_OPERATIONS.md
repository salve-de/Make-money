# 自動運転の公開後運用（収集 → 保存 → 文章化 → 品質確認 → 画面反映）

作成: 2026-10-06。対象: 公開後も、収集から画面反映までの流れが壊れず、壊れたら「どこで止まったか」を見て再開できるようにする手順。
書き方の約束: コマンドと場所は、この作業フォルダのコード・設定を読んで確認したものだけ書く。実行して確認したものには「実行済み」と書く。それ以外は「未確認」。**本番・R2・D1 には1回も接続していない**。

## 0. 先に結論

- 流れは **2本の別の経路**で画面に届く。混同しない。
  1. **別リポジトリの定期収集 → Publisher → R2 の journal / view**（`salve-de/universal-foundation`。このリポジトリには Publisher 本体が無い）。
  2. **このリポジトリの「仕上げ」→ 公開版（catalog release）→ デプロイ**。画面に出る事例を決めるのは、こちら。
- 画面に出る事例は、`data/catalog-release.json` の `details` に入った事例だけ（`src/shared/catalog-membership.ts` が唯一の門）。R2 に研究データが入っただけでは、一覧・詳細・API のどこにも出ない（`e2e/catalog-only.spec.ts` がこれを検査している）。
- 定期実行は、**この作業では1つも有効にしていない・追加していない**。有効にする前の条件は 6 章。

## 1. 流れの全体と、各段の「止まったかどうか」の見方

```text
[A] 収集（UF 側の定期収集）
      → R2_QUEUE の束 → Publisher（日本時間 8:50 / 14:50 / 20:50 の予定）
      → R2 foundation-lake: journal/v1/YYYY/MM/DD/…、views/make-money/v1/entities/…
[B] 保存（このリポジトリの手動取り込み）
      → foundation-collect.ts / foundation-journal.ts / replay-local-mirror.ts → R2（create-only）
[C] 文章化・品質確認（reader-case）
      → 分析（Codex）→ 統合 → 監査 → 仕上げ済みの選別（data/catalog-finished-ids.txt）
[D] 画面反映
      → catalog:prepare → catalog:publish（R2 へ公開版）→ deploy:workers → 本番で読み戻し
```

| 段 | 止まった時の見方 | 場所・コマンド | 状態 |
|---|---|---|---|
| A 収集 | R2 の最新 journal の時刻が古い | `node scripts/with-r2-keychain-secrets.mjs node scripts/ops/check-freshness.mjs`（`MONITORING.md` 3 章） | スクリプト実行済み（鍵なしの挙動のみ）。本番 R2 は未 |
| A 収集 | Publisher が動いているか | UF 側の Cloudflare Worker（`foundation-r2-queue-publisher`）。`docs/R2_SCHEDULED_WRITER_RUNBOOK.md` に「配備は独立に確認」とある | **未確認**（UF 側・本番） |
| B 保存 | R2 の件数・内容 | `pnpm foundation:audit`（`scripts/audit-r2-integrity.ts`。R2 を list する。読み取りのみ）。終点の確認は `~/.claude/intent/projects/Make-Money.check`（R2 とローカルの件数・ハッシュ比較） | どちらも未実行 |
| B 保存 | ローカルにだけ溜まって R2 に届いていない | `data/r2-local/<bucket>/<key>`（`ALLOW_LOCAL_R2_FALLBACK=1` で取り込んだ分のミラー）。差分の確認: 下記 2-2 の `--dry-run` | 未実行 |
| C 文章化 | どの束まで終わったか | `data/analyze/batches/*.json`（入力）と `data/analyze/out/*.json`（出力）の本数の差。監査は `data/audit/in-*.json` と `out-*.json`。ログは `data/analyze/log/`、`data/audit/log-*.log` | 作業した場所に生成される（この作業フォルダには `data/analyze` は無かった） |
| C 品質確認 | なぜ仕上げ済みにならなかったか | `data/pipeline/select.json`（事例ごとの理由。例「空欄:…」「未監査」「出典:規約で表示不可(eBiz)」「データが少ない」） | 同上 |
| D 反映 | 公開版が R2 にあるか、本番と手元が一致するか | `check-freshness.mjs --site-url https://<本番>`（`release-object:*`、`release-match`） | 未（本番） |
| D 反映 | 本番の件数・画像 | `curl "<本番>/api/catalog?offset=0&pageSize=1&q=&filters=…"` の `total`（`run-pipeline.sh` が使う方法と同じ） | 未（本番） |

## 2. 失敗した時の再開コマンド

### 2-1. 仕上げから公開までを一括で回す（`scripts/reader-case/run-pipeline.sh`）

```sh
bash scripts/reader-case/run-pipeline.sh <バッチ名の頭（例: batch-x1-）>
# 公開せず、仕上げ済みの選別までで止める
PIPELINE_NO_PUBLISH=1 bash scripts/reader-case/run-pipeline.sh <バッチ名の頭>
```

- 読んで確認した動き（実行はしていない）: 分析（Codex）→ 統合（`merge-analysis.ts`）→ 長さの検査 → 監査 → 画像の検査 → 選別（`select-finished.ts`）→ 画像の R2 保存（`upload-media-assets.ts`）→ **公開用の作業場所を作って PR を出し、テストとレビュー指摘を待ってマージ → `pnpm deploy:workers` → 本番の件数と画像を読み戻す**。
- つまり**このスクリプトは本番反映まで自動で進む**。`PIPELINE_NO_PUBLISH=1` を付けない限り、実行した時点で公開に至り得る。オーナー確認の運用と合わせる（2026-09-30 以降は PR・マージ・デプロイ・R2 書き込みは包括許可。削除と課金は確認）。
- 止まる条件と通知: どこかで失敗すると「停止: 理由」を出して終了し、Mac の通知を出す。例: 分析が終わっていない束がある、監査が終わっていない、仕上げ済みが減る、公開データの件数が仕上げ済みと合わない、テストが通らない、レビュー指摘が残っている、本番の件数が合わない、本番で画像が出ない事例がある。
- 再開: **同じコマンドをもう一度実行する**。分析（`run-analyze.sh`）と監査（`run-audit.sh`）は、出力が既にある束を飛ばして続きから回る（スクリプト内のコメントと `skip` の挙動を確認）。やり直したい束は `bash scripts/reader-case/run-analyze.sh --force`。
- 監査の入力名は、秒とプロセス番号まで入れて同じ分の実行でも衝突しない（スクリプト内の説明。直近のコミット `c6fc6d7a`）。

### 2-2. R2 への取り込み（収集の保存）

| 目的 | コマンド | 備考 |
|---|---|---|
| 調査バンドルの検査だけ | `node --import tsx scripts/foundation-collect.ts audit INPUT.json RECEIPT.json` | モード: `requirements` / `audit` / `prepare` / `ingest` / `ingest-complete`。`FOUNDATION_REPO`（UF のクローン）が必須 |
| R2 へ保存 | `pnpm foundation:r2 INPUT.json RECEIPT.json`（= 鍵注入 + `foundation-collect.ts ingest`） | create-only。**同じ入力の再実行は、同一内容なら変更なしで終わる**（`R2_100_YEAR_OPERATIONS.md`）。別内容の同じキーは衝突として止まる。書き込みになるので `write_authorized` の運用に従う |
| journal の準備と保存 | `pnpm foundation:journal:prepare` / `pnpm foundation:journal:ingest` | `scripts/foundation-journal.ts prepare\|ingest REQUEST.json RECEIPT.json` |
| ローカルにだけ溜まった分を R2 へ | `node scripts/with-r2-keychain-secrets.mjs node --import tsx scripts/reaudit/replay-local-mirror.ts --dry-run`（まず確認）→ 付けずに本実行 | 対象は `foundation-raw` と `foundation-lake` だけ。既にあるキーは CONFLICT として報告し、上書きしない |
| 予定された受け渡し（UF の queue）の展開 | `pnpm r2:queue:materialize INPUT.json OUTPUT.json` | 展開と検査まで |
| 保存後の読み戻し・復元の検証 | `pnpm r2:100-year:restore RECEIPT.json /path/to/new-dir`、`pnpm r2:100-year:audit` | 読み取り。書き込みなし |

- 「保存した」は読み戻して bytes と SHA-256 が一致するまで言わない（R2 の4鉄則）。
- 古い `make-money-r2-writer`（Cron なし・`FOUNDATION_R2_WRITER_ENABLED=false`）は**有効にしない**。Publisher と二重に書く（`docs/R2_SCHEDULED_WRITER_RUNBOOK.md`、`wrangler.r2-writer.jsonc` の `crons: []`）。

## 3. 公開の順番と戻し方（catalog:prepare → publish → deploy）

### 3-1. 順番

`package.json` と `scripts/` を読んで確認した定義:

| コマンド | 中身 |
|---|---|
| `pnpm catalog:check` | `prepare-catalog-release.ts --check`。書き込みなしで、公開版が作れるか・食い違いがないかを検査 |
| `pnpm catalog:screen-check` | 画面に出さない言い回しの検査 |
| `pnpm catalog:prepare` | `data/catalog-release.json` と `.catalog-release/*.json.gz`（不変のオブジェクト）を作る。事前に「3件以上で使い回された作文」を検査し、あれば失敗 |
| `pnpm catalog:publish` | `screen-check` → `prepare` → `publish-catalog-release.ts`（R2 `foundation-lake` の `views/make-money/catalog-v1/objects/…` と `dossier-v1/objects/…` へ **create-only** で書き、読み戻して一致を確認） |
| `pnpm deploy:workers` | `deploy:preflight` → `db:migrate:remote` → `catalog:publish` → `workers:build` → `opennextjs-cloudflare deploy` |

- **公開版の R2 保存 → デプロイ、の順**が正しい。コードが指す公開版のオブジェクトが先に R2 にある必要がある。逆にすると `/api/health` の `catalog` が `ng`、画面は「目録を読み込めません」になる（`CatalogUnavailableError`。見本データには落とさない設計）。
- `deploy:workers` は D1 の migration も本番に適用する（`db:migrate:remote`）。公開版の更新だけのつもりでも、未適用の migration があれば一緒に適用される。デプロイ前に `pnpm exec wrangler d1 migrations list APP_DB --remote`（読み取り）で未適用を確認する習慣にする（**未実行**）。
- デプロイの前提は `deploy:preflight`（Firebase 公開設定・wrangler の本番識別・APP_DB と APP_R2 の ID 検査。実行済み: Firebase の環境変数が無い手元では「必要」と失敗する。これは設計どおり）。
- 本番への反映が済んだかは、`/api/health` の `release`（要約ハッシュの先頭12文字）と手元の `data/catalog-release.json` の `summaries.hash` が一致するかで確認できる（`check-freshness.mjs --site-url`）。

### 3-2. 戻し方

- 公開版は不変で、**コード側が1つのハッシュ（`data/catalog-release.json`）を固定して指す**（`docs/architecture/STORAGE.md`「The manifest is pinned in the deployed code」）。古い版のオブジェクトは R2 に残る。したがって、戻す = **前の `data/catalog-release.json`（と仕上げ済み一覧）に戻して、再デプロイ**。
  1. 戻したい時点のコミットを `git log -- data/catalog-release.json` で探す。
  2. その版の `data/catalog-release.json` と `data/catalog-finished-ids.txt` を、取り消しの変更（PR）として main に入れる（履歴を書き換えない。`git reset` や強制 push はしない）。
  3. `pnpm deploy:workers`（古い版のオブジェクトは既に R2 にあるので、`catalog:publish` は「既に同一内容」で通る。**未確認**: 古い版の `.catalog-release/` が手元に無い場合、`catalog:prepare` がその内容を再生成できるか。再生成は `data/entities-index.json` の同じ版が前提）。
  4. `/api/health` の `release` が戻した版になること、`/api/catalog` の `total` を確認。
- 緊急に出ている内容を引っ込めたい（誤情報・権利）場合: 該当の ID を `data/catalog-finished-ids.txt` から外し、同じ手順で公開版を作り直して再デプロイすれば、一覧・詳細・API・メールのすべてから消える（門が1つのため）。緊急の削除依頼の窓口は `legal/contact` 側。
- Cloudflare の Workers のバージョンを直接ロールバックするコマンド（`wrangler rollback` など）の挙動と OpenNext との相性は**未確認**。使う場合は先に公式ドキュメントで確認する。
- D1 の migration は戻せない前提（加算のみ）。戻す必要が出たら `BACKUP_AND_RESTORE.md`。

## 4. 画面に出す事例を絞る制御の場所（20件限定を含む）

台帳（オーナー指示の集約、2026-10-06）には「通常 UI は確認した20件だけ。残りは元データを残して非表示」とある。**このコードベースで確認できたこと:**

- 画面・API が出してよい事例の門は、`src/shared/catalog-membership.ts` の1か所。判定の元は `data/catalog-release.json` の `details`（事例 ID → 詳細ハッシュ）。一覧（`/api/catalog`）、詳細（`/api/businesses`）、メディア（`/api/media`）、`?entity=`、通知メール（`src/lib/notifications/digest-runtime.ts`）がこれを通る。
- `details` に入れる対象を決めるのは `data/catalog-finished-ids.txt`（`scripts/reader-case/select-finished.ts` が書く「仕上げ済み」）。さらに `scripts/prepare-catalog-release.ts` が、スキーマ・事実の数・照合の有無で落とす（`HOLD_*` のスタンプ）。
- この作業フォルダ（main）の現在の公開件数: `publishedCount` = **323**（`details` も 323 件、元の件数は 3341。`data/catalog-finished-ids.txt` は見出し1行 + 323 件）。**「20件」という数字を持つ専用の定数・設定は、コード検索では見つからなかった**。20件限定が別のブランチ・別の作業場所の設定なのか、台帳の決定が main に未反映なのかは**未確認**。公開前に、どの数が本番の意図かを決めて、`catalog-finished-ids.txt` を意図した件数にそろえること（絞る場所は、ここだけでよい）。
- 絞り方の手順: ① `data/catalog-finished-ids.txt` を意図した ID だけにする → ② `pnpm catalog:check` → ③ `pnpm catalog:prepare` → ④ 件数が一致することを確認（`run-pipeline.sh` も「公開データの件数が仕上げ済みと合う」ことを検査している）→ ⑤ `pnpm deploy:workers` → ⑥ 本番の `total` を確認。
- 非公開の事例を「詳細への直接アクセス」でも出さないことは `e2e/catalog-only.spec.ts` が検査している（事例が公開目録に無ければ 404）。

## 5. 公開後に毎日・毎週やること

| 頻度 | やること | 手段 |
|---|---|---|
| 毎日 | 死活（外部監視の通知を見る）。journal の鮮度 | `MONITORING.md` |
| 毎日 | D1 のバックアップ（手動で始める） | `BACKUP_AND_RESTORE.md` 3 章 |
| 新しい公開版を出した時 | 本番の `release` の一致、`total`、画像、実在の事例を1件開いて「強い一行・事実と推論の区別・画像・作業の言葉が出ていない」を目で確認（`docs/OWNER_INTENT.md` 12 章） | `check-freshness.mjs --site-url`、ブラウザ |
| 毎週 | 通知メールの結果（GitHub Actions の `Notify digest` の成否、Resend の失敗）。Stripe の Webhook 失敗 | `MONITORING.md` 2・6 章 |
| 毎週 | R2 の件数と受領記録の突き合わせ | `pnpm foundation:audit`（鍵が要る） |
| 毎月 | D1 の容量、Observability のエラー率の推移 | `MONITORING.md` 4・5 章 |
| 四半期 | 復旧テスト（D1・R2） | `BACKUP_AND_RESTORE.md` 5 章 |

OWNER_INTENT 12 章の完成の測り方は「R2 に入り、本番の画面に出たか」。報告は「マージ」「デプロイ」「R2 のデータ」を分けて書く。

## 6. 定期実行を有効にする前の条件（勝手に有効にしない）

現状（確認した事実）:

- このリポジトリで `schedule:` を持つ GitHub Actions は `.github/workflows/notify-digest.yml`（日本時間 9:10 / 15:10 / 21:10。Secret と変数が無ければ何も送らず成功で終わる）だけ。他は PR・手動。
- `wrangler.r2-writer.jsonc` の `crons` は空、`FOUNDATION_R2_WRITER_ENABLED` は `false`。
- このアプリの Worker（`wrangler.jsonc`）には Cron Trigger が無い。
- 収集・仕上げ（reader-case）・D1 バックアップ・鮮度確認は、**どれも人（または Claude）が手で起動する**。

新しく定期実行（GitHub Actions の `schedule`、Cloudflare の Cron Trigger、Mac の launchd/cron など）を有効にする前の条件:

1. **オーナーが明示的に承認する**（このドキュメントや提案を理由に、勝手に有効化しない。台帳にも「新規の定期実行・GitHub Actions・本番デプロイは勝手にしない」とある）。
2. 手動で同じ処理を**少なくとも1回、最後まで成功**させ、結果（件数・読み戻し・本番画面）を記録している。
3. **二重実行しても壊れない**: create-only・冪等・排他（`concurrency` 設定など）を確認している。Publisher と古い Writer の二重書きは禁止。
4. **止まった時に気づける**: 失敗が通知される（メール・Mac の通知など）。成功したように見える「何もしない成功」（Secret 未設定で終わるなど）が無い。
5. **費用と上限**: 従量課金（API）を使わない（Claude Code の月額枠・Codex の契約内のみ）。実行頻度とコスト・レート制限（外部サイトへの接続は迷惑・BAN が無いように）を見積もっている。
6. **書き込み先と権限が最小**: 読み取り専用の確認（`check-freshness.mjs`）と、書き込み（R2・デプロイ）を分ける。書き込み系の定期実行は、読み取り系を先に1か月運用してから検討する。
7. **止め方が決まっている**: スケジュールを無効にする手順（ファイルの `schedule` を消す・Variables を外す）と、実行中のものを止める手順を書いている。メンテナンスモードとの関係も決めている（`MAINTENANCE_MODE.md`）。
8. 公開データを自動で本番へ出す場合は、**自動の品質門**（`run-pipeline.sh` の「仕上げ済みが減ったら止める」「件数が合わなければ止める」「本番で画像が出なければ失敗」）を通ること。

## 7. 未確認・未解決のまとめ

- UF 側の Publisher が本番で動いているか・最後に動いた時刻（本番・別リポジトリ）。
- 本番 R2 の journal 件数・最新時刻（`check-freshness.mjs` は未実行）。
- 20件限定の実装場所（コードに専用の定数は見つからなかった。台帳との食い違い）。
- `wrangler rollback` を使った戻し方。古い公開版を再生成できるか。
- 収集後の画面反映（収集 → 公開版への自動連結）は、現状「手で `run-pipeline.sh` を回す」で、**自動では繋がっていない**。`AUTO_PUBLISH_TO_UI.md` が言う自動経路（Publisher → `views/make-money/v1/entities/` → `/api/businesses`）は R2 の view を読む別経路で、公開版（`catalog-v1`）の門を通らない事例は一覧・詳細に出ない（現行のコードでは `catalog-membership` が先に絞る）。この2つの関係は、公開前に設計として確定する必要がある。
