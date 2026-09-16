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
  const teamSizeUnknown = Boolean(entity.operations.isTeamSizeUnconfirmed);
  const weeklyHoursUnknown = Boolean(entity.operations.isWeeklyHoursUnconfirmed);
  const automationUnknown = Boolean(entity.operations.isAutomationUnconfirmed);
  const cogsUnknown = entity.pnl.isCogsUnconfirmed ?? entity.pnl.isCostsUnconfirmed;
  const grossProfitUnknown = entity.pnl.isGrossProfitUnconfirmed ?? entity.pnl.isGrossMarginUnconfirmed;
  return <>
          {/* ------------------------------------------------------- */}
          {/* #05〜#07: 財務レントゲン / 出血・逆流レントゲン */}
          {/* ------------------------------------------------------- */}
          <div id="section-financial" className="space-y-8 scroll-mt-4">
              {isFinancialUnavailable && (
                <section className="rounded-lg border border-white/[0.12] bg-[#0E131F] p-4 space-y-2">
                  <h3 className="font-bold text-zinc-200">財務データは未確認</h3>
                  <p className="text-zinc-400">月商・営業利益を裏付ける情報が不足しているため、損益計算を表示していません。確認できた数値と対象期間は証拠カードを参照してください。</p>
                </section>
              )}
              {/* 財務計器盤 ＆ 月次損益テーブル（データ欠損・UNAVAILABLE時は完全非表示） */}
              {!isFinancialUnavailable && (
                <>
                  {/* 統合財務損益レントゲン (4連KPI + 直感的ブレークダウン計器 + P&L詳細テーブル) */}
                  <div
                    className={`rounded-xl overflow-hidden border shadow-2xl ${
                      isHazardMode ? 'border-red-500/30 bg-[#0A0D14]' : 'border-white/[0.12] bg-[#0A0D14]'
                    } scroll-mt-4`}
                  >
                    {/* セクション専用タイトルバー */}
                    <div className={`flex items-center justify-between px-3.5 py-2.5 border-b ${
                      isHazardMode ? 'bg-red-950/40 border-red-500/30' : 'bg-[#0E131F] border-white/[0.08]'
                    }`}>
                      <div className="flex items-center gap-2.5">
                        <div className={`w-1 h-3.5 rounded-full ${isHazardMode ? 'bg-red-500' : 'bg-emerald-400'}`} />
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
                            {hasConflict ? '財務データ照合待ち' : `${financialBadgeMeta.title} ＆ P&L内訳`}
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
                          <span className="hidden sm:inline px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] text-zinc-300">
                            {entity.pnl.sourceDoc}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-4 space-y-4 bg-[#0A0D14]">
                      {(integrity.profitConflict || integrity.grossConflict || integrity.marginConflict || integrity.marginUndefined) && (
                        <div role="note" className="text-xs text-amber-300 border border-amber-500/30 rounded p-2.5 bg-amber-950/20">
                          財務データ要照合：
                          {integrity.profitConflict && <>記録の営業利益 {formatMoney(entity.pnl.operatingProfit)} と、粗利益−経費の計算値 {formatMoney(integrity.calculatedProfit)} が一致しません。 </>}
                          {integrity.grossConflict && '売上−原価と粗利益が一致しません。 '}
                          {integrity.marginConflict && '記録の利益率と売上・利益からの計算値が一致しません。 '}
                          {integrity.marginUndefined && '売上ゼロまたは未確認のため利益率を計算できません。 '}
                          元の記録を保持し、不整合のある指標は未確認として表示しています。
                        </div>
                      )}

                      {/* 1. 4連コアKPIカード */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono">
                        <div className="bg-[#111624] p-3 rounded-lg border border-white/[0.06] shadow-sm">
                          <span className="text-[10px] text-zinc-400 block uppercase font-semibold">
                            {financialStatus === 'ESTIMATED' ? '推定月商 (Gross Rev)' : isHazardMode ? '月商 (ピーク/現行)' : '月商 (Gross Rev)'}
                          </span>
                          <span className="text-sm font-black text-white tabular-nums mt-0.5 block">
                            {entity.pnl.isRevenueUnconfirmed ? '未確認' : formatMoney(entity.pnl.monthlyRevenue)}
                          </span>
                        </div>
                        <div className="bg-[#111624] p-3 rounded-lg border border-white/[0.06] shadow-sm">
                          <span className="text-[10px] text-zinc-400 block uppercase font-semibold">
                            {financialStatus === 'ESTIMATED' ? '推定営業利益 (純手残り)' : '純手残り営業利益'}
                          </span>
                          <span className={`text-sm font-black tabular-nums mt-0.5 block ${
                            isHazardMode || entity.pnl.operatingProfit < 0 ? 'text-red-400' : 'text-emerald-400'
                          }`}>
                            {(entity.pnl.isOperatingProfitUnconfirmed ?? entity.pnl.isMarginUnconfirmed) ? '未確認' : formatMoney(entity.pnl.operatingProfit)}
                          </span>
                        </div>
                        <div className="bg-[#111624] p-3 rounded-lg border border-white/[0.06] shadow-sm">
                          <span className="text-[10px] text-zinc-400 block uppercase font-semibold">
                            {financialStatus === 'ESTIMATED' ? '推定手残り率' : isHazardMode ? '赤字流出率' : '営業利益率 (Margin)'}
                          </span>
                          <span className={`text-sm font-black tabular-nums mt-0.5 block ${
                            isHazardMode || entity.pnl.operatingMargin < 0 ? 'text-red-400' : 'text-emerald-400'
                          }`}>
                            {entity.pnl.isMarginUnconfirmed ? '未確認' : `${entity.pnl.operatingMargin}%`}
                          </span>
                        </div>
                        <div className="bg-[#111624] p-3 rounded-lg border border-white/[0.06] shadow-sm">
                          <span className="text-[10px] text-zinc-400 block uppercase font-semibold">年成長率 (YoY)</span>
                          <span className={`text-sm font-black tabular-nums mt-0.5 block ${
                            entity.growthRateYoY < 0 ? 'text-red-400' : 'text-zinc-200'
                          }`}>
                            {entity.isGrowthUnconfirmed ? '未確認' : `${entity.growthRateYoY > 0 ? '+' : ''}${entity.growthRateYoY}%`}
                          </span>
                        </div>
                      </div>

                      {/* 2. 直感的損益流出ブレークダウン計器（金額・%が1秒でわかる高密度バー） */}
                      {!entity.pnl.isCostsUnconfirmed && !entity.pnl.isMarginUnconfirmed && entity.pnl.monthlyRevenue > 0 && (
                        <div className="bg-[#111624] p-3.5 rounded-lg border border-white/[0.06] space-y-2.5">
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="text-zinc-300 font-bold flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                              <span>月商100%に対するコスト流出 vs 純手残り構造</span>
                            </span>
                            <span className={`font-bold font-mono ${isHazardMode || profitPct === 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                              {isHazardMode ? '純流出中' : `手残り率 ${entity.pnl.operatingMargin}% (${formatMoney(entity.pnl.operatingProfit)})`}
                            </span>
                          </div>

                          {/* ビジュアル・スタックバー（高さ28px、文字入り） */}
                          <div className="w-full h-7 bg-black/90 rounded-md overflow-hidden flex border border-white/[0.12] shadow-inner text-[10px] font-mono font-bold select-none">
                            {profitPct > 0 && !isHazardMode && (
                              <div
                                style={{ width: `${profitPct}%` }}
                                className="bg-emerald-500 text-black flex items-center justify-center truncate px-1 transition-all"
                                title={`純手残り: ${profitPct}% (${formatMoney(entity.pnl.operatingProfit)})`}
                              >
                                {profitPct >= 12 && `利益 ${profitPct}%`}
                              </div>
                            )}
                            {cogsPct > 0 && (
                              <div
                                style={{ width: `${cogsPct}%` }}
                                className="bg-rose-500 text-white flex items-center justify-center truncate px-1 transition-all"
                                title={`売上原価: ${cogsPct}% (${formatMoney(entity.pnl.cogs)})`}
                              >
                                {cogsPct >= 10 && `原価 ${cogsPct}%`}
                              </div>
                            )}
                            {serverPct > 0 && (
                              <div
                                style={{ width: `${serverPct}%` }}
                                className="bg-cyan-500 text-black flex items-center justify-center truncate px-1 transition-all"
                                title={`サーバー/推論: ${serverPct}% (${formatMoney(entity.pnl.operatingExpenses.serverAndApi)})`}
                              >
                                {serverPct >= 10 && `API ${serverPct}%`}
                              </div>
                            )}
                            {adPct > 0 && (
                              <div
                                style={{ width: `${adPct}%` }}
                                className="bg-amber-500 text-black flex items-center justify-center truncate px-1 transition-all"
                                title={`広告宣伝: ${adPct}% (${formatMoney(entity.pnl.operatingExpenses.advertising)})`}
                              >
                                {adPct >= 10 && `広告 ${adPct}%`}
                              </div>
                            )}
                            {subPct > 0 && (
                              <div
                                style={{ width: `${subPct}%` }}
                                className="bg-purple-500 text-white flex items-center justify-center truncate px-1 transition-all"
                                title={`外注・委託: ${subPct}% (${formatMoney(entity.pnl.operatingExpenses.subcontracting)})`}
                              >
                                {subPct >= 10 && `外注 ${subPct}%`}
                              </div>
                            )}
                            {saasPct > 0 && (
                              <div
                                style={{ width: `${saasPct}%` }}
                                className="bg-slate-500 text-white flex items-center justify-center truncate px-1 transition-all"
                                title={`ツール/SaaS: ${saasPct}% (${formatMoney(entity.pnl.operatingExpenses.toolsAndSaaS)})`}
                              >
                                {saasPct >= 10 && `SaaS ${saasPct}%`}
                              </div>
                            )}
                            {otherPct > 0 && (
                              <div
                                style={{ width: `${otherPct}%` }}
                                className="bg-zinc-600 text-zinc-200 flex items-center justify-center truncate px-1 transition-all"
                                title={`その他経費: ${otherPct}% (${formatMoney(entity.pnl.operatingExpenses.other)})`}
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

                          {/* 費目別カラー凡例グリッド */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-[10px] font-mono">
                            <div className="bg-white/[0.02] border border-emerald-500/20 p-1.5 rounded flex items-center justify-between">
                              <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" /> 純手残り
                              </span>
                              <span className="text-white font-bold">{profitPct}%</span>
                            </div>
                            <div className="bg-white/[0.02] border border-rose-500/20 p-1.5 rounded flex items-center justify-between">
                              <span className="flex items-center gap-1 text-rose-400 font-semibold">
                                <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0" /> 売上原価
                              </span>
                              <span className="text-white font-bold">{cogsPct}%</span>
                            </div>
                            <div className="bg-white/[0.02] border border-cyan-500/20 p-1.5 rounded flex items-center justify-between">
                              <span className="flex items-center gap-1 text-cyan-400 font-semibold">
                                <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" /> サーバー/API
                              </span>
                              <span className="text-white font-bold">{serverPct}%</span>
                            </div>
                            <div className="bg-white/[0.02] border border-amber-500/20 p-1.5 rounded flex items-center justify-between">
                              <span className="flex items-center gap-1 text-amber-400 font-semibold">
                                <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" /> 広告宣伝
                              </span>
                              <span className="text-white font-bold">{adPct}%</span>
                            </div>
                            <div className="bg-white/[0.02] border border-purple-500/20 p-1.5 rounded flex items-center justify-between">
                              <span className="flex items-center gap-1 text-purple-400 font-semibold">
                                <span className="w-2 h-2 rounded-full bg-purple-400 shrink-0" /> 外注・委託
                              </span>
                              <span className="text-white font-bold">{subPct}%</span>
                            </div>
                            <div className="bg-white/[0.02] border border-slate-500/20 p-1.5 rounded flex items-center justify-between">
                              <span className="flex items-center gap-1 text-slate-400 font-semibold">
                                <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" /> ツール/SaaS
                              </span>
                              <span className="text-white font-bold">{saasPct}%</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 3. 推計因数分解方程式ボックス（ESTIMATED時のみ表示） */}
                      {financialStatus === 'ESTIMATED' && entity.pnl.estimationLogic && (
                        <div className="p-3 rounded-md bg-[#13110A] border border-amber-500/30 space-y-1.5 shadow-sm font-mono">
                          <div className="flex items-center gap-1.5 text-amber-400 text-[10px] font-bold">
                            <Calculator className="w-3.5 h-3.5 text-amber-400" />
                            <span>推計因数分解方程式 (REVERSE-ENGINEERED EQUATION)</span>
                          </div>
                          <div className="text-xs text-amber-200/90 leading-relaxed bg-black/60 p-2.5 rounded border border-amber-500/20 whitespace-pre-line">
                            {entity.pnl.estimationLogic}
                          </div>
                          <div className="text-[9px] text-zinc-400">
                            ※ 公開プラン単価・観測ユーザー規模・業界標準原価率からリバースエンジニアリングした科学的推計方程式です。
                          </div>
                        </div>
                      )}

                      {/* 4. 会計スプレッドシート詳細テーブル */}
                      <div className={`border rounded-lg bg-[#111624] divide-y text-xs font-mono shadow-sm overflow-hidden ${
                        isHazardMode ? 'border-red-500/20 divide-red-500/10' : 'border-white/[0.08] divide-white/[0.06]'
                      }`}>
                        <div className="p-2.5 flex justify-between items-center bg-white/[0.02]">
                          <span className="text-zinc-200 font-bold">
                            {financialStatus === 'ESTIMATED' ? '推定月商 (Gross Revenue)' : isHazardMode ? '直近/ピーク月商' : '直近月商 (Gross Revenue)'}
                          </span>
                          <span className="text-white font-black tabular-nums">{entity.pnl.isRevenueUnconfirmed ? '財務値未確認（原本照合待ち）' : formatMoney(entity.pnl.monthlyRevenue)}</span>
                        </div>
                        <div className="p-2.5 flex justify-between items-center text-[11px]">
                          <span className="text-zinc-400 pl-2">└ 売上原価 (COGS)</span>
                          <span className="text-rose-400 tabular-nums font-semibold">{cogsUnknown ? '未確認' : `-${formatMoney(entity.pnl.cogs)}`}</span>
                        </div>
                        <div className="p-2.5 flex justify-between items-center bg-white/[0.02]">
                          <span className="text-zinc-200 font-medium">粗利益 (Gross Profit: {entity.pnl.isGrossMarginUnconfirmed ? '未確認' : `${entity.pnl.grossMargin}%`})</span>
                          <span className="text-white font-medium tabular-nums">{grossProfitUnknown ? '未確認' : formatMoney(entity.pnl.grossProfit)}</span>
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

                        <div className={`p-3 flex justify-between items-center border-t ${
                          isHazardMode || entity.pnl.operatingProfit < 0
                            ? 'bg-red-950/40 border-red-500/30'
                            : 'bg-emerald-950/30 border-white/[0.08]'
                        }`}>
                          <span className="text-white font-black text-sm">
                            {isHazardMode || entity.pnl.operatingProfit < 0 ? '営業赤字 (純流出)' : '純手残り営業利益 (税引前)'} ({entity.pnl.isMarginUnconfirmed ? '未確認' : `${entity.pnl.operatingMargin}%`})
                          </span>
                          <span className={`font-black tabular-nums text-sm ${
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
              <div className={`rounded-xl overflow-hidden border shadow-xl ${
                isHazardMode ? 'border-red-500/30 bg-[#0E131F]' : 'border-white/[0.12] bg-[#0E131F]'
              }`}>
                <div className={`flex items-center justify-between px-3.5 py-2.5 border-b ${
                  isHazardMode ? 'bg-red-950/40 border-red-500/30' : 'bg-[#141A29] border-white/[0.08]'
                }`}>
                  <div className="flex items-center gap-2.5">
                    <div className={`w-1 h-3.5 rounded-full ${isHazardMode ? 'bg-red-500' : 'bg-emerald-400'}`} />
                    <span className={`font-mono text-xs font-bold px-1.5 py-0.5 rounded border ${
                      isHazardMode
                        ? 'text-red-300 bg-red-900/40 border-red-500/40'
                        : 'text-zinc-100 bg-white/[0.08] border-white/[0.14]'
                    }`}>
                      #06
                    </span>
                    <h3 className={`font-mono text-xs font-bold uppercase tracking-wider ${
                      isHazardMode ? 'text-red-200' : 'text-zinc-100'
                    }`}>
                      {isHazardMode ? '過剰雇用 ＆ 固定費の罠 (OVERHIRING & BURN)' : '運用体制 ＆ 立ち上げ初期人数 (OPERATIONS & LEVERAGE)'}
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
                      <span className={`font-bold text-xs ${teamSizeUnknown ? 'text-zinc-500' : 'text-white'}`}>
                        {teamSizeUnknown ? '未確認' : `${entity.operations.initialTeamSize ?? (entity.scale === 'SOLO' ? 1 : entity.scale === 'SMALL_TEAM' ? 2 : 2)}人`}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-400 block">{isHazardMode ? 'ピーク時 (破滅前)' : '現在 (スケール後)'}</span>
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


  </>;
}
