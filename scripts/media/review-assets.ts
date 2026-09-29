/**
 * Record a human review decision for a staged media asset (allow / block / hold), or list the
 * effective decisions. Appends to data/media-staging/<entityId>/decisions.jsonl; manifest.json is never
 * modified. Local files only: nothing is sent anywhere.
 *
 *   node --import tsx scripts/media/review-assets.ts --entity ent_keyence --asset ma_... --allow \
 *     --reviewer owner-delegated-2026-09-29 --subject-is-person false --note "checked: logo only"
 *   node --import tsx scripts/media/review-assets.ts --list
 *
 * Operating procedure: docs/MEDIA_ASSETS_AND_PROVENANCE.md (chapter 7)
 */
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseReviewArgs, runReview } from '../../src/lib/media/review-cli';

// Anchored on this file, like fetch-official-assets.ts, so the default does not depend on the working directory.
const DEFAULT_OUT = join(resolve(dirname(fileURLToPath(import.meta.url)), '../..'), 'data/media-staging');

async function main(): Promise<number> {
  const options = parseReviewArgs(process.argv.slice(2), DEFAULT_OUT);
  return runReview(options, { log: (line) => console.log(line), now: () => new Date() });
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().then(
    (code) => {
      process.exitCode = code;
    },
    (error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    },
  );
}
