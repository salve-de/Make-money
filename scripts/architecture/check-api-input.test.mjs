import test from 'node:test';
import assert from 'node:assert/strict';
import { findUnboundedBodyReads } from './check-api-input.mjs';

test('rejects direct request body reads', () => {
  assert.equal(findUnboundedBodyReads('route.ts', 'await request.json(); await req.text();').length, 2);
});

test('allows bounded reader helpers and unrelated response parsing', () => {
  assert.deepEqual(findUnboundedBodyReads('route.ts', 'await readJsonBody(request, 1024); await response.json();'), []);
});
