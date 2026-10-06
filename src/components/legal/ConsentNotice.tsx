'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { getConsent, onConsentChange, onConsentReopenRequest, setConsent } from '@/lib/legal/consent';

const BUTTON_CLASS =
  'min-h-11 min-w-28 flex-1 cursor-pointer lg:flex-none rounded-sm border border-term-line bg-term-panel px-3 text-sm text-term-fg-strong hover:bg-term-head lg:min-h-8';

/**
 * 同意の選択バー。props なしで置ける。
 * - 必須の保存（ログイン・決済・画面状態）は同意不要。ここで聞くのは、将来入れる解析・計測だけ。
 * - 「同意する」と「必須のみ」は同じ見た目で並べる（どちらかへ誘導しない）。
 * - 選択前は画面を止めない（モーダルにしない）。
 */
/** 保存状態を文字列にして購読する（オブジェクトを返すと毎回「変化」と見なされるため）。 */
type Snapshot = 'server' | 'undecided' | 'granted' | 'essential';

function readSnapshot(): Snapshot {
  const state = getConsent();
  if (!state.decided) return 'undecided';
  return state.analytics ? 'granted' : 'essential';
}

export function ConsentNotice() {
  const snapshot = useSyncExternalStore<Snapshot>(onConsentChange, readSnapshot, () => 'server');
  const [reopened, setReopened] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  // 保存状態を読む前（サーバー描画・最初の描画）は何も出さない。選択前の表示は 'undecided'。
  const open = snapshot !== 'server' && (snapshot === 'undecided' || reopened);
  const analytics = snapshot === 'granted';

  useEffect(
    () =>
      onConsentReopenRequest(() => {
        const active = document.activeElement;
        returnFocusRef.current = active instanceof HTMLElement && active !== document.body ? active : null;
        setReopened(true);
      }),
    [],
  );

  // 再表示のときだけ、見出しへフォーカスを移して読み上げる。初回表示では操作を奪わない。
  useEffect(() => {
    if (open && returnFocusRef.current) headingRef.current?.focus();
  }, [open]);

  const restoreFocus = useCallback(() => {
    const target = returnFocusRef.current;
    returnFocusRef.current = null;
    if (target?.isConnected) target.focus();
  }, []);

  const choose = useCallback(
    (value: boolean) => {
      setConsent(value);
      setReopened(false);
      restoreFocus();
    },
    [restoreFocus],
  );

  const onKeyDown = (event: React.KeyboardEvent) => {
    // 再表示したときだけ Esc で閉じられる。閉じるだけで、選択は変えない。
    if (event.key === 'Escape' && reopened) {
      setReopened(false);
      restoreFocus();
    }
  };

  if (!open) return null;

  return (
    <section
      role="region"
      aria-labelledby="consent-title"
      onKeyDown={onKeyDown}
      className="fixed inset-x-0 bottom-[var(--term-nav-space)] z-50 border-t border-term-line bg-term-panel text-term-fg"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-2 lg:flex-row lg:items-center lg:justify-between lg:gap-3 lg:py-3">
        <div className="min-w-0 text-xs leading-5 lg:leading-6">
          <h2 id="consent-title" ref={headingRef} tabIndex={-1} className="text-sm font-semibold text-term-fg-strong outline-none">
            Cookie・端末保存の設定
          </h2>
          <p className="text-term-sub">
            ログインや画面の状態の保存は、同意なしで使います。アクセス解析は、同意した場合だけ行います。{reopened ? `現在は${analytics ? '同意済み' : '同意していない'}状態です。` : ''}
            <Link href="/legal/privacy" className="mx-0.5 underline hover:text-term-fg-strong">プライバシーポリシー</Link>
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button type="button" className={BUTTON_CLASS} onClick={() => choose(true)}>同意する</button>
          <button type="button" className={BUTTON_CLASS} onClick={() => choose(false)}>必須のみ</button>
        </div>
      </div>
    </section>
  );
}
