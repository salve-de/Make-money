'use client';

import React from 'react';
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
      label: '広告費ゼロ（自然集客型）',
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
      id: 'FOR_SALE',
      label: '事業買収・承継M&A案件',
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
      <div className="bg-[#101217] border border-white/[0.12] rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* モーダル上部ヘッダー */}
        <div className="px-6 py-3.5 border-b border-white/[0.08] flex items-center justify-between bg-[#13151D]">
          <div>
            <div className="text-[11px] text-emerald-400 font-semibold tracking-wider">
              事業スクリーニング・コックピット
            </div>
            <h2 className="text-sm font-bold text-zinc-100 mt-0.5">
              多次元ビジネス検索・計器盤
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 text-lg p-1 leading-none transition-colors"
          >
            ✕
          </button>
        </div>

        {/* モーダル本文（スクロール可能） */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs font-sans">
          {/* プリセット選択 */}
          <div className="space-y-1.5">
            <span className="text-[11px] text-zinc-400 block font-semibold">
              主要シナリオ・プリセット
            </span>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((p) => (
                <button
                  key={p.id}
                  onClick={p.apply}
                  className="px-2.5 py-1.5 rounded text-xs font-medium bg-[#171A22] hover:bg-zinc-800 text-zinc-300 border border-white/5 transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-white/[0.06] pt-4 space-y-5">
            {/* 軸1: 組織規模・勤務形態 */}
            <div className="space-y-1.5">
              <label className="text-[11px] text-zinc-400 block font-semibold">
                1. 組織規模・勤務形態
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-1.5">
                {[
                  { val: 'ALL', label: 'すべて' },
                  { val: 'REMOTE_SOLO', label: '完全単独（在宅）' },
                  { val: 'SMALL_TEAM', label: '少数精鋭（2〜5名）' },
                  { val: 'LOCAL_REAL', label: '地域実業・現場' },
                  { val: 'SALES_HIGH', label: '直販・営業主導' },
                  { val: 'AUTOMATED_PASSIVE', label: '自動化・システム運営' },
                  { val: 'ENTERPRISE', label: '大規模組織' }
                ].map((item) => (
                  <button
                    key={item.val}
                    onClick={() => onChangeFilter({ ...filter, workStyle: item.val as WorkStyleFilter })}
                    className={`py-2 px-2 rounded text-xs text-center transition-colors truncate ${
                      filter.workStyle === item.val
                        ? 'bg-zinc-200 text-zinc-900 font-bold shadow-xs'
                        : 'bg-[#151820] text-zinc-400 hover:text-zinc-200 border border-white/5'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 軸2: 収益規模・目標年商 */}
            <div className="space-y-1.5">
              <label className="text-[11px] text-zinc-400 block font-semibold">
                2. 収益規模・目標年商
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
                    className={`py-2 px-2 rounded text-xs text-center transition-colors truncate ${
                      filter.ambitionScale === item.val
                        ? 'bg-zinc-200 text-zinc-900 font-bold shadow-xs'
                        : 'bg-[#151820] text-zinc-400 hover:text-zinc-200 border border-white/5'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 軸3: 営業利益率 */}
            <div className="space-y-1.5">
              <label className="text-[11px] text-zinc-400 block font-semibold">
                3. 営業利益率水準
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
                    className={`py-2 px-2 rounded text-xs text-center transition-colors truncate ${
                      filter.margin === item.val
                        ? 'bg-zinc-200 text-zinc-900 font-bold shadow-xs'
                        : 'bg-[#151820] text-zinc-400 hover:text-zinc-200 border border-white/5'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 軸4: 初期投資資本 */}
            <div className="space-y-1.5">
              <label className="text-[11px] text-zinc-400 block font-semibold">
                4. 初期必要資本
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
                    className={`py-2 px-2 rounded text-xs text-center transition-colors truncate ${
                      filter.capital === item.val
                        ? 'bg-zinc-200 text-zinc-900 font-bold shadow-xs'
                        : 'bg-[#151820] text-zinc-400 hover:text-zinc-200 border border-white/5'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 軸5: ビジネスモデル・収益構造 */}
            <div className="space-y-1.5">
              <label className="text-[11px] text-zinc-400 block font-semibold">
                5. ビジネスモデル・収益構造
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-1.5">
                {[
                  { val: 'ALL', label: 'すべて' },
                  { val: 'SAAS', label: 'SaaS・ソフトウェア' },
                  { val: 'MEDIA_NEWS', label: '定期刊行・メディア' },
                  { val: 'DIGITAL_ASSET', label: 'デジタル商材・ナレッジ' },
                  { val: 'AGENCY_B2B', label: 'B2B受託・営業支援' },
                  { val: 'LOCAL_DX', label: '地域実業・インフラDX' },
                  { val: 'COMMERCE', label: '物販・自動化EC' },
                  { val: 'DEEPTECH_MFG', label: '精密機器・独自製造' }
                ].map((item) => (
                  <button
                    key={item.val}
                    onClick={() => onChangeFilter({ ...filter, businessModelCategory: item.val as BusinessModelFilter })}
                    className={`py-2 px-2 rounded text-xs text-center transition-colors truncate ${
                      filter.businessModelCategory === item.val
                        ? 'bg-zinc-200 text-zinc-900 font-bold shadow-xs'
                        : 'bg-[#151820] text-zinc-400 hover:text-zinc-200 border border-white/5'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 軸6: 構造的参入障壁 */}
            <div className="space-y-1.5">
              <label className="text-[11px] text-zinc-400 block font-semibold">
                6. 構造的参入障壁（7つの競争優位性）
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-1.5">
                {[
                  { val: 'ALL', label: 'すべて' },
                  { val: 'PROCESS_POWER', label: '独自プロセス' },
                  { val: 'NETWORK_EFFECTS', label: 'ネットワーク外部性' },
                  { val: 'COUNTER_POSITIONING', label: '対抗不能戦略' },
                  { val: 'SWITCHING_COSTS', label: '乗換コスト' },
                  { val: 'BRANDING', label: 'ブランド信頼' },
                  { val: 'CORNERED_RESOURCE', label: '希少資源独占' },
                  { val: 'SCALE_ECONOMIES', label: '規模の経済' }
                ].map((item) => (
                  <button
                    key={item.val}
                    onClick={() => onChangeFilter({ ...filter, moat: item.val as MoatFilter })}
                    className={`py-2 px-2 rounded text-xs text-center transition-colors truncate ${
                      filter.moat === item.val
                        ? 'bg-zinc-200 text-zinc-900 font-bold shadow-xs'
                        : 'bg-[#151820] text-zinc-400 hover:text-zinc-200 border border-white/5'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 軸7: 顧客獲得導線 */}
            <div className="space-y-1.5">
              <label className="text-[11px] text-zinc-400 block font-semibold">
                7. 主要顧客獲得導線
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1.5">
                {[
                  { val: 'ALL', label: 'すべて' },
                  { val: 'X_TWITTER', label: '公開開発・SNS' },
                  { val: 'DIRECT_OUTREACH', label: '直販・アウトバウンド' },
                  { val: 'SEO_ORGANIC', label: '自然検索・コンテンツ' },
                  { val: 'AFFILIATE_LOOP', label: '紹介・提携網' },
                  { val: 'ZERO_AD_SPEND', label: '広告宣伝費ゼロ' }
                ].map((item) => (
                  <button
                    key={item.val}
                    onClick={() => onChangeFilter({ ...filter, acquisitionChannel: item.val as AcquisitionFilter })}
                    className={`py-2 px-2 rounded text-xs text-center transition-colors truncate ${
                      filter.acquisitionChannel === item.val
                        ? 'bg-zinc-200 text-zinc-900 font-bold shadow-xs'
                        : 'bg-[#151820] text-zinc-400 hover:text-zinc-200 border border-white/5'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* リアルタイム該当企業プレビュー（モーダル内で何が出るか即座にわかる） */}
        <div className="px-6 py-2.5 bg-[#0C0E12] border-t border-white/[0.06] flex items-center justify-between gap-3 overflow-x-auto text-xs">
          <span className="text-[10px] font-mono text-zinc-400 uppercase shrink-0 font-semibold">
            リアルタイム該当銘柄 ({matchingCompanies.length}件):
          </span>
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {matchingCompanies.length > 0 ? (
              matchingCompanies.slice(0, 5).map((c) => (
                <span
                  key={c.id}
                  className="px-2 py-0.5 rounded bg-zinc-800 border border-white/10 text-zinc-200 text-[11px] whitespace-nowrap font-medium"
                >
                  {c.japaneseName}
                </span>
              ))
            ) : (
              <span className="text-amber-400/90 text-[11px]">該当するビジネスがありません（条件を緩和してください）</span>
            )}
            {matchingCompanies.length > 5 && (
              <span className="text-zinc-500 font-mono text-[10px] shrink-0">
                他 {matchingCompanies.length - 5} 件...
              </span>
            )}
          </div>
        </div>

        {/* モーダルフッター */}
        <div className="px-6 py-4 border-t border-white/[0.08] flex items-center justify-between bg-[#141720] font-mono text-xs">
          <div className="flex items-center gap-3">
            <span className="text-zinc-400">
              該当 <strong className="text-emerald-400 text-base">{filteredCount}</strong> / {totalCount} 件
            </span>
            {hasActiveFilters && (
              <button
                onClick={resetAll}
                className="text-zinc-400 hover:text-zinc-200 underline font-sans text-xs"
              >
                すべての条件をリセット
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="h-8 px-6 bg-zinc-200 hover:bg-white text-zinc-900 font-bold rounded text-xs transition-colors shadow-sm"
          >
            この条件で絞り込む ({filteredCount}件)
          </button>
        </div>
      </div>
    </div>
  );
};
