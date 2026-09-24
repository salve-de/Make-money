import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';
import { __test } from './index.js';
import { createCostMeter } from '../../shared/cost-meter.js';

const FIVE_MINUTES = 5 * 60 * 1000;


test('publisher accepts only deterministic v2 candidate paths', () => {
  assert.equal(
    __test.isPublisherCandidatePath(
      'staging/r2-queue/candidates/v2/abc123/company-mapper-v2.json'
    ),
    true
  );
  assert.equal(
    __test.isPublisherCandidatePath(
      'staging/r2-queue/2026/09/21/candidates/run_q55/company.json'
    ),
    false
  );
  assert.equal(
    __test.isPublisherCandidatePath(
      'staging/r2-queue/candidates/v2/abc123/not-json.txt'
    ),
    false
  );
});

test('publisher recognizes typed sidecar paths and legacy source blobs', () => {
  assert.equal(
    __test.isTypedRecordSetPath(
      'staging/automation/typed-records/DISCOVERY/2026/09/24/run_x/test-typed-record-set-v1.json'
    ),
    true
  );
  assert.equal(
    __test.isTypedRecordSetPath('staging/automation/discovery/run.json'),
    false
  );
  assert.equal(
    __test.legacyCandidateSourceBlob(
      'staging/r2-queue/candidates/v2/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/test-r2-queue-mapper-v5.json'
    ),
    'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
  );
  assert.equal(__test.legacyCandidateSourceBlob('staging/r2-queue/candidates/v2/nope/test.json'), null);
});

test('typed HOLD identity is stable per path/blob/projector', async () => {
  const file = {
    path: 'staging/automation/typed-records/DISCOVERY/2026/09/24/run_x/test-typed-record-set-v1.json',
    sha: 'a'.repeat(40),
  };
  const first = await __test.typedHoldKey(file);
  const same = await __test.typedHoldKey({ ...file });
  const changed = await __test.typedHoldKey({ ...file, sha: 'b'.repeat(40) });
  assert.equal(first, same);
  assert.notEqual(first, changed);
  assert.match(first, /^derived\/publisher-hold\/v1\/[a-f0-9]{64}\.json$/);
});

test('typed completion identity is stable per path/blob/projector', async () => {
  const file = {
    path: 'staging/automation/typed-records/DISCOVERY/2026/09/24/run_x/test-typed-record-set-v1.json',
    sha: 'a'.repeat(40),
  };
  const first = await __test.typedCompleteKey(file);
  const same = await __test.typedCompleteKey({ ...file });
  const changed = await __test.typedCompleteKey({ ...file, path: file.path + '.moved' });
  assert.equal(first, same);
  assert.notEqual(first, changed);
  assert.match(first, /^derived\/publisher-typed-complete\/v1\/[a-f0-9]{64}\.json$/);
});

test('terminal typed ingest rejection is recognized only for immutable 422 HOLD responses', () => {
  assert.equal(
    __test.isTerminalTypedIngestReject({
      response: { status: 422 },
      payload: { terminal: true, reason_code: 'SOURCE_SCHEMA_INVALID' },
    }),
    true
  );
  assert.equal(
    __test.isTerminalTypedIngestReject({
      response: { status: 422 },
      payload: { terminal: false },
    }),
    false
  );
  assert.equal(
    __test.isTerminalTypedIngestReject({
      response: { status: 503 },
      payload: { terminal: true },
    }),
    false
  );
});

test('typed HOLD marker is create-only, read-back verified, and idempotent', async () => {
  const store = new Map();
  const bucket = {
    async get(key) {
      const bytes = store.get(key);
      if (!bytes) return null;
      return {
        size: bytes.byteLength,
        async text() {
          return new TextDecoder().decode(bytes);
        },
        async arrayBuffer() {
          return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
        },
      };
    },
    async put(key, value, options = {}) {
      if (options?.onlyIf?.etagDoesNotMatch === '*' && store.has(key)) return null;
      const bytes = value instanceof Uint8Array ? value.slice() : new Uint8Array(value);
      store.set(key, bytes);
      return { size: bytes.byteLength };
    },
  };
  const telemetry = __test.createTelemetry();
  telemetry.cost = createCostMeter({ service: 'publisher-hold-unit-test' });
  const env = {
    GITHUB_OWNER: 'salve-de',
    GITHUB_REPO: 'universal-foundation',
    FOUNDATION_R2_LAKE: bucket,
  };
  const file = {
    path: 'staging/automation/typed-records/DISCOVERY/2026/09/24/run_x/test-typed-record-set-v1.json',
    sha: 'a'.repeat(40),
  };
  const input = {
    file,
    sourceCommitSha: 'b'.repeat(40),
    reasonCode: 'SOURCE_SCHEMA_INVALID',
    reason: 'typed sidecar failed immutable schema validation',
    details: { issues: ['/quality invalid'] },
  };

  const first = await __test.writeTypedInputHold(env, telemetry, input);
  assert.equal(first.status, 'CREATED');
  assert.equal(store.size, 1);

  const readback = await __test.readTypedInputHold(env, file, telemetry);
  assert.equal(readback.value.status, 'HOLD');
  assert.equal(readback.value.reason_code, 'SOURCE_SCHEMA_INVALID');
  assert.equal(readback.value.typed_record_set_blob_sha, file.sha);

  const second = await __test.writeTypedInputHold(env, telemetry, input);
  assert.equal(second.status, 'EXISTS_IDENTICAL');
  assert.equal(store.size, 1);
});

