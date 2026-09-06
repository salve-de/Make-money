'use client';

import React from 'react';
import { BusinessItem } from '@/types/business';
import { formatJpy } from '@/lib/utils';
import { ShieldCheck, ArrowUpRight, Users, Clock, DollarSign, Sparkles, Building2, Wrench, Handshake } from 'lucide-react';

interface BusinessCardProps {
  item: BusinessItem;
  onSelect: (item: BusinessItem) => void;
}

export const BusinessCard: React.FC<BusinessCardProps> = ({ item, onSelect }) => {
  return (
    <div
      onClick={() => onSelect(item)}
      className="group relative bg-slate-900/70 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-lg p-5 transition-all duration-300 shadow-sm hover:shadow-md cursor-pointer flex flex-col justify-between"
    >
      <div>
        {/* 上部バッジ列 */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-400/10 text-amber-300 border border-amber-400/20">
              {item.businessModel}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-300">
              {item.automationLevel}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {item.isForSale && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                <Handshake className="w-3 h-3 text-emerald-400" />
                買収可能
              </span>
            )}
            {item.isVerified && (
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400" title="決済・財務実証済み">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="hidden sm:inline">実証済</span>
              </span>
            )}
          </div>
        </div>

        {/* タイトルとタグライン */}
        <h3 className="text-lg font-black text-white group-hover:text-amber-300 transition-colors leading-snug">
          {item.title}
        </h3>
        <p className="mt-1.5 text-xs text-slate-400 line-clamp-2 leading-relaxed">
          {item.tagline}
        </p>

        {/* 財務サマリーグリッド */}
        <div className="mt-4 grid grid-cols-3 gap-2 bg-slate-950/80 rounded-xl p-3 border border-slate-800/80 text-center">
          <div>
            <span className="text-[10px] text-slate-400 font-medium block">月間売上</span>
            <span className="text-sm sm:text-base font-black text-emerald-400 font-mono">
              {formatJpy(item.monthlyRevenueJpy)}
            </span>
          </div>
          <div className="border-x border-slate-800">
            <span className="text-[10px] text-slate-400 font-medium block">純利益率</span>
            <span className="text-sm sm:text-base font-black text-amber-400 font-mono">
              {item.profitMarginPercent}%
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-medium block">初期投資</span>
            <span className="text-xs sm:text-sm font-bold text-slate-200 font-mono mt-0.5 block">
              {item.initialInvestmentJpy === 0 ? '0円' : formatJpy(item.initialInvestmentJpy)}
            </span>
          </div>
        </div>

        {/* 運用実態メタデータ */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-slate-400 px-1">
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            チーム: <strong className="text-slate-200">{item.teamSize === 1 ? '完全1人' : `${item.teamSize}名`}</strong>
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            稼働: <strong className="text-slate-200">週{item.weeklyHoursSpent}時間</strong>
          </span>
          <span className="flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-slate-400" />
            黒字化: <strong className="text-slate-200">{item.monthsToProfitability}ヶ月</strong>
          </span>
        </div>

        {/* 使用ツールタグ */}
        <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5 text-slate-400 overflow-hidden">
            <Wrench className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="truncate">
              {item.tools.map((t) => t.name.split(' ')[0]).join(' / ')}
            </span>
          </div>
          <span className="text-slate-400 shrink-0">
            集客: <strong className="text-slate-300">{item.primaryAcquisitionChannel}</strong>
          </span>
        </div>
      </div>

      {/* カード下部・アクション */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.founderAvatar}
            alt={item.founderName}
            className="w-6 h-6 rounded-full object-cover border border-amber-400/40"
          />
          <span className="text-xs font-medium text-slate-300">{item.founderName}</span>
        </div>

        <button className="flex items-center gap-1 text-xs font-bold text-amber-400 group-hover:text-amber-300 transition-colors">
          <span>解剖台帳を見る</span>
          <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
};
