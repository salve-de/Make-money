import assert from 'node:assert/strict';
import test from 'node:test';
import { verifyLocalFoundation } from './verify-local-foundation.mjs';

function responder(pages: unknown[], detail: (id: string) => unknown = id => ({ id })) {
  let page = 0;
  return async (input: string | URL | Request) => {
    const url = new URL(input instanceof Request ? input.url : input);
    return new Response(JSON.stringify({ source: 'foundation_lake',
    ...(url.searchParams.has('entity_id')
      ? { data: detail(url.searchParams.get('entity_id')!) }
      : pages[page++] as object),
    }));
  };
}

test('receipt IDs reach paginated lists and identity-matched R2 details', async () => {
  const result = await verifyLocalFoundation('http://localhost:3000', ['ent_a', 'ent_b', 'ent_a'], responder([
    { data: [{ id: 'ent_a' }], hasMore: true, nextCursor: 'second' },
    { data: [{ id: 'ent_b' }], hasMore: false },
  ]));
  assert.equal(result.passed, true);
  assert.equal(result.expected, 2);
  assert.equal(result.detailsVerified, 2);
  assert.equal(result.listPages, 2);
});
test('no requests to production or credential-bearing URLs', async () => {
  for (const url of ['https://example.com', 'http://user:secret@localhost:3000']) {
    await assert.rejects(verifyLocalFoundation(url, ['ent_a'], () => assert.fail('unexpected request')));
  }
});
test('empty or malformed receipts cannot falsely pass', async () => {
  for (const ids of [[], ['../../secret'], [null]]) {
    await assert.rejects(verifyLocalFoundation('http://localhost:3000', ids, () => assert.fail('unexpected request')));
  }
});
test('missing list ID fails', async () => {
  await assert.rejects(verifyLocalFoundation('http://localhost:3000', ['ent_a'], responder([
    { data: [], hasMore: false },
  ])), /missing from local list/);
});
test('repeated cursors cannot hide an incomplete scan', async () => {
  await assert.rejects(verifyLocalFoundation('http://localhost:3000', ['ent_a'], responder([
    { data: [], hasMore: true, nextCursor: 'same' },
    { data: [], hasMore: true, nextCursor: 'same' },
  ])), /cursor did not advance/);
});
test('checked-in fallback cannot be mistaken for R2', async () => {
  await assert.rejects(verifyLocalFoundation('http://localhost:3000', ['ent_a'], async () =>
    new Response(JSON.stringify({ source: 'local_fallback', data: [{ id: 'ent_a' }] }))), /did not read Foundation/);
});
test('detail identity mismatch fails without returning private payloads', async () => {
  const result = await verifyLocalFoundation('http://localhost:3000', ['ent_a'], responder([
    { data: [{ id: 'ent_a' }], hasMore: false },
  ], () => ({ id: 'ent_wrong', private: 'do not print' })));
  assert.equal(result.passed, false);
  assert.deepEqual(result.failedEntityIds, ['ent_a']);
  assert.equal(JSON.stringify(result).includes('do not print'), false);
});
