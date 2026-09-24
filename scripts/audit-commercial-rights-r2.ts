import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { gunzipSync } from 'node:zlib';
import {
  getFoundationBucket,
  listR2Objects,
  readR2Object,
} from '../src/lib/storage/r2';
import { getDossierStoragePath } from '../src/lib/foundation/dossier-projection';
import { assessCommercialPublicProjection } from '../src/lib/foundation/publication-rights';

type Json = Record<string, unknown>;

const RESEARCH_BUNDLE_PREFIX = 'datasets/ds.business.research-bundles.derived/v1/';
const MAKE_MONEY_VIEW_PREFIX = 'views/make-money/v1/entities/';

const blockedHosts = [
  'indiehackers.com',
  'ebizfacts.com',
  'linkedin.com',
  'producthunt.com',
  'techcrunch.com',
  'reddit.com',
  'etsy.com',
];

const autoSafeHosts = [
  'e-stat.go.jp',
  'bls.gov',
];

function objectValue(value: unknown): Json | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Json
    : null;
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function host(value: string): string | null {
  try {
    return new URL(value).hostname.toLowerCase().replace(/^www\./, '').replace(/\.$/, '');
  } catch {
    return null;
  }
}

function hostMatches(value: string, suffixes: string[]): boolean {
  const h = host(value);
  return Boolean(h && suffixes.some((suffix) => h === suffix || h.endsWith(`.${suffix}`)));
}

function extractEvidenceUrls(entity: Json): string[] {
  const urls = new Set<string>();
  const add = (value: unknown) => {
    if (typeof value !== 'string') return;
    const direct = value.match(/https?:\/\/[^\s)\]>"']+/g) || [];
    direct.forEach((url) => urls.add(url.replace(/[.,;]+$/, '')));
  };

  const streams = Array.isArray(entity.observationsStream) ? entity.observationsStream : [];
  for (const item of streams) {
    const row = objectValue(item);
    if (!row) continue;
    add(row.sourceUrl);
    add(row.evidenceLocator);
  }

  const cards = Array.isArray(entity.evidenceCards) ? entity.evidenceCards : [];
  for (const item of cards) {
    const row = objectValue(item);
    if (!row) continue;
    add(row.sourceUrl);
    add(row.evidenceLocator);
    add(row.sourceNote);
  }

  const bindings = Array.isArray(entity.claimBindings) ? entity.claimBindings : [];
  for (const item of bindings) {
    const row = objectValue(item);
    if (!row) continue;
    add(row.sourceUrl);
    add(row.sourceDoc);
  }

  return [...urls].sort();
}

async function listAll(bucket: string, prefix: string) {
  const objects: Array<{ key: string; size: number }> = [];
  let cursor: string | undefined;
  for (let page = 0; page < 10000; page += 1) {
    const result = await listR2Objects({ bucket, prefix, cursor, limit: 1000 });
    objects.push(...result.objects.map((item) => ({ key: item.key, size: item.size })));
    if (!result.truncated || !result.cursor) return objects;
    cursor = result.cursor;
  }
  throw new Error(`R2 listing page safety limit exceeded for ${prefix}`);
}

async function mapConcurrent<T, R>(
  values: T[],
  concurrency: number,
  worker: (value: T, index: number) => Promise<R>,
): Promise<R[]> {
  const out = new Array<R>(values.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, Math.max(values.length, 1)) }, async () => {
    while (next < values.length) {
      const index = next++;
      out[index] = await worker(values[index], index);
    }
  }));
  return out;
}

