'use client';

import React from 'react';
import { CompanyRecord } from '@/types/terminal';
import { MobileFeedView } from './MobileFeedView';
import { LaptopTableView } from './LaptopTableView';
import { DesktopTableView } from './DesktopTableView';

interface UniversalDataLedgerProps {
  companies: CompanyRecord[];
  onSelectCompany: (companyId: string) => void;
  selectedCompanyId?: string | null;
  bookmarkedIds: string[];
  onToggleBookmark: (companyId: string) => void;
  onSortByRevenue: () => void;
  onSortByMargin: () => void;
}

export const UniversalDataLedger: React.FC<UniversalDataLedgerProps> = ({
  companies,
  onSelectCompany,
  selectedCompanyId,
  bookmarkedIds,
  onToggleBookmark,
  onSortByRevenue,
  onSortByMargin
}) => {
  return (
    <div className="flex-1 overflow-y-auto bg-[#080B10] select-none">
      {/* 1. スマホ専用：3段高密度垂直フィード (md未満) */}
      <MobileFeedView
        companies={companies}
        onSelectCompany={onSelectCompany}
        bookmarkedIds={bookmarkedIds}
        onToggleBookmark={onToggleBookmark}
      />

      {/* 2. 狭小PC専用：見切れゼロ厳選5カラム表 (md〜xl未満: 768px〜1279px) */}
      <LaptopTableView
        companies={companies}
        onSelectCompany={onSelectCompany}
        selectedCompanyId={selectedCompanyId}
        bookmarkedIds={bookmarkedIds}
        onToggleBookmark={onToggleBookmark}
        onSortByRevenue={onSortByRevenue}
        onSortByMargin={onSortByMargin}
      />

      {/* 3. ワイドPC専用：9カラム超高密度金融台帳 (xl以上: 1280px〜1920px+) */}
      <DesktopTableView
        companies={companies}
        onSelectCompany={onSelectCompany}
        selectedCompanyId={selectedCompanyId}
        bookmarkedIds={bookmarkedIds}
        onToggleBookmark={onToggleBookmark}
        onSortByRevenue={onSortByRevenue}
        onSortByMargin={onSortByMargin}
      />
    </div>
  );
};
