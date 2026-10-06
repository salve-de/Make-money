#!/usr/bin/env bash
# data/verify/batches/batch-NNN.json の照合を Claude サブエージェントに任せる契約。LLM は呼ばない（受理検査と指示書の生成だけ）。
# 指示書: data/runner/instructions/verify/、結果の書き先: data/runner/inbox/verify/batch-NNN.json。実行はオーケストレーターが行う。
# 使い方: bash scripts/reader-case/run-verify.sh [--force]   終了コード: 0=全部受理済み / 75=サブエージェント待ち / 76=保留のみ残る
set -u
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"; cd "$ROOT" || exit 1
args=(); [ "${1:-}" = "--force" ] && args+=(--force)
[ -n "${VERIFY_PREFIX:-}" ] && args+=(--prefix "$VERIFY_PREFIX")
[ -n "${RUNNER_MAX_ATTEMPTS:-}" ] && args+=(--max-attempts "$RUNNER_MAX_ATTEMPTS")
exec node --import tsx scripts/reader-case/runner/cli.ts step verify ${args[@]+"${args[@]}"}
