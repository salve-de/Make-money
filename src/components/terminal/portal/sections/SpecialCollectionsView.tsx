'use client';

import React from 'react';
import { CompanyRecord } from '@/types/terminal';
import { DOSSIER_COLLECTIONS } from '@/data/portalDossiers';

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
    <div className="flex-1 bg-[#090A0D] overflow-y-auto font-sans text-zinc-100">
      {/* 上部パンくず＆ヘッダー */}
      <div className="border-b border-zinc-800/80 bg-[#0D0E12] px-6 py-8">
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
            <button
              onClick={onBackToPortal}
              className="hover:text-white transition-colors flex items-center gap-1"
            >
              <span>←</span>
              <span>ポータル・トップに戻る</span>
            </button>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-300 font-medium">大特集コレクション</span>
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
              SPECIAL DOSSIER ARCHIVE
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              大特集：あいつらの「手口」を丸裸にする3大コレクション
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-3xl leading-relaxed font-normal">
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
                className="p-6 sm:p-8 rounded-lg bg-[#0E1015] border border-zinc-800 space-y-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-zinc-800/80 pb-5">
                  <div className="space-y-2 max-w-2xl">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
                        COLLECTION 0{idx + 1}
                      </span>
                      <span className="text-xs font-mono text-zinc-500">
                        {col.badge}
                      </span>
                    </div>
                    <h2 className="text-lg sm:text-xl font-bold text-white leading-snug">
                      {col.title}
                    </h2>
                    <p className="text-xs sm:text-sm text-zinc-400 font-normal leading-relaxed">
                      {col.leadParagraph}
                    </p>
                  </div>

                  <button
                    onClick={() => onOpenDossier(col.id)}
                    className="h-9 px-4 rounded-md bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shrink-0 shadow-sm"
                  >
                    <span>深掘りレポートを開く</span>
                    <span>→</span>
                  </button>
                </div>

                {/* 構造分析概要プレビュー */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3.5 rounded-md bg-zinc-900/60 border border-zinc-800/60 space-y-1">
                    <span className="text-[10px] font-mono text-zinc-500 block">ターゲット顧客群:</span>
                    <p className="text-zinc-300 font-normal line-clamp-2">{col.moneyFlow.victimOrBuyer}</p>
                  </div>
                  <div className="p-3.5 rounded-md bg-zinc-900/60 border border-zinc-800/60 space-y-1">
                    <span className="text-[10px] font-mono text-zinc-500 block">課金・収益化メカニズム:</span>
                    <p className="text-zinc-300 font-normal line-clamp-2">{col.moneyFlow.profitTrap}</p>
                  </div>
                  <div className="p-3.5 rounded-md bg-zinc-900/60 border border-zinc-800/60 space-y-1">
                    <span className="text-[10px] font-mono text-zinc-400 font-bold block">実効手残り率:</span>
                    <p className="text-zinc-200 font-bold font-mono">{col.moneyFlow.takeHomeRate}</p>
                  </div>
                </div>

                {/* 該当実在ビジネス台帳 */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-zinc-400 uppercase">
                      該当実在ビジネス事例（クリックで損益計算書・詳細台帳へ）
                    </span>
                    <span className="text-[11px] font-mono text-zinc-500">
                      計{related.length}社 収録
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {related.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => onSelectCompany(c.id)}
                        className="p-3.5 rounded-md bg-zinc-900/40 hover:bg-zinc-800/80 border border-zinc-800/60 hover:border-zinc-700 transition-all cursor-pointer space-y-2 group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-white group-hover:text-zinc-200 transition-colors">
                            {c.japaneseName}
                          </span>
                          <span className="text-[10px] font-mono text-zinc-400 group-hover:text-white">
                            台帳 →
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 line-clamp-2 font-normal">
                          {c.tagline}
                        </p>
                        <div className="pt-1.5 border-t border-zinc-800/60 flex items-center justify-between text-[11px] font-mono">
                          <span className="text-zinc-500">
                            {c.teamSize === 1 ? '完全1人' : `${c.teamSize}名運営`}
                          </span>
                          <span className="text-zinc-300 font-bold">
                            純利{c.financials[c.financials.length - 1]?.operatingMarginPercent ? Math.round(c.financials[c.financials.length - 1].operatingMarginPercent) : 80}%
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
