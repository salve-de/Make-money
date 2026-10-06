import { describe, expect, it, vi } from 'vitest';
import { createConsentStore } from '@/lib/legal/consent';
import { CF_BEACON_SRC, connectAnalytics, getAnalyticsToken, insertBeacon, type AnalyticsDocument, type AnalyticsScriptElement } from './analytics';

const TOKEN = '0123456789abcdef0123456789abcdef';

function fakeDocument() {
  const attached: AnalyticsScriptElement[] = [];
  const attributes = new Map<AnalyticsScriptElement, Record<string, string>>();
  const doc: AnalyticsDocument = {
    head: { appendChild: (node) => { attached.push(node as AnalyticsScriptElement); return node; } },
    querySelector: () => (attached.length ? { remove: () => { attached.pop(); } } : null),
    createElement: () => {
      const element: AnalyticsScriptElement = {
        defer: false,
        src: '',
        setAttribute: (name, value) => { attributes.set(element, { ...(attributes.get(element) ?? {}), [name]: value }); },
      };
      return element;
    },
  };
  return { doc, attached, attributes };
}

function memoryStorage() {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v); }, removeItem: (k: string) => { data.delete(k); } };
}

describe('getAnalyticsToken', () => {
  it('未設定・空・形式違いは null', () => {
    expect(getAnalyticsToken(undefined)).toBeNull();
    expect(getAnalyticsToken('')).toBeNull();
    expect(getAnalyticsToken('  ')).toBeNull();
    expect(getAnalyticsToken('short')).toBeNull();
    expect(getAnalyticsToken('"><script>alert(1)</script>0123456789')).toBeNull();
  });
  it('正しい形式なら返す', () => {
    expect(getAnalyticsToken(` ${TOKEN} `)).toBe(TOKEN);
  });
});

describe('insertBeacon', () => {
  it('Cloudflare の計測スクリプトを 1 つだけ追加し、取り除ける', () => {
    const { doc, attached, attributes } = fakeDocument();
    const remove = insertBeacon(doc, TOKEN);
    expect(attached).toHaveLength(1);
    expect(attached[0].src).toBe(CF_BEACON_SRC);
    expect(attached[0].defer).toBe(true);
    expect(JSON.parse(attributes.get(attached[0])?.['data-cf-beacon'] ?? '{}')).toEqual({ token: TOKEN });
    // 2 回目は追加しない
    insertBeacon(doc, TOKEN);
    expect(attached).toHaveLength(1);
    remove();
    expect(attached).toHaveLength(0);
  });
});

describe('connectAnalytics と同意', () => {
  it('同意前（未選択）は読み込まない', () => {
    const store = createConsentStore({ getStorage: memoryStorage });
    const { doc, attached } = fakeDocument();
    connectAnalytics({ whenAnalyticsAllowed: store.whenAnalyticsAllowed, doc, token: TOKEN });
    expect(attached).toHaveLength(0);
  });

  it('「必須のみ」を選んでも読み込まない', () => {
    const store = createConsentStore({ getStorage: memoryStorage });
    const { doc, attached } = fakeDocument();
    connectAnalytics({ whenAnalyticsAllowed: store.whenAnalyticsAllowed, doc, token: TOKEN });
    store.setConsent(false);
    expect(attached).toHaveLength(0);
  });

  it('同意した時に読み込み、取り消したら取り除く', () => {
    const store = createConsentStore({ getStorage: memoryStorage });
    const { doc, attached } = fakeDocument();
    connectAnalytics({ whenAnalyticsAllowed: store.whenAnalyticsAllowed, doc, token: TOKEN });
    store.setConsent(true);
    expect(attached).toHaveLength(1);
    store.setConsent(false);
    expect(attached).toHaveLength(0);
  });

  it('すでに同意済みなら、起動時に読み込む', () => {
    const storage = memoryStorage();
    createConsentStore({ getStorage: () => storage }).setConsent(true);
    const store = createConsentStore({ getStorage: () => storage });
    const { doc, attached } = fakeDocument();
    connectAnalytics({ whenAnalyticsAllowed: store.whenAnalyticsAllowed, doc, token: TOKEN });
    expect(attached).toHaveLength(1);
  });

  it('トークンが無ければ、同意があっても購読すら作らない', () => {
    const when = vi.fn(() => () => {});
    const { doc, attached } = fakeDocument();
    connectAnalytics({ whenAnalyticsAllowed: when, doc, token: null });
    expect(when).not.toHaveBeenCalled();
    expect(attached).toHaveLength(0);
  });

  it('DOM が無い環境（サーバー）では何もしない', () => {
    const when = vi.fn(() => () => {});
    connectAnalytics({ whenAnalyticsAllowed: when, doc: null, token: TOKEN });
    expect(when).not.toHaveBeenCalled();
  });
});
