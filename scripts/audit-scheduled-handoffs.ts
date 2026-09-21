import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

// Read-only audit: never persist candidate bodies or write to GitHub/R2.
const repo = 'repos/salve-de/universal-foundation';
function read<T>(path: string): T {
  try {
    return JSON.parse(execFileSync('gh', ['api', '-H', 'Accept: application/vnd.github.raw+json', path], {
      encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'],
    }));
  } catch {
    throw new Error('GitHub read or JSON decode failed; response withheld');
  }
}

async function main() {
  const codeRoot = process.env.HANDOFF_AUDIT_CODE_ROOT || process.cwd();
  const { materializeScheduledR2Handoff } = await import(pathToFileURL(resolve(codeRoot, 'src/lib/foundation/scheduled-r2-handoff.ts')).href);
  const { sourceRunPaths } = await import(pathToFileURL(resolve(codeRoot, 'r2-writer/worker.ts')).href);
  const correctionModule = resolve(codeRoot, 'src/lib/foundation/queue-audit-correction.ts');
  const correction = existsSync(correctionModule) ? await import(pathToFileURL(correctionModule).href) : null;
  const tree = read<{ truncated: boolean; sha: string; tree: { path: string }[] }>(`${repo}/git/trees/automation-research?recursive=1`);
  if (tree.truncated) throw new Error('Incomplete GitHub tree');
  const sha = tree.sha;
  const cache = new Map<string, Record<string, unknown>>();
  function content(path: string): Record<string, unknown> {
    if (!path.startsWith('staging/')) throw new Error('Unexpected source path');
    if (!cache.has(path)) cache.set(path, read(`${repo}/contents/${path}?ref=${sha}`));
    return cache.get(path)!;
  }
  const paths: string[] = tree.tree.map((item: { path: string }) => item.path)
    .filter((path: string) => /^staging\/r2-queue\/\d{4}\/\d{2}\/\d{2}\/[^/]+\.json$/.test(path))
    .filter((path: string) => !process.argv[2] || path.includes(process.argv[2]));
  for (const path of paths) {
    try {
      const queue = content(path);
      const correctionTarget = correction?.auditCorrectionTarget(queue);
      if (correctionTarget) {
        const changes = correction.validateAuditCorrection(queue, content(correctionTarget));
        console.log(JSON.stringify({ path, revision: sha, status: 'AUDIT_CORRECTION_VALIDATED', changes: changes.length, r2Writes: 0 }));
        continue;
      }
      for (const field of ['handoff_candidates', 'existing_handoff_candidates']) {
        const candidates = queue[field];
        if (!Array.isArray(candidates)) continue;
        queue[field] = candidates.map((candidate: unknown) => {
          if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return candidate;
          const item = candidate as Record<string, unknown>;
          return typeof item.bundle_path === 'string' && !item.bundle
            ? { ...item, bundle: content(item.bundle_path) } : item;
        });
      }
      const snapshot = queue.input_snapshot;
      const sources = sourceRunPaths(snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot)
        ? snapshot as Record<string, unknown> : null).map((p: string) => ({ ...content(p), __source_run_path: p }));
      const result = await materializeScheduledR2Handoff({ queue, source_runs: sources, queue_path: path,
        source_metadata_base_url: `https://github.com/salve-de/universal-foundation/blob/${sha}` });
      console.log(JSON.stringify({ path, revision: sha, status: 'MATERIALIZED', included: result.included_items,
        skipped: result.skipped_items, evidence: result.evidence_count }));
    } catch (error) {
      // Counts only: do not log candidate text or response bodies from errors.
      const issues = error && typeof error === 'object' && 'issues' in error ? error.issues : null;
      const reasons: Record<string, number> = {};
      if (Array.isArray(issues)) for (const issue of issues) {
        const message = String(issue);
        const category = message.includes('no evidence text') ? 'MISSING_EVIDENCE'
          : message.includes('no successful source locator') ? 'MISSING_SOURCE_MATCH'
          : message.includes('no name') ? 'MISSING_NAME'
          : message.includes('queue_state') ? 'QUEUE_STATE'
          : message.includes('schema_version') ? 'QUEUE_SCHEMA'
          : message.includes('no rows') ? 'EMPTY_ROWS' : 'OTHER_VALIDATION';
        reasons[category] = (reasons[category] || 0) + 1;
      }
      console.log(JSON.stringify({ path, revision: sha, status: 'NOT_MATERIALIZED', issueCount: Array.isArray(issues) ? issues.length : null, reasons }));
    }
  }
}
main().catch(() => { console.error('Audit failed; details withheld'); process.exitCode = 1; });
