import Link from 'next/link';
import {
  FEW_CASES,
  MIN_BASE_FOR_PATTERNS,
  PRICE_TYPE_LABELS,
  REVENUE_BASIS_LABELS,
  type ComboRow,
  type CountRow,
  type PatternFilter,
  type PatternReport,
  type PriceType,
  type RevenueBasis,
} from '@/lib/company-access/case-patterns';

const BASE = '/trends';

export function filterHref(filter: PatternFilter): string {
  const q = new URLSearchParams();
  if (filter.sector) q.set('sector', filter.sector);
  if (filter.priceType) q.set('price', filter.priceType);
  if (filter.revenueBasis) q.set('basis', filter.revenueBasis);
  const s = q.toString();
  return s ? `${BASE}?${s}` : BASE;
}

function Estimate() {
  return <span className="ml-1.5 text-xs text-term-accent">推測</span>;
}

function Evidence({ rows, withQuote }: { rows: CountRow['evidence']; withQuote?: boolean }) {
  return (
    <ul className="max-h-64 overflow-y-auto border-t border-term-line-soft bg-term-row-alt">
      {rows.map((e) => (
        <li key={e.id} className="border-b border-term-line-soft px-3 py-1.5 text-[13px]">
          <Link href={`/?entity=${encodeURIComponent(e.id)}`} className="inline-flex min-h-11 items-center text-term-fg-strong hover:underline lg:min-h-6">{e.name}</Link>
          {withQuote && e.quote ? <p className="pb-1 text-xs text-term-sub">{e.quote}</p> : null}
        </li>
      ))}
    </ul>
  );
}

function Bar({ value, ghost, max }: { value: number; ghost?: number; max: number }) {
  const w = (n: number) => (max > 0 ? Math.max(n > 0 ? 1 : 0, (n / max) * 100) : 0);
  return (
    <svg viewBox="0 0 100 10" preserveAspectRatio="none" className="h-2.5 w-full" role="img" aria-label={`${value}件`}>
      <rect x="0" y="0" width="100" height="10" fill="var(--term-line-soft)" />
      {ghost !== undefined ? <rect x="0" y="0" width={w(ghost)} height="10" fill="var(--term-label)" opacity="0.5" /> : null}
      <rect x="0" y="3" width={w(value)} height="4" fill="var(--term-fg)" />
    </svg>
  );
}

function BarRows({ rows, base, withQuote, compareAll, estimated, minCount = 0 }: {
  rows: CountRow[]; base: number; withQuote?: boolean; compareAll?: CountRow[]; estimated?: boolean; minCount?: number;
}) {
  const max = Math.max(1, ...rows.map((r) => r.count), ...(compareAll ?? []).map((a) => a.count));
  return (
    <div>
      {rows.filter((r) => r.count >= minCount).map((r) => {
        const all = compareAll?.find((a) => a.key === r.key);
        const few = r.count > 0 && r.count < FEW_CASES;
        return (
          <details key={r.key} className="border-b border-term-line-soft">
            <summary className="grid min-h-11 cursor-pointer list-none grid-cols-[minmax(0,1fr)_88px] items-center gap-x-3 gap-y-1 px-3 py-1.5 text-[13px] hover:bg-term-head lg:min-h-8 lg:grid-cols-[260px_minmax(0,1fr)_150px]">
              <span className="col-span-2 text-term-fg lg:col-span-1">{r.label}{estimated ? <Estimate /> : null}</span>
              <span className="min-w-0"><Bar value={r.count} ghost={all?.count} max={max} /></span>
              <span className="term-num text-right text-xs text-term-sub">
                {r.count}件／{base}件{few ? <span className="ml-1 text-term-accent">少数</span> : null}
                {all && base !== all.base ? <span className="block text-term-label">全体 {all.count}件／{all.base}件</span> : null}
              </span>
            </summary>
            {r.evidence.length > 0 ? <Evidence rows={r.evidence} withQuote={withQuote} /> : <p className="px-3 pb-2 text-xs text-term-label">該当 0件</p>}
          </details>
        );
      })}
    </div>
  );
}

