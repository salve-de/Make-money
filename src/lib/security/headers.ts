/**
 * 公開サイトのセキュリティヘッダー。next.config.ts の headers() から使う（純粋な関数だけ・外部 import なし）。
 *
 * 許可リストの根拠（実際のコードの使用先）:
 * - ログイン: src/context/AuthContext.tsx の signInWithPopup（Firebase Auth）。
 *   Firebase の SDK が apis.google.com のスクリプトと、<authDomain>/__/auth/iframe の iframe、
 *   identitytoolkit / securetoken / www.googleapis.com への通信を使う。
 * - 決済: Stripe は checkout.stripe.com への画面遷移だけ（サーバーが作った URL へ location 移動）。
 *   Stripe.js は読み込まない。
 * - フォント: next/font/google はビルド時に自己ホストへ置き換わる。外部フォントの読み込みは無い。
 * - 画像: 同じサイトの /api/media/file か、実行時の環境変数 CLOUDFLARE_R2_PUBLIC_DOMAIN（ビルド時には分からない）。
 *   そのため img-src は https: 全体を許す（画像は実行できないので、緩めても影響が小さい）。
 * - 生成アプリのプレビュー: BuilderWorkspace の iframe が /api/build/preview/ を同じサイト内で埋め込む。
 *   中身は v0 が生成したアプリなので、サイト全体の CSP は当てず、サンドボックス（別オリジン扱い）だけを当てる。
 * - script-src の 'unsafe-inline': Next.js が描画のための小さな inline script を出す。nonce 方式には
 *   proxy.ts の変更が要るため、いまは 'unsafe-inline' を許す。外部スクリプトは apis.google.com 以外を許さない。
 *   Cross-Origin-Opener-Policy は付けない（Firebase のポップアップログインが壊れる）。
 */

export interface SecurityHeader { key: string; value: string }
export interface SecurityHeaderRule { source: string; headers: SecurityHeader[] }

export interface SecurityHeaderOptions {
  /** 本番は true。開発では HMR 用の ws: と、React の開発用に必要な 'unsafe-eval' を足す。 */
  production: boolean;
  /** NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN（例: example.firebaseapp.com や独自ドメイン）。未設定でも *.firebaseapp.com は許す。 */
  firebaseAuthDomain?: string;
}

/** 生成アプリのプレビュー。サイト全体の CSP から外し、専用のヘッダーだけを付ける。 */
export const PREVIEW_PATH_PREFIX = 'api/build/preview/';
/** 自分で CSP を付けている経路（二重に付けると、どちらが勝つか実行環境で変わるため外す）。 */
export const SELF_POLICY_PATHS = ['api/media/file', 'api/notifications/unsubscribe'] as const;

const PREVIEW_SANDBOX = 'sandbox allow-forms allow-modals allow-popups allow-scripts allow-downloads';

function hostOf(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const host = trimmed.replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
  return /^[a-z0-9.-]+$/i.test(host) ? host.toLowerCase() : null;
}

export function contentSecurityPolicy(options: SecurityHeaderOptions): string {
  const authHost = hostOf(options.firebaseAuthDomain);
  const authOrigin = authHost ? [`https://${authHost}`] : [];
  const firebaseConnect = [
    'https://identitytoolkit.googleapis.com',
    'https://securetoken.googleapis.com',
    'https://www.googleapis.com',
    'https://*.firebaseapp.com',
    ...authOrigin,
  ];
  const directives: Array<[string, string[]]> = [
    ['default-src', ["'self'"]],
    ['base-uri', ["'self'"]],
    ['object-src', ["'none'"]],
    ['frame-ancestors', ["'none'"]],
    ['form-action', ["'self'"]],
    ['script-src', ["'self'", "'unsafe-inline'", 'https://apis.google.com', ...(options.production ? [] : ["'unsafe-eval'"])]],
    ['style-src', ["'self'", "'unsafe-inline'"]],
    ['img-src', ["'self'", 'data:', 'blob:', 'https:']],
    ['font-src', ["'self'", 'data:']],
    ['connect-src', ["'self'", ...firebaseConnect, ...(options.production ? [] : ['ws:', 'wss:'])]],
    ['frame-src', ["'self'", 'https://*.firebaseapp.com', 'https://accounts.google.com', ...authOrigin]],
    ['worker-src', ["'self'", 'blob:']],
    ['manifest-src', ["'self'"]],
    ['media-src', ["'self'"]],
  ];
  const text = directives.map(([name, values]) => `${name} ${values.join(' ')}`);
  if (options.production) text.push('upgrade-insecure-requests');
  return text.join('; ');
}

const PERMISSIONS_POLICY = [
  'camera=()', 'microphone=()', 'geolocation=()', 'usb=()', 'serial=()', 'bluetooth=()',
  'magnetometer=()', 'accelerometer=()', 'gyroscope=()', 'browsing-topics=()',
].join(', ');

function baseHeaders(options: SecurityHeaderOptions, frame: 'DENY' | 'SAMEORIGIN'): SecurityHeader[] {
  return [
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: PERMISSIONS_POLICY },
    { key: 'X-Frame-Options', value: frame },
    // includeSubDomains / preload は、同じドメインの別サブドメインや取り消しに影響するので付けない。
    ...(options.production ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000' }] : []),
  ];
}

/** Next.js の headers() にそのまま返せる規則。後ろの規則が前の同名ヘッダーを上書きするので、範囲は重ならないようにしてある。 */
export function securityHeaderRules(options: SecurityHeaderOptions): SecurityHeaderRule[] {
  const csp = contentSecurityPolicy(options);
  const exceptPreview = `/((?!${PREVIEW_PATH_PREFIX}).*)`;
  const exceptSelfPolicy = `/((?!${PREVIEW_PATH_PREFIX}|${SELF_POLICY_PATHS.join('|')}).*)`;
  return [
    { source: exceptPreview, headers: baseHeaders(options, 'DENY') },
    { source: exceptSelfPolicy, headers: [{ key: 'Content-Security-Policy', value: csp }] },
    {
      source: '/api/build/preview/:path*',
      headers: [
        ...baseHeaders(options, 'SAMEORIGIN'),
        { key: 'Content-Security-Policy', value: `${PREVIEW_SANDBOX}; frame-ancestors 'self'` },
      ],
    },
  ];
}
