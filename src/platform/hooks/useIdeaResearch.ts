'use client';

import { useCallback, useReducer, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { checkIdeaInput } from '@/shared/idea-research';
import { builderPath, fetchIdeaResearch, prepareBuilderIdea } from '../utils/ideaResearchClient';
import { INITIAL_IDEA_RESEARCH_STATE, ideaResearchReducer } from './ideaResearchState';

export type { IdeaResearchPhase } from './ideaResearchState';

/**
 * 「自分のアイデアを調べる」の状態。入力文・検索の進み具合・結果・Builder への引き渡しをまとめて持つ。
 * 状態の遷移は ideaResearchReducer（新しく調べ始めたら前の結果を消す、古い応答を捨てる）が決める。
 */
export function useIdeaResearch(navigate: (path: string) => void) {
  const { token, user, refreshAuthToken, signInWithGoogle } = useAuth();
  const [text, setText] = useState('');
  const [state, dispatch] = useReducer(ideaResearchReducer, INITIAL_IDEA_RESEARCH_STATE);
  const [loginFailed, setLoginFailed] = useState(false);
  const runCounter = useRef(0);

  const submit = useCallback(async () => {
    const run = ++runCounter.current;
    const checked = checkIdeaInput(text);
    if (!checked.ok) {
      dispatch({ type: 'invalid', run, reason: checked.reason });
      return;
    }
    dispatch({ type: 'start', run });
    const result = await fetchIdeaResearch({ idea: checked.idea, token, refreshToken: refreshAuthToken });
    dispatch(result.ok ? { type: 'done', run, data: result.data } : { type: 'failed', run, kind: result.kind });
  }, [text, token, refreshAuthToken]);

  const build = useCallback(async () => {
    const idea = state.data?.ai;
    if (!idea || state.building) return;
    if (!token) {
      dispatch({ type: 'buildProblem', ideaId: idea.id, kind: 'LOGIN_REQUIRED' });
      return;
    }
    dispatch({ type: 'buildStart' });
    const result = await prepareBuilderIdea({ idea, token, refreshToken: refreshAuthToken });
    // 成功したら画面が切り替わるまで「準備しています」のままにして、二重に押されないようにする。
    if (result.ok) navigate(builderPath(result.ideaId));
    else dispatch({ type: 'buildProblem', ideaId: idea.id, kind: result.kind });
  }, [state.data, state.building, token, refreshAuthToken, navigate]);

  const login = useCallback(async () => {
    setLoginFailed(false);
    try {
      await signInWithGoogle();
    } catch {
      setLoginFailed(true);
    }
  }, [signInWithGoogle]);

  /** 結果を閉じる。処理中の検索があれば、その応答は使わない。 */
  const close = useCallback(() => {
    dispatch({ type: 'close', run: ++runCounter.current });
  }, []);

  return {
    text,
    setText,
    phase: state.phase,
    data: state.data,
    problem: state.problem,
    building: state.building,
    buildProblem: state.buildProblem,
    loginFailed,
    signedIn: Boolean(user && token),
    submit,
    build,
    login,
    close,
  };
}
