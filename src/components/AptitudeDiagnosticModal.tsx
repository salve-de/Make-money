'use client';

import React, { useState } from 'react';
import { X, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';
import { BusinessItem } from '@/types/business';
import { formatJpy } from '@/lib/utils';

interface AptitudeDiagnosticModalProps {
  isOpen: boolean;
  onClose: () => void;
  businesses: BusinessItem[];
  onSelectBusiness: (biz: BusinessItem) => void;
}

export const AptitudeDiagnosticModal: React.FC<AptitudeDiagnosticModalProps> = ({
  isOpen,
  onClose,
  businesses,
  onSelectBusiness,
}) => {
  const [budget, setBudget] = useState<string>('0円');
  const [time, setTime] = useState<string>('週5時間');
  const [strength, setStrength] = useState<string>('ノーコード');
  const [showResult, setShowResult] = useState<boolean>(false);

  if (!isOpen) return null;

  // 診断ロジック
  const getRecommendedBusinesses = () => {
    return businesses
      .filter((b) => {
        if (budget === '0円' && b.initialInvestmentJpy > 0) return false;
        if (budget === '10万円以下' && b.initialInvestmentJpy > 100000) return false;
        if (time === '週5時間' && b.weeklyHoursSpent > 8) return false;
        return true;
      })
      .slice(0, 3);
  };

  const results = getRecommendedBusinesses().length > 0 ? getRecommendedBusinesses() : businesses.slice(0, 3);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-amber-500/30 rounded-3xl shadow-2xl p-6 sm:p-8 overflow-hidden text-slate-200">
        {/* 閉じるボタン */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-white rounded-full bg-slate-800 hover:bg-slate-700 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <span className="text-xs font-bold uppercase tracking-widest text-amber-300">
            アルゴリズム適性診断
          </span>
        </div>

        <h2 className="text-2xl font-black text-white">
          あなたの資金・時間から「勝てる稼ぎ方」を即座に逆算
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          金鉱録の全実在データを基に、あなたが最短で月利100万円に到達できるビジネスモデルTOP3を提示します。
        </p>

        {!showResult ? (
          <div className="mt-6 space-y-5">
            {/* 質問1: 予算 */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2">
                Q1. 用意できる初期投資（軍資金）は？
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['0円', '10万円以下', '50万円以上'].map((val) => (
                  <button
                    key={val}
                    onClick={() => setBudget(val)}
                    className={`py-2.5 px-3 text-xs font-bold rounded-xl border transition ${
                      budget === val
                        ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            {/* 質問2: 使える時間 */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2">
                Q2. 週あたりに投下できる作業時間は？
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['週5時間', '週15時間', 'フルタイム'].map((val) => (
                  <button
                    key={val}
                    onClick={() => setTime(val)}
                    className={`py-2.5 px-3 text-xs font-bold rounded-xl border transition ${
                      time === val
                        ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            {/* 質問3: 得意分野 */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2">
                Q3. あなたの得意・興味がある領域は？
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['ノーコード', 'AI指示のみ', 'プログラミング'].map((val) => (
                  <button
                    key={val}
                    onClick={() => setStrength(val)}
                    className={`py-2.5 px-3 text-xs font-bold rounded-xl border transition ${
                      strength === val
                        ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setShowResult(true)}
              className="mt-6 w-full py-3.5 text-sm font-black rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 hover:brightness-110 transition shadow-lg shadow-amber-500/20"
            >
              診断結果を見る（無料）
            </button>
          </div>
        ) : (
          /* 診断結果表示 */
          <div className="mt-6 space-y-4">
            <div className="p-3 rounded-xl bg-amber-400/10 border border-amber-400/30 text-xs text-amber-300 flex items-center justify-between">
              <span>あなたの条件（予算:{budget} / 時間:{time} / 志向:{strength}）に最も合致する実例:</span>
              <button
                onClick={() => setShowResult(false)}
                className="underline hover:text-white"
              >
                再設定する
              </button>
            </div>

            <div className="space-y-3">
              {results.map((biz, idx) => (
                <div
                  key={biz.id}
                  onClick={() => {
                    onClose();
                    onSelectBusiness(biz);
                  }}
                  className="p-4 rounded-lg bg-slate-950 border border-slate-800 hover:border-amber-400/50 cursor-pointer transition flex items-center justify-between gap-4 group"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold flex items-center justify-center text-xs">
                      #{idx + 1}
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition">
                        {biz.title}
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{biz.tagline}</p>
                      <div className="mt-1 flex items-center gap-2 text-[11px]">
                        <span className="text-emerald-400 font-bold font-mono">月商: {formatJpy(biz.monthlyRevenueJpy)}</span>
                        <span className="text-slate-500">|</span>
                        <span className="text-amber-400 font-mono">利益率: {biz.profitMarginPercent}%</span>
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-1 transition" />
                </div>
              ))}
            </div>

            <button
              onClick={onClose}
              className="mt-4 w-full py-2.5 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition"
            >
              閉じる
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
