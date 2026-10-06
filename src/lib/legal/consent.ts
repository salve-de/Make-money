/**
 * 同意状態の保存と通知。
 *
 * - 必須の保存（ログイン・決済・画面状態）は同意の対象外。ここで扱うのは「任意（解析・計測）」だけ。
 * - 同意前は解析・計測のスクリプトを読み込まない。読み込む側は必ず hasAnalyticsConsent() か
 *   onConsentChange() を通すこと。未選択（decided: false）は「同意なし」と同じに扱う。
 * - 保存先は localStorage の 1 キー。読み書きは try/catch で囲み、保存できない環境でも
 *   そのタブの間だけメモリで状態を保つ（画面は壊れない）。
 */

export const CONSENT_STORAGE_KEY = 'makemoney.consent.v1';
export const CONSENT_VERSION = 1;

export interface ConsentState {
  /** 利用者が一度でも選んだか。false の間は同意なしとして扱う。 */
  decided: boolean;
  /** アクセス解析・計測への同意。decided が false なら常に false。 */
  analytics: boolean;
  /** 選んだ日時（ISO 8601）。未選択は null。 */
  decidedAt: string | null;
}

export const UNDECIDED_CONSENT: ConsentState = Object.freeze({ decided: false, analytics: false, decidedAt: null });

export type ConsentListener = (state: ConsentState) => void;

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface ConsentStoreOptions {
  getStorage?: () => StorageLike | null;
  now?: () => Date;
}

export interface ConsentStore {
  getConsent(): ConsentState;
  setConsent(analytics: boolean): ConsentState;
  resetConsent(): ConsentState;
  hasAnalyticsConsent(): boolean;
  onConsentChange(listener: ConsentListener): () => void;
  requestConsentReopen(): void;
  onConsentReopenRequest(listener: () => void): () => void;
  /** 同意がある場合だけ処理を実行する。同意後に同意が取り消されたら cleanup を呼ぶ。 */
  whenAnalyticsAllowed(start: () => void | (() => void)): () => void;
}

/** 保存値を検証して ConsentState に直す。壊れた値・古い版は未選択に戻す（再度たずねる）。 */
export function parseConsent(raw: string | null): ConsentState {
  if (!raw) return UNDECIDED_CONSENT;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object') return UNDECIDED_CONSENT;
    const record = value as Record<string, unknown>;
    if (record.v !== CONSENT_VERSION || typeof record.analytics !== 'boolean') return UNDECIDED_CONSENT;
    const decidedAt = typeof record.at === 'string' && !Number.isNaN(Date.parse(record.at)) ? record.at : null;
    return { decided: true, analytics: record.analytics, decidedAt };
  } catch {
    return UNDECIDED_CONSENT;
  }
}

function sameState(a: ConsentState, b: ConsentState): boolean {
  return a.decided === b.decided && a.analytics === b.analytics && a.decidedAt === b.decidedAt;
}

function defaultStorage(): StorageLike | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function createConsentStore(options: ConsentStoreOptions = {}): ConsentStore {
  const getStorage = options.getStorage ?? defaultStorage;
  const now = options.now ?? (() => new Date());
  const listeners = new Set<ConsentListener>();
  const reopenListeners = new Set<() => void>();
  // 保存できない環境のための、このタブの間だけのメモリ上の状態。
  let memory: ConsentState = UNDECIDED_CONSENT;
  let storageEventAttached = false;

  const readStored = (): ConsentState | 'unavailable' => {
    try {
      const storage = getStorage();
      if (!storage) return 'unavailable';
      return parseConsent(storage.getItem(CONSENT_STORAGE_KEY));
    } catch {
      return 'unavailable';
    }
  };

  const getConsent = (): ConsentState => {
    const stored = readStored();
    if (stored === 'unavailable') return memory;
    // 保存値が正本。保存値が未選択でメモリに選択があるのは、書き込みに失敗した場合だけ。
    return stored.decided ? stored : memory;
  };

  const emit = (state: ConsentState) => {
    for (const listener of [...listeners]) {
      try {
        listener(state);
      } catch {
        // 1 つの購読者の失敗で他の購読者を止めない。
      }
    }
  };

  const write = (next: ConsentState): ConsentState => {
    memory = next;
    try {
      const storage = getStorage();
      if (storage) {
        if (next.decided) {
          storage.setItem(CONSENT_STORAGE_KEY, JSON.stringify({ v: CONSENT_VERSION, analytics: next.analytics, at: next.decidedAt }));
        } else {
          storage.removeItem(CONSENT_STORAGE_KEY);
        }
      }
    } catch {
      // 保存できなくても、このタブの間は memory で状態を保つ。
    }
    emit(next);
    return next;
  };

  const attachStorageEvent = () => {
    if (storageEventAttached || typeof window === 'undefined') return;
    storageEventAttached = true;
    // 別タブでの変更を反映する。
    window.addEventListener('storage', (event) => {
      if (event.key !== null && event.key !== CONSENT_STORAGE_KEY) return;
      const current = readStored();
      memory = current === 'unavailable' ? memory : current;
      emit(memory);
    });
  };

  const setConsent = (analytics: boolean): ConsentState =>
    write({ decided: true, analytics, decidedAt: now().toISOString() });

  const resetConsent = (): ConsentState => write(UNDECIDED_CONSENT);

  const onConsentChange = (listener: ConsentListener): (() => void) => {
    listeners.add(listener);
    attachStorageEvent();
    return () => {
      listeners.delete(listener);
    };
  };

  const whenAnalyticsAllowed = (start: () => void | (() => void)): (() => void) => {
    let cleanup: (() => void) | null = null;
    let running = false;
    const apply = (state: ConsentState) => {
      const allowed = state.decided && state.analytics;
      if (allowed && !running) {
        running = true;
        try {
          const result = start();
          cleanup = typeof result === 'function' ? result : null;
        } catch {
          running = false;
        }
      } else if (!allowed && running) {
        running = false;
        const stop = cleanup;
        cleanup = null;
        try {
          stop?.();
        } catch {
          // 停止処理の失敗は無視する。
        }
      }
    };
    const unsubscribe = onConsentChange(apply);
    apply(getConsent());
    return () => {
      unsubscribe();
      if (running) {
        running = false;
        try {
          cleanup?.();
        } catch {
          // 無視
        }
        cleanup = null;
      }
    };
  };

  const requestConsentReopen = () => {
    for (const listener of [...reopenListeners]) {
      try {
        listener();
      } catch {
        // 無視
      }
    }
  };

  const onConsentReopenRequest = (listener: () => void): (() => void) => {
    reopenListeners.add(listener);
    return () => {
      reopenListeners.delete(listener);
    };
  };

  return {
    getConsent,
    setConsent,
    resetConsent,
    hasAnalyticsConsent: () => {
      const state = getConsent();
      return state.decided && state.analytics;
    },
    onConsentChange,
    requestConsentReopen,
    onConsentReopenRequest,
    whenAnalyticsAllowed,
  };
}

const defaultStore = createConsentStore();

export const getConsent = defaultStore.getConsent;
export const setConsent = defaultStore.setConsent;
export const resetConsent = defaultStore.resetConsent;
export const hasAnalyticsConsent = defaultStore.hasAnalyticsConsent;
export const onConsentChange = defaultStore.onConsentChange;
export const requestConsentReopen = defaultStore.requestConsentReopen;
export const onConsentReopenRequest = defaultStore.onConsentReopenRequest;
export const whenAnalyticsAllowed = defaultStore.whenAnalyticsAllowed;
export { sameState as isSameConsentState };