function Panel({ id, title, note, children }: { id: string; title: string; note?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="border-b border-term-line">
      <div className="term-panel-title"><h2 id={`${id}-h`} className="term-panel-name">{title}</h2></div>
      {note ? <p className="px-3 py-2 text-xs text-term-sub">{note}</p> : null}
      {children}
    </section>
  );
}

function Chips({ label, items, current, make }: { label: string; items: Array<{ key: string; label: string }>; current?: string; make: (key?: string) => string }) {
  return (
    <div className="flex flex-wrap items-center gap-1 px-3 py-1">
      <span className="w-20 shrink-0 text-xs text-term-label">{label}</span>
      <Link href={make(undefined)} className={`inline-flex min-h-11 items-center border border-term-line px-2 text-xs lg:min-h-6 ${!current ? 'bg-term-select text-term-select-fg' : 'text-term-fg hover:bg-term-head'}`}>すべて</Link>
      {items.map((i) => (
        <Link key={i.key} href={make(i.key)} aria-current={current === i.key ? 'true' : undefined}
          className={`inline-flex min-h-11 items-center border border-term-line px-2 text-xs lg:min-h-6 ${current === i.key ? 'bg-term-select text-term-select-fg' : 'text-term-fg hover:bg-term-head'}`}>{i.label}</Link>
      ))}
    </div>
  );
}

function Combos({ rows, kind }: { rows: ComboRow[]; kind: '多い' | '少ない' }) {
  if (rows.length === 0) return <p className="px-3 py-2 text-xs text-term-label">{kind === '多い' ? '見込みを大きく上回る組合せはありません。' : '見込みを大きく下回る組合せはありません。'}</p>;
  return (
    <div>
      {rows.map((r) => (
        <details key={`${r.a.key}|${r.b.key}`} className="border-b border-term-line-soft">
          <summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center justify-between gap-x-3 px-3 py-1.5 text-[13px] hover:bg-term-head lg:min-h-8">
            <span className="text-term-fg">{r.a.label} × {r.b.label}</span>
            <span className="term-num text-xs text-term-sub">同時 {r.count}件／見込み {r.expected}件</span>
          </summary>
          {r.evidence.length > 0 ? <Evidence rows={r.evidence} /> : <p className="px-3 pb-2 text-xs text-term-label">該当 0件</p>}
        </details>
      ))}
    </div>
  );
}

