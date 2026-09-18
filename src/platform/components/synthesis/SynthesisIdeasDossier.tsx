'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { SynthesizedIdea } from '../../types/terminal';
import { 
  Layers, 
  ArrowRight, 
  RotateCcw,
  Hammer
} from 'lucide-react';

interface SynthesisIdeasDossierProps {
  synthesizedIdeas: SynthesizedIdea[];
  handleSynthesize: () => void;
  isSynthesizing: boolean;
  formatMoney: (yen: number) => string;
  handleDrilldownIdea: (idea: SynthesizedIdea) => void;
}

export const SynthesisIdeasDossier: React.FC<SynthesisIdeasDossierProps> = ({
  synthesizedIdeas,
  handleSynthesize,
  isSynthesizing,
  formatMoney,
  handleDrilldownIdea,
}) => {
  const router = useRouter();

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 space-y-6 scrollbar-thin scrollbar-thumb-white/10">
      {synthesizedIdeas.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto">
          <div className="w-12 h-12 rounded bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-zinc-500 mb-4">
            <Layers className="w-6 h-6 text-zinc-400" />
          </div>
          <h3 className="font-mono text-sm font-bold text-white mb-2">
            独自アイデアは未生成です
          </h3>
          <p className="text-xs text-zinc-400 leading-relaxed font-sans mb-6">
            上部の検証バーから事業アイデアを1行投げるか、左ペインの保存銘柄を選んで「独自アイデアを合成」を実行してください。本能工夫・構造胴元・逆張りの3次元から即時抽出されます。
          </p>
          <button
            onClick={handleSynthesize}
            disabled={isSynthesizing}
            className="py-2 px-4 rounded bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.15] text-white font-mono text-xs transition-colors cursor-pointer"
          >
            今すぐデフォルト銘柄から合成する
          </button>
        </div>
      ) : (
        <div className="space-y-6 max-w-4xl mx-auto">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <div>
              <h3 className="font-mono text-sm font-bold text-white">
                SYNTHESIZED_ARBITRAGE_DOSSIERS
              </h3>
              <span className="text-[11px] text-zinc-500 font-mono">
                保存企業の財務データ × あなたの考察メモから抽出された多次元ビジネスモデル
              </span>
            </div>
            <button
              onClick={handleSynthesize}
              disabled={isSynthesizing}
              className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-400 hover:text-white transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              再合成
            </button>
          </div>

          {synthesizedIdeas.map((idea) => (
            <div
              key={idea.id}
              className="bg-[#090A0E] border border-white/[0.08] rounded p-5 space-y-4 shadow-xl"
            >
              {/* アイデア上部ヘッダー */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
                <div>
                  <span className="font-mono text-[10px] text-zinc-400 bg-white/[0.06] px-2 py-0.5 rounded border border-white/[0.08] inline-block mb-1.5">
                    {idea.dimensionLabel}
                  </span>
                  <h4 className="text-sm font-bold text-white font-sans">
                    {idea.title}
                  </h4>
                </div>

                {/* 財務サマリー */}
                <div className="flex items-center gap-3 shrink-0 font-mono">
                  <div className="text-right">
                    <span className="text-[9px] text-zinc-500 block">想定月次手残り</span>
                    <span className="text-xs font-bold text-emerald-400 tabular-nums">
                      {formatMoney(idea.projectedMonthlyProfitJpy)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-zinc-500 block">想定営業利益率</span>
                    <span className="text-xs font-bold text-zinc-200 tabular-nums">
                      {idea.operatingMargin}%
                    </span>
                  </div>
                </div>
              </div>

              {/* 狙う財布 ＆ 構造的歪み */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="bg-[#060709] p-3 rounded border border-white/[0.04]">
                  <span className="font-mono text-[10px] text-zinc-500 block mb-1">
                    痛みの財布（切実な保身・損失回避コスト）
                  </span>
                  <p className="text-zinc-300 text-[11px] leading-relaxed">
                    {idea.targetPainWallet}
                  </p>
                </div>
                <div className="bg-[#060709] p-3 rounded border border-white/[0.04]">
                  <span className="font-mono text-[10px] text-zinc-500 block mb-1">
                    突く市場の歪み・大手の自爆（既存事業の共食い障壁）
                  </span>
                  <p className="text-zinc-300 text-[11px] leading-relaxed">
                    {idea.structuralArbitrage}
                  </p>
                </div>
              </div>

              {/* 推奨ツールスタック */}
              <div>
                <span className="font-mono text-[10px] text-zinc-500 block mb-1.5">
                  最小稼働インフラ（現場配管ツール）
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {idea.requiredTools.map((tool, tIdx) => (
                    <div
                      key={tIdx}
                      className="bg-white/[0.02] border border-white/[0.04] p-2 rounded text-[11px] font-mono"
                    >
                      <div className="text-white font-bold truncate">{tool.name}</div>
                      <div className="text-zinc-500 text-[10px] truncate">{tool.purpose}</div>
                      <div className="text-emerald-400/80 text-[10px] mt-0.5">
                        月{formatMoney(tool.monthlyCostJpy)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 初動100人実録手順 */}
              <div>
                <span className="font-mono text-[10px] text-zinc-500 block mb-1.5">
                  初動100人獲得の客観的実録ステップ
                </span>
                <ul className="space-y-1 text-[11px] text-zinc-400 font-sans">
                  {idea.first100TractionPlaybook.map((step, sIdx) => (
                    <li key={sIdx} className="flex items-start gap-2">
                      <span className="font-mono text-[10px] text-zinc-500 shrink-0">
                        0{sIdx + 1}.
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* アクション: 深掘り or そのままMVP生成 */}
              <div className="pt-2 border-t border-white/[0.04] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-[10px] font-mono text-zinc-500 truncate">
                  着眼点: {idea.userNoteInspiration || '保存銘柄データ'}
                </span>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    onClick={() => handleDrilldownIdea(idea)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-xs font-mono text-white transition-colors cursor-pointer"
                  >
                    <span>精査・壁打ち</span>
                    <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
                  </button>
                  <button
                    onClick={() => {
                      try { sessionStorage.setItem(`mm_build_idea:${idea.id}`, JSON.stringify(idea)); } catch { /* navigation still works for already-persisted ideas */ }
                      router.push(`/build/${encodeURIComponent(idea.id)}`);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 border border-emerald-400/60 text-xs font-mono font-bold text-zinc-950 transition-colors cursor-pointer"
                  >
                    <Hammer className="w-3.5 h-3.5" />
                    <span>この事業を作る</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
