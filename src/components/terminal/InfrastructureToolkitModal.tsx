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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 font-sans select-none animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* ヘッダー */}
        <div className="px-6 py-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono text-indigo-700 font-bold tracking-wider uppercase">
              ZERO-TO-ONE FOUNDATION STACK
            </div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 mt-0.5">
              事業立ち上げ必須インフラ（登記・法人口座・会計）
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-lg leading-none p-1 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* 本文 */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs font-sans">
          <p className="text-slate-600 leading-relaxed">
            どのようなビジネスモデル（SaaS、物販、受託、地方実業）であっても、収益を着金させるためには<strong className="text-slate-900 font-bold">「登記」「法人口座」「会計基盤」の3大インフラ</strong>の整備が必須となります。
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {AFFILIATE_CONFIG.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-bold text-slate-900 text-sm">{item.name}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {item.badge}
                    </span>
                  </div>
                  <p className="text-slate-500 leading-relaxed text-[11px]">
                    {item.description}
                  </p>
                </div>

                <a
                  href={item.targetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-8 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                >
                  <span>公式案内・即日開設</span>
                  <svg className="w-3.5 h-3.5 text-indigo-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            ))}
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-500 space-y-1">
            <span className="font-bold text-slate-700">※ ご利用に関する留意点:</span>
            <p>
              各サービスへの申し込みは各社の公式安全通信により処理されます。提携プログラムに基づき、本サイトが手数料等の一部還元を受ける場合があります。
            </p>
          </div>
        </div>

        {/* フッター */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
          <button
            onClick={onClose}
            className="h-8 px-4 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold rounded-lg transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
