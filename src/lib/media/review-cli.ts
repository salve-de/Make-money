import { resolve } from 'node:path';
import { MEDIA_ASSET_ID_PATTERN, MEDIA_ENTITY_ID_PATTERN, type MediaRightsDecision } from '../../shared/media-asset-schema';
import {
  appendMediaDecision,
  defaultMediaStagingRoot,
  listStagedEntityIds,
  readEffectiveManifest,
  type EffectiveMediaManifest,
} from '../../shared/media-asset-store';
import { isMediaDisplayable, type EffectiveMediaAsset } from '../../shared/media-decisions';

/**
 * Argument parsing and execution of scripts/media/review-assets.ts.
 * Kept out of the script so that it can be tested (vitest only collects src/**).
 */

export const REVIEW_USAGE = `Usage:
  node --import tsx scripts/media/review-assets.ts --entity <entityId> --asset <assetId> --allow|--block|--hold --reviewer <name>
        [--subject-is-person true|false] [--note <text>] [--out data/media-staging]
  node --import tsx scripts/media/review-assets.ts --list [--entity <entityId>] [--out data/media-staging]

  --allow    show the image. Needs --subject-is-person false and a --note saying what you checked by looking at it
  --block    never use the image. Needs a --note with the reason (--subject-is-person true when a person is the subject)
  --hold     put the image back on hold
  --list     print the effective decision of every staged asset (all entities unless --entity is given)

The decision is appended to data/media-staging/<entityId>/decisions.jsonl. manifest.json is never modified;
the latest line for an asset is the one in force.
`;

export interface ReviewOptions {
  mode: 'decide' | 'list' | 'help';
  entity: string | null;
  asset: string | null;
  decision: MediaRightsDecision | null;
  reviewer: string | null;
  subjectIsPerson: boolean | null;
  note: string;
  out: string;
}

export function parseReviewArgs(argv: readonly string[], defaultOut: string = defaultMediaStagingRoot()): ReviewOptions {
  const options: ReviewOptions = { mode: 'decide', entity: null, asset: null, decision: null, reviewer: null, subjectIsPerson: null, note: '', out: defaultOut };
  const decisions = new Set<MediaRightsDecision>();
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
        options.entity = value();
        break;
      case '--asset':
        options.asset = value();
        break;
      case '--allow':
        decisions.add('allowed');
        break;
      case '--block':
        decisions.add('blocked');
        break;
      case '--hold':
        decisions.add('held');
        break;
      case '--reviewer':
        options.reviewer = value().trim();
        break;
      case '--subject-is-person': {
        const raw = value();
        if (raw !== 'true' && raw !== 'false') throw new Error('--subject-is-person must be "true" or "false"');
        options.subjectIsPerson = raw === 'true';
        break;
      }
      case '--note':
        options.note = value().trim();
        break;
      case '--out':
        options.out = resolve(value());
        break;
      case '--list':
        options.mode = 'list';
        break;
      case '--help':
      case '-h':
        options.mode = 'help';
        break;
      default:
        throw new Error(`Unknown argument: ${arg}\n\n${REVIEW_USAGE}`);
    }
  }
  if (options.mode === 'help') return options;

  if (options.entity !== null && (options.entity.length > 128 || !MEDIA_ENTITY_ID_PATTERN.test(options.entity))) throw new Error(`Invalid entity id: ${options.entity}`);
  if (options.mode === 'list') return options;

  if (decisions.size > 1) throw new Error('Give exactly one of --allow, --block, --hold');
  options.decision = [...decisions][0] ?? null;
  if (options.entity === null) throw new Error(`--entity is required\n\n${REVIEW_USAGE}`);
  if (options.asset === null || !MEDIA_ASSET_ID_PATTERN.test(options.asset)) throw new Error(`--asset must be an asset id like ma_0123456789abcdef01234567\n\n${REVIEW_USAGE}`);
  if (options.decision === null) throw new Error(`Give one of --allow, --block, --hold\n\n${REVIEW_USAGE}`);
  if (!options.reviewer) throw new Error('--reviewer is required (who looked at the image)');
  if (options.decision === 'allowed') {
    if (options.subjectIsPerson !== false) throw new Error('--allow needs --subject-is-person false: look at the image and confirm that no person is its subject');
    if (!options.note) throw new Error('--allow needs a --note saying what you checked');
  }
  if (options.decision === 'blocked' && !options.note) throw new Error('--block needs a --note with the reason');
  return options;
}

const pad = (value: string, width: number) => value.padEnd(width);

/** One line per asset: what is in force and whether the UI may show it. */
export function formatEffectiveAsset(asset: EffectiveMediaAsset): string {
  const review = asset.review ? `${asset.review.reviewer} ${asset.review.reviewedAt}` : 'capture record';
  return [
    `  ${asset.assetId}`,
    pad(asset.kind, 19),
    pad(asset.rights.decision, 8),
    pad(`person=${asset.subjectIsPerson}`, 13),
    pad(isMediaDisplayable(asset) ? 'display=yes' : 'display=no', 11),
    review,
  ].join('  ');
}

export function formatEffectiveManifest(manifest: EffectiveMediaManifest): string[] {
  const lines = [`${manifest.entityId}  ${manifest.assets.length} assets, ${manifest.decisionCount} decision lines`];
  for (const asset of manifest.assets) lines.push(formatEffectiveAsset(asset));
  for (const problem of manifest.problems) lines.push(`  PROBLEM  ${problem}`);
  return lines;
}

export interface ReviewIo {
  log: (line: string) => void;
  now: () => Date;
}

/** Runs the parsed command. Returns the process exit code. */
export async function runReview(options: ReviewOptions, io: ReviewIo): Promise<number> {
  if (options.mode === 'help') {
    io.log(REVIEW_USAGE);
    return 0;
  }
  const store = { root: options.out };

  if (options.mode === 'list') {
    const ids = options.entity ? [options.entity] : await listStagedEntityIds(store);
    if (ids.length === 0) io.log(`no staged entities under ${options.out}`);
    let failed = false;
    for (const id of ids) {
      const manifest = await readEffectiveManifest(id, store);
      if (!manifest) {
        io.log(`${id}  no manifest.json`);
        failed = true;
        continue;
      }
      for (const line of formatEffectiveManifest(manifest)) io.log(line);
    }
    return failed ? 1 : 0;
  }

  const entity = options.entity as string;
  const assetId = options.asset as string;
  const before = await readEffectiveManifest(entity, store);
  const current = before?.assets.find((asset) => asset.assetId === assetId);
  if (!before || !current) throw new Error(`${assetId} is not in the manifest of ${entity}`);

  const { line, asset } = await appendMediaDecision(
    entity,
    {
      assetId,
      decision: options.decision as MediaRightsDecision,
      // --hold/--block without the flag keep what is currently in force; --allow was forced to false by the parser.
      subjectIsPerson: options.subjectIsPerson ?? current.subjectIsPerson,
      reviewer: options.reviewer as string,
      reviewedAt: io.now().toISOString(),
      note: options.note,
    },
    store,
  );
  io.log(`appended to ${entity}/decisions.jsonl:`);
  io.log(formatEffectiveAsset(asset));
  io.log(`(manifest.json unchanged; ${line.decision} by ${line.reviewer})`);
  return 0;
}
