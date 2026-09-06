'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { PORTAL_SIGNALS } from '@/data/portalSignals';
import { TERMINAL_COMPANIES } from '@/data/terminalData';
import { CompanyRecord } from '@/types/terminal';
import { AuthModal } from '@/components/auth/AuthModal';
import { ProModal } from '@/components/terminal/ProModal';
import { useAuth } from '@/context/AuthContext';
import {
  Archive,
  BarChart3,
  Bookmark,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Download,
  ExternalLink,
  Filter,
  ListFilter,
  LogIn,
  Search,
  SlidersHorizontal,
  Table2,
  X,
} from 'lucide-react';

type Surface = 'EXPLORE' | 'RADAR' | 'LIBRARY';
type SortKey = 'revenue' | 'margin' | 'valuation' | 'growth';
type FilterState = {
  scale: string;
  margin: string;
  capital: string;
  evidence: string;
  model: string;
  moat: string;
};

const DEFAULT_FILTERS: FilterState = {
  scale: 'ALL',
  margin: 'ALL',
  capital: 'ALL',
  evidence: 'ALL',
  model: 'ALL',
  moat: 'ALL',
};

const PAGE_SIZE = 12;

function readList(key: string) {
  if (typeof window === 'undefined') return [] as string[];
  try {
    const value = JSON.parse(window.localStorage.getItem(key) ?? '[]');
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  } catch { return []; }
}

function money(value?: number) {
  if (!value) return '—';
  if (value >= 100_000_000) return `¥${(value / 100_000_000).toFixed(1)}億`;
  if (value >= 10_000) return `¥${Math.round(value / 10_000).toLocaleString()}万`;
  return `¥${value.toLocaleString()}`;
}

function latest(company: CompanyRecord) {
  return company.financials[company.financials.length - 1];
}

function growth(company: CompanyRecord) {
  const current = latest(company)?.revenueJpy ?? 0;
  const previous = company.financials[company.financials.length - 2]?.revenueJpy ?? 0;
  return previous ? ((current - previous) / previous) * 100 : 0;
}

function evidenceLabel(status: CompanyRecord['verifiedStatus']) {
  if (status === 'AUDITED_PUBLIC') return '有報';
  if (status === 'VERIFIED_STRIPE') return '決済照合';
  return '推計';
}

function parseSurface(value: string | null): Surface {
  return value === 'RADAR' || value === 'LIBRARY' ? value : 'EXPLORE';
}

