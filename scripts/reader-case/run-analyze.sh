#!/usr/bin/env bash
# data/analyze/batches/batch-NNN.json を Codex で分析する（reader.analysis の元）。並列は既定4本。完了済み（out に結果がある）はスキップ。
# 使い方: bash scripts/reader-case/run-analyze.sh [--force]
set -u
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT" || exit 1
mkdir -p data/analyze/out data/analyze/log
PROMPT="$ROOT/scripts/reader-case/analyze-prompt.md"
FORCE=0; [ "${1:-}" = "--force" ] && FORCE=1
PARALLEL=${ANALYZE_PARALLEL:-4}

run_one() {
  local batch="$1" name; name="$(basename "$batch" .json)"
  local out="data/analyze/out/$name.json"
  # 完了扱いは「JSONとして読め、入力の全事例に結果がある」時だけ（エラー文だけの出力を完了にしない）
  if [ "$FORCE" = 0 ] && [ -s "$out" ] && node -e "
      const fs=require('fs');const o=JSON.parse(fs.readFileSync('$out','utf8'));const b=JSON.parse(fs.readFileSync('$batch','utf8'));
      if(!Array.isArray(o.analysis)||o.analysis.length<b.cases.length)process.exit(1)" 2>/dev/null; then
    echo "skip $name (done)"; return 0
  fi
  local rc attempt
  # モデルが混雑中（at capacity）で落ちた時は、間を空けて3回までやり直す
  for attempt in 1 2 3; do
    { cat "$PROMPT"; printf '\n## 入力（このJSONがバッチの全文。ファイルを開く必要はない）\n'; cat "$batch"; } | \
      codex exec -m "${ANALYZE_MODEL:-gpt-6.1-sol}" -c model_reasoning_effort="\"${ANALYZE_EFFORT:-high}\"" -C "$ROOT" -s read-only --skip-git-repo-check -o "$out.tmp" - >"data/analyze/log/$name.log" 2>&1
    rc=$?
    grep -q "at capacity" "data/analyze/log/$name.log" || break
    echo "retry $name (capacity, attempt $attempt)"; sleep $((attempt * 90))
  done
  if [ $rc -eq 0 ] && [ -s "$out.tmp" ]; then
    # コードフェンスがあれば外して JSON として読めるものだけ確定
    node -e "
      const fs=require('fs');let t=fs.readFileSync('$out.tmp','utf8').trim();
      t=t.replace(/^\`\`\`(?:json)?\s*/,'').replace(/\s*\`\`\`\$/,'');
      const a=t.indexOf('{'),b=t.lastIndexOf('}');JSON.parse(t.slice(a,b+1));
      const o=JSON.parse(t.slice(a,b+1));const n=JSON.parse(fs.readFileSync('$batch','utf8')).cases.length;
      if(!Array.isArray(o.analysis)||o.analysis.length<n){console.error('incomplete');process.exit(1)}
      fs.writeFileSync('$out',t.slice(a,b+1));" && rm -f "$out.tmp" && echo "done $name" || echo "bad-json-or-incomplete $name"
  else
    echo "fail $name rc=$rc"
  fi
}

pids=()
for batch in data/analyze/batches/${ANALYZE_PREFIX:-batch-}*.json; do
  [ -e "$batch" ] || continue
  run_one "$batch" &
  pids+=($!)
  while [ "$(jobs -rp | wc -l)" -ge "$PARALLEL" ]; do sleep 2; done
done
wait
