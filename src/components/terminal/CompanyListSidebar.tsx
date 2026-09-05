'use client';

import React, { useState } from 'react';
import { CompanyRecord, ScaleTier, TerminalFilterState } from '../../types/terminal';
import { DesirePreset, SortOrder } from './DesireFilterBar';
import { CompanyLogo } from './CompanyLogo';
import { SparklineChart } from './SparklineChart';

interface CompanyListSidebarProps {
  companies: CompanyRecord[];
  totalCount: number;
  selectedCompanyId: string;
  onSelectCompany: (id: string) => void;
  // スクリーニング統合用プロパティ
  activePreset: DesirePreset;
  onSelectPreset: (preset: DesirePreset) => void;
  activeSort: SortOrder;
  onSelectSort: (sort: SortOrder) => void;
  onOpenScreener: () => void;
  hasActiveFilters: boolean;
  filter: TerminalFilterState;
  onRemoveFilter: (key: keyof TerminalFilterState) => void;
  onResetAll: () => void;
}

export const CompanyListSidebar: React.FC<CompanyListSidebarProps> = ({
  companies,
  totalCount,
  selectedCompanyId,
  onSelectCompany,
  activePreset,
  onSelectPreset,
  activeSort,
  onSelectSort,
  onOpenScreener,
  hasActiveFilters,
  filter,
  onRemoveFilter,
  onResetAll
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [scaleTab, setScaleTab] = useState<'ALL' | 'SOLO_SMALL' | 'MEGA_CORP'>('ALL');

  // 規模別の件数計算
  const soloSmallCompanies = companies.filter(
    (c) => c.teamSize <= 5 || c.scaleTier === 'SOLO_MICRO' || c.scaleTier === 'NICHE_LEADER'
  );
  const megaCorpCompanies = companies.filter(
    (c) => c.scaleTier === 'MEGA_CORP' || c.tags.includes('巨大独占')
  );

  // 規模タブ適用後の表示リスト
  const displayedCompanies = companies.filter((c) => {
    if (scaleTab === 'SOLO_SMALL') {
      return c.teamSize <= 5 || c.scaleTier === 'SOLO_MICRO' || c.scaleTier === 'NICHE_LEADER';
    }
    if (scaleTab === 'MEGA_CORP') {
      return c.scaleTier === 'MEGA_CORP' || c.tags.includes('巨大独占');
    }
    return true;
  });

  // タブ切り替えハンドラー（タブ内最初の企業を自動選択）
  const handleScaleTabChange = (newTab: 'ALL' | 'SOLO_SMALL' | 'MEGA_CORP') => {
    setScaleTab(newTab);
    if (newTab === 'MEGA_CORP' && megaCorpCompanies.length > 0) {
      const alreadyMega = megaCorpCompanies.some((c) => c.id === selectedCompanyId);
      if (!alreadyMega) onSelectCompany(megaCorpCompanies[0].id);
    } else if (newTab === 'SOLO_SMALL' && soloSmallCompanies.length > 0) {
      const alreadySolo = soloSmallCompanies.some((c) => c.id === selectedCompanyId);
      if (!alreadySolo) onSelectCompany(soloSmallCompanies[0].id);
    }
  };

  // 適用中の詳細フィルターバッジ
  const activeChips: { label: string; onRemove: () => void }[] = [];
  if (filter.workStyle !== 'ALL') {
    activeChips.push({ label: '体質限定', onRemove: () => onRemoveFilter('workStyle') });
  }
  if (filter.ambitionScale !== 'ALL') {
    activeChips.push({ label: '金額限定', onRemove: () => onRemoveFilter('ambitionScale') });
  }
  if (filter.margin !== 'ALL') {
    activeChips.push({ label: '高利益率', onRemove: () => onRemoveFilter('margin') });
  }
  if (filter.capital !== 'ALL') {
    activeChips.push({ label: '元手限定', onRemove: () => onRemoveFilter('capital') });
  }
  if (filter.businessModelCategory !== 'ALL') {
    activeChips.push({ label: '業態限定', onRemove: () => onRemoveFilter('businessModelCategory') });
  }
  if (filter.moat !== 'ALL') {
    activeChips.push({ label: '防壁限定', onRemove: () => onRemoveFilter('moat') });
  }
  if (filter.acquisitionChannel !== 'ALL') {
    activeChips.push({ label: '集客限定', onRemove: () => onRemoveFilter('acquisitionChannel') });
  }


  return (
    <div className={`${isCollapsed ? 'w-11' : 'w-84 lg:w-96'} bg-white border-r border-slate-200 flex flex-col shrink-0 select-none overflow-hidden font-sans transition-[width] duration-200 shadow-xs`}>
      {isCollapsed ? (
        <div className="flex h-full flex-col items-center bg-slate-50 py-3 border-r border-slate-200">
          <button
            type="button"
            onClick={() => setIsCollapsed(false)}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-lg leading-none text-slate-600 hover:bg-slate-100 hover:text-slate-900 shadow-2xs"
            aria-label="候補一覧を開く"
            title="候補一覧を開く"
          >
            ›
          </button>
          <span className="mt-4 text-[10px] font-mono tracking-widest text-slate-400 [writing-mode:vertical-rl]">
            候補台帳一覧
          </span>
        </div>
      ) : (
        <>
      {/* 1. 【左リスト専用スクリーナー頭部】 */}
      <div className="p-3 bg-slate-50 border-b border-slate-200 space-y-2.5">
        {/* 見出し ＆ 多次元スクリーナー起動ボタン */}
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-[9px] font-mono text-slate-500 font-bold uppercase tracking-wider">
              CANDIDATE DIRECTORY
            </div>
            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <span>実戦ビジネス一覧</span>
              <span className="text-[10px] font-mono text-slate-600 font-medium">
                ({displayedCompanies.length}/{totalCount}件)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={onOpenScreener}
              className={`h-7 px-2.5 rounded-md text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-2xs ${
                hasActiveFilters
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
              title="詳細条件で絞り込む"
            >
              {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>}
              <span>条件絞込 (50軸)</span>
            </button>
            <button
              type="button"
              onClick={() => setIsCollapsed(true)}
              className="h-7 w-7 shrink-0 rounded-md border border-slate-200 bg-white text-lg leading-none text-slate-500 hover:bg-slate-100 hover:text-slate-800 flex items-center justify-center"
              aria-label="候補一覧を折りたたむ"
              title="候補一覧を折りたたむ"
            >
              ‹
            </button>
          </div>
        </div>

        {/* 規模切り替えタブ（個人・スモール ⇄ 大企業 ⇄ すべて） */}
        <div className="grid grid-cols-3 gap-1 bg-slate-200/80 p-0.5 rounded-lg text-[11px] font-mono">
          <button
            onClick={() => handleScaleTabChange('SOLO_SMALL')}
            className={`py-1 rounded-md text-center font-bold transition-all ${
              scaleTab === 'SOLO_SMALL'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            個人・少人数 ({soloSmallCompanies.length})
          </button>
          <button
            onClick={() => handleScaleTabChange('MEGA_CORP')}
            className={`py-1 rounded-md text-center font-bold transition-all ${
              scaleTab === 'MEGA_CORP'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            大企業独占 ({megaCorpCompanies.length})
          </button>
          <button
            onClick={() => handleScaleTabChange('ALL')}
            className={`py-1 rounded-md text-center font-medium transition-all ${
              scaleTab === 'ALL'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            全件 ({companies.length})
          </button>
        </div>

        {/* 適用中の詳細条件バッジ（アクティブ時のみ展開） */}
        {(activeChips.length > 0 || activePreset !== 'ALL') && (
          <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between gap-1 text-[10px] font-mono">
            <div className="flex items-center gap-1 flex-wrap overflow-hidden">
              <span className="text-slate-600 shrink-0 font-semibold">● 絞込中:</span>
              {activeChips.map((chip, i) => (
                <span
                  key={i}
                  className="px-1.5 py-0.5 rounded bg-white text-slate-700 border border-slate-200 flex items-center gap-1 shadow-2xs"
                >
                  <span>{chip.label}</span>
                  <button onClick={chip.onRemove} className="hover:text-red-500 leading-none p-0.5" aria-label="削除">
                    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
            <button
              onClick={onResetAll}
              className="text-indigo-600 hover:text-indigo-800 underline shrink-0 font-sans text-[10px] font-medium"
            >
              解除
            </button>
          </div>
        )}

        {/* 並び替えセレクター */}
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-0.5">
          <span>並び替え順:</span>
          <select
            value={activeSort}
            onChange={(e) => onSelectSort(e.target.value as SortOrder)}
            className="bg-white text-slate-700 border border-slate-200 rounded px-2 py-0.5 text-[10px] font-medium focus:outline-hidden shadow-2xs"
          >
            <option value="REVENUE_DESC">売上が大きい順</option>
            <option value="MARGIN_DESC">利益率が高い順</option>
            <option value="TEAM_ASC">少人数・一人順</option>
            <option value="INVEST_ASC">初期投資が少ない順</option>
          </select>
        </div>
      </div>

      {/* 2. 【テーブル形式カラム見出し】 */}
      <div className="px-3 py-1.5 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between text-[10px] text-slate-500 font-mono font-medium">
        <span className="tracking-wider">アイコン / 企業名 / 事業内容</span>
        <span className="tracking-wider shrink-0">推移 / 収益規模</span>
      </div>

      {/* 3. 【該当銘柄一覧リスト】 */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {displayedCompanies.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 font-sans space-y-2">
            <div>該当するビジネスが見つかりません</div>
            <button
              onClick={onResetAll}
              className="text-xs text-indigo-600 hover:text-indigo-800 underline font-medium"
            >
              絞り込みを解除する
            </button>
          </div>
        ) : (
          displayedCompanies.map((company) => {
            const isSelected = company.id === selectedCompanyId;
            const latestFin = company.financials[company.financials.length - 1];

            // 収益規模の直感的な金額フォーマット
            const formatRevenueBadge = (rev: number, period: string) => {
              if (period.includes('初週') || period.includes('48時間')) {
                return '初週 2,000万';
              }
              if (company.isForSale && company.askingPriceJpy) {
                return `売却 ${Math.round(company.askingPriceJpy / 10000)}万円`;
              }
              if (rev >= 1_000_000_000_000) {
                return `年商 ${(rev / 1_000_000_000_000).toFixed(1)}兆`;
              }
              if (rev >= 100_000_000) {
                return `年商 ${Math.round(rev / 100_000_000)}億円`;
              }
              if (rev >= 10_000) {
                return `月商 ${Math.round(rev / 10000)}万円`;
              }
              return `年商 ${rev}円`;
            };

            const revenueLabel = latestFin
              ? formatRevenueBadge(latestFin.revenueJpy, latestFin.period)
              : '';

            // 事業体制・規模のバッジ定義
            const getTierBadge = (tier: ScaleTier) => {
              switch (tier) {
                case 'SOLO_MICRO':
                  return { label: company.teamSize === 1 ? '1人運営' : `${company.teamSize}名`, color: 'text-indigo-700 border-indigo-200 bg-indigo-50' };
                case 'NICHE_LEADER':
                  return { label: 'ニッチ独占', color: 'text-amber-700 border-amber-200 bg-amber-50' };
                case 'SCALE_UP':
                  return { label: '急成長', color: 'text-sky-700 border-sky-200 bg-sky-50' };
                case 'MEGA_CORP':
                  return { label: '巨大独占', color: 'text-purple-700 border-purple-200 bg-purple-50' };
              }
            };

            const tierBadge = getTierBadge(company.scaleTier);

            return (
              <div
                key={company.id}
                onClick={() => onSelectCompany(company.id)}
                className={`px-3 py-2.5 cursor-pointer transition-all border-l-3 flex items-center justify-between gap-2.5 ${
                  isSelected
                    ? 'bg-indigo-50/80 border-indigo-600 text-slate-900 shadow-2xs'
                    : 'hover:bg-slate-50 border-transparent text-slate-700'
                }`}
              >
                {/* 左側: アプリアイコン + タイトル & タグライン */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="shrink-0">
                    <CompanyLogo company={company} size="sm" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={`px-1 py-0.2 rounded text-[9px] font-mono font-bold border shrink-0 ${tierBadge.color}`}>
                        {tierBadge.label}
                      </span>
                      <span className={`text-xs font-bold truncate ${isSelected ? 'text-indigo-950 font-black' : 'text-slate-900'}`}>
                        {company.japaneseName}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 truncate">
                      {company.weeklyHours && company.weeklyHours <= 10 && (
                        <span className="text-slate-600 font-mono text-[9px] shrink-0 font-semibold px-1 py-0.2 rounded bg-slate-100 border border-slate-200">
                          週{company.weeklyHours}h
                        </span>
                      )}
                      <span className="truncate text-slate-500 font-normal">
                        {company.businessEssence?.whatItDoes || company.tagline}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 右側: Sparkline波形 + エメラルド月商バッジ */}
                <div className="shrink-0 flex flex-col items-end gap-1">
                  {revenueLabel && (
                    <span className="text-[10px] font-mono font-black text-emerald-700 tabular-nums px-1.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200/80 shadow-2xs whitespace-nowrap">
                      {revenueLabel}
                    </span>
                  )}
                  <div className="w-12 h-4 opacity-75">
                    <SparklineChart trend="UP" width={48} height={16} color="#10B981" />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
        </>
      )}
    </div>
  );
};