export function PatternsView({ report }: { report: PatternReport }) {
  const f = report.filter;
  const filtered = Boolean(f.sector || f.priceType || f.revenueBasis);
  const small = report.base < MIN_BASE_FOR_PATTERNS;
  const sectorItems = report.matrix.sectors.map((s) => ({ key: s.key, label: s.label }));
  return (
    <div className="text-term-fg">
      <div className="term-panel-title"><h1 className="term-panel-name">傾向</h1>
        <span className="text-xs text-term-label">公開 {report.total}件の事例から。各行を開くと根拠の事例に戻れます</span></div>

      <div className="border-b border-term-line py-1">
        <Chips label="分野" items={sectorItems} current={f.sector} make={(k) => filterHref({ ...f, sector: k })} />
        <Chips label="料金の型" items={(Object.keys(PRICE_TYPE_LABELS) as PriceType[]).map((k) => ({ key: k, label: PRICE_TYPE_LABELS[k] }))} current={f.priceType} make={(k) => filterHref({ ...f, priceType: k as PriceType | undefined })} />
        <Chips label="売上の根拠" items={(Object.keys(REVENUE_BASIS_LABELS) as RevenueBasis[]).map((k) => ({ key: k, label: REVENUE_BASIS_LABELS[k] }))} current={f.revenueBasis} make={(k) => filterHref({ ...f, revenueBasis: k as RevenueBasis | undefined })} />
        <p className="term-num px-3 py-1 text-xs text-term-sub" aria-live="polite">
          対象 {report.base}件／{report.total}件{filtered ? '（絞り込み中）' : ''}
          {small ? ` ・ 該当${report.base}件のため、割合と組合せは出しません` : ''}
        </p>
      </div>

      <Panel id="wins" title="共通する勝ち方" note={<>事例の推論文から拾った集計です<Estimate />。事実ではなく、売上が伸びた証拠でもありません。灰色の線は全体の件数（同じ縮尺）。</>}>
        {small ? <p className="px-3 py-2 text-xs text-term-label">該当{report.base}件。件数だけを示します。</p> : null}
        <BarRows rows={report.wins} base={report.base} withQuote compareAll={filtered ? report.winsAll : undefined} estimated />
      </Panel>

      <Panel id="compare" title="条件付き比較" note="分野ごとの料金の型の件数です。数字を押すと、その条件で上の集計が変わります。料金の型は料金の事実の文から拾っています（複数の型を持つ事例は重ねて数えます）。">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-[13px]">
            <thead><tr className="h-[26px] border-b border-term-line bg-term-head text-xs text-term-label">
              <th scope="col" className="px-3 text-left font-normal">分野</th>
              {(Object.keys(PRICE_TYPE_LABELS) as PriceType[]).map((k) => <th key={k} scope="col" className="px-2 text-right font-normal">{PRICE_TYPE_LABELS[k]}</th>)}
            </tr></thead>
            <tbody>
              {report.matrix.sectors.map((s, i) => (
                <tr key={s.key} className={`border-b border-term-line-soft ${i % 2 ? 'bg-term-row-alt' : ''}`}>
                  <th scope="row" className="px-3 text-left font-normal"><Link href={filterHref({ ...f, sector: s.key })} className="inline-flex min-h-11 items-center hover:underline lg:min-h-6">{s.label}</Link></th>
                  {(Object.keys(PRICE_TYPE_LABELS) as PriceType[]).map((k) => {
                    const n = report.matrix.cells[s.key][k];
                    return <td key={k} className="term-num px-2 text-right">{n > 0 ? <Link href={filterHref({ ...f, sector: s.key, priceType: k })} className="inline-flex min-h-11 min-w-11 items-center justify-end hover:underline lg:min-h-6 lg:min-w-6">{n}</Link> : '0'}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel id="combos" title="意外な組合せ" note={<>二つの特徴が一緒に出る件数を、それぞれの出やすさから見込まれる件数と比べています<Estimate />。同じ種類どうし（集客どうしなど）は比べません。各特徴は {FEW_CASES}件以上のものだけです。</>}>
        {small ? <p className="px-3 py-2 text-xs text-term-label">該当{report.base}件のため出しません。</p> : (
          <>
            <h3 className="px-3 pt-2 text-xs text-term-label">見込みより多く重なる</h3>
            <Combos rows={report.combos.more} kind="多い" />
            <h3 className="px-3 pt-2 text-xs text-term-label">見込みより少ない</h3>
            <Combos rows={report.combos.less} kind="少ない" />
          </>
        )}
      </Panel>

      <Panel id="triggers" title="何が起きると有料になるか" note={<>料金の事実の文だけから、決まった語で拾っています。母数は料金の事実がある事例（{report.triggers.base}件）。これは料金の仕組みの記述で、売上が増えた証拠ではありません。{FEW_CASES}件未満は「少数」と示します。</>}>
        <BarRows rows={report.triggers.rows} base={report.triggers.base} withQuote />
      </Panel>

      <Panel id="recent" title="最近の変化">
        <p className="px-3 py-2 text-[13px] text-term-sub">{report.recent.reason}</p>
      </Panel>
    </div>
  );
}
