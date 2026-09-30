import { describe, expect, it } from 'vitest';
import {
  IDEA_MAX_LENGTH,
  IDEA_MIN_LENGTH,
  checkIdeaInput,
  parseIdeaResearchResponse,
} from './idea-research';

const validCase = {
  id: 'ent_a',
  name: '事例A',
  tagline: '一行説明',
  sector: 'NICHE_SAAS',
  outcome: 'success',
  monthlyRevenueLabel: '¥150万円',
  score: 42.5,
};

const validIdea = {
  id: 'idea_research_1',
  dimension: 'SAVANNA_INSTINCT',
  dimensionLabel: 'ラベル',
  title: '企画名',
  targetPainWallet: '対象の痛み',
  structuralArbitrage: '突く歪み',
  projectedMonthlyProfitJpy: 0,
  operatingMargin: 0,
  requiredTools: [{ name: 'ツール', monthlyCostJpy: 1000, purpose: '用途' }],
  first100TractionPlaybook: ['手順1'],
  sourceEntityIds: ['ent_a'],
  userNoteInspiration: 'メモ',
};

describe('checkIdeaInput', () => {
  it('accepts 10 to 1000 characters after trimming', () => {
    expect(checkIdeaInput('あ'.repeat(IDEA_MIN_LENGTH))).toEqual({ ok: true, idea: 'あ'.repeat(IDEA_MIN_LENGTH) });
    expect(checkIdeaInput('あ'.repeat(IDEA_MAX_LENGTH)).ok).toBe(true);
  });

  it('rejects text shorter than 10 or longer than 1000 characters', () => {
    expect(checkIdeaInput('あ'.repeat(IDEA_MIN_LENGTH - 1))).toEqual({ ok: false, reason: 'TOO_SHORT' });
    expect(checkIdeaInput('あ'.repeat(IDEA_MAX_LENGTH + 1))).toEqual({ ok: false, reason: 'TOO_LONG' });
    expect(checkIdeaInput('')).toEqual({ ok: false, reason: 'TOO_SHORT' });
  });

  it('ignores surrounding spaces, including full-width ones, when counting and returning the idea', () => {
    expect(checkIdeaInput(`　 ${'あ'.repeat(10)} \n`)).toEqual({ ok: true, idea: 'あ'.repeat(10) });
    expect(checkIdeaInput(`  ${'あ'.repeat(9)}  `)).toEqual({ ok: false, reason: 'TOO_SHORT' });
  });

  it('counts a surrogate pair as one character', () => {
    expect(checkIdeaInput('😀'.repeat(10)).ok).toBe(true);
    expect(checkIdeaInput('😀'.repeat(IDEA_MAX_LENGTH)).ok).toBe(true);
    expect(checkIdeaInput('😀'.repeat(IDEA_MAX_LENGTH + 1))).toEqual({ ok: false, reason: 'TOO_LONG' });
  });
});

describe('parseIdeaResearchResponse', () => {
  it('reads cases with the AI summary', () => {
    const parsed = parseIdeaResearchResponse({ cases: [validCase], ai: validIdea });
    expect(parsed.cases).toEqual([validCase]);
    expect(parsed.ai).toEqual(validIdea);
    expect(parsed).not.toHaveProperty('aiUnavailableReason');
  });

  it('keeps the reason when the AI summary is unavailable', () => {
    expect(parseIdeaResearchResponse({ cases: [], ai: null, aiUnavailableReason: 'LOGIN_REQUIRED' }))
      .toEqual({ cases: [], ai: null, aiUnavailableReason: 'LOGIN_REQUIRED' });
    expect(parseIdeaResearchResponse({ cases: [], ai: null, aiUnavailableReason: 'NOT_CONFIGURED' }).aiUnavailableReason)
      .toBe('NOT_CONFIGURED');
  });

  it('treats a missing or unknown reason as a generic failure instead of showing nothing', () => {
    expect(parseIdeaResearchResponse({ cases: [], ai: null }).aiUnavailableReason).toBe('FAILED');
    expect(parseIdeaResearchResponse({ cases: [], ai: null, aiUnavailableReason: 'SOMETHING_ELSE' }).aiUnavailableReason).toBe('FAILED');
    expect(parseIdeaResearchResponse({ cases: [] }).ai).toBeNull();
  });

  it('copies only the known fields', () => {
    const parsed = parseIdeaResearchResponse({ cases: [{ ...validCase, pnl: { monthlyRevenue: 1 }, meta: 'secret' }], ai: null });
    expect(Object.keys(parsed.cases[0]).sort()).toEqual(
      ['id', 'monthlyRevenueLabel', 'name', 'outcome', 'score', 'sector', 'tagline'],
    );
  });

  it.each([
    ['not an object', 'text'],
    ['an array', []],
    ['missing cases', { ai: null }],
    ['cases that are not an array', { cases: 'x', ai: null }],
    ['a case without an id', { cases: [{ ...validCase, id: '' }], ai: null }],
    ['a case with an unknown outcome', { cases: [{ ...validCase, outcome: 'winner' }], ai: null }],
    ['a case with an unknown sector', { cases: [{ ...validCase, sector: 'OTHER' }], ai: null }],
    ['a case with a numeric label', { cases: [{ ...validCase, monthlyRevenueLabel: 100 }], ai: null }],
    ['a case with a non-finite score', { cases: [{ ...validCase, score: Number.NaN }], ai: null }],
    ['an AI summary without a title', { cases: [], ai: { ...validIdea, title: undefined } }],
    ['an AI summary with an unknown dimension', { cases: [], ai: { ...validIdea, dimension: 'OTHER' } }],
    ['an AI summary with a broken tool', { cases: [], ai: { ...validIdea, requiredTools: [{ name: 'x' }] } }],
    ['an AI summary with non-string steps', { cases: [], ai: { ...validIdea, first100TractionPlaybook: [1] } }],
  ])('rejects %s', (_label, value) => {
    expect(() => parseIdeaResearchResponse(value)).toThrow();
  });
});
