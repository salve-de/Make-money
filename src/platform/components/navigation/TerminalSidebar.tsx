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
    { id: 'ALL', label: '全銘柄 財務台帳', icon: <Database className="w-4 h-4" /> },
    { id: 'SOLO', label: '完全1人 (ソロプレナー)', icon: <UserCheck className="w-4 h-4" />, badge: 'SOLO' },
    { id: 'HIGH_MARGIN', label: '営業利益率50%超', icon: <Flame className="w-4 h-4" />, badge: '>50%' },
    { id: 'ZERO_CAPITAL', label: '初期資本0円〜少額', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'MONOPOLY', label: '巨大独占 (メガテック)', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'AI_NATIVE', label: 'AI・推論自動化', icon: <Cpu className="w-4 h-4" /> },
    { id: 'BOOKMARKED', label: '保存した銘柄', icon: <Bookmark className="w-4 h-4" />, badge: bookmarkCount > 0 ? String(bookmarkCount) : undefined },
  ];

  return (
    <aside 
      className={`hidden md:flex flex-col bg-[#090D14] border-r border-white/[0.08] transition-all duration-200 z-10 select-none ${
        collapsed ? 'w-14' : 'w-56'
      }`}
    >
      {/* ナビゲーションリスト */}
      <div className="flex-1 py-3 px-2 space-y-1 overflow-y-auto scrollbar-none">
        <div className={`px-2 pb-2 text-[10px] font-mono uppercase tracking-wider text-slate-400 ${collapsed ? 'hidden' : 'block'}`}>
          SECTORS & FILTERS
        </div>
        {navItems.map((item) => {
          const isActive = currentFilter === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectFilter(item.id)}
              className={`w-full flex items-center gap-3 px-2.5 py-2 rounded text-xs transition-colors ${
                isActive 
                  ? 'bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/30' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              } ${collapsed ? 'justify-center px-0' : ''}`}
              title={item.label}
            >
              <div className="shrink-0">{item.icon}</div>
              {!collapsed && (
                <div className="flex-1 flex items-center justify-between truncate">
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                      isActive 
                        ? 'bg-emerald-500/20 text-emerald-300' 
                        : 'bg-white/[0.06] text-slate-400'
                    }`}>
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
      <div className="p-2 border-t border-white/[0.08] flex items-center justify-between">
        {!collapsed && (
          <span className="text-[10px] font-mono text-slate-400 px-2">
            TERMINAL v2.0
          </span>
        )}
        <button
          onClick={onToggleCollapse}
          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] rounded transition-colors"
          title={collapsed ? 'サイドバーを展開' : 'サイドバーを折りたたむ'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
};
