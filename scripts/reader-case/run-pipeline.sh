#!/usr/bin/env bash
# 1つの命令で「分析 → 統合 → 監査 → 仕上げ済みの選別 → 公開データ → PR・マージ → 本番反映 → 本番で読み戻し」まで通す。
# どこかで止まったら理由を出して終了し、Mac の通知を出す。済んだ工程は次回飛ばす（分析・監査は出力があれば再実行しない）。
# 使い方: bash scripts/reader-case/run-pipeline.sh <バッチ名の頭（例: batch-x1-）>
#   PIPELINE_NO_PUBLISH=1 を付けると、選別までで止める（公開しない）。
set -u -o pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"; cd "$ROOT" || exit 1
PREFIX="${1:?バッチ名の頭を指定（例: batch-x1-）}"
REPO="$(git rev-parse --path-format=absolute --git-common-dir | sed 's#/\.git$##')"
PROD="${PIPELINE_PROD_URL:-https://make-money-app.sato-business-0117.workers.dev}"
mkdir -p data/pipeline
CAND="data/pipeline/${PREFIX%-}.ids"

say() { echo "[$(date +%H:%M)] $*"; }
notify() { osascript -e "display notification \"$1\" with title \"Make-Money 収集\"" >/dev/null 2>&1 || true; }
# 停止の理由は状態台帳（pnpm pipeline:status）にも残す。台帳に書けなくても停止は止めない
fail() { say "停止: $*"; node --import tsx scripts/reader-case/pipeline-status.ts record --case "_run:${PREFIX%-}" --stage "${LEDGER_STAGE:-ANALYZE}" --status FAILED --reason RUN_ABORTED --text "$*" --next "原因を直して再実行" >/dev/null 2>&1 || true; notify "停止: $*"; exit 1; }

# 出典本文が1件も無い事例は、台帳に HOLD NO_SOURCE_TEXT で残す（実行は止めない）
node --import tsx scripts/reader-case/pipeline-status.ts scan-batches --prefix "$PREFIX" || true

# 1. 分析（Claude サブエージェント）。全バッチの出力が揃うまで進まない
#    run-analyze.sh は結果の検査と指示書の生成だけを行う（終了コード 75=サブエージェント待ち、76=保留）。待ちの時はここで止まり、
#    オーケストレーターが指示書を実行して結果を置いたあとにこの命令をもう一度実行すると、受理済みの束から先へ進む
say "分析: ${PREFIX}*"
ANALYZE_PREFIX="$PREFIX" bash scripts/reader-case/run-analyze.sh; rc=$?
case $rc in 0) ;; 75) fail "分析はサブエージェント待ち（指示書: data/runner/instructions/analyze/。結果を data/runner/inbox/analyze/ に置いてから再実行）" ;; 76) fail "分析に保留の束がある（理由: data/runner/state/analyze/。人の判断後 runner の release で解除）" ;; *) fail "分析の実行に失敗" ;; esac
missing=""
for b in data/analyze/batches/${PREFIX}*.json; do [ -s "data/analyze/out/$(basename "$b")" ] || missing="$missing $(basename "$b" .json)"; done
[ -z "$missing" ] || fail "分析が終わっていない束:$missing（もう一度この命令を実行すると続きから回る）"
node -e "
  const fs=require('fs');const ids=new Set();
  for(const f of fs.readdirSync('data/analyze/batches').filter(f=>f.startsWith('$PREFIX')))for(const c of JSON.parse(fs.readFileSync('data/analyze/batches/'+f)).cases)ids.add(c.entityId);
  fs.writeFileSync('$CAND',[...ids].sort().join('\n')+'\n');console.log('候補',ids.size,'件')" || fail "候補の一覧を作れない"

LEDGER_STAGE=MERGE
# 2. 統合（機械の検査を通った推論だけ残す）
node --import tsx scripts/reader-case/merge-analysis.ts --ids "$CAND" >/dev/null || fail "統合に失敗"

# 2b. 短さの検査（強い一行55字・物語以外は60字が規則。70字を超える項目が5%を超えたら止める）
node -e "
  const fs=require('fs');const d=JSON.parse(fs.readFileSync('data/reader-analysis.json','utf8'));
  let n=0,long=0;for(const id of fs.readFileSync('$CAND','utf8').split('\\n').filter(Boolean))for(const a of d[id]||[]){if(a.item==='STORY')continue;n++;if(a.text.length>70)long++}
  console.log('長すぎる項目',long,'/',n);process.exit(n&&long/n>0.05?1:0)" || fail "推論の文が長すぎる（分析指示の短さの規則が効いていない）"

