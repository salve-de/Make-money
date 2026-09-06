'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FinancialEntity } from '../../types/terminal';
import { Search, X, ShieldCheck, ChevronRight } from 'lucide-react';

interface GlobalCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  entities: FinancialEntity[];
  onSelectEntity: (id: string) => void;
  currency: 'JPY' | 'USD';
}

export const GlobalCommandPalette: React.FC<GlobalCommandPaletteProps> = ({
  isOpen,
  onClose,
  entities,
  onSelectEntity,
  currency,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // ⌘K グローバルトリガー & ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filtered = entities.filter(
    (e) =>
      e.name.toLowerCase().includes(query.toLowerCase()) ||
      e.ticker.toLowerCase().includes(query.toLowerCase()) ||
      e.strategy.blindspot.toLowerCase().includes(query.toLowerCase()) ||
      e.founder.toLowerCase().includes(query.toLowerCase())
  );

  const handleKeyDownList = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      e.preventDefault();
      onSelectEntity(filtered[selectedIndex].id);
      onClose();
    }
  };

  const formatMoney = (yen: number) => {
    if (currency === 'USD') {
      const usd = Math.round(yen / 150);
      if (usd >= 1000000) return `$${(usd / 1000000).toFixed(1)}M`;
      if (usd >= 1000) return `$${(usd / 1000).toFixed(0)}k`;
      return `$${usd}`;
    }
    if (yen >= 100000000) return `¥${(yen / 100000000).toFixed(1)}億`;
    if (yen >= 10000) return `¥${Math.round(yen / 10000)}万`;
    return `¥${yen.toLocaleString()}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 md:pt-24 px-4 bg-black/70 backdrop-blur-sm select-none">
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-[#0C101A] border border-white/[0.15] rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[70vh]"
      >
        {/* 検索入力 */}
        <div className="p-3 border-b border-white/[0.1] flex items-center gap-2 bg-[#080C14]">
          <Search className="w-4 h-4 text-emerald-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDownList}
            placeholder="銘柄名、ティッカー、突いた盲点で即座にジャンプ..."
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-400 outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 検索結果リスト */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filtered.map((item, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <div
                key={item.id}
                onClick={() => {
                  onSelectEntity(item.id);
                  onClose();
                }}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`p-2.5 rounded cursor-pointer flex items-center justify-between transition-colors ${
                  isSelected 
                    ? 'bg-emerald-500/10 border border-emerald-500/30' 
                    : 'hover:bg-white/[0.04]'
                }`}
              >
                <div className="min-w-0 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-1 py-0.2 rounded">
                      {item.ticker}
                    </span>
                    <span className="text-xs font-bold text-white truncate">
                      {item.name}
                    </span>
                    {item.verifiedBadge && (
                      <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                    {item.strategy.blindspot}
                  </p>
                </div>

                <div className="text-right shrink-0 font-mono text-[11px]">
                  <div className="font-bold text-white tabular-nums">
                    {formatMoney(item.pnl.monthlyRevenue)}
                  </div>
                  <div className="text-emerald-400 text-[10px] tabular-nums">
                    営利 {item.pnl.operatingMargin}%
                  </div>
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-400 font-mono">
              一致する銘柄が見つかりません
            </div>
          )}
        </div>

        {/* フッターショートカット */}
        <div className="p-2 border-t border-white/[0.08] bg-[#080C14] text-[10px] font-mono text-slate-400 flex items-center justify-between px-3">
          <div className="flex items-center gap-2">
            <span>↑↓: 選択</span>
            <span>ENTER: 確定</span>
            <span>ESC: 閉じる</span>
          </div>
          <span className="text-emerald-400 font-bold">{filtered.length} 銘柄</span>
        </div>
      </div>
    </div>
  );
};
