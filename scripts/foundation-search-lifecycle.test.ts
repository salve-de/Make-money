import assert from 'node:assert/strict';
import test from 'node:test';
import { withOneFoundationPageRetry } from '../src/platform/hooks/foundation-search-lifecycle';

test('does not start a retry when a cursor request is already stale after its first failure', async () => {
  let requestCount = 0;
  let waitCount = 0;
  const firstError = new Error('page request failed');

  await assert.rejects(
    withOneFoundationPageRetry(
      async () => {
        requestCount += 1;
        throw firstError;
      },
      () => false,
      async () => {
        waitCount += 1;
      },
    ),
    (error: unknown) => error === firstError,
  );

  assert.equal(requestCount, 1);
  assert.equal(waitCount, 0);
});

test('does not retry a failed cursor request if the query changes during backoff', async () => {
  let committedQuery = 'alpha';
  let requestCount = 0;
  let releaseBackoff!: () => void;
  let reportBackoffStarted!: () => void;
  const backoff = new Promise<void>((resolve) => { releaseBackoff = resolve; });
  const backoffStarted = new Promise<void>((resolve) => { reportBackoffStarted = resolve; });
  const firstError = new Error('alpha page request failed');

  const pending = withOneFoundationPageRetry(
    async () => {
      requestCount += 1;
      throw firstError;
    },
    () => committedQuery === 'alpha',
    async () => {
      reportBackoffStarted();
      await backoff;
    },
  );

  await backoffStarted;
  committedQuery = 'beta';
  releaseBackoff();

  await assert.rejects(pending, (error: unknown) => error === firstError);
  assert.equal(requestCount, 1);
});

test('retains one retry for a transient failure while the query remains current', async () => {
  let requestCount = 0;

  const result = await withOneFoundationPageRetry(
    async () => {
      requestCount += 1;
      if (requestCount === 1) throw new Error('temporary network failure');
      return 'page payload';
    },
    () => true,
    async () => undefined,
  );

  assert.equal(result, 'page payload');
  assert.equal(requestCount, 2);
});
