import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  ALL_TAXONOMY_WORDS, AXES, BUYER_WORDS, FEATURE_WORDS, FIELD_WORDS, FORM_WORDS,
  axisOfWord, caseTagWords, caseTagsProblems, taxonomyPromptText,
} from './case-taxonomy';
import { OPERATOR_TAGS } from './display-text';

describe('タグの言葉の一覧（case-taxonomy）', () => {
  it('決まった数の言葉: 分野16・事業の形8・売る相手3・特徴1。言葉は軸をまたいで重ならず、運営の印とも重ならない', () => {
    expect([FIELD_WORDS.length, FORM_WORDS.length, BUYER_WORDS.length, FEATURE_WORDS.length]).toEqual([16, 8, 3, 1]);
    expect(new Set(ALL_TAXONOMY_WORDS).size).toBe(ALL_TAXONOMY_WORDS.length);
    expect(ALL_TAXONOMY_WORDS.filter((w) => OPERATOR_TAGS.has(w))).toEqual([]);
  });
  it('どの言葉にも定義と「入る例」がある。収集のAIに渡す文に全部の言葉が入る', () => {
    for (const axis of AXES) for (const t of axis.terms) { expect(t.definition.length).toBeGreaterThan(5); expect(t.yes.length).toBeGreaterThan(2); }
    const prompt = taxonomyPromptText();
    for (const word of ALL_TAXONOMY_WORDS) expect(prompt).toContain(word);
  });
  it('言葉から軸が引ける。一覧にない言葉は null', () => {
    expect(axisOfWord('開発・IT')).toBe('field');
    expect(axisOfWord('仲介')).toBe('form');
    expect(axisOfWord('開発者向け')).toBe('buyer');
    expect(axisOfWord('AI')).toBe('features');
    expect(axisOfWord('内装のAI')).toBeNull();
  });
  it('札の並びは 分野・事業の形・売る相手・特徴', () => {
    expect(caseTagWords({ field: '住まい・不動産', form: 'ソフト・アプリ', buyer: '個人向け', features: ['AI'] })).toEqual(['住まい・不動産', 'ソフト・アプリ', '個人向け', 'AI']);
    expect(caseTagWords(undefined)).toEqual([]);
  });
  it('検査: 3軸がちょうど1つずつ、言葉は一覧の中だけ', () => {
    const ok = { field: '開発・IT', form: '仲介', buyer: '開発者向け', features: [] };
    expect(caseTagsProblems(ok)).toEqual([]);
    expect(caseTagsProblems({ ...ok, field: '内装のAI' })[0]).toContain('一覧にない');
    expect(caseTagsProblems({ ...ok, form: '' })[0]).toContain('1つ決まっていません');
    expect(caseTagsProblems({ ...ok, buyer: ['会社向け', '個人向け'] })[0]).toContain('1つ決まっていません');
    expect(caseTagsProblems({ ...ok, features: ['AI', 'AI'] })[0]).toContain('重複');
    expect(caseTagsProblems({ ...ok, features: ['クラウド'] })[0]).toContain('一覧にない');
    expect(caseTagsProblems(null)).toEqual(['タグがありません']);
  });
});

describe('公開する事例の割り当て（data/case-tags.json）', () => {
  const file = JSON.parse(readFileSync('data/case-tags.json', 'utf8')) as Record<string, { basis?: string } & Record<string, unknown>>;
  const ids = readdirSync('data/case-pages').filter((f) => f.endsWith('.md')).map((f) => f.replace(/\.md$/, ''));
  it('章ごとの文がある事例は全員、一覧の言葉で3軸が1つずつ付き、判断の根拠がある', () => {
    for (const id of ids) {
      expect(file[id], id).toBeTruthy();
      expect(caseTagsProblems(file[id]), id).toEqual([]);
      expect(String(file[id].basis ?? '').trim().length, id).toBeGreaterThan(5);
    }
  });
});