async function auditFoundationViews(lake: string) {
  const bundleObjects = (await listAll(lake, RESEARCH_BUNDLE_PREFIX))
    .filter((item) => item.key.endsWith('.json'));

  const bundleRows = await mapConcurrent(bundleObjects, 8, async (item) => {
    const object = await readR2Object(lake, item.key);
    if (!object) return null;
    try {
      const bundle = JSON.parse(new TextDecoder().decode(object.body)) as Json;
      const runId = text(bundle.run_id);
      if (!runId) return null;
      return {
        run_id: runId,
        key: item.key,
        assessment: assessCommercialPublicProjection(bundle),
      };
    } catch (error) {
      return {
        run_id: null,
        key: item.key,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  const byRun = new Map(
    bundleRows
      .filter((row): row is NonNullable<typeof row> & { run_id: string; assessment: ReturnType<typeof assessCommercialPublicProjection> } =>
        Boolean(row && row.run_id && 'assessment' in row),
      )
      .map((row) => [row.run_id, row]),
  );

  const viewObjects = (await listAll(lake, MAKE_MONEY_VIEW_PREFIX))
    .filter((item) => item.key.endsWith('.json') && !item.key.includes('/_'));

  const views = await mapConcurrent(viewObjects, 8, async (item) => {
    const object = await readR2Object(lake, item.key);
    if (!object) return { key: item.key, status: 'NEEDS_RIGHTS_REVIEW', reason: 'object disappeared' };
    try {
      const doc = JSON.parse(new TextDecoder().decode(object.body)) as Json;
      const runs = Array.isArray(doc.source_run_ids)
        ? doc.source_run_ids.filter((value): value is string => typeof value === 'string')
        : [];
      const missing = runs.filter((runId) => !byRun.has(runId));
      const held = runs.filter((runId) => byRun.get(runId)?.assessment.status !== 'ALLOWED');
      const status =
        missing.length > 0 ? 'NEEDS_RIGHTS_REVIEW'
          : held.length > 0 ? 'INTERNAL_ONLY'
            : runs.length > 0 ? 'SAFE'
              : 'NEEDS_RIGHTS_REVIEW';
      return {
        key: item.key,
        entity_id: text(objectValue(doc.summary)?.id) || text(objectValue(doc.detail)?.id),
        status,
        source_run_ids: runs,
        missing_run_ids: missing,
        held_run_ids: held,
      };
    } catch (error) {
      return {
        key: item.key,
        status: 'NEEDS_RIGHTS_REVIEW',
        reason: error instanceof Error ? error.message : String(error),
      };
    }
  });

  return {
    canonical_bundle_count: bundleObjects.length,
    materialized_view_count: viewObjects.length,
    counts: Object.fromEntries(
      ['SAFE', 'NEEDS_RIGHTS_REVIEW', 'INTERNAL_ONLY'].map((status) => [
        status,
        views.filter((row) => row.status === status).length,
      ]),
    ),
    views,
  };
}

async function auditLegacyRelease(lake: string) {
  const release = JSON.parse(await readFile(resolve('data/catalog-release.json'), 'utf8')) as {
    sourceCount: number;
    publishedCount: number;
    details: Record<string, string>;
  };
  const registry = JSON.parse(await readFile(resolve('data/collected-registry.json'), 'utf8')) as Json[];
  const registryById = new Map(registry.map((row) => [text(row.id), row]));

  const entries = Object.entries(release.details);
  const rows = await mapConcurrent(entries, 8, async ([entityId, hash]) => {
    const key = getDossierStoragePath(entityId, hash);
    const object = await readR2Object(lake, key);
    if (!object) {
      return { entity_id: entityId, key, status: 'NEEDS_RIGHTS_REVIEW', reason: 'dossier missing' };
    }
    try {
      const entity = JSON.parse(gunzipSync(object.body).toString('utf8')) as Json;
      const urls = extractEvidenceUrls(entity);
      const registryRow = registryById.get(entityId);
      const batchId = text(registryRow?.batchId);
      const lineage = {
        ebizfacts_id: entityId.startsWith('ent_ebizfacts_'),
        indiehackers_batch: Boolean(batchId?.toLowerCase().includes('indiehackers')),
        ebizfacts_batch: Boolean(batchId?.toLowerCase().includes('ebizfacts')),
      };
      const blocked = urls.filter((url) => hostMatches(url, blockedHosts));
      const allAutoSafe = urls.length > 0 && urls.every((url) => hostMatches(url, autoSafeHosts));
      const status =
        blocked.length > 0 ? 'INTERNAL_ONLY'
          : allAutoSafe ? 'SAFE'
            : 'NEEDS_RIGHTS_REVIEW';
      return {
        entity_id: entityId,
        key,
        batch_id: batchId,
        status,
        evidence_urls: urls,
        blocked_evidence_urls: blocked,
        lineage,
      };
    } catch (error) {
      return {
        entity_id: entityId,
        key,
        status: 'NEEDS_RIGHTS_REVIEW',
        reason: error instanceof Error ? error.message : String(error),
      };
    }
  });

  return {
    source_count: release.sourceCount,
    published_count: release.publishedCount,
    audited_count: rows.length,
    counts: Object.fromEntries(
      ['SAFE', 'NEEDS_RIGHTS_REVIEW', 'INTERNAL_ONLY'].map((status) => [
        status,
        rows.filter((row) => row.status === status).length,
      ]),
    ),
    lineage_counts: {
      ebizfacts_id: rows.filter((row) => objectValue(row.lineage)?.ebizfacts_id === true).length,
      indiehackers_batch: rows.filter((row) => objectValue(row.lineage)?.indiehackers_batch === true).length,
      ebizfacts_batch: rows.filter((row) => objectValue(row.lineage)?.ebizfacts_batch === true).length,
    },
    dossiers: rows,
  };
}

async function main() {
  const lake = getFoundationBucket('lake');
  const startedAt = new Date().toISOString();
  const [foundation, legacy] = await Promise.all([
    auditFoundationViews(lake),
    auditLegacyRelease(lake),
  ]);
  const report = {
    schema_version: 'make-money-commercial-rights-r2-audit.v1',
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    bucket: lake,
    rule: 'Fail closed. SAFE requires explicit approved policy for Foundation bundles or only auto-safe evidence hosts for legacy dossiers. Lineage alone is review priority, not a deletion verdict.',
    foundation,
    legacy,
  };

  const output = resolve(
    process.argv[2] || 'reports/runtime/commercial-rights-r2-audit-latest.json',
  );
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify(report, null, 2) + '\n', 'utf8');

  console.log(JSON.stringify({
    output,
    foundation: {
      canonical_bundle_count: foundation.canonical_bundle_count,
      materialized_view_count: foundation.materialized_view_count,
      counts: foundation.counts,
    },
    legacy: {
      published_count: legacy.published_count,
      audited_count: legacy.audited_count,
      counts: legacy.counts,
      lineage_counts: legacy.lineage_counts,
    },
  }, null, 2));
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
