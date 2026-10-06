/**
 * 目録（data/entities-index.json）に無い事例の記録を、別の公開目録（id → ハッシュの details と catalog-artifacts/<hash>.json.gz）から足す。
 *
 * 2段に分ける:
 *   1) --collect: 元の目録から記録を抜き出し、出所つきで data/entity-additions/<name>.json に保存する（コミットする正本）。
 *      保存するのは事業の記録だけ。元の目録の画面用の中身（reader）は旧版の文章なので持ち込まない（中身は取り込み経路が入れる）。
 *   2) --apply: data/entity-additions/*.json を entities-index.json に合流する。
 *      既に同じ id・同じ公式サイトの事例があれば足さない（上書きしない）。足した記録には審査待ちの印「収集事例」を付ける（承認済みにしない）。
 *      entities-index.json の指紋が変わると公開目録（catalog-release.json）の作り直しが要る。--apply は公開データ作りの直前にだけ使う。
 *
 * 使い方:
 *   node --import tsx scripts/reader-case/add-entity-records.ts --collect --manifest <catalog.json> --artifacts <dir> --ids a,b --name <name>
 *   node --import tsx scripts/reader-case/add-entity-records.ts --apply [--dry-run]
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { pathToFileURL } from 'node:url';
import { parseFinancialEntitiesResiliently } from '../../src/shared/financial-entity-schema';

export const ADDITIONS_DIR = 'data/entity-additions';
export const REVIEW_TAG = '収集事例';

export interface AdditionFile {
  version: 1;
  source: { manifest: string; manifestSha256: string; artifactsDir: string; collectedAt: string };
  records: { id: string; provenance: { detailsHash: string; artifactSha256: string }; record: Record<string, unknown> }[];
}

const sha256 = (b: Buffer | string) => createHash('sha256').update(b).digest('hex');
const host = (u: unknown) => { try { return new URL(String(u)).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; } };

export function collect(manifestPath: string, artifactsDir: string, ids: string[], now = new Date()): AdditionFile {
  const text = readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(text) as { details: Record<string, string>; approvalCandidateIds?: string[] };
  const records: AdditionFile['records'] = [];
  for (const id of ids) {
    const detailsHash = manifest.details[id];
    if (!detailsHash) throw new Error(`${id}: 元の目録の details に無い`);
    const bytes = readFileSync(`${artifactsDir}/${detailsHash}.json.gz`);
    const json = gunzipSync(bytes).toString('utf8');
    if (sha256(json) !== detailsHash) throw new Error(`${id}: 中身の指紋が details のハッシュと合わない`);
    const { reader: _oldReader, ...record } = JSON.parse(json) as Record<string, unknown>;
    void _oldReader;
    if (record.id !== id) throw new Error(`${id}: 記録の id が違う（${String(record.id)}）`);
    const tags = Array.isArray(record.tags) ? (record.tags as string[]) : [];
    // 元の目録で審査待ちだったかどうかに関わらず、この目録では審査待ちとして足す（承認はこの目録の承認経路で行う）
    record.tags = tags.includes(REVIEW_TAG) ? tags : [...tags, REVIEW_TAG];
    records.push({ id, provenance: { detailsHash, artifactSha256: sha256(bytes) }, record });
  }
  const parsed = parseFinancialEntitiesResiliently(records.map((r) => r.record));
  if (parsed.invalidEntities.length) throw new Error(`形式の検査に通らない記録がある: ${parsed.invalidEntities.length}件`);
  return { version: 1, source: { manifest: manifestPath, manifestSha256: sha256(text), artifactsDir, collectedAt: now.toISOString() }, records };
}

/** 目録に足す。足した id と、足さなかった id（理由）を返す。既存の記録は変えない */
export function mergeInto(index: Record<string, unknown>[], additions: AdditionFile[]): { next: Record<string, unknown>[]; added: string[]; skipped: { id: string; reason: string }[] } {
  const ids = new Set(index.map((e) => String(e.id)));
  const hosts = new Map(index.map((e) => [host(e.url), String(e.id)] as const).filter(([h]) => h));
  const added: string[] = [];
  const skipped: { id: string; reason: string }[] = [];
  const next = [...index];
  for (const file of additions) {
    for (const { id, record } of file.records) {
      if (ids.has(id)) { skipped.push({ id, reason: '同じ id が既にある' }); continue; }
      const h = host(record.url);
      if (h && hosts.has(h)) { skipped.push({ id, reason: `同じ公式サイトの事例が既にある: ${hosts.get(h)}` }); continue; }
      next.push(record);
      ids.add(id);
      if (h) hosts.set(h, id);
      added.push(id);
    }
  }
  return { next, added, skipped };
}

export function readAdditions(dir = ADDITIONS_DIR): AdditionFile[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith('.json')).sort().map((f) => JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')) as AdditionFile);
}

function main() {
  const args = process.argv.slice(2);
  const val = (k: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
  if (args.includes('--collect')) {
    const manifest = val('--manifest'); const artifacts = val('--artifacts'); const name = val('--name');
    const ids = (val('--ids') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    if (!manifest || !artifacts || !name || !/^[\w-]+$/.test(name) || !ids.length) throw new Error('--manifest --artifacts --ids --name が要る');
    const file = collect(manifest, artifacts, ids);
    mkdirSync(ADDITIONS_DIR, { recursive: true });
    writeFileSync(`${ADDITIONS_DIR}/${name}.json`, `${JSON.stringify(file, null, 1)}\n`);
    console.log(JSON.stringify({ collected: file.records.length, file: `${ADDITIONS_DIR}/${name}.json` }));
    return;
  }
  if (args.includes('--apply')) {
    const path = 'data/entities-index.json';
    const index = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>[];
    const { next, added, skipped } = mergeInto(index, readAdditions());
    if (added.length && !args.includes('--dry-run')) { writeFileSync(`${path}.tmp`, JSON.stringify(next)); renameSync(`${path}.tmp`, path); }
    console.log(JSON.stringify({ added, skipped, dryRun: args.includes('--dry-run') }));
    return;
  }
  throw new Error('--collect か --apply を指定する');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
