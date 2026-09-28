'use client';

import React from 'react';
import { CompanyRecord } from '@/types/terminal';
import { DOSSIER_COLLECTIONS } from '@/data/portalDossiers';
import { CompanyLogo } from '@/components/terminal/CompanyLogo';

interface SpecialCollectionsViewProps {
  companies: CompanyRecord[];
  onSelectCompany: (id: string) => void;
  onOpenDossier: (dossierId: string) => void;
  onBackToPortal: () => void;
}

export const SpecialCollectionsView: React.FC<SpecialCollectionsViewProps> = ({
  companies,
  onSelectCompany,
  onOpenDossier,
  onBackToPortal,
}) => {
  const collectionList = Object.values(DOSSIER_COLLECTIONS);

  return (
    <div className="flex-1 bg-[#0B0E14] overflow-y-auto font-sans text-zinc-100">
      {/* 上部パンくず＆ヘッダー */}
      <div className="border-b border-white/[0.08] bg-[#0D1117] px-6 py-4">
        <div className="max-w-6xl mx-auto space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
            <button
              onClick={onBackToPortal}
              className="hover:text-white transition-colors flex items-center gap-1 font-semibold cursor-pointer"
            >
              <span>←</span>
              <span>ポータル・トップに戻る</span>
            </button>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-300 font-semibold">大特集コレクション</span>
          </div>

          <div className="space-y-2">
            <h1 className="text-lg sm:text-xl font-semibold text-white tracking-tight">
              事業モデルの資料と関連企業
            </h1>
            <p className="text-xs text-zinc-300 max-w-3xl leading-relaxed">
              3種類の事業モデル資料と、台帳上で関連付けられた企業を確認できます。資料内の数値や関連付けは出典・対象時期を照合してください。
            </p>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        <div className="grid grid-cols-1 gap-8">
          {collectionList.map((col, idx) => {
            const related = companies.filter((c) => col.relatedCompanyIds.includes(c.id));

            return (
              <div
                key={col.id}
                className="p-6 sm:p-8 rounded bg-[#0F131C] border border-white/[0.08] space-y-6 hover:border-white/[0.15] transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-white/[0.08] pb-5">
                  <div className="flex items-start gap-4">
                    <CompanyLogo name={col.title} size="md" category={col.badge} />
                    <div className="space-y-2 max-w-2xl">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-white/[0.1] text-zinc-200 border border-white/[0.15]">
                          COLLECTION 0{idx + 1}
                        </span>
                        <span className="text-xs font-mono text-zinc-400 font-medium">
                          {col.badge}
                        </span>
                      </div>
                      <h2 className="text-lg sm:text-xl font-bold text-white leading-snug">
                        {col.title}
                      </h2>
                      <p className="text-xs sm:text-sm text-zinc-300 font-normal leading-relaxed">
                        {col.leadParagraph}
                      </p>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-3 shrink-0">
                    <span className="text-[11px] font-mono text-zinc-400">関連企業 {related.length}社</span>
                    <button
                      onClick={() => onOpenDossier(col.id)}
                      className="h-9 px-4 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors border border-white/[0.12] cursor-pointer"
                    >
                      <span>詳細レポートを開く</span>
                      <span>→</span>
                    </button>
                  </div>
                </div>

                {/* 構造分析概要プレビュー */}
                <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/[0.08] text-xs py-2 border-b border-white/[0.08]">
                  <div className="py-2 md:py-0 md:pr-4 space-y-1">
                    <span className="text-[10px] font-mono text-zinc-400 font-semibold block">ターゲット顧客群:</span>
                    <p className="text-zinc-300 font-normal line-clamp-2">{col.moneyFlow.victimOrBuyer}</p>
                  </div>
                  <div className="py-2 md:py-0 md:px-4 space-y-1">
                    <span className="text-[10px] font-mono text-zinc-400 font-semibold block">課金・収益化メカニズム:</span>
                    <p className="text-zinc-300 font-normal line-clamp-2">{col.moneyFlow.profitTrap}</p>
                  </div>
                  <div className="py-2 md:py-0 md:pl-4 space-y-1">
                    <span className="text-[10px] font-mono text-zinc-400 font-semibold block">資料内の参考値 · 未照合:</span>
                    <p className="text-zinc-200 font-medium font-mono text-sm">{col.moneyFlow.takeHomeRate}</p>
                  </div>
                </div>

                {/* 該当実在ビジネス台帳 */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-zinc-300 uppercase">
                      関連付けられた企業
                    </span>
                    <span className="text-[11px] font-mono text-zinc-400">
                      {related.length}社を登録
                    </span>
                  </div>

                  <div className="border border-white/[0.08] rounded divide-y divide-white/[0.04] overflow-hidden bg-[#090C10]">
                    {related.map((c) => (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => onSelectCompany(c.id)}
                        className="w-full p-3.5 text-left hover:bg-white/[0.03] transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-zinc-300"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <CompanyLogo name={c.name} size="sm" category={c.category} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs sm:text-sm text-zinc-100 group-hover:text-emerald-400 transition-colors">
                                {c.japaneseName}
                              </span>
                              <span className="text-[10px] font-mono text-zinc-400 bg-white/[0.06] px-1.5 py-0.5 rounded border border-white/[0.06]">
                                {c.teamSize === 1 ? '完全1人' : `${c.teamSize}名`}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-400 truncate mt-0.5">
                              {c.tagline}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 font-mono text-xs">
                          <div className="text-right">
                            <span className="text-[10px] text-zinc-400 block font-sans">純利益率</span>
                            <span className="text-zinc-200 font-medium tabular-nums">
                              {c.financials[c.financials.length - 1]?.operatingMarginPercent != null
                                ? `${Math.round(c.financials[c.financials.length - 1].operatingMarginPercent)}% · 未照合`
                                : '未登録'}
                            </span>
                          </div>
                          <span className="text-xs font-mono text-emerald-400 font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                            <span>台帳</span>
                            <span>→</span>
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
