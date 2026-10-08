/**
 * 読者が実際に見る文字を全件で書き出して検査する。
 *
 *   tsx scripts/architecture/screen-text.tsx --out <dir>          全件の <id>.txt と summary.json を書く
 *   tsx scripts/architecture/screen-text.tsx --check              禁止語が画面に出ていたら exit 1
 *   オプション: --limit N（先頭N件）  --ids a,b,c（指定IDだけ）
 *
 * 流れ: data/catalog-release.json の details → .catalog-release/<hash>.json.gz
 *   → 本番と同じ読み込み（parseFinancialEntitiesResiliently → publicEntity → parseFinancialEntity）
 *   → CompanyInspectorPane と同じ部品・同じ props を renderToStaticMarkup で描く（台帳タブ + メモタブ）
 *   → 出どころの検査: fact・metric・source（data-fact / data-metric / data-source）の外にある文字は、ui-strings の許可リストに
 *      一致しなければ失敗。中身の無い見出しと、同じ画面での同じ fact ID の2回目も失敗。禁止語の一覧は fact.text への補助の検査。
 *   → 一覧（トップの InstitutionalDataGrid = スマホのカード + 表、/discover の DiscoveryRow）も1件ずつ描く（ListRow）
 *   → タグを除いて画面の文字だけにする（title / aria-label / alt / placeholder も含める）。
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { gunzipSync } from 'node:zlib';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { publicEntity, publicSummaryEntity } from '@/lib/company-access/public-entity';
import { InstitutionalDataGrid } from '@/platform/components/grid/InstitutionalDataGrid';
import { DetailPane, DiscoveryRow } from '@/app/discover/DiscoverClient';
import { ExecutionReference } from '@/app/execute/[id]/ExecutionClient';
import { executionSource } from '@/shared/execution-source';
import { deriveDiscoveryDataset } from '@/features/discover';
import { buildInspectorModel } from '@/features/company-inspector/model/inspector-model';
import type { InspectorSectionProps } from '@/features/company-inspector/model/section-props';
import { AnalystNotes } from '@/features/company-inspector/ui/AnalystNotes';
import { CompanyHeader } from '@/features/company-inspector/ui/CompanyHeader';
import { EntityMediaGallery } from '@/features/company-inspector/ui/EntityMediaGallery';
import { ReaderLedger } from '@/features/company-inspector/ui/ReaderDetail';
import { allowedUiTexts, isUnknownsLine } from '@/shared/ui-strings';
import { parseFinancialEntitiesResiliently, parseFinancialEntity } from '@/shared/financial-entity-schema';
import type { FinancialEntity } from '@/shared/terminal';
import { INTERNAL_TERMS, LIST_ONLY_RES, PROCESS_RES, SCREEN_ONLY_RES, STANDALONE_LINES, analyzeScreen } from './screen-text-lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const flag = (name: string) => args.includes(name);
const opt = (name: string) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const OUT = opt('--out');
const CHECK = flag('--check');
const LIMIT = opt('--limit') ? Number(opt('--limit')) : Infinity;
const IDS = opt('--ids')?.split(',').filter(Boolean);
// 公開版に reader が入る前の確認用: id → ReaderCase の JSON を差し込む（本番の経路では使わない）
const FIXTURE = opt('--reader-fixture') ? (JSON.parse(readFileSync(resolve(process.cwd(), opt('--reader-fixture') as string), 'utf8')) as Record<string, FinancialEntity['reader']>) : undefined;
const CURRENCY = 'JPY' as const;

// ---- 文字の取り出し ----------------------------------------------------------------
const VISIBLE_ATTRS = ['title', 'aria-label', 'alt', 'placeholder'];
const decode = (s: string) => s
  .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
  .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&nbsp;/g, ' ')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const INLINE_TAGS = new Set(['span', 'a', 'b', 'strong', 'em', 'i', 'code', 'small', 'sup', 'sub', 'mark', 'abbr', 'time', 'u', 's']);

/** nodes: 文字ノードごとに1行。lines: インライン要素をまたいで連結した行（ブロック要素で改行）。 */
export function extractScreenText(html: string): { nodes: string[]; lines: string[] } {
  const clean = html.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, '').replace(/<!--[\s\S]*?-->/g, '');
  const nodes: string[] = [];
  const lines: string[] = [];
  let current = '';
  const flush = () => { const t = current.replace(/\s+/g, ' ').trim(); if (t) lines.push(t); current = ''; };
  const push = (t: string, joinInline: boolean) => {
    const v = decode(t).replace(/\s+/g, ' ').trim();
    if (!v) return;
    nodes.push(v);
    current += (joinInline ? '' : ' ') + decode(t);
  };
  const re = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)([^>]*)>|([^<]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(clean))) {
    if (m[4] !== undefined) { push(m[4], true); continue; }
    const tag = m[2].toLowerCase();
    const inline = INLINE_TAGS.has(tag);
    if (!m[1]) {
      for (const a of VISIBLE_ATTRS) {
        const am = new RegExp(`\\s${a}="([^"]*)"`).exec(m[3]);
        if (am && am[1].trim()) { flush(); nodes.push(decode(am[1]).trim()); lines.push(decode(am[1]).trim()); }
      }
    }
    if (!inline) flush();
  }
  flush();
  return { nodes, lines };
}

