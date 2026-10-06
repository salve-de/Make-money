/**
 * ローカル開発専用：Firebase Auth エミュレーターへつなぐかどうかの判定。
 *
 * 次の4つが全部そろったときだけ有効になる。どれか1つでも欠けたら null（本物の Firebase を使う）。
 * - NODE_ENV が production ではない（本番ビルド・Workers では process.env.NODE_ENV が 'production' に固定される）
 * - Cloudflare Workers の中で動いていない
 * - エミュレーターの宛先が localhost / 127.0.0.1 / [::1] のポート付き
 * - プロジェクトIDが demo- で始まる（Firebase が「本物のプロジェクトに一切つながない」と決めている名前）
 *
 * エミュレーターが出すトークンには署名が無いため、サーバー側はこの判定が通ったときだけ、
 * 署名なしトークンを demo- プロジェクトのものとして受け付ける（src/lib/firebase/server.ts）。
 */
export interface AuthEmulatorInput {
  nodeEnv: string | undefined;
  host: string | undefined;
  projectId: string | undefined;
  userAgent?: string | undefined;
}

const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\]):([1-9][0-9]{0,4})$/;
export const DEMO_PROJECT = /^demo-[a-z0-9-]{1,40}$/;

export function resolveAuthEmulatorHost(input: AuthEmulatorInput): string | null {
  if (input.nodeEnv === 'production') return null;
  if (input.userAgent === 'Cloudflare-Workers') return null;
  const host = input.host?.trim();
  const projectId = input.projectId?.trim();
  if (!host || !projectId) return null;
  const match = LOCAL_HOST.exec(host);
  if (!match || Number(match[2]) > 65535) return null;
  if (!DEMO_PROJECT.test(projectId)) return null;
  return host;
}

export function currentUserAgent(): string | undefined {
  return typeof navigator === 'undefined' ? undefined : navigator.userAgent;
}
