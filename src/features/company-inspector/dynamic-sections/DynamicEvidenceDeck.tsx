'use client';

import {
  DynamicEvidenceCard,
  DynamicEvidenceCardType,
  EvidenceStatus
} from '@/shared/terminal';
import React from 'react';

interface DynamicEvidenceDeckProps {
  cards: DynamicEvidenceCard[];
  isHazardMode?: boolean;
}

function renderEvidenceBadge(status: EvidenceStatus) {
  switch (status) {
    case 'VERIFIED':
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[10px] text-zinc-300">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          一次確認済
        </span>
      );
    case 'REPORTED':
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[10px] text-zinc-400">
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
          公開報告・未検証
        </span>
      );
    case 'ESTIMATED':
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[10px] text-zinc-400">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500/70" />
          逆算推計
        </span>
      );
    case 'POST_MORTEM':
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[10px] text-red-400">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
          撤退・失敗の検証
        </span>
      );
    case 'UNKNOWN':
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[10px] text-zinc-500">
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
          未確認
        </span>
      );
  }
}

type EvidenceKind = { label: string; hazardLabel?: string };
export const evidenceRegistry = {
  THE_CRIME: { label: 'キレイゴト抜きの稼ぎ方', hazardLabel: '失敗した思い込みの前提' },
  SMOKING_GUN: { label: '現場の動かぬ証拠' },
  DIRTY_GENESIS: { label: '最初の客を掴んだ泥臭い手口' },
  ASYMMETRIC_LEVERAGE: { label: '通帳に残る本当の利益' },
  INCUMBENT_TRAP: { label: '大企業が真似できない理由' },
  FATAL_BLEED: { label: '会社が潰れた本当の原因' },
  LOOT_BLUEPRINT: { label: '儲かる仕組みの設計図' },
  UNKNOWN_AUDIT: { label: '非公開・未確認の情報' },
} satisfies Record<DynamicEvidenceCardType, EvidenceKind>;

function getCardLabel(type: DynamicEvidenceCardType, isHazard?: boolean): string {
  const kind: EvidenceKind = evidenceRegistry[type];
  return (isHazard && kind.hazardLabel) || kind.label;
}

export const DynamicEvidenceDeck: React.FC<DynamicEvidenceDeckProps> = ({
  cards,
  isHazardMode = false,
}) => {
  if (!cards || cards.length === 0) return null;

  return (
    <div className="divide-y divide-white/[0.06]">
      {cards.map((card, idx) => {
        const label = getCardLabel(card.type, isHazardMode);

        return (
          <article
            key={card.id || `card-${idx}`}
            className="p-4 space-y-3 hover:bg-white/[0.01] transition-colors"
          >
            {/* メタ行: インデックス / 種別 / タイトル / ステータス */}
            <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  isHazardMode ? 'text-red-400 bg-red-950/40 border border-red-500/30' : 'text-zinc-300 bg-white/[0.06] border border-white/[0.10]'
                }`}>
                  DOC #{String(idx + 1).padStart(2, '0')}
                </span>
                <span className="font-mono text-[11px] font-semibold text-zinc-300 uppercase tracking-wider">
                  {label}
                </span>
                {card.title && (
                  <span className="text-zinc-400 font-sans text-xs truncate">
                    {'//'} {card.title}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {card.badge && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-zinc-400 bg-white/[0.03] border border-white/[0.06]">
                    {card.badge}
                  </span>
                )}
                {renderEvidenceBadge(card.evidenceStatus)}
              </div>
            </div>

            {/* パンチライン（要諦） */}
            <div className={`text-xs sm:text-sm font-semibold leading-snug font-sans pl-3 border-l-2 ${
              isHazardMode
                ? 'text-red-200 border-red-500'
                : 'text-zinc-100 border-zinc-400'
            }`}>
              {card.punchline}
            </div>

            {/* メトリクスハイライト */}
            {card.metrics && card.metrics.length > 0 && (
              <div className="p-2 rounded bg-white/[0.02] border border-white/[0.04] grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono">
                {card.metrics.map((m, mIdx) => (
                  <div key={mIdx} className="space-y-0.5">
                    <span className="text-[10px] text-zinc-400 block truncate">{m.label}</span>
                    <span className={`text-xs font-bold block truncate tabular-nums ${m.isHighlight ? 'text-zinc-100' : 'text-zinc-300'}`}>
                      {m.value}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* 詳細事実の箇条書き */}
            {card.details && card.details.length > 0 && (
              <ul className="space-y-1 text-xs text-zinc-300 leading-relaxed font-sans pl-1">
                {card.details.map((detail, dIdx) => (
                  <li key={dIdx} className="flex items-start gap-2">
                    <span className="text-zinc-500 font-mono text-[10px] shrink-0 mt-0.5">-</span>
                    <span className="text-zinc-300">{detail}</span>
                  </li>
                ))}
              </ul>
            )}
          </article>
        );
      })}
    </div>
  );
};
