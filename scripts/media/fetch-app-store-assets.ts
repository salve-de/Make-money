/**
 * Fetch the app icon and up to three store screenshots of catalog entities from Apple's public iTunes Lookup/Search API
 * and record them in the media ledger (data/media-staging/<entityId>/manifest.json, decision held).
 *
 *   node --import tsx scripts/media/fetch-app-store-assets.ts [--limit N] [--ids ent_a,ent_b] [--out data/media-staging]
 *
 * Google Play is out of scope. Resumable: finished entities are listed in <out>/appstore-progress.jsonl and skipped.
 * Operating procedure: docs/MEDIA_ASSETS_AND_PROVENANCE.md (chapter 6.2)
 */
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  APP_STORE_USER_AGENT,
  newAppStoreContext,
  runAppStoreFetch,
  selectAppStoreEntities,
  type AppStoreDeps,
} from '../../src/lib/media/app-store-fetch';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const USAGE = `Usage: node --import tsx scripts/media/fetch-app-store-assets.ts [--limit N] [--ids <id,id>] [--interval-ms 1100] [--out data/media-staging]
  --limit N        process at most N unfinished entities
  --ids            only these entity ids (default: every published catalog entity with an App Store link or official URL)
  --interval-ms    gap between two iTunes API requests (default 1100, minimum 1000)
`;

interface Options {
  limit: number | null;
  ids: string[] | null;
  out: string;
  intervalMs: number;
  help: boolean;
}

function parseArgs(argv: string[]): Options {
  const options: Options = { limit: null, ids: null, out: join(REPO_ROOT, 'data/media-staging'), intervalMs: 1100, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    const value = () => {
      const next = argv[++i];
      if (!next) throw new Error(`${flag} needs a value`);
      return next;
    };
    if (flag === '--limit') {
      options.limit = Number(value());
      if (!Number.isInteger(options.limit) || options.limit < 1) throw new Error('--limit must be a positive integer');
    } else if (flag === '--ids') options.ids = value().split(',').map((id) => id.trim()).filter(Boolean);
    else if (flag === '--out') options.out = resolve(value());
    else if (flag === '--interval-ms') {
      options.intervalMs = Number(value());
      if (!Number.isFinite(options.intervalMs) || options.intervalMs < 1000) throw new Error('--interval-ms must be at least 1000');
    } else if (flag === '--help' || flag === '-h') options.help = true;
    else throw new Error(`Unknown argument: ${flag}\n\n${USAGE}`);
  }
  return options;
}

const realDeps = (intervalMs: number): AppStoreDeps => ({
  minIntervalMs: intervalMs,
  now: () => new Date(),
  sleep: (ms) => new Promise((done) => setTimeout(done, ms)),
  async getJson(url) {
    const response = await fetch(url, { headers: { 'user-agent': APP_STORE_USER_AGENT, accept: 'application/json' }, signal: AbortSignal.timeout(20_000) });
    let json: unknown = null;
    if (response.ok) json = await response.json().catch(() => null);
    return { status: response.status, json };
  },
  async getBytes(url) {
    const response = await fetch(url, { headers: { 'user-agent': APP_STORE_USER_AGENT, accept: 'image/*' }, signal: AbortSignal.timeout(30_000) });
    const bytes = response.ok ? new Uint8Array(await response.arrayBuffer()) : new Uint8Array();
    return { status: response.status, finalUrl: response.url || url, bytes };
  },
});

async function main(): Promise<number> {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(USAGE);
    return 0;
  }
  const catalog = JSON.parse(await readFile(join(REPO_ROOT, 'data/catalog-release.json'), 'utf8')) as { details: Record<string, unknown> };
  const index: unknown = JSON.parse(await readFile(join(REPO_ROOT, 'data/entities-index.json'), 'utf8'));
  const ids = new Set(options.ids ?? Object.keys(catalog.details));
  const entities = selectAppStoreEntities(index, ids);
  console.log(`app-store fetch: ${entities.length} target entities -> ${options.out}`);
  const ctx = newAppStoreContext(realDeps(options.intervalMs), options.out);
  const summary = await runAppStoreFetch(ctx, entities, { limit: options.limit, log: (line) => console.log(line) });
  console.log(`summary: ${JSON.stringify(summary)}`);
  return summary.stoppedEarly ? 2 : 0;
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
