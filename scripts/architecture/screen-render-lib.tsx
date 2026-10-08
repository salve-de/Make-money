/**
 * 画面の文字を実際に描いて取り出す部品（scripts/architecture/screen-text.tsx と scripts/reader-case/screen-lines.tsx が共有する）。
 * 公開データ（.catalog-release/<hash>.json.gz）を本番と同じ読み込みで開き、CompanyInspectorPane と同じ部品・同じ props を
 * renderToStaticMarkup で描き、タグを除いて画面の文字だけにする。
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
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
import { parseFinancialEntitiesResiliently, parseFinancialEntity } from '@/shared/financial-entity-schema';
import type { FinancialEntity } from '@/shared/terminal';

export { renderToStaticMarkup };
const CURRENCY = 'JPY' as const;

// ---- 文字の取り出し ----------------------------------------------------------------
const VISIBLE_ATTRS = ['title', 'aria-label', 'alt', 'placeholder'];
export const decode = (s: string) => s
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
export type Part = [string, 'ledger' | 'audit' | 'list' | 'list2' | 'detail2' | 'execute', () => React.ReactElement | null];
export function parts(entity: FinancialEntity, fixture?: Record<string, FinancialEntity['reader']>): Part[] {
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
      entities: [{ ...publicSummaryEntity(entity), ...(fixture && entity.reader ? { reader: entity.reader } : {}) } as unknown as FinancialEntity], selectedEntityId: null, onSelectEntity: noop,
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
export function loadEntity(id: string, hash: string, root: string = process.cwd()): FinancialEntity | null {
  const shard = `.catalog-release/${hash}.json.gz`;
  const json = gunzipSync(readFileSync(resolve(root, shard)));
  if (createHash('sha256').update(json).digest('hex') !== hash) throw new Error(`hash mismatch: ${id}`);
  const parsed = parseFinancialEntitiesResiliently([JSON.parse(json.toString('utf8'))]);
  const server = parsed.validEntities[0];
  if (!server || server.id !== id) return null;
  return parseFinancialEntity(JSON.parse(JSON.stringify(publicEntity(server))));
}

