import { describe, expect, it } from 'vitest';
import {
  buildPatternReport, findCombos, parsePatternFilter, toPatternCase, MIN_BASE_FOR_PATTERNS,
  type PatternCase, type PatternSourceCase,
} from './case-patterns';

const LABELS = { A: '分野A', B: '分野B', UNKNOWN: '分類なし' };

function src(i: number, over: Partial<PatternSourceCase> & { pricing?: string[]; channel?: string; extra?: Array<{ item: string; text: string }> } = {}): PatternSourceCase {
  return {
    id: `ent_${i}`, name: `事例${i}`, sector: over.sector ?? (i % 2 ? 'A' : 'B'), tags: [],
    reader: {
      facts: (over.pricing ?? []).map((text) => ({ kind: 'PRICING', text })),
      analysis: [
        ...(over.channel ? [{ item: 'CHANNELS', text: over.channel }] : []),
        ...(over.extra ?? []),
      ],
      metrics: [],
    },
  };
}

describe('toPatternCase: 料金の事実の語の拾い方', () => {
  it('上限・回数・台数・試用・返金・商用・前払いを拾う', () => {
    const c = toPatternCase(src(1, { pricing: [
      '無料プランは購読者2,500人まで。', '50クレジットの無料トライアル（カード登録不要）。', '1ユーザー月額$1。',
      '30日間の返金保証あり。', '商用利用は有料。', '年払いのみ。',
    ] }));
    expect(Object.keys(c.triggers).sort()).toEqual(['CAP', 'COMMERCIAL', 'PREPAID', 'REFUND', 'SEATS', 'TRIAL', 'USAGE']);
  });
  it('返品審査のような別の意味の語は返金にしない', () => {
    const c = toPatternCase(src(1, { pricing: ['リンクの追跡期間30日、返品審査待ち30日、最低支払50ユーロ。'] }));
    expect(c.triggers.REFUND).toBeUndefined();
  });
  it('料金の事実以外の文からは引き金を拾わない', () => {
    const c = toPatternCase({ id: 'x', name: 'x', reader: { facts: [{ kind: 'DESCRIPTION', text: '無料トライアルと返金保証がある。' }] } });
    expect(c.hasPricingFact).toBe(false);
    expect(c.triggers).toEqual({});
    expect(c.priceTypes).toEqual([]);
  });
  it('勝ち方は推論文から。弱い縛りと強い縛りを分ける', () => {
    const weak = toPatternCase(src(1, { extra: [{ item: 'LOCK_IN', text: '外部へ書き出せるため拘束は弱い。' }] }));
    const strong = toPatternCase(src(2, { extra: [{ item: 'LOCK_IN', text: '過去の作業記録が溜まり移行は面倒になる。' }] }));
    expect(weak.wins.LOCK_WEAK).toBeTruthy();
    expect(weak.wins.LOCK_STRONG).toBeUndefined();
    expect(strong.wins.LOCK_STRONG).toBeTruthy();
  });
});

function corpus(): PatternCase[] {
  const sources: PatternSourceCase[] = [];
  for (let i = 0; i < 60; i++) {
    sources.push(src(i, {
      pricing: i % 3 === 0 ? ['月額$10。', '無料トライアルあり。'] : i % 3 === 1 ? ['年払いのみ、5席まで。'] : [],
      channel: i % 2 === 0 ? '検索と口コミを軸にする形と推す。' : 'SNSの投稿を軸にする形と推す。',
      extra: i % 4 === 0 ? [{ item: 'UPFRONT_CASH', text: '前払いで先に受ける。' }] : [],
    }));
  }
  return sources.map(toPatternCase);
}

describe('buildPatternReport: 画面の数字と根拠の事例の件数が一致する', () => {
  const all = corpus();
  const check = (filter = {}) => {
    const r = buildPatternReport(all, filter, LABELS);
    const groups = [r.wins, r.winsAll, r.priceTypes, r.revenueBasis, r.sectors, r.triggers.rows];
    for (const rows of groups) for (const row of rows) {
      expect(row.evidence.length).toBe(row.count);
      expect(new Set(row.evidence.map((e) => e.id)).size).toBe(row.count);
    }
    for (const row of [...r.combos.more, ...r.combos.less]) expect(row.evidence.length).toBe(row.count);
    for (const row of r.wins) expect(row.base).toBe(r.base);
    for (const row of r.triggers.rows) expect(row.base).toBe(r.triggers.base);
    return r;
  };
  it('絞り込みなし', () => {
    const r = check();
    expect(r.base).toBe(60);
    expect(r.triggers.base).toBe(40);
    expect(r.wins.find((w) => w.key === 'UPFRONT')?.count).toBe(15);
  });
  it('分野・料金の型で絞ると母数も根拠も変わり、なお一致する', () => {
    const r = check({ sector: 'A', priceType: 'MONTHLY' });
    expect(r.base).toBe(all.filter((c) => c.sector === 'A' && c.priceTypes.includes('MONTHLY')).length);
    expect(r.winsAll[0].base).toBe(60);
  });
  it('分野×料金の型の表の数字が根拠の件数と一致する', () => {
    const r = check();
    for (const s of r.matrix.sectors) {
      for (const [key, n] of Object.entries(r.matrix.cells[s.key])) {
        expect(n).toBe(all.filter((c) => c.sector === s.key && c.priceTypes.includes(key as never)).length);
      }
    }
  });
  it('日付つきの事実が無い間は最近の変化を出さない', () => {
    const r = check();
    expect(r.recent.shown).toBe(false);
    expect(r.recent.datedCases).toBe(0);
    expect(r.recent.reason).toContain('日付つきの根拠が集まるまで');
  });
  it('母数が少ない時は組合せを出さない', () => {
    expect(all.length).toBeGreaterThanOrEqual(MIN_BASE_FOR_PATTERNS);
    expect(findCombos(all.slice(0, 10), LABELS)).toEqual({ more: [], less: [] });
  });
  it('同じ種類どうしは組合せにしない', () => {
    const { more, less } = findCombos(all, LABELS);
    for (const row of [...more, ...less]) expect(row.a.dim).not.toBe(row.b.dim);
  });
});

describe('parsePatternFilter', () => {
  it('知らない値は無視し、知っている値だけ読む', () => {
    expect(parsePatternFilter({ sector: 'A', price: 'MONTHLY', basis: 'NONE' }, LABELS)).toEqual({ sector: 'A', priceType: 'MONTHLY', revenueBasis: 'NONE' });
    expect(parsePatternFilter({ sector: 'ZZ', price: 'x', basis: ['FILED', 'NONE'] }, LABELS)).toEqual({ revenueBasis: 'FILED' });
  });
});
