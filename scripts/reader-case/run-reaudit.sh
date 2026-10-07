#!/usr/bin/env bash
# 公開中の事例を直した後（訂正の台帳を当てた後・推論を直した後）に、人が付き添わず「監査 → 取り込み → 反映 → 画面の文 → 公開の目録の確認」まで通す。
# 直すと公開の入力の指紋が変わり、前の監査の受領書が無効になって目録から外れる。それを防ぐため、直した事例を必ずこの順で通す。
# 使い方: bash scripts/reader-case/run-reaudit.sh <事例IDを1行ずつ書いた一覧>
# 終了コード: 0=外れる事例が0件（次は catalog:prepare --changed）／75=監査の確認役（別のAI）待ち／1=失敗・外れる事例が残る
# 監査待ち（75）の時は、出た指示書を別のAIに実行させて結果を置いてから、同じ命令をもう一度実行する（済んだ段は飛ばす）。
# 外す承認（--withdrawals）は出さない。外れる事例が残ったら、事例ID・理由を報告して判断を仰ぐ。
set -u -o pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"; cd "$ROOT" || exit 1
IDS="${1:?事例IDの一覧ファイルを指定}"
[ -s "$IDS" ] || { echo "一覧が空・無い: $IDS"; exit 1; }
mkdir -p data/pipeline
KEY="$(basename "$IDS" | tr -c 'A-Za-z0-9_-\n' '_')"
TAGFILE="data/pipeline/reaudit-${KEY}.tag"
CSV="$(grep -v '^#' "$IDS" | grep . | paste -sd, -)"
say() { echo "[$(date +%H:%M)] $*"; }
fail() { say "停止: $*"; exit 1; }

# 1. 監査の入力（今の入力全体。待ちで止まった後の再実行では同じ入力を使い続ける）
if [ -s "$TAGFILE" ] && ls data/audit/in-"$(cat "$TAGFILE")"*.json >/dev/null 2>&1; then
  TAG="$(cat "$TAGFILE")"; say "監査: 前回の入力 in-${TAG}* を続ける"
else
  TAG="999999$(date +%y%m%d%H%M%S)$(printf %05d "$$")"
  node --import tsx scripts/reader-case/build-audit-input.ts --ids "$IDS" --per 10 --tag "$TAG" || fail "監査の入力を作れない"
  echo "$TAG" > "$TAGFILE"
fi
# 2. 監査（別のAIの確認役。自分で監査しない）
AUDIT_ONLY="${TAG}*" bash scripts/reader-case/run-audit.sh; rc=$?
case $rc in 0) ;; 75) say "監査は別のAI待ち（指示書: data/runner/instructions/audit/、結果の書き先: data/runner/inbox/audit/）。結果を置いてから同じ命令を再実行"; exit 75 ;; *) fail "監査が保留・失敗（終了コード $rc）" ;; esac
node --import tsx scripts/reader-case/runner/cli.ts status audit --prefix "${TAG}*" >/dev/null || fail "監査が終わっていない束がある"
# 3. 取り込み（審査で直した推論を reader-analysis.json、受領書を publication-audits.json へ）
node --import tsx scripts/reader-case/merge-analysis.ts --ids "$IDS" >/dev/null || fail "監査の取り込みに失敗"
# 4. 反映（受領書が審査した取り込み版にだけ、審査で直した推論を表示版へ届ける。取り込み出力が手元に無くても反映記録の版から作る）
node --import tsx scripts/reader-case/case-reflect.ts --ids "$CSV" > data/pipeline/reaudit-reflect.log || fail "反映に失敗（data/pipeline/reaudit-reflect.log）"
# 5. 画面の文（直した文を章・成功の秘訣・詳細・一覧にも届ける。別のAIの確認つき。手で書き換えない）
node --import tsx scripts/reader-case/build-display.ts --repair-only || say "画面の文の言い回しの直しは一部通らなかった（data/pipeline/display-build-failures.jsonl）"
# 6. 公開の目録の確認（外れる事例が0件か）
node --import tsx scripts/prepare-catalog-release.ts --dry-run --changed "$IDS" > data/pipeline/reaudit-prepare.json || fail "公開版の計画を作れない"
LEFT="$(node -p "const j=JSON.parse(require('fs').readFileSync('data/pipeline/reaudit-prepare.json','utf8').split('\n').find(l=>l.startsWith('{\"dryRun\"')));j.plan.withdrawn.join(' ')")"
if [ -n "$LEFT" ]; then
  say "外れる事例が残る（承認は出さない。事例ID・理由を報告）: $LEFT"
  node -p "const j=JSON.parse(require('fs').readFileSync('data/pipeline/reaudit-prepare.json','utf8').split('\n').find(l=>l.startsWith('{\"dryRun\"')));j.plan.withdrawn.map(i=>i+' '+(j.caseStamps[i]?.reason||'')).join('\n')"
  exit 1
fi
say "外れる事例は0件。次: node --import tsx scripts/prepare-catalog-release.ts --changed $IDS"
