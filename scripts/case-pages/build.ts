/**
 * data/case-pages/<事例ID>.md を読み、画面用の data/case-pages.json を作り、権利の記録（docs/owner/research-notes/<事例ID>.md。古い形では正本の章）は出典の権利台帳（data/source-rights-ledger.json。docs/architecture/RIGHTS_LEDGER.md）へ取り込む（画面には出さない）。
 * --check: 書かずに、検査（です・ます／一覧の1行／外貨の円概算／全章／使えない出典）と、書き出し済みの json が md と合っているかを見る。
 * 使い方: node --import tsx scripts/case-pages/build.ts [--check]
 */
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { NEWER_RULES, checkMarkdown, heldSources, parseCasePage, parseRights, type Violation } from './lib';
import { rightsRefs } from './rights';
import { countCaseMedia, DEFAULT_MEDIA_ROOT } from '../media/ensure-case-media';
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

const LEGACY_FILE = 'data/case-pages-legacy.json';

async function main() {
  const check = process.argv.includes('--check');
  const { pages, rights, violations } = buildAll();
  // 後から足した3検査は、既に出ている事例（data/case-pages-legacy.json）では警告に留めて件数を出す。新しい事例では止める
  const legacy = new Set(readJsonOr<{ ids?: string[] }>(LEGACY_FILE, {}).ids ?? []);
  const isSoft = (v: { entityId: string; rule: Violation['rule'] }) => legacy.has(v.entityId) && NEWER_RULES.includes(v.rule);
  const soft = violations.filter(isSoft);
  violations.splice(0, violations.length, ...violations.filter((v) => !isSoft(v)));
  for (const rule of NEWER_RULES) {
    const hit = soft.filter((v) => v.rule === rule);
    if (hit.length > 0) console.warn(`警告 [${rule}] 既存 ${new Set(hit.map((v) => v.entityId)).size} 件（書き直しは後でまとめて。新しい事例では止める）`);
  }
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
  // 警告だけ（落とさない）。公開する事例で、使ってよい画像もアイコンも1枚も無いものを出す。画像の置き場（git に入らない）が手元に無ければ飛ばす
  if (check && existsSync(DEFAULT_MEDIA_ROOT)) {
    const none: string[] = [];
    for (const { entityId } of pages) {
      const c = await countCaseMedia(entityId, DEFAULT_MEDIA_ROOT);
      if (c.allowed + c.allowedIcons === 0) none.push(entityId);
    }
    for (const id of none) console.warn(`警告 ${id}: 使ってよい画像もアイコンも0枚（node --import tsx scripts/media/ensure-case-media.ts --ids ${id}）`);
    if (none.length) console.warn(`警告: 画像0枚の公開事例 ${none.length}件`);
  }
  console.log(`${check ? '検査' : '書き出し'} OK: ${pages.length}件`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) void main();
