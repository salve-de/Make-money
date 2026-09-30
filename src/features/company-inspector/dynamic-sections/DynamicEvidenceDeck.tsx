'use client';

import { cleanDisplayText, sourceKindLabel } from '@/shared/display-text';
import {
  DynamicEvidenceCard,
  DynamicEvidenceCardType,
} from '@/shared/terminal';
import { ChevronDown, ChevronRight, Code2 } from 'lucide-react';
import React, { useState } from 'react';

interface DynamicEvidenceDeckProps {
  cards: DynamicEvidenceCard[];
  isHazardMode?: boolean;
}

type EvidenceKind = { label: string; hazardLabel?: string };

export const evidenceRegistry = {
  THE_CRIME: { label: '収益の仕組み', hazardLabel: '事業上の要因' },
  SMOKING_GUN: { label: '根拠' },
  DIRTY_GENESIS: { label: '立ち上げ初期' },
  ASYMMETRIC_LEVERAGE: { label: '利益構造' },
  INCUMBENT_TRAP: { label: '競争上の条件' },
  FATAL_BLEED: { label: '損失の要因' },
  LOOT_BLUEPRINT: { label: '事業モデル' },
  UNKNOWN_AUDIT: { label: '未確認' },
} satisfies Record<DynamicEvidenceCardType, EvidenceKind>;

function getCardLabel(card: DynamicEvidenceCard, isHazard?: boolean): string {
  // 出典を並べただけのカード（種別が「未確認」のもの）に「未確認」の分類を付けない
  if (card.type === 'UNKNOWN_AUDIT') return card.title.startsWith('出典') ? '' : '記録';
  const kind: EvidenceKind = evidenceRegistry[card.type];
  return (isHazard && kind?.hazardLabel) || kind?.label || '事実証拠';
}

/** 読者向けの出典の区分。判定できない・中身の無い状態（未確認・出典リンクなし）は null（出さない）。 */
export function evidenceStatusLabel(card: DynamicEvidenceCard): string | null {
  if (card.evidenceStatus === 'ESTIMATED') return '推計';
  // 出典リンクが無いカードに、出典に裏付けられた印は付けない
  if (!/https?:\/\/\S+/i.test(card.sourceNote || '')) return null;
  const kind = sourceKindLabel({ text: card.sourceNote, sourceClass: card.sourceClass });
  if (kind) return kind;
  switch (card.evidenceStatus) {
    case 'VERIFIED': return '一次資料';
    case 'POST_MORTEM': return '事後資料';
    default: return null;
  }
}

const STATUS_TONE: Record<string, { dot: string; text: string }> = {
  開示資料: { dot: 'bg-emerald-400', text: 'text-emerald-300' },
  一次資料: { dot: 'bg-emerald-400', text: 'text-emerald-300' },
  推計: { dot: 'bg-amber-400', text: 'text-amber-300' },
  事後資料: { dot: 'bg-red-400', text: 'text-red-300' },
};

/** バッジが題名・分類・状態と同じ意味なら出さない（「出典: …」の横の「出典」、「確認済み」「未確認」など）。 */
function showBadge(card: DynamicEvidenceCard, label: string, status: string | null): boolean {
  const badge = card.badge?.trim();
  if (!badge) return false;
  if (badge === label || badge === status) return false;
  if (/^(?:出典|確認済み|未確認)$/.test(badge)) return false;
  return true;
}

/** 本文（要点・詳細・数値・コード）が1つも無いカードは、出典だけの空の行になるので出さない。 */
export function hasEvidenceBody(card: DynamicEvidenceCard): boolean {
  return Boolean(cleanDisplayText(card.punchline))
    || (card.details ?? []).some((detail) => Boolean(cleanDisplayText(detail)))
    || (card.metrics?.length ?? 0) > 0
    || Boolean(card.codeSnippet?.trim());
}

