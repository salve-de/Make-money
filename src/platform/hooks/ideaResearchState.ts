import type { IdeaResearchResponse } from '@/shared/idea-research';
import type { IdeaResearchFailure } from '../utils/ideaResearchClient';
import type { BuildProblem, IdeaResearchProblem } from '../utils/ideaResearchMessages';

export type IdeaResearchPhase = 'idle' | 'loading' | 'ready' | 'error';

export interface IdeaResearchState {
  /** 最後に始めた検索の番号。これと違う番号の応答は、古い検索のものなので使わない。 */
  run: number;
  phase: IdeaResearchPhase;
  data: IdeaResearchResponse | null;
  problem: IdeaResearchProblem | null;
  building: boolean;
  buildProblem: BuildProblem | null;
}

export type IdeaResearchAction =
  | { type: 'invalid'; run: number; reason: 'TOO_SHORT' | 'TOO_LONG' }
  | { type: 'start'; run: number }
  | { type: 'done'; run: number; data: IdeaResearchResponse }
  | { type: 'failed'; run: number; kind: IdeaResearchFailure }
  | { type: 'close'; run: number }
  | { type: 'buildStart' }
  | { type: 'buildProblem'; ideaId: string; kind: BuildProblem };

export const INITIAL_IDEA_RESEARCH_STATE: IdeaResearchState = {
  run: 0,
  phase: 'idle',
  data: null,
  problem: null,
  building: false,
  buildProblem: null,
};

/**
 * 検索を新しく始める・入力が不正・閉じる、のどれでも前の結果と Builder の状態をすべて消す。
 * 前の結果を残したまま新しい検索を表示すると、0件のときに古い事例が残って見えるため、状態の発生源で消す。
 */
export function ideaResearchReducer(state: IdeaResearchState, action: IdeaResearchAction): IdeaResearchState {
  switch (action.type) {
    case 'invalid':
      return { ...INITIAL_IDEA_RESEARCH_STATE, run: action.run, phase: 'error', problem: action.reason };
    case 'start':
      return { ...INITIAL_IDEA_RESEARCH_STATE, run: action.run, phase: 'loading' };
    case 'close':
      return { ...INITIAL_IDEA_RESEARCH_STATE, run: action.run };
    case 'done':
      return action.run === state.run
        ? { ...state, phase: 'ready', data: action.data, problem: null }
        : state;
    case 'failed':
      return action.run === state.run
        ? { ...state, phase: 'error', data: null, problem: action.kind }
        : state;
    case 'buildStart':
      return state.data?.ai ? { ...state, building: true, buildProblem: null } : state;
    case 'buildProblem':
      // 準備している間に別の検索へ移っていたら、その結果には関係しない失敗なので表示しない。
      return state.data?.ai?.id === action.ideaId
        ? { ...state, building: false, buildProblem: action.kind }
        : state;
  }
}
