'use client';

import React from 'react';
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
    <div className={`w-full min-h-0 flex-1 flex-col overflow-hidden border-b border-white/[0.08] bg-[#10151a] md:max-h-none md:w-[34%] md:min-w-[300px] md:max-w-[460px] md:flex-none md:border-b-0 md:border-r lg:w-[32%] ${mobileHidden ? 'hidden md:flex' : 'flex'}`}>
      {/* ヘッダー */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/[0.1] bg-[#171e25] px-4 py-3">
        <div className="min-w-0">
          <span className="text-sm font-semibold text-zinc-100">
            保存した事例とメモ
          </span>
        </div>
        <span className="shrink-0 text-xs tabular-nums text-zinc-400">
          {selectedEntityIds.size}件選択 / {savedEntities.length}件
        </span>
      </div>

      {/* 銘柄一覧 ＆ メモ入力 */}
      <div className="flex-1 space-y-3 overflow-y-auto p-3 scrollbar-thin scrollbar-thumb-white/10">
        {savedEntities.map((ent) => {
          const isSelected = selectedEntityIds.has(ent.id);
          const isFocused = activeEditingEntityId === ent.id;
          const currentNote = notes[ent.id]?.content || '';
          const profitKnown = !ent.pnl.isRevenueUnconfirmed && !ent.pnl.isOperatingProfitUnconfirmed && ent.pnl.financialStatus !== 'UNAVAILABLE';
          const marginKnown = !ent.pnl.isRevenueUnconfirmed && !ent.pnl.isMarginUnconfirmed && ent.pnl.financialStatus !== 'UNAVAILABLE';
          const hasSnapshotPeriod = Boolean(ent.pnl.dataSnapshotPeriod);

          return (
            <article
              key={ent.id}
              className={`rounded-md border p-3 transition-colors ${
                isFocused
                  ? 'border-sky-300/45 bg-[#0E1017] ring-1 ring-inset ring-sky-300/15'
                  : 'border-white/[0.12] bg-[#0A0B0F] hover:border-white/[0.2]'
              }`}
            >
              {/* 銘柄ヘッダー */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    type="button"
                    onClick={() => toggleSelectEntity(ent.id)}
                    aria-label={isSelected ? `${ent.name}の企画対象から外す` : `${ent.name}を企画対象にする`}
                    aria-pressed={isSelected}
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
                  >
                    {isSelected ? (
                      <CheckSquare aria-hidden="true" className="w-4 h-4 text-sky-200" />
                    ) : (
                      <Square aria-hidden="true" className="w-4 h-4 text-zinc-400" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveEditingEntityId(ent.id)}
                    aria-pressed={isFocused}
                    className="min-h-10 min-w-0 truncate rounded px-1 text-left text-sm font-semibold text-white hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
                  >
                    {ent.name}
                  </button>
                </div>
                {financialStatusLabel(ent) && <span className="shrink-0 text-xs text-zinc-300">{financialStatusLabel(ent)}</span>}
              </div>

              {ent.tagline && <p className="mb-3 text-sm leading-6 text-zinc-300">{ent.tagline}</p>}

              {(profitKnown || marginKnown || hasSnapshotPeriod) && <dl className="grid grid-cols-2 gap-x-3 gap-y-2 border-t border-white/[0.1] py-2.5 text-xs sm:grid-cols-3">
                {profitKnown && <div>
                  <dt className="text-zinc-400">営業利益</dt>
                  <dd className="mt-0.5 font-medium tabular-nums text-zinc-100">
                    {formatMoney(ent.pnl.operatingProfit)}
                  </dd>
                </div>}
                {marginKnown && <div>
                  <dt className="text-zinc-400">利益率</dt>
                  <dd className="mt-0.5 font-medium tabular-nums text-zinc-100">
                    {ent.pnl.operatingMargin}%
                  </dd>
                </div>}
                {hasSnapshotPeriod && <div>
                  <dt className="text-zinc-400">対象時期</dt>
                  <dd className="mt-0.5 truncate font-medium text-zinc-100">
                    {ent.pnl.dataSnapshotPeriod}
                  </dd>
                </div>}
              </dl>}

              {ent.strategy.blindspot && ent.strategy.blindspot !== '金額・費用の裏付けは未確認。' && <div className="mb-2 truncate text-xs text-zinc-300">
                着眼点: {ent.strategy.blindspot}
              </div>}

              {(ent.essence?.whatItDoes || ent.pricing?.pricePoint || ent.strategy?.initialTraction || ent.operations?.toolStack?.length > 0) && (
                <details className="mt-2 border-t border-white/[0.1] pt-2">
                  <summary className="min-h-8 cursor-pointer text-xs text-sky-200">事業内容・料金・運営</summary>
                  <dl className="space-y-3 py-2 text-sm leading-6 text-zinc-300">
                    {[
                      ['事業内容', ent.essence?.whatItDoes],
                      ['顧客', ent.essence?.targetCustomer],
                      ['解決する課題', ent.essence?.painRelief],
                      ['料金', ent.pricing?.pricePoint],
                      ['初期の顧客獲得', ent.strategy?.initialTraction?.join(' / ')],
                    ].filter(([, value]) => value && value !== 'UNKNOWN' && value !== '未確認').map(([label, value]) => (
                      <div key={label}><dt className="text-xs text-zinc-400">{label}</dt><dd>{value}</dd></div>
                    ))}
                    {ent.operations?.toolStack?.length > 0 && <div><dt className="text-xs text-zinc-400">利用ツール</dt><dd>{ent.operations.toolStack.map((tool) => tool.name).join(' / ')}</dd></div>}
                  </dl>
                </details>
              )}

              {/* アナリスト極秘メモ入力欄 */}
              <details className="mt-2 border-t border-white/[0.1] pt-2" open={currentNote ? true : undefined}>
                <summary className="flex min-h-8 cursor-pointer items-center justify-between gap-2 text-xs">
                  <span className="flex items-center gap-1.5 text-zinc-200">
                    <FileText aria-hidden="true" className="h-3.5 w-3.5 text-zinc-400" />
                    考察メモ（任意）
                  </span>
                  {currentNote && (
                    <span className="shrink-0 text-xs text-emerald-200">保存済み</span>
                  )}
                </summary>
                <textarea
                  rows={isFocused ? 3 : 2}
                  value={currentNote}
                  onFocus={() => setActiveEditingEntityId(ent.id)}
                  onChange={(e) => onSaveNote(ent.id, e.target.value)}
                  aria-label={`${ent.name}の考察メモ`}
                  placeholder="気づいたことを記録"
                  className="min-h-11 w-full resize-y rounded-md border border-white/[0.16] bg-[#0d1217] p-2.5 text-sm leading-5 text-zinc-100 placeholder:text-zinc-400 focus:border-sky-300/60 focus:outline-none focus:ring-2 focus:ring-sky-300/15"
                />
              </details>
            </article>
          );
        })}
      </div>

      {/* 下部アクションバー: 合成トリガー */}
      <div className="shrink-0 border-t border-white/[0.1] bg-[#171e25] p-3 md:hidden">
        <button
          onClick={handleSynthesize}
          disabled={isSynthesizing || selectedEntityIds.size === 0}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-sky-200 px-4 text-sm font-semibold text-slate-950 transition-colors hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {isSynthesizing && <Cpu className="h-4 w-4 animate-pulse" />}
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
