/**
 * Upload the media ledger of one or more entities from data/media-staging to R2 (create-only, read-back verified).
 * foundation-raw receives every asset, the manifest and the decision log; foundation-public receives only the
 * assets that are allowed (and not a person) plus the public manifest the site reads.
 *
 *   node scripts/with-r2-keychain-secrets.mjs node --import tsx scripts/media/upload-media-assets.ts --entity ent_keyence
 *   node --import tsx scripts/media/upload-media-assets.ts --entity ent_keyence --dry-run     (no R2, no credentials)
 *
 * Operating procedure: docs/MEDIA_ASSETS_AND_PROVENANCE.md (chapter 5)
 */
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createR2MediaStore } from '../../src/lib/media/r2-media-store';
import { parseUploadArgs, runUpload } from '../../src/lib/media/upload-cli';
import { getFoundationBucket } from '../../src/lib/storage/r2';

// Anchored on this file, like fetch-official-assets.ts, so the default does not depend on the working directory.
const DEFAULT_OUT = join(resolve(dirname(fileURLToPath(import.meta.url)), '../..'), 'data/media-staging');

async function main(): Promise<number> {
  const options = parseUploadArgs(process.argv.slice(2), DEFAULT_OUT);
  return runUpload(options, {
    createStore: createR2MediaStore,
    buckets: { raw: getFoundationBucket('raw'), public: getFoundationBucket('public') },
    log: (line) => console.log(line),
    now: () => new Date(),
  });
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
