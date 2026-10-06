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
