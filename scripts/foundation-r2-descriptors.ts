import { readFile, readdir, writeFile } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import {
  getFoundationBucket,
  preflightR2Object,
  putR2ObjectCreateOnly,
  sha256Hex,
  R2ObjectConflictError,
  type FoundationBucketRole,
} from '../src/lib/storage/r2';

type FileRow = { local_path: string; bucket_role: FoundationBucketRole; bucket: string; key: string; content_type: string; body: string };
const bucketDirToRole: Record<string, FoundationBucketRole> = {
  'foundation-raw': 'raw',
  'foundation-lake': 'lake',
  'foundation-restricted': 'restricted',
  'foundation-public': 'public',
};

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(path));
    else out.push(path);
  }
  return out;
}

async function main() {
  const [mode, output] = process.argv.slice(2);
  if (!['prepare', 'ingest'].includes(mode) || !output) {
    throw new Error('Usage: foundation-r2-descriptors.ts prepare|ingest RECEIPT.json');
  }
  const canonical = process.env.FOUNDATION_REPO;
  if (!canonical) throw new Error('Set FOUNDATION_REPO to an authenticated clone of salve-de/universal-foundation');
  const root = resolve(canonical, 'r2-descriptors');
  const ajv = new Ajv2020({ allErrors: true, strict: false }); addFormats(ajv);
  const manifestSchema = JSON.parse(await readFile(resolve(canonical, 'schemas/foundation/r2-prefix-manifest.v1.schema.json'), 'utf8'));
  const plannedSchema = JSON.parse(await readFile(resolve(canonical, 'schemas/foundation/planned-writes.v1.schema.json'), 'utf8'));
  const validateManifest = ajv.compile(manifestSchema); const validatePlan = ajv.compile(plannedSchema);

  const files: FileRow[] = [];
  for (const path of await walk(root)) {
    const rel = relative(root, path).split(sep).join('/');
    const [bucketDir, ...keyParts] = rel.split('/');
    const role = bucketDirToRole[bucketDir]; if (!role) throw new Error(`Unknown descriptor bucket directory: ${bucketDir}`);
    const key = keyParts.join('/');
    if (!/^(.+\/)?_(README|manifest)\.v\d+\.(md|json)$/.test(key)) throw new Error(`Unexpected descriptor file: ${rel}`);
    const body = await readFile(path, 'utf8');
    if (key.endsWith('.json')) {
      const parsed = JSON.parse(body); if (!validateManifest(parsed)) throw new Error(`${rel}: ${JSON.stringify(validateManifest.errors)}`);
    }
    files.push({ local_path: rel, bucket_role: role, bucket: getFoundationBucket(role), key, content_type: key.endsWith('.md') ? 'text/markdown; charset=utf-8' : 'application/json; charset=utf-8', body });
  }

  const objects = [] as Record<string, unknown>[];
  for (const file of files) objects.push({
    logical_role: 'r2_descriptor', dataset_id: null, bucket: file.bucket, key: file.key,
    content_sha256: await sha256Hex(file.body), bytes: new TextEncoder().encode(file.body).byteLength,
    content_type: file.content_type, create_only: true, source_evidence_ids: [], local_path: file.local_path, preflight_status: 'NOT_CHECKED'
  });
  const runId = `run_r2_descriptors_${new Date().toISOString().replace(/[-:.TZ]/g, '')}`;
  const plan = {
    schema_version: 'planned-writes.v1', run_id: runId, write_authorized: mode === 'ingest', objects,
    forbidden_operations: ['CopyObject','DeleteObject','Move','Rename','Overwrite','LegacyUniversalMutation']
  };
  if (!validatePlan(plan)) throw new Error(JSON.stringify(validatePlan.errors));
  await writeFile(resolve(output), JSON.stringify({ planned_writes: plan }, null, 2), { flag: 'wx' });
  if (mode === 'prepare') { console.log(JSON.stringify({ descriptors: files.length, planned: objects.length })); return; }
  if (process.env.FOUNDATION_DESCRIPTOR_WRITE_AUTHORIZED !== 'true') throw new Error('Set FOUNDATION_DESCRIPTOR_WRITE_AUTHORIZED=true for descriptor materialization');

  for (const file of files) {
    const pre = await preflightR2Object({ bucket: file.bucket, key: file.key, body: file.body, contentType: file.content_type });
    const item = objects.find(x => x.bucket === file.bucket && x.key === file.key); if (item) item.preflight_status = pre.status;
    if (pre.status === 'EXISTS_CONFLICT') throw new R2ObjectConflictError(pre.bucket, pre.key);
  }
  const results = [];
  for (const file of files) results.push(await putR2ObjectCreateOnly({
    bucket: file.bucket, key: file.key, body: file.body, contentType: file.content_type,
    metadata: { 'foundation-run-id': runId, 'foundation-schema-version': file.key.endsWith('.json') ? 'r2-prefix-manifest.v1' : 'r2-prefix-readme.v1' }
  }));
  await writeFile(`${resolve(output)}.result.json`, JSON.stringify({ planned_writes: plan, results }, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ descriptors: files.length, created: results.filter(x => x.status === 'CREATED').length, identical: results.filter(x => x.status === 'EXISTS_IDENTICAL').length }));
}

main().catch(error => { console.error(error instanceof Error ? error.message : 'Descriptor materialization failed'); process.exitCode = 1; });
