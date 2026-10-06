/** Membership and per-case content hashes, never net count, decide whether there is a release. */
import { readFileSync } from 'node:fs';
import { contentHash } from './publication-evaluation';
export interface ReleaseManifest { details: Record<string, string> }
export function planRelease(before: ReleaseManifest, after: ReleaseManifest) {
  for (const manifest of [before, after]) {
    if (!manifest?.details || Array.isArray(manifest.details) || typeof manifest.details !== 'object' ||
        Object.values(manifest.details).some((h) => typeof h !== 'string' || !/^[a-f0-9]{64}$/.test(h))) throw new Error('Invalid release manifest details');
  }
  const added = Object.keys(after.details).filter((id) => !(id in before.details)).sort();
  const corrected = Object.keys(after.details).filter((id) => id in before.details && before.details[id] !== after.details[id]).sort();
  const withdrawn = Object.keys(before.details).filter((id) => !(id in after.details)).sort();
  return { planId: contentHash({ before: before.details, after: after.details }), changed: !!(added.length || corrected.length || withdrawn.length), added, corrected, withdrawn,
    before: Object.keys(before.details).length, after: Object.keys(after.details).length };
}
/** An explicit list must equal the planned withdrawals. An empty plan needs no withdrawal authority. */
export function checkWithdrawals(withdrawn: readonly string[], authorized: ReadonlySet<string> = new Set()) {
  const missing = withdrawn.filter((id) => !authorized.has(id)).sort();
  const unexpected = [...authorized].filter((id) => !withdrawn.includes(id)).sort();
  return { allowed: missing.length === 0 && unexpected.length === 0, missing, unexpected };
}
if (process.argv[1]?.endsWith('/release-plan.ts')) {
  const [before, after] = process.argv.slice(2);
  console.log(JSON.stringify(planRelease(JSON.parse(readFileSync(before, 'utf8')), JSON.parse(readFileSync(after, 'utf8'))), null, 2));
}
