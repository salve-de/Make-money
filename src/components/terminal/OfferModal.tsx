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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 font-sans select-none">
      <div className="w-full max-w-md bg-[#13151A] border border-white/10 rounded-lg p-5 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] mb-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-zinc-100 uppercase tracking-wider">
              LETTER OF INTENT (LOI)
            </span>
            <span className="text-[10px] font-mono text-zinc-500">買収意向表明</span>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 text-xs font-mono">
            閉じる [ESC]
          </button>
        </div>

        {submitted ? (
          <div className="py-8 text-center space-y-2">
            <div className="font-mono text-xs font-bold text-zinc-200">意向表明を受領いたしました</div>
            <div className="text-xs text-zinc-400">
              専任アドバイザーより秘密保持契約（NDA）書式をお送りいたします。
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
            <div className="p-3 bg-[#0E1013] rounded border border-white/5 space-y-1">
              <div className="text-zinc-400">対象事業: <span className="text-zinc-200 font-semibold">{company.japaneseName}</span></div>
              <div className="text-zinc-400">希望売却価額: <span className="font-mono text-zinc-200 font-semibold">¥{(company.askingPriceJpy || company.estimatedValuationJpy).toLocaleString()}</span></div>
            </div>

            <div>
              <label className="text-zinc-400 block mb-1">貴社名 / 個人投資家名</label>
              <input
                type="text"
                required
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                placeholder="合同会社〇〇 / 氏名"
                className="w-full h-8 px-3 bg-[#0E1013] border border-white/10 rounded text-zinc-200 text-xs focus:outline-none focus:border-zinc-500"
              />
            </div>

            <div>
              <label className="text-zinc-400 block mb-1">連絡先メールアドレス</label>
              <input
                type="email"
                required
                value={buyerEmail}
                onChange={(e) => setBuyerEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full h-8 px-3 bg-[#0E1013] border border-white/10 rounded text-zinc-200 text-xs focus:outline-none focus:border-zinc-500 font-mono"
              />
            </div>

            <div>
              <label className="text-zinc-400 block mb-1">提示買収価格 (万円)</label>
              <input
                type="number"
                required
                value={offerPrice}
                onChange={(e) => setOfferPrice(e.target.value)}
                className="w-full h-8 px-3 bg-[#0E1013] border border-white/10 rounded text-zinc-200 text-xs focus:outline-none focus:border-zinc-500 font-mono"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="h-7 px-3 rounded bg-[#1C1F26] hover:bg-zinc-750 text-zinc-400 text-xs"
              >
                キャンセル
              </button>
              <button
                type="submit"
                className="h-7 px-4 rounded bg-zinc-100 hover:bg-white text-zinc-900 font-semibold text-xs transition-colors"
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
