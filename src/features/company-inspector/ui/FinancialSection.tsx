import { inspectFinancialIntegrity } from '@/shared/financial-integrity';
import {
BarChart3,
Calculator,
Clock
} from 'lucide-react';

import type { InspectorSectionProps } from '../model/section-props';

export function FinancialSection({ entity, formatMoney, cogsPct, serverPct, adPct, subPct, saasPct, otherPct, profitPct, isHazardMode, financialStatus, financialBadgeMeta }: Pick<InspectorSectionProps, 'entity' | 'formatMoney' | 'cogsPct' | 'serverPct' | 'adPct' | 'subPct' | 'saasPct' | 'otherPct' | 'profitPct' | 'isHazardMode' | 'financialStatus' | 'financialBadgeMeta'>) {
  const integrity = inspectFinancialIntegrity(entity.pnl);
  const hasConflict = integrity.profitConflict || integrity.grossConflict || integrity.marginConflict;
  const teamSizeUnknown = Boolean(entity.operations.isTeamSizeUnconfirmed);
  const weeklyHoursUnknown = Boolean(entity.operations.isWeeklyHoursUnconfirmed);
  const automationUnknown = Boolean(entity.operations.isAutomationUnconfirmed);
  const cogsUnknown = entity.pnl.isCogsUnconfirmed ?? entity.pnl.isCostsUnconfirmed;
  const grossProfitUnknown = entity.pnl.isGrossProfitUnconfirmed ?? entity.pnl.isGrossMarginUnconfirmed;
  const statusUnavailable = financialStatus === 'UNAVAILABLE';
  const revenueUnknown = statusUnavailable || Boolean(entity.pnl.isRevenueUnconfirmed) || !Number.isFinite(entity.pnl.monthlyRevenue);
  const operatingProfitUnknown = statusUnavailable || Boolean(entity.pnl.isOperatingProfitUnconfirmed ?? entity.pnl.isMarginUnconfirmed) || !Number.isFinite(entity.pnl.operatingProfit);
  const marginUnknown = statusUnavailable || Boolean(entity.pnl.isMarginUnconfirmed) || !Number.isFinite(entity.pnl.operatingMargin) || entity.pnl.monthlyRevenue <= 0;
  const allFinancialValuesUnknown = revenueUnknown && operatingProfitUnknown && marginUnknown;
  const initialTeamSize = entity.operations.initialTeamSize;
  const currentTeamSize = entity.operations.currentTeamSize ?? entity.operations.teamSize;
  const initialTeamSizeKnown = !teamSizeUnknown && typeof initialTeamSize === 'number' && Number.isFinite(initialTeamSize);
  const currentTeamSizeKnown = !teamSizeUnknown && Number.isFinite(currentTeamSize) && currentTeamSize > 0;
  const getValueTone = (value: number, isKnown: boolean) => {
    if (!isKnown) return 'text-zinc-400';
    if (financialStatus === 'ESTIMATED') return 'text-amber-200';
    if (value < 0) return 'text-rose-300';
    if (value > 0 && financialStatus === 'VERIFIED') return 'text-emerald-300';
    return 'text-zinc-100';
  };
  const operatingProfitTone = getValueTone(entity.pnl.operatingProfit, !operatingProfitUnknown);
  const operatingMarginTone = getValueTone(entity.pnl.operatingMargin, !marginUnknown);
  const revenueTone = getValueTone(entity.pnl.monthlyRevenue, !revenueUnknown);
  const growthTone = getValueTone(entity.growthRateYoY, !entity.isGrowthUnconfirmed);
  const hasRecordLevelSourceStatus = financialStatus === 'VERIFIED' || financialStatus === 'REPORTED';
  const periodUsesAnnualBasis = /通期|年次|年度/.test(entity.pnl.dataSnapshotPeriod ?? '');
  return <>
          {/* ------------------------------------------------------- */}
          {/* #05〜#07: 財務レントゲン / 出血・逆流レントゲン */}
          {/* ------------------------------------------------------- */}
          <div id="section-financial" className="space-y-8 scroll-mt-4">
              {allFinancialValuesUnknown && (
                <section className="rounded-lg border border-white/[0.12] bg-[#0E131F] p-4 space-y-2">
                  <h3 className="text-base font-semibold text-zinc-100">損益の数値は未確認</h3>
                  <p className="text-sm leading-6 text-zinc-300">月額換算の売上・営業利益、営業利益率を確認できる数値がありません。関連する資料や対象時期が記録されている場合は、「出典・記録」で確認できます。</p>
                </section>
              )}
              {/* 財務計器盤 ＆ 月次損益テーブル（データ欠損・UNAVAILABLE時は完全非表示） */}
              {!allFinancialValuesUnknown && (
                <>
                  {/* 財務計器盤 (4連KPI + ウォーターフォールバー) */}
                  <div
                    className={`rounded-lg overflow-hidden border shadow-xl ${
                      isHazardMode ? 'border-red-500/30 bg-[#0E131F]' : 'border-white/[0.12] bg-[#0E131F]'
                    } scroll-mt-4`}
                  >
                    {/* セクション専用タイトルバー (Level 2: #141A29) */}
                    <div className={`flex flex-col items-start gap-2 px-3.5 py-2.5 border-b sm:flex-row sm:items-center sm:justify-between ${
                      isHazardMode ? 'bg-red-950/40 border-red-500/30' : 'bg-[#141A29] border-white/[0.08]'
                    }`}>
                      <div className="flex items-center gap-2.5">
                        <div className={`w-1 h-3.5 rounded-full ${isHazardMode ? 'bg-red-500' : 'bg-zinc-300'}`} />
                        <div className="flex items-center gap-1.5">
                          <BarChart3 className={`w-3.5 h-3.5 ${financialBadgeMeta.iconColor}`} />
                          <h3 className={`text-sm font-semibold ${
                            financialBadgeMeta.titleColor
                          }`}>
                            {hasConflict ? '財務データ照合待ち' : financialBadgeMeta.title}
                          </h3>
                        </div>
                        <span className={`shrink-0 rounded border px-2 py-1 text-[11px] font-medium ${financialBadgeMeta.tagClass}`}>
                          {hasConflict ? '要照合' : financialBadgeMeta.tagLabel}
                        </span>
                      </div>
                      {/* 右側：観測時期 ＆ 出典 */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-300">
                        {entity.pnl.dataSnapshotPeriod && (
                          <span className="flex items-center gap-1 text-zinc-400">
                            <Clock className="h-3.5 w-3.5 text-zinc-400" />
                            <span><span className="text-zinc-300">対象期間</span> · {entity.pnl.dataSnapshotPeriod}</span>
                          </span>
                        )}
                        {entity.pnl.sourceDoc && (
                          <span className="max-w-full truncate text-zinc-300 sm:max-w-64" title={entity.pnl.sourceDoc}>
                            <span className="text-zinc-400">出典</span> · {entity.pnl.sourceDoc}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-3.5 space-y-3.5 bg-[#0E131F]">
                      {hasRecordLevelSourceStatus && (
                        <p role="note" className="border-l-2 border-white/[0.2] pl-3 text-xs leading-5 text-zinc-300">
                          出典区分は損益レコード全体に付いています。各金額が資料のどの箇所に対応するかは、この画面では表示していません。
                          {periodUsesAnnualBasis && ' 対象期間は年次資料ですが、月額への換算根拠も記録されていません。'}
                        </p>
                      )}
                      {(integrity.profitConflict || integrity.grossConflict || integrity.marginConflict || integrity.marginUndefined) && (
                        <div role="note" className="text-xs text-amber-300 border border-amber-500/30 rounded p-2">
                          財務データ要照合：
                          {integrity.profitConflict && <>記録の営業利益 {formatMoney(entity.pnl.operatingProfit)} と、粗利益−経費の計算値 {formatMoney(integrity.calculatedProfit)} が一致しません。 </>}
                          {integrity.grossConflict && '売上−原価と粗利益が一致しません。 '}
                          {integrity.marginConflict && '記録の利益率と売上・利益からの計算値が一致しません。 '}
                          {integrity.marginUndefined && '売上ゼロまたは未確認のため利益率を計算できません。 '}
                          元の記録を保持し、不整合のある指標は未確認として表示しています。
                        </div>
                      )}
                      {/* 主要指標。スマートフォンでは2列にしてラベルと金額を読みやすくする。 */}
                      <div className="grid grid-cols-2 gap-2.5 font-sans sm:grid-cols-4">
                        <div className="min-w-0 rounded-md border border-white/[0.08] bg-[#141A28] p-3">
                          <span className="block text-[11px] font-medium text-zinc-400">
                            {financialStatus === 'ESTIMATED' ? '推定売上（月額換算）' : isHazardMode ? '売上（月額換算・ピーク / 現在）' : '売上（月額換算）'}
                          </span>
                          <span className={`mt-1 block break-words text-sm font-semibold tabular-nums ${revenueTone}`}>
                            {revenueUnknown ? (entity.pnl.revenueLabel || '未確認') : formatMoney(entity.pnl.monthlyRevenue)}
                          </span>
                        </div>
                        <div className="min-w-0 rounded-md border border-white/[0.08] bg-[#141A28] p-3">
                          <span className="block text-[11px] font-medium text-zinc-400">
                            {financialStatus === 'ESTIMATED' ? '推定営業利益（月額換算）' : '営業利益（月額換算・税引前）'}
                          </span>
                          <span className={`mt-1 block break-words text-sm font-semibold tabular-nums ${operatingProfitTone}`}>
                            {operatingProfitUnknown ? '未確認' : formatMoney(entity.pnl.operatingProfit)}
                          </span>
                        </div>
                        <div className="min-w-0 rounded-md border border-white/[0.08] bg-[#141A28] p-3">
                          <span className="block text-[11px] font-medium text-zinc-400">
                            {financialStatus === 'ESTIMATED' ? '推定営業利益率' : '営業利益率'}
                          </span>
                          <span className={`mt-1 block break-words text-sm font-semibold tabular-nums ${operatingMarginTone}`}>
                            {marginUnknown ? '未確認' : `${entity.pnl.operatingMargin}%`}
                          </span>
                        </div>
                        <div className="min-w-0 rounded-md border border-white/[0.08] bg-[#141A28] p-3">
                          <span className="block text-[11px] font-medium text-zinc-400">
                            {financialStatus === 'ESTIMATED' ? '推定・前年比' : '前年比'}
                          </span>
                          <span className={`mt-1 block break-words text-sm font-semibold tabular-nums ${growthTone}`}>
                            {entity.isGrowthUnconfirmed ? '未確認' : `${entity.growthRateYoY > 0 ? '+' : ''}${entity.growthRateYoY}%`}
                          </span>
                        </div>
                      </div>

                      {/* 損益流出ウォーターフォールバー */}
                        {!entity.pnl.isCostsUnconfirmed && !marginUnknown && !revenueUnknown && entity.pnl.monthlyRevenue > 0 && <div className="space-y-1.5 pt-2 border-t border-white/[0.06]">
                        <div className="flex flex-wrap items-center justify-between gap-1 text-xs">
                          <span className="text-zinc-300">
                            {financialStatus === 'ESTIMATED' ? '推定損益の内訳 (100%基準)' : '損益の内訳 (100%基準)'}
                          </span>
                          <span className={`font-medium ${getValueTone(profitPct, !marginUnknown)}`}>
                            {`営業利益率 ${entity.pnl.operatingMargin}% (税引前)`}
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-black/80 rounded-xs overflow-hidden flex border border-white/[0.10]">
                          {cogsPct > 0 && <div style={{ width: `${cogsPct}%` }} className="bg-zinc-600" title={`原価: ${cogsPct}%`} />}
                          {serverPct > 0 && <div style={{ width: `${serverPct}%` }} className={isHazardMode ? "bg-red-800" : "bg-zinc-700"} title={`推論/サーバー: ${serverPct}%`} />}
                          {adPct > 0 && <div style={{ width: `${adPct}%` }} className="bg-zinc-500" title={`広告: ${adPct}%`} />}
                          {subPct > 0 && <div style={{ width: `${subPct}%` }} className="bg-zinc-700" title={`外注: ${subPct}%`} />}
                          {saasPct > 0 && <div style={{ width: `${saasPct}%` }} className="bg-zinc-800" title={`ツール: ${saasPct}%`} />}
                          {otherPct > 0 && <div style={{ width: `${otherPct}%` }} className="bg-zinc-800" title={`その他: ${otherPct}%`} />}
                          {profitPct > 0 && <div style={{ width: `${profitPct}%` }} className={financialStatus === 'VERIFIED' ? 'bg-emerald-400' : financialStatus === 'ESTIMATED' ? 'bg-amber-300' : 'bg-zinc-400'} title={`営業利益: ${profitPct}%`} />}
                        </div>
                      </div>}
                    </div>
                  </div>

                  {/* 月次損益の内訳 */}
                  <div className={`rounded-lg overflow-hidden border shadow-xl ${
                    isHazardMode ? 'border-red-500/30 bg-[#0E131F]' : 'border-white/[0.12] bg-[#0E131F]'
                  }`}>
                    <div className={`flex items-center justify-between px-3.5 py-2.5 border-b ${
                      isHazardMode ? 'bg-red-950/40 border-red-500/30' : 'bg-[#141A29] border-white/[0.08]'
                    }`}>
                      <div className="flex items-center gap-2.5">
                        <div className={`h-3.5 w-1 rounded-full ${isHazardMode ? 'bg-rose-400' : 'bg-zinc-300'}`} />
                        <h3 className={`text-sm font-semibold ${financialBadgeMeta.titleColor}`}>
                          {financialStatus === 'ESTIMATED'
                            ? '推定を含む損益'
                            : financialStatus === 'REPORTED'
                            ? '報道・取材資料による損益'
                            : isHazardMode
                            ? '過去の損益'
                            : '損益の内訳'}
                        </h3>
                      </div>
                    </div>

                    <div className="p-3.5 space-y-3 bg-[#0E131F]">
                      {/* 推定の算定根拠（推定値の場合のみ表示） */}
                      {financialStatus === 'ESTIMATED' && entity.pnl.estimationLogic && (
                        <div className="p-3 rounded-md bg-[#13110A] border border-amber-500/30 space-y-1.5 shadow-sm">
                          <div className="flex items-center gap-1.5 text-amber-200 text-xs font-medium">
                            <Calculator className="w-3.5 h-3.5 text-amber-400" />
                            <span>推定の算定根拠</span>
                          </div>
                          <div className="text-sm text-amber-100 leading-relaxed bg-black/60 p-2.5 rounded border border-amber-500/20 whitespace-pre-line">
                            {entity.pnl.estimationLogic}
                          </div>
                          <div className="text-xs text-zinc-300">
                            登録された前提から算出した参考値です。実測値ではありません。
                          </div>
                        </div>
                      )}

                      <div className={`border rounded-md bg-[#111624] divide-y text-sm shadow-sm ${
                        isHazardMode ? 'border-red-500/20 divide-red-500/10' : 'border-white/[0.08] divide-white/[0.06]'
                      }`}>
                        <div className="p-3 flex flex-wrap justify-between items-center gap-x-4 gap-y-1">
                          <span className="text-zinc-300">
                            {financialStatus === 'ESTIMATED' ? '推定売上（月額換算）' : isHazardMode ? '直近 / ピーク売上（月額換算）' : '直近の売上（月額換算）'}
                          </span>
                          <span className={`font-semibold tabular-nums ${revenueTone}`}>{revenueUnknown ? (entity.pnl.revenueLabel || '未確認') : formatMoney(entity.pnl.monthlyRevenue)}</span>
                        </div>
                        <div className="p-3 flex flex-wrap justify-between items-center gap-x-4 gap-y-1 text-xs">
                          <span className="text-zinc-300 pl-2">売上原価</span>
                          <span className="text-zinc-200 tabular-nums">{cogsUnknown ? '未確認' : `-${formatMoney(entity.pnl.cogs)}`}</span>
                        </div>
                        <div className="p-3 flex flex-wrap justify-between items-center gap-x-4 gap-y-1 bg-white/[0.02]">
                          <span className="text-zinc-100 font-medium">粗利益{entity.pnl.isGrossMarginUnconfirmed ? '' : ` · 粗利益率 ${entity.pnl.grossMargin}%`}</span>
                          <span className="text-zinc-100 font-semibold tabular-nums">{grossProfitUnknown ? '未確認' : formatMoney(entity.pnl.grossProfit)}</span>
                        </div>

                        {/* 販売費・一般管理費 */}
                        <div className="p-3 space-y-2 text-xs text-zinc-300">
                          <div className="flex flex-wrap items-center justify-between gap-1 text-xs text-zinc-200 font-medium">
                            <span>販売費・一般管理費</span>
                            {financialStatus === 'ESTIMATED' && (
                              <span className="text-amber-200 font-normal">推定配分</span>
                            )}
                          </div>
                          <div className="flex justify-between pl-2">
                            <span>サーバー/推論API費</span>
                            <span className="tabular-nums text-zinc-100">{entity.pnl.isCostsUnconfirmed ? '未確認' : formatMoney(entity.pnl.operatingExpenses.serverAndApi) }</span>
                          </div>
                          <div className="flex justify-between pl-2">
                            <span>広告宣伝費</span>
                            <span className="tabular-nums text-zinc-300">{entity.pnl.isCostsUnconfirmed ? '未確認' : formatMoney(entity.pnl.operatingExpenses.advertising) }</span>
                          </div>
                          <div className="flex justify-between pl-2">
                            <span>外注・委託費</span>
                            <span className="tabular-nums text-zinc-300">{entity.pnl.isCostsUnconfirmed ? '未確認' : formatMoney(entity.pnl.operatingExpenses.subcontracting) }</span>
                          </div>
                          <div className="flex justify-between pl-2">
                            <span>ツール・SaaS費</span>
                            <span className="tabular-nums text-zinc-300">{entity.pnl.isCostsUnconfirmed ? '未確認' : formatMoney(entity.pnl.operatingExpenses.toolsAndSaaS) }</span>
                          </div>
                          <div className="flex justify-between pl-2">
                            <span>その他営業経費</span>
                            <span className="tabular-nums text-zinc-300">{entity.pnl.isCostsUnconfirmed ? '未確認' : formatMoney(entity.pnl.operatingExpenses.other)}</span>
                          </div>
                        </div>

                        <div className={`p-3 flex flex-wrap justify-between items-center gap-x-4 gap-y-1 border-t ${
                          operatingProfitUnknown ? 'bg-white/[0.02] border-white/[0.08]' : financialStatus === 'ESTIMATED' ? 'bg-amber-300/[0.045] border-amber-300/20' : entity.pnl.operatingProfit < 0 ? 'bg-rose-950/25 border-rose-400/25' : 'bg-white/[0.02] border-white/[0.08]'
                        }`}>
                          <span className={`font-semibold ${operatingProfitTone}`}>
                            {operatingProfitUnknown ? '営業利益（月額換算） · 未確認' : financialStatus === 'ESTIMATED' ? entity.pnl.operatingProfit < 0 ? '推定営業赤字（月額換算）' : '推定営業利益（月額換算）' : entity.pnl.operatingProfit < 0 ? '営業赤字（月額換算）' : '営業利益（月額換算・税引前）'} · 利益率 {marginUnknown ? '未確認' : `${entity.pnl.operatingMargin}%`}
                          </span>
                          <span className={`font-semibold tabular-nums ${operatingProfitTone}`}>
                            {operatingProfitUnknown ? '未確認' : `${formatMoney(entity.pnl.operatingProfit)}/月`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* 運営体制と初期資本 */}
              <div className={`rounded-lg overflow-hidden border shadow-xl ${
                isHazardMode ? 'border-red-500/30 bg-[#0E131F]' : 'border-white/[0.12] bg-[#0E131F]'
              }`}>
                <div className={`flex items-center justify-between px-3.5 py-2.5 border-b ${
                  isHazardMode ? 'bg-red-950/40 border-red-500/30' : 'bg-[#141A29] border-white/[0.08]'
                }`}>
                  <div className="flex items-center gap-2.5">
                    <div className={`w-1 h-3.5 rounded-full ${isHazardMode ? 'bg-red-500' : 'bg-zinc-300'}`} />
                    <span className={`font-mono text-xs font-bold px-1.5 py-0.5 rounded border ${
                      isHazardMode
                        ? 'text-red-300 bg-red-900/40 border-red-500/40'
                        : 'text-zinc-100 bg-white/[0.08] border-white/[0.14]'
                    }`}>
                      体制
                    </span>
                    <h3 className={`text-sm font-semibold ${
                      isHazardMode ? 'text-red-200' : 'text-zinc-100'
                    }`}>
                      {isHazardMode ? '過去の運営体制' : '運営体制と初期資本'}
                    </h3>
                  </div>
                </div>
                <div className="p-3.5 bg-[#0E131F]">
                  <div className="grid grid-cols-2 gap-2 rounded-md border border-white/[0.08] bg-[#111624] p-2.5 text-center sm:grid-cols-4">
                    <div className="min-w-0 rounded border border-white/[0.06] bg-white/[0.02] p-2">
                      <span className="block text-xs text-zinc-400">立ち上げ初期</span>
                      <span className={`mt-1 block text-sm font-semibold tabular-nums ${initialTeamSizeKnown ? 'text-zinc-100' : 'text-zinc-400'}`}>
                        {initialTeamSizeKnown ? `${initialTeamSize}人` : '未確認'}
                      </span>
                    </div>
                    <div className="min-w-0 rounded border border-white/[0.06] bg-white/[0.02] p-2">
                      <span className="block text-xs text-zinc-400">{isHazardMode ? '過去の最大時' : '現在'}</span>
                      <span className={`mt-1 block text-sm font-semibold tabular-nums ${currentTeamSizeKnown ? 'text-zinc-100' : 'text-zinc-400'}`}>
                        {currentTeamSizeKnown ? `${currentTeamSize}人` : '未確認'}
                      </span>
                    </div>
                    <div className="min-w-0 rounded border border-white/[0.06] bg-white/[0.02] p-2">
                      <span className="block text-xs text-zinc-400">稼働時間</span>
                      <span className={`mt-1 block text-sm font-semibold tabular-nums ${weeklyHoursUnknown ? 'text-zinc-400' : 'text-zinc-100'}`}>
                        {weeklyHoursUnknown ? '未確認' : `${entity.operations.weeklyHours}時間 / 週`}
                      </span>
                    </div>
                    <div className="min-w-0 rounded border border-white/[0.06] bg-white/[0.02] p-2">
                      <span className="block text-xs text-zinc-400">自動化の割合</span>
                      <span className={`mt-1 block text-sm font-semibold tabular-nums ${automationUnknown ? 'text-zinc-400' : 'text-zinc-100'}`}>
                        {automationUnknown ? '未確認' : `${entity.operations.automationLevel}%`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>


  </>;
}
