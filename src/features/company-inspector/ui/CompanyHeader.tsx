import {
  FileText,
  Pin,
  X
} from 'lucide-react';

import type { InspectorSectionProps } from '../model/section-props';

export function CompanyHeader({
  entity,
  onClose,
  activeTags = [],
  onToggleTag,
  isScrolled,
  scrollToSection,
  formatMoney,
  isHazardMode,
  isFinancialUnavailable,
  mainTab = 'LEDGER',
  setMainTab
}: Pick<InspectorSectionProps, 'entity' | 'onClose' | 'activeTags' | 'onToggleTag' | 'isScrolled' | 'scrollToSection' | 'formatMoney' | 'isHazardMode' | 'isFinancialUnavailable' | 'mainTab' | 'setMainTab'>) {
  const rev = entity.pnl?.monthlyRevenue || 0;
  const profit = entity.pnl?.operatingProfit ?? 0;
  const margin = entity.pnl?.operatingMargin ?? (rev > 0 ? Math.round((profit / rev) * 100) : 0);
  const isLoss = profit < 0 || isHazardMode;
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
            </div>

            {/* 右側アクション（クローズのみの超ソリッド構成） */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={onClose}
                className="p-1 text-zinc-500 hover:text-white transition-colors cursor-pointer"
                title="閉じる (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 2. 4大意思決定ベクトル */}
          {entity.opportunityJudgment && (
            <div className="px-3 py-1.5 bg-[#05060A] border-b border-white/[0.04] flex items-center justify-between gap-2 text-[10px] font-mono">
              <div className="flex items-center gap-2 text-zinc-400">
                <span>需要: <strong className="text-zinc-200">{entity.opportunityJudgment.demandDelta}</strong></span>
                <span className="text-zinc-700">|</span>
                <span>競争: <strong className="text-zinc-200">{entity.opportunityJudgment.competitionDelta}</strong></span>
                <span className="text-zinc-700">|</span>
                <span>資本: <strong className="text-zinc-200">{entity.opportunityJudgment.entryRequirements.capital}</strong></span>
                <span className="text-zinc-700">|</span>
                <span>難度: <strong className="text-zinc-200">{entity.opportunityJudgment.entryRequirements.technicalDifficulty}</strong></span>
              </div>
            </div>
          )}

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
          </div>

          {/* 4. 表示モードセレクター（柔軟な表示カスタマイズ） */}
          {/* 4. メインタブ切替（【本丸】資本主義の裏帳簿 ⇄ 【証拠】検証エビデンス） */}
          <div className="flex items-center justify-between bg-[#06080E] px-3 py-1.5 border-t border-white/[0.08] text-[11px] font-mono gap-2 flex-wrap">
            <div className="inline-flex rounded-lg p-0.5 bg-black/60 border border-white/[0.12] shrink-0">
              <button
                type="button"
                onClick={() => setMainTab && setMainTab('LEDGER')}
                className={`px-3 py-1 rounded text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  mainTab === 'LEDGER'
                    ? 'bg-white text-black shadow-md font-black'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                <span>【本丸】資本主義の裏帳簿</span>
              </button>
              <button
                type="button"
                onClick={() => setMainTab && setMainTab('AUDIT')}
                className={`px-3 py-1 rounded text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  mainTab === 'AUDIT'
                    ? 'bg-white text-black shadow-md font-black'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <FileText className="w-3 h-3 text-zinc-400" />
                <span>【証拠】検証エビデンス</span>
              </button>
            </div>

            {/* HUD通帳実額サマリー */}
            <div className="flex items-center gap-2 font-mono text-[10px] ml-auto shrink-0">
              <span className="text-zinc-400">月商: <strong className="text-white">{isFinancialUnavailable ? '未確認' : formatMoney(rev)}</strong></span>
              <span className="text-zinc-700">|</span>
              <span className="text-zinc-400">純手残り: <strong className={isLoss ? 'text-red-400' : 'text-emerald-300'}>{isFinancialUnavailable ? '未確認' : formatMoney(profit)}</strong></span>
              <span className={`px-1.5 py-0.2 rounded font-black border ${
                isLoss
                  ? 'bg-red-950/40 text-red-300 border-red-500/40'
                  : 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40'
              }`}>
                {isLoss ? '赤字出血' : `利益率 ${margin}%`}
              </span>
            </div>
          </div>

          {/* 5. 目次ジャンプバー（選択中タブに応じた直通ナビゲーション） */}
          <div className="flex items-center bg-[#090C12] text-[11px] font-mono border-t border-white/[0.08] divide-x divide-white/[0.06] overflow-x-auto scrollbar-none">
            {mainTab === 'LEDGER' ? (
              <>
                <button
                  type="button"
                  onClick={() => scrollToSection('section-summary')}
                  className="flex-1 py-1.5 px-2 text-center transition-all cursor-pointer whitespace-nowrap text-zinc-400 hover:text-white hover:bg-white/[0.04] flex items-center justify-center gap-1"
                >
                  <span className="text-[9px] text-zinc-500 font-bold">#01</span>
                  <span>断罪HUD</span>
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('section-evidence')}
                  className="flex-1 py-1.5 px-2 text-center transition-all cursor-pointer whitespace-nowrap text-zinc-400 hover:text-white hover:bg-white/[0.04] flex items-center justify-center gap-1"
                >
                  <span className="text-[9px] text-zinc-500 font-bold">#02</span>
                  <span>動かぬ証拠 4大急所</span>
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('section-cash-anatomy')}
                  className="flex-1 py-1.5 px-2 text-center transition-all cursor-pointer whitespace-nowrap text-zinc-400 hover:text-white hover:bg-white/[0.04] flex items-center justify-center gap-1"
                >
                  <span className="text-[9px] text-zinc-500 font-bold">#03</span>
                  <span>現金の解剖室</span>
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('section-loot-blueprint')}
                  className="flex-1 py-1.5 px-2 text-center transition-all cursor-pointer whitespace-nowrap text-zinc-400 hover:text-white hover:bg-white/[0.04] flex items-center justify-center gap-1"
                >
                  <span className="text-[9px] text-zinc-500 font-bold">#04</span>
                  <span>略奪武器庫</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => scrollToSection('section-sources')}
                  className="flex-1 py-1.5 px-2 text-center transition-all cursor-pointer whitespace-nowrap text-zinc-400 hover:text-white hover:bg-white/[0.04] flex items-center justify-center gap-1"
                >
                  <span>情報源原本 (#14)</span>
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('section-stream')}
                  className="flex-1 py-1.5 px-2 text-center transition-all cursor-pointer whitespace-nowrap text-zinc-400 hover:text-white hover:bg-white/[0.04] flex items-center justify-center gap-1"
                >
                  <span>全量調査ログ</span>
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('section-notes')}
                  className="flex-1 py-1.5 px-2 text-center transition-all cursor-pointer whitespace-nowrap text-zinc-400 hover:text-white hover:bg-white/[0.04] flex items-center justify-center gap-1"
                >
                  <span>考察メモ</span>
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('section-related')}
                  className="flex-1 py-1.5 px-2 text-center transition-all cursor-pointer whitespace-nowrap text-zinc-400 hover:text-white hover:bg-white/[0.04] flex items-center justify-center gap-1"
                >
                  <span>関連リサーチ</span>
                </button>
              </>
            )}
          </div>
        </div>

  </>;
}
