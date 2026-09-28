import { UniversalIntelligenceStream } from './UniversalIntelligenceStream';
import type { InspectorSectionProps } from '../model/section-props';

export function EvidenceStream({ entity, currency }: Pick<InspectorSectionProps, 'entity' | 'currency' | 'isHazardMode'>) {
  return <div id="section-stream" className="space-y-4 scroll-mt-4"><UniversalIntelligenceStream entity={entity} currency={currency} /></div>;
}
