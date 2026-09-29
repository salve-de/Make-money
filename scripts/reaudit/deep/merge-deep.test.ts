import { describe, expect, it } from 'vitest';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { TOPICS, mergeDeep, mergeDeepRecord, validateDeepCandidate, validateDeepRecord } from './merge-deep.mjs';
import { parseFinancialEntity } from '../../../src/shared/financial-entity-schema';

type RecordValue = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const base = JSON.parse(readFileSync('data/entities-index.json', 'utf8')).find((r: RecordValue) => r.reaudit?.method === 'MANUAL_REAUDIT');
const finding = { topic: 'initialTraction', text: '公式記事は初期顧客の獲得に公開フォーラムを利用したと報告。', sourceUrl: 'https://example.com/history', observedAt: '2026-09-29', statedAt: '2020', originType: 'reported', rightsTier: 'TIER1_OFFICIAL' };
function record(findings: RecordValue[] = [finding]): RecordValue {
  return { id: base.id, startedAt: '2026-09-29T01:00:00Z', completedAt: '2026-09-29T01:10:00Z', findings: structuredClone(findings), coverage: Object.fromEntries(TOPICS.map(t => [t, { status: findings.some(f => f.topic === t) ? 'found' : 'not_attempted', reason: '公開資料の確認範囲を記録。', attempts: findings.filter(f => f.topic === t).map(f => ({ url: f.sourceUrl, observedAt: f.observedAt, outcome: '公開本文を確認' })) }])) };
}
describe('deep wave additive merge', () => {
  it('CLI writes only a new correctly named candidate and never changes catalog or other files', () => {
    const dir = mkdtempSync(join(tmpdir(), 'deep-wave-test-'));
    const script = resolve('scripts/reaudit/deep/merge-deep.mjs');
    try {
      mkdirSync(join(dir, 'data/incoming'), { recursive: true });
      const catalog = JSON.stringify([base]);
      writeFileSync(join(dir, 'data/entities-index.json'), catalog);
      writeFileSync(join(dir, 'input.json'), JSON.stringify({ schemaVersion: 'deep-wave.v1', records: [record()] }));
      const output = 'data/incoming/reaudit-deep-ih-batch-001-20260929.json';
      const run = (path: string) => execFileSync(process.execPath, [script, '--input', 'input.json', '--output', path], { cwd: dir, stdio: 'pipe' });
      run(output); const bytes = readFileSync(join(dir, output), 'utf8');
      expect(() => run(output)).toThrow();
      expect(() => run('data/incoming/other.json')).toThrow();
      expect(() => run('data/entities-index.json')).toThrow();
      expect(readFileSync(join(dir, output), 'utf8')).toBe(bytes);
      expect(readFileSync(join(dir, 'data/entities-index.json'), 'utf8')).toBe(catalog);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
  it('preserves old facts and audit snapshot, and emits runtime-valid UI-supported evidence', () => {
    const before = structuredClone(base), out = mergeDeepRecord(base, record());
    expect(base).toEqual(before);
    expect(out.reaudit.legacyDisplaySnapshot).toEqual(base.reaudit.legacyDisplaySnapshot);
    expect(out.observationsStream.slice(0, base.observationsStream.length)).toEqual(base.observationsStream);
    expect(out.pnl).toEqual(base.pnl);
    expect(out.evidenceCards.find((c: RecordValue) => c.type === 'DIRTY_GENESIS').sourceNote).toContain(finding.sourceUrl);
    expect(parseFinancialEntity(out)).toEqual(out);
    expect(validateDeepCandidate(out, base, true)).toEqual([]);
  });
  it('projects every supported field without breaking the runtime schema', () => {
    const findings = [
      { ...finding, topic: 'hiring', toolNames: ['ExampleTool'] },
      { ...finding, topic: 'reviews', sampleCount: 3 },
      { ...finding, topic: 'timeline', occurredAt: '2020-01-01', eventType: '公開' },
      { ...finding, topic: 'eraContext' },
      { ...finding, topic: 'viability', viabilityStatus: 'EVOLVING_BARRIER' },
      { ...finding, topic: 'fatalCause' },
      { ...finding, topic: 'prepayment', originType: 'estimated', formula: '100 * 12 = 1200' },
    ];
    const out = mergeDeepRecord(base, record(findings));
    expect(parseFinancialEntity(out)).toEqual(out);
    expect(out.operations.toolStack.find((t: RecordValue) => t.name === 'ExampleTool').isCostUnconfirmed).toBe(true);
    expect(out.evidenceCards.some((c: RecordValue) => c.type === 'FATAL_BLEED')).toBe(true);
  });
  it('is idempotent and keeps different facts from the same URL while sources stay unique', () => {
    const r = record([finding, { ...finding, text: '同じ公式記事は顧客からの紹介も記録。' }]);
    const once = mergeDeepRecord(base, r), twice = mergeDeepRecord(once, r);
    expect(twice).toEqual(once);
    expect(once.reaudit.sources.filter((s: RecordValue) => s.url === finding.sourceUrl)).toHaveLength(1);
    expect(once.observationsStream.filter((o: RecordValue) => o.sourceUrl === finding.sourceUrl)).toHaveLength(2);
  });
  it('deduplicates the same finding rechecked on a later date without losing audit history', () => {
    const r = record(), first = mergeDeepRecord(base, r);
    const later = record([{ ...finding, observedAt: '2026-09-30' }]);
    const second = mergeDeepRecord(first, later);
    expect(second.observationsStream).toEqual(first.observationsStream);
    expect(second.reaudit.deepWaves).toHaveLength(2);
  });
  it('fills unknown temporal fields but retains conflicting earlier facts', () => {
    const r = record([{ ...finding, topic: 'viability', viabilityStatus: 'HISTORICAL_WINDOW' }]);
    const unknownBase = structuredClone(base); unknownBase.temporal.viabilityStatus = 'UNKNOWN';
    expect(mergeDeepRecord(unknownBase, r).temporal.viabilityStatus).toBe('HISTORICAL_WINDOW');
    unknownBase.temporal.viabilityStatus = 'MATURED_MOAT';
    expect(mergeDeepRecord(unknownBase, r).temporal.viabilityStatus).toBe('MATURED_MOAT');
  });
  it('rejects unsourced and malicious projection edits, deleted history, and stale baseline', () => {
    const out = mergeDeepRecord(base, record());
    const tampered = structuredClone(out); tampered.strategy.initialTraction.push('出典なしの追記');
    expect(validateDeepCandidate(tampered, base, true).length).toBeGreaterThan(0);
    const deleted = structuredClone(out); delete deleted.reaudit.deepWaves;
    expect(validateDeepCandidate(deleted, base, true).length).toBeGreaterThan(0);
    const stale = structuredClone(base); stale.tagline = '別作業の新しい事実';
    expect(validateDeepCandidate(out, stale, true).length).toBeGreaterThan(0);
  });
  it.each([
    { sourceUrl: '' }, { sourceUrl: 'https://user:password@example.com/' }, { observedAt: '2026-02-31' }, { rightsTier: 'REFERENCE_ONLY' },
    { originType: 'estimated' }, { text: '連絡先 a@example.com' }, { text: 'アカウントを作れ' },
    { text: '"one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen"' },
    { text: "'one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen'" },
    { text: '‘one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen’' },
    { rawHtml: '<script>anything</script>' }, { toolNames: ['Node'] },
  ])('rejects unsafe or malformed finding %j', patch => {
    expect(() => validateDeepRecord(record([{ ...finding, ...patch }]))).toThrow();
  });
  it('requires sampled reviews, dated timeline, real attempts and consistent coverage', () => {
    expect(() => validateDeepRecord(record([{ ...finding, topic: 'reviews' }]))).toThrow();
    expect(() => validateDeepRecord(record([{ ...finding, topic: 'timeline' }]))).toThrow();
    const r = record(); r.coverage.hiring.status = 'unconfirmed';
    expect(() => validateDeepRecord(r)).toThrow();
    r.coverage.hiring.attempts.push({ url: 'https://example.com/careers', observedAt: '2026-09-29', outcome: 'HTTP 403' });
    expect(() => validateDeepRecord(r)).not.toThrow();
  });
  it('rejects prototype fields, duplicate ids and arbitrary top-level inputs', () => {
    const malicious = JSON.parse(JSON.stringify(record()).replace('"findings":', '"__proto__":{"polluted":true},"findings":'));
    expect(() => validateDeepRecord(malicious)).toThrow();
    expect(() => mergeDeep([base], { schemaVersion: 'deep-wave.v1', records: [record(), record()] })).toThrow();
    expect(() => mergeDeep([base], { schemaVersion: 'deep-wave.v1', records: [record()], patch: {} })).toThrow();
  });
});