LEDGER_STAGE=AUDIT
# 3. 監査（今の推論の文をまだ監査していない候補だけ。推論を作り直した事例は、前に監査済みでも監査し直す。
#    名前は 999999+日時（秒まで）+プロセス番号 で、過去の監査より後ろに並べる。監査済みかは merge-analysis.ts が指紋で判定して data/audit-fresh.json に書く）
node -e "
  const fs=require('fs');const done=new Set(JSON.parse(fs.readFileSync('data/audit-fresh.json','utf8')));
  const todo=fs.readFileSync('$CAND','utf8').split('\n').filter(x=>x&&!done.has(x));fs.writeFileSync('$CAND.audit',todo.join('\n')+'\n');console.log('未監査',todo.length,'件')"
if [ -s "$CAND.audit" ] && grep -q . "$CAND.audit"; then
  # サブエージェント待ちで止まった後の再実行では、同じ監査入力（同じ TAG）を使い続ける（毎回作り直すと結果が永久に揃わない）
  TAGFILE="$CAND.audit-tag"
  if [ -s "$TAGFILE" ] && ls data/audit/in-"$(cat "$TAGFILE")"*.json >/dev/null 2>&1; then
    TAG="$(cat "$TAGFILE")"; say "監査: 前回の入力 in-${TAG}* を続ける"
  else
    TAG="999999$(date +%y%m%d%H%M%S)$(printf %05d "$$")"  # 秒とプロセス番号まで入れる（同じ分に別の実行が始まっても入力・指紋の名前が衝突しない）
    node --import tsx scripts/reader-case/build-audit-input.ts --ids "$CAND.audit" --per 10 --tag "$TAG" || fail "監査の入力を作れない"
    echo "$TAG" > "$TAGFILE"
  fi
  say "監査: in-${TAG}*"
  AUDIT_ONLY="${TAG}*" bash scripts/reader-case/run-audit.sh; rc=$?
  case $rc in 0) ;; 75) fail "監査はサブエージェント待ち（指示書: data/runner/instructions/audit/。結果を data/runner/inbox/audit/ に置いてから再実行。再実行すると同じ監査入力 TAG=${TAG} を続ける）" ;; 76) fail "監査に保留の束がある（理由: data/runner/state/audit/）" ;; *) fail "監査の実行に失敗" ;; esac
  for i in data/audit/in-${TAG}*.json; do [ -s "${i/in-/out-}" ] || fail "監査が終わっていない: $(basename "$i")（もう一度実行すると続きから回る）"; done
  node --import tsx scripts/reader-case/merge-analysis.ts --ids "$CAND" >/dev/null || fail "監査の反映に失敗"
  rm -f "$TAGFILE"
fi

LEDGER_STAGE=IMAGE
# 3b. 画像の検査（使ってよいと判定された画像が1枚も無い候補は、仕上げ済みにしない）
node -e "
  const fs=require('fs');const ok=[],ng=[];
  for(const id of fs.readFileSync('$CAND','utf8').split('\n').filter(Boolean)){
    const f='data/media-staging/'+id+'/decisions.jsonl';const last=new Map();
    if(fs.existsSync(f))for(const l of fs.readFileSync(f,'utf8').split('\n').filter(Boolean)){const d=JSON.parse(l);last.set(d.assetId,d)}
    ([...last.values()].some(d=>d.decision==='allowed'&&!d.subjectIsPerson)?ok:ng).push(id)}
  fs.writeFileSync('$CAND.img',ok.join('\n')+'\n');fs.writeFileSync('$CAND.noimg',ng.join('\n')+'\n');
  console.log('画像あり',ok.length,'件／画像なし',ng.length,'件（$CAND.noimg）')" || fail "画像の検査に失敗"

LEDGER_STAGE=SELECT
# 4. 仕上げ済みの選別と、公開版の「追加／訂正／撤回」の計画
# 比べる相手は「公開済み（origin/main）の公開版 data/catalog-release.json」。件数ではなく事例ごとの中身のハッシュで差を見る。
# 撤回（公開から外す事例）は、PIPELINE_WITHDRAWALS_FILE に事例IDを明示した時だけ許す（黙って巻き戻らない）。
git -C "$REPO" fetch -q origin main || fail "main を取得できない"
git -C "$REPO" show origin/main:data/catalog-release.json > data/pipeline/previous-release.json || fail "公開済みの一覧を読めない"
node -e "
  const fs=require('fs');const ids=new Set(Object.keys(JSON.parse(fs.readFileSync('data/pipeline/previous-release.json','utf8')).details));
  for(const f of ['$CAND','data/catalog-finished-ids.txt'])if(fs.existsSync(f))for(const l of fs.readFileSync(f,'utf8').split('\\n')){const t=l.trim();if(t&&!t.startsWith('#'))ids.add(t)}
  fs.writeFileSync('data/pipeline/all.ids',[...ids].sort().join('\\n')+'\\n')" || fail "選別の対象を作れない"
