// Pre-flight: merge all candidate files of a family into a COPY of the index ($LANE_WORKDIR only) and run the repo's index checks on it.
// usage (cwd = repo worktree): LANE_TAG=<tag> [LANE_FAMILY=<正規表現, 既定 (?:gen|ih|ebiz)>] node scripts/reaudit/lanes/preflight.mjs
import { readFileSync, writeFileSync, readdirSync, copyFileSync, lstatSync, symlinkSync, unlinkSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
const SP = resolve(process.env.LANE_WORKDIR || `${process.cwd()}/.reaudit-work`);
const TAG = process.env.LANE_TAG || process.env.SWARM_TAG;
const FAMILY = process.env.LANE_FAMILY || process.env.SWARM_FAMILY_PATTERN || '(?:gen|ih|ebiz)'; // 既定: incoming の全 reaudit バッチ
if (!TAG) { console.error('LANE_TAG env is required'); process.exit(64); }
const root = process.cwd();
mkdirSync(`${SP}/${TAG}/preflight/data`, { recursive: true });
mkdirSync(`${SP}/${TAG}/preflight/scripts/architecture`, { recursive: true });
const idx = JSON.parse(readFileSync(`${root}/data/entities-index.json`, 'utf8'));
const files = readdirSync(`${root}/data/incoming`).filter((f) => new RegExp(`^reaudit-${FAMILY}-batch-\\d+-20260929\\.json$`).test(f)).sort();
const repl = new Map();
for (const f of files) { let rows = []; try { rows = JSON.parse(readFileSync(`${root}/data/incoming/${f}`, 'utf8')); } catch { console.warn(`skip unreadable ${f} (being written by another agent?)`); continue; } for (const r of rows) repl.set(r.id, r); }
const merged = idx.map((e) => repl.get(e.id) ?? e);
writeFileSync(`${SP}/${TAG}/preflight/data/entities-index.json`, JSON.stringify(merged));
for (const f of ['foundation-evidence-catalog.json', 'collected-registry.json', 'foundation-raw']) {
  const dst = `${SP}/${TAG}/preflight/data/${f}`;
  try { lstatSync(dst); unlinkSync(dst); } catch { /* not present */ }
  symlinkSync(`${root}/data/${f}`, dst);
}
for (const f of ['check-ingest-quality.mjs', 'ingest-hazard-guard.mjs', 'check-index-safety.mjs']) copyFileSync(`${root}/scripts/architecture/${f}`, `${SP}/${TAG}/preflight/scripts/architecture/${f}`);
console.log(`merged ${repl.size} candidates from ${files.length} file(s) into a copy of the index (${merged.length} records)`);
for (const script of ['check-ingest-quality.mjs', 'check-index-safety.mjs']) {
  try {
    const out = execSync(`node scripts/architecture/${script}`, { cwd: `${SP}/${TAG}/preflight`, encoding: 'utf8', stdio: 'pipe' });
    console.log(out.trim().split('\n').slice(-2).join('\n'));
  } catch (e) {
    console.log(`FAIL ${script}\n` + ((e.stdout ?? '') + (e.stderr ?? '')).split('\n').slice(0, 25).join('\n'));
  }
}
