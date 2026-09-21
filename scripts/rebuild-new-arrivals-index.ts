import {
  getFoundationBucket,
  getFoundationBucketAsync,
  getFromR2,
  listR2Objects,
} from '../src/lib/storage/r2';
import {
  mergeNewArrivalsIndexContributions,
  writeNewArrivalsIndex,
} from '../src/lib/foundation/new-arrivals-index';
import {
  NEW_ARRIVALS_PREFIX,
  parseNewArrivalsContribution,
  type NewArrivalsContribution,
} from '../src/lib/foundation/new-arrivals';

const LOOKBACK_DAYS = 3;
const MAX_LIST_PAGES_PER_DAY = 25;
const READ_CONCURRENCY = 20;

function dateKey(value: Date): string {
  const shifted = new Date(value.getTime() + 9 * 60 * 60 * 1000);
  return [
    String(shifted.getUTCFullYear()).padStart(4, '0'),
    String(shifted.getUTCMonth() + 1).padStart(2, '0'),
    String(shifted.getUTCDate()).padStart(2, '0'),
  ].join('/');
}

async function readContributions(keys: string[], bucket: string): Promise<NewArrivalsContribution[]> {
  const values: Array<NewArrivalsContribution | null> = new Array(keys.length).fill(null);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(READ_CONCURRENCY, keys.length) }, async () => {
    while (next < keys.length) {
      const index = next++;
      const raw = await getFromR2(keys[index], bucket);
      if (!raw) continue;
      try {
        values[index] = parseNewArrivalsContribution(JSON.parse(raw));
      } catch {
        values[index] = null;
      }
    }
  }));
  return values.filter((value): value is NewArrivalsContribution => Boolean(value));
}

async function main() {
  const bucket = await getFoundationBucketAsync('lake');
  const now = new Date();
  const keys = new Set<string>();
  for (let offset = 0; offset <= LOOKBACK_DAYS; offset += 1) {
    const date = new Date(now.getTime() - offset * 24 * 60 * 60 * 1000);
    let cursor: string | undefined;
    for (let pageNumber = 0; pageNumber < MAX_LIST_PAGES_PER_DAY; pageNumber += 1) {
      const page = await listR2Objects({
        bucket,
        prefix: `${NEW_ARRIVALS_PREFIX}${dateKey(date)}/`,
        cursor,
        limit: 1000,
      });
      page.objects.forEach((item) => {
        if (item.key.endsWith('.json')) keys.add(item.key);
      });
      if (!page.truncated || !page.cursor) break;
      cursor = page.cursor;
    }
  }

  const contributions = await readContributions([...keys], bucket);
  const index = mergeNewArrivalsIndexContributions(contributions, now);
  const result = await writeNewArrivalsIndex(index);
  console.log(JSON.stringify({
    bucket: getFoundationBucket('lake'),
    contribution_objects: keys.size,
    valid_contributions: contributions.length,
    indexed_editions: index.editions.length,
    write_status: result.status,
    readback_verified: result.readback,
  }));
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
