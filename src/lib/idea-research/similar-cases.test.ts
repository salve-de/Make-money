import { describe, expect, it } from 'vitest';
import type { FinancialEntity } from '@/shared/terminal';
import {
  MAX_FAILURE_CASES,
  MAX_NON_FAILURE_CASES,
  classifyOutcome,
  confirmedRevenueLabel,
  findSimilarCases,
  tokenize,
} from './similar-cases';

interface EntityOptions {
  id: string;
  name?: string;
  tagline?: string;
  tags?: string[];
  sector?: FinancialEntity['sector'];
  pnl?: Partial<FinancialEntity['pnl']>;
  opportunityJudgment?: { verdict: string };
}

function entity(options: EntityOptions): FinancialEntity {
  return {
    id: options.id,
    name: options.name ?? `Company ${options.id}`,
    tagline: options.tagline ?? '',
    tags: options.tags ?? [],
    sector: options.sector ?? 'NICHE_SAAS',
    pnl: { monthlyRevenue: 1_500_000, isRevenueUnconfirmed: false, revenueLabel: '¥150万円', ...options.pnl },
    opportunityJudgment: options.opportunityJudgment,
  } as unknown as FinancialEntity;
}

/**
 * 語のめずらしさは「その語が事例の何%に出るか」で決まるので、少数の事例だけでは判定できない。
 * 本物のカタログに近づけるため、互いに重ならない語で作った事例を大量に並べる。
 */
function fillers(count: number): FinancialEntity[] {
  const chars = Array.from({ length: 120 }, (_, i) => String.fromCodePoint(0x4ec8 + i));
  const words = Array.from({ length: 60 }, (_, i) => chars[i * 2] + chars[i * 2 + 1]);
  let seed = 7;
  const next = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed; };
  return Array.from({ length: count }, (_, i) => entity({
    id: `filler_${String(i).padStart(3, '0')}`,
    name: `Filler ${i}`,
    tagline: Array.from({ length: 6 }, () => words[next() % words.length]).join(''),
    tags: ['少数精鋭', '高利益率'],
    pnl: { revenueLabel: undefined },
  }));
}

const FACTORY = entity({ id: 'ent_factory', name: 'Zukan Cloud', tagline: '町工場の紙図面をLINEで受け付けてデータ化する' });
const SALON = entity({ id: 'ent_salon', name: 'Salon Book', tagline: '美容室の予約管理と顧客カルテ' });

function catalog(...targets: FinancialEntity[]): FinancialEntity[] {
  return [...fillers(300), ...targets];
}

describe('tokenize', () => {
  it('splits kanji and katakana runs into character bigrams and ignores hiragana', () => {
    expect([...tokenize('町工場の図面')].sort()).toEqual(['図面', '工場', '町工'].sort());
    expect([...tokenize('サービス')].sort()).toEqual(['ービ', 'サー', 'ビス'].sort());
    expect([...tokenize('ひらがなだけ')]).toEqual([]);
  });

  it('does not join a kanji run and a katakana run across hiragana or spaces', () => {
    expect(tokenize('猫のカフェ').size).toBe(2); // カフ, フェ
    expect(tokenize('猫 カフェ').has('猫カ')).toBe(false);
    expect(tokenize('猫カフェ').has('猫カ')).toBe(true);
  });

  it('keeps ASCII words of two or more characters, in lower case, and drops numbers and single letters', () => {
    expect([...tokenize('Notion x 100 AI-Tool2')].sort()).toEqual(['ai', 'notion', 'tool2']);
  });

  it('folds full-width letters and half-width katakana (NFKC)', () => {
    expect(tokenize('ＬＩＮＥ').has('line')).toBe(true);
    expect(tokenize('ｻｰﾋﾞｽ').has('サー')).toBe(true);
  });

  it('does not count the word アイデア, which only names the input and says nothing about the business', () => {
    expect(tokenize('アイデアです')).toEqual(new Set());
    expect(tokenize('ｱｲﾃﾞｱ')).toEqual(new Set());
    expect([...tokenize('町工場のアイデア')].sort()).toEqual(['工場', '町工'].sort());
  });
});