// ---- 描画 --------------------------------------------------------------------------
const noop = () => undefined;
function baseProps(entity: FinancialEntity, tab: 'LEDGER' | 'AUDIT'): InspectorSectionProps {
  return {
    entity, currency: CURRENCY, onClose: noop, isPro: false, isScrolled: false, scrollToSection: noop,
    activeTags: [], analystNote: '', viewMode: 'ALL', mainTab: tab, setMainTab: noop, setViewMode: noop, isBookmarked: false,
    ...buildInspectorModel(entity, CURRENCY),
  } as unknown as InspectorSectionProps;
}
const h = React.createElement;
/** [部品名, 画面, 描く関数]。同じ画面の部品は1つの HTML にまとめて出どころを検査する。 */
type Part = [string, 'ledger' | 'audit' | 'list' | 'list2' | 'detail2' | 'execute', () => React.ReactElement | null];
function parts(entity: FinancialEntity): Part[] {
  const ledger = baseProps(entity, 'LEDGER');
  const audit = baseProps(entity, 'AUDIT');
  const hz = Boolean(ledger.isHazardMode);
  return [
    ['CompanyHeader(台帳)', 'ledger', () => h(CompanyHeader, ledger)],
    ['ReaderLedger', 'ledger', () => h(ReaderLedger, { reader: entity.reader })],
    ['EntityMediaGallery', 'ledger', () => h(EntityMediaGallery, { entityId: entity.id, entityName: entity.name, isHazardMode: hz })],
    ['CompanyHeader(メモ)', 'audit', () => h(CompanyHeader, audit)],
    ['AnalystNotes', 'audit', () => h(AnalystNotes, audit)],
    // 一覧: トップは本番と同じく一覧用の要約（publicSummaryEntity）を InstitutionalDataGrid に渡す。
    ['ListRow', 'list', () => h(InstitutionalDataGrid, {
      entities: [{ ...publicSummaryEntity(entity), ...(FIXTURE && entity.reader ? { reader: entity.reader } : {}) } as unknown as FinancialEntity], selectedEntityId: null, onSelectEntity: noop,
      currency: CURRENCY, bookmarkedIds: new Set<string>(), onToggleBookmark: noop,
    })],
    ['ListRow(探す)', 'list2', () => {
      const item = deriveDiscoveryDataset([entity]).cases[0];
      return item ? h(DiscoveryRow, { item, selected: false, onSelect: noop }) : null;
    }],
    // 探すの詳細ペイン（AI への文脈 buildContext も同じ reader から作る）
    ['DetailPane(探す)', 'detail2', () => {
      const item = deriveDiscoveryDataset([entity]).cases[0];
      return item ? h(DetailPane, { item }) : null;
    }],
    // 計画画面の参考事例
    ['ExecutionReference', 'execute', () => h(ExecutionReference, { entity: executionSource(entity) })],
  ];
}

