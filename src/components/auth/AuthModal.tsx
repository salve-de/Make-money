"use client";

import { useModalFocus } from '@/platform/hooks/useModalFocus';

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { authErrorMessage } from "./authErrors";

type AuthMode = "signin" | "signup" | "reset";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: "signin" | "signup";
}

const TITLES: Record<AuthMode, string> = {
  signin: "ログイン",
  signup: "アカウント作成",
  reset: "パスワードの再設定",
};

const INPUT = "min-h-11 w-full rounded-sm border border-term-line bg-term-bg px-3 text-sm text-term-fg placeholder:text-term-dim focus:border-term-muted focus:outline-none";
const PRIMARY = "mt-2 flex min-h-11 w-full cursor-pointer items-center justify-center rounded-sm border border-term-accent text-sm font-semibold text-term-accent hover:bg-term-head disabled:cursor-wait disabled:opacity-50";
const TEXT_LINK = "inline-flex min-h-11 cursor-pointer items-center text-term-fg underline underline-offset-2 hover:text-term-fg-strong lg:min-h-6";

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  defaultMode = "signin",
}) => {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, sendPasswordReset } = useAuth();
  const [mode, setMode] = useState<AuthMode>(defaultMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // 開き直すたびに、呼び出し元が指定した入口（ログイン／新規登録）から始める
  const [openedFor, setOpenedFor] = useState<{ isOpen: boolean; defaultMode: string }>({ isOpen, defaultMode });
  if (openedFor.isOpen !== isOpen || openedFor.defaultMode !== defaultMode) {
    setOpenedFor({ isOpen, defaultMode });
    if (isOpen) {
      setMode(defaultMode);
      setError(null);
      setNotice(null);
      setPassword("");
    }
  }

  const { dialogRef, onKeyDown } = useModalFocus(isOpen, onClose);

  if (!isOpen) return null;

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setError(null);
    setNotice(null);
  };

  const handleGoogleSignIn = async () => {
    try {
      setError(null);
      setLoading(true);
      await signInWithGoogle();
      onClose();
    } catch (err: unknown) {
      setError(authErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("メールアドレスとパスワードを入力してください。");
      return;
    }

    try {
      setError(null);
      setLoading(true);
      if (mode === "signup") {
        await signUpWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
      onClose();
    } catch (err: unknown) {
      setError(authErrorMessage(err, mode === "signup" ? "登録できませんでした。もう一度試してください。" : undefined));
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = email.trim();
    if (!target) {
      setError("登録したメールアドレスを入力してください。");
      return;
    }
    try {
      setError(null);
      setNotice(null);
      setLoading(true);
      await sendPasswordReset(target);
      setNotice(`${target} あてに、パスワードを決め直すためのメールを送りました。登録済みのアドレスであれば数分以内に届きます。届かないときは迷惑メールのフォルダも確認してください。`);
    } catch (err: unknown) {
      setError(authErrorMessage(err, "メールを送れませんでした。時間をおいて、もう一度試してください。"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center whitespace-normal bg-black/70 p-3">
      <div
        role="dialog" aria-modal="true" aria-labelledby="auth-title"
        ref={dialogRef} onKeyDown={onKeyDown}
        className="relative max-h-[90dvh] w-full max-w-md overflow-y-auto border border-term-line bg-term-panel text-term-fg shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="term-panel-title">
          <h2 id="auth-title" className="term-panel-name text-xs">{TITLES[mode]}</h2>
          <button
            type="button" aria-label="ログイン画面を閉じる"
            onClick={onClose}
            className="ml-auto flex min-h-11 items-center px-2 text-xs text-term-muted hover:text-term-fg-strong lg:min-h-6"
          >
            閉じる
          </button>
        </div>
        <div className="p-4">

        {/* エラー表示 */}
        {error && (
          <div role="alert" className="mb-4 border border-term-danger p-2.5 text-xs leading-relaxed text-term-danger [overflow-wrap:anywhere]">
            {error}
          </div>
        )}

        {mode === "reset" ? (
          <>
            <p className="mb-3 text-sm leading-6 text-term-sub">
              登録したメールアドレスに、新しいパスワードを決めるためのリンクを送ります。
            </p>
            {notice && (
              <p role="status" className="mb-4 border border-term-line p-2.5 text-xs leading-relaxed text-term-fg [overflow-wrap:anywhere]">
                {notice}
              </p>
            )}
            <form onSubmit={handleResetSubmit} className="space-y-3" noValidate>
              <div>
                <label htmlFor="auth-reset-email" className="mb-1 block text-xs text-term-label">
                  メールアドレス
                </label>
                <input
                  id="auth-reset-email" autoComplete="email" type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="founder@example.com"
                  required
                  className={INPUT}
                />
              </div>
              <button type="submit" disabled={loading} className={PRIMARY}>
                {loading ? "送信しています…" : notice ? "もう一度送る" : "再設定メールを送る"}
              </button>
            </form>
            <div className="mt-4 border-t border-term-line pt-3 text-center text-xs text-term-label">
              <button type="button" onClick={() => switchMode("signin")} className={TEXT_LINK}>
                ログインに戻る
              </button>
            </div>
          </>
        ) : (
          <>
        {/* Googleログイン */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="flex min-h-11 w-full cursor-pointer items-center justify-center gap-2.5 rounded-sm border border-term-line bg-transparent px-4 text-sm text-term-fg hover:bg-term-head disabled:opacity-50"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#EA4335"
              d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
            />
            <path
              fill="#4285F4"
              d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
            />
            <path
              fill="#FBBC05"
              d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12 0 14.8s.7 5.1 1.9 7.5l3.7-2.9z"
            />
            <path
              fill="#34A853"
              d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2-6.4-4.8L1.9 16.9C3.7 20.6 7.5 23.5 12 23.5z"
            />
          </svg>
          Googleで続ける
        </button>

        {/* 区切り線 */}
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-term-line" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-term-panel px-2 text-term-label">またはメールアドレス</span>
          </div>
        </div>

        {/* メールログインフォーム */}
        <form onSubmit={handleEmailSubmit} className="space-y-3" noValidate>
          <div>
            <label htmlFor="auth-email" className="mb-1 block text-xs text-term-label">
              メールアドレス
            </label>
            <input
              id="auth-email" autoComplete="email" type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="founder@example.com"
              required
              className={INPUT}
            />
          </div>

          <div>
            <div className="mb-1 flex items-end justify-between gap-2">
              <label htmlFor="auth-password" className="block text-xs text-term-label">
                パスワード{mode === "signup" && <span className="ml-1">（6文字以上）</span>}
              </label>
              {mode === "signin" && (
                <button type="button" onClick={() => switchMode("reset")} className="inline-flex min-h-11 items-center text-xs text-term-sub underline underline-offset-2 hover:text-term-fg-strong lg:min-h-6">
                  パスワードを忘れた
                </button>
              )}
            </div>
            <input
              id="auth-password" autoComplete={mode === "signup" ? "new-password" : "current-password"} type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={mode === "signup" ? 6 : undefined}
              className={INPUT}
            />
          </div>

          <button type="submit" disabled={loading} className={PRIMARY}>
            {loading ? "処理しています…" : mode === "signup" ? "登録を完了する" : "ログイン"}
          </button>
        </form>

        {/* 切り替え */}
        <div className="mt-4 border-t border-term-line pt-3 text-center text-xs text-term-label">
          {mode === "signup" ? (
            <span>
              アカウントをお持ちですか？{" "}
              <button type="button" onClick={() => switchMode("signin")} className={`ml-1 ${TEXT_LINK}`}>
                ログイン
              </button>
            </span>
          ) : (
            <span>
              アカウントをお持ちでないですか？{" "}
              <button type="button" onClick={() => switchMode("signup")} className={`ml-1 ${TEXT_LINK}`}>
                新規登録
              </button>
            </span>
          )}
        </div>
          </>
        )}
        </div>
      </div>
    </div>
  );
};
