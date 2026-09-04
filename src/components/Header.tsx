'use client';

import React from 'react';
import { Database, ShieldCheck, Flame, Crown, PlusCircle, Sparkles, Handshake } from 'lucide-react';
import { formatJpy } from '@/lib/utils';

interface HeaderProps {
  totalMonthlyRevenue: number;
  averageProfitMargin: number;
  totalBusinesses: number;
  onOpenDiagnostic: () => void;
  onOpenSubmit: () => void;
  onOpenPro: () => void;
  onOpenMa: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  totalMonthlyRevenue,
  averageProfitMargin,
  totalBusinesses,
  onOpenDiagnostic,
  onOpenSubmit,
  onOpenPro,
  onOpenMa,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-amber-500/20 bg-slate-950/90 backdrop-blur-md">
      {/* 上部リアルタイム市場指標バナー */}
      <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-amber-950/40 px-4 py-1.5 border-b border-amber-500/10 text-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-slate-300">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-amber-300 font-bold tracking-wider">金鉱指標（市場実態速報）:</span>
            <span>掲載総月商 <strong className="text-emerald-400 font-mono text-sm">{formatJpy(totalMonthlyRevenue)}</strong>/月</span>
            <span className="text-slate-600">|</span>
            <span>平均純利益率 <strong className="text-amber-400 font-mono text-sm">{averageProfitMargin.toFixed(1)}%</strong></span>
            <span className="text-slate-600">|</span>
            <span>公認登録事例数 <strong className="text-white font-mono text-sm">{totalBusinesses}件</strong></span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span className="flex items-center gap-1 text-emerald-400/90">
              <ShieldCheck className="w-3.5 h-3.5" />
              全件財務エビデンス検証済
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">更新: 2026年9月最新版</span>
          </div>
        </div>
      </div>

      {/* メインヘッダー */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 border border-amber-300/30">
            <Database className="w-5 h-5 text-slate-950 font-black" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold tracking-tight text-white">
                金鉱録<span className="text-amber-400">.</span>
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-amber-400/10 text-amber-300 border border-amber-400/30">
                一次情報金庫
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">個人・スモールビジネス生々しい収益公認台帳</p>
          </div>
        </div>

        {/* ナビゲーションアクション */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onOpenDiagnostic}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 text-slate-200 border border-slate-700 hover:border-amber-400/50 hover:bg-slate-800 transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>適性診断</span>
          </button>

          <button
            onClick={onOpenMa}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 text-slate-200 border border-slate-700 hover:border-emerald-400/50 hover:bg-slate-800 transition"
          >
            <Handshake className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">事業買収</span>
            <span>M&A</span>
          </button>

          <button
            onClick={onOpenSubmit}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 text-slate-200 border border-slate-700 hover:border-blue-400/50 hover:bg-slate-800 transition"
          >
            <PlusCircle className="w-3.5 h-3.5 text-blue-400" />
            <span>事例掲載</span>
          </button>

          <button
            onClick={onOpenPro}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20 hover:brightness-110 transition active:scale-95"
          >
            <Crown className="w-3.5 h-3.5" />
            <span>PRO金庫解錠</span>
          </button>
        </div>
      </div>
    </header>
  );
};
