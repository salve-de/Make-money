'use client';

import React from 'react';
import Link from 'next/link';
import { FinancialEntity } from '../../types/terminal';
import { 
  CheckSquare, 
  Square, 
  FileText,
  Cpu
} from 'lucide-react';

interface SynthesisEntitiesSidebarProps {
  mobileHidden?: boolean;
  savedEntities: FinancialEntity[];
  selectedEntityIds: Set<string>;
  toggleSelectEntity: (id: string) => void;
  activeEditingEntityId: string;
  setActiveEditingEntityId: (id: string) => void;
  notes: Record<string, { entityId: string; content: string; updatedAt: string }>;
  onSaveNote: (entityId: string, content: string) => void;
  formatMoney: (yen: number) => string;
  handleSynthesize: () => void;
  isSynthesizing: boolean;
}

function financialStatusLabel(entity: FinancialEntity): string | null {
  if (entity.pnl.financialStatus === 'UNAVAILABLE' || entity.pnl.isRevenueUnconfirmed) return null;
  switch (entity.pnl.financialStatus) {
    case 'VERIFIED': return '一次資料';
    case 'REPORTED': return '報告値';
    case 'ESTIMATED': return '推計';
    case 'POST_MORTEM': return '事後記録';
    default: return null;
  }
}

export const SynthesisEntitiesSidebar: React.FC<SynthesisEntitiesSidebarProps> = ({
  mobileHidden = false,
  savedEntities,
  selectedEntityIds,
  toggleSelectEntity,
  activeEditingEntityId,
  setActiveEditingEntityId,
  notes,
  onSaveNote,
  formatMoney,
  handleSynthesize,
  isSynthesizing,
}) => {
  return (
    <div className={`w-full min-h-0 flex-1 flex-col overflow-hidden border-b border-term-line bg-term-bg md:max-h-none md:w-[34%] md:min-w-[300px] md:max-w-[460px] md:flex-none md:border-b-0 md:border-r lg:w-[32%] ${mobileHidden ? 'hidden md:flex' : 'flex'}`}>
      <div className="term-panel-title shrink-0">
        <span className="term-panel-name">保存した事例とメモ</span>
        <span className="term-num ml-auto">{selectedEntityIds.size}件選択 / {savedEntities.length}件</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {savedEntities.length === 0 && (
          <div className="px-3 py-4 text-sm">
            <p className="text-term-fg-strong">保存した事例がここに並びます</p>
            <p className="mt-1 text-term-sub">事例一覧で気になる事例を保存すると、企画案の材料に選べます。</p>
            <Link href="/" prefetch={false} className="mt-3 inline-flex min-h-11 items-center border border-term-accent px-3 text-sm text-term-accent hover:bg-term-head lg:min-h-8">事例一覧を開く</Link>
          </div>
        )}
        {savedEntities.map((ent, index) => {
          const isSelected = selectedEntityIds.has(ent.id);
          const isFocused = activeEditingEntityId === ent.id;
          const currentNote = notes[ent.id]?.content || '';
          const profitKnown = !ent.pnl.isRevenueUnconfirmed && !ent.pnl.isOperatingProfitUnconfirmed && ent.pnl.financialStatus !== 'UNAVAILABLE';
          const marginKnown = !ent.pnl.isRevenueUnconfirmed && !ent.pnl.isMarginUnconfirmed && ent.pnl.financialStatus !== 'UNAVAILABLE';
          const hasSnapshotPeriod = Boolean(ent.pnl.dataSnapshotPeriod);
          const rowBg = isFocused ? 'bg-term-select' : index % 2 ? 'bg-term-row-alt' : '';

          return (
            <article key={ent.id} className={`border-b border-term-line-soft px-3 py-1.5 ${rowBg}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => toggleSelectEntity(ent.id)}
                    aria-label={isSelected ? `${ent.name}の企画対象から外す` : `${ent.name}を企画対象にする`}
                    aria-pressed={isSelected}
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center text-term-muted hover:text-term-fg-strong lg:h-8 lg:w-8"
                  >
                    {isSelected ? (
                      <CheckSquare aria-hidden="true" className="h-4 w-4 text-term-accent" />
                    ) : (
                      <Square aria-hidden="true" className="h-4 w-4 text-term-label" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveEditingEntityId(ent.id)}
                    aria-pressed={isFocused}
                    className="min-h-11 min-w-0 truncate px-1 text-left text-sm font-semibold text-term-fg-strong hover:underline lg:min-h-8"
                  >
                    {ent.name}
                  </button>
                </div>
                {financialStatusLabel(ent) && <span className="shrink-0 text-xs text-term-muted">{financialStatusLabel(ent)}</span>}
              </div>

              {ent.tagline && <p className="pl-1 text-sm leading-6 text-term-sub lg:pl-9">{ent.tagline}</p>}

              {(profitKnown || marginKnown || hasSnapshotPeriod) && <dl className="mt-1 grid grid-cols-2 border-t border-term-line-soft text-xs sm:grid-cols-3">
                {profitKnown && <div className="py-1.5 pr-2">
                  <dt className="text-term-label">営業利益</dt>
                  <dd className="term-num text-sm text-term-fg-strong">{formatMoney(ent.pnl.operatingProfit)}</dd>
                </div>}
                {marginKnown && <div className="py-1.5 pr-2">
                  <dt className="text-term-label">利益率</dt>
                  <dd className="term-num text-sm text-term-fg-strong">{ent.pnl.operatingMargin}%</dd>
                </div>}
                {hasSnapshotPeriod && <div className="py-1.5">
                  <dt className="text-term-label">対象時期</dt>
                  <dd className="term-num truncate text-sm text-term-fg">{ent.pnl.dataSnapshotPeriod}</dd>
                </div>}
              </dl>}

              {ent.strategy.blindspot && ent.strategy.blindspot !== '金額・費用の裏付けは未確認。' && <div className="truncate text-xs text-term-sub">
                着眼点: {ent.strategy.blindspot}
              </div>}

              {(ent.essence?.whatItDoes || ent.pricing?.pricePoint || ent.strategy?.initialTraction || ent.operations?.toolStack?.length > 0) && (
                <details className="mt-1 border-t border-term-line-soft">
                  <summary className="flex min-h-11 cursor-pointer items-center text-xs text-term-select-fg lg:min-h-8">事業内容・料金・運営</summary>
                  <dl className="space-y-2 pb-2 text-sm leading-6 text-term-sub">
                    {[
                      ['事業内容', ent.essence?.whatItDoes],
                      ['顧客', ent.essence?.targetCustomer],
                      ['解決する課題', ent.essence?.painRelief],
                      ['料金', ent.pricing?.pricePoint],
                      ['初期の顧客獲得', ent.strategy?.initialTraction?.join(' / ')],
                    ].filter(([, value]) => value && value !== 'UNKNOWN' && value !== '未確認').map(([label, value]) => (
                      <div key={label}><dt className="text-xs text-term-label">{label}</dt><dd>{value}</dd></div>
                    ))}
                    {ent.operations?.toolStack?.length > 0 && <div><dt className="text-xs text-term-label">利用ツール</dt><dd>{ent.operations.toolStack.map((tool) => tool.name).join(' / ')}</dd></div>}
                  </dl>
                </details>
              )}

              <details className="border-t border-term-line-soft" open={currentNote ? true : undefined}>
                <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-2 text-xs lg:min-h-8">
                  <span className="flex items-center gap-1.5 text-term-fg">
                    <FileText aria-hidden="true" className="h-3.5 w-3.5 text-term-label" />
                    考察メモ（任意）
                  </span>
                  {currentNote && (
                    <span className="shrink-0 text-xs text-term-muted">保存済み</span>
                  )}
                </summary>
                <textarea
                  rows={isFocused ? 3 : 2}
                  value={currentNote}
                  onFocus={() => setActiveEditingEntityId(ent.id)}
                  onChange={(e) => onSaveNote(ent.id, e.target.value)}
                  aria-label={`${ent.name}の考察メモ`}
                  placeholder="気づいたことを記録"
                  className="mb-1 min-h-11 w-full resize-y rounded-sm border border-term-line bg-term-bg p-2 text-sm leading-5 text-term-fg-strong placeholder:text-term-dim focus:border-term-accent focus:outline-none"
                />
              </details>
            </article>
          );
        })}
      </div>

      <div className="shrink-0 border-t border-term-line bg-term-panel p-2 md:hidden">
        <button
          onClick={handleSynthesize}
          disabled={isSynthesizing || selectedEntityIds.size === 0}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-sm border border-term-accent bg-transparent px-4 text-sm text-term-accent hover:bg-term-head disabled:cursor-not-allowed disabled:opacity-45"
        >
          {isSynthesizing && <Cpu aria-hidden="true" className="h-4 w-4 animate-pulse" />}
          {isSynthesizing ? (
            <span>企画案を作成中…</span>
          ) : (
            <span>企画案を作る（{selectedEntityIds.size}件選択）</span>
          )}
        </button>
      </div>
    </div>
  );
};
