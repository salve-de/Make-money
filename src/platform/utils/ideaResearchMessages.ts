import { IDEA_MAX_LENGTH, IDEA_MIN_LENGTH, type IdeaResearchUnavailableReason } from '@/shared/idea-research';
import type { BuilderPrepareResult, IdeaResearchFailure } from './ideaResearchClient';

/** 「自分のアイデアを調べる」で利用者に見せる文言。画面と単体テストで同じ文を使う。 */

export type IdeaResearchProblem = IdeaResearchFailure | 'TOO_SHORT' | 'TOO_LONG';

const PROBLEM_MESSAGES: Record<IdeaResearchProblem, string> = {
  TOO_SHORT: `アイデアは${IDEA_MIN_LENGTH}文字以上で入力してください。`,
  TOO_LONG: `アイデアは${IDEA_MAX_LENGTH}文字以内で入力してください。`,
  INVALID_INPUT: '入力内容を確認して、もう一度お試しください。',
  RATE_LIMITED: '短い時間に調べすぎています。しばらく待ってから、もう一度お試しください。',
  UNAVAILABLE: '現在、調べられません。時間をおいて、もう一度お試しください。',
  NETWORK: '通信できませんでした。接続を確認して、もう一度お試しください。',
  BAD_RESPONSE: '応答の形式を確認できませんでした。もう一度お試しください。',
};

export function problemMessage(kind: IdeaResearchProblem): string {
  return PROBLEM_MESSAGES[kind];
}

export type BuildProblem = Extract<BuilderPrepareResult, { ok: false }>['kind'];

const BUILD_MESSAGES: Record<BuildProblem, string> = {
  LOGIN_REQUIRED: 'Builderで作るにはログインが必要です。',
  RATE_LIMITED: '短い時間に準備しすぎています。しばらく待ってから、もう一度お試しください。',
  FAILED: 'Builderの準備に失敗しました。もう一度お試しください。',
};

export function buildProblemMessage(kind: BuildProblem): string {
  return BUILD_MESSAGES[kind];
}

/** AI のまとめが出なかった理由の説明。ログインを促すのは、まだログインしていないときだけ。 */
export function aiUnavailableNotice(
  reason: IdeaResearchUnavailableReason | undefined,
  signedIn: boolean,
): { text: string; offerLogin: boolean } {
  if (reason === 'LOGIN_REQUIRED') {
    return signedIn
      ? { text: 'ログインを確認できました。もう一度「調べる」を押すと、AIのまとめも出ます', offerLogin: false }
      : { text: 'ログインするとAIのまとめも出ます', offerLogin: true };
  }
  return { text: 'AIのまとめは現在使えません。似た事例だけ表示しています', offerLogin: false };
}
