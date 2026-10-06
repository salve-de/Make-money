/**
 * アクセス解析（Cloudflare Web Analytics）の読み込み。
 *
 * - Cookie を使わない無料の計測。トークン（NEXT_PUBLIC_CF_ANALYTICS_TOKEN）が未設定なら何も読み込まない。
 * - 同意前は一切読み込まない。同意の判定は src/lib/legal/consent.ts の whenAnalyticsAllowed に任せる
 *   （未選択は「同意なし」。同意が取り消されたら cleanup が呼ばれる）。
 * - この関数は DOM とトークンを引数で受け取るので、同意・DOM の無い環境（テスト・サーバー）でも安全。
 * - 取り消し後の注意: すでに動いた計測スクリプトの処理は、その画面を閉じる・読み直すまで止められない。
 *   取り消した後の画面読み込みからは読み込まれない（docs/launch/MONITORING.md）。
 */

export const CF_BEACON_SRC = 'https://static.cloudflareinsights.com/beacon.min.js';
export const CF_BEACON_ATTRIBUTE = 'data-make-money-analytics';

/** Cloudflare の発行するトークン（英数字）。形式が違うものは使わない。 */
const TOKEN_PATTERN = /^[A-Za-z0-9]{16,64}$/;

/**
 * 環境変数のトークンを検査して返す。未設定・形式違いは null（＝何も読み込まない）。
 * `process.env.NEXT_PUBLIC_…` はビルド時に埋め込まれるため、この書き方のまま残す。
 */
export function getAnalyticsToken(raw: string | undefined = process.env.NEXT_PUBLIC_CF_ANALYTICS_TOKEN): string | null {
  const token = raw?.trim();
  return token && TOKEN_PATTERN.test(token) ? token : null;
}

export interface AnalyticsDocument {
  head: { appendChild(node: unknown): unknown } | null;
  querySelector(selector: string): { remove(): void } | null;
  createElement(tag: 'script'): AnalyticsScriptElement;
}

export interface AnalyticsScriptElement {
  defer: boolean;
  src: string;
  setAttribute(name: string, value: string): void;
}

/** 計測スクリプトを 1 つだけ追加する。戻り値は取り除く関数。 */
export function insertBeacon(doc: AnalyticsDocument, token: string): () => void {
  if (!doc.head || doc.querySelector(`script[${CF_BEACON_ATTRIBUTE}]`)) return () => {};
  const script = doc.createElement('script');
  script.defer = true;
  script.src = CF_BEACON_SRC;
  script.setAttribute('data-cf-beacon', JSON.stringify({ token }));
  script.setAttribute(CF_BEACON_ATTRIBUTE, 'cloudflare-web-analytics');
  doc.head.appendChild(script);
  return () => {
    doc.querySelector(`script[${CF_BEACON_ATTRIBUTE}]`)?.remove();
  };
}

export type WhenAnalyticsAllowed = (start: () => void | (() => void)) => () => void;

/**
 * 同意があるときだけ計測スクリプトを読み込む。戻り値は購読の解除（コンポーネントの後始末に使う）。
 * トークンが無ければ購読も作らない。
 */
export function connectAnalytics(options: {
  whenAnalyticsAllowed: WhenAnalyticsAllowed;
  doc: AnalyticsDocument | null;
  token: string | null;
}): () => void {
  const { whenAnalyticsAllowed, doc, token } = options;
  if (!token || !doc) return () => {};
  return whenAnalyticsAllowed(() => insertBeacon(doc, token));
}
