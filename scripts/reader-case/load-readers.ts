/**
 * 公開版の事例の reader を作る（照合前の姿）。prepare-catalog-release と同じ projectReaderCase を通す。
 * 対象の事例ID: ids を渡せば、その分を entities-index.json から直接読む（まだ公開されていない候補も読める）。
 * 渡さなければ data/catalog-release.json の details（公開済みの一覧）。
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { projectReaderCase } from '../../src/lib/company-access/reader-case-projection';
import type { ReaderCase } from '../../src/shared/reader-case';

export function readIdsFile(path: string): string[] {
  return readFileSync(path, 'utf8').split('\n').map((s) => s.trim()).filter((s) => s && !s.startsWith('#'));
}

export function loadReaders(ids?: string[]): Map<string, ReaderCase> {
  const wanted = ids ?? Object.keys((JSON.parse(readFileSync('data/catalog-release.json', 'utf8')) as { details: Record<string, string> }).details);
  const want = new Set(wanted);
  const raw = JSON.parse(readFileSync('data/entities-index.json', 'utf8')) as Record<string, unknown>[];
  const out = new Map<string, ReaderCase>();
  for (const r of raw) {
    const id = typeof r?.id === 'string' ? r.id : undefined;
    if (id && want.has(id)) out.set(id, projectReaderCase(r).reader);
  }
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
 * add-*.json は既存の項目の後ろに足す（同じ項目は先勝ちで既存を残す）
 */
export function loadRawItems(outDir: string): Map<string, unknown> {
  const raws = new Map<string, unknown>();
  const files = existsSync(outDir) ? readdirSync(outDir).sort() : [];
  const read = (f: string) => (JSON.parse(readFileSync(`${outDir}/${f}`, 'utf8')) as { analysis?: { entityId: string; items?: unknown }[] }).analysis ?? [];
  for (const f of files.filter((x) => /^batch-[\w-]+\.json$/.test(x))) for (const c of read(f)) raws.set(c.entityId, c.items);
  for (const f of files.filter((x) => /^add-[\w-]+\.json$/.test(x))) {
    for (const c of read(f)) {
      const prev = raws.get(c.entityId);
      if (Array.isArray(prev) && Array.isArray(c.items)) raws.set(c.entityId, [...prev, ...c.items]);
    }
  }
  return raws;
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
