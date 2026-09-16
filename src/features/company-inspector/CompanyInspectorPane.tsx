'use client';

import { useSearchParams } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react';

import { buildInspectorModel } from './model/inspector-model';
import type { CompanyInspectorPaneProps, InspectorMainTab } from './model/section-props';
import { AnalystNotes } from './ui/AnalystNotes';
import { BusinessSections } from './ui/BusinessSections';
import { CashAnatomySection } from './ui/CashAnatomySection';
import { CompanyHeader } from './ui/CompanyHeader';
import { EvidenceDeckSection } from './ui/EvidenceDeckSection';
import { EvidenceStream } from './ui/EvidenceStream';
import { FinancialSection } from './ui/FinancialSection';
import { FlywheelEngineDiagram } from './ui/FlywheelEngineDiagram';
import { LootBlueprintSection } from './ui/LootBlueprintSection';
import { PlaybookSections } from './ui/PlaybookSections';
import { RelatedResearch } from './ui/RelatedResearch';
import { SourcesSection } from './ui/SourcesSection';
import { ToolsSection } from './ui/ToolsSection';
import { ValueChainDisruptionSection } from './ui/ValueChainDisruptionSection';
import { VisualPipelineSection } from './ui/VisualPipelineSection';
import { ExecutiveIntuitiveSummary } from './ui/ExecutiveIntuitiveSummary';
import { SankeyCashFlowDiagram } from './ui/SankeyCashFlowDiagram';
import { TradingViewFinancialChart } from './ui/TradingViewFinancialChart';
import type { InspectorViewMode } from './model/section-props';

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
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mainTab, setMainTab] = useState<InspectorMainTab>('LEDGER');
  const [viewMode, setViewMode] = useState<InspectorViewMode>('ALL');
  const searchParams = useSearchParams();
  const targetSection = searchParams?.get('section');

  // セクション直通スクロールジャンプ
  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // スクロール追従（固定ヘッダーの立体シャドウ強調）
  const handleScroll = () => {
    if (scrollContainerRef.current) {
      setIsScrolled(scrollContainerRef.current.scrollTop > 12);
    }
  };

  // 銘柄切り替え時にスクロールを先頭へリセット
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
      // Synchronize the header with the DOM scroll position reset above.
      setIsScrolled(false);
    }
  }, [entity?.id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (targetSection) {
      const timer = setTimeout(() => {
        const el = document.getElementById(`section-${targetSection}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
      return () => clearTimeout(timer);
    }
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
    ...model
  };

  return (
    <>
      {/* スマホ時バックドロップ */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 md:hidden"
      />

      <aside className="fixed md:static inset-x-0 bottom-0 max-h-[92vh] md:max-h-none h-full w-full md:flex-1 md:min-w-[480px] bg-[#040507] border-t md:border-t-0 md:border-l border-white/[0.08] z-40 flex flex-col shrink-0 md:shrink select-none overflow-hidden shadow-2xl">

        {/* ========================================================= */}
        {/* 【上部固定計器盤（PINNED EXECUTIVE HUD）: 冷徹モノトーン ＆ 高密度金融端末】 */}
        {/* ========================================================= */}
        <CompanyHeader {...sectionProps} />

        {/* ========================================================= */}
        {/* 【コンテンツゾーン: スクロールトレイ ＆ 金融監査ストリーム】 */}
        {/* ========================================================= */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4 space-y-6 text-xs font-sans bg-[#080B10] relative scroll-smooth [scrollbar-gutter:stable] [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.2)_rgba(8,11,16,1)]"
        >

          {mainTab === 'LEDGER' ? (
            <>
              {/* ========================================================= */}
              {/* 【本丸】資本主義の裏帳簿：完全統合キラーピラミッド */}
              {/* ========================================================= */}

              {/* 0. 【特集インテリジェンス】深層解剖記事への直通バナー */}
              <RelatedResearch {...sectionProps} />

              {/* LAYER 1: 【0秒・脳幹直撃】断罪HUD・エグゼクティブサマリー */}
              <ExecutiveIntuitiveSummary {...sectionProps} />

              {/* LAYER 2: 【配管特等席】キャッシュ創出配管図（React Flow回路図） */}
              {(viewMode === 'ALL' || viewMode === 'ESSENCE' || viewMode === 'PLAYBOOK') && (
                <VisualPipelineSection {...sectionProps} />
              )}

              {/* LAYER 3: 【3秒・急所解剖】動かぬ証拠 4大急所デッキ */}
              {(viewMode === 'ALL' || viewMode === 'ESSENCE') && (
                <EvidenceDeckSection {...sectionProps} />
              )}

              {/* LAYER 4: 【30秒・現金解剖】現金の解剖室（通帳引き算バー） */}
              {(viewMode === 'ALL' || viewMode === 'FINANCIAL') && (
                <CashAnatomySection {...sectionProps} />
              )}

              {/* LAYER 5: 【図表強化①】現金の滝・損益分岐サンキー図（Apache ECharts） */}
              {(viewMode === 'ALL' || viewMode === 'FINANCIAL') && (
                <SankeyCashFlowDiagram {...sectionProps} />
              )}

              {/* LAYER 6: 【図表強化②】損益ストリーム分析（TradingView Lightweight Charts） */}
              {(viewMode === 'ALL' || viewMode === 'FINANCIAL') && (
                <TradingViewFinancialChart {...sectionProps} />
              )}

              {/* LAYER 7: 【詳細P&L】財務損益計器盤 ＆ 原価構造 */}
              {(viewMode === 'ALL' || viewMode === 'FINANCIAL') && (
                <FinancialSection {...sectionProps} />
              )}

              {/* LAYER 8: 【図表強化③】自走増殖フライホイール（Apache ECharts 360°円環図） */}
              {(viewMode === 'ALL' || viewMode === 'ESSENCE') && (
                <FlywheelEngineDiagram {...sectionProps} />
              )}

              {/* LAYER 9: 【図表強化④】産業構造の変革（バリューチェーン中抜き対比図） */}
              {(viewMode === 'ALL' || viewMode === 'ESSENCE') && (
                <ValueChainDisruptionSection {...sectionProps} />
              )}

              {/* LAYER 10: 【事業DNA・ビジネスの正体】#01〜#04 弱者の生存戦略・大企業の死角 */}
              {(viewMode === 'ALL' || viewMode === 'ESSENCE') && (
                <BusinessSections {...sectionProps} />
              )}

              {/* LAYER 11: 【現場配管・武器庫】#08 利用ツールスタック ＆ 月額原価 */}
              {(viewMode === 'ALL' || viewMode === 'FINANCIAL' || viewMode === 'PLAYBOOK') && (
                <ToolsSection {...sectionProps} />
              )}

              {/* LAYER 12: 【5分・略奪実行】略奪ブループリント ＆ 武器庫 */}
              {(viewMode === 'ALL' || viewMode === 'PLAYBOOK') && (
                <LootBlueprintSection {...sectionProps} />
              )}

              {/* LAYER 13: 【初動突破・実務プレイブック】#09〜#13 最初の100人獲得 ＆ 再現手順 */}
              {(viewMode === 'ALL' || viewMode === 'PLAYBOOK') && (
                <PlaybookSections {...sectionProps} />
              )}
            </>
          ) : (
            <>
              {/* ========================================================= */}
              {/* 【証拠】検証エビデンス（原本アーカイブ ＆ 全量ログ） */}
              {/* ========================================================= */}

              {/* 1. 一次情報源・原本アーカイブ */}
              <SourcesSection {...sectionProps} />

              {/* 2. 全量調査ログ・観察ストリーム */}
              <EvidenceStream {...sectionProps} />

              {/* 3. アナリスト考察メモ */}
              <AnalystNotes {...sectionProps} />

              {/* 4. 関連リサーチ */}
              <RelatedResearch {...sectionProps} />
            </>
          )}
        </div>
      </aside>
    </>
  );
};
