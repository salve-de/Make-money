'use client';

import React, { useState } from 'react';
import { CompanyRecord } from '../../types/terminal';

interface OfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  company?: CompanyRecord;
}

export const OfferModal: React.FC<OfferModalProps> = ({
  isOpen,
  onClose,
  company
}) => {
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [offerPrice, setOfferPrice] = useState(
    company?.askingPriceJpy ? (company.askingPriceJpy / 10000).toString() : '10000'
  );
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen || !company) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 font-sans select-none animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 uppercase tracking-wider">
              LETTER OF INTENT (LOI)
            </span>
            <span className="text-xs font-semibold text-slate-700">買収意向表明</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xs font-mono font-semibold">
            閉じる [ESC]
          </button>
        </div>

        {submitted ? (
          <div className="py-8 text-center space-y-2">
            <div className="font-mono text-sm font-bold text-emerald-700">意向表明を受領いたしました</div>
            <div className="text-xs text-slate-600">
              専任アドバイザーより秘密保持契約（NDA）書式をお送りいたします。
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
              <div className="text-slate-600">対象事業: <span className="text-slate-900 font-bold">{company.japaneseName}</span></div>
              <div className="text-slate-600">希望売却価額: <span className="font-mono text-indigo-600 font-bold">¥{(company.askingPriceJpy || company.estimatedValuationJpy).toLocaleString()}</span></div>
            </div>

            <div>
              <label className="text-slate-700 block mb-1 font-semibold">貴社名 / 個人投資家名</label>
              <input
                type="text"
                required
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                placeholder="合同会社〇〇 / 氏名"
                className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="text-slate-700 block mb-1 font-semibold">連絡先メールアドレス</label>
              <input
                type="email"
                required
                value={buyerEmail}
                onChange={(e) => setBuyerEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="text-slate-700 block mb-1 font-semibold">提示買収価格 (万円)</label>
              <input
                type="number"
                required
                value={offerPrice}
                onChange={(e) => setOfferPrice(e.target.value)}
                className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="h-8 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold transition-colors"
              >
                キャンセル
              </button>
              <button
                type="submit"
                className="h-8 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors shadow-xs"
              >
                意向表明を送付
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