test('candidate quarantine identity is stable per path and blob SHA', async () => {
  const file = {
    path: 'staging/r2-queue/candidates/v2/run/candidate.json',
    sha: 'a'.repeat(40),
  };
  const same = await __test.candidateQuarantineKey(file);
  const sameAgain = await __test.candidateQuarantineKey({ ...file });
  const changedBlob = await __test.candidateQuarantineKey({ ...file, sha: 'b'.repeat(40) });
  const changedPath = await __test.candidateQuarantineKey({ ...file, path: `${file.path}.renamed` });
  assert.equal(same, sameAgain);
  assert.notEqual(same, changedBlob);
  assert.notEqual(same, changedPath);
  assert.match(same, /^derived\/publisher-quarantine\/v1\/[a-f0-9]{64}\.json$/);
});

test('canonical JSON comparison ignores formatting-only trailing whitespace', () => {
  assert.equal(
    __test.normalizedJsonText('{"run_id":"run-1"}\n'),
    __test.normalizedJsonText('{"run_id":"run-1"}')
  );
  assert.notEqual(
    __test.normalizedJsonText('{"run_id":"run-1"}'),
    __test.normalizedJsonText('{"run_id":"run-2"}')
  );
  assert.throws(
    () => __test.normalizedJsonText('{not-json'),
    SyntaxError
  );
});

test('terminally invalid candidate bundles are skipped without downstream retries', () => {
  const valid = {
    schema_version: 'research-bundle.v1',
    run_id: 'run_candidate_test',
    purpose: 'make_money',
    subject: { query: 'test' },
    agent: { name: 'test' },
    retrieved_at: '2026-09-22T00:00:00Z',
    sources: [],
    evidence: [],
    entities: [{
      entity_id: 'ent_test_0123456789abcdef0123',
      entity_type: 'organization',
      canonical_name: 'Test',
      aliases: [],
      canonical_identifier: null,
      status: 'unknown',
      observed_at: '2026-09-22T00:00:00Z',
    }],
    claims: [],
    metrics: [],
    money_signals: [],
    events: [],
    relationships: [],
    derived: [],
    quality: { unknowns: [], conflicts: [], warnings: [], schema_validation: 'PASS' },
    collection_coverage: __test.makeMoneyCoverageDimensions.map((dimension) => ({
      dimension,
      status: 'not_attempted',
      note: 'test',
    })),
  };

  const accepted = __test.parseCandidateFile(JSON.stringify(valid));
  assert.equal(accepted.bundles.length, 1);
  assert.equal(accepted.skipped.length, 0);

  const invalidRoot = __test.parseCandidateFile(JSON.stringify({
    ...valid,
    typed_record_set: { schema_version: 'typed-record-set.v1' },
  }));
  assert.equal(invalidRoot.bundles.length, 0);
  assert.equal(invalidRoot.skipped.length, 1);
  assert.equal(invalidRoot.skipped[0].reason_code, 'SCHEMA_INVALID');
  assert.match(invalidRoot.skipped[0].reason, /typed_record_set/);

  const missingCoverage = { ...valid };
  delete missingCoverage.collection_coverage;
  const invalidPurpose = __test.parseCandidateFile(JSON.stringify(missingCoverage));
  assert.equal(invalidPurpose.bundles.length, 0);
  assert.equal(invalidPurpose.skipped.length, 1);
  assert.match(invalidPurpose.skipped[0].reason, /collection_coverage/);

  const notValidated = __test.parseCandidateFile(JSON.stringify({
    ...valid,
    quality: { ...valid.quality, schema_validation: 'NOT_RUN' },
  }));
  assert.equal(notValidated.bundles.length, 0);
  assert.equal(notValidated.skipped[0].reason_code, 'SCHEMA_INVALID');
  assert.match(notValidated.skipped[0].reason, /schema_validation/);

  const derivedOnly = __test.parseCandidateFile(JSON.stringify({
    ...valid,
    entities: [],
    derived: [{
      derived_id: 'drv_0123456789abcdef01234567',
      derived_type: 'test',
      text: 'derived only',
      origin_type: 'inferred',
      confidence: 0.5,
      supporting_claim_ids: [],
      supporting_evidence_ids: [],
      model: null,
      created_at: null,
    }],
  }));
  assert.equal(derivedOnly.bundles.length, 0);
  assert.match(derivedOnly.skipped[0].reason, /research records/);

  const oversized = __test.parseCandidateFile(JSON.stringify({
    ...valid,
    subject: { ...valid.subject, notes: 'x'.repeat(256_001) },
  }));
  assert.equal(oversized.bundles.length, 0);
  assert.match(oversized.skipped[0].reason, /256000/);

  const whitespaceRoot = __test.parseCandidateFile(JSON.stringify({
    ...valid,
    subject: { ...valid.subject, query: ' ' },
  }));
  assert.equal(whitespaceRoot.bundles.length, 0);
  assert.match(whitespaceRoot.skipped[0].reason, /subject.query/);

  const mixed = __test.parseCandidateFile(JSON.stringify([
    valid,
    { ...valid, typed_record_set: { schema_version: 'typed-record-set.v1' }, run_id: 'run_invalid_in_array' },
  ]));
  assert.equal(mixed.bundles.length, 1);
  assert.equal(mixed.skipped.length, 1);

  const malformed = __test.parseCandidateFile('{not-json');
  assert.equal(malformed.bundles.length, 0);
  assert.equal(malformed.skipped[0].reason_code, 'MALFORMED_IMMUTABLE_CANDIDATE');
});


