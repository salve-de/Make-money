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
    <section id="section-cash-anatomy" className="rounded-xl border border-white/[0.08] bg-[#0A0D14] p-4 text-xs">
      <h3 className="font-bold text-zinc-300">財務データの一部は未確認</h3>
      <dl className="mt-2 space-y-1 text-zinc-400">
        <div><dt className="inline">月商: </dt><dd className="inline">{revenueKnown ? formatMoney(pnl.monthlyRevenue) : '未確認'}</dd></div>
        <div><dt className="inline">営業利益: </dt><dd className="inline">{profitKnown ? formatMoney(pnl.operatingProfit) : '未確認'}</dd></div>
      </dl>
      <p className="mt-2 text-zinc-500">原価・利益の内訳を確認できないため、損益グラフは表示していません。</p>
    </section>
  );
}
