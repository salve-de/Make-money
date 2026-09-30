import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { ReaderCaseSchema } from '@/shared/reader-case';
import { projectReaderCase, validateReader } from './reader-case-projection';
import { lightReader } from './reader-case-light';
import { UNIT_MAP, unitSpecFor } from '../../../scripts/reader-case/unit-map';
import { parseFinancialLine, parseIhRevenue, readJapaneseAmount } from '../../../scripts/reader-case/metric-lines';
import { classifySentences } from '../../../scripts/reader-case/split-sentences';
import { SourceTable } from '../../../scripts/reader-case/bind-sources';

describe('unit-map', () => {
  it('実データの単位が全部対応表にある', () => {
    const all = JSON.parse(readFileSync('data/entities-index.json', 'utf8')) as Record<string, unknown>[];
    const units = new Set<string>();
    type Row = { unit: string };
    for (const e of all) {
      const rows = ((e.reaudit as { reportedMetrics?: Row[] } | undefined)?.reportedMetrics ?? (e.reportedMetrics as Row[] | undefined) ?? []) as Row[];
      for (const m of rows) units.add(m.unit);
    }
    const missing = [...units].filter((u) => !(u in UNIT_MAP));
    expect(missing).toEqual([]);
  });
  it('対応表に無い単位は例外', () => {
    expect(() => unitSpecFor('NO_SUCH_UNIT_XYZ')).toThrow();
  });
});

describe('metric-lines', () => {
  it('日本語の桁つき数字を読む', () => {
    expect(readJapaneseAmount('12兆4796億2000万')?.amount).toBe(12_479_620_000_000);
    expect(readJapaneseAmount('23,769百万')?.amount).toBe(23_769_000_000);
  });
  it('IH の月収は12で割らず原通貨のまま', () => {
    const m = parseIhRevenue('収益ページは月$23K、2026-05-01に最後に更新');
    expect(m).toMatchObject({ measure: 'REVENUE', periodKind: 'MONTH', amount: 23000, currency: 'USD', statedAt: '2026-05-01' });
    expect(parseIhRevenue('年商$1.2M')).toMatchObject({ periodKind: 'YEAR', amount: 1_200_000 });
  });
  it('SEC 年次の定型文を metric にする', () => {
    const r = parseFinancialLine('FY2025は売上高23,769百万ドル、営業利益1,000百万ドルだった');
    expect(r.metrics.map((m) => [m.measure, m.amount, m.currency, m.period])).toEqual([
      ['REVENUE', 23_769_000_000, 'USD', 'FY2025'],
      ['OPERATING_INCOME', 1_000_000_000, 'USD', 'FY2025'],
    ]);
  });
});

describe('split-sentences', () => {
  it('出典括弧と確認日の接頭を落とし、事実に分ける', () => {
    const s = classifySentences('2026-09-24 確認: 公式サイトは、会計ツールとして紹介している（出典: https://example.com/）。');
    const fact = s.find((x) => x.cls === 'fact');
    expect(fact).toBeTruthy();
    expect(fact!.text).not.toMatch(/https?:|出典:|確認/);
  });
});

describe('bind-sources', () => {
  it('URL から出典を得て、同じ URL は同じ id', () => {
    const t = new SourceTable('https://example.com/');
    const a = t.use('https://example.com/pricing');
    const b = t.use('https://www.example.com/pricing/');
    expect(a?.id).toBe(b?.id);
    expect(a?.kind).toBe('OFFICIAL');
    expect(t.use('not a url')).toBeUndefined();
  });
});

const entity = {
  id: 'ent_test',
  url: 'https://example.com/',
  reaudit: {
    family: 'ebizfacts',
    supported: ['公式サイトは、請求書ツールとして紹介し、月額9ドルからと表示している（出典: https://example.com/pricing）。'],
  },
  observations: [],
};

describe('projectReaderCase', () => {
  it('スキーマを通り、出典の無い事実を作らない', () => {
    const r = projectReaderCase(entity);
    expect(ReaderCaseSchema.safeParse(r.reader).success).toBe(true);
    expect(validateReader(r.reader)).toBeNull();
    for (const f of r.reader.facts) expect(r.reader.sources.some((s) => s.id === f.sourceId)).toBe(true);
  });
  it('自由文の概要を作らない（summaryFactId は DESCRIPTION の事実だけ）', () => {
    const r = projectReaderCase(entity).reader;
    if (r.summaryFactId) expect(r.facts.find((f) => f.id === r.summaryFactId)?.kind).toBe('DESCRIPTION');
  });
  it('一覧用の軽い形も ReaderCaseSchema を通る', () => {
    const light = lightReader(projectReaderCase(entity).reader);
    expect(ReaderCaseSchema.safeParse(light).success).toBe(true);
  });
  it('実データの5件（見本の事例）が通る', () => {
    const all = JSON.parse(readFileSync('data/entities-index.json', 'utf8')) as Record<string, unknown>[];
    for (const id of ['ent_baremetrics_b0966c4871940e459cbb', 'ent_block_J8P4V6RN', 'ent_vetta_f25db159678a']) {
      const e = all.find((x) => x.id === id);
      if (!e) continue;
      const r = projectReaderCase(e).reader;
      expect(validateReader(r)).toBeNull();
      expect(ReaderCaseSchema.safeParse(lightReader(r)).success).toBe(true);
    }
  });
});

