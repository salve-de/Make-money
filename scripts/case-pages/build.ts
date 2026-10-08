/**
 * data/case-pages/<事例ID>.md を読み、画面用の data/case-pages.json を作り、権利の記録（docs/owner/research-notes/<事例ID>.md。古い形では正本の章）は出典の権利台帳（data/source-rights-ledger.json。docs/architecture/RIGHTS_LEDGER.md）へ取り込む（画面には出さない）。
 * --check: 書かずに、検査（です・ます／一覧の1行／外貨の円概算／全章／使えない出典）と、書き出し済みの json が md と合っているかを見る。
 * 使い方: node --import tsx scripts/case-pages/build.ts [--check]
 */
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { checkMarkdown, heldSources, parseCasePage, parseRights, type Violation } from './lib';
import { rightsRefs } from './rights';
import { recordSourcesToLedger } from '../rights/record-sources';
import type { CasePage } from '../../src/shared/case-page';

export const CASE_PAGES_DIR = 'data/case-pages';
export const CASE_PAGES_FILE = 'data/case-pages.json';
export const SOURCE_RIGHTS_FILE = 'data/catalog-source-rights.json';
export const RESEARCH_NOTES_DIR = 'docs/owner/research-notes';

export const readJsonOr = <T,>(path: string, fallback: T): T => (existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as T) : fallback);

export function listCasePageIds(dir = CASE_PAGES_DIR): string[] {
  return readdirSync(dir).filter((f) => f.endsWith('.md')).map((f) => f.replace(/\.md$/, '')).sort();
}

export function buildAll(dir = CASE_PAGES_DIR) {
  const pages: Array<{ entityId: string; page: CasePage }> = [];
  const rights: Record<string, ReturnType<typeof parseRights>> = {};
  const violations: Array<{ entityId: string } & Violation> = [];
  const sourceRights = readJsonOr<Record<string, { decision?: string }>>(SOURCE_RIGHTS_FILE, {});
  for (const entityId of listCasePageIds(dir)) {
    const md = readFileSync(`${dir}/${entityId}.md`, 'utf8');
    const checked = checkMarkdown(md);
    for (const v of checked.violations) violations.push({ entityId, ...v });
    if (checked.page) for (const v of heldSources(checked.page, sourceRights)) violations.push({ entityId, ...v });
    if (checked.page) pages.push({ entityId, page: parseCasePage(md) });
    // 権利の記録は調べた側のメモ（docs/owner/research-notes/<事例ID>.md）に置く。画面の正本に残っている古い形も読む
    const notesPath = `${RESEARCH_NOTES_DIR}/${entityId}.md`;
    rights[entityId] = [...parseRights(md), ...(existsSync(notesPath) ? parseRights(readFileSync(notesPath, 'utf8')) : [])];
  }
  return { pages, rights, violations };
}

const json = (v: unknown) => `${JSON.stringify(v, null, 1)}\n`;

async function main() {
  const check = process.argv.includes('--check');
  const { pages, rights, violations } = buildAll();
  const stale: string[] = [];
  const next = json(pages);
  if (check) {
    if (readJsonOr<string>(CASE_PAGES_FILE, '') === '' || readFileSync(CASE_PAGES_FILE, 'utf8') !== next) stale.push(CASE_PAGES_FILE);
  } else if (violations.length === 0) {
    writeFileSync(CASE_PAGES_FILE, next);
  }
  for (const v of violations) console.error(`NG ${v.entityId} [${v.rule}] ${v.where}: ${v.detail}`);
  for (const f of stale) console.error(`NG 書き出しが md と合っていない: ${f}（pnpm case-pages:build を実行）`);
  if (violations.length > 0 || stale.length > 0) { process.exitCode = 1; return; }
  if (!check) {
    const refs = pages.flatMap(({ entityId, page }) => rightsRefs(entityId, page, rights[entityId] ?? []));
    const r = await recordSourcesToLedger(refs, 'case-pages 取り込み');
    console.log(`権利台帳: 新しく記録したドメイン ${r.added.length}件${r.error ? `（警告: ${r.error}）` : ''}`);
  }
  console.log(`${check ? '検査' : '書き出し'} OK: ${pages.length}件`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) void main();