// ---- 読み込み（本番 findReleaseEntity → /api/businesses → クライアントと同じ経路）---------
function loadEntity(id: string, hash: string): FinancialEntity | null {
  const shard = `.catalog-release/${hash}.json.gz`;
  const json = gunzipSync(readFileSync(resolve(ROOT, shard)));
  if (createHash('sha256').update(json).digest('hex') !== hash) throw new Error(`hash mismatch: ${id}`);
  const parsed = parseFinancialEntitiesResiliently([JSON.parse(json.toString('utf8'))]);
  const server = parsed.validEntities[0];
  if (!server || server.id !== id) return null;
  return parseFinancialEntity(JSON.parse(JSON.stringify(publicEntity(server))));
}

// ---- 検査 --------------------------------------------------------------------------
const RULES: Array<[RegExp, string]> = [
  ...INTERNAL_TERMS.map((t): [RegExp, string] => [new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), t]),
  ...(PROCESS_RES as Array<[RegExp, string]>),
  ...(SCREEN_ONLY_RES as Array<[RegExp, string]>),
];
const LIST_RULES = LIST_ONLY_RES as Array<[RegExp, string]>;
function findHits(text: { nodes: string[]; lines: string[] }, rules: Array<[RegExp, string]> = RULES): Array<{ label: string; example: string }> {
  const hits = new Map<string, string>();
  for (const src of [text.nodes, text.lines]) {
    for (const line of src) {
      for (const [re, label] of rules) {
        if (hits.has(label)) continue;
        const m = re.exec(line);
        if (m) hits.set(label, line.slice(Math.max(0, m.index - 20), m.index + 60));
      }
    }
  }
  if (rules !== RULES) return [...hits].map(([label, example]) => ({ label, example }));
  for (const line of text.nodes) {
    if (STANDALONE_LINES.includes(line) && !hits.has(`独立行:${line}`)) hits.set(`独立行:${line}`, line);
  }
  return [...hits].map(([label, example]) => ({ label, example }));
}

// ---- 実行 --------------------------------------------------------------------------
const manifest = JSON.parse(readFileSync(resolve(ROOT, 'data/catalog-release.json'), 'utf8')) as { details: Record<string, string> };
let ids = Object.keys(manifest.details);
if (IDS) ids = ids.filter((i) => IDS.includes(i));
ids = ids.slice(0, LIMIT);
if (OUT) mkdirSync(resolve(ROOT, OUT), { recursive: true });

const perPattern = new Map<string, { records: number; examples: Array<{ id: string; text: string }> }>();
const failedParts = new Map<string, { count: number; sample: string }>();
const partsRendered = new Map<string, number>();
const unloadable: string[] = [];
const counts = { facts: 0, metrics: 0, sources: 0 };
let recordsWithHits = 0;
let rendered = 0;
const started = Date.now();
// 描画中の console.error（React の警告）は結果を汚さないよう捨てる
const origError = console.error; console.error = () => undefined;

