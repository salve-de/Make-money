'use client';

import React, { useState } from 'react';

interface ProModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProModal: React.FC<ProModalProps> = ({ isOpen, onClose }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCheckout = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product: 'founding-pass' }),
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
              機関・専業向けライセンス
            </span>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 text-xs font-mono">
            閉じる [ESC]
          </button>
        </div>

        <p className="text-xs text-zinc-400 mb-5 leading-relaxed">
          資本市場の裏側で動く非公開財務データ、初期集客のスクリプト、および未開拓ニッチ市場の検知アラートを解放します。
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          {/* 個人プロ */}
          <div className="p-4 rounded bg-[#171920] border border-white/10 flex flex-col justify-between">
            <div>
              <div className="text-xs font-bold text-zinc-300 mb-1">個人プロフェッショナル</div>
              <div className="text-xl font-bold font-mono text-zinc-100 mb-3">
                ¥9,800<span className="text-xs font-normal text-zinc-500">/月</span>
              </div>
              <ul className="space-y-1.5 text-[11px] text-zinc-400 mb-4 font-mono">
                <li>- 全19社の生々しい損益計算書</li>
                <li>- 非公開インサイト・裏技台帳</li>
                <li>- CSV生データ無制限出力</li>
                <li>- 週次モメンタム速報</li>
              </ul>
            </div>
            <button
              onClick={handleCheckout}
              disabled={isLoading}
              className="w-full h-7 bg-[#20232C] hover:bg-zinc-700 text-zinc-200 text-xs font-medium rounded border border-white/10 transition-colors"
            >
              {isLoading ? '決済画面を準備中...' : '創刊版を購入する（¥1,980）'}
            </button>
          </div>

          {/* 法人機関 */}
          <div className="p-4 rounded bg-[#171920] border border-zinc-400/30 flex flex-col justify-between relative">
            <div>
              <div className="text-xs font-bold text-zinc-200 mb-1">法人・投資ファンド</div>
              <div className="text-xl font-bold font-mono text-white mb-3">
                ¥298,000<span className="text-xs font-normal text-zinc-500">/年</span>
              </div>
              <ul className="space-y-1.5 text-[11px] text-zinc-300 mb-4 font-mono">
                <li>- 個人プロの全機能 (10名)</li>
                <li>- エクセル計算式付き元本</li>
                <li>- 買収意向表明・NDA仲介</li>
                <li>- 専属アナリスト調査枠</li>
              </ul>
            </div>
            <button
              onClick={onClose}
              className="w-full h-7 bg-zinc-100 hover:bg-white text-zinc-900 text-xs font-semibold rounded transition-colors shadow-sm"
            >
              法人契約を締結
            </button>
          </div>
        </div>

        {errorMessage && (
          <p className="mb-4 rounded border border-red-500/20 bg-red-500/10 p-2 text-center text-[11px] text-red-300">
            {errorMessage}
          </p>
        )}

        <div className="text-center text-[10px] text-zinc-500 font-mono">
          契約後30日間の全額返金保証。いつでも解約可能です。
        </div>
      </div>
    </div>
  );
};
