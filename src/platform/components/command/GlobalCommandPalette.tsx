'use client';

import { entityDescription } from '@/platform/utils/entityDescription';
import React, { useState, useEffect, useRef } from 'react';
import { FinancialEntity } from '../../types/terminal';
import { Search, X } from 'lucide-react';

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

  const q = query.trim().toLowerCase();
  const qNoSpace = q.replace(/\s+/g, '');
  const filtered = entities.filter((e) => {
    if (!q) return true;
    const nameNorm = e.name.toLowerCase();
    const nameNoSpace = nameNorm.replace(/\s+/g, '');
    const tickerNorm = e.ticker.toLowerCase();
    const founderNorm = (e.founder || '').toLowerCase();
    const taglineNorm = (e.tagline || '').toLowerCase();
    const blindspotNorm = (e.strategy?.blindspot || '').toLowerCase();
    const tagsNorm = (e.tags || []).join(' ').toLowerCase();

    return (
      nameNorm.includes(q) ||
      nameNoSpace.includes(qNoSpace) ||
      tickerNorm.includes(q) ||
      founderNorm.includes(q) ||
      taglineNorm.includes(q) ||
      blindspotNorm.includes(q) ||
      tagsNorm.includes(q)
    );
  });

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

  const financialEvidenceLabel = (status?: FinancialEntity['pnl']['financialStatus']) => {
    switch (status) {
      case 'VERIFIED': return '一次資料';
      case 'REPORTED': return '報告値';
      case 'ESTIMATED': return '推定';
      case 'POST_MORTEM': return '事後記録';
      default: return '未確認';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 md:pt-24 px-4 bg-black/75 backdrop-blur-xs"
      onClick={onClose}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="事例検索"
        className="w-full max-w-xl bg-[#090A0D] border border-white/[0.08] rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[70vh]"
      >
        {/* 検索入力 */}
        <div className="p-3 border-b border-white/[0.06] flex items-center gap-2 bg-[#07080A]">
          <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            aria-label="会社名・事例名・ティッカー・事業内容で検索"
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDownList}
            placeholder="会社名・事例名・ティッカー・事業内容を検索"
            className="min-h-11 flex-1 bg-transparent text-sm text-white placeholder:text-zinc-400 outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="検索を閉じる"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-zinc-300 hover:bg-white/[0.07] hover:text-white"
          >
            <X aria-hidden="true" className="w-4 h-4" />
          </button>
        </div>

        {/* 検索結果リスト */}
        <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
          {filtered.map((item, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectEntity(item.id);
                  onClose();
                }}
                onMouseEnter={() => setSelectedIndex(idx)}
                aria-pressed={isSelected}
                className={`w-full rounded-md p-3 text-left flex items-center justify-between gap-3 transition-colors ${
                  isSelected 
                    ? 'bg-sky-300/[0.14] ring-1 ring-inset ring-sky-300/30'
                    : 'hover:bg-white/[0.05]'
                }`}
              >
                <div className="min-w-0 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white truncate">
                      {item.name}
                    </span>
                    <span className="shrink-0 rounded border border-white/[0.12] px-1.5 py-0.5 text-[10px] text-zinc-300">
                      {financialEvidenceLabel(item.pnl.financialStatus)}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 line-clamp-2 mt-1 font-sans">
                    {entityDescription(item)}
                  </p>
                </div>

                <div className="shrink-0 text-right text-xs">
                  <div className="text-zinc-400">売上（月額換算）</div>
                  <div className="font-mono font-semibold tabular-nums text-white">
                    {item.pnl.isRevenueUnconfirmed || item.pnl.financialStatus === 'UNAVAILABLE' ? '未確認' : formatMoney(item.pnl.monthlyRevenue)}
                  </div>
                  <div className="mt-1 text-zinc-400">営業利益率</div>
                  <div className="font-mono tabular-nums text-zinc-200">
                    {item.pnl.isMarginUnconfirmed || item.pnl.financialStatus === 'UNAVAILABLE' ? '未確認' : `${item.pnl.operatingMargin}%`}
                  </div>
                </div>
              </button>
            );
          })}

          {filtered.length === 0 && (
            <div className="p-8 text-center text-sm text-zinc-300">
              一致する事例が見つかりません
            </div>
          )}
        </div>

        {/* フッターショートカット */}
        <div className="p-2 border-t border-white/[0.06] bg-[#07080A] text-[10px] font-mono text-zinc-500 flex items-center justify-between px-3">
          <div className="flex items-center gap-3">
            <span>↑↓ 選択</span>
            <span>ENTER 確定</span>
            <span>ESC 閉じる</span>
          </div>
          <span className="text-zinc-400">{filtered.length} 銘柄</span>
        </div>
      </div>
    </div>
  );
};
