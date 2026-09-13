'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, ChevronRight } from 'lucide-react';
import { CompanyRecord } from '@/types/terminal';

interface SearchPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  companies: CompanyRecord[];
  onSelectCompany: (companyId: string) => void;
}

export const SearchPaletteModal: React.FC<SearchPaletteModalProps> = ({
  isOpen,
  onClose,
  companies,
  onSelectCompany
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const [previousIsOpen, setPreviousIsOpen] = useState(isOpen);
  if (previousIsOpen !== isOpen) {
    setPreviousIsOpen(isOpen);
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
  }

  useEffect(() => {
    if (!isOpen) return;
    const timeout = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(timeout);
  }, [isOpen]);

  // グローバル⌘Kキー監視
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else setQuery('');
      }
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // 絞り込み結果
  const filtered = query.trim() === ''
    ? companies.slice(0, 8)
    : companies.filter((c) => {
        const q = query.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.japaneseName.toLowerCase().includes(q) ||
          c.ticker.toLowerCase().includes(q) ||
          (c.founderName && c.founderName.toLowerCase().includes(q)) ||
          c.tagline.toLowerCase().includes(q) ||
          (c.businessEssence?.whatItDoes && c.businessEssence.whatItDoes.toLowerCase().includes(q)) ||
          c.businessModel.toLowerCase().includes(q)
        );
      });

  const handleKeyDownInList = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      e.preventDefault();
      onSelectCompany(filtered[selectedIndex].id);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-start justify-center pt-12 sm:pt-20 px-3 select-none font-sans">
      <div 
        className="w-full max-w-xl bg-[#0F131C] border border-white/[0.14] rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 検索インプットバー */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.08] bg-[#141924]">
          <Search size={16} className="text-zinc-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDownInList}
            placeholder="銘柄名・創業者・ビジネスモデル・手口を検索..."
            className="flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-zinc-500 hover:text-zinc-300 p-0.5 rounded cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-zinc-400 bg-white/[0.06] rounded border border-white/[0.08]">
            ESC
          </kbd>
        </div>

        {/* 検索候補リスト */}
        <div className="max-h-[60vh] overflow-y-auto p-1.5 space-y-0.5 divide-y divide-white/[0.03]">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-500 font-mono">
              合致する銘柄・手口が見つかりません
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const rev = item.financials?.[item.financials.length - 1]?.revenueJpy || 0;
              const margin = item.financials?.[item.financials.length - 1]?.operatingMarginPercent || 0;

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    onSelectCompany(item.id);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between p-2.5 rounded cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-white/[0.08] text-white'
                      : 'text-zinc-300 hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded bg-zinc-900 border border-white/[0.1] flex items-center justify-center font-mono text-[10px] font-bold text-zinc-300 shrink-0">
                      {item.ticker.slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-zinc-100 truncate">
                          {item.japaneseName}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-400">
                          #{item.ticker}
                        </span>
                        <span className="text-[9px] px-1 py-0.2 rounded bg-white/[0.06] text-zinc-400 font-mono">
                          {item.teamSize === 1 ? '1人' : `${item.teamSize}名`}
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-400 truncate mt-0.5">
                        {item.tagline}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 pl-3">
                    <div className="text-right font-mono text-xs">
                      <div className="text-zinc-200 font-bold">
                        {rev >= 1000000000000
                          ? `¥${(rev / 1000000000000).toFixed(1)}兆`
                          : rev >= 100000000
                          ? `¥${Math.round(rev / 100000000)}億`
                          : `¥${Math.round(rev / 10000)}万`}
                      </div>
                      <div className={`text-[10px] font-bold ${margin >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        利 {margin}%
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-zinc-600" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 下部ショートカットフッター */}
        <div className="px-4 py-2 border-t border-white/[0.06] bg-[#0A0D14] flex items-center justify-between text-[10px] font-mono text-zinc-500">
          <div className="flex items-center gap-3">
            <span>↑↓ 選択</span>
            <span>↵ 決定</span>
            <span>ESC 閉じる</span>
          </div>
          <div>{filtered.length} 件表示中</div>
        </div>
      </div>
    </div>
  );
};