test('rotates candidate-file order even when the whole queue fits inside the scan cap', () => {
  const files = Array.from({ length: 26 }, (_, index) => ({
    path: `staging/r2-queue/batch-${String(index).padStart(2, '0')}/candidates/items.json`,
    sha: index.toString(16).padStart(40, '0'),
  }));

  const first = __test.selectCandidateFiles(files, 0, 60, 25);
  const second = __test.selectCandidateFiles(files, FIVE_MINUTES, 60, 25);

  assert.equal(first.files.length, 26);
  assert.equal(second.files.length, 26);
  assert.equal(first.files[0], files[0]);
  assert.equal(second.files[0], files[0]);
  assert.notDeepEqual(
    first.files.slice(1).map((file) => file.path),
    second.files.slice(1).map((file) => file.path)
  );
  assert.deepEqual(
    new Set(first.files.map((file) => file.path)),
    new Set(files.map((file) => file.path))
  );
  assert.deepEqual(
    new Set(second.files.map((file) => file.path)),
    new Set(files.map((file) => file.path))
  );
});

test('rotates short multi-bundle files even when every bundle fits in the scan window', () => {
  const bundles = [
    { run_id: 'run-a' },
    { run_id: 'run-b' },
    { run_id: 'run-c' },
  ];

  const first = __test.selectBundlesForFile(bundles, '0000000000000000000000000000000000000000', 0, 4);
  const second = __test.selectBundlesForFile(
    bundles,
    '0000000000000000000000000000000000000000',
    FIVE_MINUTES,
    4
  );

  assert.equal(first.bundles.length, 3);
  assert.equal(second.bundles.length, 3);
  assert.notEqual(first.bundles[0].run_id, second.bundles[0].run_id);
  assert.deepEqual(
    new Set(first.bundles.map((bundle) => bundle.run_id)),
    new Set(['run-a', 'run-b', 'run-c'])
  );
  assert.deepEqual(
    new Set(second.bundles.map((bundle) => bundle.run_id)),
    new Set(['run-a', 'run-b', 'run-c'])
  );
});


test('rotates the entire file queue when only one publish attempt is allowed', () => {
  const files = Array.from({ length: 4 }, (_, index) => ({
    path: `staging/r2-queue/batch-${index}/candidates/items.json`,
    sha: index.toString(16).padStart(40, '0'),
  }));

  const firsts = Array.from({ length: 4 }, (_, cycle) =>
    __test.selectCandidateFiles(files, cycle * FIVE_MINUTES, 60, 1).files[0]?.path
  );

  assert.deepEqual(new Set(firsts), new Set(files.map((file) => file.path)));
});

