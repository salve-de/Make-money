/**
 * 公開版の事例の reader を作る（照合前の姿）。prepare-catalog-release と同じ projectReaderCase を通す。
 * 対象の事例ID: ids を渡せば、その分を entities-index.json から直接読む（まだ公開されていない候補も読める）。
 * 渡さなければ data/catalog-release.json の details（公開済みの一覧）。
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { projectReaderCase } from '../../src/lib/company-access/reader-case-projection';
import type { ReaderCase } from '../../src/shared/reader-case';
import { readReflectState, reflectedReader } from './case-reflect';
import { sourcePolicy } from './source-policy';

export function readIdsFile(path: string): string[] {
  return readFileSync(path, 'utf8').split('\n').map((s) => s.trim()).filter((s) => s && !s.startsWith('#'));
}

/** 利用条件が未承認の出典の事実は事例に入れない（prepare-catalog-release.ts と同じ規則） */
export const rightsOptions = (r: Record<string, unknown>) => ({ allowSource: (u: string) => !!sourcePolicy(u, typeof r.url === 'string' ? r.url : '') });

export function loadReaders(ids?: string[]): Map<string, ReaderCase> {
  const wanted = ids ?? Object.keys((JSON.parse(readFileSync('data/catalog-release.json', 'utf8')) as { details: Record<string, string> }).details);
  const want = new Set(wanted);
  const raw = JSON.parse(readFileSync('data/entities-index.json', 'utf8')) as Record<string, unknown>[];
  const out = new Map<string, ReaderCase>();
  for (const r of raw) {
    const id = typeof r?.id === 'string' ? r.id : undefined;
    if (id && want.has(id)) out.set(id, projectReaderCase(r, rightsOptions(r)).reader);
  }
  // 反映段（case-reflect.ts）: 取り込み版があれば置き換え、取り込みが保留の事例は旧版も返さない
  const reflect = readReflectState();
  for (const id of [...out.keys()]) { const r = reflectedReader(reflect, id); if (r === null) out.delete(id); else if (r) out.set(id, r); }
  return new Map(wanted.filter((i) => out.has(i)).map((i) => [i, out.get(i)!]));
}

/** 分析役が読んだ出典の本文（data/analyze/batches）。事例ID → sources。監査役にも同じものを渡す */
export function loadSourceTexts(): Map<string, unknown> {
  const dir = 'data/analyze/batches';
  const out = new Map<string, unknown>();
  for (const f of existsSync(dir) ? readdirSync(dir).sort() : []) {
    for (const c of (JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')) as { cases: { entityId: string; sources: unknown }[] }).cases) out.set(c.entityId, c.sources);
  }
  return out;
}

export function argValue(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

/**
 * 分析役の出力（<outDir>/batch-*.json と、足りない項目を後から埋めた add-*.json）から、事例ID → 項目の一覧を作る。
 * add-*.json は既存の項目の後ろに足す（同じ項目は先勝ちで既存を残す）。
 * re-*.json は新しい根拠での再評価の結果。同じ項目の既存を置き換え、既存に無い項目は足す（build-fill-batches.ts）
 */
export function loadRawItems(outDir: string, batchDir?: string): Map<string, unknown> {
  const raws = new Map<string, unknown>();
  const files = validOutFiles(outDir, batchDir);
  const read = (f: string) => (JSON.parse(readFileSync(`${outDir}/${f}`, 'utf8')) as { analysis?: { entityId: string; items?: unknown }[] }).analysis ?? [];
  for (const f of files.filter((x) => /^batch-[\w-]+\.json$/.test(x))) for (const c of read(f)) raws.set(c.entityId, c.items);
  for (const f of files.filter((x) => /^add-[\w-]+\.json$/.test(x))) {
    for (const c of read(f)) {
      const prev = raws.get(c.entityId);
      if (Array.isArray(prev) && Array.isArray(c.items)) raws.set(c.entityId, [...prev, ...c.items]);
    }
  }
  for (const f of files.filter((x) => /^re-[\w-]+\.json$/.test(x))) {
    for (const c of read(f)) {
      const prev = raws.get(c.entityId);
      if (!Array.isArray(prev) || !Array.isArray(c.items)) continue;
      const replaced = new Set((c.items as { item?: unknown }[]).map((i) => i?.item));
      raws.set(c.entityId, [...prev.filter((p) => !replaced.has((p as { item?: unknown })?.item)), ...c.items]);
    }
  }
  return raws;
}

/**
 * 出力ファイルのうち、いま有効なもの。add-/re- の出力は、同じ名前の束（batchDir）がいま存在する時だけ有効。
 * 束の名前には中身の指紋が入る（build-fill-batches.ts）ので、中身が変わった束の古い出力は名前が合わず使われない。
 * batchDir を渡さない時は従来どおり全部を有効とする。
 */
function validOutFiles(outDir: string, batchDir?: string): string[] {
  const files = existsSync(outDir) ? readdirSync(outDir).sort() : [];
  if (!batchDir) return files;
  // 同じ系列（例: batch-gen2-）の束が今あるのに、その番号の束だけが無い出力は、作り直しで束の数が減った古い出力。
  // 古い事実IDを指すので読まない。系列の束が1つも無い昔の出力（batch-001 など）は従来どおり読む
  const batches = existsSync(batchDir) ? readdirSync(batchDir) : [];
  const series = (f: string) => f.replace(/\d+\.json$/, '');
  const liveSeries = new Set(batches.map(series));
  return files.filter((f) => existsSync(`${batchDir}/${f}`) || (!/^(add|re)-/.test(f) && !liveSeries.has(series(f))));
}

/** 再評価（re-）の有効な出力に載っている事例ID。受理後に「評価済み」へ進める対象 */
export function reevaluatedIds(outDir: string, batchDir?: string): Set<string> {
  const ids = new Set<string>();
  for (const f of validOutFiles(outDir, batchDir).filter((x) => /^re-[\w-]+\.json$/.test(x))) {
    const doc = JSON.parse(readFileSync(`${outDir}/${f}`, 'utf8')) as { analysis?: { entityId: string }[] };
    for (const c of doc.analysis ?? []) ids.add(c.entityId);
  }
  return ids;
}

/** 同じ entities-index.json から、公開評価に使う元の事業記録を読む（reader と同じ局所スナップショット）。 */
export function loadEntities(ids?: string[]): Map<string, import('../../src/shared/terminal').FinancialEntity> {
  const wanted = ids ? new Set(ids) : null;
  const raw = JSON.parse(readFileSync('data/entities-index.json', 'utf8')) as Record<string, unknown>[];
  const out = new Map<string, import('../../src/shared/terminal').FinancialEntity>();
  for (const r of raw) {
    const id = typeof r?.id === 'string' ? r.id : undefined;
    if (id && (!wanted || wanted.has(id))) out.set(id, r as unknown as import('../../src/shared/terminal').FinancialEntity);
  }
  return out;
}
