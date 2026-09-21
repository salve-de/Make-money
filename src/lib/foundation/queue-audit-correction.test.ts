import { expect, it } from 'vitest';
import { auditCorrectionTarget, validateAuditCorrection } from './queue-audit-correction';
const target = { run_id: 'run_original', coverage: { normalized_bundle_coverage: { Metric: 25 } } };
const correction = {
  schema_version: 'r2-queue-run-correction.v1',
  input_snapshot: { corrects_run_id: 'run_original', corrects_path: 'staging/r2-queue/2026/09/21/run_original.json' },
  recorded_items: [{ type: 'audit_correction', field: 'coverage.normalized_bundle_coverage.Metric', old_value: 25, correct_value: 23 }],
};
it('accepts matching audit counters without mutating business data', () => {
  expect(validateAuditCorrection(correction, target)).toEqual([{ field: 'coverage.normalized_bundle_coverage.Metric', old_value: 25, correct_value: 23 }]);
  expect(target.coverage.normalized_bundle_coverage.Metric).toBe(25);
});
it('does not classify ordinary runs as corrections', () => expect(auditCorrectionTarget(target)).toBeNull());
it('accepts an explicit top-level relationship-count audit correction only', () => {
  const q={schema_version:'r2-queue-run-correction.v1',corrects_run_id:'run_original',corrects_path:'staging/r2-queue/2026/09/21/run_original.json',correction:{field:'research_log[0].relationships_found_count',old_value:12,new_value:13}};
  expect(validateAuditCorrection(q,{run_id:'run_original',research_log:[{relationships_found_count:12}]})).toEqual([{field:'research_log[0].relationships_found_count',old_value:12,correct_value:13}]);
  expect(()=>validateAuditCorrection({...q,correction:{...q.correction,field:'recorded_items[0].revenue'}},{run_id:'run_original'})).toThrow();
});
it('rejects wrong target runs', () => expect(() => validateAuditCorrection(correction, { ...target, run_id: 'run_other' })).toThrow());
it('rejects stale correction values', () => expect(() => validateAuditCorrection(correction, { ...target, coverage: {} })).toThrow());
it('rejects attempts to modify business records', () => expect(() => validateAuditCorrection({ ...correction, recorded_items: [{ ...correction.recorded_items[0], field: 'recorded_items.0.name' }] }, target)).toThrow());
