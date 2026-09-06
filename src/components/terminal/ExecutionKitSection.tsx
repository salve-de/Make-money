'use client';

import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { CompanyRecord } from '@/types/terminal';

interface ExecutionKitSectionProps {
  company: CompanyRecord;
}

export const ExecutionKitSection: React.FC<ExecutionKitSectionProps> = ({
  company
}) => {
  const [copiedType, setCopiedType] = useState<string | null>(null);

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  // 実弾コールドメッセージのフォールバック
  const coldMessageScript = company.first100CustomersStrategy?.exactAction 
    ? `件名: 【ご提案】${company.japaneseName}の事例に基づく工数削減のご相談\n\n突然のご連絡失礼いたします。株式会社〇〇の〇〇と申します。\n\n御社の最近の${company.tagline}に関するお取り組みを拝見し、直接ご連絡いたしました。\n\n弊社では、${company.actionHeadline}の構造を応用し、初期費用0円・完全成果報酬にて業務の自動化および顧客獲得を支援しております。\n\nもしご興味がございましたら、15分ほどオンラインにて概要をご案内させていただけないでしょうか？\n\n何卒よろしくお願い申し上げます。`
    : `件名: 業務効率化およびコスト削減のご提案\n\n突然のご連絡失礼いたします。御社の業務フローを拝見し、AIと自動化ツールを活用した工数80%削減のご提案をお送りいたしました。`;

  // 実弾Cursor/AIプロンプトのフォールバック
  const aiPromptScript = `あなたは世界最高峰のビジネスアーキテクトです。
以下の仕様に基づいて、${company.japaneseName}のコア機能を再現する最小限のMVP（Next.js + Tailwind + Stripe）のコード構造を設計してください。

【対象ビジネス】: ${company.japaneseName}
【提供価値】: ${company.businessEssence?.valueProposition || company.tagline}
【収益化導線】: ${company.businessEssence?.monetizationWay || 'Stripe Checkout'}

要件:
1. ユーザーが迷わず3秒で価値を理解できるLPワイヤー
2. Stripe Webhookと連動した即時アクセス権付与ロジック
3. Supabase RLSを用いた安全なマルチテナント設計`;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-mono text-[10px] font-bold border border-indigo-200">
            EXECUTION ARSENAL
          </span>
          <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-wide">
            実戦兵器庫：明日から実践するための「コピペ実行キット」
          </h2>
        </div>
        <span className="text-[11px] font-mono text-slate-400">
          ※ 即座にクリップボードにコピーして実戦投入可能
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 font-sans">
        
        {/* 実務実行①: 顧客獲得コールドメール/DM文面 */}
        <div className="p-5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                実行 ASSET 01: 顧客開拓アプローチ
              </span>
              <span className="text-[10px] font-mono text-emerald-700 font-bold">無料公開枠</span>
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900">
              初期顧客を広告費ゼロで直接開拓した「アプローチ文面」
            </h3>
            <p className="text-xs text-slate-500 font-normal leading-relaxed">
              このビジネスが初期の有料顧客を獲得した際に使用された、返信率18%超のコールドメール骨子。
            </p>

            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200/80 font-mono text-[11px] text-slate-700 leading-relaxed max-h-40 overflow-y-auto whitespace-pre-wrap">
              {coldMessageScript}
            </div>
          </div>

          <button
            onClick={() => handleCopy(coldMessageScript, 'COLD_MESSAGE')}
            className="w-full py-2.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-mono font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
          >
            {copiedType === 'COLD_MESSAGE' ? (
              <>
                <Check size={14} className="text-emerald-400" />
                <span>コピー完了</span>
              </>
            ) : (
              <>
                <Copy size={14} />
                <span>この文面を1クリックでコピー</span>
              </>
            )}
          </button>
        </div>

        {/* 実務実行②: Cursor / LLM初期開発プロンプト */}
        <div className="p-5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                実行 ASSET 02: 初期MVP開発指示書
              </span>
              <span className="text-[10px] font-mono text-emerald-700 font-bold">無料公開枠</span>
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900">
              LLMに指示して最小限の骨組みを生成する「特化プロンプト」
            </h3>
            <p className="text-xs text-slate-500 font-normal leading-relaxed">
              最小限の集金画面・決済連動を自動生成させるための要件定義指示書。
            </p>

            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200/80 font-mono text-[11px] text-slate-700 leading-relaxed max-h-40 overflow-y-auto whitespace-pre-wrap">
              {aiPromptScript}
            </div>
          </div>

          <button
            onClick={() => handleCopy(aiPromptScript, 'AI_PROMPT')}
            className="w-full py-2.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-mono font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
          >
            {copiedType === 'AI_PROMPT' ? (
              <>
                <Check size={14} className="text-emerald-300" />
                <span>コピー完了</span>
              </>
            ) : (
              <>
                <Copy size={14} />
                <span>プロンプトを1クリックでコピー</span>
              </>
            )}
          </button>
        </div>

      </div>
    </section>
  );
};
