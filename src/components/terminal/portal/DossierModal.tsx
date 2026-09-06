'use client';

import React from 'react';
import { X } from 'lucide-react';
import { CompanyRecord } from '../../../types/terminal';
import { DOSSIER_COLLECTIONS, DossierData } from '../../../data/portalDossiers';
import { CompanyLogo } from '../CompanyLogo';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-800">
        
        {/* ヘッダー */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between shrink-0">
          <div className="space-y-1">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {data.badge}
            </span>
            <h2 className="text-base sm:text-xl font-black text-slate-900 leading-tight">
              {data.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="閉じる"
          >
            <X size={15} />
          </button>
        </div>

        {/* スクロールコンテンツ */}
        <div className="p-5 sm:p-7 overflow-y-auto space-y-6 font-sans">
          
          {/* リード文 */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 shadow-2xs">
            <div className="text-[10px] font-mono text-slate-500 font-bold uppercase tracking-wider">
              調査主旨・概要
            </div>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal">
              {data.leadParagraph}
            </p>
          </div>

          {/* 1. なぜ今このモデルが猛烈に儲かるのか */}
          <section className="space-y-3">
            <div className="border-b border-slate-200 pb-2">
              <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">MARKET ARBITRAGE</span>
              <h3 className="text-sm sm:text-base font-black text-slate-900">
                1. なぜ今、この構造が極めて高い利ざやを生むのか（市場の価格差・構造的機会）
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {data.whyNow.map((item, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-1.5 shadow-2xs">
                  <div className="text-[10px] font-mono text-indigo-600 font-bold">要点 0{idx + 1}</div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">{item.heading}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed font-normal">{item.description}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 2. 収益化メカニズム・マネーフローの構造 */}
          <section className="space-y-3">
            <div className="border-b border-slate-200 pb-2">
              <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">MONEY FLOW ARCHITECTURE</span>
              <h3 className="text-sm sm:text-base font-black text-slate-900">
                2. 収益化メカニズム・資金移動の構造（顧客の対価支払動機と利ざや）
              </h3>
            </div>
            <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono shadow-2xs">
              <div className="space-y-1">
                <span className="text-slate-500 text-[10px] font-sans font-medium">① ターゲット顧客層・需要主体:</span>
                <p className="text-slate-800 font-sans text-xs font-medium">{data.moneyFlow.victimOrBuyer}</p>
              </div>
              <div className="space-y-1">
                <span className="text-slate-500 text-[10px] font-sans font-medium">② 提供価値・初期接点（プロダクト）:</span>
                <p className="text-slate-800 font-sans text-xs font-medium">{data.moneyFlow.bait}</p>
              </div>
              <div className="space-y-1">
                <span className="text-slate-500 text-[10px] font-sans font-medium">③ 課金・収益化メカニズム:</span>
                <p className="text-slate-800 font-sans text-xs font-medium">{data.moneyFlow.profitTrap}</p>
              </div>
              <div className="space-y-1">
                <span className="text-emerald-700 font-bold text-[10px] font-sans">④ 実効手残り率（純利益率）:</span>
                <p className="text-emerald-950 font-black font-sans text-xs">{data.moneyFlow.takeHomeRate}</p>
              </div>
            </div>
          </section>

          {/* 3. 事業展開ロードマップ */}
          <section className="space-y-3">
            <div className="border-b border-slate-200 pb-2">
              <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">EXECUTION ROADMAP</span>
              <h3 className="text-sm sm:text-base font-black text-slate-900">
                3. 事業展開ロードマップ（実践3フェーズ）
              </h3>
            </div>
            <div className="space-y-2.5">
              {data.stepByStepPlaybook.map((step, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 flex flex-col sm:flex-row sm:items-start gap-3 shadow-2xs">
                  <span className="px-2.5 py-0.5 rounded-md bg-indigo-100 text-indigo-800 border border-indigo-200 text-[10px] font-mono font-bold shrink-0">
                    {step.phase}
                  </span>
                  <div className="space-y-1 min-w-0">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900">{step.action}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed font-normal">{step.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 4. 活用テクノロジー・インフラスタック */}
          <section className="space-y-3">
            <div className="border-b border-slate-200 pb-2">
              <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">TECHNOLOGY STACK</span>
              <h3 className="text-sm sm:text-base font-black text-slate-900">
                4. 活用テクノロジー・インフラスタック
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {data.recommendedTools.map((t, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-1 shadow-2xs">
                  <div className="text-xs font-bold text-slate-900">{t.name}</div>
                  <div className="text-[11px] text-slate-500 font-normal">{t.role}</div>
                  <div className="text-[10px] font-mono text-slate-700 font-medium pt-1 border-t border-slate-200">
                    コスト: {t.cost}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 5. 当該モデル該当企業・実践台帳ケーススタディ */}
          <section className="space-y-3">
            <div className="border-b border-slate-200 pb-2">
              <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">VERIFIED CASE STUDIES</span>
              <h3 className="text-sm sm:text-base font-black text-slate-900">
                5. 当該モデル該当企業・実践台帳ケーススタディ
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
                  className="p-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 cursor-pointer transition-all space-y-2 shadow-2xs group"
                >
                  <div className="flex items-center gap-2.5">
                    <CompanyLogo company={c} size="sm" />
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-xs text-slate-900 group-hover:text-indigo-600 transition-colors block truncate">
                        {c.japaneseName}
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed font-normal">
                    {c.tagline}
                  </p>
                  <div className="text-[10px] font-mono text-emerald-700 font-bold pt-1.5 border-t border-slate-100 flex items-center justify-between">
                    <span>月商: ¥{((c.passbookDetails?.monthlyGrossJpy || 10000000) / 10000).toLocaleString()}万円</span>
                    <span className="text-indigo-600 group-hover:translate-x-0.5 transition-transform">詳細 →</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

        </div>

        {/* フッター */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between shrink-0">
          <span className="text-[11px] font-mono text-slate-400">
            調査分析レポート (RESEARCH DOSSIER)
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors shadow-2xs cursor-pointer"
          >
            閉じる
          </button>
        </div>

      </div>
    </div>
  );
};
