'use client';

import React from 'react';
import { X, SlidersHorizontal, RotateCcw } from 'lucide-react';
import {
  TerminalFilterState,
  WorkStyleFilter,
  AmbitionScaleFilter,
  MarginFilter,
  CapitalFilter,
  BusinessModelFilter,
  MoatFilter,
  AcquisitionFilter
} from '../../types/terminal';

interface ScreenerModalProps {
  isOpen: boolean;
  onClose: () => void;
  filter: TerminalFilterState;
  onChangeFilter: (newFilter: TerminalFilterState) => void;
  totalCount: number;
  filteredCount: number;
  matchingCompanies: { id: string; japaneseName: string }[];
}

export const ScreenerModal: React.FC<ScreenerModalProps> = ({
  isOpen,
  onClose,
  filter,
  onChangeFilter,
  totalCount,
  filteredCount,
  matchingCompanies
}) => {
  if (!isOpen) return null;

  // 戦略プリセット定義（事業形態・投資動機別の主要シナリオ）
  const presets = [
    {
      id: 'ALL',
      label: '全件表示',
      apply: () =>
        onChangeFilter({
          ...filter,
          desireCategory: 'ALL',
          workStyle: 'ALL',
          ambitionScale: 'ALL',
          margin: 'ALL',
          capital: 'ALL',
          businessModelCategory: 'ALL',
          moat: 'ALL',
          acquisitionChannel: 'ALL'
        })
    },
    {
      id: 'REMOTE_SOLO_RICH',
      label: '完全在宅・高収益個人事業',
      apply: () =>
        onChangeFilter({
          ...filter,
          desireCategory: 'ALL',
          workStyle: 'REMOTE_SOLO',
          ambitionScale: 'SOLO_RICH_10M',
          margin: 'ALL',
          capital: 'ZERO',
          businessModelCategory: 'ALL',
          moat: 'ALL',
          acquisitionChannel: 'ALL'
        })
    },
    {
      id: 'LOCAL_REAL',
      label: '地方実業・現場直販DX',
      apply: () =>
        onChangeFilter({
          ...filter,
          desireCategory: 'ALL',
          workStyle: 'LOCAL_REAL',
          ambitionScale: 'ALL',
          margin: 'ALL',
          capital: 'ALL',
          businessModelCategory: 'LOCAL_DX',
          moat: 'ALL',
          acquisitionChannel: 'ALL'
        })
    },
    {
      id: 'BEGINNER_ZERO',
      label: '初期資本ゼロ・低リスク参入',
      apply: () =>
        onChangeFilter({
          ...filter,
          desireCategory: 'ALL',
          workStyle: 'ALL',
          ambitionScale: 'POCKET_10K',
          margin: 'ALL',
          capital: 'ZERO',
          businessModelCategory: 'ALL',
          moat: 'ALL',
          acquisitionChannel: 'ALL'
        })
    },
    {
      id: 'INSANE_MARGIN',
      label: '高営業利益率（80%以上）',
      apply: () =>
        onChangeFilter({
          ...filter,
          desireCategory: 'ALL',
          workStyle: 'ALL',
          ambitionScale: 'ALL',
          margin: 'MARGIN_80',
          capital: 'ALL',
          businessModelCategory: 'ALL',
          moat: 'ALL',
          acquisitionChannel: 'ALL'
        })
    },
    {
      id: 'ZERO_AD_GROWTH',
      label: '広告費ゼロ・SNS/紹介直結',
      apply: () =>
        onChangeFilter({
          ...filter,
          desireCategory: 'ALL',
          workStyle: 'ALL',
          ambitionScale: 'ALL',
          margin: 'ALL',
          capital: 'ALL',
          businessModelCategory: 'ALL',
          moat: 'ALL',
          acquisitionChannel: 'ZERO_AD_SPEND'
        })
    },
    {
      id: 'BUY_RUN',
      label: '事業買収・承継ターゲット',
      apply: () =>
        onChangeFilter({
          ...filter,
          desireCategory: 'ALL',
          workStyle: 'ALL',
          ambitionScale: 'ALL',
          margin: 'ALL',
          capital: 'FOR_SALE',
          businessModelCategory: 'ALL',
          moat: 'ALL',
          acquisitionChannel: 'ALL'
        })
    },
    {
      id: 'WORLD_MEGA',
      label: '大規模・高収益独占モデル',
      apply: () =>
        onChangeFilter({
          ...filter,
          desireCategory: 'ALL',
          workStyle: 'ALL',
          ambitionScale: 'WORLD_MEGA',
          margin: 'MARGIN_50',
          capital: 'ALL',
          businessModelCategory: 'ALL',
          moat: 'ALL',
          acquisitionChannel: 'ALL'
        })
    }
  ];

  const hasActiveFilters =
    filter.workStyle !== 'ALL' ||
    filter.ambitionScale !== 'ALL' ||
    filter.margin !== 'ALL' ||
    filter.capital !== 'ALL' ||
    filter.businessModelCategory !== 'ALL' ||
    filter.moat !== 'ALL' ||
    filter.acquisitionChannel !== 'ALL';

  const resetAll = () => {
    onChangeFilter({
      ...filter,
      workStyle: 'ALL',
      ambitionScale: 'ALL',
      margin: 'ALL',
      capital: 'ALL',
      businessModelCategory: 'ALL',
      moat: 'ALL',
      acquisitionChannel: 'ALL'
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-xs select-none font-sans animate-in fade-in duration-150">
      <div className="bg-[#0D1117] border border-white/[0.12] rounded-lg shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* モーダル上部ヘッダー */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-[#12161F]">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-white/[0.04] border border-white/[0.08] rounded flex items-center justify-center text-emerald-400">
              <SlidersHorizontal size={14} />
            </div>
            <div>
              <div className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider">
                SCREENING COCKPIT (50 AXES)
              </div>
              <h2 className="text-sm sm:text-base font-black text-zinc-100 mt-0.5">
                多次元ビジネス検索・計器盤
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 p-1.5 rounded hover:bg-white/[0.06] transition-colors cursor-pointer"
            aria-label="閉じる"
          >
            <X size={16} />
          </button>
        </div>

        {/* モーダル本文（スクロール可能） */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs font-sans">
          {/* プリセット選択 */}
          <div className="space-y-2">
            <span className="text-[10px] font-mono text-zinc-500 block font-bold uppercase tracking-wider">
              STRATEGIC PRESETS / 主要シナリオ
            </span>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((p) => (
                <button
                  key={p.id}
                  onClick={p.apply}
                  className="px-2.5 py-1.5 rounded text-[11px] font-bold bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 border border-white/[0.08] transition-colors cursor-pointer font-sans"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-white/[0.08] pt-5 space-y-5">
            {/* 軸1: 組織規模・勤務形態 */}
            <div className="space-y-2">
              <label className="text-[11px] font-mono text-zinc-400 block font-bold">
                01. 組織規模・勤務形態
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-1.5">
                {[
                  { val: 'ALL', label: 'すべて' },
                  { val: 'REMOTE_SOLO', label: '完全単独（在宅）' },
                  { val: 'SMALL_TEAM', label: '少数精鋭（2〜5名）' },
                  { val: 'LOCAL_REAL', label: '地域実業・現場' },
                  { val: 'SALES_HIGH', label: '直販・営業主導' },
                  { val: 'AUTOMATED_PASSIVE', label: '自動化・自走' },
                  { val: 'ENTERPRISE', label: '大規模組織' }
                ].map((item) => (
                  <button
                    key={item.val}
                    onClick={() => onChangeFilter({ ...filter, workStyle: item.val as WorkStyleFilter })}
                    className={`py-2 px-1.5 rounded text-[11px] text-center transition-colors truncate cursor-pointer font-medium ${
                      filter.workStyle === item.val
                        ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 font-bold'
                        : 'bg-white/[0.04] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.08] border border-white/[0.06]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 軸2: 収益規模・目標年商 */}
            <div className="space-y-2">
              <label className="text-[11px] font-mono text-zinc-400 block font-bold">
                02. 収益規模・目標年商
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1.5">
                {[
                  { val: 'ALL', label: 'すべて' },
                  { val: 'POCKET_10K', label: '月商 〜10万円' },
                  { val: 'INDEPENDENT_1M', label: '月商 50万〜100万円' },
                  { val: 'SOLO_RICH_10M', label: '月商 300万〜1,000万円' },
                  { val: 'MID_CORP_100M', label: '年商 数十億円規模' },
                  { val: 'WORLD_MEGA', label: '年商 兆円規模' }
                ].map((item) => (
                  <button
                    key={item.val}
                    onClick={() => onChangeFilter({ ...filter, ambitionScale: item.val as AmbitionScaleFilter })}
                    className={`py-2 px-1.5 rounded text-[11px] text-center transition-colors truncate cursor-pointer font-medium ${
                      filter.ambitionScale === item.val
                        ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 font-bold'
                        : 'bg-white/[0.04] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.08] border border-white/[0.06]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 軸3: 営業利益率 */}
            <div className="space-y-2">
              <label className="text-[11px] font-mono text-zinc-400 block font-bold">
                03. 営業利益率水準
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {[
                  { val: 'ALL', label: 'すべて' },
                  { val: 'MARGIN_30', label: '営業利益率 30%以上' },
                  { val: 'MARGIN_50', label: '営業利益率 50%以上' },
                  { val: 'MARGIN_80', label: '営業利益率 80%以上' }
                ].map((item) => (
                  <button
                    key={item.val}
                    onClick={() => onChangeFilter({ ...filter, margin: item.val as MarginFilter })}
                    className={`py-2 px-1.5 rounded text-[11px] text-center transition-colors truncate cursor-pointer font-medium ${
                      filter.margin === item.val
                        ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 font-bold'
                        : 'bg-white/[0.04] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.08] border border-white/[0.06]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 軸4: 初期投資資本 */}
            <div className="space-y-2">
              <label className="text-[11px] font-mono text-zinc-400 block font-bold">
                04. 初期必要資本
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1.5">
                {[
                  { val: 'ALL', label: 'すべて' },
                  { val: 'ZERO', label: '0円（資本不要）' },
                  { val: 'UNDER_50K', label: '5万円以下' },
                  { val: 'UNDER_500K', label: '50万円以下' },
                  { val: 'OVER_1M', label: '100万円以上' },
                  { val: 'FOR_SALE', label: '事業買収・承継' }
                ].map((item) => (
                  <button
                    key={item.val}
                    onClick={() => onChangeFilter({ ...filter, capital: item.val as CapitalFilter })}
                    className={`py-2 px-1.5 rounded text-[11px] text-center transition-colors truncate cursor-pointer font-medium ${
                      filter.capital === item.val
                        ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 font-bold'
                        : 'bg-white/[0.04] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.08] border border-white/[0.06]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 軸5: ビジネスモデル・収益構造 */}
            <div className="space-y-2">
              <label className="text-[11px] font-mono text-zinc-400 block font-bold">
                05. ビジネスモデル・収益構造
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-1.5">
                {[
                  { val: 'ALL', label: 'すべて' },
                  { val: 'SAAS', label: 'SaaS・ソフト' },
                  { val: 'MEDIA_NEWS', label: '刊行・メディア' },
                  { val: 'DIGITAL_ASSET', label: 'ナレッジ商材' },
                  { val: 'AGENCY_B2B', label: 'B2B受託・支援' },
                  { val: 'LOCAL_DX', label: '実業・現場DX' },
                  { val: 'COMMERCE', label: '物販・自動EC' },
                  { val: 'DEEPTECH_MFG', label: '精密機器・製造' }
                ].map((item) => (
                  <button
                    key={item.val}
                    onClick={() => onChangeFilter({ ...filter, businessModelCategory: item.val as BusinessModelFilter })}
                    className={`py-2 px-1.5 rounded text-[11px] text-center transition-colors truncate cursor-pointer font-medium ${
                      filter.businessModelCategory === item.val
                        ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 font-bold'
                        : 'bg-white/[0.04] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.08] border border-white/[0.06]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 軸6: 構造的参入障壁 */}
            <div className="space-y-2">
              <label className="text-[11px] font-mono text-zinc-400 block font-bold">
                06. 構造的参入障壁（7 POWERS）
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-1.5">
                {[
                  { val: 'ALL', label: 'すべて' },
                  { val: 'PROCESS_POWER', label: '独自プロセス' },
                  { val: 'NETWORK_EFFECTS', label: 'ネットワーク' },
                  { val: 'COUNTER_POSITIONING', label: '対抗不能' },
                  { val: 'SWITCHING_COSTS', label: '乗換コスト' },
                  { val: 'BRANDING', label: 'ブランド信頼' },
                  { val: 'CORNERED_RESOURCE', label: '希少資源独占' },
                  { val: 'SCALE_ECONOMIES', label: '規模の経済' }
                ].map((item) => (
                  <button
                    key={item.val}
                    onClick={() => onChangeFilter({ ...filter, moat: item.val as MoatFilter })}
                    className={`py-2 px-1.5 rounded text-[11px] text-center transition-colors truncate cursor-pointer font-medium ${
                      filter.moat === item.val
                        ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 font-bold'
                        : 'bg-white/[0.04] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.08] border border-white/[0.06]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 軸7: 顧客獲得導線 */}
            <div className="space-y-2">
              <label className="text-[11px] font-mono text-zinc-400 block font-bold">
                07. 主要顧客獲得導線
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1.5">
                {[
                  { val: 'ALL', label: 'すべて' },
                  { val: 'X_TWITTER', label: '公開開発・SNS' },
                  { val: 'DIRECT_OUTREACH', label: '直販・アウトバウンド' },
                  { val: 'SEO_ORGANIC', label: '自然検索・SEO' },
                  { val: 'AFFILIATE_LOOP', label: '紹介・提携網' },
                  { val: 'ZERO_AD_SPEND', label: '広告宣伝費ゼロ' }
                ].map((item) => (
                  <button
                    key={item.val}
                    onClick={() => onChangeFilter({ ...filter, acquisitionChannel: item.val as AcquisitionFilter })}
                    className={`py-2 px-1.5 rounded text-[11px] text-center transition-colors truncate cursor-pointer font-medium ${
                      filter.acquisitionChannel === item.val
                        ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 font-bold'
                        : 'bg-white/[0.04] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.08] border border-white/[0.06]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* リアルタイム該当企業プレビュー */}
        <div className="px-6 py-3 bg-[#090C10] border-t border-white/[0.08] flex items-center justify-between gap-3 overflow-x-auto text-xs">
          <span className="text-[10px] font-mono text-zinc-500 uppercase shrink-0 font-bold">
            MATCHING PREVIEW ({matchingCompanies.length}):
          </span>
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {matchingCompanies.length > 0 ? (
              matchingCompanies.slice(0, 5).map((c) => (
                <span
                  key={c.id}
                  className="px-2 py-0.5 rounded bg-white/[0.05] border border-white/[0.08] text-zinc-300 text-[11px] whitespace-nowrap font-medium font-sans"
                >
                  {c.japaneseName}
                </span>
              ))
            ) : (
              <span className="text-amber-400 text-[11px] font-medium font-mono">該当なし（条件を緩和してください）</span>
            )}
            {matchingCompanies.length > 5 && (
              <span className="text-zinc-500 font-mono text-[10px] shrink-0">
                他 {matchingCompanies.length - 5} 件...
              </span>
            )}
          </div>
        </div>

        {/* モーダルフッター */}
        <div className="px-6 py-4 border-t border-white/[0.08] flex items-center justify-between bg-[#12161F] font-mono text-xs">
          <div className="flex items-center gap-3">
            <span className="text-zinc-400 font-sans">
              該当 <strong className="text-emerald-400 text-sm sm:text-base font-black font-mono tabular-nums">{filteredCount}</strong> / {totalCount} 件
            </span>
            {hasActiveFilters && (
              <button
                onClick={resetAll}
                className="text-zinc-400 hover:text-white underline font-sans text-xs cursor-pointer flex items-center gap-1"
              >
                <RotateCcw size={11} />
                <span>全リセット</span>
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="h-8 px-5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded text-xs transition-colors cursor-pointer font-mono"
          >
            APPLY FILTER ({filteredCount})
          </button>
        </div>
      </div>
    </div>
  );
};
