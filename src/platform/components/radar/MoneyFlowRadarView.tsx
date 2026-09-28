'use client';

import React, { useState } from 'react';
import type { FinancialEntity } from '../../types/terminal';
import {
  MONEY_FLOW_TRENDS,
  RED_OCEAN_ALERTS,
  PAIN_WALLET_HEATMAPS,
} from '../../data/moneyFlowRadarData';
import { AlertTriangle, ArrowRight, Building2, Search } from 'lucide-react';

interface MoneyFlowRadarViewProps {
  allEntities: FinancialEntity[];
  onOpenEntityInLedger: (entityId: string) => void;
}

type RadarFilter = 'ALL' | 'RISING' | 'WARNING' | 'PAIN_WALLET';

const trendLabels: Record<string, string> = {
  trend_api_wrapper: 'AI技術を使った単機能サービス',
  trend_privacy_counter: 'アクセス解析サービスの選択',
  trend_direct_monopoly: '製造業の直販と物流',
  trend_media_box: 'ニュースレターと広告',
};

const filterItems: Array<{ id: RadarFilter; label: string }> = [
  { id: 'ALL', label: 'すべて' },
  { id: 'RISING', label: '事業テーマ' },
  { id: 'WARNING', label: '失敗要因' },
  { id: 'PAIN_WALLET', label: '購入のきっかけ' },
];

