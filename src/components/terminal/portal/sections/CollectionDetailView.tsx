'use client';

import React from 'react';
import { CompanyRecord } from '@/types/terminal';
import { DOSSIER_COLLECTIONS } from '@/data/portalDossiers';

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
    <div className="flex-1 bg-[#090A0D] overflow-y-auto font-sans text-zinc-100">
      {/* 上部パンくず＆ヘッダー */}
      <div className="border-b border-zinc-800/80 bg-[#0D0E12] px-6 py-8">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 flex-wrap">
            <button
              onClick={onBackToPortal}
              className="hover:text-white transition-colors"
            >
              ポータル・トップ
            </button>
            <span className="text-zinc-600">/</span>
            <button
              onClick={onBackToCollectionsList}
              className="hover:text-white transition-colors"
            >
              大特集コレクション一覧
            </button>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-300 font-medium">{data.title}</span>
          </div>

          <div className="space-y-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
              {data.badge}
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight">
              {data.title}
            </h1>
            <p className="text-sm text-zinc-300 font-medium">
              {data.subtitle}
            </p>
          </div>
        </div>
      </div>

      {/* メイン詳細コンテンツ */}
      <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        {/* リード文 */}
        <div className="p-5 rounded-lg bg-[#0E1015] border border-zinc-800 space-y-2">
          <div className="text-[10px] font-mono text-zinc-400 font-bold uppercase tracking-wider">
            調査主旨・概要
          </div>
          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-normal">
            {data.leadParagraph}
          </p>
        </div>

        {/* 1. なぜ今このモデルが猛烈に儲かるのか */}
        <div className="space-y-3">
          <div className="border-b border-zinc-800 pb-2">
            <span className="text-[10px] font-mono text-zinc-400 font-bold uppercase">MARKET GLITCH</span>
            <h2 className="text-base sm:text-lg font-bold text-white">
              1. なぜ今、このモデルが猛烈に儲かるのか？（市場の歪み）
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {data.whyNow.map((item, idx) => (
              <div key={idx} className="p-4 rounded-lg bg-[#0E1015] border border-zinc-800 space-y-1.5">
                <div className="text-[10px] font-mono text-zinc-400 font-bold">理由 0{idx + 1}</div>
                <h3 className="text-xs sm:text-sm font-bold text-white leading-snug">{item.heading}</h3>
                <p className="text-xs text-zinc-400 leading-relaxed font-normal">{item.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 2. 生々しい集金のカラクリ */}
        <div className="space-y-3">
          <div className="border-b border-zinc-800 pb-2">
            <span className="text-[10px] font-mono text-zinc-400 font-bold uppercase">MONEY FLOW ANATOMY</span>
            <h2 className="text-base sm:text-lg font-bold text-white">
              2. 生々しい集金のカラクリ（誰の財布をどう開けるか）
            </h2>
          </div>
          <div className="p-5 rounded-lg bg-[#0E1015] border border-zinc-800 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
            <div className="space-y-1">
              <span className="text-zinc-500 text-[10px] block">① 狙われる獲物・客層:</span>
              <p className="text-zinc-200 font-sans text-xs font-normal">{data.moneyFlow.victimOrBuyer}</p>
            </div>
            <div className="space-y-1">
              <span className="text-zinc-500 text-[10px] block">② 食いつかせる撒き餌:</span>
              <p className="text-zinc-200 font-sans text-xs font-normal">{data.moneyFlow.bait}</p>
            </div>
            <div className="space-y-1">
              <span className="text-zinc-500 text-[10px] block">③ 集金の罠（課金のツボ）:</span>
              <p className="text-zinc-200 font-sans text-xs font-normal">{data.moneyFlow.profitTrap}</p>
            </div>
            <div className="space-y-1">
              <span className="text-zinc-400 font-bold text-[10px] block">④ 創業者純手取り率:</span>
              <p className="text-zinc-100 font-bold font-sans text-xs">{data.moneyFlow.takeHomeRate}</p>
            </div>
          </div>
        </div>

        {/* 3. 完コピ3ステップ行動手順書 */}
        <div className="space-y-3">
          <div className="border-b border-zinc-800 pb-2">
            <span className="text-[10px] font-mono text-zinc-400 font-bold uppercase">ACTIONABLE PLAYBOOK</span>
            <h2 className="text-base sm:text-lg font-bold text-white">
              3. もし明日から参入するなら？（完コピ3ステップ行動手順書）
            </h2>
          </div>
          <div className="space-y-3">
            {data.stepByStepPlaybook.map((step, idx) => (
              <div
                key={idx}
                className="p-4 rounded-lg bg-[#0E1015] border border-zinc-800 flex flex-col sm:flex-row sm:items-start gap-3"
              >
                <span className="px-2.5 py-1 rounded bg-zinc-800 text-zinc-300 font-mono text-[10px] font-bold shrink-0 self-start border border-zinc-700">
                  {step.phase}
                </span>
                <div className="space-y-1 min-w-0">
                  <h3 className="text-xs sm:text-sm font-bold text-white">{step.action}</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed font-normal">{step.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. 推奨武器・ツールスタック */}
        <div className="space-y-3">
          <div className="border-b border-zinc-800 pb-2">
            <span className="text-[10px] font-mono text-zinc-400 font-bold uppercase">TECH STACK & WEAPONS</span>
            <h2 className="text-base sm:text-lg font-bold text-white">
              4. 実際に使われている武器・ツールスタック
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {data.recommendedTools.map((t, idx) => (
              <div key={idx} className="p-3.5 rounded-lg bg-[#0E1015] border border-zinc-800 space-y-1">
                <div className="text-xs font-bold text-white">{t.name}</div>
                <div className="text-[11px] text-zinc-400 font-normal">{t.role}</div>
                <div className="text-[10px] font-mono text-zinc-300 pt-1 border-t border-zinc-800/60">
                  コスト: {t.cost}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 5. 関連する実在台帳ケーススタディ */}
        <div className="space-y-3 pt-2">
          <div className="border-b border-zinc-800 pb-2">
            <span className="text-[10px] font-mono text-zinc-400 font-bold uppercase">VERIFIED CASE STUDIES</span>
            <h2 className="text-base sm:text-lg font-bold text-white">
              5. この特集に該当する実在ビジネス台帳（クリックで詳細閲覧）
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {relatedCompanies.map((c) => (
              <div
                key={c.id}
                onClick={() => onSelectCompany(c.id)}
                className="p-4 rounded-lg bg-[#0E1015] hover:bg-[#13161F] border border-zinc-800 hover:border-zinc-700 cursor-pointer transition-all space-y-2 group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-white group-hover:text-zinc-200 transition-colors">
                    {c.japaneseName}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400 group-hover:text-white">
                    詳細 →
                  </span>
                </div>
                <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed font-normal">
                  {c.tagline}
                </p>
                <div className="text-[10px] font-mono text-zinc-500 pt-1.5 border-t border-zinc-800/60">
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
