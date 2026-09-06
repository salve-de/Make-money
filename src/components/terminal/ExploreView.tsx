'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw, Search, SlidersHorizontal } from 'lucide-react';
import { CompanyRecord } from '@/types/terminal';
import { AuditStatusBadge } from '@/components/terminal/AuditStatusBadge';
import { CompanyLogo } from '@/components/terminal/CompanyLogo';

interface ExploreViewProps {
  companies: CompanyRecord[];
  totalCount: number;
  onSelectCompany: (companyId: string) => void;
}

type SelectFilter = 'ALL' | string;
type SortKey = 'revenue' | 'margin' | 'team' | 'investment';

const PAGE_SIZE = 40;

const latestFinancials = (company: CompanyRecord) => company.financials[company.financials.length - 1];

const formatJpy = (value: number | undefined) => {
  if (value === undefined) return '—';
  if (value >= 1_000_000_000_000) return `¥${(value / 1_000_000_000_000).toFixed(1)}兆`;
  if (value >= 100_000_000) return `¥${Math.round(value / 100_000_000)}億`;
  if (value >= 10_000) return `¥${Math.round(value / 10_000).toLocaleString()}万`;
  return `¥${value.toLocaleString()}`;
};

const readParam = (key: string, fallback: string) => {
  if (typeof window === 'undefined') return fallback;
  return new URLSearchParams(window.location.search).get(key) || fallback;
};

