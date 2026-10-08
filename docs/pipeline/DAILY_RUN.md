# 定期実行（毎日1回のローカル生成）

`scripts/reader-case/run-daily.sh` は、束（`data/analyze/batches/`）の接頭辞ごとに `run-pipeline.sh` を `PIPELINE_NO_PUBLISH=1` で走らせる。
上限は「選別と公開版の計画（`prepare-catalog-release --dry-run`）まで」。次は含まない: 画像の保存（R2 書き込み）、main への変更申請・マージ、本番反映、課金、LLM の API 呼び出し。
launchd などの登録は人が行う（この変更では登録も有効化もしていない。新しい cron / GitHub Actions も作っていない）。

## 何をするか
1. ロックを取る（`data/pipeline/daily/lock`）。別の実行が動いていれば何もせず正常終了。持ち主の pid が無い・別のプロセスに使い回された古いロックは回収して続ける。
2. 対象の接頭辞を決める（`--prefix` 指定、無ければ束の名前から自動）。前回 DONE で束の中身が同じ接頭辞は飛ばす（SKIPPED_SAME_INPUT）。1回に扱うのは `DAILY_MAX_PREFIXES`（既定3）まで。
3. 接頭辞ごとに `run-pipeline.sh` を実行。1接頭辞の制限時間は `DAILY_MAX_MINUTES`（既定180、秒指定は `DAILY_MAX_SECONDS`）。
4. 結果を3か所に残す: `data/pipeline/daily/state.json`（接頭辞ごとの現在の状態）、`data/pipeline/daily/runs.jsonl`（履歴）、状態台帳（`pnpm pipeline:status` の `_run:<接頭辞>`）。ログは `data/pipeline/daily/logs/`（60日分）。

## 結果と終了コード
| 状態 | 意味 | 終了コード | 次にすること |
|---|---|---|---|
| DONE | 選別と公開版の計画まで完了 | 0 | 公開は人の承認後に別の命令（`run-pipeline.sh` を `PIPELINE_NO_PUBLISH` なしで） |
| WAITING_AGENT | サブエージェントの結果待ち。指示書を出した | 0 | 下記「指示書の実行」。置いたら次回（または手で）再実行 |
| HOLD | 試行上限で保留（人の判断待ち）。Mac に通知 | 0 | 理由は台帳と `data/runner/state/`。直して `runner/cli.ts release` |
| FAILED | 失敗・時間切れ・中断。Mac に通知 | 1 | ログを見る。次回は続きから再開する |
| 二重起動 / 変化なし | 何もしない | 0 | なし |

## 指示書の実行（月次枠の範囲）
定期実行は LLM を呼ばない（API 課金なし）。サブエージェントが要る所は `data/runner/instructions/<段>/<束>.md` を出して終わる。
人が Claude Code のセッションを開き、指示書ごとに Agent ツールでサブエージェントを実行して、結果を `data/runner/inbox/<段>/` に置く（契約は `CLAUDE_RUNNER.md`）。
置き終わったら `bash scripts/reader-case/run-daily.sh` を手で実行するか、翌日の定期実行を待つ。受理済みの束から先へ進む。
自動で `claude -p` などを定期起動する設定は、利用規約上の扱いを確かめるまで入れていない。

## 手で動かす
```
bash scripts/reader-case/run-daily.sh --dry-run          # 何を走らせるかだけ表示（何も書かない）
bash scripts/reader-case/run-daily.sh                    # 1回実行
bash scripts/reader-case/run-daily.sh --prefix batch-x1- # 接頭辞を指定
bash scripts/reader-case/run-daily.sh --force            # 前回完了と同じ入力でもやり直す
pnpm pipeline:status                                     # 止まっている事例と理由
```

## launchd に登録する手順（人が行う。この変更では未実施）
1. ひな形をコピーして置き換える:
   ```
   sed -e "s#__REPO__#$(pwd)#g" -e "s#__NODE_BIN_DIR__#$(dirname "$(command -v node)")#g" \
     docs/pipeline/launchd/com.make-money.pipeline-daily.plist.template > ~/Library/LaunchAgents/com.make-money.pipeline-daily.plist
   plutil -lint ~/Library/LaunchAgents/com.make-money.pipeline-daily.plist
   ```
2. 登録: `launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.make-money.pipeline-daily.plist`
3. 今すぐ1回試す: `launchctl kickstart gui/$(id -u)/com.make-money.pipeline-daily`
4. 止める・外す: `launchctl bootout gui/$(id -u)/com.make-money.pipeline-daily`
注意: `__REPO__` は公開用ではなく、`data/entities-index.json` などの手元データがある作業場所にする。Mac が眠っている間は動かず、起きたあとに1回動く。

## 検査
`pnpm test:runner` の `scripts/reader-case/runner/daily.test.ts` が、fixture と本物の runner・台帳で次を確かめる: 待ち→再開、同一入力で変化0、入力1件変更で1束だけやり直し、不正・不足な結果の保留と解除、二重起動、kill 後の古いロック回収と再開、時間切れ、公開系の命令が含まれないこと。

