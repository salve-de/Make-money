import { describe, expect, it, vi } from 'vitest';
import { CONSENT_STORAGE_KEY, createConsentStore, parseConsent, UNDECIDED_CONSENT } from './consent';

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  };
}

const fixedNow = () => new Date('2026-10-06T00:00:00.000Z');

describe('parseConsent', () => {
  it('空・壊れた値・古い版・型違いは未選択（同意なし）に戻す', () => {
    expect(parseConsent(null)).toEqual(UNDECIDED_CONSENT);
    expect(parseConsent('')).toEqual(UNDECIDED_CONSENT);
    expect(parseConsent('{oops')).toEqual(UNDECIDED_CONSENT);
    expect(parseConsent('null')).toEqual(UNDECIDED_CONSENT);
    expect(parseConsent(JSON.stringify({ v: 0, analytics: true }))).toEqual(UNDECIDED_CONSENT);
    expect(parseConsent(JSON.stringify({ v: 1, analytics: 'yes' }))).toEqual(UNDECIDED_CONSENT);
  });

  it('正しい値は選択済みとして読む', () => {
    expect(parseConsent(JSON.stringify({ v: 1, analytics: true, at: '2026-10-06T00:00:00.000Z' }))).toEqual({
      decided: true,
      analytics: true,
      decidedAt: '2026-10-06T00:00:00.000Z',
    });
    expect(parseConsent(JSON.stringify({ v: 1, analytics: false, at: 'not-a-date' }))).toEqual({ decided: true, analytics: false, decidedAt: null });
  });
});

describe('createConsentStore', () => {
  it('初期状態は未選択で、解析は許可されない', () => {
    const store = createConsentStore({ getStorage: () => memoryStorage() });
    expect(store.getConsent()).toEqual(UNDECIDED_CONSENT);
    expect(store.hasAnalyticsConsent()).toBe(false);
  });

  it('同意すると 1 つのキーに保存され、読み戻せる', () => {
    const storage = memoryStorage();
    const store = createConsentStore({ getStorage: () => storage, now: fixedNow });
    store.setConsent(true);
    expect([...storage.data.keys()]).toEqual([CONSENT_STORAGE_KEY]);
    expect(store.hasAnalyticsConsent()).toBe(true);
    // 別のストアでも同じ保存値から復元できる
    const reloaded = createConsentStore({ getStorage: () => storage });
    expect(reloaded.getConsent()).toEqual({ decided: true, analytics: true, decidedAt: '2026-10-06T00:00:00.000Z' });
  });

  it('「必須のみ」は選択済みだが解析は許可されない', () => {
    const store = createConsentStore({ getStorage: () => memoryStorage(), now: fixedNow });
    store.setConsent(false);
    expect(store.getConsent().decided).toBe(true);
    expect(store.hasAnalyticsConsent()).toBe(false);
  });

  it('resetConsent で保存値が消え、未選択に戻る', () => {
    const storage = memoryStorage();
    const store = createConsentStore({ getStorage: () => storage });
    store.setConsent(true);
    store.resetConsent();
    expect(storage.data.size).toBe(0);
    expect(store.getConsent()).toEqual(UNDECIDED_CONSENT);
    expect(store.hasAnalyticsConsent()).toBe(false);
  });

  it('保存できない環境（取得が null・例外）でもメモリで状態を保ち、例外を出さない', () => {
    const noStorage = createConsentStore({ getStorage: () => null, now: fixedNow });
    expect(() => noStorage.setConsent(true)).not.toThrow();
    expect(noStorage.hasAnalyticsConsent()).toBe(true);

    const throwing = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('quota');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    };
    const store = createConsentStore({ getStorage: () => throwing, now: fixedNow });
    expect(store.getConsent()).toEqual(UNDECIDED_CONSENT);
    expect(() => store.setConsent(false)).not.toThrow();
    expect(store.getConsent().decided).toBe(true);
    expect(() => store.resetConsent()).not.toThrow();
    expect(store.getConsent()).toEqual(UNDECIDED_CONSENT);

    const getterThrows = createConsentStore({
      getStorage: () => {
        throw new Error('SecurityError');
      },
    });
    expect(getterThrows.getConsent()).toEqual(UNDECIDED_CONSENT);
    expect(() => getterThrows.setConsent(true)).not.toThrow();
  });

  it('onConsentChange は変更を通知し、解除後は通知しない。購読者の例外は他に影響しない', () => {
    const store = createConsentStore({ getStorage: () => memoryStorage(), now: fixedNow });
    const listener = vi.fn();
    const broken = vi.fn(() => {
      throw new Error('boom');
    });
    store.onConsentChange(broken);
    const off = store.onConsentChange(listener);
    store.setConsent(true);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenLastCalledWith({ decided: true, analytics: true, decidedAt: '2026-10-06T00:00:00.000Z' });
    off();
    store.setConsent(false);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('whenAnalyticsAllowed は同意前に開始せず、同意で開始し、取り消しで後始末する', () => {
    const store = createConsentStore({ getStorage: () => memoryStorage(), now: fixedNow });
    const cleanup = vi.fn();
    const start = vi.fn(() => cleanup);
    const stop = store.whenAnalyticsAllowed(start);
    expect(start).not.toHaveBeenCalled();

    store.setConsent(false);
    expect(start).not.toHaveBeenCalled();

    store.setConsent(true);
    expect(start).toHaveBeenCalledTimes(1);
    store.setConsent(true);
    expect(start).toHaveBeenCalledTimes(1);

    store.setConsent(false);
    expect(cleanup).toHaveBeenCalledTimes(1);

    store.setConsent(true);
    expect(start).toHaveBeenCalledTimes(2);
    stop();
    expect(cleanup).toHaveBeenCalledTimes(2);
  });

  it('whenAnalyticsAllowed は既に同意済みなら購読時に開始する', () => {
    const storage = memoryStorage({ [CONSENT_STORAGE_KEY]: JSON.stringify({ v: 1, analytics: true, at: '2026-10-06T00:00:00.000Z' }) });
    const store = createConsentStore({ getStorage: () => storage });
    const start = vi.fn();
    store.whenAnalyticsAllowed(start);
    expect(start).toHaveBeenCalledTimes(1);
  });

  it('同意設定の再表示要求を購読者に届ける', () => {
    const store = createConsentStore({ getStorage: () => memoryStorage() });
    const listener = vi.fn();
    const off = store.onConsentReopenRequest(listener);
    store.requestConsentReopen();
    expect(listener).toHaveBeenCalledTimes(1);
    off();
    store.requestConsentReopen();
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
