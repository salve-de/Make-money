/**
 * 事例のタグ（分野・事業の形・売る相手・特徴）の正本 data/case-tags.json の読み書き。
 * 言葉の一覧は src/shared/case-taxonomy.ts。収集（case-research）が新しい事例を入れる時と、検査（case-tags-check）が読む。
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { caseTagsProblems, type CaseTags } from '../../src/shared/case-taxonomy';

export type CaseTagEntry = CaseTags & { basis: string };
export type CaseTagsFile = Record<string, CaseTagEntry>;

export const caseTagsPath = (root: string): string => join(root, 'data/case-tags.json');

export function readCaseTags(root: string): CaseTagsFile {
  const file = caseTagsPath(root);
  if (!existsSync(file)) return {};
  return JSON.parse(readFileSync(file, 'utf8')) as CaseTagsFile;
}

/** 一覧の言葉だけで書かれているか。問題の文を返す（空なら通る）。basis（判断の根拠）が空でもいけない */
export function entryProblems(entry: unknown): string[] {
  const problems = caseTagsProblems(entry);
  const basis = (entry as { basis?: unknown } | null)?.basis;
  if (typeof basis !== 'string' || basis.trim() === '') problems.push('basis（その事例の文のどこから判断したか）が空です');
  return problems;
}

/** 1件を書き足す（同じ事例は置き換え）。1度に読み書きを済ませる。キーは事例IDで並べて差分を安定させる */
export function setCaseTags(root: string, id: string, entry: CaseTagEntry): void {
  const all = readCaseTags(root);
  all[id] = { field: entry.field, form: entry.form, buyer: entry.buyer, features: [...entry.features], basis: entry.basis };
  const sorted = Object.fromEntries(Object.entries(all).sort(([a], [b]) => a.localeCompare(b)));
  const file = caseTagsPath(root);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(sorted, null, 1)}\n`);
}
