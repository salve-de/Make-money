'use client';

import React from 'react';
import { 
  DynamicEvidenceCard, 
  DynamicEvidenceCardType, 
  EvidenceStatus 
} from '../../types/terminal';
import { 
  KeyRound, 
  Flame, 
  Crosshair, 
  TrendingUp, 
  ShieldCheck, 
  Skull, 
  Wrench, 
  Lock, 
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  FileCode,
  Sparkles
} from 'lucide-react';

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

// カード種別のラベル定義（余計な配色は完全排除・モノトーン統一）
function getCardLabel(type: DynamicEvidenceCardType, isHazard?: boolean): string {
  switch (type) {
    case 'THE_CRIME':
      return isHazard ? '致命的錯覚の前提' : '金抜きの本質';
    case 'SMOKING_GUN':
      return '現場の現物証拠';
    case 'DIRTY_GENESIS':
      return '初期ゲリラ戦実録';
    case 'ASYMMETRIC_LEVERAGE':
      return '非対称損益実額';
    case 'INCUMBENT_TRAP':
      return '大手の自爆死角';
    case 'FATAL_BLEED':
      return '死因検死解剖ログ';
    case 'LOOT_BLUEPRINT':
      return '略奪転用コード';
    case 'UNKNOWN_AUDIT':
      return '調査限界開示';
  }
}

export const DynamicEvidenceDeck: React.FC<DynamicEvidenceDeckProps> = ({
  cards,
  isHazardMode = false,
}) => {
  if (!cards || cards.length === 0) return null;

  return (
    <div className="border border-white/[0.08] divide-y divide-white/[0.06] bg-[#07090E] rounded-none">
      {cards.map((card, idx) => {
        const label = getCardLabel(card.type, isHazardMode);

        return (
          <article 
            key={card.id || `card-${idx}`}
            className="p-3.5 space-y-2.5 transition-colors hover:bg-white/[0.01]"
          >
            {/* 監査ヘッダー: インデックス ＆ 種別 ＆ タイトル ＆ ステータス */}
            <div className="flex items-center justify-between gap-2 flex-wrap border-b border-white/[0.04] pb-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono text-[10px] text-zinc-500 font-bold">
                  #{String(idx + 1).padStart(2, '0')}
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-medium text-zinc-300 bg-white/[0.04] border border-white/[0.08]">
                  {label}
                </span>
                <h3 className="font-mono text-xs font-bold text-white tracking-tight truncate">
                  {card.title}
                </h3>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {card.badge && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono text-zinc-400 bg-white/[0.02] border border-white/[0.06]">
                    {card.badge}
                  </span>
                )}
                {renderEvidenceBadge(card.evidenceStatus)}
              </div>
            </div>

            {/* パンチライン（冷徹な事実結論） */}
            <div className="text-xs font-semibold text-zinc-200 leading-relaxed font-sans pl-2 border-l-2 border-white/[0.2]">
              {card.punchline}
            </div>

            {/* メトリクスハイライト（存在する場合） */}
            {card.metrics && card.metrics.length > 0 && (
              <div className="p-2 bg-[#040507] border border-white/[0.04] grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono">
                {card.metrics.map((m, mIdx) => (
                  <div key={mIdx} className="space-y-0.5">
                    <span className="text-[9px] text-zinc-500 block truncate">{m.label}</span>
                    <span className={`text-xs font-bold block truncate ${m.isHighlight ? 'text-emerald-400' : 'text-zinc-200'}`}>
                      {m.value}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* 詳細客観事実の箇条書き */}
            {card.details && card.details.length > 0 && (
              <ul className="space-y-1 text-[11px] text-zinc-400 leading-relaxed font-sans pl-1">
                {card.details.map((detail, dIdx) => (
                  <li key={dIdx} className="flex items-start gap-2">
                    <span className="text-zinc-600 font-mono text-[10px] shrink-0 mt-0.5">—</span>
                    <span className="text-zinc-300">{detail}</span>
                  </li>
                ))}
              </ul>
            )}

            {/* 現物コード / DM実文 / 生データスニペット（存在する場合） */}
            {card.codeSnippet && (
              <div className="border border-white/[0.06] bg-[#030406] overflow-hidden">
                <div className="px-2.5 py-1 bg-white/[0.02] border-b border-white/[0.04] flex items-center justify-between text-[9px] font-mono text-zinc-500">
                  <span className="flex items-center gap-1.5 text-zinc-400 font-semibold">
                    <FileCode className="w-3 h-3 text-zinc-400" />
                    現場保全アーティファクト
                  </span>
                  <span className="text-zinc-600">RAW LOG</span>
                </div>
                <pre className="p-3 text-[10.5px] font-mono text-zinc-300 leading-relaxed whitespace-pre-wrap select-text overflow-x-auto bg-black/40">
                  {card.codeSnippet}
                </pre>
              </div>
            )}

            {/* 一次情報源（存在する場合） */}
            {card.sourceNote && (
              <div className="pt-1 text-[9px] font-mono text-zinc-500 flex items-center justify-between">
                <span>一次情報証拠: <strong className="text-zinc-400">{card.sourceNote}</strong></span>
                <span className="text-zinc-700">REGISTRY AUDIT</span>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
};
