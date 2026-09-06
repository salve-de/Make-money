'use client';

import React from 'react';
import { AFFILIATE_CONFIG } from '../../config/affiliateLinks';
import { X } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
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
            className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X size={16} />
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

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-[10px] text-slate-500 font-mono">
            開示事項: 各サービスへの登録は公式窓口にて処理されます。提携プログラムに基づき手数料の還元を受ける場合があります。
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
