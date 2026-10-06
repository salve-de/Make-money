#!/usr/bin/env bash
# data/audit/in-NNN.json の監査を Claude サブエージェントに任せる契約。LLM は呼ばない（受理検査と指示書の生成だけ）。
# 指示書: data/runner/instructions/audit/、結果の書き先: data/runner/inbox/audit/out-NNN.json。実行はオーケストレーターが行う。
# 使い方: bash scripts/reader-case/run-audit.sh [--force]   AUDIT_ONLY=92* のように番号の頭で絞れる
# 終了コード: 0=全部受理済み / 75=サブエージェント待ち / 76=保留のみ残る。環境変数 AUDIT_PROMPT は未対応（指示本体は audit-prompt.md 固定）
set -u
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"; cd "$ROOT" || exit 1
args=(); [ "${1:-}" = "--force" ] && args+=(--force)
[ -n "${AUDIT_ONLY:-}" ] && args+=(--prefix "$AUDIT_ONLY")
[ -n "${RUNNER_MAX_ATTEMPTS:-}" ] && args+=(--max-attempts "$RUNNER_MAX_ATTEMPTS")
exec node --import tsx scripts/reader-case/runner/cli.ts step audit ${args[@]+"${args[@]}"}
