'use client';

import React from 'react';
import { CompanyRecord } from '../../../types/terminal';
import { DOSSIER_COLLECTIONS, DossierData } from '../../../data/portalDossiers';

interface DossierModalProps {
  dossierId: string | null;
  onClose: () => void;
  companies: CompanyRecord[];
  onSelectCompany: (id: string) => void;
}

export const DossierModal: React.FC<DossierModalProps> = ({
  dossierId,
  onClose,
  companies,
  onSelectCompany,
}) => {
  if (!dossierId || !DOSSIER_COLLECTIONS[dossierId]) return null;

  const data = DOSSIER_COLLECTIONS[dossierId];
  const relatedCompanies = companies.filter((c) => data.relatedCompanyIds.includes(c.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#0E1015] border border-zinc-800 rounded-lg shadow-2xl flex flex-col overflow-hidden text-zinc-100">
        
        {/* ヘッダー */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 bg-[#12141A] flex items-center justify-between shrink-0">
          <div className="space-y-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
              {data.badge}
            </span>
            <h2 className="text-base sm:text-xl font-bold text-white leading-tight">
              {data.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center text-sm font-mono transition-colors"
          >
            ✕
          </button>
        </div>

        {/* スクロールコンテンツ */}
        <div className="p-5 sm:p-7 overflow-y-auto space-y-6 font-sans">
          
          {/* リード文 */}
          <div className="p-4 rounded-md bg-zinc-900/60 border border-zinc-800/80 space-y-1.5">
            <div className="text-[10px] font-mono text-zinc-400 font-bold uppercase tracking-wider">
              調査主旨・概要
            </div>
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-normal">
              {data.leadParagraph}
            </p>
          </div>

          {/* 1. なぜ今このモデルが猛烈に儲かるのか */}
          <section className="space-y-3">
            <div className="border-b border-zinc-800 pb-2">
              <span className="text-[10px] font-mono text-zinc-400 font-bold uppercase">MARKET ARBITRAGE</span>
              <h3 className="text-sm sm:text-base font-bold text-white">
                1. なぜ今、この構造が極めて高い利ざやを生むのか（市場の価格差・構造的機会）
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {data.whyNow.map((item, idx) => (
                <div key={idx} className="p-3.5 rounded-md bg-zinc-900/60 border border-zinc-800/60 space-y-1.5">
                  <div className="text-[10px] font-mono text-zinc-400 font-bold">要点 0{idx + 1}</div>
                  <h4 className="text-xs sm:text-sm font-bold text-white leading-snug">{item.heading}</h4>
                  <p className="text-xs text-zinc-400 leading-relaxed font-normal">{item.description}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 2. 収益化メカニズム・マネーフローの構造 */}
          <section className="space-y-3">
            <div className="border-b border-zinc-800 pb-2">
              <span className="text-[10px] font-mono text-zinc-400 font-bold uppercase">MONEY FLOW ARCHITECTURE</span>
              <h3 className="text-sm sm:text-base font-bold text-white">
                2. 収益化メカニズム・資金移動の構造（顧客の対価支払動機と利ざや）
              </h3>
            </div>
            <div className="p-4 rounded-md bg-zinc-900/60 border border-zinc-800/80 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
              <div className="space-y-1">
                <span className="text-zinc-500 text-[10px]">① ターゲット顧客層・需要主体:</span>
                <p className="text-zinc-200 font-sans text-xs">{data.moneyFlow.victimOrBuyer}</p>
              </div>
              <div className="space-y-1">
                <span className="text-zinc-500 text-[10px]">② 提供価値・初期接点（プロダクト）:</span>
                <p className="text-zinc-200 font-sans text-xs">{data.moneyFlow.bait}</p>
              </div>
              <div className="space-y-1">
                <span className="text-zinc-500 text-[10px]">③ 課金・収益化メカニズム:</span>
                <p className="text-zinc-200 font-sans text-xs">{data.moneyFlow.profitTrap}</p>
              </div>
              <div className="space-y-1">
                <span className="text-zinc-400 font-bold text-[10px]">④ 実効手残り率（純利益率）:</span>
                <p className="text-zinc-100 font-bold font-sans text-xs">{data.moneyFlow.takeHomeRate}</p>
              </div>
            </div>
          </section>

          {/* 3. 事業展開ロードマップ */}
          <section className="space-y-3">
            <div className="border-b border-zinc-800 pb-2">
              <span className="text-[10px] font-mono text-zinc-400 font-bold uppercase">EXECUTION ROADMAP</span>
              <h3 className="text-sm sm:text-base font-bold text-white">
                3. 事業展開ロードマップ（実践3フェーズ）
              </h3>
            </div>
            <div className="space-y-2.5">
              {data.stepByStepPlaybook.map((step, idx) => (
                <div key={idx} className="p-3.5 rounded-md bg-zinc-900/60 border border-zinc-800/60 flex flex-col sm:flex-row sm:items-start gap-3">
                  <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 text-[10px] font-mono font-bold shrink-0">
                    {step.phase}
                  </span>
                  <div className="space-y-1 min-w-0">
                    <h4 className="text-xs sm:text-sm font-bold text-white">{step.action}</h4>
                    <p className="text-xs text-zinc-400 leading-relaxed font-normal">{step.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 4. 活用テクノロジー・インフラスタック */}
          <section className="space-y-3">
            <div className="border-b border-zinc-800 pb-2">
              <span className="text-[10px] font-mono text-zinc-400 font-bold uppercase">TECHNOLOGY STACK</span>
              <h3 className="text-sm sm:text-base font-bold text-white">
                4. 活用テクノロジー・インフラスタック
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {data.recommendedTools.map((t, idx) => (
                <div key={idx} className="p-3 rounded-md bg-zinc-900/60 border border-zinc-800/60 space-y-1">
                  <div className="text-xs font-bold text-white">{t.name}</div>
                  <div className="text-[11px] text-zinc-400 font-normal">{t.role}</div>
                  <div className="text-[10px] font-mono text-zinc-300 font-medium pt-1 border-t border-zinc-800/60">
                    コスト: {t.cost}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 5. 当該モデル該当企業・実践台帳ケーススタディ */}
          <section className="space-y-3">
            <div className="border-b border-zinc-800 pb-2">
              <span className="text-[10px] font-mono text-zinc-400 font-bold uppercase">VERIFIED CASE STUDIES</span>
              <h3 className="text-sm sm:text-base font-bold text-white">
                5. 当該モデル該当企業・実践台帳ケーススタディ（クリックで詳細閲覧）
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {relatedCompanies.map((c) => (
                <div
                  key={c.id}
                  onClick={() => {
                    onClose();
                    onSelectCompany(c.id);
                  }}
                  className="p-3.5 rounded-md bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800/60 hover:border-zinc-700 cursor-pointer transition-all space-y-1.5 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white group-hover:text-zinc-200 transition-colors">
                      {c.japaneseName}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400 group-hover:text-white">
                      詳細 →
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed font-normal">
                    {c.tagline}
                  </p>
                  <div className="text-[10px] font-mono text-zinc-500 pt-1 border-t border-zinc-800/60">
                    月商: ¥{((c.passbookDetails?.monthlyGrossJpy || 10000000) / 10000).toLocaleString()}万円
                  </div>
                </div>
              ))}
            </div>
          </section>

        </div>

        {/* フッター */}
        <div className="p-3.5 sm:p-4 border-t border-zinc-800 bg-[#12141A] flex items-center justify-between shrink-0">
          <span className="text-xs font-mono text-zinc-500">
            ※ 実在データ・公開推計に基づく独自調査レポート
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-white font-medium text-xs transition-colors"
          >
            閉じる
          </button>
        </div>

      </div>
    </div>
  );
};