node --import tsx scripts/reader-case/select-finished.ts --ids data/pipeline/all.ids > data/pipeline/select.json || fail "選別に失敗"
WITHDRAWAL_ARGS=()
if [ -n "${PIPELINE_WITHDRAWALS_FILE:-}" ]; then
  cp "$PIPELINE_WITHDRAWALS_FILE" data/pipeline/approved-withdrawals.ids || fail "明示した撤回の一覧を読めない"
  WITHDRAWAL_ARGS=(--withdrawals data/pipeline/approved-withdrawals.ids)
fi
node --import tsx scripts/prepare-catalog-release.ts --dry-run --previous data/pipeline/previous-release.json ${WITHDRAWAL_ARGS[@]+"${WITHDRAWAL_ARGS[@]}"} > data/pipeline/prepare.json || fail "公開版の計画を作れない"
node -e "const fs=require('fs');fs.writeFileSync('data/pipeline/release-plan.json',JSON.stringify(JSON.parse(fs.readFileSync('data/pipeline/prepare.json')).plan,null,2))" || fail "公開版の計画を保存できない"
before=$(node -p "require('./data/pipeline/release-plan.json').before")
after=$(node -p "require('./data/pipeline/release-plan.json').after")
say "公開版の計画: ${before} → ${after} 件（追加・訂正・撤回は data/pipeline/release-plan.json、残りの理由は data/pipeline/select.json）"
[ "$(node -p "require('./data/pipeline/prepare.json').canApply")" = true ] || fail "撤回の明示が足りない（PIPELINE_WITHDRAWALS_FILE に撤回する事例IDを書く。計画: data/pipeline/release-plan.json）"
[ "${PIPELINE_NO_PUBLISH:-0}" = 1 ] && { say "公開はしない指定なので、ここで終了"; exit 0; }
[ "$(node -p "require('./data/pipeline/release-plan.json').changed")" = true ] || { say "追加・訂正・撤回が無いので公開しない"; exit 0; }

# 4b. 新しく仕上がった事例の画像を保存先へ上げる（追加のみ。既に上がっている分は読み戻して一致を確かめるだけ）
NEW_IDS=$(node -p "require('./data/pipeline/release-plan.json').added.join(',')")
if [ -n "$NEW_IDS" ]; then
  say "画像の保存: $(echo "$NEW_IDS" | tr ',' '\n' | wc -l | tr -d ' ') 件"
  node scripts/with-r2-keychain-secrets.mjs node --import tsx scripts/media/upload-media-assets.ts --entity "$NEW_IDS" > data/pipeline/upload.log 2>&1 || fail "画像を保存先へ上げられない（data/pipeline/upload.log）"
fi