export const MoneyFlowRadarView: React.FC<MoneyFlowRadarViewProps> = ({
  allEntities,
  onOpenEntityInLedger,
}) => {
  const [filter, setFilter] = useState<RadarFilter>('ALL');

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-y-auto bg-background text-foreground">
      <header className="border-b border-white/[0.12] bg-surface px-5 py-5 md:px-7">
        <div className="mx-auto w-full max-w-screen-2xl">
          <p className="text-sm font-medium text-accent">参考資料</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            市場の動きと事業リスク
          </h1>
          <p className="mt-4 max-w-4xl rounded-md border border-amber-300/25 bg-amber-200/[0.06] px-4 py-3 text-sm leading-6 text-amber-100" role="note">
            固定資料です。成長率、利益率、顧客需要、価格、現在の有効性、企業との対応は一次資料と照合されていません。市場統計や参入判断として使えるデータではありません。
          </p>

          <div className="mt-5 flex flex-wrap gap-2 border-t border-white/[0.1] pt-4" role="group" aria-label="表示する資料を選択">
            {filterItems.map((item) => {
              const selected = filter === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFilter(item.id)}
                  aria-pressed={selected}
                  className={`min-h-11 rounded-md border px-4 text-sm font-medium transition-colors ${
                    selected
                      ? 'border-accent/50 bg-accent/10 text-accent-strong'
                      : 'border-white/[0.14] bg-surface-raised text-zinc-300 hover:border-white/[0.24] hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-screen-2xl flex-1 space-y-8 px-5 py-6 md:px-7">
        {(filter === 'ALL' || filter === 'RISING') && (
          <section className="space-y-4" aria-labelledby="radar-topics-heading">
            <div className="flex flex-wrap items-end justify-between gap-2 border-b border-white/[0.1] pb-3">
              <div>
                <p className="text-sm font-medium text-accent">事業テーマ</p>
                <h2 id="radar-topics-heading" className="mt-1 text-lg font-semibold text-white">比較の切り口</h2>
              </div>
              <span className="text-sm text-zinc-400">{MONEY_FLOW_TRENDS.length}件</span>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {MONEY_FLOW_TRENDS.map((trend) => {
                const relatedEntities = allEntities.filter((entity) =>
                  trend.representativeEntityIds.includes(entity.id),
                );
                return (
                  <article key={trend.id} className="flex flex-col gap-4 rounded-lg border border-white/[0.12] bg-surface p-4 sm:p-5">
                    <div>
                      <span className="text-sm text-zinc-400">参考例 · 出典未照合</span>
                      <h3 className="mt-1 text-base font-semibold leading-snug text-white sm:text-lg">
                        {trendLabels[trend.id] ?? trend.title}
                      </h3>
                      <p className="mt-3 text-sm leading-6 text-zinc-300">
                        事業の提供方法、顧客の購入理由、運営コストを比較するためのテーマです。
                      </p>
                    </div>

                    <div className="rounded-md border border-white/[0.1] bg-surface-raised p-3">
                      <h4 className="text-sm font-semibold text-zinc-200">検証する項目</h4>
                      <ul className="mt-2 space-y-1 text-sm leading-6 text-zinc-300">
                        <li>顧客が実際に支払った金額と時期</li>
                        <li>集客費用、運営コスト、継続率</li>
                        <li>関連企業の事例と出典の対応</li>
                      </ul>
                    </div>

                    {relatedEntities.length > 0 && (
                      <div className="mt-auto border-t border-white/[0.1] pt-3">
                        <p className="mb-2 text-sm text-zinc-400">関連する台帳登録事例（対応未確認）</p>
                        <div className="flex flex-wrap gap-2">
                          {relatedEntities.map((entity) => (
                            <button
                              key={entity.id}
                              type="button"
                              onClick={() => onOpenEntityInLedger(entity.id)}
                              className="inline-flex min-h-10 items-center gap-2 rounded-md border border-white/[0.14] bg-surface-raised px-3 text-sm text-zinc-200 transition-colors hover:border-accent/50 hover:text-white"
                            >
                              <Building2 aria-hidden="true" className="h-4 w-4 text-zinc-400" />
                              <span>{entity.name}</span>
                              <ArrowRight aria-hidden="true" className="h-4 w-4 text-accent" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {(filter === 'ALL' || filter === 'WARNING') && (
          <section className="space-y-4" aria-labelledby="radar-risks-heading">
            <div className="flex flex-wrap items-end justify-between gap-2 border-b border-white/[0.1] pb-3">
              <div>
                <p className="text-sm font-medium text-accent">失敗要因</p>
                <h2 id="radar-risks-heading" className="mt-1 text-lg font-semibold text-white">事前に確認したい点</h2>
              </div>
              <span className="text-sm text-zinc-400">{RED_OCEAN_ALERTS.length}件</span>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {RED_OCEAN_ALERTS.map((alert) => (
                <article key={alert.id} className="rounded-lg border border-white/[0.12] bg-surface p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <AlertTriangle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-amber-200" />
                    <div>
                      <p className="text-sm text-zinc-400">登録された失敗要因 · 出典未照合</p>
                      <h3 className="mt-1 text-base font-semibold leading-snug text-white">{alert.title}</h3>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-zinc-300">
                    利益率の変化や原因分析は確認されていません。導入判断の前に、現在の顧客需要、競合、原価、販売経路を個別に調べてください。
                  </p>
                </article>
              ))}
            </div>
          </section>
        )}

        {(filter === 'ALL' || filter === 'PAIN_WALLET') && (
          <section className="space-y-4" aria-labelledby="radar-needs-heading">
            <div className="flex flex-wrap items-end justify-between gap-2 border-b border-white/[0.1] pb-3">
              <div>
                <p className="text-sm font-medium text-accent">購入のきっかけ</p>
                <h2 id="radar-needs-heading" className="mt-1 text-lg font-semibold text-white">顧客課題の仮説</h2>
              </div>
              <span className="text-sm text-zinc-400">{PAIN_WALLET_HEATMAPS.length}件</span>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {PAIN_WALLET_HEATMAPS.map((item) => (
                <article key={item.id} className="rounded-lg border border-white/[0.12] bg-surface p-4 sm:p-5">
                  <p className="text-sm text-zinc-400">{item.sector} · 仮説</p>
                  <h3 className="mt-1 text-base font-semibold leading-snug text-white">{item.targetPersona}</h3>
                  <div className="mt-4 rounded-md bg-surface-raised p-3">
                    <h4 className="text-sm font-semibold text-zinc-200">想定される課題</h4>
                    <p className="mt-1 text-sm leading-6 text-zinc-300">{item.painTrigger}</p>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-zinc-400">
                    需要、予算、購買行動の規模は確認されていません。顧客への聞き取りや一次資料で検証が必要です。
                  </p>
                </article>
              ))}
            </div>
          </section>
        )}

        <div className="flex items-start gap-3 rounded-lg border border-white/[0.12] bg-surface p-4 text-sm leading-6 text-zinc-300" role="note">
          <Search aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          <p>各項目は調査対象を見つけるための参考資料です。出典と実績を確認してから比較に使ってください。</p>
        </div>
      </main>
    </div>
  );
};
