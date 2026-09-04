'use client';

import React, { useState } from 'react';
import { CompanyRecord } from '../../types/terminal';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  companies: CompanyRecord[];
  currentCompany?: CompanyRecord;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  companies,
  currentCompany
}) => {
  const [exportTarget, setExportTarget] = useState<'CURRENT' | 'ALL'>('CURRENT');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const generateCsvString = (companyList: CompanyRecord[]) => {
    const headers = ['銘柄コード', '企業名', '規模区分', '業態', '最新売上高(円)', '粗利率(%)', '営業利益率(%)', '参入障壁', '想定企業価値(円)'];
    const rows = companyList.map((c) => {
      const fin = c.financials[c.financials.length - 1];
      return [
        `"${c.ticker}"`,
        `"${c.japaneseName}"`,
        `"${c.scaleTier}"`,
        `"${c.businessModel}"`,
        fin ? fin.revenueJpy : 0,
        fin ? fin.grossMarginPercent : 0,
        fin ? fin.operatingMarginPercent : 0,
        `"${c.primaryMoat}"`,
        c.estimatedValuationJpy
      ].join(',');
    });
    return [headers.join(','), ...rows].join('\n');
  };

  const handleDownload = () => {
    const targetList = exportTarget === 'CURRENT' && currentCompany ? [currentCompany] : companies;
    const csvContent = generateCsvString(targetList);
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `金鉱録_財務台帳_${exportTarget === 'CURRENT' && currentCompany ? currentCompany.id : '全社'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    onClose();
  };

  const handleCopy = () => {
    const targetList = exportTarget === 'CURRENT' && currentCompany ? [currentCompany] : companies;
    const csvContent = generateCsvString(targetList);
    navigator.clipboard.writeText(csvContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 font-sans select-none">
      <div className="w-full max-w-md bg-[#13151A] border border-white/10 rounded-lg p-5 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] mb-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-zinc-100 uppercase tracking-wider">
              EXPORT DATA
            </span>
            <span className="text-[10px] font-mono text-zinc-500">財務台帳出力</span>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 text-xs font-mono">
            閉じる [ESC]
          </button>
        </div>

        <div className="space-y-4 mb-6 text-xs">
          <div>
            <label className="text-zinc-400 block mb-1.5 font-medium">出力対象</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setExportTarget('CURRENT')}
                className={`p-2.5 rounded border text-left transition-all ${
                  exportTarget === 'CURRENT'
                    ? 'bg-zinc-800 border-white/20 text-zinc-100'
                    : 'bg-[#171920] border-white/5 text-zinc-400'
                }`}
              >
                <div className="font-semibold">{currentCompany?.japaneseName || '選択中銘柄'}</div>
                <div className="text-[10px] text-zinc-500">単一銘柄の詳細財務諸表</div>
              </button>

              <button
                onClick={() => setExportTarget('ALL')}
                className={`p-2.5 rounded border text-left transition-all ${
                  exportTarget === 'ALL'
                    ? 'bg-zinc-800 border-white/20 text-zinc-100'
                    : 'bg-[#171920] border-white/5 text-zinc-400'
                }`}
              >
                <div className="font-semibold">全{companies.length}社 一括台帳</div>
                <div className="text-[10px] text-zinc-500">全社財務マトリクス</div>
              </button>
            </div>
          </div>

          <div className="p-3 bg-[#0E1013] rounded border border-white/5 text-zinc-400 space-y-1 font-mono text-[11px]">
            <div>出力形式: カンマ区切り生データ (CSV / UTF-8 BOM付き)</div>
            <div>互換性: Microsoft Excel, Googleスプレッドシート完全対応</div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            onClick={handleCopy}
            className="h-7 px-3 rounded bg-[#1C1F26] hover:bg-zinc-700 text-zinc-300 text-xs border border-white/10 font-mono transition-colors"
          >
            {copied ? 'コピー完了' : '文字列コピー'}
          </button>

          <button
            onClick={handleDownload}
            className="h-7 px-3 rounded bg-zinc-100 hover:bg-white text-zinc-900 text-xs font-semibold font-sans transition-colors"
          >
            CSVダウンロード
          </button>
        </div>
      </div>
    </div>
  );
};
