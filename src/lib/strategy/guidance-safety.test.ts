import { describe, expect, it } from 'vitest';
import type { SynthesizedIdea } from '@/shared/terminal';
import { containsProhibitedGuidance, sanitizeGeneratedText, sanitizeSynthesizedIdeas } from './guidance-safety';

const REPLACEMENT = '公開事例に規約・法令違反につながる記述が含まれるため、許可を得た正規の手段へ置き換えて検証します。';

describe('containsProhibitedGuidance', () => {
  it.each([
    '自演アカウントで拡散する',
    'なりすましで口コミを作る',
    '別人を装って投稿する',
    'DM爆撃で集める',
    '迷惑DMを送る',
    'スパム送信で告知する',
    '不正なスクレイピングで名簿を集める',
    '不正スクレイピング',
    '無断取得した連絡先',
    '無断転載で記事を増やす',
    '規約の隙間を突く',
    '規約の抜け道を探す',
    '規約回避の手順',
    'terms of service bypass tricks',
    '直取引を封鎖する',
    '直取引を妨害する',
    'use a sockpuppet',
    'create a fake account',
    'send spam dm',
    'unauthorized scraping',
  ])('flags %s', (text) => {
    expect(containsProhibitedGuidance(text)).toBe(true);
  });

  it('sees through spaces and full-width spaces inserted to dodge the patterns', () => {
    expect(containsProhibitedGuidance('自 演 アカウント')).toBe(true);
    expect(containsProhibitedGuidance('迷惑　D M')).toBe(true);
  });

  it('looks inside arrays and objects', () => {
    expect(containsProhibitedGuidance(['問題なし', { note: { deep: '自演で増やす' } }])).toBe(true);
    expect(containsProhibitedGuidance({ a: ['正規の窓口から紹介を依頼する'] })).toBe(false);
  });

  it.each([
    '地域の商工会に、同意を得たうえで紹介を依頼する',
    '料金と解約条件を書いた案内を出す',
    '公開情報だけを出典付きで比較する',
    '',
    42,
    null,
    undefined,
  ])('does not flag %s', (value) => {
    expect(containsProhibitedGuidance(value)).toBe(false);
  });
});

describe('sanitizeGeneratedText', () => {
  it('keeps safe text and replaces flagged text with the standard sentence', () => {
    expect(sanitizeGeneratedText('同意を得て紹介を依頼する')).toBe('同意を得て紹介を依頼する');
    expect(sanitizeGeneratedText('自演で拡散する')).toBe(REPLACEMENT);
  });
});

describe('sanitizeSynthesizedIdeas', () => {
  const idea: SynthesizedIdea = {
    id: 'idea_1',
    dimension: 'SAVANNA_INSTINCT',
    dimensionLabel: 'ラベル',
    title: '企画',
    targetPainWallet: '痛み',
    structuralArbitrage: '歪み',
    projectedMonthlyProfitJpy: 100,
    operatingMargin: 10,
    requiredTools: [{ name: 'ツール', monthlyCostJpy: 5, purpose: '用途' }],
    first100TractionPlaybook: ['手順1', '手順2'],
    sourceEntityIds: ['ent_a'],
    userNoteInspiration: 'メモ',
  };

  it('replaces every text field that teaches a prohibited tactic and leaves the rest untouched', () => {
    const [clean] = sanitizeSynthesizedIdeas([idea]);
    expect(clean).toEqual(idea);

    const [dirty] = sanitizeSynthesizedIdeas([{
      ...idea,
      dimensionLabel: '自演型',
      title: '迷惑DM案',
      targetPainWallet: '無断取得した名簿',
      structuralArbitrage: '規約の抜け道',
      requiredTools: [{ name: '自演ツール', monthlyCostJpy: 5, purpose: '不正スクレイピング' }],
      first100TractionPlaybook: ['なりすまし投稿', '正規の窓口へ相談'],
      userNoteInspiration: '自演でやりたい',
    }]);
    expect(dirty.dimensionLabel).toBe(REPLACEMENT);
    expect(dirty.title).toBe(REPLACEMENT);
    expect(dirty.targetPainWallet).toBe(REPLACEMENT);
    expect(dirty.structuralArbitrage).toBe(REPLACEMENT);
    expect(dirty.requiredTools).toEqual([{ name: REPLACEMENT, monthlyCostJpy: 5, purpose: REPLACEMENT }]);
    expect(dirty.first100TractionPlaybook).toEqual([REPLACEMENT, '正規の窓口へ相談']);
    expect(dirty.userNoteInspiration).toBe(REPLACEMENT);
    expect([dirty.id, dirty.dimension, dirty.projectedMonthlyProfitJpy, dirty.operatingMargin, dirty.sourceEntityIds])
      .toEqual(['idea_1', 'SAVANNA_INSTINCT', 100, 10, ['ent_a']]);
  });

  it('does not change the input', () => {
    const input = { ...idea, first100TractionPlaybook: ['自演'] };
    sanitizeSynthesizedIdeas([input]);
    expect(input.first100TractionPlaybook).toEqual(['自演']);
  });
});
