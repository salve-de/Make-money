'use client';

import React, { useState } from 'react';
import { BusinessItem } from '@/types/business';
import { formatJpy } from '@/lib/utils';
import {
  X,
  ShieldCheck,
  Crown,
  Lock,
  Unlock,
  ExternalLink,
  DollarSign,
  TrendingUp,
  Cpu,
  Share2,
  CheckCircle,
  HelpCircle,
  Users,
  Clock,
  Briefcase,
  Layers,
  Sparkles,
  Handshake,
} from 'lucide-react';

import { useAuth } from '@/context/AuthContext';

interface BusinessDetailModalProps {
  item: BusinessItem | null;
  onClose: () => void;
  onOpenMaInquiry: (item: BusinessItem) => void;
}

export const BusinessDetailModal: React.FC<BusinessDetailModalProps> = ({
  item,
  onClose,
  onOpenMaInquiry,
}) => {
  const { isPro, token } = useAuth();
  const [demoUnlocked, setDemoUnlocked] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const isUnlocked = isPro || demoUnlocked;

  const handleCheckout = async () => {
    try {
      setCheckoutLoading(true);
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers,
        body: JSON.stringify({ product: "founding-pass" }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "決済セッションの作成に失敗しました");
      }
    } catch (e) {
      alert("通信エラーが発生しました");
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* モーダルヘッダー */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-6 py-4 bg-slate-900/95 border-b border-slate-800 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-amber-400/10 text-amber-300 border border-amber-400/30">
              {item.businessModel}
            </span>
            {item.isVerified && (
              <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-950/50 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                <ShieldCheck className="w-3.5 h-3.5" />
                財務エビデンス検証済
              </span>
            )}
            {item.isForSale && (
              <span className="flex items-center gap-1 text-xs font-bold text-blue-400 bg-blue-950/50 px-2.5 py-0.5 rounded-full border border-blue-500/20">
                <Handshake className="w-3.5 h-3.5" />
                事業売却相談受付中
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-full bg-slate-800 hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* モーダルコンテンツ（スクロール可能） */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-8 text-slate-200">
          {/* タイトルとタグライン */}
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
              {item.title}
            </h2>
            <p className="mt-2 text-sm sm:text-base text-amber-300 font-medium leading-relaxed">
              {item.tagline}
            </p>
          </div>

          {/* 創業者情報バー */}
          <div className="flex flex-wrap items-center gap-4 p-4 rounded-lg bg-slate-950/60 border border-slate-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.founderAvatar}
              alt={item.founderName}
              className="w-14 h-14 rounded-full object-cover border-2 border-amber-400/40 shadow-md"
            />
            <div className="flex-1 min-w-[200px]">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">{item.founderName}</span>
                <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">創業者</span>
              </div>
              <p className="mt-1 text-xs text-slate-400 leading-relaxed">{item.founderBio}</p>
            </div>
            {item.isForSale && item.askingPriceJpy && (
              <div className="text-right">
                <span className="text-[11px] text-slate-400 block">希望売却価格</span>
                <span className="text-lg font-black text-emerald-400 font-mono">
                  {formatJpy(item.askingPriceJpy)}
                </span>
                <button
                  onClick={() => onOpenMaInquiry(item)}
                  className="mt-1 block w-full px-3 py-1 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition"
                >
                  買収を打診する
                </button>
              </div>
            )}
          </div>

          {/* 財務ハイライト（月間損益内訳） */}
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2 mb-3">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              月間損益計算書（P&L）詳細分析
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950 rounded-lg p-4 border border-slate-800 text-center">
              <div className="p-2">
                <span className="text-xs text-slate-400 block">月商（総売上）</span>
                <span className="text-xl font-black text-emerald-400 font-mono">
                  {formatJpy(item.financialBreakdown.grossRevenue)}
                </span>
              </div>
              <div className="p-2 border-l border-slate-800">
                <span className="text-xs text-slate-400 block">純利益（手残り）</span>
                <span className="text-xl font-black text-amber-400 font-mono">
                  {formatJpy(item.financialBreakdown.netProfit)}
                </span>
              </div>
              <div className="p-2 border-l border-slate-800">
                <span className="text-xs text-slate-400 block">営業利益率</span>
                <span className="text-xl font-black text-white font-mono">
                  {item.financialBreakdown.profitMarginPercent}%
                </span>
              </div>
              <div className="p-2 border-l border-slate-800">
                <span className="text-xs text-slate-400 block">初期投資額</span>
                <span className="text-xl font-black text-slate-200 font-mono">
                  {item.initialInvestmentJpy === 0 ? '0円' : formatJpy(item.initialInvestmentJpy)}
                </span>
              </div>
            </div>

            {/* コスト内訳バー */}
            <div className="mt-3 p-4 rounded-xl bg-slate-950/40 border border-slate-800/80 text-xs space-y-2">
              <div className="text-slate-400 font-medium mb-1">支出内訳（月間コスト）:</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="flex justify-between bg-slate-900 px-3 py-2 rounded-lg border border-slate-800">
                  <span className="text-slate-400">サーバー・API費用:</span>
                  <span className="font-mono font-bold text-slate-200">
                    {formatJpy(item.financialBreakdown.serverAndApiCost)}
                  </span>
                </div>
                <div className="flex justify-between bg-slate-900 px-3 py-2 rounded-lg border border-slate-800">
                  <span className="text-slate-400">広告宣伝費:</span>
                  <span className="font-mono font-bold text-slate-200">
                    {item.financialBreakdown.advertisingCost === 0 ? '0円' : formatJpy(item.financialBreakdown.advertisingCost)}
                  </span>
                </div>
                <div className="flex justify-between bg-slate-900 px-3 py-2 rounded-lg border border-slate-800">
                  <span className="text-slate-400">外部委託・人件費:</span>
                  <span className="font-mono font-bold text-slate-200">
                    {item.financialBreakdown.outsourcingCost === 0 ? '0円' : formatJpy(item.financialBreakdown.outsourcingCost)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 事業サマリー */}
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2 mb-2">
              <Briefcase className="w-4 h-4 text-amber-400" />
              事業の仕組みと概要
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed bg-slate-950/40 p-4 rounded-xl border border-slate-800/80">
              {item.summary}
            </p>
          </div>

          {/* 初期の100人を集めた泥臭い手順 */}
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-blue-400" />
              最初の100人を獲得した泥臭い集客導線（First 100 Users）
            </h3>
            <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-500/20 text-sm text-blue-100/90 leading-relaxed">
              {item.first100UsersStrategy}
            </div>
          </div>

          {/* 使用ツールスタック（アフィリエイト導入リンク付き） */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-purple-400" />
                この事業を再現するためのツールスタック一式
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {item.tools.map((tool, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-start justify-between gap-3 hover:border-purple-500/40 transition"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{tool.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-500/20">
                        {tool.category}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">{tool.purpose}</p>
                    <span className="mt-2 inline-block text-[11px] font-mono text-slate-300">
                      月額: {tool.monthlyCostJpy === 0 ? '無料枠' : formatJpy(tool.monthlyCostJpy)}
                    </span>
                  </div>
                  <a
                    href={tool.officialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800 hover:bg-slate-700 transition"
                    title="ツール公式サイトを見る"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* 再現手順プレイブック（4ステップ） */}
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2 mb-3">
              <Layers className="w-4 h-4 text-amber-400" />
              あなたが明日から実行できる再現手順（4ステップ）
            </h3>
            <div className="space-y-3">
              {item.reproducibilityPlaybook.map((play) => (
                <div key={play.step} className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex gap-4">
                  <span className="w-7 h-7 rounded-full bg-amber-400/20 text-amber-300 font-mono font-bold flex items-center justify-center shrink-0 border border-amber-400/30 text-xs">
                    {play.step}
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-white">{play.title}</h4>
                    <p className="mt-1 text-xs text-slate-400 leading-relaxed">{play.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* PRO限定・秘密金庫エリア（マスキング＆解錠体験） */}
          <div className="relative rounded-lg overflow-hidden border border-amber-500/30 bg-gradient-to-br from-amber-950/20 via-slate-950 to-slate-950 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-400" />
                <span className="font-black text-amber-300 text-sm sm:text-base">
                  特別会員（PRO）限定：深層金庫インサイト
                </span>
              </div>
              <div className="flex items-center gap-2">
                {isPro ? (
                  <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    PRO会員 解錠済
                  </span>
                ) : (
                  <>
                    <button
                      onClick={handleCheckout}
                      disabled={checkoutLoading}
                      className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition cursor-pointer disabled:opacity-50"
                    >
                      <Crown className="w-3.5 h-3.5" />
                      <span>{checkoutLoading ? '処理中...' : 'PRO会員で全解放（¥1,980）'}</span>
                    </button>
                    <button
                      onClick={() => setDemoUnlocked(!demoUnlocked)}
                      className="text-[11px] text-zinc-400 hover:text-zinc-200 underline px-1 cursor-pointer"
                    >
                      {demoUnlocked ? '施錠' : 'デモ閲覧'}
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="relative">
              {/* マスキングオーバーレイ */}
              {!isUnlocked && (
                <div className="absolute inset-0 z-10 backdrop-blur-md bg-slate-950/70 flex flex-col items-center justify-center p-6 text-center rounded-xl border border-amber-500/20">
                  <Lock className="w-8 h-8 text-amber-400 mb-2" />
                  <p className="text-sm font-bold text-white">
                    非公開プロンプト・実務運用ナレッジ・事業撤退要因分析は特別会員限定です
                  </p>
                  <p className="mt-1 text-xs text-slate-400 max-w-md">
                    PRO会員に登録すると、全事例の深層金庫インサイトと契約書ひな形・生データが即時解放されます。
                  </p>
                  <button
                    onClick={handleCheckout}
                    disabled={checkoutLoading}
                    className="mt-3 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-lg transition shadow-lg cursor-pointer"
                  >
                    今すぐ全解放する（買い切り ¥1,980）
                  </button>
                </div>
              )}

              {/* 秘密インサイト本体 */}
              <div className={`p-4 rounded-xl bg-slate-900/90 text-xs sm:text-sm text-slate-200 leading-relaxed font-sans ${!isUnlocked ? 'filter blur-sm select-none' : ''}`}>
                {item.proSecretInsight}
              </div>
            </div>
          </div>
        </div>

        {/* モーダルフッター */}
        <div className="sticky bottom-0 z-20 px-6 py-4 bg-slate-900/95 border-t border-slate-800 backdrop-blur-md flex items-center justify-between">
          <span className="text-xs text-slate-400">登録日: {item.publishedAt}</span>
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
