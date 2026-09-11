import { inspectFinancialIntegrity } from '@/shared/financial-integrity';
import {
BarChart3,
Calculator,
Clock
} from 'lucide-react';

import type { InspectorSectionProps } from '../model/section-props';

export function FinancialSection({ entity, formatMoney, cogsPct, serverPct, adPct, subPct, saasPct, otherPct, profitPct, isHazardMode, financialStatus, isFinancialUnavailable, financialBadgeMeta }: Pick<InspectorSectionProps, 'entity' | 'formatMoney' | 'cogsPct' | 'serverPct' | 'adPct' | 'subPct' | 'saasPct' | 'otherPct' | 'profitPct' | 'isHazardMode' | 'financialStatus' | 'isFinancialUnavailable' | 'financialBadgeMeta'>) {
  const integrity = inspectFinancialIntegrity(entity.pnl);
  const hasConflict = integrity.profitConflict || integrity.grossConflict || integrity.marginConflict;
  return <>
          {/* ------------------------------------------------------- */}
          {/* #05〜#07: 財務レントゲン / 出血・逆流レントゲン */}
          {/* ------------------------------------------------------- */}
          <div className="space-y-8">
              {/* 財務計器盤 ＆ 月次損益テーブル（データ欠損・UNAVAILABLE時は完全非表示） */}
              {!isFinancialUnavailable && (
                <>
                  {/* 財務計器盤 (4連KPI + ウォーターフォールバー) */}
                  <div
                    id="section-financial"
                    className={`rounded-lg overflow-hidden border shadow-xl ${
                      isHazardMode ? 'border-red-500/30 bg-[#0E131F]' : 'border-white/[0.12] bg-[#0E131F]'
                    } scroll-mt-4`}
                  >
                    {/* セクション専用タイトルバー (Level 2: #141A29) */}
                    <div className={`flex items-center justify-between px-3.5 py-2.5 border-b ${
                      isHazardMode ? 'bg-red-950/40 border-red-500/30' : 'bg-[#141A29] border-white/[0.08]'
                    }`}>
                      <div className="flex items-center gap-2.5">
                        <div className={`w-1 h-3.5 rounded-full ${isHazardMode ? 'bg-red-500' : 'bg-zinc-300'}`} />
                        <span className={`font-mono text-xs font-bold px-1.5 py-0.5 rounded border ${
                          financialBadgeMeta.badgeClass
                        }`}>
                          #05
                        </span>
                        <div className="flex items-center gap-1.5">
                          <BarChart3 className={`w-3.5 h-3.5 ${financialBadgeMeta.iconColor}`} />
                          <h3 className={`font-mono text-xs font-bold uppercase tracking-wider ${
                            financialBadgeMeta.titleColor
                          }`}>
                            {hasConflict ? '財務データ照合待ち' : financialBadgeMeta.title}
                          </h3>
                        </div>
                        <span className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border ${financialBadgeMeta.tagClass}`}>
                          {hasConflict ? '要照合' : financialBadgeMeta.tagLabel}
                        </span>
                      </div>
                      {/* 右側：観測時期 ＆ 出典 */}
                      <div className="flex items-center gap-2 font-mono text-[10px] text-zinc-400">
                        {entity.pnl.dataSnapshotPeriod && (
                          <span className="flex items-center gap-1 text-zinc-400">
                            <Clock className="w-2.5 h-2.5 text-zinc-500" />
                            {entity.pnl.dataSnapshotPeriod}
                          </span>
                        )}
                        {entity.pnl.sourceDoc && (
                          <span className="hidden sm:inline px-1.5 py-0.2 rounded bg-white/[0.04] border border-white/[0.08] text-zinc-300">
                            {entity.pnl.sourceDoc}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-3.5 space-y-3.5 bg-[#0E131F]">
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
                      {/* 4連コアKPI */}
                      <div className="grid grid-cols-4 gap-2.5 font-mono">
                        <div className="bg-[#141A28] p-2.5 rounded-md border border-white/[0.06]">
                          <span className="text-[9px] text-zinc-400 block uppercase font-semibold">
                            {financialStatus === 'ESTIMATED' ? '推定月商 (Rev)' : isHazardMode ? '月商 (ピーク/現行)' : '月商 (Rev)'}
                          </span>
                          <span className="text-xs font-bold text-white tabular-nums">
                            {entity.pnl.isRevenueUnconfirmed ? (entity.pnl.revenueLabel || '未確認') : formatMoney(entity.pnl.monthlyRevenue)}
                          </span>
                        </div>
                        <div className="bg-[#141A28] p-2.5 rounded-md border border-white/[0.06]">
                          <span className="text-[9px] text-zinc-400 block uppercase font-semibold">
                            {financialStatus === 'ESTIMATED' ? '推定営業利益 (税引前)' : '営業利益 (税引前)'}
                          </span>
                          <span className={`text-xs font-bold tabular-nums ${
                            isHazardMode || entity.pnl.operatingProfit < 0 ? 'text-red-400' : 'text-emerald-400'
                          }`}>
                            {(entity.pnl.isOperatingProfitUnconfirmed ?? entity.pnl.isMarginUnconfirmed) ? '未確認' : formatMoney(entity.pnl.operatingProfit)}
                          </span>
                        </div>
                        <div className="bg-[#141A28] p-2.5 rounded-md border border-white/[0.06]">
                          <span className="text-[9px] text-zinc-400 block uppercase font-semibold">
                            {financialStatus === 'ESTIMATED' ? '推定利益率' : isHazardMode ? '赤字/利益率' : '利益率 (Margin)'}
                          </span>
                          <span className={`text-xs font-bold tabular-nums ${
                            isHazardMode || entity.pnl.operatingMargin < 0 ? 'text-red-400' : 'text-emerald-400'
                          }`}>
                            {entity.pnl.isMarginUnconfirmed ? '未確認' : `${entity.pnl.operatingMargin}%`}
                          </span>
                        </div>
                        <div className="bg-[#141A28] p-2.5 rounded-md border border-white/[0.06]">
                          <span className="text-[9px] text-zinc-400 block uppercase font-semibold">年成長率 (YoY)</span>
                          <span className={`text-xs font-bold tabular-nums ${
                            entity.growthRateYoY < 0 ? 'text-red-400' : 'text-zinc-200'
                          }`}>
                            {entity.isGrowthUnconfirmed ? '未確認' : `${entity.growthRateYoY > 0 ? '+' : ''}${entity.growthRateYoY}%`}
                          </span>
                        </div>
                      </div>

                      {/* 損益流出ウォーターフォールバー */}
                      {!entity.pnl.isCostsUnconfirmed && !entity.pnl.isMarginUnconfirmed && entity.pnl.monthlyRevenue > 0 && <div className="space-y-1.5 pt-2 border-t border-white/[0.06]">
                        <div className="flex items-center justify-between text-[10px] font-mono">
                          <span className="text-zinc-400">
                            {financialStatus === 'ESTIMATED' ? '損益分解モデル (100%基準)' : isHazardMode ? '資本流出・出血分解 (100%基準)' : '損益流出分解 (100%基準)'}
                          </span>
                          <span className={`font-bold ${isHazardMode || profitPct === 0 ? 'text-red-400' : 'text-emerald-400'}`}>
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
                          {profitPct > 0 && <div style={{ width: `${profitPct}%` }} className={isHazardMode ? "bg-red-500" : "bg-emerald-500"} title={`純利益: ${profitPct}%`} />}
                        </div>
                      </div>}
                    </div>
                  </div>

                  {/* P&L 会計スプレッドシートテーブル */}
                  <div className={`rounded-lg overflow-hidden border shadow-xl ${
                    isHazardMode ? 'border-red-500/30 bg-[#0E131F]' : 'border-white/[0.12] bg-[#0E131F]'
                  }`}>
                    <div className={`flex items-center justify-between px-3.5 py-2.5 border-b ${
                      isHazardMode ? 'bg-red-950/40 border-red-500/30' : 'bg-[#141A29] border-white/[0.08]'
                    }`}>
                      <div className="flex items-center gap-2.5">
                        <div className={`w-1 h-3.5 rounded-full ${isHazardMode ? 'bg-red-500' : 'bg-zinc-300'}`} />
                        <span className={`font-mono text-xs font-bold px-1.5 py-0.5 rounded border ${financialBadgeMeta.badgeClass}`}>
                          #06
                        </span>
                        <h3 className={`font-mono text-xs font-bold uppercase tracking-wider ${financialBadgeMeta.titleColor}`}>
                          {financialStatus === 'ESTIMATED'
                            ? '推定損益構造モデル (P&L ESTIMATION MODEL)'
                            : financialStatus === 'REPORTED'
                            ? '報道・取材損益テーブル (P&L REPORTED AUDIT)'
                            : isHazardMode
                            ? '月次損益出血テーブル (P&L AUTOPSY)'
                            : '確定財務実査テーブル (P&L AUDIT)'}
                        </h3>
                      </div>
                    </div>

                    <div className="p-3.5 space-y-3 bg-[#0E131F]">
                      {/* 推計因数分解方程式ボックス（ESTIMATED時のみ表示） */}
                      {financialStatus === 'ESTIMATED' && entity.pnl.estimationLogic && (
                        <div className="p-3 rounded-md bg-[#13110A] border border-amber-500/30 space-y-1.5 shadow-sm">
                          <div className="flex items-center gap-1.5 text-amber-400 text-[10px] font-mono font-bold">
                            <Calculator className="w-3.5 h-3.5 text-amber-400" />
                            <span>推計因数分解方程式 (REVERSE-ENGINEERED EQUATION)</span>
                          </div>
                          <div className="font-mono text-xs text-amber-200/90 leading-relaxed bg-black/60 p-2.5 rounded border border-amber-500/20 whitespace-pre-line">
                            {entity.pnl.estimationLogic}
                          </div>
                          <div className="text-[9px] font-mono text-zinc-400">
                            ※ 公開プラン単価・観測ユーザー規模・業界標準原価率からリバースエンジニアリングした科学的推計方程式です。
                          </div>
                        </div>
                      )}

                      <div className={`border rounded-md bg-[#111624] divide-y text-xs font-mono shadow-sm ${
                        isHazardMode ? 'border-red-500/20 divide-red-500/10' : 'border-white/[0.08] divide-white/[0.06]'
                      }`}>
                        <div className="p-2.5 flex justify-between items-center">
                          <span className="text-zinc-300">
                            {financialStatus === 'ESTIMATED' ? '推定月商 (Gross Revenue)' : isHazardMode ? '直近/ピーク月商' : '直近月商 (Gross Revenue)'}
                          </span>
                          <span className="text-white font-bold tabular-nums">{entity.pnl.isRevenueUnconfirmed ? (entity.pnl.revenueLabel || '未確認') : formatMoney(entity.pnl.monthlyRevenue)}</span>
                        </div>
                        <div className="p-2.5 flex justify-between items-center text-[11px]">
                          <span className="text-zinc-400 pl-2">└ 売上原価 (COGS)</span>
                          <span className="text-zinc-300 tabular-nums">{entity.pnl.isCostsUnconfirmed ? '未確認' : `-${formatMoney(entity.pnl.cogs)}`}</span>
                        </div>
                        <div className="p-2.5 flex justify-between items-center bg-white/[0.02]">
                          <span className="text-zinc-200 font-medium">粗利益 (Gross Profit: {entity.pnl.isGrossMarginUnconfirmed ? '未確認' : `${entity.pnl.grossMargin}%`})</span>
                          <span className="text-white font-medium tabular-nums">{entity.pnl.isGrossMarginUnconfirmed ? '未確認' : formatMoney(entity.pnl.grossProfit)}</span>
                        </div>

                        {/* 販管費内訳 (OPEX) */}
                        <div className="p-2.5 space-y-1.5 text-[11px] text-zinc-400">
                          <div className="flex items-center justify-between text-[10px] text-zinc-500 uppercase font-bold">
                            <span>販管費内訳 (OPEX)</span>
                            {financialStatus === 'ESTIMATED' && (
                              <span className="text-amber-400/90 font-normal">※業界標準比率に基づく推定配分</span>
                            )}
                          </div>
                          <div className="flex justify-between pl-2">
                            <span>サーバー/推論API費</span>
                            <span className={`tabular-nums ${isHazardMode ? 'text-red-300' : 'text-zinc-300'}`}>{entity.pnl.isCostsUnconfirmed ? '未確認' : formatMoney(entity.pnl.operatingExpenses.serverAndApi) }</span>
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

                        <div className={`p-2.5 flex justify-between items-center border-t ${
                          isHazardMode || entity.pnl.operatingProfit < 0
                            ? 'bg-red-950/30 border-red-500/30'
                            : 'bg-emerald-950/20 border-white/[0.08]'
                        }`}>
                          <span className="text-white font-bold">
                            {isHazardMode || entity.pnl.operatingProfit < 0 ? '営業赤字 (純流出)' : '営業利益 (税引前)'} ({entity.pnl.isMarginUnconfirmed ? '未確認' : `${entity.pnl.operatingMargin}%`})
                          </span>
                          <span className={`font-bold tabular-nums text-xs ${
                            isHazardMode || entity.pnl.operatingProfit < 0 ? 'text-red-400' : 'text-emerald-400'
                          }`}>
                            {(entity.pnl.isOperatingProfitUnconfirmed ?? entity.pnl.isMarginUnconfirmed) ? '未確認' : formatMoney(entity.pnl.operatingProfit)}/月
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* 運用体制 ＆ 資本要件 */}
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
                      #07
                    </span>
                    <h3 className={`font-mono text-xs font-bold uppercase tracking-wider ${
                      isHazardMode ? 'text-red-200' : 'text-zinc-100'
                    }`}>
                      {isHazardMode ? '過剰雇用 ＆ 固定費の罠 (OVERHIRING & BURN)' : '運用体制 ＆ 初期資本 (OPERATIONS)'}
                    </h3>
                  </div>
                  <span className="font-mono text-[10px] text-zinc-400 bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.06]">
                    EFFICIENCY
                  </span>
                </div>
                <div className="p-3.5 bg-[#0E131F]">
                  <div className="border border-white/[0.08] rounded-md bg-[#111624] grid grid-cols-4 divide-x divide-white/[0.06] p-3 font-mono text-center text-[10px] shadow-sm">
                    <div>
                      <span className="text-emerald-400 block font-bold">立ち上げ初期</span>
                      <span className="text-white font-bold text-xs">
                        {entity.operations.initialTeamSize ?? (entity.scale === 'SOLO' ? 1 : entity.scale === 'SMALL_TEAM' ? 2 : 2)}人
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-400 block">{isHazardMode ? 'ピーク時 (破滅前)' : '現在 (スケール後)'}</span>
                      <span className={`font-bold text-xs ${isHazardMode ? 'text-red-400' : 'text-zinc-200'}`}>
                        {entity.operations.currentTeamSize ?? entity.operations.teamSize}人
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-400 block">週実働</span>
                      <span className="text-white font-bold text-xs">{entity.operations.weeklyHours}h</span>
                    </div>
                    <div>
                      <span className="text-zinc-400 block">自動化度</span>
                      <span className={`font-bold text-xs ${isHazardMode ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {entity.operations.automationLevel}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>


  </>;
}
