/**
 * Rule-based review of staged media (reviewer "auto-rule-v3"): appends allowed / blocked lines to decisions.jsonl.
 * Face detection uses macOS Vision through scripts/media/detect-faces.js (osascript -l JavaScript).
 *
 *   node --import tsx scripts/media/auto-review.ts [--entity ent_a,ent_b] [--dry-run] [--out data/media-staging]
 *
 * Operating procedure: docs/MEDIA_ASSETS_AND_PROVENANCE.md (chapter 7.2)
 */
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createOsascriptFaceDetector, runAutoReview } from '../../src/lib/media/auto-review';

const HERE = dirname(fileURLToPath(import.meta.url));
const USAGE = 'Usage: node --import tsx scripts/media/auto-review.ts [--entity <id,id>] [--dry-run] [--out data/media-staging]\n';

async function main(): Promise<number> {
  const argv = process.argv.slice(2);
  let entities: string[] | null = null;
  let out = join(resolve(HERE, '../..'), 'data/media-staging');
  let dryRun = false;
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    if (flag === '--entity') entities = (argv[++i] ?? '').split(',').map((id) => id.trim()).filter(Boolean);
    else if (flag === '--out') out = resolve(argv[++i] ?? '');
    else if (flag === '--dry-run') dryRun = true;
    else if (flag === '--help' || flag === '-h') {
      console.log(USAGE);
      return 0;
    } else throw new Error(`Unknown argument: ${flag}\n\n${USAGE}`);
  }
  const tally = await runAutoReview(entities, {
    root: out,
    detector: createOsascriptFaceDetector(join(HERE, 'detect-faces.js')),
    now: () => new Date(),
    dryRun,
    log: (line) => console.log(line),
  });
  console.log(`${dryRun ? '[dry-run] ' : ''}summary: ${JSON.stringify(tally)}`);
  return tally.ledgerErrors.length > 0 ? 1 : 0;
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
