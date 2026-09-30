import { writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { MEDIA_ENTITY_ID_PATTERN } from '../../shared/media-asset-schema';
import { defaultMediaStagingRoot } from '../../shared/media-asset-store';
import { mediaStamp } from '../../shared/media-public-manifest';
import { buildUploadPlan, executeUpload, formatUploadReport, type MediaObjectStore, type UploadReport } from './upload';

/**
 * Argument parsing and execution of scripts/media/upload-media-assets.ts, separated from the script so that
 * it can be tested without R2.
 */

export const UPLOAD_USAGE = `Usage:
  node scripts/with-r2-keychain-secrets.mjs node --import tsx scripts/media/upload-media-assets.ts --entity <entityId>[,<entityId>...] [--out data/media-staging]
  node --import tsx scripts/media/upload-media-assets.ts --entity <entityId>[,<entityId>...] --dry-run [--out data/media-staging]

  --entity     entity ids under data/media-staging (required)
  --dry-run    read the local ledger and files only; print what would be written. R2 is not read or written and no credentials are needed
  --out        staging directory (default: data/media-staging)

Writes (create-only, never overwrites or deletes; every object is read back and its SHA-256 compared):
  foundation-raw     media/<entityId>/<sha256>.<ext>                 every staged asset
                     media/<entityId>/manifest.<retrievedAt>.json    the capture manifest
                     media/<entityId>/decisions.<timestamp>.jsonl    the decision log
  foundation-public  media/<entityId>/<sha256>.<ext>                 only assets that are allowed and not a person
                     media/<entityId>/public-manifest.<asOf>.json    what the site may show
Without R2 credentials a real run fails; it never falls back to local files.
`;

export interface UploadOptions {
  entities: string[];
  dryRun: boolean;
  out: string;
  help: boolean;
}

export function parseUploadArgs(argv: readonly string[], defaultOut: string = defaultMediaStagingRoot()): UploadOptions {
  const options: UploadOptions = { entities: [], dryRun: false, out: defaultOut, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const equals = arg.startsWith('--') ? arg.indexOf('=') : -1;
    const flag = equals > 0 ? arg.slice(0, equals) : arg;
    const inline = equals > 0 ? arg.slice(equals + 1) : undefined;
    const value = (): string => {
      const next = inline ?? argv[++i];
      if (next === undefined || next === '') throw new Error(`${flag} needs a value`);
      return next;
    };
    switch (flag) {
      case '--entity':
        options.entities.push(...value().split(',').map((id) => id.trim()).filter(Boolean));
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--out':
        options.out = resolve(value());
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}\n\n${UPLOAD_USAGE}`);
    }
  }
  if (options.help) return options;
  options.entities = [...new Set(options.entities)];
  if (options.entities.length === 0) throw new Error(`--entity is required\n\n${UPLOAD_USAGE}`);
  const invalid = options.entities.filter((id) => id.length > 128 || !MEDIA_ENTITY_ID_PATTERN.test(id));
  if (invalid.length > 0) throw new Error(`Invalid entity id(s): ${invalid.join(', ')}`);
  return options;
}

export interface UploadDeps {
  /** Only called for a real run; a dry run never creates a store. */
  createStore: () => MediaObjectStore;
  buckets: { raw: string; public: string };
  log: (line: string) => void;
  now: () => Date;
}

const notUsed: MediaObjectStore = {
  async assertReady() {
    throw new Error('the store is not available in a dry run');
  },
  async putCreateOnly() {
    throw new Error('the store is not available in a dry run');
  },
  async read() {
    throw new Error('the store is not available in a dry run');
  },
};

const WRITE_COMMAND = 'node scripts/with-r2-keychain-secrets.mjs node --import tsx scripts/media/upload-media-assets.ts';

/** Runs the parsed command. Returns the process exit code; throws when a real run cannot start (for example no R2 credentials). */
export async function runUpload(options: UploadOptions, deps: UploadDeps): Promise<number> {
  if (options.help) {
    deps.log(UPLOAD_USAGE);
    return 0;
  }
  const startedAt = deps.now();
  const reports: UploadReport[] = [];
  const store = options.dryRun ? null : deps.createStore();
  deps.log(options.dryRun ? 'media upload: DRY RUN. R2 is not read or written.' : `media upload: real run. Targets ${deps.buckets.raw} and ${deps.buckets.public} (create-only); R2 access is checked before the first write.`);

  for (const entityId of options.entities) {
    const plan = await buildUploadPlan(entityId, deps.buckets, { root: options.out });
    const report = await executeUpload(plan, store ?? notUsed, { dryRun: options.dryRun });
    reports.push(report);
    for (const line of formatUploadReport(report)) deps.log(line);
  }

  const ok = reports.every((report) => report.ok);
  if (options.dryRun) {
    deps.log(`to write: ${WRITE_COMMAND} --entity ${options.entities.join(',')}`);
  } else {
    const receiptPath = join(options.out, `upload-${mediaStamp(startedAt.toISOString())}.json`);
    const receipt = {
      schema: 'media-upload-run.v1',
      startedAt: startedAt.toISOString(),
      finishedAt: deps.now().toISOString(),
      tool: { script: 'scripts/media/upload-media-assets.ts', node: process.version },
      options: { entities: options.entities, out: options.out },
      ok,
      reports,
    };
    try {
      await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, { flag: 'wx' });
      deps.log(`receipt: ${receiptPath}`);
    } catch (error) {
      deps.log(`could not write the receipt (${error instanceof Error ? error.message : String(error)}); the report above is the record`);
    }
  }
  deps.log(ok ? 'done: OK' : 'done: NOT OK (see PROBLEM / conflict / error lines above)');
  return ok ? 0 : 1;
}