export const ExploreView: React.FC<ExploreViewProps> = ({ companies, totalCount, onSelectCompany }) => {
  const [query, setQuery] = useState(() => readParam('q', ''));
  const [capital, setCapital] = useState<SelectFilter>(() => readParam('capital', 'ALL'));
  const [team, setTeam] = useState<SelectFilter>(() => readParam('team', 'ALL'));
  const [margin, setMargin] = useState<SelectFilter>(() => readParam('margin', 'ALL'));
  const [evidence, setEvidence] = useState<SelectFilter>(() => readParam('evidence', 'ALL'));
  const [sort, setSort] = useState<SortKey>(() => readParam('sort', 'revenue') as SortKey);
  const [page, setPage] = useState(() => Number(readParam('page', '1')) || 1);

  const filteredCompanies = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return companies
      .filter((company) => {
        const financials = latestFinancials(company);
        const searchable = [
          company.name,
          company.japaneseName,
          company.ticker,
          company.tagline,
          company.actionHeadline,
          company.businessEssence.whatItDoes,
          ...company.tags,
        ].join(' ').toLowerCase();
        if (normalizedQuery && !searchable.includes(normalizedQuery)) return false;
        if (capital === 'ZERO' && company.initialInvestmentJpy > 50_000) return false;
        if (capital === 'UNDER_500K' && company.initialInvestmentJpy > 500_000) return false;
        if (team === 'SOLO' && company.teamSize > 1) return false;
        if (team === 'SMALL' && (company.teamSize < 2 || company.teamSize > 10)) return false;
        if (margin === 'OVER_50' && (financials?.operatingMarginPercent ?? 0) < 50) return false;
        if (margin === 'OVER_80' && (financials?.operatingMarginPercent ?? 0) < 80) return false;
        if (evidence !== 'ALL' && company.verifiedStatus !== evidence) return false;
        return true;
      })
      .sort((a, b) => {
        const aFinancials = latestFinancials(a);
        const bFinancials = latestFinancials(b);
        if (sort === 'margin') return (bFinancials?.operatingMarginPercent ?? 0) - (aFinancials?.operatingMarginPercent ?? 0);
        if (sort === 'team') return a.teamSize - b.teamSize;
        if (sort === 'investment') return a.initialInvestmentJpy - b.initialInvestmentJpy;
        return (bFinancials?.revenueJpy ?? 0) - (aFinancials?.revenueJpy ?? 0);
      });
  }, [capital, companies, evidence, margin, query, sort, team]);

  const pageCount = Math.max(1, Math.ceil(filteredCompanies.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visibleCompanies = filteredCompanies.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const hasFilters = Boolean(query || capital !== 'ALL' || team !== 'ALL' || margin !== 'ALL' || evidence !== 'ALL');

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('view', 'FINDER');
    const values: Record<string, string> = { q: query, capital, team, margin, evidence, sort, page: String(safePage) };
    Object.entries(values).forEach(([key, value]) => {
      if (value && value !== 'ALL' && !(key === 'sort' && value === 'revenue') && !(key === 'page' && value === '1')) url.searchParams.set(key, value);
      else url.searchParams.delete(key);
    });
    window.history.replaceState({}, '', url);
  }, [capital, evidence, margin, page, query, safePage, sort, team]);

  const resetFilters = () => {
    setQuery('');
    setCapital('ALL');
    setTeam('ALL');
    setMargin('ALL');
    setEvidence('ALL');
    setSort('revenue');
    setPage(1);
  };

  const renderCompanyName = (company: CompanyRecord) => (
    <span className="flex min-w-0 items-center gap-2.5">
      <CompanyLogo id={company.id} size="sm" />
      <span className="min-w-0">
        <span className="flex items-center gap-2">
          <span className="truncate font-bold text-slate-950">{company.japaneseName}</span>
          <AuditStatusBadge status={company.verifiedStatus} compact />
        </span>
        <span className="mt-0.5 block truncate text-[11px] text-slate-500">{company.tagline}</span>
      </span>
    </span>
  );

  return (
    <main className="min-h-0 flex-1 overflow-y-auto bg-[#f5f6f8] text-slate-950">
      <div className="mx-auto max-w-[1600px] bg-white">
        <header className="border-b border-slate-200 px-5 py-4 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="bg-slate-950 px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-[0.16em] text-white">EXPLORE</span>
              <h1 className="text-lg font-bold tracking-tight">企業・事業台帳</h1>
              <span className="font-mono text-xs tabular-nums text-slate-500">{filteredCompanies.length.toLocaleString()} / {totalCount.toLocaleString()}</span>
            </div>
            <button type="button" onClick={resetFilters} disabled={!hasFilters} aria-label="条件をリセット" className="inline-flex h-8 items-center gap-1.5 border border-slate-300 px-2.5 text-xs text-slate-600 enabled:hover:border-slate-950 enabled:hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-35"><RotateCcw size={13} />リセット</button>
          </div>
        </header>

        <section className="border-b border-slate-200 px-5 py-3 sm:px-8" aria-label="検索と絞り込み">
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative min-w-[240px] flex-1 sm:max-w-md">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="企業名・手口・タグ" className="h-9 w-full border border-slate-300 pl-9 pr-3 text-xs outline-none focus:border-slate-950 focus:ring-1 focus:ring-slate-950" />
            </label>
            <SlidersHorizontal size={14} className="ml-1 text-slate-400" aria-hidden="true" />
            <select value={capital} onChange={(event) => { setCapital(event.target.value); setPage(1); }} aria-label="初期資本" className="h-9 border border-slate-300 bg-white px-2 text-xs text-slate-700"><option value="ALL">資本: 全て</option><option value="ZERO">資本: 50万円以下</option><option value="UNDER_500K">資本: 50万円超を除外</option></select>
            <select value={team} onChange={(event) => { setTeam(event.target.value); setPage(1); }} aria-label="人数" className="h-9 border border-slate-300 bg-white px-2 text-xs text-slate-700"><option value="ALL">人数: 全て</option><option value="SOLO">人数: 1人</option><option value="SMALL">人数: 2〜10人</option></select>
            <select value={margin} onChange={(event) => { setMargin(event.target.value); setPage(1); }} aria-label="利益率" className="h-9 border border-slate-300 bg-white px-2 text-xs text-slate-700"><option value="ALL">利益率: 全て</option><option value="OVER_50">利益率: 50%以上</option><option value="OVER_80">利益率: 80%以上</option></select>
            <select value={evidence} onChange={(event) => { setEvidence(event.target.value); setPage(1); }} aria-label="出典区分" className="h-9 border border-slate-300 bg-white px-2 text-xs text-slate-700"><option value="ALL">出典: 全て</option><option value="AUDITED_PUBLIC">出典: 有報</option><option value="VERIFIED_STRIPE">出典: 決済</option><option value="ESTIMATED_MODEL">出典: 推計</option></select>
            <select value={sort} onChange={(event) => { setSort(event.target.value as SortKey); setPage(1); }} aria-label="並び替え" className="h-9 border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700"><option value="revenue">売上順</option><option value="margin">利益率順</option><option value="team">人数順</option><option value="investment">資本順</option></select>
          </div>
        </section>

        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full border-collapse text-left text-xs">
            <caption className="sr-only">企業・事業台帳</caption>
            <thead className="border-b border-slate-200 bg-slate-50 font-mono text-[10px] font-semibold text-slate-500">
              <tr><th scope="col" className="px-5 py-2.5 sm:px-8">企業 / 事業構造</th><th scope="col" className="px-3 py-2.5 text-right">年商</th><th scope="col" className="px-3 py-2.5 text-right">利益率</th><th scope="col" className="px-3 py-2.5 text-right">初期資本</th><th scope="col" className="px-3 py-2.5 text-right">人数</th><th scope="col" className="px-5 py-2.5 text-right sm:px-8">出典</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleCompanies.map((company) => {
                const financials = latestFinancials(company);
                return <tr key={company.id} className="group hover:bg-slate-50"><th scope="row" className="px-5 py-3 text-left font-normal sm:px-8"><button type="button" onClick={() => onSelectCompany(company.id)} className="w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-950 focus-visible:outline-offset-2">{renderCompanyName(company)}</button></th><td className="px-3 py-3 text-right font-mono tabular-nums text-slate-700">{formatJpy(financials?.revenueJpy)}</td><td className="px-3 py-3 text-right font-mono font-bold tabular-nums text-emerald-700">{financials?.operatingMarginPercent ?? '—'}{financials?.operatingMarginPercent !== undefined && '%'}</td><td className="px-3 py-3 text-right font-mono tabular-nums text-slate-600">{formatJpy(company.initialInvestmentJpy)}</td><td className="px-3 py-3 text-right font-mono tabular-nums text-slate-600">{company.teamSize}人</td><td className="px-5 py-3 text-right sm:px-8"><AuditStatusBadge status={company.verifiedStatus} compact /></td></tr>;
              })}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-slate-100 sm:hidden">
          {visibleCompanies.map((company) => {
            const financials = latestFinancials(company);
            return <button type="button" key={company.id} onClick={() => onSelectCompany(company.id)} className="block w-full px-5 py-3 text-left focus-visible:bg-slate-50"><div>{renderCompanyName(company)}</div><div className="mt-3 grid grid-cols-4 gap-2 border-t border-slate-100 pt-2 font-mono text-[10px] tabular-nums"><span><span className="block text-slate-400">年商</span>{formatJpy(financials?.revenueJpy)}</span><span><span className="block text-slate-400">利益率</span>{financials?.operatingMarginPercent ?? '—'}%</span><span><span className="block text-slate-400">資本</span>{formatJpy(company.initialInvestmentJpy)}</span><span><span className="block text-slate-400">人数</span>{company.teamSize}人</span></div></button>;
          })}
        </div>

        {visibleCompanies.length === 0 && <div className="border-t border-slate-200 px-5 py-16 text-center text-xs text-slate-500">該当なし</div>}

        <footer className="flex items-center justify-between border-t border-slate-200 px-5 py-3 font-mono text-xs text-slate-500 sm:px-8">
          <span>{filteredCompanies.length === 0 ? '0 / 0' : `${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, filteredCompanies.length)} / ${filteredCompanies.length}`}</span>
          <div className="flex items-center gap-1"><button type="button" aria-label="前のページ" disabled={safePage <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="inline-flex h-8 w-8 items-center justify-center border border-slate-300 enabled:hover:border-slate-950 disabled:opacity-35"><ChevronLeft size={14} /></button><span className="min-w-16 text-center">{safePage} / {pageCount}</span><button type="button" aria-label="次のページ" disabled={safePage >= pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))} className="inline-flex h-8 w-8 items-center justify-center border border-slate-300 enabled:hover:border-slate-950 disabled:opacity-35"><ChevronRight size={14} /></button></div>
        </footer>
      </div>
    </main>
  );
};
