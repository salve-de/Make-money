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

// 証拠ステータスバッジのスタイル
function renderEvidenceBadge(status: EvidenceStatus) {
  switch (status) {
    case 'VERIFIED':
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          <CheckCircle2 className="w-2.5 h-2.5" />
          VERIFIED (一次確証)
        </span>
      );
    case 'REPORTED':
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
          <Sparkles className="w-2.5 h-2.5" />
          REPORTED (創業者公言)
        </span>
      );
    case 'ESTIMATED':
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
          <AlertTriangle className="w-2.5 h-2.5" />
          ESTIMATED (業界推計)
        </span>
      );
    case 'UNKNOWN':
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-zinc-800 text-zinc-400 border border-zinc-700">
          <HelpCircle className="w-2.5 h-2.5" />
          UNKNOWN (非公開)
        </span>
      );
  }
}

// カード種別のメタデータ定義
function getCardMeta(type: DynamicEvidenceCardType, isHazard?: boolean) {
  switch (type) {
    case 'THE_CRIME':
      return {
        label: isHazard ? '致命的錯覚の前提' : '金抜きの本質',
        badgeColor: isHazard ? 'text-red-400 bg-red-950/40 border-red-500/30' : 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30',
        borderColor: isHazard ? 'border-red-500/30' : 'border-emerald-500/30',
        icon: isHazard ? Skull : KeyRound,
        iconColor: isHazard ? 'text-red-400' : 'text-emerald-400',
        bgAccent: isHazard ? 'bg-red-950/10' : 'bg-emerald-950/10'
      };
    case 'SMOKING_GUN':
      return {
        label: '現場の現物証拠',
        badgeColor: 'text-amber-400 bg-amber-950/40 border-amber-500/30',
        borderColor: 'border-amber-500/30',
        icon: Flame,
        iconColor: 'text-amber-400',
        bgAccent: 'bg-amber-950/10'
      };
    case 'DIRTY_GENESIS':
      return {
        label: '初期泥臭い0➔1ゲリラ戦',
        badgeColor: 'text-cyan-400 bg-cyan-950/40 border-cyan-500/30',
        borderColor: 'border-cyan-500/30',
        icon: Crosshair,
        iconColor: 'text-cyan-400',
        bgAccent: 'bg-cyan-950/10'
      };
    case 'ASYMMETRIC_LEVERAGE':
      return {
        label: '非対称レバレッジ・P&L実額',
        badgeColor: 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30',
        borderColor: 'border-emerald-500/25',
        icon: TrendingUp,
        iconColor: 'text-emerald-400',
        bgAccent: 'bg-emerald-950/10'
      };
    case 'INCUMBENT_TRAP':
      return {
        label: '大手の自爆・カニバリズム死角',
        badgeColor: 'text-purple-400 bg-purple-950/40 border-purple-500/30',
        borderColor: 'border-purple-500/25',
        icon: ShieldCheck,
        iconColor: 'text-purple-400',
        bgAccent: 'bg-purple-950/10'
      };
    case 'FATAL_BLEED':
      return {
        label: '死因検死解剖・即死ログ',
        badgeColor: 'text-red-400 bg-red-950/50 border-red-500/40',
        borderColor: 'border-red-500/40',
        icon: AlertTriangle,
        iconColor: 'text-red-400',
        bgAccent: 'bg-red-950/20'
      };
    case 'LOOT_BLUEPRINT':
      return {
        label: '今夜別業界へ転用する略奪コード',
        badgeColor: 'text-blue-400 bg-blue-950/40 border-blue-500/30',
        borderColor: 'border-blue-500/25',
        icon: Wrench,
        iconColor: 'text-blue-400',
        bgAccent: 'bg-blue-950/10'
      };
    case 'UNKNOWN_AUDIT':
      return {
        label: '調査限界・ブラックボックス開示',
        badgeColor: 'text-zinc-400 bg-zinc-900 border-zinc-700',
        borderColor: 'border-zinc-800',
        icon: Lock,
        iconColor: 'text-zinc-500',
        bgAccent: 'bg-zinc-900/30'
      };
  }
}

export const DynamicEvidenceDeck: React.FC<DynamicEvidenceDeckProps> = ({
  cards,
  isHazardMode = false,
}) => {
  if (!cards || cards.length === 0) return null;

  return (
    <div className="space-y-4">
      {cards.map((card, idx) => {
        const meta = getCardMeta(card.type, isHazardMode);
        const Icon = meta.icon;

        return (
          <article 
            key={card.id || `card-${idx}`}
            className={`border rounded-md bg-[#0A0C10] overflow-hidden shadow-md transition-all duration-150 ${meta.borderColor} ${meta.bgAccent}`}
          >
            {/* カード上部バー: 種別ラベル ＆ 証拠ステータス ＆ バッジ */}
            <div className="px-3.5 py-2 border-b border-white/[0.06] bg-black/40 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider border ${meta.badgeColor} flex items-center gap-1.5`}>
                  <Icon className={`w-3 h-3 ${meta.iconColor}`} />
                  {meta.label}
                </span>
                <span className="font-mono text-xs font-bold text-white tracking-tight">
                  {card.title}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {card.badge && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono text-zinc-400 bg-white/[0.04] border border-white/[0.08]">
                    {card.badge}
                  </span>
                )}
                {renderEvidenceBadge(card.evidenceStatus)}
              </div>
            </div>

            {/* パンチライン（1行で脳汁が出る急所・結論） */}
            <div className="p-3.5 pb-2">
              <p className="text-xs font-bold text-zinc-100 leading-snug font-sans flex items-start gap-2">
                <span className="text-emerald-400 font-mono select-none">▶</span>
                <span>{card.punchline}</span>
              </p>
            </div>

            {/* メトリクスハイライト（存在する場合） */}
            {card.metrics && card.metrics.length > 0 && (
              <div className="mx-3.5 mb-2.5 p-2 rounded bg-black/60 border border-white/[0.06] grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono">
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
              <div className="px-3.5 pb-3">
                <ul className="space-y-1.5 text-[11px] text-zinc-300 leading-relaxed font-sans">
                  {card.details.map((detail, dIdx) => (
                    <li key={dIdx} className="flex items-start gap-2">
                      <span className="text-zinc-500 font-mono text-[10px] shrink-0 mt-0.5">•</span>
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 現物コード / DM実文 / 生データスニペット（存在する場合） */}
            {card.codeSnippet && (
              <div className="mx-3.5 mb-3 rounded border border-white/[0.08] bg-[#050608] overflow-hidden">
                <div className="px-2.5 py-1 bg-white/[0.03] border-b border-white/[0.04] flex items-center justify-between text-[9px] font-mono text-zinc-400">
                  <span className="flex items-center gap-1 text-amber-300">
                    <FileCode className="w-3 h-3 text-amber-400" />
                    現場保全テキスト・現物ログ
                  </span>
                  <span className="text-zinc-500">RAW ARTIFACT</span>
                </div>
                <pre className="p-3 text-[10.5px] font-mono text-zinc-200 leading-relaxed whitespace-pre-wrap select-text overflow-x-auto">
                  {card.codeSnippet}
                </pre>
              </div>
            )}

            {/* 一次情報源（存在する場合） */}
            {card.sourceNote && (
              <div className="px-3.5 py-1.5 border-t border-white/[0.04] bg-black/30 flex items-center justify-between text-[9px] font-mono text-zinc-500">
                <span>一次情報証拠: <strong className="text-zinc-400">{card.sourceNote}</strong></span>
                <span className="text-zinc-600">FORENSIC REGISTRY</span>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
};
