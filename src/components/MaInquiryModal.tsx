'use client';

import React, { useState } from 'react';
import { X, Handshake, CheckCircle, ShieldCheck } from 'lucide-react';
import { BusinessItem } from '@/types/business';
import { formatJpy } from '@/lib/utils';

interface MaInquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetBusiness: BusinessItem | null;
}

export const MaInquiryModal: React.FC<MaInquiryModalProps> = ({
  isOpen,
  onClose,
  targetBusiness,
}) => {
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-xl bg-slate-900 border border-emerald-500/30 rounded-3xl shadow-2xl p-6 sm:p-8 text-slate-200">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-white rounded-full bg-slate-800 hover:bg-slate-700 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {!submitted ? (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Handshake className="w-5 h-5 text-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
                スモールM&A仲介窓口
              </span>
            </div>

            <h2 className="text-2xl font-black text-white">
              {targetBusiness ? `「${targetBusiness.title}」の買収打診` : '事業買収・事業承継の相談'}
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              金鉱録が仲介に入り、双方の秘密保持誓約（NDA）を締結した上で、詳細な月次財務諸表・ソースコード・顧客データの開示調整を行います。
            </p>

            {targetBusiness && targetBusiness.askingPriceJpy && (
              <div className="mt-4 p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block">希望売却価格</span>
                  <span className="text-lg font-black text-emerald-400 font-mono">
                    {formatJpy(targetBusiness.askingPriceJpy)}
                  </span>
                </div>
                <span className="text-xs text-emerald-300 font-bold bg-emerald-900/60 px-2.5 py-1 rounded-lg">
                  月利 {formatJpy(targetBusiness.monthlyProfitJpy)}
                </span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSubmitted(true);
              }}
              className="mt-5 space-y-3 text-xs"
            >
              <div>
                <label className="block text-slate-300 font-medium mb-1">お名前 / 貴社名</label>
                <input
                  required
                  type="text"
                  placeholder="例: 山田 太郎 / 合同会社〇〇"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">買収検討のご予算</label>
                  <select className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-400">
                    <option>500万〜1,000万円</option>
                    <option>1,000万〜3,000万円</option>
                    <option>3,000万〜1億円</option>
                    <option>1億円以上</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">買収後の運営体制</label>
                  <select className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-400">
                    <option>自社既存事業とのシナジー</option>
                    <option>個人での独立・引き継ぎ</option>
                    <option>自律運用・外部委託</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">ご連絡先メールアドレス</label>
                <input
                  required
                  type="email"
                  placeholder="investor@example.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-400"
                />
              </div>

              <button
                type="submit"
                className="mt-4 w-full py-3 text-xs font-black rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 text-slate-950 transition shadow-lg shadow-emerald-500/20"
              >
                秘密保持（NDA）を結んで買収資料を請求する
              </button>
            </form>
          </div>
        ) : (
          <div className="py-8 text-center space-y-3">
            <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto" />
            <h3 className="text-xl font-black text-white">買収打診を受領いたしました</h3>
            <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
              担当アドバイザーより、24時間以内に電子秘密保持契約書（NDA）および事前財務概要書（ティーザー）を送付いたします。
            </p>
            <button
              onClick={() => {
                setSubmitted(false);
                onClose();
              }}
              className="mt-4 px-6 py-2 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition"
            >
              閉じる
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
