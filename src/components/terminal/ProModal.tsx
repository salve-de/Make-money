'use client';

import { useModalFocus } from '@/platform/hooks/useModalFocus';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { AuthModal } from '@/components/auth/AuthModal';
import { FOUNDING_PASS } from '@/lib/payments/founding-pass';

interface ProModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProModal: React.FC<ProModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { dialogRef, onKeyDown } = useModalFocus(isOpen && !showAuth, onClose);

  if (!isOpen) return null;

  const handleCheckout = async () => {
    if (!user) { setShowAuth(true); return; }
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}` },
        body: JSON.stringify({ product: FOUNDING_PASS.id }),
      });
      const result = await response.json();

      if (!response.ok || !result.url) {
        throw new Error(result.error || '決済画面を開始できませんでした');
      }

      window.location.assign(result.url);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '決済画面を開始できませんでした');
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3">
      <div role="dialog" aria-modal="true" aria-labelledby="plan-title" ref={dialogRef} onKeyDown={onKeyDown} className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-lg border border-white/[0.18] bg-[#101721] text-zinc-100 shadow-2xl">
        <header className="flex items-center justify-between border-b border-white/[0.14] bg-[#1a2530] px-4 py-2">
          <h2 id="plan-title" className="text-base font-semibold">PRO 創刊版</h2>
          <button type="button" onClick={onClose} className="min-h-10 rounded px-2 text-xs text-zinc-300 hover:bg-white/10">閉じる</button>
        </header>
        <div className="space-y-4 p-4">
          <p className="text-sm text-zinc-200">事業構造12項目の詳細分析</p>
          <div className="flex items-baseline gap-2"><strong className="text-2xl tabular-nums text-white">¥{FOUNDING_PASS.priceJpy.toLocaleString('ja-JP')}</strong><span className="text-sm text-zinc-400">買い切り</span></div>
          <ul className="space-y-2 border-y border-white/[0.12] py-3 text-sm text-zinc-300">
            <li>創刊版の永久アクセス権</li>
            <li>自動更新・月額請求なし</li>
          </ul>
          <button type="button" onClick={handleCheckout} disabled={isLoading} className="min-h-11 w-full rounded-md bg-sky-200 px-3 text-sm font-semibold text-slate-950 hover:bg-sky-100 disabled:opacity-60">
            {isLoading ? '決済画面を準備中…' : `創刊版を購入する（¥${FOUNDING_PASS.priceJpy.toLocaleString('ja-JP')}）`}
          </button>
          {errorMessage && <p role="alert" className="text-sm text-red-300">{errorMessage}</p>}
          <p className="text-xs leading-5 text-zinc-400">財務・出典情報は無料。購入後はログインしたアカウントに反映されます。</p>
        </div>
      </div>
      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
    </div>
  );
};