LEDGER_STAGE=PUBLISH
# 5. 公開データを作り、main への PR を出してマージ（毎回 main から新しい作業場所を作る）
NAME="pub/${PREFIX%-}-$(date +%m%d%H%M)"; PUB="$REPO/.worktrees/${NAME//\//-}"
git -C "$REPO" fetch -q origin main || fail "main を取得できない"
git -C "$REPO" worktree add -q "$PUB" -b "$NAME" origin/main || fail "公開用の作業場所を作れない"
cp data/reader-analysis.json data/reader-verdicts.json data/catalog-finished-ids.txt data/publication-audits.json "$PUB/data/" || fail "公開用にコピーできない"
mkdir -p "$PUB/data/audit" "$PUB/data/pipeline" && cp data/audit/out-*.json data/audit/in-*.json "$PUB/data/audit/"
cp data/analysis-raw-hashes.json data/audit-fresh.json "$PUB/data/"
# 受領書の再評価に要る手元の証拠（git に入れない）は、この実行中だけ参照する
ln -s "$ROOT/data/source-cache" "$PUB/data/source-cache" || fail "出典キャッシュを接続できない"
ln -s "$ROOT/data/media-staging" "$PUB/data/media-staging" || fail "画像台帳を接続できない"
[ ! -f data/catalog-source-rights.json ] || cp data/catalog-source-rights.json "$PUB/data/"
[ ! -f data/pipeline/approved-withdrawals.ids ] || cp data/pipeline/approved-withdrawals.ids "$PUB/data/pipeline/"
cp scripts/prepare-catalog-release.ts "$PUB/scripts/"
cp scripts/reader-case/*.md scripts/reader-case/*.sh scripts/reader-case/*.ts "$PUB/scripts/reader-case/"
cd "$PUB" || fail "公開用の作業場所に入れない"
pnpm install --frozen-lockfile --offline >/dev/null 2>&1 || pnpm install --frozen-lockfile >/dev/null 2>&1 || fail "依存を入れられない"
pnpm -s catalog:prepare ${WITHDRAWAL_ARGS[@]+"${WITHDRAWAL_ARGS[@]}"} > /tmp/mm-prepare.json || fail "公開データを作れない"
# 画面に出さない言い回し（内部の符号・禁止語）が公開データに無いかを、コミットの前に検査する（catalog:publish と同じ検査）
pnpm -s catalog:screen-check > /tmp/mm-screen-check.log 2>&1 || fail "画面に出さない言い回しが残っている（/tmp/mm-screen-check.log）"
published=$(node -e "console.log(Object.keys(JSON.parse(require('fs').readFileSync('data/catalog-release.json','utf8')).details).length)")
[ "$published" = "$after" ] || fail "公開データの件数（$published）が仕上げ済み（$after）と合わない"
git add data/reader-analysis.json data/reader-verdicts.json data/catalog-finished-ids.txt data/publication-audits.json data/catalog-release.json data/case-display.json data/audit data/analysis-raw-hashes.json data/audit-fresh.json scripts/reader-case scripts/prepare-catalog-release.ts
[ ! -f data/catalog-source-rights.json ] || git add data/catalog-source-rights.json
git commit -qm "仕上げ済みを ${before} → ${after} 件に増やして公開（${PREFIX}）

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>" || fail "コミットできない（事前検査を確認）"
git push -q origin "HEAD:refs/heads/$NAME" || fail "push できない"
PR=$(gh pr create --base main --head "$NAME" --title "仕上げ済みを ${after} 件に増やして公開" --body "分析・監査を通った事例を公開に加えます（${before} → ${after} 件）。

🤖 Generated with [Claude Code](https://claude.com/claude-code)" | tail -1) || fail "PR を作れない"
say "PR: $PR（テスト待ち）"
sleep 20; gh pr checks "$PR" --watch --interval 30 >/dev/null 2>&1 || fail "テストが通らない: $PR"
sleep 90  # 自動レビューの指摘を待つ
N=${PR##*/}
open=$(gh api graphql --raw-field query="{repository(owner:\"salve-de\",name:\"Make-money\"){pullRequest(number:$N){reviewThreads(first:50){nodes{isResolved}}}}}" -q '[.data.repository.pullRequest.reviewThreads.nodes[]|select(.isResolved==false)]|length') || fail "レビュー指摘を読めない: $PR"
[ "${open:-0}" = 0 ] || fail "レビュー指摘が ${open} 件ある（直してからマージ）: $PR"
gh pr merge "$PR" --merge >/dev/null || fail "マージできない: $PR"

LEDGER_STAGE=READBACK
# 6. 本番反映（マージ後の main から）と読み戻し
git fetch -q origin main && git merge -q --ff-only origin/main || fail "マージ後の main に合わせられない"
pnpm -s deploy:workers > /tmp/mm-deploy.log 2>&1 || fail "本番反映に失敗（/tmp/mm-deploy.log）"
F=$(node -e 'console.log(encodeURIComponent(JSON.stringify({filter:"ALL",batch:"ALL",tags:[],bookmarks:[],screener:null})))')
total=$(curl -s "$PROD/api/catalog?offset=0&pageSize=1&q=&filters=$F" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).total))')
[ "$total" = "$after" ] || fail "本番の件数が ${total} 件で、公開した ${after} 件と合わない"
# 本番で、新しく公開した事例すべてに画像が出ることを確かめる
if [ -n "${NEW_IDS:-}" ]; then
  noimg=0
  for id in $(echo "$NEW_IDS" | tr ',' ' '); do
    n=$(curl -s "$PROD/api/media?entity_id=$id" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const e=JSON.parse(s).entities||{};console.log(Object.values(e).flat().length)}catch{console.log(0)}})')
    [ "${n:-0}" -gt 0 ] || { noimg=$((noimg+1)); echo "$id" >> data/pipeline/prod-noimg.ids; }
  done
  [ "$noimg" = 0 ] || fail "本番で画像が出ない事例が ${noimg} 件（data/pipeline/prod-noimg.ids）"
fi
say "完了: 本番に ${total} 件（$PR）"
notify "完了: 本番に ${total} 件"
