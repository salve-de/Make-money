'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CircleUserRound, LogOut } from 'lucide-react';
import { ACCOUNT_PATH } from '@/platform/components/navigation/navigationItems';
import { useAuth } from '@/context/AuthContext';
import { auth } from '@/lib/firebase/client';
import { AuthModal } from './AuthModal';

export const ACCOUNT_HREF = ACCOUNT_PATH;

function planLabel(isPro: boolean): string {
  return isPro ? 'PRO' : '無料プラン';
}

/**
 * PC ヘッダー右端のアカウント欄。未ログインなら「ログイン」、ログイン中ならメールアドレスを押すと
 * プラン・会員設定・ログアウトが出る。ログインの仕組みが無い環境（設定未完了）では何も出さない。
 */
export const HeaderUserMenu: React.FC = () => {
  const { user, loading, isPro, signOut } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!auth || loading) return null;

  if (!user) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowAuth(true)}
          className="flex h-full items-center border-l border-term-line px-3 text-[13px] text-term-fg hover:bg-term-head"
        >
          ログイン
        </button>
        <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
      </>
    );
  }

  const handleSignOut = async () => {
    setSigningOut(true);
    setSignOutError(false);
    try {
      await signOut();
      setOpen(false);
      router.refresh();
    } catch {
      setSignOutError(true);
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div ref={rootRef} className="relative flex h-full border-l border-term-line">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-label={`アカウント（${user.email ?? 'ログイン中'}）`}
        onClick={() => setOpen((value) => !value)}
        className={`flex h-full max-w-56 items-center gap-1.5 px-3 text-[13px] hover:bg-term-head ${open ? 'bg-term-head text-term-fg-strong' : 'text-term-fg'}`}
      >
        <CircleUserRound aria-hidden="true" size={16} strokeWidth={1.8} className="shrink-0 text-term-muted" />
        <span className="truncate">{user.email ?? 'アカウント'}</span>
      </button>
      {open && (
        <div aria-label="アカウント" className="absolute right-0 top-full z-50 w-64 border border-term-line bg-term-panel shadow-lg">
          <div className="border-b border-term-line px-3 py-2">
            <p className="truncate text-[13px] text-term-fg-strong">{user.email}</p>
            <p className="mt-0.5 text-xs text-term-label">
              プラン <span className={isPro ? 'text-term-accent' : 'text-term-fg'}>{planLabel(isPro)}</span>
            </p>
          </div>
          <Link
            href={ACCOUNT_HREF}
            prefetch={false}
            onClick={() => setOpen(false)}
            className="flex h-8 items-center border-b border-term-line-soft px-3 text-[13px] text-term-fg hover:bg-term-head"
          >
            会員設定
          </Link>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            disabled={signingOut}
            className="flex h-8 w-full items-center gap-2 px-3 text-left text-[13px] text-term-fg hover:bg-term-head disabled:opacity-50"
          >
            <LogOut aria-hidden="true" size={14} strokeWidth={1.8} className="text-term-muted" />
            {signingOut ? 'ログアウトしています…' : 'ログアウト'}
          </button>
          {signOutError && <p role="alert" className="border-t border-term-line px-3 py-2 text-xs text-term-danger">ログアウトできませんでした。もう一度お試しください。</p>}
        </div>
      )}
    </div>
  );
};

/**
 * スマホの引き出しメニュー上部のアカウント欄。ログイン中だけ、メールとプラン・ログアウトを出す。
 * 会員設定・ログイン・新規登録の行は、PC の「その他」と同じ一覧（navigationItems の MORE_MENU_ITEMS）に出る。
 */
export const DrawerUserMenu: React.FC<{ onNavigate: () => void }> = ({ onNavigate }) => {
  const { user, loading, isPro, signOut } = useAuth();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState(false);

  if (!auth || loading || !user) return null;

  const handleSignOut = async () => {
    setSigningOut(true);
    setSignOutError(false);
    try {
      await signOut();
      onNavigate();
      router.refresh();
    } catch {
      setSignOutError(true);
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="border-b border-term-line">
      <div className="px-4 pb-1 pt-3">
        <p className="truncate text-sm text-term-fg-strong">{user.email}</p>
        <p className="mt-0.5 text-xs text-term-label">
          プラン <span className={isPro ? 'text-term-accent' : 'text-term-fg'}>{planLabel(isPro)}</span>
        </p>
      </div>
      <button type="button" onClick={() => void handleSignOut()} disabled={signingOut} className="flex min-h-11 w-full items-center gap-3 px-4 text-left text-base text-term-fg hover:bg-term-head disabled:opacity-50">
        <LogOut aria-hidden="true" size={20} strokeWidth={1.8} className="shrink-0 text-term-muted" />
        <span className="flex-1">{signingOut ? 'ログアウトしています…' : 'ログアウト'}</span>
      </button>
      {signOutError && <p role="alert" className="px-4 pb-3 text-sm text-term-danger">ログアウトできませんでした。もう一度お試しください。</p>}
    </div>
  );
};
