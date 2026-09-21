import { expect, it } from 'vitest';
import { validateEvidenceLinkCorrection } from './evidence-link-correction';

const original = { run_id: 'run_original', evidence: [{ evidence_id: 'ev_good', summary: 'Fact' }, { evidence_id: 'ev_wrong', summary: 'Other subject' }],
  entities: [{ entity_id: 'ent_one', evidence_ids: ['ev_good', 'ev_wrong'] }], claims: [], metrics: [], money_signals: [], events: [], relationships: [], observations: [] };
const corrected = { ...original, evidence: [original.evidence[0]], entities: [{ entity_id: 'ent_one', evidence_ids: ['ev_good'] }] };
it('permits evidence-only subset corrections without changing original records', () => {
  expect(() => validateEvidenceLinkCorrection(original, corrected)).not.toThrow();
  expect(original.entities[0].evidence_ids).toEqual(['ev_good', 'ev_wrong']);
});
it('rejects new evidence, changed facts, changed identity and dropped records', () => {
  expect(() => validateEvidenceLinkCorrection(original, { ...corrected, evidence: [{ evidence_id: 'ev_good', summary: 'Invented' }] })).toThrow();
  expect(() => validateEvidenceLinkCorrection(original, { ...corrected, entities: [{ entity_id: 'ent_other', evidence_ids: ['ev_good'] }] })).toThrow();
  expect(() => validateEvidenceLinkCorrection(original, { ...corrected, entities: [] })).toThrow();
  expect(() => validateEvidenceLinkCorrection(original, { ...corrected, run_id: 'run_changed' })).toThrow();
});