export const DynamicEvidenceDeck: React.FC<DynamicEvidenceDeckProps> = ({
  cards: allCards,
  isHazardMode = false,
}) => {
  const cards = (allCards ?? []).filter(hasEvidenceBody);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!cards || cards.length === 0) return null;

  return (
    <div className="divide-y divide-term-line-soft">
      {cards.map((card, idx) => {
        // Evidence IDs are source identifiers, not guaranteed to be unique after
        // multiple read-time projections. Keep the UI key unique per rendered row.
        const rowId = `${card.id || 'card'}-${idx}`;
        const expanded = expandedId === rowId;
        const label = getCardLabel(card, isHazardMode);
        const statusText = evidenceStatusLabel(card);
        const status = statusText ? { label: statusText, ...(STATUS_TONE[statusText] ?? { dot: 'bg-zinc-300', text: 'text-zinc-200' }) } : null;
        const badgeShown = showBadge(card, label, statusText);
        const detailCount = card.details?.length || 0;
        const metricCount = card.metrics?.length || 0;
        const hasCode = Boolean(card.codeSnippet);

        return (
          <article key={rowId} className="bg-term-panel">
            <button
              type="button"
              onClick={() => setExpandedId(expanded ? null : rowId)}
              aria-expanded={expanded}
              className="grid w-full grid-cols-[24px_minmax(0,1fr)_auto] items-start gap-2 px-3 py-2.5 text-left transition-colors hover:bg-term-head focus-visible:outline-none"
            >
              {/* 番号 */}
              <span className="pt-px font-mono text-xs tabular-nums text-term-label">
                {String(idx + 1).padStart(2, '0')}
              </span>

              {/* 分類・タイトル・要点（詳細欄の幅でも読めるよう1列にまとめる） */}
              <span className="min-w-0">
                <span className={`block text-xs ${isHazardMode ? 'text-term-danger' : 'text-term-label'}`}>{label}</span>
                <span className="flex min-w-0 items-center gap-2">
                  <span className="line-clamp-2 text-xs sm:text-[13px] font-bold text-zinc-100">
                    {card.title}
                  </span>
                  {badgeShown && (
                    <span className="hidden shrink-0 rounded border border-white/[0.09] bg-white/[0.03] px-1.5 py-0.5 font-mono text-[10px] text-zinc-400 lg:inline">
                      {card.badge}
                    </span>
                  )}
                  {hasCode && (
                    <span className="hidden shrink-0 items-center gap-1 rounded-sm border border-term-line px-1.5 py-0.5 font-mono text-xs text-term-fg md:inline-flex">
                      <Code2 className="w-3 h-3" />
                      コード
                    </span>
                  )}
                </span>
                <span className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-300">
                  {cleanDisplayText(card.punchline)}
                </span>
                {status && <span className={`mt-1.5 flex items-center gap-1.5 text-[11px] sm:hidden ${status.text}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />{status.label}
                </span>}
              </span>

              {/* 右側ステータスと開閉 */}
              <span className="flex shrink-0 items-center gap-3">
                <span className="hidden items-center gap-2 font-mono text-[10px] text-zinc-400 md:flex">
                  {detailCount > 0 && <span>詳細 {detailCount}</span>}
                  {metricCount > 0 && <span>数値 {metricCount}</span>}
                </span>
                {status && <span className={`hidden items-center gap-1.5 font-mono text-[11px] sm:inline-flex ${status.text}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                  {status.label}
                </span>}
                {expanded ? (
                  <ChevronDown className="h-4 w-4 text-zinc-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-zinc-400" />
                )}
              </span>
            </button>

            {/* 展開された詳細 */}
            {expanded && (
              <div className="border-t border-term-line-soft bg-term-bg px-4 py-4 sm:pl-[152px] sm:pr-6 space-y-3.5">
                <p className={`text-xs sm:text-[13px] font-semibold leading-relaxed ${
                  isHazardMode ? 'text-term-danger' : 'text-zinc-100'
                }`}>
                  {cleanDisplayText(card.punchline)}
                </p>

                {/* メトリクス */}
                {card.metrics && card.metrics.length > 0 && (
                  <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4 rounded-sm border border-term-line-soft bg-term-panel p-2.5">
                    {card.metrics.map((metric, metricIndex) => (
                      <div key={`${metric.label}-${metricIndex}`} className="p-1 min-w-0">
                        <dt className="truncate text-xs font-mono text-zinc-400">{metric.label}</dt>
                        <dd className={`mt-0.5 truncate font-mono text-xs sm:text-sm font-bold tabular-nums ${
                          metric.isHighlight ? 'text-term-positive' : 'text-zinc-100'
                        }`}>
                          {metric.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}

                {/* 詳細ファクトリスト */}
                {card.details && card.details.length > 0 && (
                  <div className="divide-y divide-term-line-soft">
                    {card.details.map((detail, detailIndex) => (
                      <div key={detailIndex} className="grid grid-cols-[20px_minmax(0,1fr)] gap-2 py-2 text-xs leading-relaxed">
                        <span className="font-mono tabular-nums text-term-fg font-semibold">
                          {String(detailIndex + 1).padStart(2, '0')}
                        </span>
                        <span className="text-zinc-200">{cleanDisplayText(detail)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* コードスニペット / ロジック */}
                {card.codeSnippet && (
                  <div className="rounded-sm border border-term-line-soft bg-term-bg p-3 overflow-x-auto">
                    <div className="text-xs font-mono text-zinc-400 mb-1.5 flex items-center gap-1.5">
                      <Code2 className="w-3.5 h-3.5 text-term-fg" />
                      <span>コード例・計算手順</span>
                    </div>
                    <pre className="font-mono text-xs leading-relaxed text-zinc-300">
                      <code>{card.codeSnippet.replace(/\p{Extended_Pictographic}|\uFE0F/gu, '')}</code>
                    </pre>
                  </div>
                )}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
};
