/** 一覧から事例を開いた履歴に付ける印。閉じるときは、この履歴を「戻る」で消す。 */
const OPENED_FROM_LIST = 'mmOpenedFromList';

function urlWith(params: URLSearchParams, pathname = window.location.pathname): string {
  const query = params.toString();
  return `${pathname}${query ? `?${query}` : ''}`;
}

function currentUrl(): string {
  return `${window.location.pathname}${window.location.search}`;
}

function openedFromList(): boolean {
  const state: unknown = window.history.state;
  return Boolean(state && typeof state === 'object' && (state as Record<string, unknown>)[OPENED_FROM_LIST]);
}

// Next.js の内部状態（__NA など）は渡さない。渡すと URL の変化がルーターに伝わらないため、自分の印だけを渡す。
const markedState = (marked: boolean) => (marked ? { [OPENED_FROM_LIST]: true } : null);

/**
 * 事例を開き、URL に ?entity=<id> を残す（共有でき、再読み込みしても同じ事例が開く）。
 * 一覧から開くときだけ履歴を1つ積み、開いたまま別の事例へ移るときは置き換える。これで「戻る」は一覧へ戻る。
 */
export function openEntityParam(id: string): void {
  const params = new URLSearchParams(window.location.search);
  const switching = params.has('entity');
  params.set('entity', id);
  const nextUrl = urlWith(params);
  if (nextUrl === currentUrl()) return;
  if (switching) window.history.replaceState(markedState(openedFromList()), '', nextUrl);
  else window.history.pushState(markedState(true), '', nextUrl);
}

/**
 * 事例を閉じる。一覧から開いた履歴なら「戻る」でその履歴を消し、共有リンクなどで直接開いた場合は URL から外すだけにする。
 * どちらも新しい履歴を積まないので、閉じたあとに「戻る」を押しても閉じた事例が再び開かない。
 */
export function closeEntityParam(): void {
  const params = new URLSearchParams(window.location.search);
  if (!params.has('entity')) return;
  if (openedFromList()) {
    window.history.back();
    return;
  }
  params.delete('entity');
  window.history.replaceState(null, '', urlWith(params));
}

/** URL から指定のクエリを取り除く（履歴は積まない）。 */
export function dropQueryParam(name: string): void {
  const params = new URLSearchParams(window.location.search);
  if (!params.has(name)) return;
  params.delete(name);
  window.history.replaceState(markedState(openedFromList()), '', urlWith(params));
}

/** コマンドパレットなどから事例を開くとき、台帳の URL（/?entity=<id>）へ切り替える。台帳の一覧にいるときは一覧から開くのと同じ扱い。 */
export function openLedgerEntityUrl(id: string): void {
  const current = new URLSearchParams(window.location.search);
  if (window.location.pathname === '/' && !current.has('mode') && !current.has('topic')) {
    openEntityParam(id);
    return;
  }
  const params = new URLSearchParams(current);
  params.delete('mode');
  params.delete('topic');
  params.delete('q');
  params.set('entity', id);
  const nextUrl = urlWith(params, '/');
  if (nextUrl !== currentUrl()) window.history.pushState(null, '', nextUrl);
}

/** 詳細見出しに出す「9 / 3,085」形式の位置。見つからなければ undefined。 */
export function positionLabel(index: number, total: number): string | undefined {
  return index >= 0 ? `${(index + 1).toLocaleString('ja-JP')} / ${total.toLocaleString('ja-JP')}` : undefined;
}
