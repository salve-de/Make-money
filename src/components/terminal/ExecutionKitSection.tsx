'use client';

import React, { useState } from 'react';
import { CompanyRecord } from '@/types/terminal';

interface ExecutionKitSectionProps {
  company: CompanyRecord;
  onOpenProModal: () => void;
}

export const ExecutionKitSection: React.FC<ExecutionKitSectionProps> = ({
  company,
  onOpenProModal,
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
      <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[10px] font-bold border border-zinc-700">
            EXECUTION ARSENAL
          </span>
          <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
            実弾兵器庫：明日からパクるための「コピペ実行キット」
          </h2>
        </div>
        <span className="text-[11px] font-mono text-zinc-500">
          ※ 即座にクリップボードにコピーして実戦投入可能
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 font-sans">
        
        {/* 実弾①: 顧客獲得コールドメール/DM文面 */}
        <div className="p-4 sm:p-5 rounded-lg bg-[#0E1015] border border-zinc-800 space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                実弾 ASSET 01: 顧客獲得コールドDM
              </span>
              <span className="text-[10px] font-mono text-emerald-400 font-bold">無料公開枠</span>
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-white">
              初期顧客を広告費ゼロで強奪した「直談判アプローチ文面」
            </h3>
            <p className="text-xs text-zinc-400 font-normal leading-relaxed">
              このビジネスが最初の3人〜10人の有料顧客を獲得した際に使用された、返信率18%超のコールドメール骨子。
            </p>

            <div className="p-3 bg-zinc-950 rounded border border-zinc-800/80 font-mono text-[11px] text-zinc-300 leading-relaxed max-h-40 overflow-y-auto whitespace-pre-wrap">
              {coldMessageScript}
            </div>
          </div>

          <button
            onClick={() => handleCopy(coldMessageScript, 'COLD_MESSAGE')}
            className="w-full py-2 px-3 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-mono font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <span>{copiedType === 'COLD_MESSAGE' ? '✓ コピー完了' : 'この文面を1クリックでコピー'}</span>
          </button>
        </div>

        {/* 実弾②: Cursor / LLM初期開発プロンプト */}
        <div className="p-4 sm:p-5 rounded-lg bg-[#0E1015] border border-zinc-800 space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                実弾 ASSET 02: 初期MVP開発プロンプト
              </span>
              <span className="text-[10px] font-mono text-emerald-400 font-bold">無料公開枠</span>
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-white">
              CursorやClaudeに投げて一撃で骨組みを組ませる「特化プロンプト」
            </h3>
            <p className="text-xs text-zinc-400 font-normal leading-relaxed">
              自力でコードを書かず、AIにこのビジネスの最小限の集金画面・決済連動を自動生成させるための指示書。
            </p>

            <div className="p-3 bg-zinc-950 rounded border border-zinc-800/80 font-mono text-[11px] text-zinc-300 leading-relaxed max-h-40 overflow-y-auto whitespace-pre-wrap">
              {aiPromptScript}
            </div>
          </div>

          <button
            onClick={() => handleCopy(aiPromptScript, 'AI_PROMPT')}
            className="w-full py-2 px-3 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-mono font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <span>{copiedType === 'AI_PROMPT' ? '✓ コピー完了' : 'プロンプトを1クリックでコピー'}</span>
          </button>
        </div>

      </div>

      {/* PRO限定実弾枠（秘伝のタレ：すりガラス＋PRO課金CTA） */}
      <div className="relative p-5 sm:p-6 rounded-lg bg-[#111319] border border-zinc-700 font-sans space-y-3 overflow-hidden shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
              PRO EXCLUSIVE ASSETS
            </span>
            <span className="text-xs font-bold text-white">
              秘伝のタレ：非公開の生データ・契約書ひな形・実戦プロンプト完全版
            </span>
          </div>
          <span className="text-[10px] font-mono text-zinc-400">
            月額 ¥3,980 で全件解放
          </span>
        </div>

        {/* すりガラスプレビュー */}
        <div className="relative py-2 select-none">
          <div className="filter blur-[3.5px] opacity-30 text-zinc-400 font-mono text-xs leading-relaxed space-y-1">
            <p>1. 【成約率42%】クライアントの警戒心を1秒で解く秘密の保証条項（返金・成果連動ひな形契約書）</p>
            <p>2. 【APIコストを1/10に抑える】Replicate/OpenAI推論キャッシュの特殊プロキシ設定コード</p>
            <p>3. 【Stripe凍結回避】物販・デジタルプロダクトでカード会社のチャージバックを防ぐ特定商取引法テンプレート</p>
            <p>4. 【全22社 生損益計算書 CSV】エクセルで自由に編集できる財務レントゲン生データ全頭一覧</p>
          </div>

          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <span className="text-xs font-mono font-bold text-amber-300 flex items-center gap-1.5 bg-black/80 px-3 py-1 rounded border border-amber-500/40">
              <span>🔒</span>
              <span>PRO会員限定：門外不出の実弾資産が保護されています</span>
            </span>
          </div>
        </div>

        {/* PRO CTAボタン */}
        <div className="pt-3 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-zinc-400 text-center sm:text-left">
            実弾キットを1つコピーして案件を獲得すれば、初月で年間費用の何倍もの元が取れます。
          </p>
          <button
            onClick={onOpenProModal}
            className="h-9 px-5 rounded-md bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shrink-0 shadow-md cursor-pointer"
          >
            <span>月額¥3,980で実弾キットを即時コピーする</span>
            <span>→</span>
          </button>
        </div>
      </div>
    </section>
  );
};
