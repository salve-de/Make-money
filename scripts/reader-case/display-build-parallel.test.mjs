import assert from 'node:assert/strict';
import test from 'node:test';
import { MAX_PARALLEL, parseArgs, runLimited } from './display-build-parallel.mjs';

test('同時に動く数は上限を超えない', async () => {
  const items = Array.from({ length: 10 }, (_, i) => i);
  let now = 0, seen = 0;
  const { peak } = await runLimited(items, 4, async () => { now++; seen = Math.max(seen, now); await new Promise((r) => setTimeout(r, 5)); now--; });
  assert.equal(peak, 4);
  assert.equal(seen, 4);
});

test('--parallel は4より大きくできない', () => {
  assert.equal(parseArgs(['--parallel', '10', '--', '--reader-only']).parallel, MAX_PARALLEL);
  assert.equal(parseArgs(['--', '--reader-only']).parallel, 4);
  assert.equal(parseArgs(['--parallel', '2', '--', '--reader-only']).parallel, 2);
});

test('書き込みを伴う直しは並列で流さない', () => {
  assert.throws(() => parseArgs(['--', '--repair-only', '--reader']));
  assert.throws(() => parseArgs(['--', '--reader-only', '--id', 'x']));
  assert.throws(() => parseArgs(['--parallel', '0', '--', '--reader-only']));
});
