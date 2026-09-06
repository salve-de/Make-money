'use client';

import React, { useMemo } from 'react';
import { ArrowUpRight, Bell, Bookmark, ChevronRight, Search, SlidersHorizontal } from 'lucide-react';
import { CompanyRecord } from '@/types/terminal';
import { AuditStatusBadge } from '@/components/terminal/AuditStatusBadge';
import { CompanyLogo } from '@/components/terminal/CompanyLogo';

interface PortalViewProps {
  companies: CompanyRecord[];
  onSelectCompany: (companyId: string) => void;
  onNavigateToTerminal: () => void;
  onFilterTheme?: (tag: string) => void;
  onOpenSignalsList?: () => void;
  onOpenLeaderboard?: () => void;
  onOpenIdeasVault?: () => void;
  onOpenFinder?: () => void;
}

const formatJpy = (value: number | null | undefined) => {
  if (value === null || value === undefined) return '—';
  if (value >= 1_000_000_000_000) return `¥${(value / 1_000_000_000_000).toFixed(1)}兆`;
  if (value >= 100_000_000) return `¥${Math.round(value / 100_000_000)}億`;
  if (value >= 10_000) return `¥${Math.round(value / 10_000).toLocaleString()}万`;
  return `¥${value.toLocaleString()}`;
};

const getLatestFinancials = (company: CompanyRecord) =>
  company.financials[company.financials.length - 1];

const getMonthlyRevenue = (company: CompanyRecord) => {
  const measured = company.passbookDetails?.monthlyGrossJpy;
  if (measured !== undefined) return { value: measured, basis: '実測' } as const;
  const annual = getLatestFinancials(company)?.revenueJpy;
  if (annual) return { value: Math.round(annual / 12), basis: '年商÷12換算' } as const;
  return { value: null, basis: '未確認' } as const;
};

