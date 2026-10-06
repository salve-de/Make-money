# 実行層（Claude サブエージェント）の契約

分析・監査・照合の LLM 工程は、外部の LLM サービスに資料を送らず、Claude Code のサブエージェントだけで行う。
`scripts/reader-case/run-analyze.sh` / `run-audit.sh` / `run-verify.sh` は LLM を呼ばない。束ファイルの管理と結果の機械検査だけを行う（実体は `scripts/reader-case/runner/`）。

## 流れ
1. 束ファイル（`data/analyze/batches/*.json`、`data/audit/in-*.json`、`data/verify/batches/*.json`）を読む。
2. 未処理の束ごとに指示書 `data/runner/instructions/<段>/<束>.md` を生成する（指示本体は各 `*-prompt.md`。前回の拒否理由があれば入る）。
3. オーケストレーター（Claude Code の Agent ツール）が指示書ごとにサブエージェントを起動する。サブエージェントは結果 JSON を `data/runner/inbox/<段>/<出力名>.json` に書く。
4. もう一度 `run-*.sh` を実行すると、inbox の結果を検査する。通れば out（分析 `data/analyze/out/`、監査 `data/audit/out-*.json`、照合 `data/verify/out/`）へ確定し、通らなければ拒否理由を `data/runner/state/` に残して再試行（指示書に理由を載せて出し直す）。試行上限（既定3回、`RUNNER_MAX_ATTEMPTS`）で保留（HOLD）にする。

## 受理検査（拒否理由の code）
- NOT_JSON: JSON として読めない（コードフェンスや前置きは許容）。
- COUNT_SHORT / UNKNOWN_ENTITY / DUPLICATE_CASE: 入力の全事例（照合は全 claim）に1件ずつ返っていない。
- UNKNOWN_EVIDENCE_ID: 分析の根拠 id が入力の facts / metrics に無い。
- UNKNOWN_ANALYSIS_ID: 監査の analysisId が入力の analysis に無い。
- UNKNOWN_CLAIM / QUOTE_NOT_IN_SOURCE: 照合の claim が入力に無い、または quote が出典本文の文字どおりの抜き出しでない。
- BAD_ITEM / WRONG_SHAPE: 項目名・confidence・severity・kind などが定義外、必須欄の欠け。

## 終了コード（run-*.sh と cli.ts step）
0 = 全束が受理済み／75 = サブエージェント待ち（指示書の場所を表示）／76 = 保留のみ残る（人の判断が要る）。
`run-pipeline.sh` は 75/76 の時に理由を表示して止まり、結果が揃ってから再実行すると受理済みの束から先へ進む。監査は待ちで止まった時の TAG を `data/pipeline/<prefix>.audit-tag` に残し、再実行で同じ入力を続ける。

## 命令
`node --import tsx scripts/reader-case/runner/cli.ts <step|status|accept|plan|release> <analyze|audit|verify> [--prefix X] [--force] [--dry-run] [--max-attempts N] [--json]`
- `--dry-run`: 何も書かず判定だけ。`--force`: 既存 out を `.bak-<時刻>` に退避して全束をやり直す。`release`: 保留を解除。
- 単体テスト: `pnpm test:runner`（fixture は `scripts/reader-case/runner/__fixtures__/`）。

## 範囲外（別タスク）
入力指紋による skip（結果ファイルの有無に依らない再実行判定）、状態台帳、出典の全文取り込み、リード基準は別ブランチで扱う。ここでの「受理済み」は「今の束に対して受理基準を満たす out がある」ことだけを指す。
