#!/usr/bin/env bash
# data/verify/batches/batch-NNN.json を Codex で照合する。並列3本。完了済み（out に結果がある）はスキップ。
# 使い方: bash scripts/reader-case/run-verify.sh [--force]
set -u
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT" || exit 1
mkdir -p data/verify/out data/verify/log
PROMPT="$ROOT/scripts/reader-case/verify-prompt.md"
FORCE=0; [ "${1:-}" = "--force" ] && FORCE=1
PARALLEL=${VERIFY_PARALLEL:-4}

run_one() {
  local batch="$1" name; name="$(basename "$batch" .json)"
  local out="data/verify/out/$name.json"
  if [ "$FORCE" = 0 ] && [ -s "$out" ] && node -e "JSON.parse(require('fs').readFileSync('$out','utf8'))" 2>/dev/null; then
    echo "skip $name (done)"; return 0
  fi
  { cat "$PROMPT"; printf '\n## 入力ファイル\n%s\n' "$ROOT/$batch"; } | \
    codex exec -m "${VERIFY_MODEL:-gpt-6.1-sol}" -c model_reasoning_effort="\"${VERIFY_EFFORT:-high}\"" -C "$ROOT" -s read-only --skip-git-repo-check -o "$out.tmp" - >"data/verify/log/$name.log" 2>&1
  local rc=$?
  if [ $rc -eq 0 ] && [ -s "$out.tmp" ]; then
    # コードフェンスがあれば外して JSON として読めるものだけ確定
    node -e "
      const fs=require('fs');let t=fs.readFileSync('$out.tmp','utf8').trim();
      t=t.replace(/^\`\`\`(?:json)?\s*/,'').replace(/\s*\`\`\`\$/,'');
      const a=t.indexOf('{'),b=t.lastIndexOf('}');JSON.parse(t.slice(a,b+1));
      fs.writeFileSync('$out',t.slice(a,b+1));" && rm -f "$out.tmp" && echo "done $name" || echo "bad-json $name"
  else
    echo "fail $name rc=$rc"
  fi
}

pids=()
for batch in data/verify/batches/batch-*.json; do
  [ -e "$batch" ] || continue
  run_one "$batch" &
  pids+=($!)
  while [ "$(jobs -rp | wc -l)" -ge "$PARALLEL" ]; do sleep 2; done
done
wait
