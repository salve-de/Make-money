import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { gunzipSync } from 'node:zlib';
import {
  getFoundationBucket,
  listR2Objects,
  readR2Object,
} from '../src/lib/storage/r2';
import { getDossierStoragePath } from '../src/lib/foundation/dossier-projection';
import { buildCommercialPublicFactProjection } from '../src/lib/foundation/publication-rights';
import {
  buildFoundationBusinessCaseForEntity,
  type FoundationEntitySummary,
} from '../src/lib/foundation/business-reader';

type Json = Record<string, unknown>;
type AuditStatus = 'SAFE' | 'NEEDS_RIGHTS_REVIEW' | 'INTERNAL_ONLY';
type RecordGroup =
  | 'claims'
  | 'metrics'
  | 'moneySignals'
  | 'events'
  | 'relationships'
  | 'observations';

type BundleAuditRow = {
  run_id: string;
  key: string;
  retrieved_at: string | null;
  bundle: Json;
  public_bundle: Json | null;
  assessment: ReturnType<typeof buildCommercialPublicFactProjection>['assessment'];
};

const RESEARCH_BUNDLE_PREFIX = 'datasets/ds.business.research-bundles.derived/v1/';
const MAKE_MONEY_VIEW_PREFIX = 'views/make-money/v1/entities/';
const RECORD_GROUPS: readonly RecordGroup[] = [
  'claims',
  'metrics',
  'moneySignals',
  'events',
  'relationships',
  'observations',
];

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

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
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

function normalizeForAudit(value: unknown): unknown {
  if (Array.isArray(value)) {
    const normalized = value.map(normalizeForAudit);
    return normalized.every((item) => typeof item === 'string')
      ? [...normalized].sort()
      : normalized;
  }
  const object = objectValue(value);
  if (!object) return value;
  return Object.fromEntries(
    Object.keys(object)
      .sort()
      .map((key) => [key, normalizeForAudit(object[key])]),
  );
}

function fingerprint(value: unknown): string {
  return JSON.stringify(normalizeForAudit(value));
}

function typedRecordSetFromBundle(bundle: Json): Json | undefined {
  const observations = Array.isArray(bundle.observations)
    ? bundle.observations.map(objectValue).filter((value): value is Json => Boolean(value))
    : [];
  const transports = observations
    .filter((value) => text(value.observation_type) === 'transport.typed_record_set_v1')
    .map((value) => objectValue(value.transport_typed_record_set_v1))
    .filter((value): value is Json => Boolean(value));
  return transports.length === 1 ? transports[0] : undefined;
}

function baseSummaryFromView(doc: Json): FoundationEntitySummary | null {
  const detail = objectValue(doc.detail);
  const summary = objectValue(doc.summary);
  const id = text(detail?.id) || text(summary?.id);
  const name = text(detail?.name) || text(summary?.name);
  if (!id || !name) return null;
  return {
    id,
    name,
    entityType: text(detail?.entityType) || text(summary?.entityType) || 'unknown',
    aliases: stringArray(detail?.aliases ?? summary?.aliases),
    canonicalIdentifier: text(detail?.canonicalIdentifier) || text(summary?.canonicalIdentifier),
    domain: text(detail?.domain) || text(summary?.domain),
    status: text(detail?.status) || text(summary?.status) || 'unknown',
    observedAt: text(detail?.observedAt) || text(summary?.observedAt),
    evidenceIds: stringArray(detail?.evidenceIds ?? summary?.evidenceIds),
  };
}

function publicIdentityMatches(
  publicBundle: Json,
  summary: FoundationEntitySummary,
): { matched: boolean; allowedEvidenceIds: string[] } {
  const candidates = (Array.isArray(publicBundle.entities) ? publicBundle.entities : [])
    .map(objectValue)
    .filter((value): value is Json => Boolean(value))
    .filter((value) => text(value.entity_id) === summary.id);

  for (const candidate of candidates) {
    const canonicalName = text(candidate.canonical_name);
    const aliases = stringArray(candidate.aliases);
    const candidateDomain = text(candidate.domain);
    const candidateIdentifier = text(candidate.canonical_identifier);
    const evidenceIds = stringArray(candidate.evidence_ids);
    const nameMatches = canonicalName === summary.name || aliases.includes(summary.name);
    const domainMatches = !summary.domain || candidateDomain === summary.domain;
    const identifierMatches =
      !summary.canonicalIdentifier || candidateIdentifier === summary.canonicalIdentifier;
    if (nameMatches && domainMatches && identifierMatches && evidenceIds.length > 0) {
      return { matched: true, allowedEvidenceIds: evidenceIds };
    }
  }
  return { matched: false, allowedEvidenceIds: [] };
}

function currentRecordRows(detail: Json, group: RecordGroup): Json[] {
  const values = Array.isArray(detail[group]) ? detail[group] : [];
  return values.map(objectValue).filter((value): value is Json => Boolean(value));
}

