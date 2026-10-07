#!/usr/bin/env bash
# 毎日1回の定期実行（launchd などから呼ぶ。手で実行してもよい）。ローカル生成までが上限で、公開側には何も出さない。
#   束（data/analyze/batches）の接頭辞ごとに run-pipeline.sh を PIPELINE_NO_PUBLISH=1 で走らせる（選別と公開版の計画まで）。
#   画像保存（R2）・main への変更申請・マージ・本番反映・課金は、この命令には含まない（run-pipeline.sh の 4b 以降は到達しない）。
#   LLM は呼ばない。サブエージェントの結果が要る所は指示書（data/runner/instructions/）を出して正常終了し、
#   結果が置かれたあとの次回の実行が受理済みの束から続きを進める（月次枠の Claude Code セッションで指示書を実行する）。
# 使い方: bash scripts/reader-case/run-daily.sh [--prefix batch-x1-]... [--force] [--dry-run]
#   --prefix 省略時は data/analyze/batches の名前から自動で決める（前回完了と入力が同じ接頭辞は飛ばす）
# 環境変数: DAILY_MAX_PREFIXES(既定3: 1回の実行で扱う接頭辞の上限) DAILY_MAX_MINUTES(既定180: 1接頭辞の制限時間。秒で指定する DAILY_MAX_SECONDS が優先)
#           DAILY_NOTIFY=0 で Mac の通知を止める  DAILY_PIPELINE_SCRIPT=差し替え（検査用。既定は scripts/reader-case/run-pipeline.sh）
# 終了コード: 0=完了・待ち・保留・二重起動で飛ばした・変化なし（想定内）／1=失敗（ログと台帳 pnpm pipeline:status を見る）
set -u -o pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"; cd "$ROOT" || exit 1
DAILY_DIR="data/pipeline/daily"; LOCK="$DAILY_DIR/lock"; LOGDIR="$DAILY_DIR/logs"
PIPELINE_SCRIPT="${DAILY_PIPELINE_SCRIPT:-scripts/reader-case/run-pipeline.sh}"
MAX_PREFIXES="${DAILY_MAX_PREFIXES:-3}"; MAX_MIN="${DAILY_MAX_MINUTES:-180}"; MAX_SEC="${DAILY_MAX_SECONDS:-$((MAX_MIN*60))}"
STATE="node --import tsx scripts/reader-case/daily-state.ts"
PREFIXES=(); FORCE=0; DRY=0
while [ $# -gt 0 ]; do case "$1" in
  --prefix) PREFIXES+=("${2:?--prefix に値が要る}"); shift 2 ;;
  --force) FORCE=1; shift ;;
  --dry-run) DRY=1; shift ;;
  *) echo "不明な引数: $1" >&2; exit 2 ;;
esac; done

say() { echo "[$(date '+%F %H:%M:%S')] $*"; }
notify() { [ "${DAILY_NOTIFY:-1}" = 0 ] || osascript -e "display notification \"$1\" with title \"Make-Money 定期実行\"" >/dev/null 2>&1 || true; }

# 公開側へは出さない。環境にどんな指定が残っていても、選別と計画で止める・撤回は入れない
export PIPELINE_NO_PUBLISH=1
unset PIPELINE_WITHDRAWALS_FILE

# --- 二重起動の防止（mkdir は原子的）。古いロック（プロセスが無い／別のプロセスに使い回された pid）は回収する ---
OWN_LOCK=0
acquire() {
  if mkdir "$LOCK" 2>/dev/null; then echo "$$" > "$LOCK/pid"; date -u +%FT%TZ > "$LOCK/since"; OWN_LOCK=1; return 0; fi
  local opid=""
  for _ in 1 2 3; do opid="$(cat "$LOCK/pid" 2>/dev/null || true)"; [ -n "$opid" ] && break; sleep 1; done  # 作成直後で pid 未記入の可能性
  if [ -n "$opid" ] && kill -0 "$opid" 2>/dev/null && ps -p "$opid" -o command= 2>/dev/null | grep -q "run-daily"; then
    return 1
  fi
  say "古いロックを回収（前回の pid=${opid:-不明} はもう動いていない。途中で止まった実行の続きから回す）"
  mv "$LOCK" "$LOCK.stale.$$" 2>/dev/null || return 1   # 同時に回収しようとした相手に負けたら諦める
  rm -rf "$LOCK.stale.$$"
  if mkdir "$LOCK" 2>/dev/null; then echo "$$" > "$LOCK/pid"; date -u +%FT%TZ > "$LOCK/since"; OWN_LOCK=1; return 0; fi
  return 1
}
CHILD=""; CUR_PREFIX=""; RUN_ID="$(date +%y%m%d%H%M%S)-$$"; RESULT_RC=0
# 親を先に止めると子が孤児になるので、子の一覧を先に取ってからまとめて止める
kill_tree() { local kids; kids="$(pgrep -P "$1" 2>/dev/null)"; kill -TERM "$1" $kids 2>/dev/null; return 0; }
release() { [ "$OWN_LOCK" = 1 ] && [ "$(cat "$LOCK/pid" 2>/dev/null)" = "$$" ] && rm -rf "$LOCK"; OWN_LOCK=0; }
on_signal() {
  say "中断の信号を受けた。子プロセスを止めて、状態を残して終わる"
  [ -z "$CHILD" ] || kill_tree "$CHILD"
  [ -z "$CUR_PREFIX" ] || $STATE finish --prefix "$CUR_PREFIX" --run-id "$RUN_ID" --outcome FAILED --text "中断の信号で止まった（次回の実行が続きから再開する）" >/dev/null 2>&1 || true
  release; exit 1
}
trap on_signal INT TERM
trap release EXIT

