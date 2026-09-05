'use client';

import React from 'react';
import { AFFILIATE_CONFIG } from '../../config/affiliateLinks';

interface InfrastructureToolkitModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InfrastructureToolkitModal: React.FC<InfrastructureToolkitModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 font-sans select-none animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-[#111317] border border-white/[0.12] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* ヘッダー */}
        <div className="px-6 py-4 bg-[#141720] border-b border-white/[0.08] flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono text-emerald-400 font-bold tracking-wider">
              ZERO-TO-ONE FOUNDATION STACK
            </div>
            <h2 className="text-sm sm:text-base font-bold text-zinc-100 mt-0.5">
              事業立ち上げ必須インフラ（登記・法人口座・会計）
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 text-lg leading-none p-1 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* 本文 */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs font-sans">
          <p className="text-zinc-300 leading-relaxed">
            どのようなビジネスモデル（SaaS、物販、受託、地方実業）であっても、収益を着金させるためには<strong className="text-white font-bold">「登記」「法人口座」「会計基盤」の3大インフラ</strong>の整備が必須となります。
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {AFFILIATE_CONFIG.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-lg bg-[#161822] border border-white/[0.06] hover:border-white/15 transition-all flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-bold text-zinc-100 text-sm">{item.name}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
                      {item.badge}
                    </span>
                  </div>
                  <p className="text-zinc-400 leading-relaxed text-[11px]">
                    {item.description}
                  </p>
                </div>

                <a
                  href={item.targetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-8 px-3 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white border border-white/10 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>公式案内・即日開設</span>
                  <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            ))}
          </div>

          <div className="p-3 bg-[#0A0C0F] rounded border border-white/5 text-[11px] text-zinc-500 space-y-1">
            <span className="font-bold text-zinc-400">※ ご利用に関する留意点:</span>
            <p>
              各サービスへの申し込みは各社の公式安全通信により処理されます。提携プログラムに基づき、本サイトが手数料等の一部還元を受ける場合があります。
            </p>
          </div>
        </div>

        {/* フッター */}
        <div className="px-6 py-3 bg-[#141720] border-t border-white/[0.08] flex items-center justify-end">
          <button
            onClick={onClose}
            className="h-7 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
