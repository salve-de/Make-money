'use client';

import React, { useState } from 'react';
import { CompanyRecord } from '../../types/terminal';

interface InspectorPanelProps {
  company: CompanyRecord;
  onDownloadCsv: () => void;
  onDownloadExcel: () => void;
  onOpenOfferModal: () => void;
  onOpenProModal: () => void;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  company,
  onDownloadCsv,
  onDownloadExcel,
  onOpenOfferModal,
  onOpenProModal
}) => {
  // 倍率スライダー（デフォルトは企業のevMultiple）
  const [currentMultiple, setCurrentMultiple] = useState<number>(company.evMultiple || 3.5);

  // 最新の営業利益または売上
  const latestFin = company.financials[company.financials.length - 1];
  const baseOperatingProfit = latestFin?.operatingProfitJpy || 10000000;
  const simulatedValuation = Math.round(baseOperatingProfit * currentMultiple);

  const formatShortAmount = (valJpy: number) => {
    if (valJpy >= 1000000000000) {
      return `¥${(valJpy / 1000000000000).toFixed(2)}兆`;
    }
    if (valJpy >= 100000000) {
      return `¥${(valJpy / 100000000).toFixed(1)}億円`;
    }
    if (valJpy >= 10000) {
      return `¥${(valJpy / 10000).toFixed(0)}万円`;
    }
    return `¥${valJpy.toLocaleString()}`;
  };

  return (
    <div className="w-72 bg-[#14161B] border-l border-white/[0.08] flex flex-col shrink-0 select-none overflow-y-auto p-4 gap-4">
      {/* 1. 簡易DCF/マルチプル試算機 */}
      <div className="bg-[#181B22] border border-white/[0.08] rounded-lg p-3.5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-mono font-semibold text-zinc-400 uppercase tracking-wider">
            事業価値マルチプル試算
          </span>
          <span className="text-[10px] font-mono text-indigo-400 font-semibold bg-indigo-500/10 px-1.5 py-0.5 rounded">
            {currentMultiple.toFixed(1)}x
          </span>
        </div>

        <div className="mb-3">
          <input
            type="range"
            min="1.0"
            max="30.0"
            step="0.5"
            value={currentMultiple}
            onChange={(e) => setCurrentMultiple(parseFloat(e.target.value))}
            className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-zinc-700 rounded-lg"
          />
          <div className="flex justify-between text-[9px] font-mono text-zinc-500 mt-1">
            <span>1.0x (清算)</span>
            <span>5.0x (標準)</span>
            <span>15.0x (高成長)</span>
            <span>30.0x</span>
          </div>
        </div>

        <div className="p-2.5 bg-zinc-900/80 rounded border border-white/5 font-mono">
          <div className="text-[10px] text-zinc-500">試算想定企業価値</div>
          <div className="text-base font-bold text-zinc-100">
            {formatShortAmount(simulatedValuation)}
          </div>
          <div className="text-[9px] text-zinc-500 mt-0.5">
            ※ 直近営業利益 {formatShortAmount(baseOperatingProfit)} × {currentMultiple.toFixed(1)}倍
          </div>
        </div>
      </div>

      {/* 2. 生データ即時出力窓口 */}
      <div className="bg-[#181B22] border border-white/[0.08] rounded-lg p-3.5">
        <span className="text-[10px] font-mono font-semibold text-zinc-400 uppercase tracking-wider block mb-2.5">
          生データ・帳票エクスポート
        </span>

        <div className="space-y-2">
          <button
            onClick={onDownloadExcel}
            className="w-full h-8 px-3 bg-zinc-800 hover:bg-zinc-750 text-emerald-400 border border-emerald-500/20 rounded text-xs font-mono font-medium flex items-center justify-between transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>完全財務諸表 (XLS)</span>
            </div>
            <span className="text-[10px] text-zinc-500">計算式付</span>
          </button>

          <button
            onClick={onDownloadCsv}
            className="w-full h-8 px-3 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 border border-white/[0.08] rounded text-xs font-mono font-medium flex items-center justify-between transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-zinc-400"></span>
              <span>生データ台帳 (CSV)</span>
            </div>
            <span className="text-[10px] text-zinc-500">UTF-8</span>
          </button>
        </div>
      </div>

      {/* 3. 買収・出資打診CTA */}
      {company.isForSale ? (
        <div className="bg-gradient-to-b from-emerald-950/30 to-[#181B22] border border-emerald-500/30 rounded-lg p-3.5">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="text-xs font-bold text-emerald-300 font-mono">
              事業売却・出資受付中
            </span>
          </div>

          <p className="text-[11px] text-zinc-400 mb-3 font-sans leading-relaxed">
            希望売却価額: <span className="font-mono font-bold text-zinc-200">{formatShortAmount(company.askingPriceJpy || company.estimatedValuationJpy)}</span>
          </p>

          <button
            onClick={onOpenOfferModal}
            className="w-full h-8 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs rounded transition-colors shadow-sm font-sans"
          >
            買収意向表明書 (LOI) を送付
          </button>
        </div>
      ) : (
        <div className="bg-[#181B22] border border-white/[0.08] rounded-lg p-3.5 text-xs text-zinc-400">
          <span className="text-[10px] font-mono text-zinc-500 uppercase block mb-1">売却ステータス</span>
          <div>非売却（上場・独立運用）</div>
          <div className="text-[10px] text-zinc-500 mt-1">
            ※ 機関投資家向けレポートの閲覧のみ可能です
          </div>
        </div>
      )}

      {/* 4. 機関PROアップグレードCTA */}
      <div className="bg-[#181B22] border border-white/[0.08] rounded-lg p-3.5 mt-auto">
        <span className="text-[10px] font-mono text-indigo-400 font-semibold uppercase block mb-1">
          機関契約PROプラン
        </span>
        <p className="text-[11px] text-zinc-400 mb-3 leading-relaxed">
          全19社の未公開ソースコード、初期集客台帳、および月次更新アラートを無制限に取得。
        </p>
        <button
          onClick={onOpenProModal}
          className="w-full h-8 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded transition-colors"
        >
          月額プランを確認する
        </button>
      </div>
    </div>
  );
};
