import React from 'react';
import { ExternalLink, ShieldCheck } from 'lucide-react';
import { findToolAffiliate, HAZARD_DEFENSE_SHIELDS, TOOL_AFFILIATES } from '@/platform/config/toolAffiliates';
import type { InspectorSectionProps } from '../model/section-props';

export function ToolsSection({ entity, formatMoney, isHazardMode }: Pick<InspectorSectionProps, 'entity' | 'formatMoney' | 'isHazardMode'>) {
  return (
    <section id="section-tools" className="scroll-mt-4">
      {/* 通常時：稼働インフラ・ツール構成調書 */}
      {!isHazardMode && entity.operations && (
        <div className="rounded-md border border-white/[0.12] bg-[#10131C] overflow-hidden">
          {/* ヘッダー */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-[#131724] border-b border-white/[0.10]">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] font-bold tracking-wider text-zinc-300 uppercase">
                TECH STACK & RUNTIME INFRA // 現場配管 ＆ 月額原価 ({entity.operations.toolStack.length}件)
              </span>
            </div>
            <span className="text-zinc-400 font-mono text-[11px]">
              月額計: <strong className="text-[#F4F5F7]">{entity.operations.toolStack.some((tool) => tool.isCostUnconfirmed) ? '未確認' : formatMoney(entity.operations.toolStack.reduce((sum, t) => sum + t.monthlyCost, 0))}</strong>
            </span>
          </div>

          {/* ツールリスト（テーブル調書形式） */}
          <div className="divide-y divide-white/[0.08]">
            {entity.operations.toolStack.length === 0 ? (
              <div className="p-4 text-xs font-mono text-zinc-500">
                実際のツール構成・月額原価は未確認です。
              </div>
            ) : (
              entity.operations.toolStack.map((tool, idx) => {
                const aff = findToolAffiliate(tool.name);
                const targetUrl = tool.url || aff?.url;
                return (
                  <div key={idx} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-white/[0.02] transition-colors">
                    <div className="space-y-0.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {targetUrl ? (
                          <a
                            href={targetUrl}
                            target="_blank"
                            rel="noopener noreferrer sponsored"
                            className="inline-flex items-center gap-1.5 text-[#F4F5F7] text-xs font-semibold hover:text-white transition-colors"
                          >
                            <span>{tool.name}</span>
                            <ExternalLink className="w-3 h-3 text-zinc-400" />
                            {aff?.isAffiliate && (
                              <span className="text-[9px] font-mono px-1 rounded bg-white/[0.06] text-zinc-400 border border-white/[0.10]">
                                PARTNER
                              </span>
                            )}
                          </a>
                        ) : (
                          <span className="text-[#F4F5F7] text-xs font-semibold">{tool.name}</span>
                        )}
                        <span className="text-zinc-400 text-[10px] font-mono">[{tool.category}]</span>
                      </div>
                      {tool.purpose && (
                        <p className="text-xs text-zinc-300 leading-snug font-sans">
                          {tool.purpose}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 font-mono text-xs text-zinc-200 tabular-nums">
                      {tool.isCostUnconfirmed ? (
                        <span className="text-zinc-500">費用未確認</span>
                      ) : (
                        <span>{formatMoney(tool.monthlyCost)}/月</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {/* 注記 */}
            <div className="p-3 bg-white/[0.01] flex items-center gap-2 text-[10px] font-mono text-zinc-400">
              <ShieldCheck className="w-3 h-3 text-zinc-400 shrink-0" />
              <span>※掲載ツールリンクには提携アフィリエイト広告が含まれており、紹介料が発生する場合があります。</span>
            </div>
          </div>
        </div>
      )}

      {/* 地雷・失敗事例：即死回避インフラ調書 */}
      {isHazardMode && (() => {
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
          <div className="rounded-md border border-red-500/30 bg-[#10131C] overflow-hidden">
            {/* ヘッダー */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-red-950/25 border-b border-red-500/20">
              <span className="font-mono text-[11px] font-bold tracking-wider text-red-400 uppercase">
                DEFENSE ARCHITECTURE // {shield.title}
              </span>
              <span className="font-mono text-[10px] text-zinc-400">
                HAZARD MITIGATION
              </span>
            </div>

            <div className="divide-y divide-white/[0.08]">
              {/* リスクと回避策 */}
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 rounded bg-red-950/20 border border-red-500/25 space-y-1">
                  <div className="font-mono text-[11px] font-bold text-red-400">
                    {'//'} 陥りやすい致命的リスク
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                    {shield.fatalRisk}
                  </p>
                </div>
                <div className="p-3 rounded bg-[#151926] border border-white/[0.08] space-y-1">
                  <div className="font-mono text-[11px] font-bold text-[#F4F5F7]">
                    {'//'} 生き残るための代替アプローチ
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                    {shield.shieldApproach}
                  </p>
                </div>
              </div>

              {/* 推奨代替ツール */}
              <div className="p-4 space-y-2">
                <div className="font-mono text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  RECOMMENDED RESILIENT STACK // 推奨代替ツール
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {shield.recommendedTools.map((t, idx) => {
                    const affMeta = TOOL_AFFILIATES[t.affiliateKey];
                    const targetUrl = affMeta?.url || '#';
                    return (
                      <a
                        key={idx}
                        href={targetUrl}
                        target="_blank"
                        rel="noopener noreferrer sponsored"
                        className="p-2.5 rounded bg-[#151926] border border-white/[0.08] hover:border-white/[0.20] transition-colors block group"
                      >
                        <div className="flex items-center justify-between text-xs mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[#F4F5F7] font-semibold group-hover:text-white transition-colors">{t.name}</span>
                            <span className="text-[9px] font-mono text-zinc-400 bg-white/[0.06] px-1 rounded border border-white/[0.08]">
                              {t.role}
                            </span>
                          </div>
                          <ExternalLink className="w-3 h-3 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
                        </div>
                        <p className="text-xs text-zinc-300 leading-snug font-sans">
                          {t.whyShield}
                        </p>
                      </a>
                    );
                  })}
                </div>
              </div>

              {/* 注記 */}
              <div className="p-3 bg-white/[0.01] flex items-center gap-2 text-[10px] font-mono text-zinc-400">
                <ShieldCheck className="w-3 h-3 text-zinc-400 shrink-0" />
                <span>※掲載ツールリンクには提携アフィリエイト広告が含まれており、紹介料が発生する場合があります。</span>
              </div>
            </div>
          </div>
        );
      })()}
    </section>
  );
}
