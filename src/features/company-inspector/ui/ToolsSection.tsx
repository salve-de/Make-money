import { findToolAffiliate,HAZARD_DEFENSE_SHIELDS,TOOL_AFFILIATES } from '@/platform/config/toolAffiliates';
import {
AlertTriangle,
ExternalLink,
Shield,
ShieldCheck,
Wrench
} from 'lucide-react';

import type { InspectorSectionProps } from '../model/section-props';

export function ToolsSection({ entity, formatMoney, isHazardMode }: Pick<InspectorSectionProps, 'entity' | 'formatMoney' | 'isHazardMode'>) {
  return <>
            {/* 稼働インフラ：現場配管ツール（通常時・データが存在する場合のみ表示） */}
            {!isHazardMode && entity.operations && (
              <div
                id="section-tools"
                className="rounded-lg overflow-hidden border border-white/[0.12] bg-[#0E131F] shadow-xl scroll-mt-4"
              >
                {/* セクション専用タイトルバー (Level 2: #141A29) */}
                <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#141A29] border-b border-white/[0.08]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-1 h-3.5 rounded-full bg-zinc-300" />
                    <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded border text-zinc-100 bg-white/[0.08] border-white/[0.14]">
                      #08
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Wrench className="w-3.5 h-3.5 text-zinc-300" />
                      <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-zinc-100">
                        稼働インフラ：現場配管ツール ({entity.operations.toolStack.length}件)
                      </h3>
                    </div>
                  </div>
                  <span className="text-zinc-300 font-mono text-[11px] font-bold">
                    月額計: {entity.operations.toolStack.some((tool) => tool.isCostUnconfirmed) ? '未確認' : formatMoney(entity.operations.toolStack.reduce((sum, t) => sum + t.monthlyCost, 0))}
                  </span>
                </div>
                <div className="divide-y divide-white/[0.06] bg-[#0E131F]">
                  {entity.operations.toolStack.length === 0 ? (
                    <div className="p-3 text-[11px] font-mono text-zinc-500">実際のツール構成・月額原価は未確認</div>
                  ) : entity.operations.toolStack.map((tool, idx) => {
                    const aff = findToolAffiliate(tool.name);
                    const targetUrl = tool.url || aff?.url;
                    return (
                      <div key={idx} className="p-3 space-y-1 hover:bg-white/[0.02] transition-colors">
                        <div className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-2">
                            {targetUrl ? (
                              <a
                                href={targetUrl}
                                target="_blank"
                                rel="noopener noreferrer sponsored"
                                className="inline-flex items-center gap-1.5 text-white font-bold hover:text-emerald-300 transition-colors group cursor-pointer"
                              >
                                <span>{tool.name}</span>
                                <ExternalLink className="w-2.5 h-2.5 text-zinc-400 group-hover:text-emerald-400 transition-colors" />
                                {aff?.isAffiliate && (
                                  <span className="text-[8px] font-sans font-bold px-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                    PR
                                  </span>
                                )}
                              </a>
                            ) : (
                              <span className="text-white font-bold">{tool.name}</span>
                            )}
                            <span className="text-zinc-400 text-[10px] font-mono">({tool.category})</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-zinc-300 font-mono text-xs tabular-nums font-semibold">
                              {tool.isCostUnconfirmed ? '費用未確認' : `${formatMoney(tool.monthlyCost)}/月`}
                            </span>
                          </div>
                        </div>
                        {tool.purpose && (
                          <p className="text-[11px] text-zinc-300 leading-snug">
                            {tool.purpose}
                          </p>
                        )}
                      </div>
                    );
                  })}
                  {/* 景品表示法ステマ規制注記 */}
                  <div className="p-2.5 bg-white/[0.01] flex items-center gap-1.5 text-[9px] font-mono text-zinc-400">
                    <ShieldCheck className="w-3 h-3 text-zinc-400 shrink-0" />
                    <span>※掲載ツールリンクには提携アフィリエイト広告が含まれており、紹介料が発生する場合があります。</span>
                  </div>
                </div>
              </div>
            )}

            {/* 地雷・失敗事例専用：【即死回避】防壁インフラ ＆ 避難先ツール（PR） */}
            {isHazardMode && (() => {
              // 企業の失敗要因に応じた防壁ソリューションを選択（デフォルトはAPI_DEPENDENCYまたはBURN_RATE_COLLAPSE）
              const textLower = (
                (entity.tagline || '') + ' ' +
                (entity.opportunityJudgment?.oneLineReason || '') + ' ' +
                (entity.essence?.whatItDoes || '') + ' ' +
                (entity.essence?.painRelief || '') + ' ' +
                (entity.strategy?.blindspot || '') + ' ' +
                (entity.exposureAudit?.pivotSnapshot || '') + ' ' +
                entity.tags.join(' ')
              ).toLowerCase();
              let shieldKey = 'API_DEPENDENCY';
              if (textLower.includes('quibi') || textLower.includes('動画') || textLower.includes('制作費') || textLower.includes('スクショ') || textLower.includes('ハリウッド') || textLower.includes('tiktok')) {
                shieldKey = 'HEAVY_CAPITAL_MEDIA';
              } else if (textLower.includes('zenefits') || textLower.includes('保険法') || textLower.includes('違法') || textLower.includes('コンプライアンス') || textLower.includes('規制当局')) {
                shieldKey = 'REGULATORY_COMPLIANCE';
              } else if (textLower.includes('サーバー') || textLower.includes('固定費') || textLower.includes('赤字') || textLower.includes('burn') || textLower.includes('hopin') || textLower.includes('clubhouse')) {
                shieldKey = 'BURN_RATE_COLLAPSE';
              } else if (textLower.includes('sns') || textLower.includes('twitter') || textLower.includes('ban') || textLower.includes('集客')) {
                shieldKey = 'ALGORITHM_DEATH';
              }
              const shield = HAZARD_DEFENSE_SHIELDS[shieldKey] || HAZARD_DEFENSE_SHIELDS['API_DEPENDENCY'];

              return (
                <div
                  id="section-tools"
                  className="rounded-lg overflow-hidden border border-red-500/30 bg-[#0E131F] shadow-xl scroll-mt-4"
                >
                  <div className="flex items-center justify-between px-3.5 py-2.5 bg-red-950/40 border-b border-red-500/30">
                    <div className="flex items-center gap-2.5">
                      <div className="w-1 h-3.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                      <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded border text-red-300 bg-red-900/40 border-red-500/40">
                        #08
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-amber-400" />
                        <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-amber-200">
                          {shield.title}
                        </h3>
                      </div>
                    </div>
                    <span className="text-red-300 font-mono text-[10px] bg-red-950/60 px-2 py-0.5 rounded border border-red-500/30">
                      損失回避・防御盾
                    </span>
                  </div>

                  <div className="p-3.5 space-y-3 bg-[#0E131F]">
                    <div className="bg-red-950/30 border border-red-500/30 rounded-md p-3 space-y-1">
                      <div className="flex items-center gap-1.5 text-red-400 text-xs font-mono font-bold">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>踏んだら即死する構造的死角</span>
                      </div>
                      <p className="text-xs text-zinc-200 leading-relaxed font-sans">
                        {shield.fatalRisk}
                      </p>
                    </div>

                    <div className="bg-amber-950/20 border border-amber-500/30 rounded-md p-3 space-y-1">
                      <div className="flex items-center gap-1.5 text-amber-400 text-xs font-mono font-bold">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>生存のための防壁アプローチ</span>
                      </div>
                      <p className="text-xs text-zinc-200 leading-relaxed font-sans">
                        {shield.shieldApproach}
                      </p>
                    </div>

                    <div className="space-y-2 pt-1">
                      <span className="text-[10px] font-mono text-zinc-300 font-bold uppercase tracking-wider block">
                        推奨・避難先インフラスタック（検証済み代替ツール）
                      </span>
                      <div className="space-y-2">
                        {shield.recommendedTools.map((t, idx) => {
                          const affMeta = TOOL_AFFILIATES[t.affiliateKey];
                          const targetUrl = affMeta?.url || '#';
                          return (
                            <a
                              key={idx}
                              href={targetUrl}
                              target="_blank"
                              rel="noopener noreferrer sponsored"
                              className="block p-3 rounded-md bg-[#13110A] hover:bg-[#1C1810] border border-amber-500/30 hover:border-amber-500/60 transition-all group cursor-pointer"
                            >
                              <div className="flex items-center justify-between text-xs mb-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-white font-bold group-hover:text-amber-300 transition-colors">
                                    {t.name}
                                  </span>
                                  <span className="text-[9px] font-mono text-amber-300 bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-700/50">
                                    {t.role}
                                  </span>
                                  <span className="text-[8px] font-sans font-bold px-1 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                    PR
                                  </span>
                                </div>
                                <ExternalLink className="w-3 h-3 text-zinc-400 group-hover:text-amber-400 transition-colors" />
                              </div>
                              <p className="text-[11px] text-zinc-300 group-hover:text-zinc-200 leading-snug">
                                {t.whyShield}
                              </p>
                            </a>
                          );
                        })}
                      </div>
                    </div>

                    {/* 景表法ステマ規制注記 */}
                    <div className="pt-1 flex items-center gap-1 text-[9px] font-mono text-zinc-400">
                      <ShieldCheck className="w-2.5 h-2.5 text-zinc-400 shrink-0" />
                      <span>※掲載ツールリンクには提携アフィリエイト広告が含まれており、紹介料が発生する場合があります。</span>
                    </div>
                  </div>
                </div>
              );
            })()}


  </>;
}