describe('classifyOutcome', () => {
  it.each([
    ['a post-mortem financial status', { pnl: { financialStatus: 'POST_MORTEM' as const } }],
    ['a hazard verdict', { opportunityJudgment: { verdict: 'HAZARD_REJECT' } }],
    ['a tag that says 失敗', { tags: ['高利益率', '失敗事例'] }],
    ['a tag that says 撤退', { tags: ['市場から撤退'] }],
    ['a tag that says 破綻', { tags: ['経営破綻'] }],
    ['a tag that says 倒産', { tags: ['倒産'] }],
  ])('is failure for %s, even when revenue is confirmed', (_label, options) => {
    expect(classifyOutcome(entity({ id: 'x', ...options }))).toBe('failure');
  });

  it('is success only when revenue is confirmed and positive', () => {
    expect(classifyOutcome(entity({ id: 'x' }))).toBe('success');
    expect(classifyOutcome(entity({ id: 'x', pnl: { isRevenueUnconfirmed: true } }))).toBe('unknown');
    expect(classifyOutcome(entity({ id: 'x', pnl: { monthlyRevenue: 0 } }))).toBe('unknown');
    expect(classifyOutcome(entity({ id: 'x', pnl: { monthlyRevenue: Number.NaN } }))).toBe('unknown');
  });

  it('is unknown, not failure, for other verdicts and statuses', () => {
    expect(classifyOutcome(entity({ id: 'x', pnl: { isRevenueUnconfirmed: true, financialStatus: 'ESTIMATED' }, opportunityJudgment: { verdict: 'HOLD' } }))).toBe('unknown');
  });
});

describe('confirmedRevenueLabel', () => {
  it('returns the ledger label only for confirmed revenue', () => {
    expect(confirmedRevenueLabel(entity({ id: 'x' }))).toBe('¥150万円');
    expect(confirmedRevenueLabel(entity({ id: 'x', pnl: { revenueLabel: '  ¥90万円 ' } }))).toBe('¥90万円');
  });

  it('never exposes a label or a number when revenue is unconfirmed', () => {
    expect(confirmedRevenueLabel(entity({ id: 'x', pnl: { isRevenueUnconfirmed: true, revenueLabel: '売上非公開' } }))).toBeNull();
    expect(confirmedRevenueLabel(entity({ id: 'x', pnl: { monthlyRevenue: 0, revenueLabel: '¥0円' } }))).toBeNull();
  });

  it('does not invent a label from the amount when the ledger has none', () => {
    expect(confirmedRevenueLabel(entity({ id: 'x', pnl: { revenueLabel: undefined } }))).toBeNull();
    expect(confirmedRevenueLabel(entity({ id: 'x', pnl: { revenueLabel: '   ' } }))).toBeNull();
  });
});

