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
  const [copyFailed, setCopyFailed] = useState(false);

  // 1. 突いた業界のバグ（盲点・歪み）
  const marketGlitch = company.successStory?.marketGlitch ||
    company.entryStrategy?.whyIncumbentCantWin ||
    company.proDossier?.incumbentBlindspot.whyGiantsCantEnter ||
    'この企業の市場背景は登録されていません。出典と観測時期を確認してください。';

  const corePsychologicalTrigger = company.proDossier?.monetizationTrick.corePsychologicalTrigger ||
    '購入のきっかけとなった顧客の心理は、資料から確認できていません。';

  // 2. 最初の100人を集めた泥臭い初動導線
  const initialTraction = company.initialTractionStrategy ||
    company.first100CustomersStrategy?.tacticalChannel ||
    '初期の顧客獲得経路は、資料から確認できていません。';

  // 3. 今夜使える実務アセット（営業文面・告知ポスト）
  const outreachAsset = company.playbook?.copyPasteScript ||
    company.first100CustomersStrategy?.exactAction ||
    `【送信前に事実を確認する編集用テンプレート】\n\n[相手の業種・役割]で、[資料や公開情報で確認した課題]を見かけました。\n[提供できる内容]について、[確認済みの条件・価格・期間]をご案内できます。\n必要でしたら、対象範囲を確認するために[具体的な質問]をお聞かせください。\n\n※角括弧の項目を事実で埋め、価格・成果・提供時期を確認してから送信してください。`;

  // 4. スイッチングコスト（解約抑止の罠）
  const switchingTrap = company.switchingCostTrap?.hostageData ||
    '顧客の継続理由や他サービスへの移行コストは、資料から確認できていません。';

  const handleCopyAsset = async () => {
    try {
      await navigator.clipboard.writeText(outreachAsset);
      setCopyFailed(false);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
      setCopyFailed(true);
    }
  };

  return (
    <div className="w-80 lg:w-92 bg-[#0D1117] border-l border-white/[0.08] flex flex-col h-full shrink-0 overflow-hidden font-sans">
      {/* ヘッダー */}
      <div className="p-3.5 bg-[#12161F] border-b border-white/[0.08] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-emerald-400"></span>
          <span className="font-mono text-xs font-bold text-zinc-100 uppercase tracking-wider">
            PLAYBOOK INSPECTOR
          </span>
        </div>
        <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/70 px-2 py-0.5 border border-emerald-800/60">
          登録情報 · 出典未照合
        </span>
      </div>

      {/* スクロール本文 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs text-zinc-300">
        <p className="rounded border border-white/[0.08] bg-white/[0.03] p-2.5 text-[11px] leading-relaxed text-zinc-400">
          以下は台帳の登録内容です。出典や観測時期を確認し、価格・成果の保証として扱わないでください。
        </p>
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
            <span>01 市場背景として登録された内容</span>
          </div>
          <div className="p-3 bg-[#0F131C] border border-white/[0.06] rounded space-y-2 leading-relaxed text-zinc-300">
            <p className="text-xs">{marketGlitch}</p>
            <div className="pt-2 border-t border-white/[0.06] text-[11px] text-zinc-400">
              <span className="font-mono text-emerald-200 font-bold">着眼点: </span>
              {corePsychologicalTrigger}
            </div>
          </div>
        </section>

        {/* 02. 初動突破の手口 */}
        <section className="space-y-2">
          <div className="flex items-center gap-1.5 text-zinc-200 font-mono text-[11px] font-bold uppercase tracking-wider">
            <Target size={13} className="text-emerald-400" />
            <span>02 初期の顧客獲得経路</span>
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
              <span>03 編集用テンプレート・登録済み文面</span>
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
          {copyFailed && <p role="status" className="text-[11px] text-amber-300">コピーできませんでした。文面を選択してコピーしてください。</p>}
        </section>

        {/* 04. 顧客継続と乗り換えに関する登録情報 */}
        <section className="space-y-2">
          <div className="flex items-center gap-1.5 text-zinc-200 font-mono text-[11px] font-bold uppercase tracking-wider">
            <Key size={13} className="text-emerald-400" />
            <span>04 顧客継続・乗り換えの要因</span>
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
            利用できる分析項目、出典、更新時点はプラン詳細で確認できます。未掲載の明細や資料が提供されるとは限りません。
          </p>
          <button
            type="button"
            onClick={onOpenProModal}
            className="w-full h-7 bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-mono font-bold rounded flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <span>PROプランの内容を確認する</span>
          </button>
        </div>
      </div>
    </div>
  );
};