for (const id of ids) {
  const loaded = loadEntity(id, manifest.details[id]);
  if (!loaded) { unloadable.push(id); continue; }
  const entity = FIXTURE?.[id] ? { ...loaded, reader: FIXTURE[id] } : loaded;
  const chunks: string[] = [];
  const all = { nodes: [] as string[], lines: [] as string[] };
  const list = { nodes: [] as string[], lines: [] as string[] };
  const screens = new Map<string, string>();
  for (const [name, screen, make] of parts(entity)) {
    try {
      const html = renderToStaticMarkup(make());
      screens.set(screen, (screens.get(screen) ?? '') + html);
      const t = extractScreenText(html);
      partsRendered.set(name, (partsRendered.get(name) ?? 0) + 1);
      chunks.push(`===== ${name} =====`, ...t.lines, '');
      all.nodes.push(...t.nodes); all.lines.push(...t.lines);
      if (name.startsWith('ListRow')) { list.nodes.push(...t.nodes); list.lines.push(...t.lines); }
    } catch (e) {
      const prev = failedParts.get(name);
      failedParts.set(name, { count: (prev?.count ?? 0) + 1, sample: prev?.sample ?? `${id}: ${String((e as Error).message).slice(0, 160)}` });
    }
  }
  rendered += 1;
  if (OUT) writeFileSync(resolve(ROOT, OUT, `${id.replace(/[^a-zA-Z0-9_-]/g, '_')}.txt`), chunks.join('\n'));
  const hits = [...findHits(all), ...findHits(list, LIST_RULES)];
  // 出どころの検査: fact・metric・source の外にあって、ui-strings の許可リストにも無い文字 / 中身の無い見出し / 同じ fact の2回目
  const allowed = allowedUiTexts(entity.name);
  // 事例が持つ札（一覧の行と詳細の見出しに出る。caseLabels）は事例のデータから来る文字
  for (const tag of entity.tags ?? []) allowed.add(tag);
  const isAllowed = (t: string) => allowed.has(t) || isUnknownsLine(t);
  for (const [screen, html] of screens) {
    const a = analyzeScreen(html, isAllowed);
    counts.facts += a.factCount; counts.metrics += a.metricCount; counts.sources += a.sourceCount;
    if (a.unowned.length) hits.push({ label: `出どころの無い文字(${screen})`, example: [...new Set(a.unowned)].slice(0, 3).join(' | ') });
    if (a.emptyHeadings.length) hits.push({ label: `中身の無い見出し(${screen})`, example: a.emptyHeadings.join(' | ') });
    if (a.dupFacts.length) hits.push({ label: `同じfactの2回目(${screen})`, example: a.dupFacts.join(' | ') });
  }
  if (hits.length) recordsWithHits += 1;
  for (const hit of hits) {
    const e = perPattern.get(hit.label) ?? { records: 0, examples: [] };
    e.records += 1;
    if (e.examples.length < 20) e.examples.push({ id, text: hit.example });
    perPattern.set(hit.label, e);
  }
  if (rendered % 500 === 0) origError(`  ... ${rendered}/${ids.length} (${Math.round((Date.now() - started) / 1000)}s)`);
}
console.error = origError;

const summary = {
  generatedAt: new Date().toISOString(),
  records: ids.length, rendered, unloadable,
  recordsWithHits,
  counts,
  partsRendered: Object.fromEntries(partsRendered),
  partsFailed: Object.fromEntries(failedParts),
  hitsByPattern: Object.fromEntries([...perPattern].sort((a, b) => b[1].records - a[1].records).map(([k, v]) => [k, { records: v.records, examples: v.examples }])),
  seconds: Math.round((Date.now() - started) / 1000),
};
if (OUT) writeFileSync(resolve(ROOT, OUT, 'summary.json'), JSON.stringify(summary, null, 2));

console.log(`[screen-text] ${rendered}/${ids.length} records rendered in ${summary.seconds}s; ${recordsWithHits} records with hits; ${unloadable.length} unloadable; facts ${counts.facts} / metrics ${counts.metrics} / sources ${counts.sources}`);
for (const [name, f] of failedParts) console.log(`  描けなかった部品 ${name}: ${f.count}件 e.g. ${f.sample}`);
for (const [label, v] of perPattern) console.log(`  ${String(v.records).padStart(5)}件 [${label}] e.g. ${v.examples[0].id}: ${v.examples[0].text}`);
if (CHECK) {
  const total = [...perPattern.values()].reduce((a, v) => a + v.records, 0);
  if (total > 0 || failedParts.size > 0 || unloadable.length > 0) {
    console.error(`[screen-text] FAIL: ${total} hits across ${perPattern.size} patterns; failed parts ${failedParts.size}; unloadable ${unloadable.length}`);
    let shown = 0;
    for (const [label, v] of perPattern) for (const ex of v.examples) { if (shown++ < 20) console.error(`  ${ex.id} [${label}] ${ex.text}`); }
    process.exit(1);
  }
  console.log('[screen-text] OK');
}