test('bundle phase advances after a complete file-rotation sweep, avoiding modular aliasing', () => {
  const bundles = Array.from({ length: 25 }, (_, index) => ({ run_id: `run-${index}` }));
  const seen = new Set();

  for (let cycle = 0; cycle < 25 * 25; cycle += 1) {
    // Simulate a historical file omitted on the same residue once per 25-run
    // file-selection sweep. The bundle phase must still expose every bundle.
    if (cycle % 25 === 7) continue;
    const selected = __test.selectBundlesForFile(
      bundles,
      '0000000000000000000000000000000000000000',
      cycle * FIVE_MINUTES,
      1,
      25
    );
    if (selected.bundles[0]) seen.add(selected.bundles[0].run_id);
  }

  assert.equal(seen.size, 25);
});


test('validates GitHub webhook HMAC-SHA256 with the official test vector', async () => {
  const secret = "It's a Secret to Everybody";
  const payload = 'Hello, World!';
  const signature = 'sha256=757107ea0eb2509fc211221cce984b8a37570b6d7586c22c46f4379c8b043e17';

  assert.equal(
    await __test.verifyGithubWebhookSignature(secret, payload, signature),
    true
  );
  assert.equal(
    await __test.verifyGithubWebhookSignature(secret, payload + 'tampered', signature),
    false
  );
});