if [ "$DRY" = 1 ]; then
  [ ${#PREFIXES[@]} -gt 0 ] || while IFS= read -r p; do [ -n "$p" ] && PREFIXES+=("$p"); done < <($STATE prefixes)
  say "ドライラン: 対象の接頭辞 = ${PREFIXES[*]:-（なし）}"
  for p in ${PREFIXES[@]+"${PREFIXES[@]}"}; do say "  $p → $($STATE plan --prefix "$p" $([ $FORCE = 1 ] && echo --force); echo "(終了コード $?)")"; done
  exit 0
fi

mkdir -p "$DAILY_DIR" "$LOGDIR"
if ! acquire; then
  say "二重起動: 別の実行（pid=$(cat "$LOCK/pid" 2>/dev/null)）が動いているので、今回は何もしない"
  exit 0
fi

LOG="$LOGDIR/$(date +%Y%m%d-%H%M%S)-$$.log"
find "$LOGDIR" -name '*.log' -mtime +60 -delete 2>/dev/null || true   # ログは60日分だけ残す
say "定期実行を開始（実行ID $RUN_ID、ログ $LOG）"

[ ${#PREFIXES[@]} -gt 0 ] || while IFS= read -r p; do [ -n "$p" ] && PREFIXES+=("$p"); done < <($STATE prefixes)
if [ ${#PREFIXES[@]} -eq 0 ]; then say "処理する束がない（data/analyze/batches が空）。何もしない"; exit 0; fi

ran=0; failed=0
for P in "${PREFIXES[@]}"; do
  if [ "$ran" -ge "$MAX_PREFIXES" ]; then say "上限（${MAX_PREFIXES} 接頭辞）に達した。残りは次回: $P"; continue; fi
  reason="$($STATE plan --prefix "$P" $([ $FORCE = 1 ] && echo --force))"; prc=$?
  if [ "$prc" = 10 ]; then say "$P: $reason。飛ばす"; continue; fi
  [ "$prc" = 0 ] || { say "$P: 判定に失敗（$reason）"; failed=1; continue; }
  ran=$((ran+1)); CUR_PREFIX="$P"
  say "$P: 実行（$reason）"
  $STATE begin --prefix "$P" --run-id "$RUN_ID" || say "状態の記録に失敗（続行）"
  echo "=== $P ($(date '+%F %T')) ===" >> "$LOG"
  bash "$PIPELINE_SCRIPT" "$P" >> "$LOG" 2>&1 &
  CHILD=$!
  ( sleep "$MAX_SEC"; kill_tree "$CHILD"; echo "[時間切れ] ${MAX_SEC} 秒で打ち切り" >> "$LOG" ) >/dev/null 2>&1 &
  WD=$!
  wait "$CHILD"; rc=$?
  kill "$WD" 2>/dev/null; wait "$WD" 2>/dev/null; CHILD=""
  if [ "$rc" = 0 ]; then
    $STATE finish --prefix "$P" --run-id "$RUN_ID" --outcome DONE --exit 0 --text "選別と公開版の計画まで完了（公開はしない）" || true
    say "$P: 完了（選別と公開版の計画まで。公開はしない）"
  elif [ "$rc" = 143 ]; then
    $STATE finish --prefix "$P" --run-id "$RUN_ID" --outcome FAILED --exit "$rc" --text "制限時間 ${MAX_SEC} 秒で打ち切った（次回続きから）" || true
    say "$P: 時間切れ"; notify "$P: 時間切れ"; failed=1
  else
    c="$($STATE classify --prefix "$P" 2>/dev/null)"; outcome="${c%%$'\t'*}"; text="${c#*$'\t'}"
    case "$outcome" in WAITING_AGENT|HOLD|FAILED) ;; *) outcome=FAILED; text="パイプラインが失敗（終了コード $rc）" ;; esac
    $STATE finish --prefix "$P" --run-id "$RUN_ID" --outcome "$outcome" --exit "$rc" --text "$text" || true
    say "$P: $outcome — $text"
    case "$outcome" in
      WAITING_AGENT) ;;                                  # 想定内。正常終了して次回に続ける
      HOLD) notify "$P: 保留（人の判断待ち）" ;;          # 失敗ではないが人の判断が要る
      *) notify "$P: 失敗"; failed=1 ;;
    esac
  fi
  CUR_PREFIX=""
done
say "定期実行を終了（実行 ${ran} 件、失敗 ${failed}）。状態: pnpm pipeline:status / 履歴: $DAILY_DIR/runs.jsonl"
node --import tsx scripts/reader-case/chapter-gaps.ts 2>&1 | head -20 || true   # 章がまだ無い仕上げ済み事例（次に章を作る対象。手順は docs/CASE_CHAPTER_PROCESS.md）
[ "$failed" = 0 ] || exit 1
exit 0
