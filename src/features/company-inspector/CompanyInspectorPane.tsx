'use client';

import { useSearchParams } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react';

import { buildInspectorModel } from './model/inspector-model';
import type { CompanyInspectorPaneProps, InspectorMainTab, InspectorViewMode } from './model/section-props';
import { BusinessAnalysisSections } from './ui/BusinessAnalysisSections';
import { FinancialOperationsSupplement } from './ui/FinancialOperationsSupplement';
import { BusinessVisualSummary } from './ui/BusinessVisualSummary';
import { AnalystNotes } from './ui/AnalystNotes';
import { CashAnatomySection } from './ui/CashAnatomySection';
import { CompanyHeader } from './ui/CompanyHeader';
import { EstimatedCashSummary } from './ui/EstimatedCashSummary';
import { EvidenceDeckSection } from './ui/EvidenceDeckSection';
import { EvidenceStream } from './ui/EvidenceStream';
import { ExecutiveIntuitiveSummary } from './ui/ExecutiveIntuitiveSummary';
import { LootBlueprintSection } from './ui/LootBlueprintSection';
import { RelatedResearch } from './ui/RelatedResearch';
import { SourcesSection } from './ui/SourcesSection';

export const CompanyInspectorPane: React.FC<CompanyInspectorPaneProps> = ({
  entity,
  onClose,
  currency,
  onPrevEntity,
  onNextEntity,
  onOpenPro,
  onSelectTopic,
  onOpenAnomaly,
  activeTags = [],
  onToggleTag,
  analystNote = '',
  noteSaveStatus,
  onSaveAnalystNote,
  onOpenSynthesisWithEntity,
  onApproveEntity,
  isPro = false,
  isBookmarked = false,
  onToggleBookmark,
  mobileOpen = true,
  positionLabel,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mainTab, setMainTab] = useState<InspectorMainTab>('LEDGER');
  const [viewMode, setViewMode] = useState<InspectorViewMode>('ALL');
  const searchParams = useSearchParams();
  const targetSection = searchParams?.get('section');

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      setIsScrolled(scrollContainerRef.current.scrollTop > 12);
    }
  };

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
      setIsScrolled(false);
    }
  }, [entity?.id]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (!targetSection) return;
    const timer = setTimeout(() => {
      const el = document.getElementById(`section-${targetSection}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
    return () => clearTimeout(timer);
  }, [entity?.id, targetSection]);

  if (!entity) return null;

  const model = buildInspectorModel(entity, currency);
  const sectionProps = {
    entity,
    currency,
    onClose,
    onPrevEntity,
    onNextEntity,
    onOpenPro,
    onSelectTopic,
    onOpenAnomaly,
    activeTags,
    onToggleTag,
    analystNote,
    noteSaveStatus,
    onSaveAnalystNote,
    onOpenSynthesisWithEntity,
    onApproveEntity,
    isPro,
    isScrolled,
    scrollToSection,
    viewMode,
    setViewMode,
    mainTab,
    setMainTab,
    isBookmarked,
    onToggleBookmark,
    positionLabel,
    ...model
  };

  return (
    <aside
      aria-label={`${entity.name}の企業事例インスペクター`}
      className={`fixed inset-0 z-40 h-full w-full shrink-0 flex-col overflow-hidden bg-term-panel lg:static lg:inset-auto lg:z-auto lg:min-w-0 lg:flex-1 lg:border-l lg:border-term-line ${mobileOpen ? 'flex' : 'hidden lg:flex'}`}
    >
      <CompanyHeader {...sectionProps} />

      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="relative flex-1 overflow-y-auto bg-term-bg pb-[env(safe-area-inset-bottom)] font-sans text-[13px] scroll-smooth [scrollbar-gutter:stable] [scrollbar-width:thin]"
      >
        {mainTab === 'LEDGER' ? (
          <>
            <ExecutiveIntuitiveSummary {...sectionProps} />

            {entity.pnl.financialStatus === 'ESTIMATED' ? (
              <EstimatedCashSummary {...sectionProps} />
            ) : (
              <CashAnatomySection {...sectionProps} />
            )}

            <EvidenceDeckSection {...sectionProps} />
            <LootBlueprintSection {...sectionProps} />
            <BusinessAnalysisSections {...sectionProps} />
            <FinancialOperationsSupplement {...sectionProps} />
            <BusinessVisualSummary {...sectionProps} />
            <RelatedResearch {...sectionProps} />
          </>
        ) : (
          <>
            <SourcesSection {...sectionProps} />
            <EvidenceStream {...sectionProps} />
            <AnalystNotes {...sectionProps} />
          </>
        )}
      </div>

      {!isPro && onOpenPro && (
        <div className="sticky bottom-0 flex min-h-11 shrink-0 items-center gap-3 border-t border-term-accent-line bg-term-accent-bg px-3 pb-[env(safe-area-inset-bottom)] lg:min-h-9">
          <span className="text-xs font-semibold text-term-accent">PRO</span>
          <span className="min-w-0 flex-1 truncate text-xs text-term-sub">
            大手との競争・価格決定力・継続利用の仕組み・資金効率
          </span>
          <button
            type="button"
            onClick={onOpenPro}
            className="h-8 shrink-0 rounded-sm border border-term-accent px-3 text-xs text-term-accent hover:bg-term-head lg:h-6"
          >
            見本を開く
          </button>
        </div>
      )}
    </aside>
  );
};
