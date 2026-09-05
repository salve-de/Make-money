'use client';

import React from 'react';

export type RailNavView = 'ALL' | 'ENTERPRISE' | 'SOLO' | 'MOMENTUM' | 'FOR_SALE';

interface LeftRailProps {
  activeView: RailNavView;
  onSelectView: (view: RailNavView) => void;
  forSaleCount: number;
}

export const LeftRail: React.FC<LeftRailProps> = ({
  activeView,
  onSelectView,
  forSaleCount
}) => {
  const navItems: { id: RailNavView; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'ALL',
      label: '全台帳',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      )
    },
    {
      id: 'ENTERPRISE',
      label: '大企業・覇者',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      )
    },
    {
      id: 'SOLO',
      label: '個人・少数精鋭',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    },
    {
      id: 'MOMENTUM',
      label: '急成長速報',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      )
    },
    {
      id: 'FOR_SALE',
      label: '事業売買案件',
      badge: forSaleCount,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
  ];

  return (
    <div className="w-14 bg-[#101216] border-r border-white/[0.08] flex flex-col items-center py-3 select-none shrink-0 justify-between">
      <div className="flex flex-col items-center gap-2 w-full">
        {navItems.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectView(item.id)}
              title={item.label}
              className={`relative w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                isActive
                  ? 'bg-zinc-800 text-zinc-100 border border-white/10 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-850'
              }`}
            >
              {/* 左のアクティブバー */}
              {isActive && (
                <span className="absolute left-0 top-2 bottom-2 w-0.5 bg-white rounded-r"></span>
              )}
              {item.icon}
              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute -top-1 -right-1 bg-zinc-200 text-black text-[9px] font-mono font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 下部情報 */}
      <div className="flex flex-col items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/5 flex items-center justify-center text-zinc-400 text-xs font-mono">
          PRO
        </div>
      </div>
    </div>
  );
};
