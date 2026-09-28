'use client';

import { entityDescription } from '@/platform/utils/entityDescription';
import React, { useState, useEffect, useRef } from 'react';
import { FinancialEntity } from '../../types/terminal';
import { formatYen } from '@/platform/utils/moneyDisplay';

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
    return formatYen(yen);
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
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 px-3 pt-16 md:pt-24"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="事例検索"
        className="flex max-h-[70vh] w-full max-w-xl flex-col overflow-hidden border border-term-line bg-term-panel shadow-lg"
      >
        <div className="term-panel-title">
          <span className="term-panel-name">事例検索</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="検索を閉じる"
            className="ml-auto flex h-6 items-center px-1 text-xs text-term-muted hover:text-term-fg-strong"
          >
            閉じる
          </button>
        </div>

        {/* 検索入力 */}
        <div className="flex items-center gap-2 border-b border-term-line px-3">
          <span aria-hidden="true" className="font-mono text-sm text-term-accent">&gt;</span>
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
            className="min-h-11 flex-1 bg-transparent text-sm text-term-fg-strong outline-none placeholder:text-term-dim"
          />
        </div>

        {/* 検索結果リスト */}
        <div className="flex-1 overflow-y-auto">
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
                className={`flex w-full items-center justify-between gap-3 border-b border-term-line-soft px-3 py-2 text-left ${
                  isSelected ? 'bg-term-select text-term-fg-strong' : 'hover:bg-term-head'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[13px] font-semibold text-term-fg-strong">{item.name}</span>
                    <span className="shrink-0 text-xs text-term-label">
                      {financialEvidenceLabel(item.pnl.financialStatus)}
                    </span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-xs text-term-sub">{entityDescription(item)}</p>
                </div>

                <div className="shrink-0 text-right text-xs">
                  <div className="text-term-label">売上（月額換算）</div>
                  <div className={`font-mono tabular-nums ${item.pnl.isRevenueUnconfirmed || item.pnl.financialStatus === 'UNAVAILABLE' ? 'text-term-dim' : 'text-term-fg-strong'}`}>
                    {item.pnl.isRevenueUnconfirmed || item.pnl.financialStatus === 'UNAVAILABLE' ? '未確認' : formatMoney(item.pnl.monthlyRevenue)}
                  </div>
                  <div className="mt-1 text-term-label">営業利益率</div>
                  <div className={`font-mono tabular-nums ${item.pnl.isMarginUnconfirmed || item.pnl.financialStatus === 'UNAVAILABLE' ? 'text-term-dim' : 'text-term-fg'}`}>
                    {item.pnl.isMarginUnconfirmed || item.pnl.financialStatus === 'UNAVAILABLE' ? '未確認' : `${item.pnl.operatingMargin}%`}
                  </div>
                </div>
              </button>
            );
          })}

          {filtered.length === 0 && (
            <div className="p-6 text-center text-sm text-term-muted">一致する事例が見つかりません</div>
          )}
        </div>

        {/* キー操作 */}
        <div className="flex h-[22px] items-center justify-between border-t border-term-line bg-term-head px-3 font-mono text-xs text-term-label">
          <div className="flex items-center gap-3">
            <span><span className="text-term-accent">↑↓</span> 選択</span>
            <span><span className="text-term-accent">Enter</span> 確定</span>
            <span><span className="text-term-accent">Esc</span> 閉じる</span>
          </div>
          <span>{filtered.length} 件</span>
        </div>
      </div>
    </div>
  );
};
