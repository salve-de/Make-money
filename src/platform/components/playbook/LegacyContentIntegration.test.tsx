import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { aggregateMacroIntelligence } from '@/lib/intelligence/macro-aggregator';
import { CurrentWavesSection } from './CurrentWavesSection';
import { DeathTrapsSection } from './DeathTrapsSection';
import { RadarLandmineDetail } from '../radar/RadarLandmineDetail';
import { MARKET_RADAR_LANDMINES } from '@/platform/data/marketRadarData';
import { TacticalArchetypesView } from '../archetypes/TacticalArchetypesView';
import { MARKET_ANOMALIES } from '@/platform/data/marketAnomaliesData';

import { ExecutionReference } from '@/app/execute/[id]/ExecutionClient';
import type { ExecutionSource } from '@/shared/execution-source';

const data = aggregateMacroIntelligence([]);
describe('legacy content in the approved compact design', () => {
  it('restores execution source context without inventing empty fields', () => {
    const entity: ExecutionSource = { architecturePattern: 'CASE_STRUCTURE', pipelineStack: 'CASE_DELIVERY', targetPainWallet: 'CASE_PAIN', id: 'case-id', name: 'CASE_NAME', tagline: 'CASE_LEAD', essence: { whatItDoes: 'CASE_DESCRIPTION', targetCustomer: 'CASE_CUSTOMER', painRelief: '' }, strategy: { blindspot: 'CASE_INSIGHT', initialTraction: ['CASE_CHANNEL'], actionPlaybook: ['CASE_STEP'] }, operations: { primaryChannels: [] } };
    const html = renderToStaticMarkup(createElement(ExecutionReference, { entity }));
    for (const value of ['CASE_DESCRIPTION', 'CASE_CUSTOMER', 'CASE_INSIGHT', 'CASE_CHANNEL', 'CASE_STEP']) expect(html).toContain(value);
    expect(html).toContain('/?entity=case-id');
    expect(renderToStaticMarkup(createElement(ExecutionReference, { entity: { ...entity, contextUnavailable: true } }))).toBe('');
  });
  it('retains wave records absent from presentation guides, with narrative and steps', () => {
    const wave = { ...data.currentWaves[0], id: 'new-wave', whyItWinsNow: 'WAVE_BACKGROUND', shelfLifeAnalysis: 'WAVE_CHANGE', lootBlueprint: { headline: 'WAVE_PLAN', steps: ['WAVE_STEP'] } };
    const html = renderToStaticMarkup(createElement(CurrentWavesSection, { currentWaves: [wave], selectedWaveId: wave.id, setSelectedWaveId: vi.fn() }));
    for (const value of ['WAVE_BACKGROUND', 'WAVE_CHANGE', 'WAVE_PLAN', 'WAVE_STEP']) expect(html).toContain(value);
  });
  it('retains unknown risk records and environmental change records', () => {
    const trap = { ...data.deathTraps[0], id: 'new-trap', mechanism: 'RISK_MECHANISM', warningSigns: ['RISK_SIGN'], antidote: 'RISK_RESPONSE' };
    const alert = { ...data.shelfLifeAlerts[0], triggerEvent: 'CHANGE_EVENT', survivalPivot: 'CHANGE_RESPONSE' };
    const html = renderToStaticMarkup(createElement(DeathTrapsSection, { deathTraps: [trap], shelfLifeAlerts: [alert], selectedTrapId: trap.id, setSelectedTrapId: vi.fn() }));
    for (const value of ['RISK_MECHANISM', 'RISK_SIGN', 'RISK_RESPONSE', 'CHANGE_EVENT', 'CHANGE_RESPONSE']) expect(html).toContain(value);
  });
  it('renders an unknown radar failure ID rather than an empty page', () => {
    const record = { ...MARKET_RADAR_LANDMINES[0], id: 'new-landmine', title: 'CUSTOM_FAILURE', deadlyReason: { ...MARKET_RADAR_LANDMINES[0].deadlyReason, mechanism: 'FAILURE_MECHANISM' } };
    const html = renderToStaticMarkup(createElement(RadarLandmineDetail, { landmine: record }));
    expect(html).toContain('CUSTOM_FAILURE'); expect(html).toContain('FAILURE_MECHANISM');
  });
  it('retains anomaly source narrative and tools in expandable cards', () => {
    const record = MARKET_ANOMALIES[0];
    const html = renderToStaticMarkup(createElement(TacticalArchetypesView, { allEntities: [], onOpenEntityInLedger: vi.fn(), initialAnomalyId: record.id }));
    expect(html).toContain('背景・初動の資料');
    expect(html).toContain(record.techStack[0]);
  });
});
