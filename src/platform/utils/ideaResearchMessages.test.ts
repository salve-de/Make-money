import { describe, expect, it } from 'vitest';
import {
  aiUnavailableNotice,
  buildProblemMessage,
  problemMessage,
  type BuildProblem,
  type IdeaResearchProblem,
} from './ideaResearchMessages';

const PROBLEMS: IdeaResearchProblem[] = ['TOO_SHORT', 'TOO_LONG', 'INVALID_INPUT', 'RATE_LIMITED', 'UNAVAILABLE', 'NETWORK', 'BAD_RESPONSE'];
const BUILD_PROBLEMS: BuildProblem[] = ['LOGIN_REQUIRED', 'RATE_LIMITED', 'FAILED'];

describe('aiUnavailableNotice', () => {
  it('invites a signed-out user to log in', () => {
    expect(aiUnavailableNotice('LOGIN_REQUIRED', false)).toEqual({ text: 'ログインするとAIのまとめも出ます', offerLogin: true });
  });

  it('does not ask a signed-in user to log in again; it asks them to search once more', () => {
    const notice = aiUnavailableNotice('LOGIN_REQUIRED', true);
    expect(notice.offerLogin).toBe(false);
    expect(notice.text).toContain('もう一度');
    expect(notice.text).not.toContain('ログインするとAIのまとめも出ます');
  });

  it.each(['NOT_CONFIGURED', 'FAILED', undefined] as const)('says the AI summary is unavailable for %s, in both login states', (reason) => {
    for (const signedIn of [true, false]) {
      expect(aiUnavailableNotice(reason, signedIn)).toEqual({
        text: 'AIのまとめは現在使えません。似た事例だけ表示しています',
        offerLogin: false,
      });
    }
  });
});

describe('messages shown to the user', () => {
  it('has a plain message for every problem', () => {
    for (const kind of PROBLEMS) expect(problemMessage(kind).length).toBeGreaterThan(5);
    for (const kind of BUILD_PROBLEMS) expect(buildProblemMessage(kind).length).toBeGreaterThan(5);
    expect(problemMessage('TOO_SHORT')).toContain('10文字以上');
    expect(problemMessage('TOO_LONG')).toContain('1000文字以内');
  });

  it('never promises results or guarantees', () => {
    const all = [
      ...PROBLEMS.map(problemMessage),
      ...BUILD_PROBLEMS.map(buildProblemMessage),
      aiUnavailableNotice('LOGIN_REQUIRED', false).text,
      aiUnavailableNotice('LOGIN_REQUIRED', true).text,
      aiUnavailableNotice('FAILED', false).text,
    ].join('\n');
    expect(all).not.toMatch(/必ず|確実|絶対|保証|100%/u);
  });
});
