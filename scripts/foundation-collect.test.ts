import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { assessCoverage } from '../src/lib/foundation/coverage';
import { prepareFoundationResearch, validateResearchBundle } from '../src/lib/foundation/ingest';
const sample = () => JSON.parse(readFileSync(new URL('../data/collection/buffer-2024.request.json', import.meta.url), 'utf8')).bundle;
test('money_signal plans successfully without R2 access', async () => {
  const plan = await prepareFoundationResearch(sample());
  assert.equal(plan.objects.filter(x => x.logical_role === 'money_signal').length, 1);
  assert.ok(plan.objects.every(x => x.bucket !== 'universal' && x.create_only));
});
test('partial data is retained without a false complete status', () => {
  assert.equal(assessCoverage(sample()).status, 'PARTIAL');
});
test('missing dimensions and dangling found refs fail', () => {
  const b = sample(); b.collection_coverage.pop();
  assert.throws(() => assessCoverage(b), /Missing coverage/);
  const c = sample(); c.collection_coverage[0].record_refs = ['metrics/999'];
  assert.throws(() => assessCoverage(c), /dangling/);
});
test('source-less claim is accepted only without a supported label', () => {
  const b = sample(); b.claims[0].evidence_ids = []; b.claims[0].verification_status = 'UNVERIFIED';
  assert.doesNotThrow(() => validateResearchBundle(b));
  b.claims[0].verification_status = 'SUPPORTED';
  assert.throws(() => validateResearchBundle(b), /SUPPORTED/);
});
test('rejects oversized nested bundle values before planning writes', () => {
  const b = sample();
  b.subject.query = 'x'.repeat(256_001);
  assert.throws(() => validateResearchBundle(b), /exceeds 256000/);
});
