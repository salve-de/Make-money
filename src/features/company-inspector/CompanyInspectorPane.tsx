'use client';

import { useSearchParams } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react';

import { UI, uiFormat } from '@/shared/ui-strings';
import { buildInspectorModel } from './model/inspector-model';
import type { CompanyInspectorPaneProps, InspectorMainTab, InspectorViewMode } from './model/section-props';
import { AnalystNotes } from './ui/AnalystNotes';
import { CompanyHeader } from './ui/CompanyHeader';
import { EntityMediaGallery } from './ui/EntityMediaGallery';
import { OperatorVerificationNote } from './ui/OperatorVerificationNote';
import { ReaderLedger } from './ui/ReaderDetail';
import { VerifiedRevenueSection } from './ui/VerifiedRevenueSection';

export const CompanyInspectorPane: React.FC<CompanyInspectorPaneProps> = ({
  entity,
  onClose,
  currency,
  onPrevEntity,
  onNextEntity,
  onOpenPro,
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
  detailState,
  onRetryDetail,
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
      aria-label={uiFormat(UI.INSPECTOR_ARIA, entity.name)}
      className={`fixed inset-0 z-40 h-full w-full shrink-0 flex-col overflow-hidden bg-term-panel lg:static lg:inset-auto lg:z-auto lg:min-w-0 lg:flex-1 lg:border-l lg:border-term-line ${mobileOpen ? 'flex' : 'hidden lg:flex'}`}
    >
      <CompanyHeader {...sectionProps} />

      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="relative flex-1 overflow-y-auto bg-term-bg pb-[env(safe-area-inset-bottom)] font-sans text-[13px] scroll-smooth [scrollbar-gutter:stable] [scrollbar-width:thin]"
      >
        {/* entity.reader の事実・数値・出典と、推測の印つきの推論、運営者が決済確認した売上を描く */}
        {mainTab === 'LEDGER' ? (
          <>
            <ReaderLedger
              reader={entity.reader}
              detailState={detailState}
              onRetry={onRetryDetail}
              media={<EntityMediaGallery entityId={entity.id} entityName={entity.name} isHazardMode={Boolean(sectionProps.isHazardMode)} />}
            />
            <VerifiedRevenueSection entityId={entity.id} />
            <OperatorVerificationNote entityId={entity.id} url={entity.url} />
          </>
        ) : (
          <AnalystNotes {...sectionProps} />
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
