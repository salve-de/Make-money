'use client';

import { inspectFinancialIntegrity } from '@/shared/financial-integrity';
import { Banknote } from 'lucide-react';

import type { InspectorSectionProps } from '../model/section-props';
import { IncompleteCashSummary } from './IncompleteCashSummary';

function percentOf(value: number, revenue: number): number {
  return revenue > 0 ? Math.round((value / revenue) * 100) : 0;
}

export function CashAnatomySection({
  entity,
  isHazardMode,
  formatMoney,
  isFinancialUnavailable
}: Pick<
  InspectorSectionProps,
  'entity' | 'isHazardMode' | 'formatMoney' | 'isFinancialUnavailable'
>) {
  const rev = Math.max(entity.pnl?.monthlyRevenue ?? 0, 0);
  const cogs = Math.max(entity.pnl?.cogs ?? 0, 0);
  const opexObj = entity.pnl?.operatingExpenses ?? {
    serverAndApi: 0,
    advertising: 0,
    subcontracting: 0,
    toolsAndSaaS: 0,
    other: 0
  };
  const totalOpex = Math.max(
    (opexObj.serverAndApi || 0) +
      (opexObj.advertising || 0) +
      (opexObj.subcontracting || 0) +
      (opexObj.toolsAndSaaS || 0) +
      (opexObj.other || 0),
    0
  );
  const profit = entity.pnl?.operatingProfit ?? 0;
  const grossProfit = rev - cogs;
  const isLoss = profit < 0;
  const actualCogsPct = percentOf(cogs, rev);
  const opexPct = percentOf(totalOpex, rev);
  const actualProfitPct = percentOf(profit, rev);
  const grossProfitPct = percentOf(grossProfit, rev);

  const integrity = inspectFinancialIntegrity(entity.pnl);
  const hasConflict = integrity.profitConflict || integrity.grossConflict || integrity.marginConflict;
  const incompleteInputs = Boolean(
    entity.pnl.isRevenueUnconfirmed ||
      entity.pnl.isOperatingProfitUnconfirmed ||
      entity.pnl.isCostsUnconfirmed ||
      entity.pnl.isCogsUnconfirmed ||
      rev <= 0
  );

  if (isFinancialUnavailable) {
    return (
      <section id="section-cash-anatomy" className="rounded-lg border border-white/[0.10] bg-[#11151d] p-4 text-xs">
        <p className="font-semibold text-zinc-200">財務データは未確認です。</p>
        <p className="mt-1 text-zinc-400">月商・原価・営業利益の確認が揃うまで、損益明細を表示しません。</p>
      </section>
    );
  }

  if (incompleteInputs) return <IncompleteCashSummary entity={entity} formatMoney={formatMoney} />;

  if (hasConflict) {
    return (
      <section id="section-cash-anatomy" className="rounded-lg border border-amber-500/30 bg-[#11151d] p-4 text-xs">
        <p className="font-semibold text-amber-200">財務数値に不整合があるため、損益明細を停止しています。</p>
        <p className="mt-1 text-zinc-400">
          売上−原価−販管費と記録された粗利益・営業利益の照合が通るまで、比率を表示しません。
        </p>
      </section>
    );
  }

  const statusLabel = {
    VERIFIED: '一次確認',
    REPORTED: '報道・取材',
    ESTIMATED: '推定',
    POST_MORTEM: '事後検証',
    UNAVAILABLE: '未確認'
  }[entity.pnl.financialStatus || 'UNAVAILABLE'];

  return (
    <section
      id="section-cash-anatomy"
      className={`rounded-lg border bg-[#11151d] p-4 sm:p-5 ${
        isHazardMode ? 'border-red-500/30' : 'border-white/[0.10]'
      }`}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-white/[0.08] pb-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <Banknote className={`mt-0.5 h-4 w-4 shrink-0 ${isHazardMode ? 'text-red-400' : 'text-blue-400'}`} />
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-zinc-100">月次損益</h3>
            <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-400">
              図解は使わず、売上・原価・販管費・営業利益を明細で確認します。
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-zinc-400">
          <span className="rounded border border-white/[0.10] bg-white/[0.03] px-2 py-1">{statusLabel}</span>
          {entity.pnl.dataSnapshotPeriod && (
            <span className="rounded border border-white/[0.10] bg-white/[0.03] px-2 py-1">{entity.pnl.dataSnapshotPeriod}</span>
          )}
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric label="売上高" value={formatMoney(rev)} tone="blue" />
        <Metric label="売上原価" value={formatMoney(cogs)} suffix={`${actualCogsPct}%`} />
        <Metric label="販管費" value={formatMoney(totalOpex)} suffix={`${opexPct}%`} />
        <Metric
          label="営業利益"
          value={formatMoney(profit)}
          suffix={`${actualProfitPct}%`}
          tone={isLoss ? 'red' : 'green'}
        />
      </div>

      <div className="overflow-x-auto rounded-md border border-white/[0.08] bg-[#0b0f15]">
        <table className="w-full min-w-[620px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-white/[0.08] text-[10px] text-zinc-500">
              <th className="px-3 py-2 font-medium">勘定科目</th>
              <th className="px-3 py-2 text-right font-medium">月次金額</th>
              <th className="px-3 py-2 text-right font-medium">売上比</th>
              <th className="px-3 py-2 font-medium">意味</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
            <FinancialRow label="売上高" value={formatMoney(rev)} ratio="100%" detail="本業の総売上" tone="blue" />
            <FinancialRow label="売上原価" value={`-${formatMoney(cogs)}`} ratio={`${actualCogsPct}%`} detail="売上に直接対応する原価" />
            <FinancialRow
              label="粗利益"
              value={formatMoney(grossProfit)}
              ratio={`${grossProfitPct}%`}
              detail="売上高 − 売上原価"
              tone={grossProfit < 0 ? 'red' : 'blue'}
              strong
            />
            <FinancialRow
              label="販管費"
              value={`-${formatMoney(totalOpex)}`}
              ratio={`${opexPct}%`}
              detail={`サーバー ${formatMoney(opexObj.serverAndApi || 0)} / 広告 ${formatMoney(opexObj.advertising || 0)} / 外注 ${formatMoney(opexObj.subcontracting || 0)} / ツール ${formatMoney(opexObj.toolsAndSaaS || 0)}`}
            />
            <FinancialRow
              label="営業利益"
              value={formatMoney(profit)}
              ratio={`${actualProfitPct}%`}
              detail="粗利益 − 販管費（税引前）"
              tone={isLoss ? 'red' : 'green'}
              strong
            />
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-2 text-[10px] leading-relaxed text-zinc-500">
        <p>売上高 {formatMoney(rev)} / 粗利益 {formatMoney(grossProfit)} / 営業利益 {formatMoney(profit)}</p>
        <p>営業利益は税引後キャッシュや創業者の手取りではありません。</p>
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  suffix,
  tone = 'neutral'
}: {
  label: string;
  value: string;
  suffix?: string;
  tone?: 'neutral' | 'blue' | 'green' | 'red';
}) {
  const valueClass = {
    neutral: 'text-zinc-100',
    blue: 'text-blue-300',
    green: 'text-emerald-300',
    red: 'text-red-300'
  }[tone];

  return (
    <div className="rounded-md border border-white/[0.07] bg-[#151a23] px-3 py-2.5">
      <span className="block text-[10px] text-zinc-500">{label}</span>
      <span className={`mt-0.5 block font-mono text-sm font-semibold tabular-nums ${valueClass}`}>
        {value}
        {suffix && <span className="ml-1.5 text-[10px] font-medium text-zinc-500">{suffix}</span>}
      </span>
    </div>
  );
}

function FinancialRow({
  label,
  value,
  ratio,
  detail,
  tone = 'neutral',
  strong = false
}: {
  label: string;
  value: string;
  ratio: string;
  detail: string;
  tone?: 'neutral' | 'blue' | 'green' | 'red';
  strong?: boolean;
}) {
  const valueClass = {
    neutral: 'text-zinc-300',
    blue: 'text-blue-300',
    green: 'text-emerald-300',
    red: 'text-red-300'
  }[tone];

  return (
    <tr className={strong ? 'bg-white/[0.02]' : undefined}>
      <td className={`px-3 py-2.5 ${strong ? 'font-semibold text-zinc-100' : 'text-zinc-300'}`}>{label}</td>
      <td className={`px-3 py-2.5 text-right font-mono tabular-nums ${valueClass}`}>{value}</td>
      <td className="px-3 py-2.5 text-right font-mono tabular-nums text-zinc-400">{ratio}</td>
      <td className="px-3 py-2.5 text-[11px] text-zinc-500">{detail}</td>
    </tr>
  );
}
