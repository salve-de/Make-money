/**
 * 日本語の自然さの関門（data/natural-japanese.json）に、画面に出る文がいくつ落ちるかを数える。直しはしない。
 *   pnpm natural-ja:report               画面の層（一覧・概要・分析欄・成功の秘訣・章）と、事実・分析の層（case-reflect・reader-analysis）を数える
 *   pnpm natural-ja:report --finished    公開している事例（data/catalog-finished-ids.txt）だけ
 *   pnpm natural-ja:report --examples 20 例の数
 *   pnpm natural-ja:report --candidates  確認役（display:build の独立レビュー）が指摘した不自然な語・要らない語のうち、辞書がまだ拾えない物を多い順に出す。
 *                                        2回以上出た語は、data/natural-japanese.json に pattern・reason・suggest を足し、
 *                                        scripts/architecture/natural-japanese.test.mjs に悪い例と正当な使い方の例を足して、pnpm lint を通す。
 * 画面の層の違反は pnpm lint（check-case-text-standard.mjs）で落ちる。事実・分析の層は集める側の文なので、ここで数えるだけ。
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describeHit, findUnnatural, loadNaturalRules } from './natural-japanese.mjs';

const ROOT = process.cwd();
const read = (file) => JSON.parse(readFileSync(resolve(ROOT, file), 'utf8'));
const argValue = (flag) => { const i = process.argv.indexOf(flag); return i >= 0 ? process.argv[i + 1] : undefined; };
const rules = loadNaturalRules(resolve(ROOT, 'data/natural-japanese.json'));
const finished = new Set(readFileSync(resolve(ROOT, 'data/catalog-finished-ids.txt'), 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#')));
const onlyFinished = process.argv.includes('--finished');
const exampleCount = Number(argValue('--examples') ?? 8);
const TEXT_KEYS = new Set(['text', 'answer', 'note', 'head', 'body']);

/** 文の欄（text/answer/note/head/body）を、事例の id つきで全部拾う */
function* strings(value, entityId, path) {
  if (Array.isArray(value)) { for (const [i, v] of value.entries()) yield* strings(v, entityId, `${path}[${i}]`); return; }
  if (!value || typeof value !== 'object') return;
  const id = typeof value.entityId === 'string' ? value.entityId : typeof value.id === 'string' && value.id.startsWith('ent_') ? value.id : entityId;
  for (const [key, v] of Object.entries(value)) {
    if (typeof v === 'string' && TEXT_KEYS.has(key)) yield { entityId: id, path: `${path}.${key}`, text: v };
    else if (v && typeof v === 'object') yield* strings(v, id, `${path}.${key}`);
  }
}

const FILES = [
  ['画面', 'list-lines', (j) => strings(j, undefined, '')],
  ['画面', 'summary-lines', (j) => strings(j, undefined, '')],
  ['画面', 'detail-lines', (j) => strings(j.filter((l) => !l.hidden), undefined, '')],
  ['画面', 'success-points', (j) => strings(j, undefined, '')],
  ['画面', 'case-chapters', (j) => strings(j, undefined, '')],
  ['事実・分析', 'case-reflect', (j) => strings(j.cases, undefined, '')],
  ['事実・分析', 'reader-analysis', function* (j) { for (const [id, rows] of Object.entries(j)) yield* strings(rows, id, ''); }],
];

if (process.argv.includes('--candidates')) {
  const file = resolve(ROOT, 'data/pipeline/natural-japanese-candidates.jsonl');
  const rows = existsSync(file) ? readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];
  const missed = new Map();
  for (const row of rows) {
    if (findUnnatural(row.phrase, rules).length) continue; // もう辞書が拾う
    const seen = missed.get(row.phrase) ?? { count: 0, kind: row.kind, fix: row.fix, problem: row.problem };
    seen.count += 1; missed.set(row.phrase, seen);
  }
  console.log(`[natural-ja] 確認役の指摘 ${rows.length} 件のうち、辞書がまだ拾えない語 ${missed.size} 種`);
  for (const [phrase, v] of [...missed].sort((a, b) => b[1].count - a[1].count)) console.log(`  - 「${phrase}」×${v.count}（${v.kind}）${v.problem.slice(0, 60)} → ${v.fix.slice(0, 40)}`);
  process.exit(0);
}

let screenTotal = 0;
for (const [layer, name, walk] of FILES) {
  const byWord = new Map(); let texts = 0; let failed = 0; const examples = [];
  for (const row of walk(read(`data/${name}.json`))) {
    if (onlyFinished && !finished.has(row.entityId)) continue;
    texts += 1;
    const hits = findUnnatural(row.text, rules);
    if (!hits.length) continue;
    failed += 1;
    for (const hit of hits) byWord.set(hit.word, (byWord.get(hit.word) ?? 0) + 1);
    if (examples.length < exampleCount) examples.push(`  - ${row.entityId}${row.path}: 「${row.text.slice(0, 60)}」 ${hits.map(describeHit).join(' / ')}`);
  }
  if (layer === '画面') screenTotal += failed;
  console.log(`[natural-ja] ${layer} ${name}: 文 ${texts} 件中 ${failed} 件が落ちる（語: ${[...byWord].sort((a, b) => b[1] - a[1]).map(([w, n]) => `${w}×${n}`).join('、') || 'なし'}）`);
  if (examples.length) console.log(examples.join('\n'));
}
console.log(`[natural-ja] 画面の層で落ちる文: ${screenTotal} 件${onlyFinished ? '（公開している事例のみ）' : ''}`);
