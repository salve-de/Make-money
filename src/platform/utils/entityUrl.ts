/**
 * 事例の詳細を開いている間は URL に ?entity=<id> を残す（共有でき、戻るで一覧へ戻れる）。
 * すでに同じ URL なら履歴を積まない。
 */
export function syncEntityParam(id: string | null, method: 'push' | 'replace' = 'push'): void {
  const params = new URLSearchParams(window.location.search);
  if (id) params.set('entity', id);
  else params.delete('entity');
  const query = params.toString();
  const nextUrl = `${window.location.pathname}${query ? `?${query}` : ''}`;
  const currentUrl = `${window.location.pathname}${window.location.search}`;
  if (nextUrl === currentUrl) return;
  if (method === 'push') window.history.pushState(null, '', nextUrl);
  else window.history.replaceState(null, '', nextUrl);
}

/** URL から指定のクエリを取り除く（履歴は積まない）。 */
export function dropQueryParam(name: string): void {
  const params = new URLSearchParams(window.location.search);
  if (!params.has(name)) return;
  params.delete(name);
  const query = params.toString();
  window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
}

/** 一覧以外（コマンドパレットなど）から事例を開くとき、台帳の URL（/?entity=<id>）へ切り替える。 */
export function openLedgerEntityUrl(id: string): void {
  const params = new URLSearchParams(window.location.search);
  params.delete('mode');
  params.delete('topic');
  params.delete('q');
  params.set('entity', id);
  const nextUrl = `/?${params.toString()}`;
  if (nextUrl !== `${window.location.pathname}${window.location.search}`) window.history.pushState(null, '', nextUrl);
}

/** 詳細見出しに出す「9 / 3,085」形式の位置。見つからなければ undefined。 */
export function positionLabel(index: number, total: number): string | undefined {
  return index >= 0 ? `${(index + 1).toLocaleString('ja-JP')} / ${total.toLocaleString('ja-JP')}` : undefined;
}
