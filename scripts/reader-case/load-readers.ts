/**
 * 公開版の事例の reader を作る（照合前の姿）。prepare-catalog-release と同じ projectReaderCase を通す。
 * 対象の事例ID = data/catalog-release.json の details（公開済みの一覧）。ids を渡せばその分だけ。
 */
import { readFileSync } from 'node:fs';
import { projectReaderCase } from '../../src/lib/company-access/reader-case-projection';
import type { ReaderCase } from '../../src/shared/reader-case';

export function readIdsFile(path: string): string[] {
  return readFileSync(path, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean);
}

export function loadReaders(ids?: string[]): Map<string, ReaderCase> {
  const manifest = JSON.parse(readFileSync('data/catalog-release.json', 'utf8')) as { details: Record<string, string> };
  const wanted = ids ?? Object.keys(manifest.details);
  const want = new Set(wanted);
  const raw = JSON.parse(readFileSync('data/entities-index.json', 'utf8')) as Record<string, unknown>[];
  const out = new Map<string, ReaderCase>();
  for (const r of raw) {
    const id = typeof r?.id === 'string' ? r.id : undefined;
    if (id && want.has(id) && id in manifest.details) out.set(id, projectReaderCase(r).reader);
  }
  return new Map(wanted.filter((i) => out.has(i)).map((i) => [i, out.get(i)!]));
}

export function argValue(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
