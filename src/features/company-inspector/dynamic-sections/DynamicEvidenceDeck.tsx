'use client';

import {
DynamicEvidenceCard,
DynamicEvidenceCardType,
EvidenceStatus
} from '@/shared/terminal';
import {
FileCode
} from 'lucide-react';
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
          VERIFIED
        </span>
      );
    case 'REPORTED':
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[10px] text-zinc-400">
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
          REPORTED
        </span>
      );
    case 'ESTIMATED':
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[10px] text-zinc-500">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500/70" />
          ESTIMATED
        </span>
      );
    case 'UNKNOWN':
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[10px] text-zinc-600">
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
          UNAUDITED
        </span>
      );
  }
}

// Only data-dependent card kinds use a registry; fixed inspector sections use JSX.
type EvidenceKind = { label: string; hazardLabel?: string };
export const evidenceRegistry = {
  THE_CRIME: { label: '金抜きの本質', hazardLabel: '致命的錯覚の前提' },
  SMOKING_GUN: { label: '現場の現物証拠' },
  DIRTY_GENESIS: { label: '初期ゲリラ戦実録' },
  ASYMMETRIC_LEVERAGE: { label: '非対称損益実額' },
  INCUMBENT_TRAP: { label: '大手の自爆死角' },
  FATAL_BLEED: { label: '死因検死解剖ログ' },
  LOOT_BLUEPRINT: { label: '略奪転用コード' },
  UNKNOWN_AUDIT: { label: '調査限界開示' },
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
                <h4 className="font-mono text-xs font-bold text-white tracking-tight truncate">
                  {card.title}
                </h4>
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
              {/* パンチライン（冷徹な事実結論） */}
              <div className={`text-xs font-semibold leading-relaxed font-sans p-2.5 rounded-r border-l-2 ${
                isHazardMode
                  ? 'text-red-200 border-red-500 bg-red-950/20'
                  : 'text-zinc-100 border-zinc-300 bg-white/[0.03]'
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

              {/* 現物コード / DM実文 / 生データスニペット（存在する場合） */}
              {card.codeSnippet && (
                <div className="rounded-md border border-white/[0.08] bg-[#0A0D14] overflow-hidden">
                  <div className="px-3 py-1.5 bg-white/[0.04] border-b border-white/[0.06] flex items-center justify-between text-[10px] font-mono text-zinc-400 font-bold">
                    <span className="flex items-center gap-1.5 text-zinc-300">
                      <FileCode className="w-3.5 h-3.5 text-zinc-400" />
                      現場保全アーティファクト
                    </span>
                    <span className="text-zinc-500">RAW LOG</span>
                  </div>
                  <pre className="p-3 text-[11px] font-mono text-zinc-200 leading-relaxed whitespace-pre-wrap select-text overflow-x-auto bg-black/50">
                    {card.codeSnippet}
                  </pre>
                </div>
              )}

              {/* 一次情報源（存在する場合） */}
              {card.sourceNote && (
                <div className="pt-1 text-[10px] font-mono text-zinc-400 flex items-center justify-between border-t border-white/[0.04]">
                  <span>一次情報証拠: <strong className="text-zinc-300">{card.sourceNote}</strong></span>
                  <span className="text-zinc-500">REGISTRY AUDIT</span>
                </div>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
};
