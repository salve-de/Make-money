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
- UNKNOWN_ANALYSIS_ID: 監査の analysisId が入力の analysis に無い（ケース単位の指摘 `__case__` は例外で受理。BLOCK か LOW のみ）。
- UNKNOWN_CLAIM / QUOTE_NOT_IN_SOURCE: 照合の claim が入力に無い、または quote が出典本文の文字どおりの抜き出しでない。長い出典は同じ sourceId の複数チャンクになるので、quote は**どのチャンクにあっても**通す。
- BAD_ITEM / WRONG_SHAPE: 項目名・presentation（FACT_SUMMARY|ESTIMATE。ESTIMATE は formula 必須）・severity・kind（HEADLINE の書き直しを含む）などが定義外、必須欄の欠け。
- 分析は、書ける項目が無い事例の items 空を受理する。confidence（確度ラベル）は廃止で、要求も検査もしない（analyze-prompt.md と同じ）。

## 終了コード（run-*.sh と cli.ts step）
0 = 全束が受理済み／75 = サブエージェント待ち（指示書の場所を表示）／76 = 保留のみ残る（人の判断が要る）。
`run-pipeline.sh` は 75/76 の時に理由を表示して止まり、結果が揃ってから再実行すると受理済みの束から先へ進む。監査は待ちで止まった時の TAG を `data/pipeline/<prefix>.audit-tag` に残し、再実行で同じ入力を続ける。

## 命令
`node --import tsx scripts/reader-case/runner/cli.ts <step|status|accept|plan|release> <analyze|audit|verify> [--prefix X] [--force] [--dry-run] [--max-attempts N] [--json]`
- `--dry-run`: 何も書かず判定だけ。`--force`: 既存 out を `.bak-<時刻>` に退避して全束をやり直す。`release`: 保留を解除。
- 単体テスト: `pnpm test:runner`（fixture は `scripts/reader-case/runner/__fixtures__/`）。

## 完了判定（入力指紋＋規則版）
束が完了（DONE）なのは、次の3つがすべて揃う時だけ。出力ファイルがあるだけでは完了にしない。
1. 受理時に `data/runner/state/<段>/<束>.json` の `done` に残した **入力指紋**（束ファイルの中身のハッシュ）が、今の束と一致する。
2. 同じく残した **規則版** が今と一致する。規則版 = その段の指示書（`*-prompt.md` の全文）と結果の形の定義のハッシュ。プロンプトを1文字でも変えると版が変わる。
3. out が今の受理検査を満たす。

入力か規則版が変わると、束は再処理（WAITING）になり、試行回数・保留も白紙に戻る（旧い指示で保留になった束も、指示書を直せばやり直せる）。指紋の記録が無い旧い out も再処理になる（旧い指示で作られたものかを判別できないため）。再受理で上書きする時、旧い out は `.bak-<時刻>` に退避する。

## 状態台帳との接続（`data/pipeline/ledger/`）
実行層が事例ごとに台帳へ書く（段階は ANALYZE / AUDIT / VERIFY）。
- 受理: `DONE`（inputHash は事例の入力 JSON のハッシュ、ruleVersion は上の規則版）。
- 同じ入力・同じ規則で飛ばした: `SKIPPED_SAME_INPUT`。事例ごとの最新が同じ指紋なら足さない（再実行で記録が増えない）。
- 試行上限で保留: `HOLD`（理由コード ANALYSIS_REJECTED / AUDIT_REJECTED / VERIFY_UNRESOLVED と、拒否理由の上位3件）。後で受理されると DONE が最新になり、止まっている一覧から外れる。

## 範囲外（別タスク）
出典の全文取り込み、リード基準、取り込み経路（`import-case-rebuild.ts`）の台帳は別ブランチで扱う。
