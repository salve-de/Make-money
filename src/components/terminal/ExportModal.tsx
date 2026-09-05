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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 font-sans select-none">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 uppercase tracking-wider">
              EXPORT DATA
            </span>
            <span className="text-xs font-semibold text-slate-700">財務台帳出力</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xs font-mono font-semibold">
            閉じる [ESC]
          </button>
        </div>

        <div className="space-y-4 text-xs">
          <div>
            <label className="text-slate-600 block mb-1.5 font-medium">出力対象</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setExportTarget('CURRENT')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  exportTarget === 'CURRENT'
                    ? 'bg-indigo-50/80 border-indigo-300 text-indigo-950 font-semibold'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="font-bold text-slate-900">{currentCompany?.japaneseName || '選択中銘柄'}</div>
                <div className="text-[10px] text-slate-500 font-normal">単一銘柄の詳細財務諸表</div>
              </button>

              <button
                onClick={() => setExportTarget('ALL')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  exportTarget === 'ALL'
                    ? 'bg-indigo-50/80 border-indigo-300 text-indigo-950 font-semibold'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="font-bold text-slate-900">全{companies.length}社 一括台帳</div>
                <div className="text-[10px] text-slate-500 font-normal">全社財務マトリクス</div>
              </button>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-600 space-y-1 font-mono text-[11px]">
            <div>出力形式: カンマ区切り生データ (CSV / UTF-8 BOM付き)</div>
            <div>互換性: Microsoft Excel, Googleスプレッドシート完全対応</div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            onClick={handleCopy}
            className="h-9 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs border border-slate-200 font-mono font-medium transition-colors"
          >
            {copied ? 'コピー完了' : '文字列コピー'}
          </button>

          <button
            onClick={handleDownload}
            className="h-9 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold font-sans transition-colors shadow-xs"
          >
            CSVダウンロード
          </button>
        </div>
      </div>
    </div>
  );
};
