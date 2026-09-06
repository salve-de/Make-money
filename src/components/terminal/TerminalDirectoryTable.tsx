'use client';

import React, { useState, useMemo } from 'react';
import { CompanyRecord, ScaleTier, TerminalFilterState } from '../../types/terminal';
import { CompanyLogo } from './CompanyLogo';
import { SparklineChart } from './SparklineChart';
import { 
  SlidersHorizontal, 
  Search, 
  ArrowUpDown, 
  ChevronRight, 
  Bookmark, 
  Check, 
  ShieldCheck, 
  ExternalLink,
  Zap,
  TrendingUp,
  RotateCcw
} from 'lucide-react';

interface TerminalDirectoryTableProps {
  companies: CompanyRecord[];
  totalCount: number;
  onSelectCompany: (id: string) => void;
  onOpenScreener: () => void;
  bookmarkedIds: string[];
  onToggleBookmark: (id: string) => void;
}

type QuickFacet = 'ALL' | 'SOLO' | 'HIGH_MARGIN' | 'ZERO_INVEST' | 'MEGA' | 'SAVED';
type SortField = 'REVENUE' | 'MARGIN' | 'TEAM' | 'INVEST';

export const TerminalDirectoryTable: React.FC<TerminalDirectoryTableProps> = ({
  companies,
  totalCount,
  onSelectCompany,
  onOpenScreener,
  bookmarkedIds,
  onToggleBookmark
}) => {
  const [activeFacet, setActiveFacet] = useState<QuickFacet>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('REVENUE');
  const [sortAsc, setSortAsc] = useState(false);

  // フィルタリング
  const filteredList = useMemo(() => {
    return companies.filter((c) => {
      // 検索
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = c.japaneseName.toLowerCase().includes(q) || c.name.toLowerCase().includes(q);
        const matchTag = c.tags.some(t => t.toLowerCase().includes(q));
        const matchModel = c.businessModel.toLowerCase().includes(q);
        const matchFounder = (c.founderName || '').toLowerCase().includes(q);
        if (!matchName && !matchTag && !matchModel && !matchFounder) return false;
      }

      // クイックファセット
      if (activeFacet === 'SOLO') return c.teamSize === 1;
      if (activeFacet === 'HIGH_MARGIN') {
        const fin = c.financials[c.financials.length - 1];
        return (fin?.operatingMarginPercent || 0) >= 50;
      }
      if (activeFacet === 'ZERO_INVEST') return c.initialInvestmentJpy <= 50000;
      if (activeFacet === 'MEGA') return c.scaleTier === 'MEGA_CORP' || c.tags.includes('巨大独占');
      if (activeFacet === 'SAVED') return bookmarkedIds.includes(c.id);

      return true;
    });
  }, [companies, activeFacet, searchQuery, bookmarkedIds]);

  // ソート
  const sortedList = useMemo(() => {
    return [...filteredList].sort((a, b) => {
      const finA = a.financials[a.financials.length - 1];
      const finB = b.financials[b.financials.length - 1];
      const revA = finA?.revenueJpy || 0;
      const revB = finB?.revenueJpy || 0;
      const marginA = finA?.operatingMarginPercent || 0;
      const marginB = finB?.operatingMarginPercent || 0;

      let diff = 0;
      if (sortField === 'REVENUE') diff = revB - revA;
      else if (sortField === 'MARGIN') diff = marginB - marginA;
      else if (sortField === 'TEAM') diff = a.teamSize - b.teamSize;
      else if (sortField === 'INVEST') diff = a.initialInvestmentJpy - b.initialInvestmentJpy;

      return sortAsc ? -diff : diff;
    });
  }, [filteredList, sortField, sortAsc]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  // 金額フォーマット
  const formatAmount = (jpy: number) => {
    if (jpy >= 1_000_000_000_000) return `¥${(jpy / 1_000_000_000_000).toFixed(2)}兆`;
    if (jpy >= 100_000_000) return `¥${Math.round(jpy / 100_000_000)}億`;
    if (jpy >= 10_000) return `¥${Math.round(jpy / 10000)}万`;
    return `¥${jpy}`;
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0B0E14] font-sans text-zinc-200 select-none overflow-hidden">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. コントロールバー（検索・ファセット・50軸・PitchBook規格）     */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="p-4 bg-[#0D1117] border-b border-white/[0.08] flex flex-col gap-3 shrink-0">
        {/* 上段：タイトル、検索窓、50軸ボタン */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">
              CAPITAL ARBITRAGE DIRECTORY
            </span>
            <span className="text-[11px] font-mono text-emerald-400 font-bold bg-emerald-950/70 px-2 py-0.5 rounded border border-emerald-800/60">
              {sortedList.length} 銘柄表示中 / 全 {totalCount} 件
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* 検索入力 */}
            <div className="relative w-64 sm:w-80">
              <Search size={13} className="absolute left-2.5 top-2.5 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="銘柄名・モデル・創業者・手口検索..."
                className="w-full bg-[#121620] border border-white/[0.1] rounded pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 font-mono"
              />
            </div>

            {/* 50軸モーダルボタン */}
            <button
              type="button"
              onClick={onOpenScreener}
              className="h-8 px-3 rounded bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-xs font-mono text-zinc-200 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 font-bold"
            >
              <SlidersHorizontal size={12} />
              <span>50軸スクリーナー</span>
            </button>
          </div>
        </div>

        {/* 下段：常設クイックファセットボタン（1クリック即時切り替え） */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1 text-xs font-mono">
          <span className="text-[11px] text-zinc-500 mr-1 shrink-0 font-sans font-medium">クイック絞込:</span>
          {[
            { id: 'ALL', label: `全件 (${companies.length})` },
            { id: 'SOLO', label: '完全1人運営 (億超え)' },
            { id: 'HIGH_MARGIN', label: '営業利益率 50%超' },
            { id: 'ZERO_INVEST', label: '初期資本 0円〜5万円' },
            { id: 'MEGA', label: '巨大独占 (キーエンス等)' },
            { id: 'SAVED', label: `★保存済み (${bookmarkedIds.length})` }
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveFacet(f.id as QuickFacet)}
              className={`h-7 px-3 rounded text-xs font-medium whitespace-nowrap transition-colors cursor-pointer border ${
                activeFacet === f.id
                  ? 'bg-emerald-950/80 text-emerald-300 font-bold border-emerald-800/60 shadow-xs'
                  : 'bg-white/[0.03] text-zinc-400 border-white/[0.06] hover:text-zinc-200 hover:bg-white/[0.06]'
              }`}
            >
              {f.label}
            </button>
          ))}

          {(activeFacet !== 'ALL' || searchQuery) && (
            <button
              onClick={() => { setActiveFacet('ALL'); setSearchQuery(''); }}
              className="text-[11px] text-zinc-500 hover:text-zinc-300 underline ml-2 flex items-center gap-1 cursor-pointer shrink-0"
            >
              <RotateCcw size={10} />
              <span>リセット</span>
            </button>
          )}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. 高密度データテーブル（Starter Story × PitchBook 型）       */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse font-sans text-xs">
          {/* テーブルヘッダー（固定・ソート可能） */}
          <thead className="bg-[#0F131C] text-[10px] font-mono text-zinc-400 uppercase tracking-wider sticky top-0 z-10 border-b border-white/[0.08]">
            <tr>
              <th className="py-2.5 px-3 w-10 text-center">#</th>
              <th className="py-2.5 px-3 min-w-[200px]">企業名 / 創業者 / モデル</th>
              <th 
                onClick={() => handleSort('REVENUE')}
                className="py-2.5 px-3 text-right cursor-pointer hover:text-white"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>直近月商 (年商)</span>
                  <ArrowUpDown size={10} className={sortField === 'REVENUE' ? 'text-emerald-400' : 'opacity-40'} />
                </div>
              </th>
              <th className="py-2.5 px-3 text-right">実効手残り純利 (月利)</th>
              <th 
                onClick={() => handleSort('MARGIN')}
                className="py-2.5 px-3 text-right cursor-pointer hover:text-white"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>営業利益率</span>
                  <ArrowUpDown size={10} className={sortField === 'MARGIN' ? 'text-emerald-400' : 'opacity-40'} />
                </div>
              </th>
              <th 
                onClick={() => handleSort('INVEST')}
                className="py-2.5 px-3 text-right cursor-pointer hover:text-white hidden md:table-cell"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>初期投下資本</span>
                  <ArrowUpDown size={10} className={sortField === 'INVEST' ? 'text-emerald-400' : 'opacity-40'} />
                </div>
              </th>
              <th 
                onClick={() => handleSort('TEAM')}
                className="py-2.5 px-3 text-center cursor-pointer hover:text-white"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>体制</span>
                  <ArrowUpDown size={10} className={sortField === 'TEAM' ? 'text-emerald-400' : 'opacity-40'} />
                </div>
              </th>
              <th className="py-2.5 px-3 text-center hidden lg:table-cell">週実働</th>
              <th className="py-2.5 px-3 min-w-[180px] hidden xl:table-cell">突いた業界の盲点・バグ</th>
              <th className="py-2.5 px-3 w-20 text-center">推移</th>
              <th className="py-2.5 px-3 w-16 text-center">詳細</th>
            </tr>
          </thead>

          {/* テーブル本文 */}
          <tbody className="divide-y divide-white/[0.04] text-zinc-300 font-mono">
            {sortedList.map((company, index) => {
              const latestFin = company.financials[company.financials.length - 1];
              const rev = latestFin?.revenueJpy || 0;
              const monthlyRev = Math.round(rev / 12);
              const margin = latestFin?.operatingMarginPercent || 0;
              const isBookmarked = bookmarkedIds.includes(company.id);

              const easyProfit = company.entryStrategy?.estimatedEasyProfit ||
                company.derivedBusinessIdeas?.[0]?.estimatedMonthlyProfit ||
                '月利50万〜150万円';

              const glitch = company.successStory?.marketGlitch ||
                company.entryStrategy?.whyIncumbentCantWin ||
                '既存プレイヤーの過剰価格と鈍重さを突いた即応モデル。';

              return (
                <tr
                  key={company.id}
                  onClick={() => onSelectCompany(company.id)}
                  className="hover:bg-white/[0.04] transition-colors cursor-pointer group"
                >
                  {/* # ランク */}
                  <td className="py-3 px-3 text-center text-[11px] text-zinc-500">
                    {index + 1}
                  </td>

                  {/* 企業名 / 創業者 / モデル */}
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2.5">
                      <CompanyLogo id={company.id} size="sm" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-xs text-white group-hover:text-emerald-400 transition-colors font-sans">
                            {company.japaneseName}
                          </span>
                          <span className={`text-[8px] font-mono px-1 py-0.2 rounded ${
                            company.verifiedStatus === 'AUDITED_PUBLIC'
                              ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-800/60'
                              : company.verifiedStatus === 'VERIFIED_STRIPE'
                              ? 'bg-blue-950/70 text-blue-400 border border-blue-800/60'
                              : 'bg-amber-950/70 text-amber-400 border border-amber-800/60'
                          }`}>
                            {company.verifiedStatus === 'AUDITED_PUBLIC' ? '有報' : company.verifiedStatus === 'VERIFIED_STRIPE' ? '決済' : '推計'}
                          </span>
                        </div>
                        <div className="text-[10px] text-zinc-400 truncate mt-0.5 max-w-xs font-sans">
                          {company.tagline}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* 直近月商 (年商) */}
                  <td className="py-3 px-3 text-right">
                    <div className="text-xs font-bold text-white tabular-nums">
                      {monthlyRev > 0 ? formatAmount(monthlyRev) : '非公開'}
                    </div>
                    <div className="text-[10px] text-zinc-500 tabular-nums">
                      年 {formatAmount(rev)}
                    </div>
                  </td>

                  {/* 実効手残り純利 (月利) */}
                  <td className="py-3 px-3 text-right">
                    <span className="text-[11px] font-bold text-emerald-400 tabular-nums px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/60 inline-block">
                      {easyProfit}
                    </span>
                  </td>

                  {/* 営業利益率 */}
                  <td className="py-3 px-3 text-right">
                    <span className={`text-xs font-bold tabular-nums ${margin >= 80 ? 'text-emerald-400' : margin >= 50 ? 'text-emerald-300' : 'text-zinc-200'}`}>
                      {margin}%
                    </span>
                  </td>

                  {/* 初期投下資本 */}
                  <td className="py-3 px-3 text-right text-xs text-zinc-300 tabular-nums hidden md:table-cell">
                    {company.initialInvestmentJpy === 0 ? '¥0 (不要)' : `¥${Math.round(company.initialInvestmentJpy / 10000)}万`}
                  </td>

                  {/* 体制 */}
                  <td className="py-3 px-3 text-center">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono ${
                      company.teamSize === 1
                        ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/60 font-bold'
                        : company.scaleTier === 'MEGA_CORP'
                        ? 'bg-blue-950/80 text-blue-400 border-blue-800/60'
                        : 'bg-white/[0.04] text-zinc-300 border-white/[0.08]'
                    }`}>
                      {company.teamSize === 1 ? '完全1人' : company.scaleTier === 'MEGA_CORP' ? '独占大企業' : `${company.teamSize}名`}
                    </span>
                  </td>

                  {/* 週実働 */}
                  <td className="py-3 px-3 text-center text-xs text-zinc-400 hidden lg:table-cell">
                    {company.weeklyHours ? `週${company.weeklyHours}h` : '少人数'}
                  </td>

                  {/* 突いた業界の盲点・バグ */}
                  <td className="py-3 px-3 text-xs text-zinc-400 font-sans hidden xl:table-cell max-w-xs truncate" title={glitch}>
                    {glitch}
                  </td>

                  {/* 推移 */}
                  <td className="py-3 px-3 text-center">
                    <div className="w-14 h-5 mx-auto opacity-80">
                      <SparklineChart trend="UP" width={56} height={20} color="#10B981" />
                    </div>
                  </td>

                  {/* 詳細を開く */}
                  <td className="py-3 px-3 text-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectCompany(company.id);
                      }}
                      className="px-2 py-1 rounded bg-white/[0.06] group-hover:bg-emerald-500 group-hover:text-zinc-950 text-zinc-300 text-[10px] font-mono font-bold transition-all flex items-center justify-center gap-0.5 cursor-pointer mx-auto"
                    >
                      <span>解剖</span>
                      <ChevronRight size={11} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {sortedList.length === 0 && (
          <div className="py-16 text-center text-zinc-500 text-xs font-sans space-y-2">
            <div>条件に一致するビジネスが見つかりませんでした</div>
            <button
              onClick={() => { setActiveFacet('ALL'); setSearchQuery(''); }}
              className="text-emerald-400 underline cursor-pointer"
            >
              条件をリセットして全件表示
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
