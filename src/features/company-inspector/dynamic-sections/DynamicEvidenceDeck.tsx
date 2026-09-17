'use client';

import {
  DynamicEvidenceCard,
  DynamicEvidenceCardType,
  EvidenceStatus,
} from '@/shared/terminal';
import { ChevronDown, ChevronRight } from 'lucide-react';
import React, { useState } from 'react';

interface DynamicEvidenceDeckProps {
  cards: DynamicEvidenceCard[];
  isHazardMode?: boolean;
}

type EvidenceKind = { label: string; hazardLabel?: string };

export const evidenceRegistry = {
  THE_CRIME: { label: '稼ぎの核心', hazardLabel: '失敗前提' },
  SMOKING_GUN: { label: '現場証拠' },
  DIRTY_GENESIS: { label: '初期獲得' },
  ASYMMETRIC_LEVERAGE: { label: '利益構造' },
  INCUMBENT_TRAP: { label: '競合障壁' },
  FATAL_BLEED: { label: '破綻要因' },
  LOOT_BLUEPRINT: { label: '再現設計' },
  UNKNOWN_AUDIT: { label: '未確認' },
} satisfies Record<DynamicEvidenceCardType, EvidenceKind>;

function getCardLabel(type: DynamicEvidenceCardType, isHazard?: boolean): string {
  const kind: EvidenceKind = evidenceRegistry[type];
  return (isHazard && kind.hazardLabel) || kind.label;
}

function statusMeta(status: EvidenceStatus): { label: string; dot: string; text: string } {
  switch (status) {
    case 'VERIFIED':
      return { label: '一次確認', dot: 'bg-emerald-400', text: 'text-emerald-300' };
    case 'REPORTED':
      return { label: '公表', dot: 'bg-zinc-400', text: 'text-zinc-300' };
    case 'ESTIMATED':
      return { label: '推計', dot: 'bg-amber-400', text: 'text-amber-300' };
    case 'POST_MORTEM':
      return { label: '事後検証', dot: 'bg-red-400', text: 'text-red-300' };
    case 'UNKNOWN':
      return { label: '未確認', dot: 'bg-zinc-600', text: 'text-zinc-500' };
  }
}

export const DynamicEvidenceDeck: React.FC<DynamicEvidenceDeckProps> = ({
  cards,
  isHazardMode = false,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!cards || cards.length === 0) return null;

  return (
    <div className="divide-y divide-white/[0.07]">
      {cards.map((card, idx) => {
        const rowId = card.id || `card-${idx}`;
        const expanded = expandedId === rowId;
        const label = getCardLabel(card.type, isHazardMode);
        const status = statusMeta(card.evidenceStatus);
        const detailCount = card.details?.length || 0;
        const metricCount = card.metrics?.length || 0;

        return (
          <article key={rowId} className="bg-[#0f141d] first:rounded-t-md last:rounded-b-md">
            <button
              type="button"
              onClick={() => setExpandedId(expanded ? null : rowId)}
              aria-expanded={expanded}
              className="grid w-full grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-white/[0.025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400/70 sm:grid-cols-[38px_108px_minmax(0,1fr)_auto]"
            >
              <span className="font-mono text-[10px] tabular-nums text-zinc-600">
                {String(idx + 1).padStart(2, '0')}
              </span>

              <span className={`hidden text-[10px] font-medium sm:block ${isHazardMode ? 'text-red-300' : 'text-zinc-400'}`}>
                {label}
              </span>

              <span className="min-w-0">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-[12px] font-semibold text-zinc-100">{card.title}</span>
                  {card.badge && (
                    <span className="hidden shrink-0 rounded border border-white/[0.08] px-1.5 py-0.5 font-mono text-[9px] text-zinc-500 lg:inline">
                      {card.badge}
                    </span>
                  )}
                </span>
                <span className="mt-1 block truncate text-[11px] text-zinc-400" title={card.punchline}>
                  {card.punchline}
                </span>
              </span>

              <span className="flex shrink-0 items-center gap-3">
                <span className="hidden items-center gap-3 font-mono text-[9px] text-zinc-600 md:flex">
                  {detailCount > 0 && <span>事実 {detailCount}</span>}
                  {metricCount > 0 && <span>数値 {metricCount}</span>}
                </span>
                <span className={`inline-flex items-center gap-1.5 font-mono text-[9px] ${status.text}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                  {status.label}
                </span>
                {expanded ? (
                  <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-zinc-600" />
                )}
              </span>
            </button>

            {expanded && (
              <div className="border-t border-white/[0.06] bg-[#0b0f15] px-3 py-3 sm:px-[158px]">
                <p className={`text-[13px] font-semibold leading-relaxed ${isHazardMode ? 'text-red-100' : 'text-zinc-100'}`}>
                  {card.punchline}
                </p>

                {card.metrics && card.metrics.length > 0 && (
                  <dl className="mt-3 grid grid-cols-2 gap-x-5 gap-y-2 border-y border-white/[0.06] py-2.5 sm:grid-cols-4">
                    {card.metrics.map((metric, metricIndex) => (
                      <div key={`${metric.label}-${metricIndex}`} className="min-w-0">
                        <dt className="truncate text-[9px] text-zinc-500">{metric.label}</dt>
                        <dd className={`mt-0.5 truncate font-mono text-[11px] font-semibold tabular-nums ${metric.isHighlight ? 'text-emerald-300' : 'text-zinc-200'}`}>
                          {metric.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}

                {card.details && card.details.length > 0 && (
                  <div className="mt-3 divide-y divide-white/[0.05]">
                    {card.details.map((detail, detailIndex) => (
                      <div key={detailIndex} className="grid grid-cols-[24px_minmax(0,1fr)] gap-2 py-2 text-[11px] leading-relaxed">
                        <span className="font-mono tabular-nums text-zinc-600">{String(detailIndex + 1).padStart(2, '0')}</span>
                        <span className="text-zinc-300">{detail}</span>
                      </div>
                    ))}
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
