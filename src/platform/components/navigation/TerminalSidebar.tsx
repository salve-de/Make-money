'use client';

import React from 'react';
import { 
  Database, 
  UserCheck, 
  Flame, 
  Sparkles, 
  Bookmark, 
  ChevronLeft, 
  ChevronRight,
  TrendingUp,
  Cpu
} from 'lucide-react';
import { GridFilterOption } from '../../types/terminal';

interface TerminalSidebarProps {
  currentFilter: GridFilterOption;
  onSelectFilter: (filter: GridFilterOption) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  bookmarkCount: number;
}

export const TerminalSidebar: React.FC<TerminalSidebarProps> = ({
  currentFilter,
  onSelectFilter,
  collapsed,
  onToggleCollapse,
  bookmarkCount,
}) => {
  const navItems: { id: GridFilterOption; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'ALL', label: '全銘柄 財務台帳', icon: <Database className="w-3.5 h-3.5" /> },
    { id: 'SOLO', label: '完全1人 (ソロ)', icon: <UserCheck className="w-3.5 h-3.5" />, badge: 'SOLO' },
    { id: 'HIGH_MARGIN', label: '利益率50%超', icon: <Flame className="w-3.5 h-3.5" />, badge: '>50%' },
    { id: 'ZERO_CAPITAL', label: '初期資本0円〜', icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { id: 'MONOPOLY', label: '巨大独占 (メガテック)', icon: <Sparkles className="w-3.5 h-3.5" /> },
    { id: 'AI_NATIVE', label: 'AI・推論自動化', icon: <Cpu className="w-3.5 h-3.5" /> },
    { id: 'BOOKMARKED', label: '保存した銘柄', icon: <Bookmark className="w-3.5 h-3.5" />, badge: bookmarkCount > 0 ? String(bookmarkCount) : undefined },
  ];

  return (
    <aside 
      className={`hidden md:flex flex-col bg-[#07080B] border-r border-white/[0.06] transition-all duration-200 z-10 select-none ${
        collapsed ? 'w-12' : 'w-52'
      }`}
    >
      {/* ナビゲーションリスト */}
      <div className="flex-1 py-2 px-1.5 space-y-0.5 overflow-y-auto scrollbar-none">
        <div className={`px-2 py-1.5 text-[9px] font-mono uppercase tracking-widest text-zinc-600 ${collapsed ? 'hidden' : 'block'}`}>
          SECTORS
        </div>
        {navItems.map((item) => {
          const isActive = currentFilter === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectFilter(item.id)}
              className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded text-xs transition-colors ${
                isActive 
                  ? 'bg-white/[0.08] text-white font-medium' 
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]'
              } ${collapsed ? 'justify-center px-0' : ''}`}
              title={item.label}
            >
              <div className={`shrink-0 ${isActive ? 'text-zinc-200' : 'text-zinc-500'}`}>{item.icon}</div>
              {!collapsed && (
                <div className="flex-1 flex items-center justify-between truncate">
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-white/[0.04] text-zinc-500">
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* サイドバー折りたたみボタン */}
      <div className="p-1.5 border-t border-white/[0.06] flex items-center justify-between">
        {!collapsed && (
          <span className="text-[9px] font-mono text-zinc-600 px-1.5">
            TERMINAL v2.0
          </span>
        )}
        <button
          onClick={onToggleCollapse}
          className="p-1 text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04] rounded transition-colors"
          title={collapsed ? 'サイドバーを展開' : 'サイドバーを折りたたむ'}
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </div>
    </aside>
  );
};
