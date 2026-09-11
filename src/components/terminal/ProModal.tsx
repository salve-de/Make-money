'use client';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 font-sans select-none">
      <div className="w-full max-w-lg bg-[#13151A] border border-white/10 rounded-lg p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] mb-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-zinc-100 tracking-wider uppercase">
              PRO MEMBERSHIP
            </span>
            <span className="text-[10px] font-mono text-zinc-500">
              創刊版アクセス権
            </span>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 text-xs font-mono">
            閉じる [ESC]
          </button>
        </div>

        <p className="text-xs text-zinc-400 mb-5 leading-relaxed">
          掲載企業の事業構造12項目の分析を閲覧するための買い切りアクセス権です。財務と出典情報は無料で閲覧できます。購入するアカウントでログインしてください。
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          {/* 個人プロ */}
          <div className="p-4 rounded bg-[#171920] border border-white/10 flex flex-col justify-between">
            <div>
              <div className="text-xs font-bold text-zinc-300 mb-1">PRO 創刊版</div>
              <div className="text-xl font-bold font-mono text-zinc-100 mb-3">
                ¥{FOUNDING_PASS.priceJpy.toLocaleString('ja-JP')}<span className="text-xs font-normal text-zinc-500"> / 買い切り</span>
              </div>
              <ul className="space-y-1.5 text-[11px] text-zinc-400 mb-4 font-mono">
                <li>- 事業構造12項目の詳細分析</li>
                <li>- 財務と出典情報は無料公開</li>
                <li>- 創刊版の永久アクセス権</li>
                <li>- 自動更新・月額請求なし</li>
              </ul>
            </div>
            <button
              onClick={handleCheckout}
              disabled={isLoading}
              className="w-full h-7 bg-white/[0.08] hover:bg-white/[0.14] text-zinc-200 text-xs font-bold rounded border border-white/[0.1] transition-colors cursor-pointer"
            >
              {isLoading ? '決済画面を準備中...' : '創刊版を購入する（¥1,980）'}
            </button>
          </div>

          <div className="p-4 rounded bg-[#171920] border border-white/10">
            <div className="text-xs font-bold text-zinc-300 mb-3">法人プラン</div>
            <p className="text-xs text-zinc-400">現在は提供していません。法人向け契約の受付は準備中です。</p>
          </div>
        </div>

        {errorMessage && (
          <p className="mb-4 rounded border border-red-500/20 bg-red-500/10 p-2 text-center text-[11px] text-red-300">
            {errorMessage}
          </p>
        )}

        <div className="text-center text-[10px] text-zinc-500 font-mono">
          料金は1回限り1,980円です。決済確認後、購入アカウントへアクセス権を反映します。
        </div>
      </div>
      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
    </div>
  );
};
