'use client';

import React, { useState } from 'react';
import { X, PlusCircle, CheckCircle, Sparkles, Zap, Shield } from 'lucide-react';

interface SubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SubmissionModal: React.FC<SubmissionModalProps> = ({ isOpen, onClose }) => {
  const [tier, setTier] = useState<'free' | 'vip'>('vip');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 text-slate-200">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-white rounded-full bg-slate-800 hover:bg-slate-700 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {!submitted ? (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <PlusCircle className="w-5 h-5 text-blue-400" />
              <span className="text-xs font-bold uppercase tracking-widest text-blue-400">
                創業者向け登録申請
              </span>
            </div>

            <h2 className="text-2xl font-black text-white">
              あなたのビジネスを金鉱録に公認掲載する
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              月間100万人以上の起業家・投資家・提携希望者が訪れる本台帳にあなたの事業を登録し、認知・被リンク・M&A買い手を獲得できます。
            </p>

            {/* プラン選択 */}
            <div className="mt-6 grid grid-cols-2 gap-3">
              {/* 特急掲載 */}
              <div
                onClick={() => setTier('vip')}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition relative ${
                  tier === 'vip'
                    ? 'border-amber-400 bg-amber-400/5 shadow-lg shadow-amber-500/10'
                    : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
                }`}
              >
                <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-slate-950">
                  一番人気
                </span>
                <div className="flex items-center gap-1 text-xs font-bold text-amber-400 mb-1">
                  <Zap className="w-3.5 h-3.5" />
                  特急審査・独占特集
                </div>
                <div className="text-lg font-black text-white font-mono">¥50,000</div>
                <ul className="mt-2 text-[11px] text-slate-400 space-y-1">
                  <li>- 48時間以内の即時掲載</li>
                  <li>- 金鉱録からの高評価被リンク</li>
                  <li>- メルマガ20万人への単独特集配信</li>
                </ul>
              </div>

              {/* 無料審査 */}
              <div
                onClick={() => setTier('free')}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition ${
                  tier === 'free'
                    ? 'border-blue-400 bg-blue-400/5'
                    : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
                }`}
              >
                <div className="text-xs font-bold text-slate-300 mb-1">一般審査枠</div>
                <div className="text-lg font-black text-slate-400 font-mono">無料</div>
                <ul className="mt-2 text-[11px] text-slate-400 space-y-1">
                  <li>- 通常掲載審査（1〜2ヶ月待ち）</li>
                  <li>- 審査通過時のみ掲載</li>
                  <li>- メルマガ配信なし</li>
                </ul>
              </div>
            </div>

            {/* フォーム入力項目 */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSubmitted(true);
              }}
              className="mt-5 space-y-3 text-xs"
            >
              <div>
                <label className="block text-slate-300 font-medium mb-1">事業名 / サービスURL</label>
                <input
                  required
                  type="text"
                  placeholder="例: 株式会社〇〇 / https://example.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">直近の月商（目安）</label>
                  <input
                    required
                    type="text"
                    placeholder="例: 月商300万円"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">事業売却（M&A）希望</label>
                  <select className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400">
                    <option>売却希望なし（PRのみ）</option>
                    <option>良い買い手がいれば売却検討</option>
                    <option>即時売却を希望</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">ご連絡先メールアドレス</label>
                <input
                  required
                  type="email"
                  placeholder="founder@example.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <button
                type="submit"
                className="mt-4 w-full py-3 text-xs font-black rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:brightness-110 text-white transition shadow-lg"
              >
                {tier === 'vip' ? '特急掲載枠で審査を申し込む（50,000円）' : '無料審査に申し込む'}
              </button>
            </form>
          </div>
        ) : (
          /* 送信完了画面 */
          <div className="py-8 text-center space-y-3">
            <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto" />
            <h3 className="text-xl font-black text-white">掲載申請を受領いたしました</h3>
            <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
              ご入力いただいたメールアドレス宛に、財務エビデンス（Stripe等の管理画面スクリーンショット）の送付手順をお送りしました。
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
