#!/usr/bin/env bash
# 予約タスク・launchd から呼ぶ1本。固定の作業場所でメインの最新を取り込み、証拠を写してから pnpm daily:run を流す。
# 使い方: bash scripts/daily/run-daily-run.sh [daily:run の引数]   環境変数: DAILY_WORKDIR（既定 /Volumes/SS/Worktrees/Make-Money/daily-run）
#   DAILY_EVIDENCE_SRC（監査の証拠の元。既定 /Volumes/SS/Worktrees/Make-Money/honest-catalog）
set -u -o pipefail
WORK="${DAILY_WORKDIR:-/Volumes/SS/Worktrees/Make-Money/daily-run}"
SRC="${DAILY_EVIDENCE_SRC:-/Volumes/SS/Worktrees/Make-Money/honest-catalog}"
[ -d "$WORK/.git" ] || [ -f "$WORK/.git" ] || { echo "作業場所が無い: $WORK（docs/pipeline/DAILY_RUN.md の準備を先に行う）" >&2; exit 2; }
cd "$WORK" || exit 2
git fetch origin main || { echo "git fetch に失敗" >&2; exit 1; }
# 前回の公開データは daily:run が auto/daily-<日付> に残して変更の申請にする。手元に残る分はコミット済みなので、通常の merge で取り込む
if ! git merge --no-edit origin/main; then
  git merge --abort 2>/dev/null
  osascript -e 'display notification "メインの最新を取り込めない（手元の公開データと食い違い）" with title "Make-Money 毎日の自動実行"' >/dev/null 2>&1 || true
  echo "メインの最新を取り込めない。作業場所 $WORK の状態を確認する（手元の変更が申請に入っているか）" >&2; exit 1
fi
pnpm install --frozen-lockfile --prefer-offline >/dev/null || { echo "pnpm install に失敗" >&2; exit 1; }
# 監査の証拠は gitignore なので、元から足りない分だけ写す（既にあるものは上書きしない）
for d in data/source-cache data/media-staging; do [ -d "$SRC/$d" ] && mkdir -p "$d" && rsync -a --ignore-existing "$SRC/$d/" "$d/"; done
exec pnpm daily:run "$@"
