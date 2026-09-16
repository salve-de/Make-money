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

// 証拠ステータスバッジのスタイル（冷徹なモノトーン・金融インジケーター）
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

// Only data-dependent card kinds use a registry; fixed inspector sections use JSX.
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
    <div className="space-y-4">
      {cards.map((card, idx) => {
        const label = getCardLabel(card.type, isHazardMode);

        return (
          <article
            key={card.id || `card-${idx}`}
            className="rounded-lg overflow-hidden border border-white/[0.10] bg-[#111624] shadow-lg transition-colors"
          >
            {/* 監査ヘッダー: インデックス ＆ 種別 ＆ タイトル ＆ ステータス (Level 2: #161E2E) */}
            <div className="flex items-center justify-between gap-2 flex-wrap px-3.5 py-2.5 bg-[#161E2E] border-b border-white/[0.08]">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono text-xs font-bold text-zinc-300 bg-white/[0.06] px-1.5 py-0.5 rounded border border-white/[0.10]">
                  #{String(idx + 1).padStart(2, '0')}
                </span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                  isHazardMode
                    ? 'text-red-300 bg-red-950/60 border border-red-500/40'
                    : 'text-zinc-200 bg-white/[0.08] border border-white/[0.14]'
                }`}>
                  {label}
                </span>
                <span className="font-mono text-[11px] text-zinc-400 tracking-tight truncate">
                  {card.title}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {card.badge && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono text-zinc-300 bg-white/[0.04] border border-white/[0.08]">
                    {card.badge}
                  </span>
                )}
                {renderEvidenceBadge(card.evidenceStatus)}
              </div>
            </div>

            <div className="p-3.5 space-y-3 bg-[#111624]">
              {/* 大見出しパンチライン（冷徹な事実結論・脳幹直撃） */}
              <div className={`text-sm sm:text-base font-black leading-snug font-sans p-3 rounded-lg border-l-4 ${
                isHazardMode
                  ? 'text-red-100 border-red-500 bg-red-950/30 shadow-[0_0_16px_rgba(239,68,68,0.12)]'
                  : 'text-white border-cyan-400 bg-white/[0.04] shadow-[0_0_16px_rgba(6,182,212,0.10)]'
              }`}>
                {card.punchline}
              </div>

              {/* メトリクスハイライト（存在する場合） (Level 3: #182030) */}
              {card.metrics && card.metrics.length > 0 && (
                <div className="p-2.5 bg-[#182030] border border-white/[0.06] rounded-md grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono">
                  {card.metrics.map((m, mIdx) => (
                    <div key={mIdx} className="space-y-0.5">
                      <span className="text-[10px] text-zinc-400 block truncate font-medium">{m.label}</span>
                      <span className={`text-xs font-bold block truncate tabular-nums ${m.isHighlight ? 'text-emerald-400' : 'text-zinc-100'}`}>
                        {m.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* 詳細客観事実の箇条書き */}
              {card.details && card.details.length > 0 && (
                <ul className="space-y-1.5 text-xs text-zinc-300 leading-relaxed font-sans pl-1">
                  {card.details.map((detail, dIdx) => (
                    <li key={dIdx} className="flex items-start gap-2">
                      <span className="text-zinc-500 font-mono text-xs shrink-0 mt-0.5">■</span>
                      <span className="text-zinc-200">{detail}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
};