function recordEvidenceIds(record: Json): string[] {
  return stringArray(record.evidenceIds);
}

async function listAll(bucket: string, prefix: string) {
  const objects: Array<{ key: string; size: number }> = [];
  let cursor: string | undefined;
  for (let page = 0; page < 10000; page += 1) {
    const result = await listR2Objects({ bucket, prefix, cursor, limit: 1000 });
    objects.push(...result.objects.map((item) => ({ key: item.key, size: item.size ?? 0 })));
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

  const bundleRows = await mapConcurrent(bundleObjects, 8, async (item): Promise<BundleAuditRow | null> => {
    const object = await readR2Object(lake, item.key);
    if (!object) return null;
    try {
      const bundle = JSON.parse(new TextDecoder().decode(object.body)) as Json;
      const runId = text(bundle.run_id);
      if (!runId) return null;
      const typedRecordSet = typedRecordSetFromBundle(bundle);
      const projection = buildCommercialPublicFactProjection(bundle, typedRecordSet);
      return {
        run_id: runId,
        key: item.key,
        retrieved_at: text(bundle.retrieved_at),
        bundle,
        public_bundle: projection.bundle,
        assessment: projection.assessment,
      };
    } catch {
      return null;
    }
  });

  const byRun = new Map(
    bundleRows
      .filter((row): row is BundleAuditRow => Boolean(row))
      .map((row) => [row.run_id, row]),
  );

  const viewObjects = (await listAll(lake, MAKE_MONEY_VIEW_PREFIX))
    .filter((item) => item.key.endsWith('.json') && !item.key.includes('/_'));

  const views = await mapConcurrent(viewObjects, 8, async (item) => {
    const object = await readR2Object(lake, item.key);
    if (!object) {
      return { key: item.key, status: 'NEEDS_RIGHTS_REVIEW' as AuditStatus, reason: 'object disappeared' };
    }

    try {
      const doc = JSON.parse(new TextDecoder().decode(object.body)) as Json;
      const detail = objectValue(doc.detail);
      const summary = baseSummaryFromView(doc);
      const runs = Array.isArray(doc.source_run_ids)
        ? doc.source_run_ids.filter((value): value is string => typeof value === 'string')
        : [];
      if (!detail || !summary || runs.length === 0) {
        return {
          key: item.key,
          entity_id: summary?.id || null,
          status: 'NEEDS_RIGHTS_REVIEW' as AuditStatus,
          reason: 'view lacks detail, public identity, or source_run_ids',
        };
      }

      const missingRunIds = runs.filter((runId) => !byRun.has(runId));
      if (missingRunIds.length > 0) {
        return {
          key: item.key,
          entity_id: summary.id,
          status: 'NEEDS_RIGHTS_REVIEW' as AuditStatus,
          source_run_ids: runs,
          missing_run_ids: missingRunIds,
          reason: 'one or more source runs cannot be audited against canonical bundles',
        };
      }

      const runRows = runs
        .map((runId) => byRun.get(runId))
        .filter((row): row is BundleAuditRow => Boolean(row))
        .sort((left, right) =>
          Date.parse(left.retrieved_at || '') - Date.parse(right.retrieved_at || ''),
        );

      const expectedByGroup = new Map<RecordGroup, Map<string, string>>(
        RECORD_GROUPS.map((group) => [group, new Map<string, string>()]),
      );
      const allowedEvidence = new Set<string>();
      const heldEvidence = new Set<string>();
      const publicIdentityEvidence = new Set<string>();
      let identityProven = false;
      const fullyHeldRunIds: string[] = [];
      const mixedRightsRunIds: string[] = [];

      for (const row of runRows) {
        row.assessment.allowedEvidenceIds.forEach((id) => allowedEvidence.add(id));
        row.assessment.heldEvidenceIds.forEach((id) => heldEvidence.add(id));
        if (row.assessment.heldEvidenceIds.length > 0) mixedRightsRunIds.push(row.run_id);
        if (!row.public_bundle) {
          fullyHeldRunIds.push(row.run_id);
          continue;
        }

        const identity = publicIdentityMatches(row.public_bundle, summary);
        if (identity.matched) {
          identityProven = true;
          identity.allowedEvidenceIds.forEach((id) => publicIdentityEvidence.add(id));
        }

        const expectedCase = buildFoundationBusinessCaseForEntity(
          row.public_bundle,
          summary,
        );
        for (const group of RECORD_GROUPS) {
          const map = expectedByGroup.get(group)!;
          for (const record of expectedCase[group]) {
            map.set(record.id, fingerprint(record));
          }
        }
      }

      const heldOnlyEvidence = new Set(
        [...heldEvidence].filter((id) => !allowedEvidence.has(id)),
      );
      const displayedEvidence = new Set<string>(summary.evidenceIds);
      const unboundRecords: Array<{ group: RecordGroup | 'derived'; id: string | null }> = [];
      const heldEvidenceRecords: Array<{ group: RecordGroup | 'entity'; id: string | null; evidence_ids: string[] }> = [];
      let displayedRecordCount = 0;

      for (const group of RECORD_GROUPS) {
        const expected = expectedByGroup.get(group)!;
        for (const record of currentRecordRows(detail, group)) {
          displayedRecordCount += 1;
          const id = text(record.id);
          const evidenceIds = recordEvidenceIds(record);
          evidenceIds.forEach((evidenceId) => displayedEvidence.add(evidenceId));
          const heldIds = evidenceIds.filter((evidenceId) => heldOnlyEvidence.has(evidenceId));
          if (heldIds.length > 0) {
            heldEvidenceRecords.push({ group, id, evidence_ids: heldIds });
          }
          if (!id || expected.get(id) !== fingerprint(record)) {
            unboundRecords.push({ group, id });
          }
        }
      }

      const derived = Array.isArray(detail.derived)
        ? detail.derived.map(objectValue).filter((value): value is Json => Boolean(value))
        : [];
      for (const record of derived) {
        displayedRecordCount += 1;
        unboundRecords.push({ group: 'derived', id: text(record.id) });
      }

      const heldIdentityEvidence = summary.evidenceIds
        .filter((id) => heldOnlyEvidence.has(id));
      if (heldIdentityEvidence.length > 0) {
        heldEvidenceRecords.push({
          group: 'entity',
          id: summary.id,
          evidence_ids: heldIdentityEvidence,
        });
      }

      const identityEvidenceUnbound = summary.evidenceIds
        .filter((id) => !publicIdentityEvidence.has(id));

      let status: AuditStatus;
      let reason: string;
      if (heldEvidenceRecords.length > 0) {
        status = 'INTERNAL_ONLY';
        reason = 'currently displayed public record/entity references evidence that is not public-eligible under the current rights gate';
      } else if (
        displayedRecordCount === 0 ||
        unboundRecords.length > 0 ||
        !identityProven ||
        identityEvidenceUnbound.length > 0
      ) {
        status = 'NEEDS_RIGHTS_REVIEW';
        reason = 'public view cannot yet be fully reconstructed record-by-record from the current rights-cleared projection';
      } else {
        status = 'SAFE';
        reason = 'every displayed record exactly matches a current rights-cleared projected record and the displayed identity is backed by a rights-cleared public Entity row';
      }

      return {
        key: item.key,
        entity_id: summary.id,
        status,
        reason,
        source_run_ids: runs,
        fully_held_run_ids: fullyHeldRunIds,
        mixed_rights_run_ids: mixedRightsRunIds,
        displayed_record_count: displayedRecordCount,
        unbound_records: unboundRecords,
        held_evidence_records: heldEvidenceRecords,
        identity_proven: identityProven,
        identity_unbound_evidence_ids: identityEvidenceUnbound,
        displayed_evidence_ids: [...displayedEvidence].sort(),
      };
    } catch (error) {
      return {
        key: item.key,
        status: 'NEEDS_RIGHTS_REVIEW' as AuditStatus,
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
    safe_definition:
      'SAFE is record-level: every displayed record must exactly reconstruct from the current rights-cleared public projection and public identity must be backed by a rights-cleared Entity row.',
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
      return { entity_id: entityId, key, status: 'NEEDS_RIGHTS_REVIEW' as AuditStatus, reason: 'dossier missing' };
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
      const allAutoSafeHosts = urls.length > 0 && urls.every((url) => hostMatches(url, autoSafeHosts));

      // Legacy dossiers predate the record-level rights projection contract.
      // Hostnames alone cannot prove which source supports each displayed field,
      // so they are never automatically labeled SAFE by this audit.
      const status: AuditStatus = blocked.length > 0
        ? 'INTERNAL_ONLY'
        : 'NEEDS_RIGHTS_REVIEW';

      return {
        entity_id: entityId,
        key,
        batch_id: batchId,
        status,
        reason: blocked.length > 0
          ? 'legacy dossier contains evidence URLs from a currently blocked/restricted source family'
          : 'legacy dossier lacks field-level evidence-to-public-record rights bindings; hostname review is only a triage signal',
        evidence_urls: urls,
        blocked_evidence_urls: blocked,
        all_evidence_urls_on_auto_safe_hosts: allAutoSafeHosts,
        lineage,
      };
    } catch (error) {
      return {
        entity_id: entityId,
        key,
        status: 'NEEDS_RIGHTS_REVIEW' as AuditStatus,
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
    safe_definition:
      'Legacy dossiers are never auto-SAFE because the old format does not prove field-level evidence-to-public-record rights bindings.',
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
    schema_version: 'make-money-commercial-rights-r2-audit.v2',
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    bucket: lake,
    rule:
      'Fail closed. Foundation SAFE requires record-level reconstruction from the current rights-cleared projection plus rights-cleared public identity. Legacy dossiers are never auto-SAFE; host/lineage signals only prioritize review.',
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