describe('findSimilarCases', () => {
  it('returns the case that shares rare words, and leaves out unrelated cases', () => {
    const cases = findSimilarCases(catalog(FACTORY, SALON), '町工場の図面をLINEで受け付けるサービスを作りたい');
    expect(cases.map((item) => item.id)).toEqual(['ent_factory']);
    expect(cases[0]).toMatchObject({
      name: 'Zukan Cloud',
      tagline: '町工場の紙図面をLINEで受け付けてデータ化する',
      sector: 'NICHE_SAAS',
      outcome: 'success',
      monthlyRevenueLabel: '¥150万円',
    });
    expect(cases[0].score).toBeGreaterThan(0);
    expect(cases[0].score).toBeLessThanOrEqual(100);
  });

  it('returns exactly the documented fields', () => {
    const [item] = findSimilarCases(catalog(FACTORY), '町工場の紙図面をLINEで受け付ける');
    expect(Object.keys(item).sort()).toEqual(['id', 'monthlyRevenueLabel', 'name', 'outcome', 'score', 'sector', 'tagline']);
  });

  it('is deterministic: the same catalog and input give the same list in the same order', () => {
    const entities = catalog(FACTORY, SALON, entity({ id: 'ent_other', tagline: '町工場の図面管理' }));
    const idea = '町工場の図面をLINEで受け付けるサービス';
    expect(findSimilarCases(entities, idea)).toEqual(findSimilarCases(entities, idea));
    expect(findSimilarCases([...entities], idea)).toEqual(findSimilarCases(entities, idea));
  });

  it('orders by similarity, and breaks ties by id in ascending order regardless of catalog order', () => {
    const twin = { tagline: '町工場の紙図面をLINEで受け付けてデータ化する' };
    const weaker = entity({ id: 'ent_weaker', tagline: '町工場の図面' });
    const ordered = catalog(entity({ id: 'ent_b', ...twin }), entity({ id: 'ent_a', ...twin }), weaker);
    const reversed = [...ordered].reverse();
    const idea = '町工場の紙図面をLINEで受け付けてデータ化する';
    expect(findSimilarCases(ordered, idea).map((item) => item.id)).toEqual(['ent_a', 'ent_b', 'ent_weaker']);
    expect(findSimilarCases(reversed, idea).map((item) => item.id)).toEqual(['ent_a', 'ent_b', 'ent_weaker']);
  });

  it('matches English words (case-insensitive) and full-width letters', () => {
    const store = entity({ id: 'ent_notion', name: 'Notion Template Store', tagline: '' });
    expect(findSimilarCases(catalog(store), 'notion template を売る').map((item) => item.id)).toEqual(['ent_notion']);
    expect(findSimilarCases(catalog(FACTORY), 'ＬＩＮＥで町工場の図面を受ける').map((item) => item.id)).toEqual(['ent_factory']);
  });

  it('matches the Japanese name of a sector', () => {
    const maker = entity({ id: 'ent_mfg', name: 'Acme', tagline: '', sector: 'MONOPOLY_MFG' });
    expect(findSimilarCases(catalog(maker), '製造メーカー向けの新サービス').map((item) => item.id)).toEqual(['ent_mfg']);
  });

  it('returns nothing when the input has no comparable words', () => {
    const entities = catalog(FACTORY);
    expect(findSimilarCases(entities, 'ひらがなだけの入力です')).toEqual([]);
    expect(findSimilarCases(entities, '12345 6789')).toEqual([]);
    expect(findSimilarCases(entities, '全く無関係の宇宙旅行')).toEqual([]);
    expect(findSimilarCases([], '町工場の図面')).toEqual([]);
  });

  it('does not match cases only because both mention アイデア', () => {
    const talky = entity({ id: 'ent_talky', tagline: '起業のアイデアを検証する' });
    expect(findSimilarCases(catalog(talky, FACTORY), '新しいアイデアです、アイデア')).toEqual([]);
    expect(findSimilarCases(catalog(talky, FACTORY), 'アイデアとして町工場の紙図面をLINEで受け付ける').map((item) => item.id)).toEqual(['ent_factory']);
  });

  it('ignores words that appear in almost every case', () => {
    expect(findSimilarCases(catalog(FACTORY), '少数精鋭で高利益率を目指す')).toEqual([]);
  });

  it('leaves out cases whose overlap is much weaker than the best match', () => {
    const strong = entity({ id: 'ent_strong', tagline: '町工場の紙図面をLINEで受け付ける' });
    const partial = entity({ id: 'ent_partial', tagline: '町工場向けの通販' });
    const single = entity({ id: 'ent_single', tagline: 'LINEの配信' });
    const cases = findSimilarCases(catalog(strong, partial, single), '町工場の紙図面をLINEで受け付けるサービス');
    expect(cases[0].id).toBe('ent_strong');
    expect(cases.map((item) => item.id)).not.toContain('ent_single');
  });

  it('shows failure cases and success cases together, with revenue only where it is confirmed', () => {
    const failed = entity({
      id: 'ent_failed',
      tagline: '町工場の紙図面をLINEで受け付ける前に資金が尽きた',
      pnl: { financialStatus: 'POST_MORTEM', revenueLabel: '月商¥500万円（月間赤字¥5,000万円）' },
    });
    const unconfirmed = entity({
      id: 'ent_unconfirmed',
      tagline: '町工場の紙図面をLINEで受け付ける',
      pnl: { isRevenueUnconfirmed: true, monthlyRevenue: 0, revenueLabel: '売上非公開' },
    });
    const cases = findSimilarCases(catalog(FACTORY, failed, unconfirmed), '町工場の紙図面をLINEで受け付ける');
    const byId = new Map(cases.map((item) => [item.id, item]));
    expect(byId.get('ent_failed')).toMatchObject({ outcome: 'failure', monthlyRevenueLabel: '月商¥500万円（月間赤字¥5,000万円）' });
    expect(byId.get('ent_unconfirmed')).toMatchObject({ outcome: 'unknown', monthlyRevenueLabel: null });
    expect(byId.get('ent_factory')).toMatchObject({ outcome: 'success', monthlyRevenueLabel: '¥150万円' });
  });

  it('returns at most 8 success or unknown cases and at most 4 failure cases', () => {
    const tagline = '町工場の紙図面をLINEで受け付けてデータ化する';
    const successes = Array.from({ length: 20 }, (_, i) => entity({ id: `ent_ok_${String(i).padStart(2, '0')}`, tagline }));
    const unknowns = Array.from({ length: 3 }, (_, i) => entity({ id: `ent_unk_${i}`, tagline, pnl: { isRevenueUnconfirmed: true } }));
    const failures = Array.from({ length: 10 }, (_, i) => entity({ id: `ent_fail_${String(i).padStart(2, '0')}`, tagline, tags: ['失敗'] }));
    const cases = findSimilarCases(catalog(...successes, ...unknowns, ...failures), tagline);
    const failureCount = cases.filter((item) => item.outcome === 'failure').length;
    expect(failureCount).toBe(MAX_FAILURE_CASES);
    expect(cases.length - failureCount).toBe(MAX_NON_FAILURE_CASES);
    expect(cases).toHaveLength(12);
    // 同点なので、成功・不明は id の昇順で上位から、失敗も id の昇順で上位から残る
    expect(cases.filter((item) => item.outcome !== 'failure').map((item) => item.id))
      .toEqual(['ent_ok_00', 'ent_ok_01', 'ent_ok_02', 'ent_ok_03', 'ent_ok_04', 'ent_ok_05', 'ent_ok_06', 'ent_ok_07']);
    expect(cases.filter((item) => item.outcome === 'failure').map((item) => item.id))
      .toEqual(['ent_fail_00', 'ent_fail_01', 'ent_fail_02', 'ent_fail_03']);
  });

  it('keeps a failure case even when better-matching success cases fill the success slots', () => {
    const tagline = '町工場の紙図面をLINEで受け付けてデータ化する';
    const successes = Array.from({ length: 12 }, (_, i) => entity({ id: `ent_ok_${String(i).padStart(2, '0')}`, tagline }));
    const failure = entity({ id: 'ent_fail', tagline: '町工場の紙図面をLINEで受け付ける', tags: ['撤退'] });
    const cases = findSimilarCases(catalog(...successes, failure), tagline);
    expect(cases.some((item) => item.id === 'ent_fail' && item.outcome === 'failure')).toBe(true);
  });

  it('does not mutate the catalog and reuses one index per catalog array', () => {
    const entities = catalog(FACTORY);
    const before = JSON.stringify(entities);
    const first = findSimilarCases(entities, '町工場の紙図面をLINEで受け付ける');
    expect(JSON.stringify(entities)).toBe(before);
    // 同じ配列でも、内容を差し替えた新しい配列でも、それぞれ正しい結果になる
    expect(findSimilarCases(entities, '町工場の紙図面をLINEで受け付ける')).toEqual(first);
    const replaced = [...entities.slice(0, -1), entity({ id: 'ent_new', tagline: '町工場の紙図面をLINEで受け付ける' })];
    expect(findSimilarCases(replaced, '町工場の紙図面をLINEで受け付ける').map((item) => item.id)).toEqual(['ent_new']);
  });

  it('tolerates entities with missing optional fields', () => {
    const sparse = { id: 'ent_sparse', name: '町工場図面', tagline: '町工場の図面', sector: 'UNKNOWN', pnl: {} } as unknown as FinancialEntity;
    const cases = findSimilarCases(catalog(sparse), '町工場の図面');
    expect(cases).toEqual([expect.objectContaining({ id: 'ent_sparse', outcome: 'unknown', monthlyRevenueLabel: null })]);
  });
});
