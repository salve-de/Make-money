'use client';

import React from 'react';
import { IntelligenceDossier, IntelligenceTopicId, FinancialEntity } from '../../types/terminal';
import {
  ArrowLeft,
  ShieldAlert,
  Cpu,
  Sparkles,
  TrendingUp,
  Wallet,
  ArrowRight,
  CreditCard,
  Building,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

interface IntelligenceDeepDiveViewProps {
  dossier: IntelligenceDossier;
  allDossiers?: IntelligenceDossier[];
  targetEntities: FinancialEntity[];
  onBackToCatalog?: () => void;
  onSelectDossier?: (id: IntelligenceTopicId) => void;
  onOpenEntityInLedger: (entityId: string) => void;
  currency: 'JPY' | 'USD';
  selectedEntityId?: string | null;
  onSelectEntity?: (id: string | null) => void;
  bookmarkedIds?: Set<string>;
  onToggleBookmark?: (id: string, e: React.MouseEvent) => void;
  onLaunchScreenerForDossier?: () => void;
}

export const IntelligenceDeepDiveView: React.FC<IntelligenceDeepDiveViewProps> = ({
  dossier,
  allDossiers,
  targetEntities,
  onBackToCatalog,
  onSelectDossier,
  onOpenEntityInLedger,
  currency,
  selectedEntityId,
  onSelectEntity,
  bookmarkedIds,
  onToggleBookmark,
  onLaunchScreenerForDossier,
}) => {
  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-[#060709] text-zinc-100">
      {/* 1. 最上部ナビゲーションバー（一覧復帰 ＆ 特集クイック切替） */}
      {(onBackToCatalog || (allDossiers && allDossiers.length > 0)) && (
        <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 px-6 py-3 bg-[#08090C]/90 backdrop-blur-md border-b border-white/[0.06]">
          {onBackToCatalog && (
            <button
              onClick={onBackToCatalog}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-xs font-mono text-zinc-300 hover:text-white transition-colors border border-white/[0.06]"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-zinc-400" />
              <span>特集シナリオ一覧に戻る</span>
            </button>
          )}

          {/* 特集切り替えセレクター */}
          {allDossiers && onSelectDossier && (
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-full py-0.5">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mr-1 hidden sm:inline">
                切替:
              </span>
              {allDossiers.map((d) => (
                <button
                  key={d.id}
                  onClick={() => onSelectDossier(d.id)}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono whitespace-nowrap transition-colors border ${
                    d.id === dossier.id
                      ? 'bg-white/[0.1] text-white border-white/[0.2] font-medium'
                      : 'bg-transparent text-zinc-500 hover:text-zinc-300 border-transparent hover:border-white/[0.05]'
                  }`}
                >
                  {d.badge}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="p-6 md:p-8 lg:p-10 max-w-5xl mx-auto w-full space-y-8">
        {/* 2. 特集ヘッダー ＆ パンチライン */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-mono tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
              {dossier.badge}
            </span>
            <span className="text-[10px] font-mono text-zinc-500">
              公開: {dossier.publishedDate}
            </span>
            <span className="text-[10px] font-mono text-zinc-600">
              • {dossier.readTime}
            </span>

            {dossier.highlightMetric && (
              <span className="ml-auto text-[11px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20">
                {dossier.highlightMetric.label}: {dossier.highlightMetric.value}
              </span>
            )}
          </div>

          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold tracking-tight text-white leading-snug">
            {dossier.title}
          </h1>

          {/* EXECUTIVE SUMMARY */}
          <div className="p-4 rounded-lg bg-[#08090C] border-l-2 border-amber-500/80 border border-white/[0.04]">
            <div className="text-[10px] font-mono uppercase tracking-widest text-amber-500/90 mb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500/90" />
              EXECUTIVE SUMMARY（急所サマリー）
            </div>
            <p className="text-xs md:text-sm text-zinc-200 leading-relaxed font-sans">
              {dossier.punchline}
            </p>
          </div>
        </div>

        {/* 3. マネーフロー構造レントゲン（資金移動図解） */}
        {dossier.moneyFlow && (
          <div className="space-y-3">
            <div className="text-[11px] font-mono uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              マネーフロー構造レントゲン（資金の移動ルート）
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 rounded-lg bg-[#08090C] border border-white/[0.06]">
              {/* ① 人質にした財布 */}
              <div className="p-3 rounded bg-white/[0.02] border border-white/[0.04] space-y-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-500">
                  <Wallet className="w-3 h-3 text-amber-400" />
                  01. 人質にした痛みの財布
                </div>
                <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                  {dossier.moneyFlow.payer}
                </p>
              </div>

              {/* ② 集金・中抜きの仕掛け */}
              <div className="p-3 rounded bg-white/[0.02] border border-white/[0.04] space-y-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-500">
                  <CreditCard className="w-3 h-3 text-sky-400" />
                  02. 集金・中抜きの仕掛け
                </div>
                <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                  {dossier.moneyFlow.takeMethod}
                </p>
              </div>

              {/* ③ 原価流出先 */}
              <div className="p-3 rounded bg-white/[0.02] border border-white/[0.04] space-y-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-500">
                  <Cpu className="w-3 h-3 text-red-400" />
                  03. 仕入れ原価・流出先
                </div>
                <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                  {dossier.moneyFlow.costCogs}
                </p>
              </div>

              {/* ④ 実効手残り純益 */}
              <div className="p-3 rounded bg-emerald-500/[0.04] border border-emerald-500/20 space-y-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 font-bold">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  04. 創業者口座の手残り
                </div>
                <p className="text-xs text-emerald-300 font-sans leading-relaxed font-medium">
                  {dossier.moneyFlow.netRetained}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 4. 2カラム構成: 市場の歪み vs コスト構造分解 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 左: 市場の構造的歪み・大手の死角（大手の自爆） */}
          <div className="space-y-2">
            <div className="text-[11px] font-mono uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
              市場の構造的歪み ＆ 大手の自爆（カニバリ死角）
            </div>
            <div className="bg-[#08090C] p-4 rounded-lg border border-white/[0.06] text-xs text-zinc-300 leading-relaxed font-sans space-y-2">
              <p>{dossier.macroArbitrage}</p>
            </div>
          </div>

          {/* 右: コスト構造分解・P&Lレントゲン */}
          <div className="space-y-2">
            <div className="text-[11px] font-mono uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-zinc-400" />
              {dossier.costStructureTeardown.title}
            </div>
            <div className="bg-[#08090C] p-4 rounded-lg border border-white/[0.06] space-y-3">
              <p className="text-[11px] text-zinc-400 leading-normal font-sans">
                {dossier.costStructureTeardown.description}
              </p>
              <div className="space-y-2 pt-1">
                {dossier.costStructureTeardown.breakdownItems.map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-zinc-400 truncate">{item.label}</span>
                      <span className="text-zinc-200 font-medium tabular-nums ml-2 shrink-0">
                        {item.percentage}% ({item.amountNote})
                      </span>
                    </div>
                    <div className="w-full h-1 bg-white/[0.04] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          idx === dossier.costStructureTeardown.breakdownItems.length - 1
                            ? 'bg-emerald-400'
                            : 'bg-zinc-600'
                        }`}
                        style={{ width: `${Math.min(item.percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 5. 参入・実行の急所ステップ (Playbook) */}
        <div className="space-y-3">
          <div className="text-[11px] font-mono uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
            参入・実行の急所ステップ (Playbook)
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {dossier.operationalPlaybook.map((step, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 p-3.5 rounded-lg bg-[#08090C] border border-white/[0.06] text-xs text-zinc-300"
              >
                <span className="font-mono text-[11px] text-emerald-400 font-bold shrink-0 mt-0.5">
                  0{idx + 1}.
                </span>
                <span className="leading-relaxed font-sans">{step}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 6. この手口で抜いている実例銘柄（代表企業の横並び比較） */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-mono uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-zinc-400" />
              この手口で抜いている代表銘柄 ({targetEntities.length}社)
            </div>
            <div className="text-[10px] font-mono text-zinc-500">
              ※クリックで財務台帳（DB）を開き、コールドメールやツールスタックを検証
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {targetEntities.map((entity) => {
              const profitRate =
                entity.pnl.operatingMargin ??
                (entity.pnl.monthlyRevenue > 0
                  ? Math.round((entity.pnl.operatingProfit / entity.pnl.monthlyRevenue) * 100)
                  : 0);

              return (
                <div
                  key={entity.id}
                  className="p-5 rounded-lg bg-[#08090C] border border-white/[0.08] hover:border-white/[0.18] transition-all space-y-4 shadow-md"
                >
                  {/* 上部: 銘柄名・粗利率 */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white">
                          {entity.name}
                        </span>
                        <span className="font-mono text-[10px] text-zinc-500">
                          [{entity.ticker}]
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 font-sans mt-0.5">
                        {entity.tagline}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-[10px] font-mono text-zinc-500">営業利益率</div>
                      <div className="text-sm font-mono font-bold text-emerald-400">
                        {profitRate}%
                      </div>
                    </div>
                  </div>

                  {/* 急所スペック（配管・人質にした財布） */}
                  <div className="space-y-2 text-xs">
                    <div className="p-2.5 rounded bg-white/[0.02] border border-white/[0.04] space-y-1">
                      <div className="text-[10px] font-mono text-zinc-500">現場の配管ツール:</div>
                      <div className="text-zinc-200 font-mono text-[11px] truncate">
                        {entity.pipelineStack}
                      </div>
                    </div>

                    <div className="p-2.5 rounded bg-white/[0.02] border border-white/[0.04] space-y-1">
                      <div className="text-[10px] font-mono text-zinc-500">人質にした痛みの財布:</div>
                      <div className="text-zinc-300 line-clamp-2">
                        {entity.targetPainWallet}
                      </div>
                    </div>
                  </div>

                  {/* DB直行ボタン */}
                  <button
                    onClick={() => onOpenEntityInLedger(entity.id)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded bg-white/[0.04] hover:bg-white/[0.08] text-xs font-mono text-zinc-200 hover:text-white transition-colors border border-white/[0.06] group"
                  >
                    <span>この銘柄の財務カルテ・コールドメールをDBで検証</span>
                    <ExternalLink className="w-3.5 h-3.5 text-zinc-400 group-hover:text-emerald-400 transition-colors" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
