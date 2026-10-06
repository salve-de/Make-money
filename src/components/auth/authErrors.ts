/** Firebase Auth のエラーを、画面に出す日本語に直す。英語の原文や内部コードは画面に出さない。 */
const MESSAGES: Record<string, string> = {
  'auth/invalid-email': 'メールアドレスの形式が正しくありません。',
  'auth/missing-email': 'メールアドレスを入力してください。',
  'auth/missing-password': 'パスワードを入力してください。',
  'auth/user-not-found': 'メールアドレスかパスワードが違います。',
  'auth/wrong-password': 'メールアドレスかパスワードが違います。',
  'auth/invalid-credential': 'メールアドレスかパスワードが違います。',
  'auth/invalid-login-credentials': 'メールアドレスかパスワードが違います。',
  'auth/email-already-in-use': 'このメールアドレスはすでに登録されています。「ログイン」から入ってください。',
  'auth/weak-password': 'パスワードは6文字以上にしてください。',
  'auth/password-does-not-meet-requirements': 'パスワードが条件を満たしていません。長さや文字の種類を見直してください。',
  'auth/too-many-requests': '試行が多すぎるため、一時的に止めています。しばらくしてから試してください。',
  'auth/network-request-failed': '通信できませんでした。接続を確認して、もう一度試してください。',
  'auth/popup-closed-by-user': 'Google のログイン画面が閉じられました。もう一度試してください。',
  'auth/cancelled-popup-request': 'Google のログイン画面が閉じられました。もう一度試してください。',
  'auth/popup-blocked': 'ブラウザがログイン用の小さな画面を止めました。ポップアップを許可して、もう一度試してください。',
  'auth/user-disabled': 'このアカウントは利用停止になっています。',
  'auth/operation-not-allowed': 'この方法でのログインは、いま利用できません。',
  'auth/requires-recent-login': '安全のため、もう一度ログインしてから操作してください。',
  'auth/expired-action-code': 'このリンクは期限切れです。もう一度メールを送ってください。',
  'auth/invalid-action-code': 'このリンクは使えません。もう一度メールを送ってください。',
  'auth/unauthorized-domain': 'この画面のアドレスからはログインできません。',
  'auth/internal-error': 'ログインの処理でエラーが起きました。時間をおいて試してください。',
};

export function authErrorMessage(error: unknown, fallback = 'ログインできませんでした。もう一度試してください。'): string {
  const code = error && typeof error === 'object' && 'code' in error && typeof (error as { code: unknown }).code === 'string'
    ? (error as { code: string }).code
    : null;
  if (code && MESSAGES[code]) return MESSAGES[code];
  // 設定が未完了のとき（requireFirebaseAuth）は、すでに日本語の説明が入っている
  if (error instanceof Error && /[ぁ-んァ-ヶ一-龠]/.test(error.message)) return error.message;
  return fallback;
}
