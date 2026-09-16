import type { FinancialEntity } from '@/shared/terminal';

/** Do not manufacture profit/costs from a revenue-only dossier. */
export function IncompleteCashSummary({ entity, formatMoney }: {
  entity: FinancialEntity;
  formatMoney: (amount: number) => string;
}) {
  const pnl = entity.pnl;
  const revenueKnown = !pnl.isRevenueUnconfirmed && Number.isFinite(pnl.monthlyRevenue);
  const profitKnown = !pnl.isOperatingProfitUnconfirmed && Number.isFinite(pnl.operatingProfit);
  return (
    <section id="section-cash-anatomy" className="rounded-md border border-white/[0.12] bg-[#10131C] p-4 text-xs">
      <h3 className="font-bold text-[#F4F5F7]">財務データの一部は未確認</h3>
      <dl className="mt-2 space-y-1 text-zinc-300">
        <div><dt className="inline text-zinc-400">月商: </dt><dd className="inline font-mono text-zinc-200">{revenueKnown ? formatMoney(pnl.monthlyRevenue) : '未確認'}</dd></div>
        <div><dt className="inline text-zinc-400">営業利益: </dt><dd className="inline font-mono text-zinc-200">{profitKnown ? formatMoney(pnl.operatingProfit) : '未確認'}</dd></div>
      </dl>
      <p className="mt-2 text-zinc-500">原価・利益の内訳を確認できないため、損益グラフは表示していません。</p>
    </section>
  );
}
