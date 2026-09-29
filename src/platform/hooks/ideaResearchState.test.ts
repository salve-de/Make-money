import { describe, expect, it } from 'vitest';
import type { IdeaResearchResponse } from '@/shared/idea-research';
import type { SynthesizedIdea } from '@/shared/terminal';
import {
  INITIAL_IDEA_RESEARCH_STATE,
  ideaResearchReducer,
  type IdeaResearchAction,
  type IdeaResearchState,
} from './ideaResearchState';

const idea: SynthesizedIdea = {
  id: 'idea_research_1',
  dimension: 'SAVANNA_INSTINCT',
  dimensionLabel: 'ラベル',
  title: '企画',
  targetPainWallet: '痛み',
  structuralArbitrage: '歪み',
  projectedMonthlyProfitJpy: 0,
  operatingMargin: 0,
  requiredTools: [],
  first100TractionPlaybook: [],
  sourceEntityIds: [],
  userNoteInspiration: 'メモ',
};
const caseRow = { id: 'ent_a', name: 'A', tagline: 't', sector: 'NICHE_SAAS', outcome: 'success', monthlyRevenueLabel: null, score: 10 } as const;
const withCases: IdeaResearchResponse = { cases: [caseRow], ai: idea };
const noCases: IdeaResearchResponse = { cases: [], ai: null, aiUnavailableReason: 'LOGIN_REQUIRED' };

function run(actions: IdeaResearchAction[], from: IdeaResearchState = INITIAL_IDEA_RESEARCH_STATE): IdeaResearchState {
  return actions.reduce(ideaResearchReducer, from);
}

describe('ideaResearchReducer', () => {
  it('starts idle with nothing shown', () => {
    expect(INITIAL_IDEA_RESEARCH_STATE).toMatchObject({ phase: 'idle', data: null, problem: null, building: false, buildProblem: null });
  });

  it('moves from loading to ready with the result', () => {
    const loading = run([{ type: 'start', run: 1 }]);
    expect(loading).toMatchObject({ phase: 'loading', data: null, problem: null });
    expect(run([{ type: 'done', run: 1, data: withCases }], loading)).toMatchObject({ phase: 'ready', data: withCases, problem: null });
  });

  it('moves from loading to error with the reason, and shows no result', () => {
    const state = run([{ type: 'start', run: 1 }, { type: 'failed', run: 1, kind: 'RATE_LIMITED' }]);
    expect(state).toMatchObject({ phase: 'error', data: null, problem: 'RATE_LIMITED' });
  });

  it('shows an input problem without starting a search, and clears the previous result', () => {
    const state = run([
      { type: 'start', run: 1 },
      { type: 'done', run: 1, data: withCases },
      { type: 'invalid', run: 2, reason: 'TOO_SHORT' },
    ]);
    expect(state).toMatchObject({ phase: 'error', data: null, problem: 'TOO_SHORT', run: 2 });
  });

  it('clears the previous result the moment a new search starts, so an old result never stays next to a new question', () => {
    const shown = run([{ type: 'start', run: 1 }, { type: 'done', run: 1, data: withCases }]);
    expect(shown.data).toBe(withCases);
    const next = run([{ type: 'start', run: 2 }], shown);
    expect(next).toMatchObject({ phase: 'loading', data: null, problem: null });
    // 新しい検索が0件でも、前の事例は出ない
    expect(run([{ type: 'done', run: 2, data: { cases: [], ai: null, aiUnavailableReason: 'FAILED' } }], next).data?.cases).toEqual([]);
  });

  it('ignores an answer that arrives for an older search', () => {
    const state = run([
      { type: 'start', run: 1 },
      { type: 'start', run: 2 },
      { type: 'done', run: 1, data: withCases },
    ]);
    expect(state).toMatchObject({ run: 2, phase: 'loading', data: null });
    expect(run([{ type: 'failed', run: 1, kind: 'NETWORK' }], state)).toBe(state);
    expect(run([{ type: 'done', run: 2, data: noCases }], state)).toMatchObject({ phase: 'ready', data: noCases });
  });

  it('closing clears everything and makes a search that is still running irrelevant', () => {
    const state = run([
      { type: 'start', run: 1 },
      { type: 'close', run: 2 },
      { type: 'done', run: 1, data: withCases },
    ]);
    expect(state).toMatchObject({ phase: 'idle', data: null, problem: null, run: 2 });
  });

  describe('handing an idea to Builder', () => {
    const ready = run([{ type: 'start', run: 1 }, { type: 'done', run: 1, data: withCases }]);

    it('marks the build as running only when there is an AI summary to build', () => {
      expect(run([{ type: 'buildStart' }], ready)).toMatchObject({ building: true, buildProblem: null });
      const withoutAi = run([{ type: 'start', run: 1 }, { type: 'done', run: 1, data: noCases }]);
      expect(run([{ type: 'buildStart' }], withoutAi)).toBe(withoutAi);
      expect(run([{ type: 'buildStart' }])).toBe(INITIAL_IDEA_RESEARCH_STATE);
    });

    it('shows why the build could not start, and lets the user try again', () => {
      const failed = run([{ type: 'buildStart' }, { type: 'buildProblem', ideaId: idea.id, kind: 'FAILED' }], ready);
      expect(failed).toMatchObject({ building: false, buildProblem: 'FAILED' });
      expect(run([{ type: 'buildStart' }], failed)).toMatchObject({ building: true, buildProblem: null });
    });

    it('does not show a build failure that belongs to a result the user has already replaced', () => {
      const replaced = run([{ type: 'buildStart' }, { type: 'start', run: 2 }, { type: 'done', run: 2, data: { ...withCases, ai: { ...idea, id: 'idea_research_2' } } }], ready);
      expect(run([{ type: 'buildProblem', ideaId: idea.id, kind: 'FAILED' }], replaced)).toBe(replaced);
      expect(replaced.buildProblem).toBeNull();
      expect(replaced.building).toBe(false);
    });

    it('drops the build state when the search is closed or repeated', () => {
      const failed = run([{ type: 'buildProblem', ideaId: idea.id, kind: 'LOGIN_REQUIRED' }], ready);
      expect(run([{ type: 'close', run: 2 }], failed)).toMatchObject({ buildProblem: null, building: false });
      expect(run([{ type: 'start', run: 2 }], failed)).toMatchObject({ buildProblem: null, building: false });
    });
  });
});