---

# 毎日の自動運転（pnpm daily:run）

候補探し → 調査 → 仕上げて公開 → 本番の確認 → 結果の記録、を1本で回す。本体は `scripts/daily/daily-run.ts`。上の `run-daily.sh`（束の選別と計画までのローカル生成）とは別物で、公開まで行う。AI は今のサブスクの Codex / Claude Code の CLI だけを使い、有料の鍵は使わない。

## 流れ
1. 見張り: 最後に成功した日が2日より前なら「止まっていた」と知らせる(知らせるだけ。今回の実行が成功すればそれが新しい基準になる。公開なしの試しは成功に数えない)。
2. `pnpm case:discover --count 10` → `pnpm case:research --next 5`（別の枝 feat/case-discover-research-20261008 の呼び出し。`package.json` に無い間は飛ばす）。新しい事例のIDは、標準出力の `DAILY_IDS=a,b` の行か、環境変数 `DAILY_IDS_FILE` のファイル（1行に1つ）で返してもらう。`--ids a,b` でも渡せる。
3. 1日の上限（既定3件、`--cap`）まで `pnpm case:run --ids …` で仕上げる。通った事例だけ、公開の直前に `prepare-catalog-release --dry-run` で取り下げの判定を見る。1件でも出たら公開せず知らせる（取り下げは自動でしない）。問題が無ければ `case:run --from publish --publish`。
3b. 公開できた日は、手元の公開データ(目録・画面の文)を `auto/daily-<日付>` に commit・push して変更の申請にする(次の日にメインを取り込んでも食い違わないため)。公開データは作ったが公開できなかった事例(`pending`)と、上限を超えた分(`deferred`)は、翌日の起動に引き継ぐ。
4. 本番の確認（読むだけ。公開した日は本番の目印のキャッシュ(最大3分)に合わせて最大約3分半、追いつくまで待つ）: `/api/catalog` の総数・世代ごとの件数が公開した版と合うか、`/api/health` の版の目印、公開した事例の画面の文、`check-freshness`（Keychain に鍵が無い(終了コード78)時だけ「確認できず」と記録して飛ばす。鍵はあるのに R2 に繋げない(2)時は異常）。
5. `data/pipeline/daily/<日付>.json` に1日1ファイル（探した・調べた・通った・公開した・落ちた件数と理由、かかった時間、本番の確認）。公開なしの試しは `<日付>.dry-run.json`。この置き場(`data/pipeline/daily/`)は作業場所ごとの運用記録なので gitignore（コミットしない）。

## 再開・二重起動・知らせ
- 途中で止まった日は、次の起動で今日の終えた段を飛ばして続きから進む（`--force` でやり直し）。二重起動は `data/pipeline/daily/daily-run.lock` で防ぐ。
- 異常（失敗・止まり・取り下げの判定・本番の不一致）の時だけ、Mac の通知と GitHub の issue「毎日の自動実行で異常: 日付・理由」。同じ理由が開いていればコメントを足す。正常な日は何も出さない。

## 予約タスク・launchd から呼ぶ1行
```
bash /Volumes/SS/Worktrees/Make-Money/daily-run/scripts/daily/run-daily-run.sh
```
公開なしで試す時は末尾に `--dry-run`。

## 前提
- 作業場所: `/Volumes/SS/Worktrees/Make-Money/daily-run`（毎回、メインの最新を `git merge` で取り込む固定の1か所。公開データはコミット済みで残るので、取り込めない時(食い違い)は merge を中止して Mac の通知で知らせる）。最初の1回: `git worktree add -b daily-run /Volumes/SS/Worktrees/Make-Money/daily-run origin/main`。
- 監査の証拠（gitignore の `data/source-cache` `data/media-staging`）は、ラッパーが `DAILY_EVIDENCE_SRC`（既定 honest-catalog の作業場所）から足りない分だけ写す。証拠が無いと公開中の事例が全部「取り下げ」と判定されるので、写っていることが前提（#204 の取り込みも前提）。
- 電源とログイン: Mac が起きていて、ユーザーがログイン中。眠っていた場合は起きた後に1回動く。`gh` にログイン済み、`claude` / `codex` の CLI にログイン済み、R2 の鍵は Keychain（無ければ鮮度の確認だけ飛ばす）。
- launchd: `scripts/launchd/com.make-money.daily-run.plist.template`。組み込み（launchctl）は、オーナーが決めてから行う。まだ入れていない。

## 検査
`pnpm test:daily`（偽の呼び出しで通し）が次を確かめる: 正常な日は知らせなし／失敗で issue（同じ理由はコメント）／2日止まりで見張り／取り下げの判定で公開が止まる／上限3件／途中再開／本番の不一致／公開なしでは公開の命令を呼ばない。
