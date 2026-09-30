/**
 * ローカルミラー（data/r2-local/<bucket>/<key>）を R2 へ create-only で複製し、直後に読み戻して SHA-256 を照合する。
 * ALLOW_LOCAL_R2_FALLBACK=1 で取り込んだ journal / raw を、後から本来の保存先へ届けるための再生スクリプト。
 *
 * 使い方: node scripts/with-r2-keychain-secrets.mjs node --import tsx scripts/reaudit/replay-local-mirror.ts [--dry-run] [--only <key-prefix>]
 *   対象バケットは foundation-raw と foundation-lake だけ（data/r2-local 内の他のディレクトリは無視する）。
 *   既に同じキーがある場合は create-only の結果（CONFLICT）をそのまま報告し、上書きしない。
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { getFoundationBucket, getFromR2, isR2ConfiguredAsync, putR2ObjectCreateOnly } from '../../src/lib/storage/r2';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const onlyIdx = args.indexOf('--only');
const only = onlyIdx >= 0 ? args[onlyIdx + 1] : '';
const ROOT = resolve(process.cwd(), 'data/r2-local');
const BUCKETS = [getFoundationBucket('raw'), getFoundationBucket('lake')];

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function contentTypeFor(key: string): string {
  if (key.endsWith('.json')) return 'application/json; charset=utf-8';
  if (key.endsWith('.html')) return 'text/html; charset=utf-8';
  if (key.endsWith('.txt')) return 'text/plain; charset=utf-8';
  return 'application/octet-stream';
}

async function main() {
  const summary = { created: 0, conflict: 0, failed: 0, skipped: 0 };
  for (const bucket of BUCKETS) {
    const base = join(ROOT, bucket);
    let files: string[] = [];
    try { files = walk(base); } catch { console.log(`(no local mirror for ${bucket})`); continue; }
    if (!dryRun && !(await isR2ConfiguredAsync(bucket))) { console.error(`!! R2 is not configured for ${bucket}; run through scripts/with-r2-keychain-secrets.mjs`); process.exit(2); }
    for (const file of files.sort()) {
      const key = relative(base, file).split('\\').join('/');
      if (only && !key.startsWith(only)) { summary.skipped += 1; continue; }
      const body = readFileSync(file, 'utf8');
      const sha = createHash('sha256').update(body).digest('hex');
      const metadata: Record<string, string> = { 'foundation-sha256': sha };
      if (key.startsWith('journal/v1/')) {
        try {
          const parsed = JSON.parse(body) as { entity?: { id?: string }; schema_version?: string };
          if (parsed.entity?.id) metadata['foundation-entity-id'] = parsed.entity.id;
          if (parsed.schema_version) metadata['foundation-schema-version'] = parsed.schema_version;
        } catch { /* raw blobs are not JSON journals */ }
      }
      if (dryRun) { console.log(`[dry-run] ${bucket}/${key} bytes=${Buffer.byteLength(body)} sha256=${sha.slice(0, 12)}`); continue; }
      try {
        const result = await putR2ObjectCreateOnly({ bucket, key, body, contentType: contentTypeFor(key), metadata });
        if (result.status === 'CREATED') {
          const back = await getFromR2(key, bucket);
          const backBody = typeof back === 'string' ? back : back ? String(back) : '';
          const backSha = createHash('sha256').update(backBody).digest('hex');
          if (backSha !== sha) { summary.failed += 1; console.error(`  ✗ ${bucket}/${key} readback sha mismatch (${backSha.slice(0, 12)} != ${sha.slice(0, 12)})`); continue; }
          summary.created += 1; console.log(`  ✓ ${bucket}/${key} CREATED bytes=${Buffer.byteLength(body)} sha256=${sha.slice(0, 12)} (readback OK)`);
        } else {
          summary.conflict += 1; console.log(`  = ${bucket}/${key} ${result.status} (left as is)`);
        }
      } catch (err) {
        summary.failed += 1; console.error(`  ✗ ${bucket}/${key} ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }
  console.log(`\nreplay summary: ${JSON.stringify(summary)}`);
  if (summary.failed > 0) process.exit(1);
}
main().catch((err) => { console.error(err); process.exit(1); });
