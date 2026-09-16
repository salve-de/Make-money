import { inspectFinancialIntegrity } from '@/shared/financial-integrity';
import { Calculator, Clock } from 'lucide-react';
import React from 'react';
import type { InspectorSectionProps } from '../model/section-props';

export function FinancialSection({
  entity,
  formatMoney,
  cogsPct,
  serverPct,
  adPct,
  subPct,
  saasPct,
  otherPct,
  profitPct,
  isHazardMode,
  financialStatus,
  isFinancialUnavailable,
  financialBadgeMeta
}: Pick<
  InspectorSectionProps,
  | 'entity'
  | 'formatMoney'
  | 'cogsPct'
  | 'serverPct'
  | 'adPct'
  | 'subPct'
  | 'saasPct'
  | 'otherPct'
  | 'profitPct'
  | 'isHazardMode'
  | 'financialStatus'
  | 'isFinancialUnavailable'
  | 'financialBadgeMeta'
>) {
  const integrity = inspectFinancialIntegrity(entity.pnl);
  const hasConflict = integrity.profitConflict || integrity.grossConflict || integrity.marginConflict;
  const teamSizeUnknown = Boolean(entity.operations.isTeamSizeUnconfirmed);
  const weeklyHoursUnknown = Boolean(entity.operations.isWeeklyHoursUnconfirmed);
  const automationUnknown = Boolean(entity.operations.isAutomationUnconfirmed);
  const cogsUnknown = entity.pnl.isCogsUnconfirmed ?? entity.pnl.isCostsUnconfirmed;
  const grossProfitUnknown = entity.pnl.isGrossProfitUnconfirmed ?? entity.pnl.isGrossMarginUnconfirmed;

  if (isFinancialUnavailable) {
    return (
      <section id="section-financial" className="scroll-mt-4">
        <div className="rounded-md border border-white/[0.08] bg-[#0A0D15] p-4 text-xs font-mono">
          <span className="text-zinc-300 font-bold">財務データ未確認:</span>
          <span className="text-zinc-500 ml-2">
            月商・利益を裏付ける情報が不足しているため、損益計算を表示していません。
          </span>
        </div>
      </section>
    );
  }

  return (
    <section id="section-financial" className="scroll-mt-4">
      {/* 統合財務調書サーフェス */}
      <div className={`rounded-md border bg-[#10131C] overflow-hidden ${
        isHazardMode ? 'border-red-500/30' : 'border-white/[0.12]'
      }`}>
        {/* セクションヘッダー */}
        <div className={`flex items-center justify-between px-4 py-2.5 border-b gap-2 flex-wrap ${
          isHazardMode ? 'bg-red-950/25 border-red-500/20' : 'bg-[#131724] border-white/[0.08]'
        }`}>
          <div className="flex items-center gap-2">
            <span className={`font-mono text-[11px] font-bold tracking-wider uppercase ${
              isHazardMode ? 'text-red-400' : 'text-zinc-300'
            }`}>
              FINANCIAL DOSSIER // {hasConflict ? '財務データ照合待ち' : `${financialBadgeMeta.title} ＆ P&L内訳`}
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono text-[10px] text-zinc-400">
            {entity.pnl.dataSnapshotPeriod && (
              <span className="flex items-center gap-1">
                <Clock className="w-2.5 h-2.5 text-zinc-400" />
                {entity.pnl.dataSnapshotPeriod}
              </span>
            )}
            {entity.pnl.sourceDoc && (
              <span className="px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] text-zinc-300">
                {entity.pnl.sourceDoc}
              </span>
            )}
          </div>
        </div>

        <div className="divide-y divide-white/[0.08]">
          {/* データ不整合アラート */}
          {(integrity.profitConflict || integrity.grossConflict || integrity.marginConflict || integrity.marginUndefined) && (
            <div role="note" className="text-xs text-amber-300 p-3 bg-amber-950/20 font-mono">
              財務データ要照合：
              {integrity.profitConflict && <>記録の営業利益 {formatMoney(entity.pnl.operatingProfit)} と、粗利益−経費の計算値 {formatMoney(integrity.calculatedProfit)} が一致しません。 </>}
              {integrity.grossConflict && '売上−原価と粗利益が一致しません。 '}
              {integrity.marginConflict && '記録の利益率と計算値が一致しません。 '}
              元の記録を保持し、不整合のある指標は未確認として表示しています。
            </div>
          )}

          {/* 1. 4大KPI水平ストリップ（等間隔バー・白太字＋変化率アクセント） */}
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-white/[0.08] bg-[#0D1017]">
            <div className="p-3">
              <span className="text-[11px] font-mono text-zinc-400 block font-medium">
                {financialStatus === 'ESTIMATED' ? '推定月商' : isHazardMode ? '直近月商' : '直近月商'}
              </span>
              <span className="text-sm sm:text-base font-bold font-mono text-[#F4F5F7] tabular-nums">
                {entity.pnl.isRevenueUnconfirmed ? '未確認' : formatMoney(entity.pnl.monthlyRevenue)}
              </span>
            </div>
            <div className="p-3">
              <span className="text-[11px] font-mono text-zinc-400 block font-medium">
                {isHazardMode ? '営業損失' : '純手残り利益'}
              </span>
              <span className={`text-sm sm:text-base font-bold font-mono tabular-nums ${
                isHazardMode ? 'text-red-400' : 'text-[#F4F5F7]'
              }`}>
                {(entity.pnl.isOperatingProfitUnconfirmed ?? entity.pnl.isMarginUnconfirmed) ? '未確認' : formatMoney(entity.pnl.operatingProfit)}
              </span>
            </div>
            <div className="p-3">
              <span className="text-[11px] font-mono text-zinc-400 block font-medium">営業利益率</span>
              <span className={`text-sm sm:text-base font-bold font-mono tabular-nums ${
                isHazardMode ? 'text-red-400' : 'text-[#10B981]'
              }`}>
                {entity.pnl.isMarginUnconfirmed ? '未確認' : `${entity.pnl.operatingMargin}%`}
              </span>
            </div>
            <div className="p-3">
              <span className="text-[10px] font-mono text-zinc-400 block uppercase">年成長率 (YoY)</span>
              <span className={`text-sm font-bold font-mono tabular-nums ${
                entity.growthRateYoY < 0 ? 'text-red-400' : 'text-zinc-200'
              }`}>
                {entity.isGrowthUnconfirmed ? '未確認' : `${entity.growthRateYoY > 0 ? '+' : ''}${entity.growthRateYoY}%`}
              </span>
            </div>
          </div>

          {/* 2. コスト流出 vs 純手残りスタックバー */}
          {!entity.pnl.isCostsUnconfirmed && !entity.pnl.isMarginUnconfirmed && entity.pnl.monthlyRevenue > 0 && (
            <div className="p-4 space-y-2.5 bg-white/[0.01]">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-zinc-300 font-semibold">
                  月商100%に対するコスト流出 vs 純手残り構造
                </span>
                <span className={`font-semibold ${isHazardMode || profitPct === 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {isHazardMode ? '純流出中' : `手残り率 ${entity.pnl.operatingMargin}% (${formatMoney(entity.pnl.operatingProfit)})`}
                </span>
              </div>

              {/* ビジュアルスタックバー */}
              <div className="w-full h-6 bg-black/80 rounded overflow-hidden flex border border-white/[0.08] text-[10px] font-mono font-bold select-none">
                {profitPct > 0 && !isHazardMode && (
                  <div
                    style={{ width: `${profitPct}%` }}
                    className="bg-emerald-500 text-black flex items-center justify-center truncate px-1"
                  >
                    {profitPct >= 12 && `利益 ${profitPct}%`}
                  </div>
                )}
                {cogsPct > 0 && (
                  <div
                    style={{ width: `${cogsPct}%` }}
                    className="bg-rose-500 text-white flex items-center justify-center truncate px-1"
                  >
                    {cogsPct >= 10 && `原価 ${cogsPct}%`}
                  </div>
                )}
                {serverPct > 0 && (
                  <div
                    style={{ width: `${serverPct}%` }}
                    className="bg-cyan-500 text-black flex items-center justify-center truncate px-1"
                  >
                    {serverPct >= 10 && `API ${serverPct}%`}
                  </div>
                )}
                {adPct > 0 && (
                  <div
                    style={{ width: `${adPct}%` }}
                    className="bg-amber-500 text-black flex items-center justify-center truncate px-1"
                  >
                    {adPct >= 10 && `広告 ${adPct}%`}
                  </div>
                )}
                {subPct > 0 && (
                  <div
                    style={{ width: `${subPct}%` }}
                    className="bg-purple-500 text-white flex items-center justify-center truncate px-1"
                  >
                    {subPct >= 10 && `外注 ${subPct}%`}
                  </div>
                )}
                {saasPct > 0 && (
                  <div
                    style={{ width: `${saasPct}%` }}
                    className="bg-slate-500 text-white flex items-center justify-center truncate px-1"
                  >
                    {saasPct >= 10 && `SaaS ${saasPct}%`}
                  </div>
                )}
                {otherPct > 0 && (
                  <div
                    style={{ width: `${otherPct}%` }}
                    className="bg-zinc-600 text-zinc-200 flex items-center justify-center truncate px-1"
                  >
                    {otherPct >= 10 && `他 ${otherPct}%`}
                  </div>
                )}
                {isHazardMode && (
                  <div
                    style={{ width: '100%' }}
                    className="bg-red-600 text-white flex items-center justify-center px-1 font-bold"
                  >
                    赤字出血・純流出
                  </div>
                )}
              </div>

              {/* 費目別カラー凡例 */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-[10px] font-mono pt-1">
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="text-emerald-400">■ 純手残り</span>
                  <span className="text-zinc-200 font-bold">{profitPct}%</span>
                </div>
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="text-rose-400">■ 売上原価</span>
                  <span className="text-zinc-200 font-bold">{cogsPct}%</span>
                </div>
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="text-cyan-400">■ サーバー/API</span>
                  <span className="text-zinc-200 font-bold">{serverPct}%</span>
                </div>
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="text-amber-400">■ 広告宣伝</span>
                  <span className="text-zinc-200 font-bold">{adPct}%</span>
                </div>
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="text-purple-400">■ 外注・委託</span>
                  <span className="text-zinc-200 font-bold">{subPct}%</span>
                </div>
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="text-slate-400">■ ツール/SaaS</span>
                  <span className="text-zinc-200 font-bold">{saasPct}%</span>
                </div>
              </div>
            </div>
          )}

          {/* 3. 推計因数分解方程式（ESTIMATED時のみ） */}
          {financialStatus === 'ESTIMATED' && entity.pnl.estimationLogic && (
            <div className="p-4 space-y-1.5 bg-white/[0.01] font-mono">
              <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] font-bold uppercase tracking-wider">
                <Calculator className="w-3.5 h-3.5 text-zinc-400" />
                <span>REVERSE-ENGINEERED EQUATION // 推計因数分解</span>
              </div>
              <div className="text-xs text-zinc-300 leading-relaxed bg-black/40 p-2.5 rounded border border-white/[0.04] whitespace-pre-line">
                {entity.pnl.estimationLogic}
              </div>
            </div>
          )}

          {/* 4. 会計スプレッドシート詳細テーブル */}
          <div className="p-4">
            <div className="border border-white/[0.08] rounded divide-y divide-white/[0.06] text-xs font-mono bg-[#0D1017]">
              <div className="p-2.5 flex justify-between items-center bg-white/[0.02]">
                <span className="text-zinc-200 font-bold">
                  {financialStatus === 'ESTIMATED' ? '推定月商 (Gross Revenue)' : isHazardMode ? '直近/ピーク月商' : '直近月商 (Gross Revenue)'}
                </span>
                <span className="text-[#F4F5F7] font-bold tabular-nums">
                  {entity.pnl.isRevenueUnconfirmed ? '財務値未確認' : formatMoney(entity.pnl.monthlyRevenue)}
                </span>
              </div>
              <div className="p-2.5 flex justify-between items-center text-[11px]">
                <span className="text-zinc-400 pl-2">└ 売上原価 (COGS)</span>
                <span className="text-rose-400 tabular-nums font-semibold">{cogsUnknown ? '未確認' : `-${formatMoney(entity.pnl.cogs)}`}</span>
              </div>
              <div className="p-2.5 flex justify-between items-center bg-white/[0.02]">
                <span className="text-zinc-200 font-medium">粗利益 (Gross Profit: {entity.pnl.isGrossMarginUnconfirmed ? '未確認' : `${entity.pnl.grossMargin}%`})</span>
                <span className="text-[#F4F5F7] font-medium tabular-nums">{grossProfitUnknown ? '未確認' : formatMoney(entity.pnl.grossProfit)}</span>
              </div>

              {/* 販管費内訳 */}
              <div className="p-2.5 space-y-1 text-[11px] text-zinc-400">
                <div className="text-[10px] text-zinc-400 uppercase font-bold">
                  販管費内訳 (OPEX)
                </div>
                <div className="flex justify-between pl-2">
                  <span>サーバー/推論API費</span>
                  <span className="tabular-nums text-zinc-300">{entity.pnl.isCostsUnconfirmed ? '未確認' : formatMoney(entity.pnl.operatingExpenses.serverAndApi)}</span>
                </div>
                <div className="flex justify-between pl-2">
                  <span>広告宣伝費</span>
                  <span className="tabular-nums text-zinc-300">{entity.pnl.isCostsUnconfirmed ? '未確認' : formatMoney(entity.pnl.operatingExpenses.advertising)}</span>
                </div>
                <div className="flex justify-between pl-2">
                  <span>外注・委託費</span>
                  <span className="tabular-nums text-zinc-300">{entity.pnl.isCostsUnconfirmed ? '未確認' : formatMoney(entity.pnl.operatingExpenses.subcontracting)}</span>
                </div>
                <div className="flex justify-between pl-2">
                  <span>ツール・SaaS費</span>
                  <span className="tabular-nums text-zinc-300">{entity.pnl.isCostsUnconfirmed ? '未確認' : formatMoney(entity.pnl.operatingExpenses.toolsAndSaaS)}</span>
                </div>
                <div className="flex justify-between pl-2">
                  <span>その他営業経費</span>
                  <span className="tabular-nums text-zinc-300">{entity.pnl.isCostsUnconfirmed ? '未確認' : formatMoney(entity.pnl.operatingExpenses.other)}</span>
                </div>
              </div>

              {/* 営業利益 */}
              <div className={`p-3 flex justify-between items-center border-t ${
                isHazardMode || entity.pnl.operatingProfit < 0
                  ? 'bg-red-950/20 border-red-500/20'
                  : 'bg-[#131724] border-white/[0.08]'
              }`}>
                <span className="text-zinc-200 font-bold text-xs">
                  {isHazardMode || entity.pnl.operatingProfit < 0 ? '営業損失 (純流出)' : '純手残り営業利益 (税引前)'}
                  <span className="text-emerald-400 ml-1.5 font-mono">({entity.pnl.isMarginUnconfirmed ? '未確認' : `${entity.pnl.operatingMargin}%`})</span>
                </span>
                <span className={`font-bold tabular-nums text-sm ${
                  isHazardMode || entity.pnl.operatingProfit < 0 ? 'text-red-400' : 'text-[#F4F5F7]'
                }`}>
                  {(entity.pnl.isOperatingProfitUnconfirmed ?? entity.pnl.isMarginUnconfirmed) ? '未確認' : formatMoney(entity.pnl.operatingProfit)}/月
                </span>
              </div>
            </div>
          </div>

          {/* 5. 運用体制 ＆ レバレッジ（調書内サブセクション） */}
          <div className="p-4 space-y-2 bg-white/[0.01]">
            <div className="font-mono text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
              OPERATIONS & LEVERAGE // 運用体制 ＆ 立ち上げ初期人数
            </div>
            <div className="grid grid-cols-4 divide-x divide-white/[0.06] border border-white/[0.06] rounded bg-[#07090F] p-3 font-mono text-center text-[10px]">
              <div>
                <span className="text-zinc-400 block">立ち上げ初期</span>
                <span className={`font-bold text-xs ${teamSizeUnknown ? 'text-zinc-500' : 'text-white'}`}>
                  {teamSizeUnknown ? '未確認' : `${entity.operations.initialTeamSize ?? (entity.scale === 'SOLO' ? 1 : 2)}人`}
                </span>
              </div>
              <div>
                <span className="text-zinc-400 block">{isHazardMode ? 'ピーク時' : '現在規模'}</span>
                <span className={`font-bold text-xs ${teamSizeUnknown ? 'text-zinc-500' : isHazardMode ? 'text-red-400' : 'text-zinc-200'}`}>
                  {teamSizeUnknown ? '未確認' : `${entity.operations.currentTeamSize ?? entity.operations.teamSize}人`}
                </span>
              </div>
              <div>
                <span className="text-zinc-400 block">週実働</span>
                <span className={`font-bold text-xs ${weeklyHoursUnknown ? 'text-zinc-500' : 'text-white'}`}>
                  {weeklyHoursUnknown ? '未確認' : `${entity.operations.weeklyHours}h`}
                </span>
              </div>
              <div>
                <span className="text-zinc-400 block">自動化度</span>
                <span className={`font-bold text-xs ${automationUnknown ? 'text-zinc-500' : isHazardMode ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {automationUnknown ? '未確認' : `${entity.operations.automationLevel}%`}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
