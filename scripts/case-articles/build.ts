/**
 * data/case-articles/<事例ID>/article.json（原稿）を読んで検査し、画面用の data/case-articles.json を作る。
 * 図は同じ場所の figures/ の SVG を data URI に直して入れる。recordKeys など画面に出さない欄は落ちる。
 * --check: 書かずに、検査と、書き出し済みの json が原稿と合っているかを見る。原稿が1件も無ければ 0件で OK（json は []）。
 * 使い方: node --import tsx scripts/case-articles/build.ts [--check] [--dir <原稿の置き場>] [--file <書き出し先>]
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { CASE_ARTICLES_DIR, CASE_ARTICLES_FILE, buildAll } from './lib';

const json = (v: unknown) => `${JSON.stringify(v, null, 1)}\n`;
const flagValue = (name: string) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : undefined);

function main() {
  const check = process.argv.includes('--check');
  const dir = flagValue('--dir') ?? CASE_ARTICLES_DIR;
  const file = flagValue('--file') ?? CASE_ARTICLES_FILE;
  const { articles, violations } = buildAll(dir);
  const next = json(articles);
  const stale = check && (!existsSync(file) || readFileSync(file, 'utf8') !== next);
  if (!check && violations.length === 0) writeFileSync(file, next);
  for (const v of violations) console.error(`NG ${v.entityId} [${v.rule}] ${v.where}: ${v.detail}`);
  if (stale) console.error(`NG 書き出しが原稿と合っていない: ${file}（pnpm case-articles:build を実行）`);
  if (violations.length > 0 || stale) { process.exitCode = 1; return; }
  console.log(`${check ? '検査' : '書き出し'} OK: ${articles.length}件`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
