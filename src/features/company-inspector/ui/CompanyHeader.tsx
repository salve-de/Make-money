import { cleanIntelligenceText } from '@/lib/foundation/text-cleaner';
import {
Bot,
ChevronLeft,
ChevronRight,
Clock,
ExternalLink,
Pin,
X
} from 'lucide-react';

import type { InspectorSectionProps } from '../model/section-props';

export function CompanyHeader({ entity, onClose, onPrevEntity, onNextEntity, activeTags = [], onToggleTag, analystNote, onOpenSynthesisWithEntity, isScrolled, scrollToSection, formatMoney, isHazardMode, isFinancialUnavailable }: Pick<InspectorSectionProps, 'entity' | 'onClose' | 'onPrevEntity' | 'onNextEntity' | 'activeTags' | 'onToggleTag' | 'analystNote' | 'onOpenSynthesisWithEntity' | 'isScrolled' | 'scrollToSection' | 'formatMoney' | 'isHazardMode' | 'isFinancialUnavailable'>) {
  return <>
        <div className={`shrink-0 z-30 bg-[#07090D] border-b relative transition-all duration-150 ${
          isScrolled
            ? 'border-white/[0.18] shadow-[0_12px_32px_rgba(0,0,0,0.95)]'
            : 'border-white/[0.10] shadow-[0_4px_16px_rgba(0,0,0,0.6)]'
        }`}>
          {/* 最上部アクセントライン */}
          <div className="h-[1px] w-full bg-white/[0.15]" />

          {/* 1. タイトル＆主要操作バー（1行統合） */}
          <div className="px-3 py-2 flex items-center justify-between gap-2 border-b border-white/[0.04]">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-mono text-[11px] text-white font-bold shrink-0 bg-white/[0.08] px-1.5 py-0.5 rounded border border-white/[0.12] flex items-center gap-1">
                <Pin className="w-2.5 h-2.5 text-zinc-400 shrink-0" />
                <span>{entity.ticker}</span>
              </span>
              <h2 className="text-xs sm:text-sm font-bold text-white truncate font-sans tracking-tight">
                {entity.name}
              </h2>
              <span className="text-[10px] text-zinc-400 font-mono hidden md:inline truncate">
                {entity.legalEntity || entity.founder} ・ {entity.country}
              </span>
              {entity.opportunityJudgment && (
                <span className={`hidden sm:inline-flex px-1.5 py-0.2 rounded text-[9px] font-mono font-bold tracking-wider border shrink-0 ${
                  entity.opportunityJudgment.verdict === 'HAZARD_REJECT'
                    ? 'bg-red-950/40 text-red-400 border-red-500/40'
                    : 'bg-white/[0.08] text-white border-white/[0.16]'
                }`}>
                  {entity.opportunityJudgment.verdictLabel}
                </span>
              )}
            </div>

            {/* 右側アクション */}
            <div className="flex items-center gap-1 shrink-0">
              {/* 銘柄ナビゲーション */}
              <div className="hidden sm:flex items-center gap-0.5 mr-1 font-mono text-[10px] text-zinc-500">
                <button
                  onClick={onPrevEntity}
                  disabled={!onPrevEntity}
                  className="p-1 hover:text-white disabled:opacity-20 transition-colors cursor-pointer"
                  title="前銘柄"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={onNextEntity}
                  disabled={!onNextEntity}
                  className="p-1 hover:text-white disabled:opacity-20 transition-colors cursor-pointer"
                  title="次銘柄"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* AI壁打ちクイック起動 */}
              {onOpenSynthesisWithEntity && (
                <button
                  onClick={() => onOpenSynthesisWithEntity(entity.id)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.12] text-[10px] font-mono text-zinc-300 hover:text-white transition-colors cursor-pointer mr-1"
                  title="この銘柄の裏帳簿データでAIと壁打ちする"
                >
                  <Bot className="w-3 h-3 text-zinc-300" />
                  <span className="hidden sm:inline">AI壁打ち</span>
                </button>
              )}

              {/* 外部リンク */}
              <a
                href={entity.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 text-zinc-500 hover:text-white transition-colors cursor-pointer"
                title="公式サイトを開く"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              {/* クローズボタン */}
              <button
                onClick={onClose}
                className="p-1 text-zinc-500 hover:text-white transition-colors cursor-pointer"
                title="閉じる (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 2. タグライン ＆ 4大意思決定ベクトル */}
          <div className="px-3 py-1.5 bg-[#05060A] border-b border-white/[0.04] flex items-center justify-between gap-2 text-[10px] font-mono">
            <div className="flex items-center gap-2 min-w-0 flex-1 truncate">
              {entity.opportunityJudgment && (
                <span className={`sm:hidden px-1.5 py-0.2 rounded font-bold tracking-wider border shrink-0 ${
                  entity.opportunityJudgment.verdict === 'HAZARD_REJECT'
                    ? 'bg-red-950/40 text-red-400 border-red-500/40'
                    : 'bg-white/[0.08] text-white border-white/[0.16]'
                }`}>
                  {entity.opportunityJudgment.verdictLabel}
                </span>
              )}
              <span className="text-zinc-300 font-sans truncate" title={cleanIntelligenceText(entity.tagline)}>
                {cleanIntelligenceText(entity.tagline)}
              </span>
            </div>

            {entity.opportunityJudgment && (
              <div className="hidden sm:flex items-center gap-2 shrink-0 text-zinc-400">
                <span>需要: <strong className="text-zinc-200">{entity.opportunityJudgment.demandDelta}</strong></span>
                <span className="text-zinc-700">|</span>
                <span>競争: <strong className="text-zinc-200">{entity.opportunityJudgment.competitionDelta}</strong></span>
                <span className="text-zinc-700">|</span>
                <span>資本: <strong className="text-zinc-200">{entity.opportunityJudgment.entryRequirements.capital}</strong></span>
                <span className="text-zinc-700">|</span>
                <span>難度: <strong className="text-zinc-200">{entity.opportunityJudgment.entryRequirements.technicalDifficulty}</strong></span>
              </div>
            )}
          </div>

          {/* 3. 探索タグ一覧（上部に常時配置） ＆ 時系列インテリジェンス */}
          <div className="px-3 py-1.5 flex items-center justify-between gap-2 bg-[#05070B] border-b border-white/[0.04]">
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-1">
              {entity.tags && entity.tags.length > 0 && entity.tags.map((tag) => {
                const isActive = activeTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (onToggleTag) onToggleTag(tag);
                    }}
                    title={`「#${tag}」で左一覧を絞り込み`}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono transition-all shrink-0 cursor-pointer border ${
                      isActive
                        ? 'bg-white text-black font-bold border-white shadow-xs'
                        : 'bg-zinc-900/90 text-zinc-300 hover:text-white hover:bg-zinc-800 border-zinc-700/60 shadow-xs'
                    }`}
                  >
                    <span className={isActive ? 'text-zinc-600' : 'text-zinc-500'}>#</span>
                    <span>{tag}</span>
                    {isActive ? (
                      <X className="w-2.5 h-2.5 text-black" />
                    ) : null}
                  </button>
                );
              })}
            </div>

            {entity.temporal && (
              <div className="flex items-center gap-1.5 font-mono text-[9px] text-zinc-500 shrink-0 pl-2">
                <Clock className="w-2.5 h-2.5 text-zinc-500" />
                <span>{entity.temporal.foundedYear}年</span>
                <span>・</span>
                <span className="text-zinc-300 font-semibold">{entity.temporal.viabilityLabel}</span>
              </div>
            )}
          </div>

          {/* 4. 金融端末仕様 目次ジャンプバー（ワンクリックで該当セクションへ直通スクロール） */}
          <div className="flex items-center bg-[#090C12] text-[11px] font-mono border-t border-white/[0.08] divide-x divide-white/[0.06] overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => scrollToSection('section-evidence')}
              className="flex-1 py-1.5 px-2 text-center transition-all cursor-pointer whitespace-nowrap text-zinc-400 hover:text-white hover:bg-white/[0.04] flex items-center justify-center gap-1"
            >
              <span>特異物証</span>
              {entity.evidenceCards && entity.evidenceCards.length > 0 && (
                <span className="text-[9px] px-1 py-0.2 rounded font-bold bg-white/[0.06] text-zinc-400">
                  {entity.evidenceCards.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => scrollToSection('section-financial')}
              className="flex-1 py-1.5 px-2 text-center transition-all cursor-pointer whitespace-nowrap text-zinc-400 hover:text-white hover:bg-white/[0.04] flex items-center justify-center gap-1"
            >
              <span>財務P&L</span>
              <span className="text-[9px] text-zinc-500 font-normal">
                {isFinancialUnavailable ? '未確認' : formatMoney(entity.pnl.monthlyRevenue)}
              </span>
            </button>

            {!isHazardMode && (
              <button
                type="button"
                onClick={() => scrollToSection('section-tools')}
                className="flex-1 py-1.5 px-2 text-center transition-all cursor-pointer whitespace-nowrap text-zinc-400 hover:text-white hover:bg-white/[0.04]"
              >
                <span>配管ツール</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => scrollToSection('section-playbook')}
              className="flex-1 py-1.5 px-2 text-center transition-all cursor-pointer whitespace-nowrap text-zinc-400 hover:text-white hover:bg-white/[0.04]"
            >
              <span>{isHazardMode ? '死因検死' : '略奪手順'}</span>
            </button>

            <button
              type="button"
              onClick={() => scrollToSection('section-stream')}
              className="flex-1 py-1.5 px-2 text-center transition-all cursor-pointer whitespace-nowrap text-zinc-400 hover:text-white hover:bg-white/[0.04] flex items-center justify-center gap-1"
            >
              <span>全量ログ</span>
              {entity.observationsStream && entity.observationsStream.length > 0 && (
                <span className="text-[9px] px-1 py-0.2 rounded font-bold bg-white/[0.06] text-zinc-400">
                  {entity.observationsStream.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => scrollToSection('section-notes')}
              className="py-1.5 px-2.5 text-center transition-all cursor-pointer whitespace-nowrap text-zinc-400 hover:text-white hover:bg-white/[0.04] flex items-center justify-center gap-1"
              title="極秘考察メモ"
            >
              <span>メモ</span>
              {analystNote && <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />}
            </button>
          </div>
        </div>

  </>;
}