export const PortalView: React.FC<PortalViewProps> = ({
  companies,
  onSelectCompany,
  onNavigateToTerminal,
  onFilterTheme,
  onOpenSignalsList,
  onOpenLeaderboard,
  onOpenIdeasVault,
  onOpenFinder,
}) => {
  const rankedCompanies = useMemo(() => {
    return [...companies]
      .sort((a, b) => {
        const aProfit = a.passbookDetails?.founderTakeHomeJpy ?? getLatestFinancials(a)?.operatingProfitJpy ?? 0;
        const bProfit = b.passbookDetails?.founderTakeHomeJpy ?? getLatestFinancials(b)?.operatingProfitJpy ?? 0;
        return bProfit - aProfit;
      })
      .slice(0, 12);
  }, [companies]);

  const quickFilters = [
    { label: '初期0円', tag: '初期0円' },
    { label: '完全1人', tag: '完全1人' },
    { label: '地方実業', tag: '地方実業' },
    { label: '利益率50%超', tag: '独占' },
  ];

  return (
    <main className="min-h-0 flex-1 overflow-y-auto bg-[#f5f6f8] text-slate-950 font-sans">
      <div className="mx-auto max-w-[1600px]">
        <header className="border-b border-slate-200 bg-white px-5 py-5 sm:px-8">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 font-mono text-[10px] font-bold tracking-[0.18em] text-slate-500">
                <span className="bg-slate-950 px-1.5 py-0.5 text-white">RADAR</span>
                <span>CAPITAL FLOWS / LIVE WORKSPACE</span>
              </div>
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">いま見るべき金の流れ</h1>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button type="button" onClick={onNavigateToTerminal} className="inline-flex h-8 items-center gap-1.5 border border-slate-950 bg-slate-950 px-3 font-semibold text-white hover:bg-slate-800">
                <Search size={13} />
                全件を探索
              </button>
              {onOpenSignalsList && (
                <button type="button" onClick={onOpenSignalsList} className="inline-flex h-8 items-center gap-1.5 border border-slate-300 bg-white px-3 font-semibold text-slate-700 hover:border-slate-950 hover:text-slate-950">
                  <Bell size={13} />
                  変化を見る
                </button>
              )}
              <span className="inline-flex h-8 items-center gap-1.5 border border-slate-200 px-2.5 font-mono text-[10px] text-slate-500">
                <span className="h-1.5 w-1.5 bg-emerald-500" />
                {companies.length}件を収録
              </span>
            </div>
          </div>
        </header>

        <div className="bg-slate-200">
          <section className="min-w-0 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3 sm:px-8">
              <div>
                <div className="font-mono text-[10px] font-bold tracking-[0.16em] text-slate-400">OPPORTUNITY UNIVERSE</div>
                <h2 className="mt-1 text-sm font-bold">収益構造の比較台帳</h2>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                {quickFilters.map((filter) => (
                  <button
                    type="button"
                    key={filter.tag}
                    onClick={() => { onFilterTheme?.(filter.tag); onNavigateToTerminal(); }}
                    className="hidden border border-slate-300 px-2 py-1.5 text-[10px] text-slate-600 hover:border-slate-950 hover:text-slate-950 sm:inline-flex"
                  >
                    {filter.label}
                  </button>
                ))}
                {onOpenFinder && <button type="button" onClick={onOpenFinder} className="inline-flex items-center gap-1 border border-slate-300 px-2.5 py-1.5 text-slate-600 hover:border-slate-950 hover:text-slate-950"><SlidersHorizontal size={12} />制約から探す</button>}
                {onOpenLeaderboard && <button type="button" onClick={onOpenLeaderboard} className="inline-flex items-center gap-1 px-1.5 py-1.5 font-semibold text-slate-600 hover:text-slate-950">全ランキング<ArrowUpRight size={12} /></button>}
                {onOpenIdeasVault && <button type="button" aria-label="保存した機会" title="保存した機会" onClick={onOpenIdeasVault} className="inline-flex h-8 w-8 items-center justify-center border border-slate-300 text-slate-600 hover:border-slate-950 hover:text-slate-950"><Bookmark size={14} /></button>}
                {onOpenSignalsList && <button type="button" aria-label="市場シグナル" title="市場シグナル" onClick={onOpenSignalsList} className="inline-flex h-8 w-8 items-center justify-center border border-slate-300 text-slate-600 hover:border-slate-950 hover:text-slate-950"><Bell size={14} /></button>}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] border-collapse text-left text-xs">
                <caption className="sr-only">収益構造の比較台帳</caption>
                <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-mono font-semibold text-slate-500">
                  <tr>
                    <th scope="col" className="px-5 py-2.5 font-semibold sm:px-8">事業 / 出典</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-semibold">月商</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-semibold">利益率</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-semibold">初期資本</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-semibold">人数</th>
                    <th scope="col" className="px-5 py-2.5 text-right font-semibold sm:px-8">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rankedCompanies.map((company) => {
                    const financials = getLatestFinancials(company);
                    const monthly = getMonthlyRevenue(company);
                    return (
                      <tr key={company.id} className="group hover:bg-slate-50">
                        <th scope="row" className="px-5 py-3 text-left font-normal sm:px-8">
                          <button type="button" onClick={() => onSelectCompany(company.id)} className="flex min-w-0 items-center gap-2.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-950 focus-visible:outline-offset-2">
                            <CompanyLogo id={company.id} size="sm" />
                            <span className="min-w-0">
                              <span className="flex items-center gap-2">
                                <span className="truncate font-bold text-slate-950">{company.japaneseName}</span>
                                <AuditStatusBadge status={company.verifiedStatus} compact />
                              </span>
                              <span className="mt-0.5 block max-w-[340px] truncate text-[11px] text-slate-500">{company.tagline}</span>
                            </span>
                          </button>
                        </th>
                        <td className="px-3 py-3 text-right font-mono tabular-nums text-slate-700">
                          <span>{formatJpy(monthly.value)}</span>
                          <span className="mt-0.5 block text-[9px] text-slate-400">{monthly.basis}</span>
                        </td>
                        <td className="px-3 py-3 text-right font-mono font-bold tabular-nums text-emerald-700">{financials?.operatingMarginPercent ?? '—'}{financials?.operatingMarginPercent !== undefined && '%'}</td>
                        <td className="px-3 py-3 text-right font-mono tabular-nums text-slate-600">{formatJpy(company.initialInvestmentJpy)}</td>
                        <td className="px-3 py-3 text-right font-mono tabular-nums text-slate-600">{company.teamSize}人</td>
                        <td className="px-5 py-3 text-right sm:px-8">
                          <button type="button" aria-label={`${company.japaneseName}の調査書を開く`} onClick={() => onSelectCompany(company.id)} className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 opacity-70 hover:text-slate-950 group-hover:opacity-100 focus-visible:opacity-100"><span className="hidden sm:inline">調査書</span><ChevronRight size={13} /></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {rankedCompanies.length === 0 && (
                <div className="px-5 py-16 text-center text-xs text-slate-500">条件に一致する機会はありません。条件を緩めて再検索してください。</div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
};
