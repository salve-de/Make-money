'use client';

import React from 'react';
import { CompanyRecord } from '@/types/terminal';
import { DOSSIER_COLLECTIONS } from '@/data/portalDossiers';
import { CompanyLogo } from '@/components/terminal/CompanyLogo';

interface CollectionDetailViewProps {
  collectionId: string;
  companies: CompanyRecord[];
  onSelectCompany: (id: string) => void;
  onBackToCollectionsList: () => void;
  onBackToPortal: () => void;
}

export const CollectionDetailView: React.FC<CollectionDetailViewProps> = ({
  collectionId,
  companies,
  onSelectCompany,
  onBackToCollectionsList,
  onBackToPortal,
}) => {
  const data = DOSSIER_COLLECTIONS[collectionId] || DOSSIER_COLLECTIONS['collection-passive'];
  const relatedCompanies = companies.filter((c) => data.relatedCompanyIds.includes(c.id));

  return (
    <div className="flex-1 bg-slate-50 overflow-y-auto font-sans text-slate-900">
      {/* 上部パンくず＆ヘッダー */}
      <div className="border-b border-slate-200 bg-white px-6 py-8 shadow-xs">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-500 flex-wrap">
            <button
              onClick={onBackToPortal}
              className="hover:text-slate-900 transition-colors font-semibold"
            >
              ポータル・トップ
            </button>
            <span className="text-slate-300">/</span>
            <button
              onClick={onBackToCollectionsList}
              className="hover:text-slate-900 transition-colors font-semibold"
            >
              大特集コレクション一覧
            </button>
            <span className="text-slate-300">/</span>
            <span className="text-slate-700 font-semibold">{data.title}</span>
          </div>

          <div className="space-y-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {data.badge}
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
              {data.title}
            </h1>
            <p className="text-sm text-slate-600 font-medium">
              {data.subtitle}
            </p>
          </div>
        </div>
      </div>

      {/* メイン詳細コンテンツ */}
      <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        {/* リード文 */}
        <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="text-[10px] font-mono text-indigo-700 font-bold uppercase tracking-wider">
            調査主旨・概要
          </div>
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal">
            {data.leadParagraph}
          </p>
        </div>

        {/* 1. なぜ今このモデルが猛烈に儲かるのか */}
        <div className="space-y-3">
          <div className="border-b border-slate-200 pb-2">
            <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">MARKET GLITCH</span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              1. なぜ今、このモデルが猛烈に儲かるのか？（市場の歪み）
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {data.whyNow.map((item, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-1.5">
                <div className="text-[10px] font-mono text-indigo-600 font-bold">理由 0{idx + 1}</div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">{item.heading}</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-normal">{item.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 2. 収益発生メカニズム */}
        <div className="space-y-3">
          <div className="border-b border-slate-200 pb-2">
            <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">MONEY FLOW ANATOMY</span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              2. 収益発生メカニズム（顧客提供価値とキャッシュフロー構造）
            </h2>
          </div>
          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
            <div className="space-y-1">
              <span className="text-slate-500 text-[10px] block">① 対象顧客セグメント:</span>
              <p className="text-slate-800 font-sans text-xs font-normal">{data.moneyFlow.victimOrBuyer}</p>
            </div>
            <div className="space-y-1">
              <span className="text-slate-500 text-[10px] block">② 初期フック（リード獲得オファー）:</span>
              <p className="text-slate-800 font-sans text-xs font-normal">{data.moneyFlow.bait}</p>
            </div>
            <div className="space-y-1">
              <span className="text-slate-500 text-[10px] block">③ 課金・収益化ポイント:</span>
              <p className="text-slate-800 font-sans text-xs font-normal">{data.moneyFlow.profitTrap}</p>
            </div>
            <div className="space-y-1 bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-200">
              <span className="text-emerald-800 font-bold text-[10px] block">④ 実効営業利益率:</span>
              <p className="text-emerald-700 font-bold font-sans text-sm">{data.moneyFlow.takeHomeRate}</p>
            </div>
          </div>
        </div>

        {/* 3. 参入ロードマップ */}
        <div className="space-y-3">
          <div className="border-b border-slate-200 pb-2">
            <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">ACTIONABLE PLAYBOOK</span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              3. 実務展開ロードマップ（参入3ステップ工程表）
            </h2>
          </div>
          <div className="space-y-3">
            {data.stepByStepPlaybook.map((step, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-start gap-3"
              >
                <span className="px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 font-mono text-[10px] font-bold shrink-0 self-start border border-indigo-200">
                  {step.phase}
                </span>
                <div className="space-y-1 min-w-0">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">{step.action}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed font-normal">{step.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. 中核ツールスタック */}
        <div className="space-y-3">
          <div className="border-b border-slate-200 pb-2">
            <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">TECH STACK</span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              4. 運用に使用されている中核ツールスタック
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {data.recommendedTools.map((t, idx) => (
              <div key={idx} className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-1">
                <div className="text-xs font-bold text-slate-900">{t.name}</div>
                <div className="text-[11px] text-slate-500 font-normal">{t.role}</div>
                <div className="text-[10px] font-mono text-slate-600 pt-1 border-t border-slate-100">
                  コスト: {t.cost}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 5. 関連する実在台帳ケーススタディ */}
        <div className="space-y-3 pt-2">
          <div className="border-b border-slate-200 pb-2">
            <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">VERIFIED CASE STUDIES</span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              5. この特集に該当する実在ビジネス台帳（クリックで詳細閲覧）
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {relatedCompanies.map((c) => (
              <div
                key={c.id}
                onClick={() => onSelectCompany(c.id)}
                className="p-4 rounded-xl bg-white hover:bg-slate-50/80 border border-slate-200 hover:border-indigo-300 hover:shadow-md cursor-pointer transition-all space-y-2.5 group"
              >
                <div className="flex items-center gap-3">
                  <CompanyLogo name={c.name} size="sm" category={c.category} />
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-xs text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                      {c.japaneseName}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400">
                      {c.teamSize === 1 ? '完全1人' : `${c.teamSize}名運営`}
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-indigo-600 font-semibold group-hover:translate-x-0.5 transition-transform">
                    詳細 →
                  </span>
                </div>
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed font-normal">
                  {c.tagline}
                </p>
                <div className="text-[11px] font-mono text-emerald-700 font-bold pt-1.5 border-t border-slate-100">
                  月商: ¥{((c.passbookDetails?.monthlyGrossJpy || 10000000) / 10000).toLocaleString()}万円
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