import { checkCandidateReaderParts } from '../../../scripts/reaudit/candidate-reader-checks';

describe('候補の facts / metrics の形の検査', () => {
  const okFact = { kind: 'PRICING', text: '月額9ドルからと表示している。', sourceUrl: 'https://example.com/pricing' };
  const okMetric = { measure: 'REVENUE', periodKind: 'MONTH', period: '2026-05', amount: 1000, currency: 'USD', origin: 'SELF_REPORTED', sourceUrl: 'https://example.com/' };
  it('正しい形は通る', () => {
    expect(checkCandidateReaderParts({ facts: [okFact], metrics: [okMetric], researchNotes: ['x'] })).toEqual([]);
  });
  it('出典なしの事実を落とす', () => {
    expect(checkCandidateReaderParts({ facts: [{ ...okFact, sourceUrl: undefined }] }).join()).toMatch(/no source/);
  });
  it('文にURLがある事実を落とす', () => {
    expect(checkCandidateReaderParts({ facts: [{ ...okFact, text: '見る https://a.example/x' }] }).join()).toMatch(/contains a URL/);
  });
  it('列挙外の measure と期間なしの metric を落とす', () => {
    const e = checkCandidateReaderParts({ metrics: [{ ...okMetric, measure: 'MRR', period: '' }] }).join();
    expect(e).toMatch(/measure MRR/);
    expect(e).toMatch(/no period/);
  });
  it('候補の facts/metrics が ReaderCase に入る', () => {
    const r = projectReaderCase({ id: 'ent_c', url: 'https://example.com/', facts: [okFact], metrics: [okMetric] }).reader;
    expect(validateReader(r)).toBeNull();
    expect(r.facts.map((f) => f.text)).toContain(okFact.text);
    expect(r.metrics).toHaveLength(1);
  });
});

describe('13回目の監査で直した変換規則', () => {
  const cls = (t: string) => classifySentences(t).map((x) => x.cls);
  it('出典に無い「チーム・稼働: 本人」を事実にしない（一人と分かる語がある時だけ残す）', () => {
    const r = projectReaderCase({ id: 'ent_t', url: 'https://example.com/', observations: ['チーム・稼働: 本人。'] }).reader;
    expect(r.facts.some((f) => /チーム・稼働/.test(f.text))).toBe(false);
  });
  it('壊れた断片（空の括弧・ドメインだけ）は事実にしない', () => {
    expect(cls('（ / 2026-09-29）')).not.toContain('fact');
    expect(cls('example.com/pricing')).not.toContain('fact');
  });
  it('「〜に言及している」だけの文は事実にしない', () => {
    expect(cls('記事は資金調達に言及している。')).not.toContain('fact');
  });
  it('日付つきの直近30日がある時、日付の無い「月」だけの数字は外す', () => {
    const r = projectReaderCase({
      id: 'ent_m', url: 'https://www.indiehackers.com/product/x',
      reportedMetrics: [
        { label: '直近30日の売上', original: '12,526', amount: 12526.32, unit: 'USD', statedAt: '2026-09-29', period: '2026-09-29 取得時点の直近30日', url: 'https://www.indiehackers.com/product/x/revenue' },
      ],
    }).reader;
    expect(validateReader(r)).toBeNull();
    expect(r.metrics.filter((m) => m.periodKind === 'MONTH' && m.period === '月')).toHaveLength(0);
  });
});

