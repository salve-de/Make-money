import type { InspectorSectionProps } from '../model/section-props';
import { InspectorSectionCard } from './InspectorSectionCard';

function known(value: unknown, unconfirmed?: boolean, minimum = 0): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= minimum
    && unconfirmed !== true && (value !== 0 || unconfirmed === false);
}

function sourceUrl(value?: string): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

/** Supplemental operating metrics and tool costs; existing P&L and tool purposes stay in their own sections. */
export function FinancialOperationsSupplement({ entity, formatMoney, isHazardMode = false }: Pick<InspectorSectionProps, 'entity' | 'formatMoney'> & { isHazardMode?: boolean }) {
  const op = entity.operations;
  const currentTeam = op.currentTeamSize ?? op.teamSize;
  const rows = [
    ['前年比成長率', known(entity.growthRateYoY, entity.isGrowthUnconfirmed, -100) ? `${entity.growthRateYoY > 0 ? '+' : ''}${entity.growthRateYoY}%` : null],
    ['初期人数', known(op.initialTeamSize, op.isTeamSizeUnconfirmed, 1) ? `${op.initialTeamSize}人` : null],
    ['現有人数', known(currentTeam, op.isTeamSizeUnconfirmed, 1) ? `${currentTeam}人` : null],
    ['週稼働', known(op.weeklyHours, op.isWeeklyHoursUnconfirmed) ? `${op.weeklyHours}時間` : null],
    ['自動化', known(op.automationLevel, op.isAutomationUnconfirmed) && op.automationLevel <= 100 ? `${op.automationLevel}%` : null],
    ['初期資本', known(op.initialCapitalRequired, op.isCapitalUnconfirmed) ? formatMoney(op.initialCapitalRequired) : null],
  ];
  const tools = op.toolStack ?? [];
  const allCostsKnown = tools.length > 0 && tools.every(tool => known(tool.monthlyCost, tool.isCostUnconfirmed));
  const total = allCostsKnown ? tools.reduce((sum, tool) => sum + tool.monthlyCost, 0) : null;
  const pnl = entity.pnl;
  const cashHidden = pnl.financialStatus !== 'ESTIMATED' && (pnl.financialStatus === 'UNAVAILABLE'
    || pnl.isRevenueUnconfirmed || !Number.isFinite(pnl.monthlyRevenue) || pnl.monthlyRevenue <= 0);
  const standalone: [string, number | null][] = [];
  const addFinancial = (label: string, value: number, flag: boolean | undefined) => {
    if (flag === false && Number.isFinite(value)) standalone.push([label, value]);
  };
  if (cashHidden) {
    addFinancial('営業利益（月額換算）', pnl.operatingProfit, pnl.isOperatingProfitUnconfirmed);
    addFinancial('売上原価（月額換算）', pnl.cogs, pnl.isCogsUnconfirmed);
    addFinancial('粗利益（月額換算）', pnl.grossProfit, pnl.isGrossProfitUnconfirmed);
    if (pnl.isCostsUnconfirmed === false) {
      const expenses = pnl.operatingExpenses;
      for (const [label, key] of [['サーバー・API', 'serverAndApi'], ['広告費', 'advertising'], ['外注費', 'subcontracting'], ['ツール・SaaS', 'toolsAndSaaS'], ['その他経費', 'other']] as const) {
        addFinancial(`${label}（月額換算）`, expenses?.[key], false);
      }
    }
  }
  // EstimatedCashSummary already renders revenue, COGS, OPEX and profit.
  // Its missing gross-profit row retains the estimate label here.
  if (pnl.financialStatus === 'ESTIMATED') addFinancial('推計粗利益（月額換算）', pnl.grossProfit, pnl.isGrossProfitUnconfirmed);
  const financialContext = pnl.financialStatus !== 'ESTIMATED' && (pnl.sourceDoc || pnl.estimationLogic || pnl.dataSnapshotPeriod);
  if (!rows.some(([, value]) => value !== null) && tools.length === 0 && !financialContext && standalone.length === 0) return null;

  return <InspectorSectionCard id="section-financial-operations" index="operations" categoryEn="Operations" titleJa="運営指標・ツール費用" isHazardMode={isHazardMode}>
    {rows.some(([, value]) => value !== null) && <dl className="grid grid-cols-2 gap-x-4 gap-y-3 py-3 sm:grid-cols-3">
      {rows.filter(([, value]) => value !== null).map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-xs text-zinc-400">{label}</dt><dd className={`mt-1 break-words text-sm tabular-nums ${value === null ? 'text-zinc-500' : 'font-medium text-zinc-100'}`}>{value ?? '—'}</dd></div>)}
    </dl>}
    {standalone.length > 0 && <dl className="grid grid-cols-2 gap-3 border-t border-white/10 py-3 sm:grid-cols-3">
      {standalone.map(([label, value]) => <div key={label}><dt className="text-xs text-zinc-400">{label}</dt><dd className="mt-1 text-sm tabular-nums text-zinc-100">{formatMoney(value!)}</dd></div>)}
    </dl>}
    {tools.length > 0 && <div className="border-t border-white/10 py-3">
      <div className="mb-2 flex flex-wrap justify-between gap-2 text-xs"><span className="text-zinc-300">ツール別月額費用</span><span className="tabular-nums text-zinc-300">合計 {total !== null && Number.isFinite(total) ? formatMoney(total) : '—'}</span></div>
      <ul className="divide-y divide-white/10">{tools.map((tool, index) => {
        const url = sourceUrl(tool.url);
        return <li key={`${tool.name}-${index}`} className="flex items-start justify-between gap-3 py-2 text-xs">
          <div className="min-w-0 break-words text-zinc-200"><span>{url ? <a href={url} target="_blank" rel="noopener noreferrer" className="underline decoration-zinc-600 underline-offset-4 hover:text-sky-200">{tool.name}</a> : tool.name}</span>
          {tool.category && <span className="ml-2 text-zinc-400">{tool.category}</span>}
          {tool.purpose && <p className="mt-1 whitespace-pre-wrap leading-5 text-zinc-300">{tool.purpose}</p>}
          {tool.replacementDifficulty && <p className="mt-1 text-zinc-400">切替難易度: {{LOW: '低', MEDIUM: '中', HIGH: '高'}[tool.replacementDifficulty]}</p>}
          </div>
          <span className="shrink-0 tabular-nums text-zinc-300">{known(tool.monthlyCost, tool.isCostUnconfirmed) ? formatMoney(tool.monthlyCost) : '—'}</span>
        </li>;
      })}</ul>
    </div>}
    {financialContext && <details className="border-t border-white/10 py-3 text-xs">
      <summary className="cursor-pointer text-zinc-300">財務の対象期間・算定根拠</summary>
      <dl className="mt-2 space-y-2 break-words leading-5 text-zinc-300">
        {pnl.dataSnapshotPeriod && <div><dt className="text-zinc-400">対象期間</dt><dd>{pnl.dataSnapshotPeriod}</dd></div>}
        {pnl.sourceDoc && <div><dt className="text-zinc-400">参照資料</dt><dd>{sourceUrl(pnl.sourceDoc) ? <a href={sourceUrl(pnl.sourceDoc)!} target="_blank" rel="noopener noreferrer" className="underline">{pnl.sourceDoc}</a> : pnl.sourceDoc}</dd></div>}
        {pnl.estimationLogic && <div><dt className="text-zinc-400">算定根拠</dt><dd className="whitespace-pre-wrap">{pnl.estimationLogic}</dd></div>}
      </dl>
    </details>}
  </InspectorSectionCard>;
}
