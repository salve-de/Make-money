import type { FinancialEntity,IntelligenceTopicId } from '@/shared/terminal';
import type { buildInspectorModel } from './inspector-model';
export interface CompanyInspectorPaneProps {
  entity: FinancialEntity | null;
  onClose: () => void;
  currency: 'JPY' | 'USD';
  onPrevEntity?: () => void;
  onNextEntity?: () => void;
  onOpenPro?: () => void;
  onSelectTopic?: (topicId: IntelligenceTopicId) => void;
  onOpenAnomaly?: (anomalyId: string) => void;
  initialTab?: TabType;
  activeTags?: string[];
  onToggleTag?: (tag: string | null) => void;
  analystNote?: string;
  noteSaveStatus?: 'loading' | 'saved' | 'local' | 'saving' | 'error';
  onSaveAnalystNote?: (entityId: string, note: string) => void;
  onOpenSynthesisWithEntity?: (entityId: string) => void;
  isPro?: boolean;
}

export type TabType = 'EVIDENCE' | 'FINANCIALS' | 'PLAYBOOK' | 'STREAM' | 'NOTES' | 'ALL';


export type InspectorSectionProps = Omit<CompanyInspectorPaneProps, 'entity'> & ReturnType<typeof buildInspectorModel> & { entity: FinancialEntity; isScrolled: boolean; scrollToSection: (id: string) => void };
