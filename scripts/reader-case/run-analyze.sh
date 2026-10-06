#!/usr/bin/env bash
# data/analyze/batches/batch-NNN.json の分析を Claude サブエージェントに任せる契約（reader.analysis の元）。
# このスクリプトは LLM を呼ばない。届いた結果を機械検査して受理し、未処理の束の指示書を data/runner/instructions/analyze/ に書く。
# 指示書の実行はオーケストレーター（Claude Code の Agent ツール）が行い、結果を data/runner/inbox/analyze/ に置いてから、もう一度これを実行する。
# 使い方: bash scripts/reader-case/run-analyze.sh [--force]   終了コード: 0=全部受理済み / 75=サブエージェント待ち / 76=保留のみ残る
# 環境変数: ANALYZE_PREFIX=束の名前の頭（例 batch-x1-）  RUNNER_MAX_ATTEMPTS=再試行の上限（既定3）
set -u
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"; cd "$ROOT" || exit 1
args=(); [ "${1:-}" = "--force" ] && args+=(--force)
[ -n "${ANALYZE_PREFIX:-}" ] && args+=(--prefix "$ANALYZE_PREFIX")
[ -n "${RUNNER_MAX_ATTEMPTS:-}" ] && args+=(--max-attempts "$RUNNER_MAX_ATTEMPTS")
exec node --import tsx scripts/reader-case/runner/cli.ts step analyze ${args[@]+"${args[@]}"}
