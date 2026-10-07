#!/usr/bin/env bash
# 差分監査を1本で通す: 未監査の項目だけを事例ごとに別のAIへ並行で渡す → 取り込み → 反映 → 公開の目録の確認。
# 文を直した後（言い回し・数字）に流す。直した項目は監査を通るまで画面から隠れているだけで、事例は外れない。通ればその項目が画面に戻る。
# 使い方: bash scripts/reader-case/run-diff-audit.sh [事例IDを1行ずつ書いた一覧（省略時は公開中の全件）]
#   環境変数: DIFF_AUDIT_PARALLEL（同時に流す束の数。既定4）、DIFF_AUDIT_AGENT（codex|claude。既定 codex）
# 終了コード: 0=未監査の項目が残らず、外れる事例も0件 / 75=別のAI待ち（指示書の結果を置いて再実行）/ 1=失敗・外れる事例か隠れた項目が残る
set -u -o pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"; cd "$ROOT" || exit 1
START=$(date +%s)
say() { echo "[$(date +%H:%M:%S)] $*"; }
mkdir -p data/pipeline
IDS="${1:-}"
if [ -z "$IDS" ]; then
  IDS=data/pipeline/diff-audit.ids
  node -e "console.log(Object.keys(JSON.parse(require('fs').readFileSync('data/catalog-release.json','utf8')).details).join('\n'))" > "$IDS"
fi
[ -s "$IDS" ] || { say "一覧が空・無い: $IDS"; exit 1; }
CSV="$(grep -v '^#' "$IDS" | grep . | paste -sd, -)"

# 1. 未監査の項目を事例ごとの束にして、別のAIへ並行で渡す（受理検査まで）
node --import tsx scripts/reader-case/diff-audit.ts --ids "$IDS" --parallel "${DIFF_AUDIT_PARALLEL:-4}" --agent "${DIFF_AUDIT_AGENT:-codex}" > data/pipeline/diff-audit.json; rc=$?
cat data/pipeline/diff-audit.json
case $rc in 0) ;; 75) say "別のAI待ち（data/runner/instructions/audit/ の指示書の結果を data/runner/inbox/audit/ に置いて、同じ命令を再実行）"; exit 75 ;; *) say "差分監査に失敗（終了コード $rc）"; exit 1 ;; esac
# 2. 取り込み（監査記録を項目ごとに更新し、監査役の直しを推論の正本 data/reader-analysis.json へ書く）
node --import tsx scripts/reader-case/merge-analysis.ts --ids "$IDS" > data/pipeline/diff-audit-merge.json || { say "取り込みに失敗"; exit 1; }
# 3. 反映（取り込み版の事例の表示版を、直した推論にそろえる）
node --import tsx scripts/reader-case/case-reflect.ts --ids "$CSV" > data/pipeline/diff-audit-reflect.log || { say "反映に失敗（data/pipeline/diff-audit-reflect.log）"; exit 1; }
# 4. 公開の目録の確認（外れる事例が0件か、隠れた項目が残っていないか）
node --import tsx scripts/prepare-catalog-release.ts --dry-run > data/pipeline/diff-audit-prepare.json || { say "公開版の計画を作れない"; exit 1; }
node -e "
const t=require('fs').readFileSync('data/pipeline/diff-audit-prepare.json','utf8');
const j=JSON.parse(t.split('\n').find(l=>l.startsWith('{\"dryRun\"')));
console.log(JSON.stringify({ withdrawn: j.plan.withdrawn, corrected: j.plan.corrected, added: j.plan.added, hiddenItems: j.hiddenItems }));
for (const id of j.plan.withdrawn) console.log('外れる: '+id+' '+(j.caseStamps[id]?.reason||''));
process.exitCode = j.plan.withdrawn.length || Object.keys(j.hiddenItems||{}).length ? 1 : 0;
"; left=$?
say "かかった時間: $(( $(date +%s) - START ))秒"
if [ $left -ne 0 ]; then say "外れる事例か、監査を通らず隠れたままの項目が残る（上の一覧）"; exit 1; fi
say "未監査の項目は0件。次: node --import tsx scripts/prepare-catalog-release.ts（公開の目録を書く）"
