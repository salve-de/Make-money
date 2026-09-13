'use client';

import React, { useState } from 'react';
import { CompanyRecord } from '../../types/terminal';
import { Copy, Check, Lock, Zap, Target, Key, Terminal as TerminalIcon } from 'lucide-react';

interface PlaybookInspectorProps {
  company: CompanyRecord;
  onOpenProModal: () => void;
}

export const PlaybookInspector: React.FC<PlaybookInspectorProps> = ({
  company,
  onOpenProModal
}) => {
  const [copied, setCopied] = useState(false);

  // 1. 突いた業界のバグ（盲点・歪み）
  const marketGlitch = company.successStory?.marketGlitch ||
    company.entryStrategy?.whyIncumbentCantWin ||
    company.proDossier?.incumbentBlindspot.whyGiantsCantEnter ||
    '既存プレイヤーが高額な導入費と長期契約を要求する中で、顧客の「今すぐ安く試したい」需要が放置されていた構造的盲点。';

  const corePsychologicalTrigger = company.proDossier?.monetizationTrick.corePsychologicalTrigger ||
    '顧客が抱える「競合より優位に立ちたい見栄」または「業務停止・機会損失の恐怖」に直結させ、対価の支払いを正当化。';

  // 2. 最初の100人を集めた泥臭い初動導線
  const initialTraction = company.initialTractionStrategy ||
    company.first100CustomersStrategy?.tacticalChannel ||
    'ターゲット層が密集する専門コミュニティやSNS上で、無料ベータ版の即時提供とBuild in Publicによる泥臭い直接アウトリーチ。';

  // 3. 今夜使える実務アセット（営業文面・告知ポスト）
  const outreachAsset = company.playbook?.copyPasteScript ||
    company.first100CustomersStrategy?.exactAction ||
    `【検証】${company.japaneseName}型の収益モデルを検証中。\n\n既存サービスの高額な月額費用を90%削減し、必要な機能のみを即日納品します。\n先着3社限定で初月無料で導入可能です。ご興味ある方はDMにて。`;

  // 4. スイッチングコスト（解約抑止の罠）
  const switchingTrap = company.switchingCostTrap?.hostageData ||
    '過去の業務ログ、生成資産、連携API設定が当システム上に蓄積されており、他社ツールへの移行コストが極めて高い。';

  const handleCopyAsset = () => {
    navigator.clipboard.writeText(outreachAsset);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-80 lg:w-92 bg-[#0D1117] border-l border-white/[0.08] flex flex-col h-full shrink-0 select-none overflow-hidden font-sans">
      {/* ヘッダー */}
      <div className="p-3.5 bg-[#12161F] border-b border-white/[0.08] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-emerald-400"></span>
          <span className="font-mono text-xs font-bold text-zinc-100 uppercase tracking-wider">
            PLAYBOOK INSPECTOR
          </span>
        </div>
        <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/70 px-2 py-0.5 border border-emerald-800/60">
          ズル（手口）解剖
        </span>
      </div>

      {/* スクロール本文 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs text-zinc-300">
        {/* 対象企業インジケーター */}
        <div className="p-2.5 bg-black/40 border border-white/[0.06] rounded flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-[10px] font-mono text-zinc-500 uppercase font-semibold">TARGET DOSSIER</div>
            <div className="text-xs font-bold text-white truncate">{company.japaneseName}</div>
          </div>
          <span className="text-[10px] font-mono text-zinc-400 px-1.5 py-0.5 bg-white/[0.04] border border-white/[0.08] shrink-0">
            {company.businessModel}
          </span>
        </div>

        {/* 01. 突いた業界のバグ（盲点） */}
        <section className="space-y-2">
          <div className="flex items-center gap-1.5 text-zinc-200 font-mono text-[11px] font-bold uppercase tracking-wider">
            <Zap size={13} className="text-emerald-400" />
            <span>01 突いた業界の盲点・バグ</span>
          </div>
          <div className="p-3 bg-[#0F131C] border border-white/[0.06] rounded space-y-2 leading-relaxed text-zinc-300">
            <p className="text-xs">{marketGlitch}</p>
            <div className="pt-2 border-t border-white/[0.06] text-[11px] text-zinc-400">
              <span className="font-mono text-emerald-400 font-bold">急所: </span>
              {corePsychologicalTrigger}
            </div>
          </div>
        </section>

        {/* 02. 初動突破の手口 */}
        <section className="space-y-2">
          <div className="flex items-center gap-1.5 text-zinc-200 font-mono text-[11px] font-bold uppercase tracking-wider">
            <Target size={13} className="text-emerald-400" />
            <span>02 最初の100人を集めた泥臭い手口</span>
          </div>
          <div className="p-3 bg-[#0F131C] border border-white/[0.06] rounded leading-relaxed text-zinc-300 text-xs">
            {initialTraction}
          </div>
        </section>

        {/* 03. 今夜使える実務アセット（コピペ営業文面） */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-zinc-200 font-mono text-[11px] font-bold uppercase tracking-wider">
              <TerminalIcon size={13} className="text-emerald-400" />
              <span>03 今夜使える実務アセット</span>
            </div>
            <button
              type="button"
              onClick={handleCopyAsset}
              className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 border border-white/[0.1] transition-colors cursor-pointer"
            >
              {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
              <span>{copied ? 'コピー完了' : '文面コピー'}</span>
            </button>
          </div>
          <div className="p-3 bg-black/60 border border-white/[0.08] rounded font-mono text-[11px] text-zinc-300 leading-relaxed whitespace-pre-wrap selection:bg-emerald-900 selection:text-emerald-200">
            {outreachAsset}
          </div>
        </section>

        {/* 04. 解約抑止の罠（スイッチングコスト） */}
        <section className="space-y-2">
          <div className="flex items-center gap-1.5 text-zinc-200 font-mono text-[11px] font-bold uppercase tracking-wider">
            <Key size={13} className="text-emerald-400" />
            <span>04 解約不能化（スイッチングコスト）</span>
          </div>
          <div className="p-3 bg-[#0F131C] border border-white/[0.06] rounded text-xs leading-relaxed text-zinc-300">
            {switchingTrap}
          </div>
        </section>

        {/* 05. PRO限定非公開ドシエ枠 */}
        <div className="p-3.5 bg-gradient-to-b from-[#141822] to-[#0A0D13] border border-amber-500/30 rounded space-y-2.5">
          <div className="flex items-center gap-1.5 text-amber-400 font-mono text-[11px] font-bold">
            <Lock size={12} />
            <span>PRO UNLOCK: 詳細監査データ</span>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Stripe生売上明細、推論APIのプロンプト全文、および税務申告書ベースの経費内訳CSVを出力します。
          </p>
          <button
            type="button"
            onClick={onOpenProModal}
            className="w-full h-7 bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-mono font-bold rounded flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <span>非公開データを解放する</span>
          </button>
        </div>
      </div>
    </div>
  );
};
