import { afterEach, describe, expect, it, vi } from 'vitest';
import { closeEntityParam, dropQueryParam, openEntityParam, openLedgerEntityUrl, positionLabel } from './entityUrl';

describe('entity position label', () => {
  it('shows 1-based position with grouped total', () => {
    expect(positionLabel(8, 3085)).toBe('9 / 3,085');
  });
  it('returns undefined when the case is not in the list', () => {
    expect(positionLabel(-1, 3085)).toBeUndefined();
  });
});

// ブラウザの履歴を最小限まねる（積む・置き換える・戻る）
function fakeBrowser(startUrl: string, startState: unknown = null) {
  const entries: { url: string; state: unknown }[] = [{ url: startUrl, state: startState }];
  let index = 0;
  const parse = () => new URL(entries[index].url, 'http://localhost');
  vi.stubGlobal('window', {
    location: {
      get pathname() { return parse().pathname; },
      get search() { return parse().search; },
    },
    history: {
      get state() { return entries[index].state; },
      pushState(state: unknown, _title: string, url: string) {
        entries.splice(index + 1);
        entries.push({ url, state });
        index += 1;
      },
      replaceState(state: unknown, _title: string, url: string) {
        entries[index] = { url, state };
      },
      back() {
        if (index > 0) index -= 1;
      },
    },
  });
  return {
    urls: () => entries.map((entry) => entry.url),
    current: () => entries[index].url,
    back: () => { if (index > 0) index -= 1; },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('opening and closing a case keeps the history natural', () => {
  it('closing a case opened from the list returns to the list, so Back never reopens it', () => {
    const browser = fakeBrowser('/welcome');
    // 別のページ → 一覧 → 事例を開く → 閉じる
    (window.history as History).pushState(null, '', '/');
    openEntityParam('ent_a');
    expect(browser.current()).toBe('/?entity=ent_a');
    closeEntityParam();
    expect(browser.current()).toBe('/');
    // 閉じたあとに戻ると、事例ではなく前のページへ戻る
    browser.back();
    expect(browser.current()).toBe('/welcome');
  });

  it('switching cases while one is open replaces the entry instead of stacking history', () => {
    const browser = fakeBrowser('/');
    openEntityParam('ent_a');
    openEntityParam('ent_b');
    expect(browser.urls()).toEqual(['/', '/?entity=ent_b']);
    closeEntityParam();
    expect(browser.current()).toBe('/');
  });

  it('closing a case opened from a shared link removes it from the URL without adding history', () => {
    const browser = fakeBrowser('/?entity=ent_a');
    closeEntityParam();
    expect(browser.urls()).toEqual(['/']);
  });

  it('opening from another view goes to the list with the case, and closing stays on the list', () => {
    const browser = fakeBrowser('/?mode=ARCHETYPES');
    openLedgerEntityUrl('ent_a');
    expect(browser.current()).toBe('/?entity=ent_a');
    closeEntityParam();
    expect(browser.urls()).toEqual(['/?mode=ARCHETYPES', '/']);
  });

  it('opening from the command palette on the list behaves like opening from the list', () => {
    const browser = fakeBrowser('/');
    openLedgerEntityUrl('ent_a');
    closeEntityParam();
    expect(browser.urls()).toEqual(['/', '/?entity=ent_a']);
    expect(browser.current()).toBe('/');
  });

  it('removing another query keeps the mark, so closing still returns to the list', () => {
    const browser = fakeBrowser('/');
    openEntityParam('ent_a');
    (window.history as History).replaceState({ mmOpenedFromList: true }, '', '/?entity=ent_a&pro=1');
    dropQueryParam('pro');
    expect(browser.current()).toBe('/?entity=ent_a');
    closeEntityParam();
    expect(browser.current()).toBe('/');
  });
});
