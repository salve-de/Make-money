#!/usr/bin/env bash
# data/audit/in-NNN.json を Codex で監査し data/audit/out-NNN.json に書く。並列は既定3本。済んだものは飛ばす。AUDIT_ONLY=92? のように番号を絞れる。
set -u
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"; cd "$ROOT" || exit 1
PROMPT="${AUDIT_PROMPT:-$ROOT/scripts/reader-case/audit-prompt.md}"; PARALLEL=${AUDIT_PARALLEL:-3}
run_one() {
  local in="$1" n; n="$(basename "$in" .json | sed 's/^in-//')"; local out="data/audit/out-$n.json" log="data/audit/log-$n.log"
  [ -s "$out" ] && { echo "skip $n"; return 0; }
  local attempt rc
  for attempt in 1 2 3; do
    { cat "$PROMPT"; printf '\n## 入力\n'; cat "$in"; } | codex exec -m "${AUDIT_MODEL:-gpt-6.1-sol}" -c model_reasoning_effort="\"high\"" -C "$ROOT" -s read-only --skip-git-repo-check -o "$out.tmp" - >"$log" 2>&1
    rc=$?; grep -q "at capacity" "$log" || break; echo "retry $n"; sleep $((attempt * 90))
  done
  node -e "const fs=require('fs');let t=fs.readFileSync('$out.tmp','utf8');const a=t.indexOf('{'),b=t.lastIndexOf('}');const o=JSON.parse(t.slice(a,b+1));const n=JSON.parse(fs.readFileSync('$in','utf8')).cases.length;if(!Array.isArray(o.cases)||o.cases.length<n)process.exit(1);fs.writeFileSync('$out',t.slice(a,b+1))" 2>/dev/null && rm -f "$out.tmp" && echo "done $n" || echo "bad $n rc=$rc"
}
for f in data/audit/in-${AUDIT_ONLY:-*}.json; do run_one "$f" & while [ "$(jobs -rp | wc -l)" -ge "$PARALLEL" ]; do sleep 2; done; done; wait
