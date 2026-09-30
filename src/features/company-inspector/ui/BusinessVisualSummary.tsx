import React from 'react';
import type { InspectorSectionProps } from '../model/section-props';
import { InspectorSectionCard } from './InspectorSectionCard';
import { snapshotPeriodLabel, sourceDocLabel } from '@/shared/display-text';

type Props = Pick<InspectorSectionProps, 'entity' | 'formatMoney' | 'isHazardMode' | 'isPro'>;
const content = (value: string | undefined) => {
  const text = value?.trim();
  return text && !/^(UNKNOWN|UNAVAILABLE|N\/A|未確認|不明|非公開|—|-)$/i.test(text) ? text : null;
};
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

export function BusinessVisualSummary({ entity, formatMoney, isHazardMode, isPro = false }: Props) {
  const pnl = entity.pnl;
  const meta = isPro ? entity.meta : undefined;
  const estimated = pnl?.financialStatus === 'ESTIMATED';
  const available = Boolean(pnl && pnl.financialStatus !== 'UNAVAILABLE');
  const known = (value: unknown, unconfirmed: boolean | undefined): value is number =>
    available && unconfirmed === false && finite(value);
  const customer = content(entity.essence?.targetCustomer);
  const offering = content(entity.essence?.whatItDoes) || content(entity.architecturePattern);
  const revenue = content(entity.pricing?.model);
  const incumbent = content(meta?.incumbentDilemma?.cannibalizationBarrier)
    || content(entity.strategy?.incumbentDilemma) || content(entity.strategy?.blindspot);
  const mechanism = content(entity.architecturePattern);
  const retention = content(meta?.lockInMechanism?.switchingFriction)
    || content(entity.strategy?.moatDescription);
  const capital = content(meta?.capitalEfficiency?.workingCapitalStrategy);
  const rows: { label: string; value: number; kind: 'income' | 'cost' | 'result' }[] = [];
  if (known(pnl?.monthlyRevenue, pnl?.isRevenueUnconfirmed)) rows.push({ label: '売上', value: pnl.monthlyRevenue, kind: 'income' });
  if (known(pnl?.cogs, pnl?.isCogsUnconfirmed)) rows.push({ label: '売上原価', value: pnl.cogs, kind: 'cost' });
  if (known(pnl?.grossProfit, pnl?.isGrossProfitUnconfirmed)) rows.push({ label: pnl.grossProfit < 0 ? '売上総損失' : '売上総利益', value: pnl.grossProfit, kind: 'result' });
  const expenseEntries = [
    ['サーバー・API', pnl?.operatingExpenses?.serverAndApi],
    ['広告', pnl?.operatingExpenses?.advertising],
    ['外注', pnl?.operatingExpenses?.subcontracting],
    ['ツール', pnl?.operatingExpenses?.toolsAndSaaS],
    ['その他費用', pnl?.operatingExpenses?.other],
  ] as const;
  for (const [label, value] of expenseEntries) {
    if (known(value, pnl?.isCostsUnconfirmed)) rows.push({ label, value, kind: 'cost' });
  }
  if (known(pnl?.operatingProfit, pnl?.isOperatingProfitUnconfirmed)) rows.push({ label: pnl.operatingProfit < 0 ? '営業損失' : '営業利益', value: pnl.operatingProfit, kind: 'result' });
  const hasFlow = Boolean(customer && offering && revenue);
  const hasComparison = Boolean(incumbent && mechanism);
  if (!hasFlow && !hasComparison && rows.length < 2 && !retention && !capital) return null;
  const max = Math.max(...rows.map((row) => Math.abs(row.value)), 1);
  const hasNegative = rows.some((row) => row.value < 0);
  return (
    <InspectorSectionCard id="section-business-visual" index="visual" categoryEn="Business structure" titleJa="事業の構造と損益" isHazardMode={isHazardMode}>
      <div className="space-y-4 py-3 text-xs leading-relaxed text-zinc-300">
        {hasFlow && <figure aria-label="顧客・提供価値・収益の構造">
          <figcaption className="mb-2 font-medium text-zinc-100">顧客 → 提供価値 → 収益モデル</figcaption>
          <ol className="grid gap-2 sm:grid-cols-3">
            {[["顧客", customer], ["提供価値", offering], ["収益モデル", revenue]].map(([label, value], index) => <li key={label} className="min-w-0 rounded-sm border border-term-line bg-transparent p-2.5 break-words">
              <div className="mb-1 text-term-fg">{index + 1}. {label}</div><p>{value}</p>
            </li>)}
          </ol>
          {content(entity.pricing?.pricePoint) && <p className="mt-1.5 text-zinc-400">価格帯：{entity.pricing?.pricePoint}</p>}
        </figure>}
        {hasComparison && <figure aria-label="価値提供経路の比較">
          <figcaption className="mb-2 font-medium text-zinc-100">価値提供経路の比較（登録分析）</figcaption>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="min-w-0 rounded-sm border border-term-line p-2.5 break-words"><p className="mb-1 text-zinc-400">既存側の摩擦・制約</p><p>{incumbent}</p></div>
            <div className="min-w-0 rounded-sm border border-term-line p-2.5 break-words"><p className="mb-1 text-term-fg">{entity.name}の提供構造</p><p>{mechanism}</p></div>
          </div>
        </figure>}
        {rows.length >= 2 && <figure aria-label="月額換算の損益項目比較">
          <figcaption className="mb-2 flex flex-wrap gap-x-2 font-medium text-zinc-100">
            <span>{estimated ? '推計損益' : '損益'}の項目別比較（月額換算）</span>
            {snapshotPeriodLabel(pnl.dataSnapshotPeriod) && <span className="font-normal text-zinc-400">{snapshotPeriodLabel(pnl.dataSnapshotPeriod)}</span>}
          </figcaption>
          <dl className="space-y-1.5">
            {rows.map((row) => <div key={row.label} className="grid grid-cols-[7rem_minmax(0,1fr)] items-center gap-2">
              <dt>{row.label}</dt><dd className="min-w-0">
                <div className={`text-right tabular-nums ${row.value < 0 ? 'text-term-danger' : 'text-zinc-200'}`}>{estimated ? '推計 ' : ''}{formatMoney(row.value)}</div>
                <div aria-hidden="true" className="relative mt-0.5 h-2 bg-term-head">
                  <span className="absolute inset-y-0 w-px bg-zinc-500" style={{ left: hasNegative ? '50%' : 0 }} />
                  <span className={`absolute inset-y-0 ${row.value < 0 ? 'bg-term-danger' : row.kind === 'cost' ? 'bg-term-dim' : 'bg-term-muted'}`} style={{
                    width: `${Math.abs(row.value) / max * (hasNegative ? 50 : 100)}%`,
                    left: `${hasNegative ? row.value < 0 ? 50 - Math.abs(row.value) / max * 50 : 50 : 0}%`,
                  }} />
                </div>
              </dd>
            </div>)}
          </dl>
          {hasNegative && <p className="mt-1 text-zinc-400">基準線の左は負の金額、右は正の金額。</p>}
          {sourceDocLabel(pnl.sourceDoc) && <p className="mt-2 break-words text-zinc-400">出典：{sourceDocLabel(pnl.sourceDoc)}</p>}
        </figure>}
        {(retention || capital) && <details className="border-t border-term-line pt-2">
          <summary className="cursor-pointer text-zinc-200">継続・資本運用の構造</summary>
          <dl className="mt-2 grid gap-2 sm:grid-cols-2">
            {retention && <div><dt className="text-term-fg">継続・切替摩擦</dt><dd className="break-words">{retention}</dd></div>}
            {capital && <div><dt className="text-term-fg">資本運用</dt><dd className="break-words">{capital}</dd></div>}
          </dl>
        </details>}
      </div>
    </InspectorSectionCard>
  );
}
