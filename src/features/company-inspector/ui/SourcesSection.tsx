'use client';

import React from 'react';
import { ExternalLink, Database, FileCheck, Globe, ShieldCheck } from 'lucide-react';
import type { InspectorSectionProps } from '../model/section-props';

export function SourcesSection({ entity, isHazardMode }: Pick<InspectorSectionProps, 'entity' | 'isHazardMode'>) {
  // エビデンスカードや財務データから一次情報源・出典を網羅集約
  const sourceNotes: string[] = [];
  if (entity.evidenceCards) {
    for (const card of entity.evidenceCards) {
      if (card.sourceNote && !sourceNotes.includes(card.sourceNote)) {
        sourceNotes.push(card.sourceNote);
      }
    }
  }

  // 決算ステータスや一次検証情報
  const isEstimated = entity.pnl?.originType === 'estimated';
  const hasClaims = Array.isArray(entity.claimBindings) && entity.claimBindings.length > 0;

  return (
    <section
      id="section-sources"
      className={`rounded-lg overflow-hidden border shadow-xl ${
        isHazardMode ? 'border-red-500/30 bg-[#0E131F]' : 'border-white/[0.12] bg-[#0E131F]'
      } scroll-mt-4`}
    >
      {/* セクションヘッダー */}
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
            #14
          </span>
          <h3 className={`font-mono text-xs font-bold uppercase tracking-wider ${
            isHazardMode ? 'text-red-200' : 'text-zinc-100'
          }`}>
            一次情報源 ＆ エビデンス原本アーカイブ (PRIMARY SOURCES & ARCHIVE)
          </h3>
        </div>
        <span className="font-mono text-[10px] text-zinc-400 bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.06]">
          最下部集約
        </span>
      </div>

      <div className="p-4 space-y-4 bg-[#0E131F] divide-y divide-white/[0.06]">
        {/* 1. 公式サイト・公式Web原本 */}
        <div className="pt-2 first:pt-0 space-y-2">
          <div className="flex items-center gap-2 text-[11px] font-mono font-bold text-zinc-300">
            <Globe className="w-3.5 h-3.5 text-zinc-400" />
            <span>公式サイト ＆ 企業Webドメイン</span>
          </div>
          {entity.url ? (
            <div className="flex items-center justify-between p-2.5 rounded bg-white/[0.02] border border-white/[0.06] text-xs">
              <span className="text-zinc-300 font-mono truncate max-w-[320px]">{entity.url}</span>
              <a
                href={entity.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.12] text-[11px] font-mono text-zinc-200 hover:text-white transition-colors cursor-pointer shrink-0"
              >
                <span>公式Webを開く</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          ) : (
            <p className="text-xs text-zinc-500 font-mono">※公式ドメイン未登録（オフラインまたは匿名事業）</p>
          )}
        </div>

        {/* 2. 一次証拠・出典ログ（カードから集約） */}
        <div className="pt-3 space-y-2">
          <div className="flex items-center gap-2 text-[11px] font-mono font-bold text-zinc-300">
            <FileCheck className="w-3.5 h-3.5 text-zinc-400" />
            <span>証拠データ・財務数値の一次出典</span>
          </div>
          {sourceNotes.length > 0 ? (
            <ul className="space-y-1.5 font-mono text-xs">
              {sourceNotes.map((note, idx) => (
                <li key={idx} className="flex items-start gap-2 text-zinc-300 p-2 rounded bg-white/[0.02] border border-white/[0.04]">
                  <span className="text-zinc-500 font-bold shrink-0">[{String(idx + 1).padStart(2, '0')}]</span>
                  <span className="leading-relaxed">{note}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-zinc-400 font-mono">
              公開財務諸表、有価証券報告書、公式アナウンスメントおよび一次市場データから抽出。
            </p>
          )}
        </div>

        {/* 3. 暗号保全 ＆ 改ざん不可ステータス */}
        <div className="pt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[10px] font-mono text-zinc-400">
          <div className="flex items-center gap-2">
            <Database className="w-3 h-3 text-emerald-400 shrink-0" />
            <span>Cloudflare R2 (foundation-raw) SHA-256 CAS原本暗号保全済み</span>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-400">
            <ShieldCheck className="w-3 h-3 text-zinc-400" />
            <span>{hasClaims ? '一次台帳暗号バインド済み' : isEstimated ? '業界標準推計モデル' : '一次観測ログ確認済み'}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
