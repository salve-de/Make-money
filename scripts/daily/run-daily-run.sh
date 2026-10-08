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
# 公開できずに残った手元の変更(公開データ)は、取り込む前にコミットして失わない・merge を邪魔させない
if [ -n "$(git status --porcelain data)" ]; then
  git add data && git commit -q -m "毎日の自動実行: 公開待ちの手元の公開データを退避" || { echo "手元の公開データをコミットできない" >&2; exit 1; }
fi
# 前回の公開データは daily:run が auto/daily-<日付> に残して変更の申請にする。手元に残る分はコミット済みなので、通常の merge で取り込む
if ! git merge --no-edit origin/main; then
  git merge --abort 2>/dev/null
  osascript -e 'display notification "メインの最新を取り込めない（手元の公開データと食い違い）" with title "Make-Money 毎日の自動実行"' >/dev/null 2>&1 || true
  echo "メインの最新を取り込めない。作業場所 $WORK の状態を確認する（手元の変更が申請に入っているか）" >&2; exit 1
fi
pnpm install --frozen-lockfile --prefer-offline >/dev/null || { echo "pnpm install に失敗" >&2; exit 1; }
# 監査の証拠は gitignore なので、元から足りない分と、元の方が新しい分を写す（判定の記録は追記で変わるため、新しい方を残す）
for d in data/source-cache data/media-staging; do
  if [ -d "$SRC/$d" ]; then
    mkdir -p "$d" && rsync -a --update "$SRC/$d/" "$d/" || { echo "証拠の同期に失敗: $d" >&2; exit 1; }
  elif [ ! -d "$d" ]; then
    echo "監査の証拠が無い: $SRC/$d も $WORK/$d も見つからない（DAILY_EVIDENCE_SRC を確認）。証拠なしでは公開中の事例が全部取り下げ扱いになるので止める" >&2; exit 2
  fi
done
exec pnpm daily:run "$@"