describe('reader-verdicts（出典本文の照合を当てる）', async () => {
  const { applyVerdicts } = await import('./reader-verdicts');
  const { metricLine, quoteInText } = await import('../../../scripts/reader-case/verify-lib');
  type R = import('@/shared/reader-case').ReaderCase;
  const base = (): R => ({
    sources: [
      { id: 's1', publisher: 'A', url: 'https://a.example/', kind: 'ARTICLE' },
      { id: 's2', publisher: 'B', url: 'https://b.example/', kind: 'OFFICIAL' },
    ],
    facts: [
      { id: 'f1', kind: 'DESCRIPTION', text: 'テンプレートを売る事業。', sourceId: 's1', attribution: 'ARTICLE' },
      { id: 'f2', kind: 'CHANNEL', text: '集客は検索が中心。', sourceId: 's1', attribution: 'ARTICLE' },
      { id: 'f3', kind: 'TEAM', text: '従業員は50人。', sourceId: 's2', attribution: 'OFFICIAL' },
    ],
    metrics: [{ id: 'm1', measure: 'PRICE', periodKind: 'MONTH', period: '月', amount: 15000, currency: 'USD', origin: 'ARTICLE', sourceId: 's1' }],
    unknowns: [],
    analysis: [],
    summaryFactId: 'f1',
  });
  const v = (r: R, claimId: string, extra: Record<string, unknown> = {}) => {
    const text = claimId.startsWith('m') ? metricLine(r.metrics.find((m) => m.id === claimId)!) : r.facts.find((f) => f.id === claimId)!.text;
    return { verdict: 'SUPPORTED' as const, quote: 'q'.repeat(40), sourceUrl: 'https://a.example/', checkedAt: '2026-09-30', claimText: text, ...extra };
  };

  it('照合していない事例（判定なし）は null＝公開しない', () => {
    expect(applyVerdicts(base(), undefined)).toBeNull();
    expect(applyVerdicts(base(), {})).toBeNull();
  });
  it('判定が無い主張は落ちる。概要が消えたら残った DESCRIPTION に付け替え、無ければ外す', () => {
    const r = base();
    const out = applyVerdicts(r, { f2: v(r, 'f2'), f3: v(r, 'f3') })!;
    expect(out.reader.facts.map((f) => f.id)).toEqual(['f2', 'f3']);
    expect(out.reader.metrics).toEqual([]);
    expect(out.reader.summaryFactId).toBeUndefined();
    expect(out.dropped.map((d) => d.claimId).sort()).toEqual(['f1', 'm1']);
    expect(out.reader.sources.map((s) => s.id)).toEqual(['s1', 's2']);
    expect(ReaderCaseSchema.safeParse(out.reader).success).toBe(true);
  });
  it('NOT_SUPPORTED と、照合後に文が変わった主張は落ちる', () => {
    const r = base();
    const out = applyVerdicts(r, {
      f1: v(r, 'f1'),
      f2: { ...v(r, 'f2'), verdict: 'NOT_SUPPORTED' as never },
      f3: { ...v(r, 'f3'), claimText: '従業員は10人。' },
    })!;
    expect(out.reader.facts.map((f) => f.id)).toEqual(['f1']);
    expect(out.dropped.map((d) => [d.claimId, d.reason]).sort()).toEqual([['f2', 'no-verdict'], ['f3', 'text-changed'], ['m1', 'no-verdict']]);
  });
  it('PARTIAL は fix の文・値に置き換わる。直せない PARTIAL は落ちる', () => {
    const r = base();
    const out = applyVerdicts(r, {
      f1: v(r, 'f1'),
      f2: { ...v(r, 'f2'), verdict: 'PARTIAL' as const, fix: { text: '集客は検索が中心と本人が説明している。' } },
      f3: { ...v(r, 'f3'), verdict: 'PARTIAL' as const },
      m1: { ...v(r, 'm1'), verdict: 'PARTIAL' as const, fix: { metric: { measure: 'REVENUE', label: null } } },
    })!;
    expect(out.reader.facts.find((f) => f.id === 'f2')!.text).toBe('集客は検索が中心と本人が説明している。');
    expect(out.reader.facts.some((f) => f.id === 'f3')).toBe(false);
    expect(out.reader.metrics[0]).toMatchObject({ measure: 'REVENUE', amount: 15000 });
    expect(out.replaced).toBe(2);
    expect(out.dropped).toEqual([{ claimId: 'f3', text: '従業員は50人。', reason: 'invalid-fix' }]);
    expect(ReaderCaseSchema.safeParse(out.reader).success).toBe(true);
  });
  it('未確認の欄は残った主張から出し直す', () => {
    const r = base();
    const out = applyVerdicts(r, { f1: v(r, 'f1') })!;
    expect(out.reader.unknowns).toContain('CHANNEL');
    expect(out.reader.unknowns).toContain('TEAM');
    expect(out.reader.unknowns).toContain('PRICING');
  });
  it('quote が本文に無ければ不一致。空白・全角半角・大小文字は揃えて比べる', () => {
    const text = 'The  founder said\nMRR reached $15K in ２０２４.';
    expect(quoteInText('the founder said mrr reached $15k in 2024.', text)).toBe(true);
    expect(quoteInText('the founder said MRR reached $50K', text)).toBe(false);
    expect(quoteInText('', text)).toBe(false);
  });
});