export function MakeMoneyTerminal() {
  const { user } = useAuth();
  const [surface, setSurface] = useState<Surface>(() => typeof window === 'undefined' ? 'EXPLORE' : parseSurface(new URLSearchParams(window.location.search).get('view')));
  const [query, setQuery] = useState(() => typeof window === 'undefined' ? '' : new URLSearchParams(window.location.search).get('q') ?? '');
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<SortKey>('revenue');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>(() => readList('make-money:saved'));
  const [savedSearches, setSavedSearches] = useState<string[]>(() => readList('make-money:searches'));
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProOpen, setIsProOpen] = useState(false);

  useEffect(() => {
    const onPopState = () => {
      const next = new URLSearchParams(window.location.search);
      setSurface(parseSurface(next.get('view')));
      setQuery(next.get('q') ?? '');
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const writeUrl = (nextSurface: Surface, nextQuery = query) => {
    const params = new URLSearchParams();
    if (nextSurface !== 'EXPLORE') params.set('view', nextSurface);
    if (nextQuery) params.set('q', nextQuery);
    const nextUrl = `${window.location.pathname}${params.toString() ? `?${params}` : ''}`;
    window.history.pushState({}, '', nextUrl);
    setSurface(nextSurface);
  };

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const result = TERMINAL_COMPANIES.filter((company) => {
      const financial = latest(company);
      const haystack = [
        company.name,
        company.japaneseName,
        company.ticker,
        company.tagline,
        company.category,
        company.businessEssence?.whatItDoes,
        company.businessEssence?.monetizationWay,
        ...company.tags,
      ].join(' ').toLowerCase();
      if (normalized && !haystack.includes(normalized)) return false;
      if (filters.scale !== 'ALL' && company.scaleTier !== filters.scale) return false;
      if (filters.margin !== 'ALL' && financial.operatingMarginPercent < Number(filters.margin)) return false;
      if (filters.capital !== 'ALL') {
        if (filters.capital === 'ZERO' && company.initialInvestmentJpy !== 0) return false;
        if (filters.capital === '50000' && company.initialInvestmentJpy > 50_000) return false;
        if (filters.capital === '500000' && company.initialInvestmentJpy > 500_000) return false;
      }
      if (filters.evidence !== 'ALL' && company.verifiedStatus !== filters.evidence) return false;
      if (filters.model !== 'ALL' && company.businessModel !== filters.model) return false;
      if (filters.moat !== 'ALL' && company.primaryMoat !== filters.moat) return false;
      return true;
    });
    return result.sort((a, b) => {
      if (sort === 'margin') return latest(b).operatingMarginPercent - latest(a).operatingMarginPercent;
      if (sort === 'valuation') return b.estimatedValuationJpy - a.estimatedValuationJpy;
      if (sort === 'growth') return growth(b) - growth(a);
      return latest(b).revenueJpy - latest(a).revenueJpy;
    });
  }, [filters, query, sort]);

  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const selected = selectedId ? TERMINAL_COMPANIES.find((company) => company.id === selectedId) ?? null : null;
  const activeFilterCount = Object.values(filters).filter((value) => value !== 'ALL').length;
  const savedCompanies = TERMINAL_COMPANIES.filter((company) => savedIds.includes(company.id));
  const compareCompanies = TERMINAL_COMPANIES.filter((company) => compareIds.includes(company.id));

  const toggleSaved = (id: string) => {
    const next = savedIds.includes(id) ? savedIds.filter((item) => item !== id) : [...savedIds, id];
    setSavedIds(next);
    window.localStorage.setItem('make-money:saved', JSON.stringify(next));
    fetch('/api/bookmarks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemType: 'company', itemId: id }),
    }).catch(() => undefined);
  };

  const toggleCompare = (id: string) => {
    setCompareIds((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length < 4 ? [...current, id] : current);
  };

  const saveCurrentSearch = () => {
    const label = [query || '全企業', activeFilterCount ? `${activeFilterCount}条件` : '条件なし'].join(' / ');
    setSavedSearches((current) => {
      const next = current.includes(label) ? current : [label, ...current];
      window.localStorage.setItem('make-money:searches', JSON.stringify(next));
      return next;
    });
  };

  const updateQuery = (value: string) => {
    setQuery(value);
    setPage(1);
    const params = new URLSearchParams(window.location.search);
    if (value) params.set('q', value); else params.delete('q');
    window.history.replaceState({}, '', `${window.location.pathname}${params.toString() ? `?${params}` : ''}`);
  };

  return (
    <div className="mm-shell">
      <header className="mm-header">
        <button className="mm-brand" onClick={() => writeUrl('EXPLORE', '')} aria-label="EXPLOREへ戻る">
          <span className="mm-brand-mark">M</span>
          <span>MAKE-MONEY</span>
        </button>
        <nav className="mm-nav" aria-label="メインナビゲーション">
          <NavButton active={surface === 'EXPLORE'} icon={<Table2 size={15} />} onClick={() => writeUrl('EXPLORE')}>EXPLORE</NavButton>
          <NavButton active={surface === 'RADAR'} icon={<BarChart3 size={15} />} onClick={() => writeUrl('RADAR')}>RADAR</NavButton>
          <NavButton active={surface === 'LIBRARY'} icon={<Archive size={15} />} onClick={() => writeUrl('LIBRARY')}>LIBRARY <span className="mm-nav-count">{savedIds.length}</span></NavButton>
        </nav>
        <div className="mm-header-actions">
          <span className="mm-corpus"><i /> {TERMINAL_COMPANIES.length}社収録</span>
          {user ? <span className="mm-user">{user.email?.split('@')[0]}</span> : <button className="mm-login" onClick={() => setIsAuthOpen(true)}><LogIn size={14} />ログイン</button>}
          <button className="mm-pro" onClick={() => setIsProOpen(true)}>PRO</button>
        </div>
      </header>

      <main className="mm-main">
        {surface === 'EXPLORE' && (
          <section className="mm-surface" aria-label="企業探索">
            <div className="mm-toolbar">
              <div className="mm-search-wrap"><Search size={17} /><input value={query} onChange={(event) => updateQuery(event.target.value)} placeholder="企業・手口・業界・収益モデルを検索" aria-label="企業・手口・業界・収益モデルを検索" /></div>
              <button className={`mm-tool-button ${activeFilterCount ? 'is-active' : ''}`} onClick={() => setIsFilterOpen(true)}><SlidersHorizontal size={15} />絞り込み{activeFilterCount ? <b>{activeFilterCount}</b> : null}</button>
              <button className="mm-tool-button mm-desktop-only" onClick={saveCurrentSearch}><Bookmark size={15} />検索を保存</button>
              <button className="mm-tool-button mm-desktop-only"><Download size={15} />出力</button>
            </div>
            <div className="mm-statebar">
              <div><strong>{filtered.length.toLocaleString()}</strong> / {TERMINAL_COMPANIES.length.toLocaleString()}社 <span className="mm-muted">該当</span></div>
              <div className="mm-active-filters">{Object.entries(filters).filter(([, value]) => value !== 'ALL').map(([key, value]) => <button key={key} onClick={() => { setFilters((current) => ({ ...current, [key]: 'ALL' })); setPage(1); }}>{filterLabel(key, value)} <X size={12} /></button>)}{query && <button onClick={() => updateQuery('')}>「{query}」 <X size={12} /></button>}</div>
              <label className="mm-sort">並び順 <select value={sort} onChange={(event) => { setSort(event.target.value as SortKey); setPage(1); }}><option value="revenue">売上高</option><option value="margin">営業利益率</option><option value="valuation">企業価値</option><option value="growth">売上成長率</option></select><ChevronDown size={13} /></label>
            </div>
            <div className="mm-content-grid">
              <div className="mm-results-pane">
                <div className="mm-table-scroll">
                  <table className="mm-table"><caption className="sr-only">企業検索結果</caption><thead><tr><th scope="col">企業</th><th scope="col">収益モデル</th><th scope="col" className="num">売上高</th><th scope="col" className="num">営業利益率</th><th scope="col" className="num">成長率</th><th scope="col">出典</th><th scope="col" aria-label="操作" /></tr></thead><tbody>{visible.map((company) => <CompanyRow key={company.id} company={company} selected={company.id === selectedId} saved={savedIds.includes(company.id)} compared={compareIds.includes(company.id)} onSelect={() => setSelectedId(company.id)} onSave={() => toggleSaved(company.id)} onCompare={() => toggleCompare(company.id)} />)}</tbody></table>
                  {visible.length === 0 && <div className="mm-empty"><Search size={23} /><strong>該当する企業がありません</strong><button onClick={() => { setFilters(DEFAULT_FILTERS); updateQuery(''); }}>条件をすべて解除</button></div>}
                </div>
                <div className="mm-pagination"><span>{filtered.length ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} / ${filtered.length}` : '0 / 0'}</span><div><button disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>前へ</button><span>{page} / {pageCount}</span><button disabled={page >= pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>次へ</button></div></div>
              </div>
              <DossierPane company={selected} saved={selected ? savedIds.includes(selected.id) : false} onSave={() => selected && toggleSaved(selected.id)} onCompare={() => selected && toggleCompare(selected.id)} compared={selected ? compareIds.includes(selected.id) : false} onClose={() => setSelectedId(null)} />
            </div>
          </section>
        )}

        {surface === 'RADAR' && <RadarSurface onSelectCompany={(id) => { setSelectedId(id); setSurface('EXPLORE'); writeUrl('EXPLORE'); }} />}
        {surface === 'LIBRARY' && <LibrarySurface savedCompanies={savedCompanies} savedSearches={savedSearches} onSelectCompany={(id) => { setSelectedId(id); setSurface('EXPLORE'); writeUrl('EXPLORE'); }} onRemove={(id) => toggleSaved(id)} />}
      </main>

      {compareIds.length > 0 && <div className="mm-compare-bar"><span><Check size={14} />{compareIds.length}社を比較中</span><button onClick={() => setCompareIds([])}>解除</button><button className="mm-compare-primary" onClick={() => setIsCompareOpen(true)}>比較表を開く <ChevronRight size={15} /></button></div>}
      {isFilterOpen && <FilterPanel filters={filters} onChange={(next) => { setFilters(next); setPage(1); }} onClose={() => setIsFilterOpen(false)} onReset={() => { setFilters(DEFAULT_FILTERS); setPage(1); }} />}
      {isCompareOpen && <ComparePanel companies={compareCompanies} onClose={() => setIsCompareOpen(false)} onRemove={toggleCompare} />}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      <ProModal isOpen={isProOpen} onClose={() => setIsProOpen(false)} />
    </div>
  );
}

function NavButton({ active, icon, onClick, children }: { active: boolean; icon: ReactNode; onClick: () => void; children: ReactNode }) { return <button className={`mm-nav-button ${active ? 'is-active' : ''}`} onClick={onClick}>{icon}{children}</button>; }

function CompanyRow({ company, selected, saved, compared, onSelect, onSave, onCompare }: { company: CompanyRecord; selected: boolean; saved: boolean; compared: boolean; onSelect: () => void; onSave: () => void; onCompare: () => void }) {
  const financial = latest(company);
  return <tr className={selected ? 'is-selected' : ''} onClick={onSelect}><td><div className="mm-company-cell"><span className="mm-company-logo">{company.japaneseName.slice(0, 1)}</span><span><strong>{company.japaneseName}</strong><small>{company.ticker} · {company.scaleTier.replace('_', ' ')}</small></span></div></td><td><span className="mm-model">{company.businessEssence?.monetizationWay || company.businessModel}</span></td><td className="num mm-money">{money(financial.revenueJpy)}<small>{financial.period}</small></td><td className="num mm-metric">{financial.operatingMarginPercent.toFixed(1)}%</td><td className="num"><span className={growth(company) >= 0 ? 'mm-up' : 'mm-down'}>{growth(company) >= 0 ? '+' : ''}{growth(company).toFixed(1)}%</span></td><td><span className={`mm-evidence evidence-${company.verifiedStatus.toLowerCase()}`}>{evidenceLabel(company.verifiedStatus)}</span></td><td><div className="mm-row-actions" onClick={(event) => event.stopPropagation()}><button className={compared ? 'is-on' : ''} onClick={onCompare} aria-label={`${company.japaneseName}を比較${compared ? 'から外す' : ''}`}><BarChart3 size={14} /></button><button className={saved ? 'is-on' : ''} onClick={onSave} aria-label={`${company.japaneseName}を保存${saved ? 'から外す' : ''}`}><Bookmark size={14} fill={saved ? 'currentColor' : 'none'} /></button></div></td></tr>;
}

function DossierPane({ company, saved, compared, onSave, onCompare, onClose }: { company: CompanyRecord | null; saved: boolean; compared: boolean; onSave: () => void; onCompare: () => void; onClose: () => void }) {
  if (!company) return <aside className="mm-dossier mm-dossier-empty"><CircleHelp size={20} /><strong>企業を選択</strong><span>一覧から対象を選ぶと、収益構造と根拠がここに表示されます。</span></aside>;
  const financial = latest(company);
  return <aside className="mm-dossier"><div className="mm-dossier-head"><span className="mm-kicker">DOSSIER / {company.ticker}</span><button onClick={onClose} aria-label="ドシエを閉じる"><X size={16} /></button></div><div className="mm-dossier-title"><div><h1>{company.japaneseName}</h1><p>{company.tagline}</p></div><span className={`mm-evidence evidence-${company.verifiedStatus.toLowerCase()}`}>{evidenceLabel(company.verifiedStatus)}</span></div><div className="mm-dossier-actions"><button onClick={onSave}><Bookmark size={14} fill={saved ? 'currentColor' : 'none'} />{saved ? '保存済み' : '保存'}</button><button onClick={onCompare}><BarChart3 size={14} />{compared ? '比較中' : '比較'}</button><a href={`https://www.google.com/search?q=${encodeURIComponent(company.name)}`} target="_blank" rel="noreferrer"><ExternalLink size={14} />外部確認</a></div><div className="mm-key-metrics"><Metric label="売上高" value={money(financial.revenueJpy)} detail={financial.period} /><Metric label="営業利益率" value={`${financial.operatingMarginPercent.toFixed(1)}%`} detail="報告期間" /><Metric label="初期資本" value={money(company.initialInvestmentJpy)} detail="公開/推計" /><Metric label="チーム" value={`${company.teamSize.toLocaleString()}人`} detail={company.headquarters} /></div><section className="mm-dossier-section"><h2>収益構造</h2><dl className="mm-facts"><div><dt>何を売るか</dt><dd>{company.businessEssence?.whatItDoes}</dd></div><div><dt>誰に売るか</dt><dd>{company.businessEssence?.targetCustomer}</dd></div><div><dt>どう集金するか</dt><dd>{company.businessEssence?.monetizationWay}</dd></div><div><dt>防御力</dt><dd>{company.coreMoatDescription}</dd></div></dl></section><section className="mm-dossier-section"><h2>財務推移 <span>{financial.period}</span></h2><div className="mm-financial-list">{company.financials.slice(-3).map((row) => <div key={row.period}><span>{row.period}</span><b>{money(row.revenueJpy)}</b><span>{row.operatingMarginPercent.toFixed(1)}%</span></div>)}</div></section><details className="mm-details"><summary>出典・算定根拠 <ChevronDown size={14} /></summary><p>この画面の数値は{evidenceLabel(company.verifiedStatus)}区分です。元資料・取得日・算定方法はデータ台帳で確認できる状態にしてから公開します。</p></details></aside>;
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) { return <div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>; }

function FilterPanel({ filters, onChange, onClose, onReset }: { filters: FilterState; onChange: (filters: FilterState) => void; onClose: () => void; onReset: () => void }) {
  const set = (key: keyof FilterState, value: string) => onChange({ ...filters, [key]: value });
  const modelOptions: [string, string][] = Array.from(new Set(TERMINAL_COMPANIES.map((company) => company.businessModel))).map((value) => [value, value] as [string, string]);
  const moatOptions: [string, string][] = Array.from(new Set(TERMINAL_COMPANIES.map((company) => company.primaryMoat))).map((value) => [value, value] as [string, string]);
  return <div className="mm-overlay" role="dialog" aria-modal="true" aria-label="絞り込み"><div className="mm-filter-panel"><div className="mm-panel-head"><div><span className="mm-kicker">FILTERS</span><h2>条件を指定</h2></div><button onClick={onClose} aria-label="絞り込みを閉じる"><X size={18} /></button></div><div className="mm-filter-grid"><FilterSelect label="企業規模" value={filters.scale} onChange={(value) => set('scale', value)} options={[['ALL', 'すべて'], ['SOLO_MICRO', '個人・小規模'], ['NICHE_LEADER', 'ニッチリーダー'], ['SCALE_UP', '成長企業'], ['MEGA_CORP', '大企業']]} /><FilterSelect label="営業利益率" value={filters.margin} onChange={(value) => set('margin', value)} options={[['ALL', 'すべて'], ['30', '30%以上'], ['50', '50%以上'], ['80', '80%以上']]} /><FilterSelect label="初期資本" value={filters.capital} onChange={(value) => set('capital', value)} options={[['ALL', 'すべて'], ['ZERO', '0円'], ['50000', '5万円以下'], ['500000', '50万円以下']]} /><FilterSelect label="出典区分" value={filters.evidence} onChange={(value) => set('evidence', value)} options={[['ALL', 'すべて'], ['AUDITED_PUBLIC', '有報・公的決算'], ['VERIFIED_STRIPE', '決済照合'], ['ESTIMATED_MODEL', '市場推計']]} /><FilterSelect label="収益モデル" value={filters.model} onChange={(value) => set('model', value)} options={ [['ALL', 'すべて'], ...modelOptions]} /><FilterSelect label="競争優位" value={filters.moat} onChange={(value) => set('moat', value)} options={ [['ALL', 'すべて'], ...moatOptions]} /></div><div className="mm-panel-footer"><button className="mm-text-button" onClick={onReset}>すべて解除</button><button className="mm-primary-button" onClick={onClose}><Filter size={14} />結果に反映</button></div></div></div>;
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: [string, string][] }) { return <label className="mm-field"><span>{label}</span><div><select value={value} onChange={(event) => onChange(event.target.value)}>{options.map(([option, text]) => <option key={option} value={option}>{text}</option>)}</select><ChevronDown size={14} /></div></label>; }

function ComparePanel({ companies, onClose, onRemove }: { companies: CompanyRecord[]; onClose: () => void; onRemove: (id: string) => void }) { return <div className="mm-overlay" role="dialog" aria-modal="true" aria-label="比較表"><div className="mm-compare-panel"><div className="mm-panel-head"><div><span className="mm-kicker">COMPARE</span><h2>{companies.length}社の比較</h2></div><button onClick={onClose} aria-label="比較表を閉じる"><X size={18} /></button></div><div className="mm-compare-scroll"><table className="mm-compare-table"><thead><tr><th>項目</th>{companies.map((company) => <th key={company.id}><button onClick={() => onRemove(company.id)} aria-label={`${company.japaneseName}を比較から外す`}><X size={12} /></button>{company.japaneseName}</th>)}</tr></thead><tbody>{[['収益モデル', (company: CompanyRecord) => company.businessModel], ['売上高', (company: CompanyRecord) => money(latest(company).revenueJpy)], ['営業利益率', (company: CompanyRecord) => `${latest(company).operatingMarginPercent.toFixed(1)}%`], ['売上成長率', (company: CompanyRecord) => `${growth(company) >= 0 ? '+' : ''}${growth(company).toFixed(1)}%`], ['初期資本', (company: CompanyRecord) => money(company.initialInvestmentJpy)], ['出典', (company: CompanyRecord) => evidenceLabel(company.verifiedStatus)]].map(([label, getter]) => <tr key={label as string}><th>{label as string}</th>{companies.map((company) => <td key={company.id}>{(getter as (company: CompanyRecord) => string)(company)}</td>)}</tr>)}</tbody></table></div></div></div>; }

function RadarSurface({ onSelectCompany }: { onSelectCompany: (id: string) => void }) { return <section className="mm-surface mm-radar"><div className="mm-surface-title"><div><span className="mm-kicker">RADAR</span><h1>市場の変化</h1></div><span className="mm-muted">{PORTAL_SIGNALS.length}件のシグナル</span></div><div className="mm-signal-list">{PORTAL_SIGNALS.map((signal) => { const related = signal.relatedCompanyIds.map((id) => TERMINAL_COMPANIES.find((company) => company.id === id)).filter((company): company is CompanyRecord => Boolean(company)); return <article key={signal.id} className="mm-signal-row"><div className="mm-signal-index">{signal.id.split('-').pop()?.toUpperCase()}</div><div><span className="mm-evidence evidence-estimated_model">MARKET SIGNAL</span><h2>{signal.title}</h2><p>{signal.catchphrase}</p></div><dl><div><dt>需要</dt><dd>{signal.demandMetric}</dd></div><div><dt>回収</dt><dd>{signal.paybackDays}</dd></div></dl><div className="mm-signal-companies">{related.slice(0, 2).map((company) => <button key={company.id} onClick={() => onSelectCompany(company.id)}>{company.japaneseName}</button>)}</div></article>; })}</div></section>; }

function LibrarySurface({ savedCompanies, savedSearches, onSelectCompany, onRemove }: { savedCompanies: CompanyRecord[]; savedSearches: string[]; onSelectCompany: (id: string) => void; onRemove: (id: string) => void }) { return <section className="mm-surface mm-library"><div className="mm-surface-title"><div><span className="mm-kicker">LIBRARY</span><h1>保存した対象</h1></div></div><div className="mm-library-grid"><section><div className="mm-section-head"><h2><Bookmark size={16} />ウォッチリスト</h2><span>{savedCompanies.length}</span></div>{savedCompanies.length ? <div className="mm-library-list">{savedCompanies.map((company) => <button key={company.id} onClick={() => onSelectCompany(company.id)}><span><strong>{company.japaneseName}</strong><small>{company.ticker} · {evidenceLabel(company.verifiedStatus)}</small></span><span className="mm-library-actions"><span>{money(latest(company).revenueJpy)}</span><i onClick={(event) => { event.stopPropagation(); onRemove(company.id); }}><X size={13} /></i></span></button>)}</div> : <div className="mm-library-empty">一覧から企業を保存すると、ここで再利用できます。</div>}</section><section><div className="mm-section-head"><h2><ListFilter size={16} />保存検索</h2><span>{savedSearches.length}</span></div>{savedSearches.length ? <div className="mm-library-list">{savedSearches.map((search) => <div className="mm-saved-search" key={search}><span>{search}</span><ChevronRight size={15} /></div>)}</div> : <div className="mm-library-empty">探索画面で「検索を保存」を押すと、条件を再利用できます。</div>}</section></div></section>; }

function filterLabel(key: string, value: string) { const labels: Record<string, string> = { scale: value === 'SOLO_MICRO' ? '個人・小規模' : value === 'NICHE_LEADER' ? 'ニッチリーダー' : value === 'SCALE_UP' ? '成長企業' : value === 'MEGA_CORP' ? '大企業' : value, margin: `利益率${value}%以上`, capital: value === 'ZERO' ? '初期0円' : `初期${Number(value) / 10_000}万円以下`, evidence: value === 'AUDITED_PUBLIC' ? '有報' : value === 'VERIFIED_STRIPE' ? '決済照合' : '推計', model: value, moat: value }; return labels[key] ?? value; }
