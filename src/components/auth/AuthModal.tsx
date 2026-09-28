"use client";

import { useModalFocus } from '@/platform/hooks/useModalFocus';

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: "signin" | "signup";
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  defaultMode = "signin",
}) => {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const [isSignUp, setIsSignUp] = useState(defaultMode === "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { dialogRef, onKeyDown } = useModalFocus(isOpen, onClose);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    try {
      setError(null);
      setLoading(true);
      await signInWithGoogle();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "認証に失敗しました";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("メールアドレスとパスワードを入力してください");
      return;
    }

    try {
      setError(null);
      setLoading(true);
      if (isSignUp) {
        await signUpWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "認証に失敗しました";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-3">
      <div
        role="dialog" aria-modal="true" aria-labelledby="auth-title"
        ref={dialogRef} onKeyDown={onKeyDown}
        className="relative max-h-[90dvh] w-full max-w-md overflow-y-auto border border-term-line bg-term-panel text-term-fg shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="term-panel-title">
          <h2 id="auth-title" className="term-panel-name text-xs">{isSignUp ? "アカウント作成" : "ログイン"}</h2>
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
          <div className="mb-4 border border-term-danger p-2.5 text-xs leading-relaxed text-term-danger">
            {error}
          </div>
        )}

        {/* Googleログイン */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="flex min-h-11 w-full cursor-pointer items-center justify-center gap-2.5 rounded-sm border border-term-line bg-transparent px-4 text-sm text-term-fg hover:bg-term-head disabled:opacity-50"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
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
        <form onSubmit={handleEmailSubmit} className="space-y-3">
          <div>
            <label htmlFor="auth-email" className="mb-1 block text-xs text-term-label">
              メールアドレス
            </label>
            <div>
              <input
                id="auth-email" autoComplete="email" type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="founder@example.com"
                required
                className="min-h-11 w-full rounded-sm border border-term-line bg-term-bg px-3 text-sm text-term-fg placeholder:text-term-dim focus:border-term-muted focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="auth-password" className="mb-1 block text-xs text-term-label">
              パスワード
            </label>
            <input
              id="auth-password" autoComplete={isSignUp ? "new-password" : "current-password"} type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="min-h-11 w-full rounded-sm border border-term-line bg-term-bg px-3 text-sm text-term-fg placeholder:text-term-dim focus:border-term-muted focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex min-h-11 w-full cursor-pointer items-center justify-center rounded-sm border border-term-accent text-sm font-semibold text-term-accent hover:bg-term-head disabled:opacity-50"
          >
            {loading ? "処理中..." : isSignUp ? "登録を完了する" : "ログイン"}
          </button>
        </form>

        {/* 切り替え */}
        <div className="mt-4 border-t border-term-line pt-3 text-center text-xs text-term-label">
          {isSignUp ? (
            <span>
              アカウントをお持ちですか？{" "}
              <button
                type="button"
                onClick={() => setIsSignUp(false)}
                className="ml-1 inline-flex min-h-11 cursor-pointer items-center text-term-fg underline hover:text-term-fg-strong"
              >
                ログイン
              </button>
            </span>
          ) : (
            <span>
              アカウントをお持ちでないですか？{" "}
              <button
                type="button"
                onClick={() => setIsSignUp(true)}
                className="ml-1 inline-flex min-h-11 cursor-pointer items-center text-term-fg underline hover:text-term-fg-strong"
              >
                新規登録
              </button>
            </span>
          )}
        </div>
        </div>
      </div>
    </div>
  );
};
