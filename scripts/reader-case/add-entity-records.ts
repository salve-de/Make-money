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
 *   node --import tsx scripts/reader-case/add-entity-records.ts --collect --manifest <catalog.json> --artifacts <dir> --ids a,b --name <name> [--packs <dir>]
 *   （--packs: 根拠カードが無い記録に、事例担当の材料 packs/<id>.json の出典から根拠カードを付ける）
 *   node --import tsx scripts/reader-case/add-entity-records.ts --from-research <records.json> --name <name>
 *   （新しく調べた事例の記録を、形の検査と出所の指紋つきで足す。R2 には書かない）
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

interface PackSource { id: string; kind?: string; publisher?: string; title?: string; url?: string; checkedAt?: string }

/** 根拠カードが無い記録に、事例担当の材料（packs/<id>.json）の出典から根拠カードを作る。カードは出典の所在だけで、中身の主張はしない */
export function sourceCards(id: string, sources: PackSource[]): Record<string, unknown>[] {
  return sources.filter((s) => s.url && /^https?:\/\//.test(s.url)).map((s) => {
    const primary = s.kind === 'OFFICIAL' || s.kind === 'FILING';
    let hostName = '';
    try { hostName = new URL(s.url!).hostname.replace(/^www\./, ''); } catch { /* 上で http(s) を確認済み */ }
    return {
      id: `${id}_pack_source_${s.id}`, type: 'UNKNOWN_AUDIT', title: `出典: ${s.publisher ?? hostName}${s.title ? `（${s.title}）` : ''}`,
      badge: '出典', evidenceStatus: 'REPORTED', punchline: '事例の材料に使った出典の所在。内容の照合は事例の照合段で行う。',
      details: [`URL: ${s.url}`, `ホスト: ${hostName}`, ...(s.checkedAt ? [`確認日: ${s.checkedAt}`] : [])],
      url: s.url, sourceNote: `${primary ? 'official' : 'secondary'} source listed in case-rebuild pack ${s.url}`, sourceClass: primary ? 'PRIMARY' : 'INDEPENDENT_SECONDARY',
    };
  });
}

export function collect(manifestPath: string, artifactsDir: string, ids: string[], now = new Date(), packsDir?: string): AdditionFile {
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
    const cards = Array.isArray(record.evidenceCards) ? record.evidenceCards : [];
    const packPath = packsDir ? `${packsDir}/${id}.json` : '';
    if (!cards.length && packPath && existsSync(packPath)) {
      const pack = JSON.parse(readFileSync(packPath, 'utf8')) as { sources?: PackSource[] };
      record.evidenceCards = sourceCards(id, pack.sources ?? []);
    }
    records.push({ id, provenance: { detailsHash, artifactSha256: sha256(bytes) }, record });
  }
  const parsed = parseFinancialEntitiesResiliently(records.map((r) => r.record));
  if (parsed.invalidEntities.length) throw new Error(`形式の検査に通らない記録がある: ${parsed.invalidEntities.length}件`);
  return { version: 1, source: { manifest: manifestPath, manifestSha256: sha256(text), artifactsDir, collectedAt: now.toISOString() }, records };
}

/**
 * 新しく調べた事例の記録（調査担当が書いた記録の配列 JSON）から足す。
 * 出所は調査ファイルのパスと指紋。記録ごとの detailsHash は記録そのものの指紋、artifactSha256 は調査ファイルの指紋。
 */
export function collectFromResearch(researchPath: string, now = new Date()): AdditionFile {
  const text = readFileSync(researchPath, 'utf8');
  const raw = JSON.parse(text) as unknown;
  const list = (Array.isArray(raw) ? raw : [raw]) as Record<string, unknown>[];
  if (!list.length) throw new Error('記録が1件も無い');
  const records: AdditionFile['records'] = list.map((input) => {
    const { reader: _reader, ...record } = input;
    void _reader;
    const id = String(record.id ?? '');
    if (!/^ent_[\w-]+$/.test(id)) throw new Error(`id が ent_ で始まらない: ${id}`);
    if (!host(record.url)) throw new Error(`${id}: url（公式サイト）が無い`);
    const tags = Array.isArray(record.tags) ? (record.tags as string[]) : [];
    record.tags = tags.includes(REVIEW_TAG) ? tags : [...tags, REVIEW_TAG];
    // 根拠カードが無いと公開区分の判定（hasValidEvidenceLocator）で必ず落ちる。調査の出典一覧（reaudit.sources）から出典の所在カードを作る
    const cards = Array.isArray(record.evidenceCards) ? record.evidenceCards : [];
    const auditSources = ((record.reaudit as { sources?: { url?: string; publisher?: string; checkedAt?: string }[] } | undefined)?.sources ?? []);
    if (!cards.length && auditSources.length) {
      const official = host(record.url);
      record.evidenceCards = sourceCards(id, auditSources.map((s, i) => ({
        id: String(i + 1), url: s.url, publisher: s.publisher, checkedAt: s.checkedAt, kind: host(s.url) === official ? 'OFFICIAL' : 'OTHER',
      })));
    }
    return { id, provenance: { detailsHash: sha256(JSON.stringify(record)), artifactSha256: sha256(text) }, record };
  });
  const parsed = parseFinancialEntitiesResiliently(records.map((r) => r.record));
  if (parsed.invalidEntities.length) throw new Error(`形式の検査に通らない記録がある: ${JSON.stringify(parsed.invalidEntities).slice(0, 800)}`);
  return { version: 1, source: { manifest: researchPath, manifestSha256: sha256(text), artifactsDir: '', collectedAt: now.toISOString() }, records };
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
    const file = collect(manifest, artifacts, ids, new Date(), val('--packs'));
    mkdirSync(ADDITIONS_DIR, { recursive: true });
    writeFileSync(`${ADDITIONS_DIR}/${name}.json`, `${JSON.stringify(file, null, 1)}\n`);
    console.log(JSON.stringify({ collected: file.records.length, file: `${ADDITIONS_DIR}/${name}.json` }));
    return;
  }
  if (args.includes('--from-research')) {
    const research = val('--from-research'); const name = val('--name');
    if (!research || !name || !/^[\w-]+$/.test(name)) throw new Error('--from-research <records.json> --name <name> が要る');
    const file = collectFromResearch(research);
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
  throw new Error('--collect か --from-research か --apply を指定する');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
