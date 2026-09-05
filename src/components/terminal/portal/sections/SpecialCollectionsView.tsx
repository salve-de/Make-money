'use client';

import React from 'react';
import { CompanyRecord } from '@/types/terminal';
import { DOSSIER_COLLECTIONS } from '@/data/portalDossiers';
import { CompanyLogo } from '@/components/terminal/CompanyLogo';
import { SparklineChart } from '@/components/terminal/SparklineChart';

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
    <div className="flex-1 bg-slate-50 overflow-y-auto font-sans text-slate-900">
      {/* 上部パンくず＆ヘッダー */}
      <div className="border-b border-slate-200 bg-white px-6 py-8 shadow-xs">
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
            <button
              onClick={onBackToPortal}
              className="hover:text-slate-900 transition-colors flex items-center gap-1 font-semibold"
            >
              <span>←</span>
              <span>ポータル・トップに戻る</span>
            </button>
            <span className="text-slate-300">/</span>
            <span className="text-slate-700 font-semibold">大特集コレクション</span>
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              SPECIAL DOSSIER ARCHIVE
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              大特集：あいつらの「手口」を丸裸にする3大コレクション
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-3xl leading-relaxed font-normal">
              世の中で莫大な利益を上げているプレイヤーの手口を「不労集金」「AI労働力搾取」「地方実業の歪み」の3つの型に体系化。
              各コレクションの詳細な市場の歪み、集金構造、行動手順書（Playbook）を完全公開。
            </p>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-10">
        <div className="grid grid-cols-1 gap-8">
          {collectionList.map((col, idx) => {
            const related = companies.filter((c) => col.relatedCompanyIds.includes(c.id));

            return (
              <div
                key={col.id}
                className="p-6 sm:p-8 rounded-xl bg-white border border-slate-200 shadow-sm space-y-6 hover:border-indigo-300 hover:shadow-md transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 pb-5">
                  <div className="flex items-start gap-4">
                    <CompanyLogo name={col.title} size="md" category={col.badge} />
                    <div className="space-y-2 max-w-2xl">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          COLLECTION 0{idx + 1}
                        </span>
                        <span className="text-xs font-mono text-slate-500 font-medium">
                          {col.badge}
                        </span>
                      </div>
                      <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
                        {col.title}
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-600 font-normal leading-relaxed">
                        {col.leadParagraph}
                      </p>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-3 shrink-0">
                    <SparklineChart trend="up" width={80} height={28} />
                    <button
                      onClick={() => onOpenDossier(col.id)}
                      className="h-9 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                    >
                      <span>深掘りレポートを開く</span>
                      <span>→</span>
                    </button>
                  </div>
                </div>

                {/* 構造分析概要プレビュー */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-[10px] font-mono text-slate-500 font-semibold block">ターゲット顧客群:</span>
                    <p className="text-slate-800 font-normal line-clamp-2">{col.moneyFlow.victimOrBuyer}</p>
                  </div>
                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-[10px] font-mono text-slate-500 font-semibold block">課金・収益化メカニズム:</span>
                    <p className="text-slate-800 font-normal line-clamp-2">{col.moneyFlow.profitTrap}</p>
                  </div>
                  <div className="p-3.5 rounded-lg bg-emerald-50/70 border border-emerald-200 space-y-1">
                    <span className="text-[10px] font-mono text-emerald-700 font-bold block">実効手残り率:</span>
                    <p className="text-emerald-700 font-bold font-mono text-sm">{col.moneyFlow.takeHomeRate}</p>
                  </div>
                </div>

                {/* 該当実在ビジネス台帳 */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-slate-700 uppercase">
                      該当実在ビジネス事例（クリックで損益計算書・詳細台帳へ）
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      計{related.length}社 収録
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-lg divide-y divide-slate-150 overflow-hidden bg-slate-50/50">
                    {related.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => onSelectCompany(c.id)}
                        className="p-3.5 hover:bg-white transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <CompanyLogo name={c.name} size="sm" category={c.category} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-indigo-600 transition-colors">
                                {c.japaneseName}
                              </span>
                              <span className="text-[10px] font-mono text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                                {c.teamSize === 1 ? '完全1人' : `${c.teamSize}名`}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 truncate mt-0.5">
                              {c.tagline}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 font-mono text-xs">
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block font-sans">純利益率</span>
                            <span className="text-emerald-700 font-bold tabular-nums">
                              {c.financials[c.financials.length - 1]?.operatingMarginPercent ? Math.round(c.financials[c.financials.length - 1].operatingMarginPercent) : 80}%
                            </span>
                          </div>
                          <span className="text-xs font-mono text-indigo-600 font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                            <span>台帳</span>
                            <span>→</span>
                          </span>
                        </div>
                      </div>
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
