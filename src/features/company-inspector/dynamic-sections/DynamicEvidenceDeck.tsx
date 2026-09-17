'use client';

import {
  DynamicEvidenceCard,
  DynamicEvidenceCardType,
  EvidenceStatus,
} from '@/shared/terminal';
import { ChevronDown, ChevronRight, Code2 } from 'lucide-react';
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
  return (isHazard && kind?.hazardLabel) || kind?.label || '事実証拠';
}

function statusMeta(status: EvidenceStatus): { label: string; dot: string; text: string } {
  switch (status) {
    case 'VERIFIED':
      return { label: '一次確認済', dot: 'bg-emerald-400', text: 'text-emerald-300' };
    case 'REPORTED':
      return { label: '創業者公表', dot: 'bg-zinc-300', text: 'text-zinc-200' };
    case 'ESTIMATED':
      return { label: '逆算推計', dot: 'bg-amber-400', text: 'text-amber-300' };
    case 'POST_MORTEM':
      return { label: '撤退・失敗の検証', dot: 'bg-red-400', text: 'text-red-300' };
    case 'UNKNOWN':
      return { label: '未確認', dot: 'bg-zinc-500', text: 'text-zinc-400' };
  }
}

export const DynamicEvidenceDeck: React.FC<DynamicEvidenceDeckProps> = ({
  cards,
  isHazardMode = false,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!cards || cards.length === 0) return null;

  return (
    <div className="divide-y divide-white/[0.06]">
      {cards.map((card, idx) => {
        const rowId = card.id || `card-${idx}`;
        const expanded = expandedId === rowId;
        const label = getCardLabel(card.type, isHazardMode);
        const status = statusMeta(card.evidenceStatus);
        const detailCount = card.details?.length || 0;
        const metricCount = card.metrics?.length || 0;
        const hasCode = Boolean(card.codeSnippet);

        return (
          <article key={rowId} className="bg-[#0c1017]">
            <button
              type="button"
              onClick={() => setExpandedId(expanded ? null : rowId)}
              aria-expanded={expanded}
              className="grid w-full grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white/[0.025] focus-visible:outline-none sm:grid-cols-[40px_100px_minmax(0,1fr)_auto]"
            >
              {/* 番号 */}
              <span className="font-mono text-xs tabular-nums text-zinc-400 font-semibold">
                {String(idx + 1).padStart(2, '0')}
              </span>

              {/* 分類バッジ */}
              <span className={`hidden text-[11px] font-mono font-semibold sm:block ${
                isHazardMode ? 'text-red-400' : 'text-zinc-300'
              }`}>
                {label}
              </span>

              {/* タイトルとパンチライン */}
              <span className="min-w-0">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-xs sm:text-[13px] font-bold text-zinc-100">
                    {card.title}
                  </span>
                  {card.badge && (
                    <span className="hidden shrink-0 rounded border border-white/[0.09] bg-white/[0.03] px-1.5 py-0.5 font-mono text-[10px] text-zinc-400 lg:inline">
                      {card.badge}
                    </span>
                  )}
                  {hasCode && (
                    <span className="hidden shrink-0 items-center gap-1 rounded border border-cyan-500/30 bg-cyan-950/40 px-1.5 py-0.5 font-mono text-[10px] text-cyan-300 md:inline-flex">
                      <Code2 className="w-3 h-3" />
                      LOGIC
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block truncate text-[11px] sm:text-xs text-zinc-400" title={card.punchline}>
                  {card.punchline}
                </span>
              </span>

              {/* 右側ステータスと開閉 */}
              <span className="flex shrink-0 items-center gap-3">
                <span className="hidden items-center gap-2 font-mono text-[10px] text-zinc-400 md:flex">
                  {detailCount > 0 && <span>事実 {detailCount}</span>}
                  {metricCount > 0 && <span>数値 {metricCount}</span>}
                </span>
                <span className={`inline-flex items-center gap-1.5 font-mono text-[11px] ${status.text}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                  {status.label}
                </span>
                {expanded ? (
                  <ChevronDown className="h-4 w-4 text-zinc-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-zinc-400" />
                )}
              </span>
            </button>

            {/* 展開された詳細 */}
            {expanded && (
              <div className="border-t border-white/[0.06] bg-[#090d13] px-4 py-4 sm:pl-[152px] sm:pr-6 space-y-3.5">
                <p className={`text-xs sm:text-[13px] font-semibold leading-relaxed ${
                  isHazardMode ? 'text-red-200' : 'text-zinc-100'
                }`}>
                  {card.punchline}
                </p>

                {/* メトリクス */}
                {card.metrics && card.metrics.length > 0 && (
                  <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4 rounded-lg border border-white/[0.06] bg-[#0c1017] p-2.5">
                    {card.metrics.map((metric, metricIndex) => (
                      <div key={`${metric.label}-${metricIndex}`} className="p-1 min-w-0">
                        <dt className="truncate text-[10px] font-mono text-zinc-400">{metric.label}</dt>
                        <dd className={`mt-0.5 truncate font-mono text-xs sm:text-sm font-bold tabular-nums ${
                          metric.isHighlight ? 'text-emerald-400' : 'text-zinc-100'
                        }`}>
                          {metric.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}

                {/* 詳細ファクトリスト */}
                {card.details && card.details.length > 0 && (
                  <div className="divide-y divide-white/[0.05]">
                    {card.details.map((detail, detailIndex) => (
                      <div key={detailIndex} className="grid grid-cols-[20px_minmax(0,1fr)] gap-2 py-2 text-xs leading-relaxed">
                        <span className="font-mono tabular-nums text-cyan-400 font-semibold">
                          {String(detailIndex + 1).padStart(2, '0')}
                        </span>
                        <span className="text-zinc-200">{detail}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* コードスニペット / ロジック */}
                {card.codeSnippet && (
                  <div className="rounded-lg border border-white/[0.08] bg-[#07090e] p-3 overflow-x-auto">
                    <div className="text-[10px] font-mono text-zinc-400 mb-1.5 flex items-center gap-1.5">
                      <Code2 className="w-3.5 h-3.5 text-cyan-400" />
                      <span>現場ロジック / 試算アルゴリズム</span>
                    </div>
                    <pre className="font-mono text-[11px] leading-relaxed text-zinc-300">
                      <code>{card.codeSnippet}</code>
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
