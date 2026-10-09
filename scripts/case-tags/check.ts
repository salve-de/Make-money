/**
 * タグの検査（pnpm case-tags:check）。
 * - 言葉の一覧（src/shared/case-taxonomy.ts）が壊れていないこと（言葉の重複なし・定義あり・運営の印と重ならない）
 * - 公開する事例（章ごとの文 data/case-pages/<id>.md がある事例）は全員、data/case-tags.json に
 *   分野・事業の形・売る相手がちょうど1つずつあり、言葉は一覧の中だけ。根拠（basis）も書いてある
 * 使い方: node --import tsx scripts/case-tags/check.ts
 */
import { pathToFileURL } from 'node:url';
import { ALL_TAXONOMY_WORDS, AXES, CASE_TAXONOMY_VERSION } from '../../src/shared/case-taxonomy';
import { OPERATOR_TAGS } from '../../src/shared/display-text';
import { entryProblems, readCaseTags, type CaseTagsFile } from '../reader-case/case-tags-lib';
import { listCasePageIds } from '../case-pages/build';

export function taxonomyProblems(): string[] {
  const problems: string[] = [];
  if (!Number.isInteger(CASE_TAXONOMY_VERSION) || CASE_TAXONOMY_VERSION < 1) problems.push('版の番号（CASE_TAXONOMY_VERSION）が正の整数でない');
  const seen = new Set<string>();
  for (const axis of AXES) {
    if (axis.terms.length === 0) problems.push(`軸「${axis.label}」に言葉がない`);
    for (const t of axis.terms) {
      if (seen.has(t.word)) problems.push(`言葉「${t.word}」が複数の軸、または2回出ている`);
      seen.add(t.word);
      if (OPERATOR_TAGS.has(t.word)) problems.push(`言葉「${t.word}」は運営の印と同じ`);
      if (!t.definition.trim() || !t.yes.trim()) problems.push(`言葉「${t.word}」に定義か「入る例」がない`);
    }
  }
  if (seen.size !== ALL_TAXONOMY_WORDS.length) problems.push('言葉の一覧の数が合わない');
  return problems;
}

export function caseTagsProblemsFor(ids: readonly string[], file: CaseTagsFile): string[] {
  const problems: string[] = [];
  for (const id of ids) {
    const entry = file[id];
    if (!entry) { problems.push(`${id}: data/case-tags.json にタグがありません`); continue; }
    for (const p of entryProblems(entry)) problems.push(`${id}: ${p}`);
  }
  return problems;
}

function main(): void {
  const ids = listCasePageIds();
  const problems = [...taxonomyProblems(), ...caseTagsProblemsFor(ids, readCaseTags(process.cwd()))];
  if (problems.length) {
    console.error(`タグの検査に通りません（${problems.length}件）`);
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }
  console.log(`タグの検査 OK: 公開する事例 ${ids.length} 件すべてに、一覧の言葉で分野・事業の形・売る相手が1つずつ付いています（版 ${CASE_TAXONOMY_VERSION}）`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