test('defers valid GitHub pushes until the next edition batch', async () => {
  const secret = 'edition-secret';
  const body = JSON.stringify({
    repository: { full_name: 'salve-de/universal-foundation' },
    ref: 'refs/heads/automation-research',
  });
  const signature = `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
  let queueWrites = 0;
  const response = await __test.handleGithubWebhook(
    new Request('https://publisher.example/github-webhook', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-github-event': 'push',
        'x-github-delivery': 'delivery-edition-1',
        'x-hub-signature-256': signature,
      },
      body,
    }),
    {
      GITHUB_WEBHOOK_SECRET: secret,
      GITHUB_OWNER: 'salve-de',
      GITHUB_REPO: 'universal-foundation',
      GITHUB_REF: 'automation-research',
      PUBLISH_EVENTS: { send: async () => { queueWrites += 1; } },
    },
    {},
  );

  assert.equal(response.status, 202);
  assert.deepEqual(await response.json(), {
    ok: true,
    deferred: true,
    delivery_id: 'delivery-edition-1',
    reason: 'edition_batch_schedule',
    version: 'publisher-v10',
  });
  assert.equal(queueWrites, 0);
});

test('detects the Queue free-tier daily write limit for direct fallback', () => {
  assert.equal(__test.isQueueWriteLimitError(new Error('You have exceeded the daily write operations limit in Queues free tier (10253)')), true);
  assert.equal(__test.isQueueWriteLimitError(new Error('GitHub 500')), false);
});

test('rejects malformed publisher queue events', () => {
  assert.equal(__test.parsePublisherEvent(null), null);
  assert.equal(__test.parsePublisherEvent({ type: 'reconcile' }), null);
  assert.equal(
    __test.parsePublisherEvent({
      schema_version: 'foundation-publisher-event.v1',
      type: 'reconcile',
      delivery_id: 'delivery-1',
      received_at: 'not-a-date',
    }),
    null
  );
});

test('normalizes a valid publisher queue event', () => {
  const event = __test.parsePublisherEvent({
    schema_version: 'foundation-publisher-event.v1',
    type: 'reconcile',
    delivery_id: 'delivery-1',
    received_at: '2026-09-20T04:00:00.000Z',
    before: 'a'.repeat(40),
    after: 'b'.repeat(40),
    batch_id: 'batch_20260922T050000Z',
    idempotency_key: 'publisher:batch_20260922T050000Z',
    input_watermark: 'c'.repeat(40),
    reason: 'scheduled_edition_batch',
    continuation_depth: 2,
    cycle_offset: 25,
    historical_coverage: 24,
    producer_cost_hint: { message_bytes: 512, write_operations: 1, messages_written: 1 },
  });

  assert.equal(event.delivery_id, 'delivery-1');
  assert.equal(event.continuation_depth, 2);
  assert.equal(event.cycle_offset, 25);
  assert.equal(event.historical_coverage, 24);
  assert.equal(event.batch_id, 'batch_20260922T050000Z');
  assert.equal(event.input_watermark, 'c'.repeat(40));
  assert.deepEqual(event.producer_cost_hint, {
    message_bytes: 512,
    write_operations: 1,
    messages_written: 1,
  });
});

test('rejects legacy publisher events that have no batch identity', () => {
  const event = __test.parsePublisherEvent({
    schema_version: 'foundation-publisher-event.v1',
    type: 'reconcile',
    delivery_id: 'legacy-delivery',
    received_at: '2026-09-20T04:00:00.000Z',
    reason: 'github_push',
  });
  assert.equal(event, null);
});

test('event continuations advance only while historical queue coverage remains', () => {
  const event = {
    continuation_depth: 0,
    historical_coverage: 0,
  };
  const summary = {
    candidate_files_discovered: 60,
    candidate_files_scanned: 25,
    scan_window: {
      guaranteed_fresh_files: 1,
    },
  };

  const first = __test.needsContinuation(event, summary, { MAX_EVENT_CONTINUATIONS: '100' });
  assert.equal(first.progress, 24);
  assert.equal(first.nextCoverage, 24);
  assert.equal(first.shouldContinue, true);

  const done = __test.needsContinuation(
    { ...event, historical_coverage: 59 },
    summary,
    { MAX_EVENT_CONTINUATIONS: '100' }
  );
  assert.equal(done.shouldContinue, false);
});

test('event continuation cap prevents unbounded queue self-enqueueing', () => {
  const result = __test.needsContinuation(
    { continuation_depth: 3, historical_coverage: 0 },
    {
      candidate_files_discovered: 500,
      candidate_files_scanned: 25,
      scan_window: { guaranteed_fresh_files: 1 },
    },
    { MAX_EVENT_CONTINUATIONS: '3' }
  );
  assert.equal(result.shouldContinue, false);
});


test('a saturated single-publish event continues even after one historical file sweep', () => {
  const result = __test.needsContinuation(
    { continuation_depth: 3, historical_coverage: 60 },
    {
      candidate_files_discovered: 60,
      candidate_files_scanned: 1,
      attempted: 1,
      published: 1,
      publish_budget: 1,
      scan_window: { guaranteed_fresh_files: 0 },
    },
    { MAX_EVENT_CONTINUATIONS: '500' }
  );
  assert.equal(result.shouldContinue, true);
});

test('event chain stops after a clean sweep finds no unpublished bundle', () => {
  const result = __test.needsContinuation(
    { continuation_depth: 4, historical_coverage: 60 },
    {
      candidate_files_discovered: 60,
      candidate_files_scanned: 8,
      attempted: 0,
      published: 0,
      publish_budget: 1,
      scan_window: { guaranteed_fresh_files: 0 },
    },
    { MAX_EVENT_CONTINUATIONS: '500' }
  );
  assert.equal(result.shouldContinue, false);
});

test('candidate failures are isolated from infrastructure failures', () => {
  assert.equal(
    __test.classifyPublisherOutcome({ failed: 1, file_failures: 0 }),
    'candidate_failure'
  );
  assert.equal(
    __test.classifyPublisherOutcome({ file_failures: 1 }),
    'candidate_failure'
  );
  assert.equal(
    __test.classifyPublisherOutcome({ queue_discovery_error: 'GitHub 503', failed: 1 }),
    'infrastructure_failure'
  );
  assert.equal(
    __test.classifyPublisherOutcome({ typed_discovery_error: 'GitHub 503' }),
    'infrastructure_failure'
  );
  assert.equal(
    __test.classifyPublisherOutcome({ typed_hold_write_failures: 1 }),
    'infrastructure_failure'
  );
  assert.equal(
    __test.classifyPublisherOutcome({ typed_complete_write_failures: 1 }),
    'infrastructure_failure'
  );
  assert.equal(
    __test.classifyPublisherOutcome({ typed_delivery_failures: 1 }),
    'candidate_failure'
  );
  assert.equal(
    __test.classifyPublisherOutcome({ typed_held: 1 }),
    'clean'
  );
  assert.equal(__test.classifyPublisherOutcome({}), 'clean');
});

test('direct fallback uses a bounded window that can finish inside waitUntil', () => {
  const original = {
    MAX_BUNDLES_PER_RUN: '10',
    MAX_BUNDLES_SCANNED_PER_RUN: '40',
    MAX_CANDIDATE_FILES_PER_RUN: '40',
    MAX_TYPED_SIDECARS_PER_RUN: '100',
    MAX_VIEW_REBUILD_STEPS_PER_RUN: '2',
    VIEW_REBUILD_PAGE_LIMIT: '5',
    FOUNDATION_GITHUB_TOKEN: 'opaque-token',
  };
  const fallback = __test.directFallbackEnvironment(original);

  assert.deepEqual(
    {
      MAX_BUNDLES_PER_RUN: fallback.MAX_BUNDLES_PER_RUN,
      MAX_BUNDLES_SCANNED_PER_RUN: fallback.MAX_BUNDLES_SCANNED_PER_RUN,
      MAX_CANDIDATE_FILES_PER_RUN: fallback.MAX_CANDIDATE_FILES_PER_RUN,
      MAX_TYPED_SIDECARS_PER_RUN: fallback.MAX_TYPED_SIDECARS_PER_RUN,
      MAX_VIEW_REBUILD_STEPS_PER_RUN: fallback.MAX_VIEW_REBUILD_STEPS_PER_RUN,
      VIEW_REBUILD_PAGE_LIMIT: fallback.VIEW_REBUILD_PAGE_LIMIT,
    },
    {
      MAX_BUNDLES_PER_RUN: '1',
      MAX_BUNDLES_SCANNED_PER_RUN: '8',
      MAX_CANDIDATE_FILES_PER_RUN: '8',
      MAX_TYPED_SIDECARS_PER_RUN: '8',
      MAX_VIEW_REBUILD_STEPS_PER_RUN: '1',
      VIEW_REBUILD_PAGE_LIMIT: '1',
    },
  );
  assert.equal(original.MAX_BUNDLES_PER_RUN, '10');
  assert.equal(fallback.FOUNDATION_GITHUB_TOKEN, 'opaque-token');
});


test('queue rotation offset never changes the recorded trigger time', () => {
  const receivedAt = '2026-09-20T04:00:00.000Z';
  const actual = __test.eventTriggerTime({
    received_at: receivedAt,
    cycle_offset: 240,
  });
  assert.equal(actual, Date.parse(receivedAt));
});

function queueEvent(overrides = {}) {
  return {
    schema_version: 'foundation-publisher-event.v1',
    type: 'reconcile',
    delivery_id: 'delivery-queue-test',
    received_at: '2026-09-22T04:00:00.000Z',
    before: null,
    after: null,
    reason: 'test',
    batch_id: 'batch_queue_test',
    idempotency_key: 'queue:test',
    input_watermark: null,
    continuation_depth: 0,
    cycle_offset: 0,
    historical_coverage: 0,
    ...overrides,
  };
}

function queueMessage(body = queueEvent()) {
  const calls = { ack: 0, retry: [] };
  return {
    id: 'message-queue-test',
    body,
    ack() {
      calls.ack += 1;
    },
    retry(options) {
      calls.retry.push(options);
    },
    calls,
  };
}

test('queue handler retries infrastructure errors and thrown failures', async () => {
  const infraMessage = queueMessage();
  await __test.handleQueueMessage(
    infraMessage,
    { MAX_EVENT_CONTINUATIONS: '20' },
    { runPublisher: async () => ({ view_backfill_error: 'temporary outage' }) },
  );
  assert.equal(infraMessage.calls.ack, 0);
  assert.deepEqual(infraMessage.calls.retry, [{ delaySeconds: 60 }]);

  const thrownMessage = queueMessage(queueEvent({ delivery_id: 'delivery-queue-throw' }));
  await __test.handleQueueMessage(
    thrownMessage,
    {},
    { runPublisher: async () => { throw new Error('temporary publisher failure'); } },
  );
  assert.equal(thrownMessage.calls.ack, 0);
  assert.deepEqual(thrownMessage.calls.retry, [{ delaySeconds: 60 }]);
});

test('queue handler acknowledges candidate failures after optional continuation', async () => {
  const message = queueMessage();
  const enqueued = [];
  await __test.handleQueueMessage(
    message,
    { MAX_EVENT_CONTINUATIONS: '20' },
    {
      runPublisher: async () => ({
        failed: 1,
        file_failures: 0,
        candidate_files_discovered: 0,
        candidate_files_scanned: 0,
        scan_window: { guaranteed_fresh_files: 0 },
        attempted: 1,
        published: 0,
        publish_budget: 1,
      }),
      enqueueReconcile: async (_env, event) => enqueued.push(event),
    },
  );
  assert.equal(message.calls.ack, 1);
  assert.deepEqual(message.calls.retry, []);
  assert.deepEqual(enqueued, []);
});
