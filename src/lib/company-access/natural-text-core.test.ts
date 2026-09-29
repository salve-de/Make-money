import { describe, expect, it } from 'vitest';
import {
  clipText,
  dropNameStuffing,
  entityNames,
  isSameContent,
  repairTruncation,
  restoreDroppedSubject,
  stripMoneyHeadline,
  templateKey,
  tidyText,
} from './natural-text-core';

describe('tidyText', () => {
  it('removes machine-translation spaces between Japanese words and numbers but keeps English spacing', () => {
    expect(tidyText('このビジネスは 2018 年に開始され、月に約 10,000 ドルの フード ブログ')).toBe('このビジネスは2018年に開始され、月に約10,000ドルのフードブログ');
    expect(tidyText('Indie Hackers の掲載')).toBe('Indie Hackersの掲載');
  });

  it('fixes doubled punctuation, pasted emoji and stray edge punctuation', () => {
    expect(tidyText('、📝 売上が伸びた。。次に、。')).toBe('売上が伸びた。次に。');
    expect(tidyText('説明です...')).toBe('説明です…');
  });

  it('drops one-sided brackets and a parenthetical cut off at the end', () => {
    expect(tidyText('「会員制サイトを始めた')).toBe('会員制サイトを始めた');
    expect(tidyText('会員制の動画ライブラリを提供（アーロンは、小規模な')).toBe('会員制の動画ライブラリを提供');
    expect(tidyText('料金（月額）を公開')).toBe('料金（月額）を公開');
  });

  it('gives the same result when applied twice', () => {
    const once = tidyText(' 「 月商 150 万円 。。 ');
    expect(tidyText(once)).toBe(once);
  });
});

describe('names and repeated names', () => {
  it('collects the case name, its base name and people, skipping unknown values', () => {
    expect(entityNames({ name: 'Aaron Wilbur (Founder of The Coaches Site)', founder: 'Aaron Wilbur', legalEntity: 'UNKNOWN (eBiz)' }))
      .toEqual(['Aaron Wilbur (Founder of The Coaches Site)', 'Aaron Wilbur']);
  });

  it('collapses a name written twice and removes the generated verdict label', () => {
    expect(dropNameStuffing('Steve HanovのSteve Hanov式の小型ツール', ['Steve Hanov'])).toBe('Steve Hanov式の小型ツール');
    expect(dropNameStuffing('【Photo AIの攻略判定】 撮影の手間を消した', ['Photo AI'])).toBe('撮影の手間を消した');
  });

  it('removes a leading revenue label that repeats the revenue column', () => {
    expect(stripMoneyHeadline('【月商52.5億円】このビジネスは2018年に開始')).toBe('このビジネスは2018年に開始');
    expect(stripMoneyHeadline('【注意】旧版')).toBe('【注意】旧版');
  });

  it('restores the subject that machine translation dropped', () => {
    expect(restoreDroppedSubject('を構築したのは、既存の決済が使えない企業が多いため', 'eCheckPlan')).toBe('eCheckPlanを構築したのは、既存の決済が使えない企業が多いため');
    expect(restoreDroppedSubject('はじめに会員制を始めた', 'X')).toBe('はじめに会員制を始めた');
  });
});

describe('cut-off sentences', () => {
  it('goes back to the last complete sentence', () => {
    expect(repairTruncation('会員制の動画ライブラリを始めた。今では2500人以上の')).toBe('会員制の動画ライブラリを始めた。');
  });

  it('marks a long cut-off excerpt with an ellipsis and drops a tiny fragment', () => {
    expect(repairTruncation('このビジネスは2018年に開始され、自らの力で')).toBe('このビジネスは2018年に開始され、自らの力で…');
    expect(repairTruncation('Mariaは')).toBe('');
  });

  it('leaves complete endings alone', () => {
    for (const text of ['課題を一つずつ解決すること', '決済を受けられない企業が多いため', '副業で運営している小型の道具', '会員制の動画ライブラリ。']) {
      expect(repairTruncation(text)).toBe(text);
    }
  });

  it('clips at a sentence or comma boundary instead of a fixed length', () => {
    expect(clipText('会員制を始めた。今では54か国の会員がいる', 12)).toBe('会員制を始めた。');
    expect(clipText('ホッケーのコーチ向けに、講演の録画を会員制で公開している', 16)).toBe('ホッケーのコーチ向けに…');
    expect(clipText('短い文', 10)).toBe('短い文');
  });
});

describe('comparison helpers', () => {
  it('treats near-identical texts as the same content', () => {
    expect(isSameContent('大手が見落とす死角。', '大手が見落とす死角')).toBe(true);
    expect(isSameContent('ホッケーのコーチ向けの会員制動画', 'ホッケーのコーチ向けの会員制動画を54か国に提供している事例です')).toBe(false);
  });

  it('builds the same template key regardless of the case name and numbering', () => {
    expect(templateKey('1. Photo AIの初期接点：現場に直接提示。', ['Photo AI'])).toBe('◯の初期接点：現場に直接提示');
    expect(templateKey('Step 2: 既存大手が軽視する死角', [])).toBe('既存大手が軽視する死角');
  });
});
