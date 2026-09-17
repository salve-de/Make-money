'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  MARKET_RADAR_TRENDS,
  MARKET_RADAR_LANDMINES,
} from '@/platform/data/marketRadarData';
import {
  AlertTriangle,
  Flame,
  Skull,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import { RadarOpportunityDetail } from './RadarOpportunityDetail';
import { RadarLandmineDetail } from './RadarLandmineDetail';

interface RadarItemDetailViewProps {
  id: string;
  onSelectEntity?: (entityId: string) => void;
  resolveEntityId?: (entityId: string) => string | null;
}

export const RadarItemDetailView: React.FC<RadarItemDetailViewProps> = ({ id, onSelectEntity, resolveEntityId }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const trend = useMemo(() => MARKET_RADAR_TRENDS.find((t) => t.id === id), [id]);
  const landmine = useMemo(() => MARKET_RADAR_LANDMINES.find((l) => l.id === id), [id]);
  const displayTrend = useMemo(() => {
    if (!trend) return undefined;
    const rawId = trend.gapAndProof.provenPlayer.entityId;
    const resolvedId = rawId && resolveEntityId ? resolveEntityId(rawId) : null;
    if (resolvedId === rawId) return trend;
    return {
      ...trend,
      gapAndProof: {
        ...trend.gapAndProof,
        provenPlayer: {
          ...trend.gapAndProof.provenPlayer,
          entityId: resolvedId ?? undefined,
        },
      },
    };
  }, [trend, resolveEntityId]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (!trend && !landmine) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#060709] text-zinc-300">
        <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
        <h2 className="text-lg font-bold text-white mb-2">指定されたレーダー項目が見つかりません</h2>
        <p className="text-xs text-zinc-500 mb-6 font-mono">ID: {id}</p>
        <Link
          href="/radar"
          className="px-4 py-2 rounded bg-white/[0.1] hover:bg-white/[0.15] text-xs font-mono text-white border border-white/[0.1] transition-colors"
        >
          ← 市場レーダー一覧に戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#060709] text-zinc-100 overflow-y-auto font-sans select-none">
      <header className="border-b border-white/[0.06] bg-[#090A0F] px-4 sm:px-6 py-3.5 shrink-0 sticky top-0 z-20 backdrop-blur-md">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/radar"
              className="px-3 py-1.5 rounded bg-white/[0.05] hover:bg-white/[0.12] text-xs font-mono text-zinc-200 border border-white/[0.1] transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>一覧に戻る</span>
            </Link>

            <span className="text-zinc-600 font-mono text-xs">/</span>

            <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
              {trend ? (
                <>
                  <Flame className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300 font-semibold">{trend.categoryLabel}</span>
                </>
              ) : (
                <>
                  <Skull className="w-3.5 h-3.5 text-rose-400" />
                  <span className="text-rose-300 font-semibold">{landmine?.fatalCategory}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="text-xs font-mono text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              全銘柄台帳 →
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto w-full p-4 sm:p-6 space-y-6 flex-1">
        {displayTrend && (
          <RadarOpportunityDetail
            trend={displayTrend}
            copiedKey={copiedKey}
            handleCopy={handleCopy}
            onSelectEntity={onSelectEntity}
          />
        )}

        {landmine && (
          <RadarLandmineDetail landmine={landmine} />
        )}

        <div className="pt-6 border-t border-white/[0.08] space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
            <span>他のレーダー項目を探索:</span>
            <Link href="/radar" className="text-cyan-400 hover:underline flex items-center gap-1">
              <span>全項目一覧へ</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
            {MARKET_RADAR_TRENDS.slice(0, 4).map((t) => (
              <Link
                key={t.id}
                href={`/radar/${t.id}`}
                className={`p-2.5 rounded border text-left transition-colors truncate block ${
                  t.id === id
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-bold'
                    : 'bg-black/30 border-white/[0.06] text-zinc-400 hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                <div className="text-[9px] text-zinc-500 truncate">{t.badge}</div>
                <div className="truncate text-[11px] mt-0.5">{t.title}</div>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};
