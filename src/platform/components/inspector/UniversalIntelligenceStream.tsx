'use client';

import React from 'react';
import { FinancialEntity, UniversalObservation } from '../../types/terminal';
import { 
  ShieldAlert, 
  Sparkles, 
  Flame, 
  ExternalLink, 
  History, 
  Zap, 
  Cpu, 
  Users, 
  AlertCircle,
  HelpCircle,
  Clock,
  CheckCircle2,
  FileQuestion
} from 'lucide-react';

interface UniversalIntelligenceStreamProps {
  entity: FinancialEntity;
  currency: 'JPY' | 'USD';
}

export const UniversalIntelligenceStream: React.FC<UniversalIntelligenceStreamProps> = ({
  entity,
  currency,
}) => {
  const { dynamicMoats, observationsStream, timelineEvents, coverageAudit, unknownsNotes, exposureAudit } = entity;

  // Layer 2 特異点ブロックの存在判定
  const hasDynamicMoats = dynamicMoats && (
    dynamicMoats.parasiteHost ||
    dynamicMoats.dataHostage ||
    dynamicMoats.affiliateBribery ||
    dynamicMoats.upfrontCash ||
    dynamicMoats.pivotGraveyard
  );

  const hasExposureAudit = exposureAudit && (
    exposureAudit.guerrillaTraction ||
    exposureAudit.platformGlitch ||
    exposureAudit.pivotSnapshot ||
    exposureAudit.hiddenStackCost
  );

  // カテゴリ別のバッジ配色・アイコン判定
  const getCategoryBadge = (category: UniversalObservation['category']) => {
    switch (category) {
      case 'INCUMBENT_DILEMMA':
        return {
          label: '大手の自爆',
          border: 'border-red-500/30',
          bg: 'bg-red-950/20',
          text: 'text-red-300',
        };
      case 'SAVANNAH_PAIN':
        return {
          label: 'サバンナOSの急所',
          border: 'border-amber-500/30',
          bg: 'bg-amber-950/20',
          text: 'text-amber-300',
        };
      case 'MARKET_DISTORTION':
        return {
          label: '市場の歪み',
          border: 'border-emerald-500/30',
          bg: 'bg-emerald-950/20',
          text: 'text-emerald-300',
        };
      case 'FOUNDER_HACK':
        return {
          label: '現場の泥臭い工夫',
          border: 'border-blue-500/30',
          bg: 'bg-blue-950/20',
          text: 'text-blue-300',
        };
      case 'TECH_VERIFICATION':
        return {
          label: '技術スタック照合',
          border: 'border-purple-500/30',
          bg: 'bg-purple-950/20',
          text: 'text-purple-300',
        };
      case 'FORUM_RAGE':
        return {
          label: '顧客の生の声・怨嗟',
          border: 'border-orange-500/30',
          bg: 'bg-orange-950/20',
          text: 'text-orange-300',
        };
      case 'RESEARCH_LIMIT':
      default:
        return {
          label: '調査限界・非公開',
          border: 'border-zinc-700',
          bg: 'bg-zinc-900',
          text: 'text-zinc-400',
        };
    }
  };

  return (
    <div className="space-y-6">

      {/* ========================================================= */}
      {/* 監査ステータスバッジ（法的安全性 ＆ 完全表示保障） */}
      {/* ========================================================= */}
      <div className="p-3 rounded-md bg-white/[0.02] border border-white/[0.06] flex items-center justify-between text-[10px] font-mono">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
            <CheckCircle2 className="w-3 h-3" />
            完全表示保障 (Display Guarantee: 100%)
          </span>
          <span className="text-zinc-600">|</span>
          <span className="text-zinc-400">万能救済ストリーム稼働中</span>
        </div>
        <div className="flex items-center gap-1.5 text-zinc-500">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>合法的金融リサーチのみ収録</span>
        </div>
      </div>
      {/* ========================================================= */}
      {/* 時系列インテリジェンス ＆ 手口の賞味期限（Temporal Radar） */}
      {/* ========================================================= */}
      {entity.temporal && (
        <section className="space-y-2.5 border border-white/[0.08] rounded-md bg-[#0A0C10] p-4">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[9px] font-bold text-cyan-400 bg-cyan-950/40 border border-cyan-500/30 px-1.5 py-0.5 rounded flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />
                TEMPORAL
              </span>
              <span className="font-mono text-[11px] font-bold text-zinc-200 uppercase tracking-wider">
                時系列インテリジェンス ＆ 手口の賞味期限
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                entity.temporal.viabilityStatus === 'ACTIVE_PLAYBOOK' ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40' :
                entity.temporal.viabilityStatus === 'RISING_WAVE' ? 'bg-cyan-950/40 text-cyan-300 border-cyan-500/40 animate-pulse' :
                entity.temporal.viabilityStatus === 'MATURED_MOAT' ? 'bg-amber-950/40 text-amber-300 border-amber-500/40' :
                entity.temporal.viabilityStatus === 'HISTORICAL_WINDOW' ? 'bg-red-950/40 text-red-300 border-red-500/40' :
                'bg-purple-950/40 text-purple-300 border-purple-500/40'
              }`}>
                ● {entity.temporal.viabilityLabel}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-[10px] font-mono py-1">
            <div className="bg-white/[0.02] border border-white/[0.04] p-2 rounded">
              <span className="text-zinc-500 block">創業・ローンチ時期</span>
              <span className="text-zinc-200 font-bold text-[11px]">{entity.temporal.foundedYear}年 ({entity.temporal.initialTractionPeriod})</span>
            </div>
            <div className="bg-white/[0.02] border border-white/[0.04] p-2 rounded">
              <span className="text-zinc-500 block">データ観測基準時期</span>
              <span className="text-zinc-200 font-bold text-[11px]">{entity.temporal.dataSnapshotPeriod}</span>
            </div>
            <div className="bg-white/[0.02] border border-white/[0.04] p-2 rounded">
              <span className="text-zinc-500 block">現在の再現性判定</span>
              <span className="text-emerald-400 font-bold text-[11px]">{entity.temporal.viabilityLabel}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1 text-[11px]">
            <div className="bg-white/[0.01] border border-white/[0.04] p-2.5 rounded space-y-1">
              <span className="font-mono text-[10px] text-zinc-400 font-bold flex items-center gap-1">
                <History className="w-3 h-3 text-cyan-400" />
                なぜその時期・時代に勝てたのか（構造的背景）:
              </span>
              <p className="text-zinc-300 leading-relaxed text-[11px]">
                {entity.temporal.eraContext}
              </p>
            </div>
            <div className="bg-white/[0.01] border border-white/[0.04] p-2.5 rounded space-y-1">
              <span className="font-mono text-[10px] text-zinc-400 font-bold flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-amber-400" />
                今から同じ手口で勝てるか？（冷徹な根拠判定）:
              </span>
              <p className="text-zinc-300 leading-relaxed text-[11px]">
                {entity.temporal.currentViabilityAnalysis}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================= */}
      {/* 重要タイムライン・特異点ログ */}
      {/* ========================================================= */}
      {timelineEvents && timelineEvents.length > 0 && (
        <section className="space-y-2 border border-white/[0.08] rounded-md bg-[#0A0C10] p-3.5">
          <div className="flex items-center gap-2 border-b border-white/[0.06] pb-1.5">
            <History className="w-3.5 h-3.5 text-zinc-400" />
            <span className="font-mono text-[11px] font-bold text-zinc-200 uppercase tracking-wider">
              重要タイムライン・特異点ログ (TIMELINE MILESTONES)
            </span>
          </div>
          <div className="space-y-2 pt-1 font-mono text-[11px]">
            {timelineEvents.map((evt, idx) => (
              <div key={idx} className="flex items-start gap-2.5 text-zinc-300 border-l-2 border-zinc-700 pl-2.5 py-0.5">
                <span className="text-[10px] text-cyan-400 shrink-0 font-bold">{evt.occurredAt || '時期不詳'}</span>
                <span className="text-zinc-500">|</span>
                <span className="text-[11px] leading-relaxed text-zinc-300">{evt.description}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ========================================================= */}
      {/* Layer 2: 【動的特異点ブロック】（型がある武器・急所） */}
      {/* データが存在するブロックだけが自動展開・最上位化 */}
      {/* ========================================================= */}
      {(hasDynamicMoats || hasExposureAudit) && (
        <section className="space-y-3">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-1.5">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[9px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                LAYER 2
              </span>
              <span className="font-mono text-[11px] font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                動的特異点ブロック (KILLER EDGE MODULES)
              </span>
            </div>
            <span className="text-[10px] font-mono text-zinc-500">
              ※ 特異点データが存在する項目のみ自動展開
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {/* ① 寄生・コバンザメ構造 */}
            {dynamicMoats?.parasiteHost && (
              <div className="border border-white/[0.08] rounded-md bg-[#0A0C10] p-3.5 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-zinc-400 font-bold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    寄生・コバンザメ構造（宿主ハック）
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] text-zinc-300 border border-white/[0.08]">
                    宿主: {dynamicMoats.parasiteHost.hostName}
                  </span>
                </div>
                <p className="text-zinc-300 text-[11px] leading-relaxed pl-3 border-l border-emerald-500/30">
                  {dynamicMoats.parasiteHost.detail}
                </p>
              </div>
            )}

            {/* ② データの監禁度（人質資産） */}
            {dynamicMoats?.dataHostage && (
              <div className="border border-white/[0.08] rounded-md bg-[#0A0C10] p-3.5 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-zinc-400 font-bold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    データの監禁度（人質資産・解約不能化）
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] text-zinc-300 border border-white/[0.08]">
                    人質: {dynamicMoats.dataHostage.lockInFactor}
                  </span>
                </div>
                <p className="text-zinc-300 text-[11px] leading-relaxed pl-3 border-l border-amber-500/30">
                  {dynamicMoats.dataHostage.detail}
                </p>
              </div>
            )}

            {/* ③ 共犯者・紹介賄賂網 */}
            {dynamicMoats?.affiliateBribery && (
              <div className="border border-white/[0.08] rounded-md bg-[#0A0C10] p-3.5 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-zinc-400 font-bold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    共犯者・紹介賄賂網（他人の強欲を走らせる配管）
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-950/30 text-blue-300 border border-blue-500/30 font-bold">
                    還元率: {dynamicMoats.affiliateBribery.commissionRate}
                  </span>
                </div>
                <p className="text-zinc-300 text-[11px] leading-relaxed pl-3 border-l border-blue-500/30">
                  {dynamicMoats.affiliateBribery.detail}
                </p>
              </div>
            )}

            {/* ④ 前金総取り・無元手拡大 */}
            {dynamicMoats?.upfrontCash && (
              <div className="border border-white/[0.08] rounded-md bg-[#0A0C10] p-3.5 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-zinc-400 font-bold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                    前金総取り・客の金で拡大（キャッシュ幾何学）
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] text-zinc-300 border border-white/[0.08]">
                    {dynamicMoats.upfrontCash.cashCycle}
                  </span>
                </div>
                <p className="text-zinc-300 text-[11px] leading-relaxed pl-3 border-l border-purple-500/30">
                  {dynamicMoats.upfrontCash.detail}
                </p>
              </div>
            )}

            {/* ⑤ 死屍累々のピボット魚拓 */}
            {dynamicMoats?.pivotGraveyard && (
              <div className="border border-white/[0.08] rounded-md bg-[#0A0C10] p-3.5 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-zinc-400 font-bold flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-zinc-400" />
                    死屍累々のピボット魚拓（爆死墓場と当たりの特異点）
                  </span>
                </div>
                {dynamicMoats.pivotGraveyard.failedAttempts.length > 0 && (
                  <div className="text-[10px] font-mono text-zinc-400 space-y-1">
                    <span className="text-zinc-500">過去に爆死させたプロダクト:</span>
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {dynamicMoats.pivotGraveyard.failedAttempts.map((prod, i) => (
                        <span key={i} className="px-1.5 py-0.5 rounded bg-red-950/20 text-red-400/90 border border-red-500/20 line-through">
                          {prod}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <p className="text-zinc-200 text-[11px] leading-relaxed pl-3 border-l border-emerald-500/40 font-medium">
                  <span className="text-emerald-400 font-mono font-bold mr-1.5">[当たりの境界線]</span>
                  {dynamicMoats.pivotGraveyard.breakthroughSecret}
                </p>
              </div>
            )}
          </div>
        </section>
      )}
      {/* ========================================================= */}
      {/* Layer 3: 【万能救済ストリーム】（型に収まらない全データ） */}
      {/* observations / Universal Journal の内容を高密度カードとして1文字も捨てずに全量描画 */}
      {/* ========================================================= */}
      <section className="space-y-3">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-1.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] font-bold text-zinc-300 bg-white/[0.08] border border-white/[0.1] px-1.5 py-0.5 rounded">
              LAYER 3
            </span>
            <span className="font-mono text-[11px] font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
              万能救済ストリーム (UNIVERSAL INTELLIGENCE STREAM)
            </span>
          </div>
          <span className="text-[10px] font-mono text-zinc-400">
            {observationsStream?.length || 0} 件の観測レコード
          </span>
        </div>

        {/* 観測ログカード群 */}
        {observationsStream && observationsStream.length > 0 ? (
          <div className="space-y-2.5">
            {observationsStream.map((obs, idx) => {
              const badge = getCategoryBadge(obs.category);
              return (
                <div 
                  key={obs.id || idx}
                  className="border border-white/[0.06] hover:border-white/[0.15] rounded-md bg-[#0A0C10] p-3.5 space-y-2 transition-all shadow-xs"
                >
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <div className="flex items-center gap-1.5">
                      <span className={`px-1.5 py-0.5 rounded font-bold border ${badge.bg} ${badge.border} ${badge.text}`}>
                        {badge.label}
                      </span>
                      {obs.originType && (
                        <span className="text-zinc-500">
                          [{obs.originType === 'observed' ? '確定観測' : obs.originType === 'inferred' ? '構造推論' : obs.originType}]
                        </span>
                      )}
                    </div>
                    {obs.verificationStatus && (
                      <span className={`text-[9px] ${obs.verificationStatus === 'SUPPORTED' ? 'text-emerald-400/80' : 'text-zinc-500'}`}>
                        {obs.verificationStatus === 'SUPPORTED' ? '✓ 検証完了' : '※ 推定値'}
                      </span>
                    )}
                  </div>
                  <p className="text-zinc-200 text-[11px] leading-relaxed font-sans">
                    {obs.text}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 rounded-md border border-white/[0.04] bg-white/[0.01] text-center text-zinc-500 text-xs font-mono">
            現在、追加の未分類観測レコードはありません（固定Core骨格および動的特異点にすべて構造化されています）。
          </div>
        )}

        {/* タイムライン・重要イベント */}
        {timelineEvents && timelineEvents.length > 0 && (
          <div className="border border-white/[0.06] rounded-md bg-[#090A0E] p-3.5 space-y-2.5">
            <div className="flex items-center gap-2 text-[11px] font-mono font-bold text-zinc-300">
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
              <span>主要タイムライン・里程標 (TIMELINE EVENTS)</span>
            </div>
            <div className="space-y-2 pl-2 border-l border-white/[0.08]">
              {timelineEvents.map((evt, idx) => (
                <div key={idx} className="relative pl-3 space-y-0.5 text-[11px]">
                  <span className="absolute -left-[13px] top-1.5 w-1.5 h-1.5 rounded-full bg-zinc-500" />
                  <div className="text-[10px] font-mono text-zinc-400">
                    {evt.occurredAt} ・ {evt.eventType}
                  </div>
                  <div className="text-zinc-300 font-sans leading-snug">
                    {evt.description}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 調査限界・非公開メモ（誠実な金融端末の証） */}
        {unknownsNotes && unknownsNotes.length > 0 && (
          <div className="border border-white/[0.06] rounded-md bg-[#08090C] p-3.5 space-y-2">
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400 font-bold">
              <HelpCircle className="w-3.5 h-3.5 text-zinc-500" />
              <span>調査限界・非公開ステータス（UNKNOWNS & LIMITATIONS）</span>
            </div>
            <ul className="space-y-1 text-[10px] font-mono text-zinc-400 pl-4 list-disc">
              {unknownsNotes.map((note, idx) => (
                <li key={idx} className="leading-relaxed">
                  {note}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* カバレッジ監査ログ */}
        {coverageAudit && coverageAudit.length > 0 && (
          <details className="border border-white/[0.04] rounded-md bg-black/40 p-2.5 text-[10px] font-mono text-zinc-500 group">
            <summary className="cursor-pointer hover:text-zinc-300 flex items-center justify-between">
              <span>全方位カバレッジ監査ログ ({coverageAudit.length} 項目確認済み)</span>
              <span className="text-[9px] text-zinc-600 group-open:rotate-90 transition-transform">▶</span>
            </summary>
            <div className="mt-2.5 pt-2 border-t border-white/[0.04] space-y-1.5 max-h-48 overflow-y-auto">
              {coverageAudit.map((item, idx) => (
                <div key={idx} className="flex items-start justify-between gap-2 py-0.5 border-b border-white/[0.02]">
                  <span className="text-zinc-400 shrink-0">{item.dimension}:</span>
                  <span className="text-right truncate text-zinc-400 font-sans">
                    {item.note || item.status}
                  </span>
                </div>
              ))}
            </div>
          </details>
        )}
      </section>

    </div>
  );
};
