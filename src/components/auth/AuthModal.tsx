"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { X, Lock, Mail, ArrowRight } from "lucide-react";

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div
        className="relative w-full max-w-md bg-[#0D0E12] border border-zinc-800 rounded-xl shadow-2xl p-6 text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 閉じるボタン */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-200 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* ヘッダー */}
        <div className="mb-6 text-center">
          <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-3">
            <Lock className="w-5 h-5 text-zinc-300" />
          </div>
          <h2 className="text-lg font-semibold tracking-tight text-white">
            {isSignUp ? "金鉱録 アカウント作成" : "金鉱録 ログイン"}
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            {isSignUp
              ? "高収益ビジネス台帳の保存・PRO機能を利用するための登録"
              : "保存した財務台帳や非公開インサイトにアクセス"}
          </p>
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="mb-4 p-2.5 bg-red-950/40 border border-red-800/50 rounded-lg text-xs text-red-300 leading-relaxed">
            {error}
          </div>
        )}

        {/* Googleログイン */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 rounded-lg text-xs font-medium text-white transition-all disabled:opacity-50 cursor-pointer"
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
            <div className="w-full border-t border-zinc-800" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase">
            <span className="bg-[#0D0E12] px-2 text-zinc-500 font-mono">またはメールアドレス</span>
          </div>
        </div>

        {/* メールログインフォーム */}
        <form onSubmit={handleEmailSubmit} className="space-y-3">
          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1">
              メールアドレス
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="founder@example.com"
                required
                className="w-full bg-zinc-900/90 border border-zinc-800 rounded-lg pl-8 pr-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors"
              />
              <Mail className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1">
              パスワード
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full bg-zinc-900/90 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 px-4 bg-white hover:bg-zinc-200 text-black font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            {loading ? "処理中..." : isSignUp ? "登録を完了する" : "ログイン"}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* 切り替え */}
        <div className="mt-4 pt-3 border-t border-zinc-900 text-center text-xs text-zinc-500">
          {isSignUp ? (
            <span>
              アカウントをお持ちですか？{" "}
              <button
                type="button"
                onClick={() => setIsSignUp(false)}
                className="text-zinc-300 hover:text-white underline ml-1 cursor-pointer"
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
                className="text-zinc-300 hover:text-white underline ml-1 cursor-pointer"
              >
                新規登録
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
