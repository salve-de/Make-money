'use client';

import React, { useState } from 'react';
import { X, Crown, Check, Zap, Download, ShieldCheck, Sparkles } from 'lucide-react';

interface ProSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProSubscriptionModal: React.FC<ProSubscriptionModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [subscribed, setSubscribed] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-amber-500/40 rounded-3xl shadow-2xl p-6 sm:p-8 text-slate-200 overflow-hidden">
        {/* 背景グロー */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-white rounded-full bg-slate-800 hover:bg-slate-700 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {!subscribed ? (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-5 h-5 text-amber-400" />
              <span className="text-xs font-bold uppercase tracking-widest text-amber-300">
                PRO特別会員 金庫マスターキー
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white">
              すべての非公開財務・プロンプト・CSV出力を完全解錠
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-400">
              高収益を達成している事業者が実際に運用している非公開設定値・運用ナレッジ・撤退分析ログを体系的に取得し、事業立ち上げの試行錯誤期間を大幅に短縮します。
            </p>

            {/* 月払い / 年払い切替 */}
            <div className="mt-6 flex justify-center">
              <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center gap-1 text-xs">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-4 py-1.5 rounded-lg font-bold transition ${
                    billingCycle === 'monthly'
                      ? 'bg-slate-800 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  月払い（¥2,980/月）
                </button>
                <button
                  onClick={() => setBillingCycle('yearly')}
                  className={`px-4 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition ${
                    billingCycle === 'yearly'
                      ? 'bg-amber-400 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>年払い（¥29,800/年）</span>
                  <span className="text-[10px] bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded font-mono">
                    2ヶ月無料
                  </span>
                </button>
              </div>
            </div>

            {/* PRO特典リスト */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex gap-2.5">
                <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block">非公開プロンプト・実務運用ナレッジの全開放</strong>
                  <span className="text-slate-400 text-[11px]">各事例が実際に使っているAI指示文全文や自動化レシピ。</span>
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex gap-2.5">
                <Download className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block">全データCSV・Notion出力</strong>
                  <span className="text-slate-400 text-[11px]">掲載中の全事業の売上・ツールスタックの一括生データ抽出。</span>
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex gap-2.5">
                <Sparkles className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block">急成長トレンド月次レポート</strong>
                  <span className="text-slate-400 text-[11px]">水面下で急上昇している未開拓ビジネス機会の定例分析。</span>
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex gap-2.5">
                <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block">M&A事前審査シートの閲覧権</strong>
                  <span className="text-slate-400 text-[11px]">売却希望案件の詳細な月次P&L、直近3年間の推移データ。</span>
                </div>
              </div>
            </div>

            {/* 決済CTAボタン */}
            <button
              onClick={() => setSubscribed(true)}
              className="mt-6 w-full py-3.5 text-sm font-black rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-slate-950 hover:brightness-110 transition shadow-lg shadow-amber-500/20"
            >
              {billingCycle === 'yearly'
                ? '今すぐ年額プランでPRO金庫を解錠する（¥29,800/年）'
                : '今すぐ月額プランでPRO金庫を解錠する（¥2,980/月）'}
            </button>
            <p className="mt-2 text-[11px] text-center text-slate-500">
              30日間全額返金保証 ・ いつでもマイページから即時解約可能
            </p>
          </div>
        ) : (
          <div className="py-8 text-center space-y-3">
            <Crown className="w-12 h-12 text-amber-400 mx-auto" />
            <h3 className="text-xl font-black text-white">PRO特別会員マスターキーが解錠されました！</h3>
            <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
              すべての事例詳細ページにて、非公開プロンプト・詳細損益・CSVエクスポート機能がご利用いただけます。
            </p>
            <button
              onClick={() => {
                setSubscribed(false);
                onClose();
              }}
              className="mt-4 px-6 py-2 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition"
            >
              金庫を探索する
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
