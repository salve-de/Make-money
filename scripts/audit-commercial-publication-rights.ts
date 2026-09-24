import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

type UnknownRecord = Record<string, unknown>;

type AuditClass =
  | 'PUBLIC_FACT_CANDIDATE'
  | 'NEEDS_CANONICAL_SOURCE'
  | 'RIGHTS_STATUS_BLOCKED'
  | 'UNREVIEWED';

const DISCOVERY_ONLY_HOSTS = [
  'linkedin.com',
  'producthunt.com',
  'techcrunch.com',
  'reddit.com',
  'medium.com',
  'flippa.com',
  'reuters.com',
  'reutersagency.com',
  'etsy.com',
  'aws.amazon.com',
  'threads.com',
];

const OPEN_FACT_HOSTS = [
  'e-stat.go.jp',
  'info.gbiz.go.jp',
  'bls.gov',
  'eia.gov',
  'census.gov',
  'find-and-update.company-information.service.gov.uk',
];

function objectValue(value: unknown): UnknownRecord | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as UnknownRecord
    : null;
}

function hostFromUrl(value: string): string | null {
  try {
    return new URL(value).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}

function hostMatches(host: string, suffix: string): boolean {
  return host === suffix || host.endsWith(`.${suffix}`);
}

function collectStrings(value: unknown, result: string[] = [], depth = 0): string[] {
  if (depth > 12) return result;
  if (typeof value === 'string') {
    result.push(value);
    return result;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectStrings(item, result, depth + 1));
    return result;
  }
  const object = objectValue(value);
  if (object) Object.values(object).forEach((item) => collectStrings(item, result, depth + 1));
  return result;
}

function collectRightsStatuses(value: unknown, result: string[] = [], depth = 0): string[] {
  if (depth > 12) return result;
  const object = objectValue(value);
  if (object) {
    for (const [key, item] of Object.entries(object)) {
      if ((key === 'rights_status' || key === 'rightsStatus') && typeof item === 'string') result.push(item);
      collectRightsStatuses(item, result, depth + 1);
    }
  } else if (Array.isArray(value)) {
    value.forEach((item) => collectRightsStatuses(item, result, depth + 1));
  }
  return result;
}

function classify(entity: unknown, fallbackUrl?: string): {
  classification: AuditClass;
  hosts: string[];
  restricted_hosts: string[];
  open_hosts: string[];
  rights_statuses: string[];
} {
  const strings = collectStrings(entity);
  if (fallbackUrl) strings.push(fallbackUrl);
  const hosts = [...new Set(strings
    .filter((value) => /^https?:\/\//i.test(value))
    .map(hostFromUrl)
    .filter((value): value is string => Boolean(value)))].sort();
  const restrictedHosts = hosts.filter((host) => DISCOVERY_ONLY_HOSTS.some((suffix) => hostMatches(host, suffix)));
  const openHosts = hosts.filter((host) => OPEN_FACT_HOSTS.some((suffix) => hostMatches(host, suffix)));
  const rightsStatuses = [...new Set(collectRightsStatuses(entity))].sort();

  if (rightsStatuses.some((status) => ['blocked', 'pending_review'].includes(status))) {
    return { classification: 'RIGHTS_STATUS_BLOCKED', hosts, restricted_hosts: restrictedHosts, open_hosts: openHosts, rights_statuses: rightsStatuses };
  }
  if (restrictedHosts.length > 0 && openHosts.length === 0) {
    return { classification: 'NEEDS_CANONICAL_SOURCE', hosts, restricted_hosts: restrictedHosts, open_hosts: openHosts, rights_statuses: rightsStatuses };
  }
  if (openHosts.length > 0 && restrictedHosts.length === 0) {
    return { classification: 'PUBLIC_FACT_CANDIDATE', hosts, restricted_hosts: restrictedHosts, open_hosts: openHosts, rights_statuses: rightsStatuses };
  }
  return { classification: 'UNREVIEWED', hosts, restricted_hosts: restrictedHosts, open_hosts: openHosts, rights_statuses: rightsStatuses };
}

export async function auditCommercialPublicationRights(root = process.cwd()) {
  const [entitiesText, manifestText, pendingText] = await Promise.all([
    readFile(resolve(root, 'data/entities-index.json'), 'utf8'),
    readFile(resolve(root, 'data/catalog-release.json'), 'utf8'),
    readFile(resolve(root, 'data/pending_entities_to_curate.json'), 'utf8'),
  ]);
  const entities = JSON.parse(entitiesText) as unknown[];
  const manifest = JSON.parse(manifestText) as { details?: Record<string, string>; publishedCount?: number };
  const pending = JSON.parse(pendingText) as Array<{ id?: string; url?: string }>;
  const pendingUrl = new Map(pending
    .filter((row) => typeof row.id === 'string')
    .map((row) => [row.id as string, typeof row.url === 'string' ? row.url : '']));
  const releaseIds = new Set(Object.keys(manifest.details || {}));
  const rows = entities
    .map((entity) => ({ entity, object: objectValue(entity) }))
    .filter((row) => row.object && typeof row.object.id === 'string' && releaseIds.has(row.object.id as string))
    .map((row) => {
      const id = row.object!.id as string;
      return {
        id,
        name: typeof row.object!.name === 'string' ? row.object!.name : id,
        ...classify(row.entity, pendingUrl.get(id)),
      };
    });

  const counts: Record<AuditClass, number> = {
    PUBLIC_FACT_CANDIDATE: 0,
    NEEDS_CANONICAL_SOURCE: 0,
    RIGHTS_STATUS_BLOCKED: 0,
    UNREVIEWED: 0,
  };
  rows.forEach((row) => { counts[row.classification] += 1; });
  const topRestrictedHosts = new Map<string, number>();
  rows.forEach((row) => row.restricted_hosts.forEach((host) => topRestrictedHosts.set(host, (topRestrictedHosts.get(host) || 0) + 1)));

  return {
    schema_version: 'make-money-commercial-rights-audit.v1',
    audited_at: new Date().toISOString(),
    source_count: entities.length,
    release_manifest_count: manifest.publishedCount ?? releaseIds.size,
    audited_release_rows: rows.length,
    counts,
    restricted_host_counts: [...topRestrictedHosts.entries()].sort((a, b) => b[1] - a[1]),
    examples: {
      needs_canonical_source: rows.filter((row) => row.classification === 'NEEDS_CANONICAL_SOURCE').slice(0, 100),
      rights_status_blocked: rows.filter((row) => row.classification === 'RIGHTS_STATUS_BLOCKED').slice(0, 100),
      unreviewed: rows.filter((row) => row.classification === 'UNREVIEWED').slice(0, 100),
    },
  };
}

async function main() {
  const audit = await auditCommercialPublicationRights();
  const text = JSON.stringify(audit, null, 2);
  if (process.argv.includes('--write')) {
    await mkdir('reports', { recursive: true });
    await writeFile('reports/commercial-rights-audit-latest.json', `${text}\n`);
  }
  console.log(text);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  void main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
