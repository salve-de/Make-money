/**
 * 掲載に載せる URL の簡易検査。保存時と、運営者が承認する時の両方で使う。
 * https のみ。認証情報つき、ローカル、プライベート・リンクローカルの宛先、IP の直書きは拒否する。
 * 通ったものは URL として正規化した文字列を返し、空欄は null（任意の欄用）、不正は false を返す。
 */
export function validListingUrl(value: unknown, required: boolean): string | null | false {
  if (typeof value !== 'string' || !value.trim()) return required ? false : null;
  const raw = value.trim();
  if (raw.length > 2048) return false;
  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase().replace(/\.$/, '');
    const ipLiteral = host.startsWith('[') || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host);
    if (url.protocol !== 'https:' || url.username || url.password || !host || ipLiteral || host === 'localhost'
      || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal') || host === '::1'
      || /^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host)
      || /^169\.254\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;
    return url.toString();
  } catch {
    return false;
  }
}
