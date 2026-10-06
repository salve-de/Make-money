import { describe, expect, it } from 'vitest';
import { authErrorMessage } from './authErrors';

describe('authErrorMessage', () => {
  it('Firebase のエラーコードを日本語にする', () => {
    expect(authErrorMessage({ code: 'auth/invalid-credential', message: 'Firebase: Error (auth/invalid-credential).' }))
      .toBe('メールアドレスかパスワードが違います。');
    expect(authErrorMessage({ code: 'auth/email-already-in-use' })).toContain('すでに登録');
  });

  it('知らないコードや英語の原文は画面に出さない', () => {
    expect(authErrorMessage(new Error('Firebase: Error (auth/something-new).'))).toBe('ログインできませんでした。もう一度試してください。');
    expect(authErrorMessage({ code: 'auth/unknown' }, '送れませんでした')).toBe('送れませんでした');
  });

  it('日本語で書かれた設定未完了の説明はそのまま使う', () => {
    expect(authErrorMessage(new Error('この環境ではログイン設定が未完了です。'))).toBe('この環境ではログイン設定が未完了です。');
  });
});
