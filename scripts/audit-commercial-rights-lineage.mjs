import fs from 'node:fs';

const release = JSON.parse(fs.readFileSync(new URL('../data/catalog-release.json', import.meta.url), 'utf8'));
const registry = JSON.parse(fs.readFileSync(new URL('../data/collected-registry.json', import.meta.url), 'utf8'));

const published = new Set(Object.keys(release.details || {}));
const rows = registry.filter((row) => published.has(row.id));
const batchCounts = new Map();
const domainCounts = new Map();

for (const row of rows) {
  batchCounts.set(row.batchId || '(none)', (batchCounts.get(row.batchId || '(none)') || 0) + 1);
  const domain = String(row.domain || '(none)').toLowerCase();
  domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1);
}

const result = {
  generated_at: new Date().toISOString(),
  source_count: release.sourceCount,
  published_count: published.size,
  registry_match_count: rows.length,
  registry_missing_count: published.size - rows.length,
  lineage_risk: {
    ebizfacts_id_prefix: rows.filter((row) => String(row.id).startsWith('ent_ebizfacts_')).length,
    primary_mubs: rows.filter((row) => row.batchId === 'Primary_MUBS_1000').length,
    primary_mubs_with_ebizfacts_prefix: rows.filter(
      (row) => row.batchId === 'Primary_MUBS_1000' && String(row.id).startsWith('ent_ebizfacts_'),
    ).length,
    indiehackers_batches: rows.filter((row) => String(row.batchId || '').toLowerCase().includes('indiehackers')).length,
    explicit_ebizfacts_batches: rows.filter((row) => String(row.batchId || '').toLowerCase().includes('ebizfacts')).length,
  },
  top_batches: [...batchCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30),
  top_domains: [...domainCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 50),
  note: 'Lineage indicates review priority only. Final public-rights status must be based on each current dossier Evidence and its registered rights policy.',
};

process.stdout.write(JSON.stringify(result, null, 2) + '\n');
