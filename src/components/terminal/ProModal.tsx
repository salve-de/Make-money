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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3">
      <div role="dialog" aria-modal="true" aria-labelledby="plan-title" ref={dialogRef} onKeyDown={onKeyDown} className="max-h-[90dvh] w-full max-w-md overflow-y-auto border border-term-line bg-term-panel text-term-fg shadow-lg">
        <div className="term-panel-title">
          <h2 id="plan-title" className="term-panel-name text-xs">PRO 創刊版</h2>
          <button type="button" onClick={onClose} className="ml-auto flex min-h-11 items-center px-2 text-xs text-term-muted hover:text-term-fg-strong lg:min-h-6">閉じる</button>
        </div>
        <div className="space-y-3 p-4">
          <p className="text-sm text-term-fg">事業構造12項目の詳細分析</p>
          <div className="flex items-baseline gap-2"><strong className="font-mono text-2xl tabular-nums text-term-fg-strong">¥{FOUNDING_PASS.priceJpy.toLocaleString('ja-JP')}</strong><span className="text-sm text-term-muted">買い切り</span></div>
          <ul className="space-y-1 border-y border-term-line py-3 text-sm text-term-sub">
            <li>創刊版の永久アクセス権</li>
            <li>自動更新・月額請求なし</li>
          </ul>
          <button type="button" onClick={handleCheckout} disabled={isLoading} className="min-h-11 w-full rounded-sm bg-term-accent px-3 text-sm font-semibold text-term-bg hover:opacity-90 disabled:opacity-60">
            {isLoading ? '決済画面を準備中…' : `創刊版を購入する（¥${FOUNDING_PASS.priceJpy.toLocaleString('ja-JP')}）`}
          </button>
          {errorMessage && <p role="alert" className="text-sm text-term-danger">{errorMessage}</p>}
          <p className="text-xs leading-5 text-term-label">財務・出典情報は無料。購入後はログインしたアカウントに反映されます。</p>
        </div>
      </div>
      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
    </div>
  );
};
