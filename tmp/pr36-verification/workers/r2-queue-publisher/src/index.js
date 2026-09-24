import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import journalEntrySchema from '../../../schemas/foundation/journal-entry.v1.schema.json' with { type: 'json' };
import plannedWritesSchema from '../../../schemas/foundation/planned-writes.v1.schema.json' with { type: 'json' };
import researchBundleSchema from '../../../schemas/foundation/research-bundle.v1.schema.json' with { type: 'json' };
import {
  addAttributedR2Usage,
  createCostMeter,
  finalizeCostMeter,
  recordExternalRequest,
  recordQueueDelivery,
  recordQueueHint,
  recordR2Operation,
  queueOperationUnits,
} from '../../shared/cost-meter.js';

const GITHUB_API = 'https://api.github.com';
const CANDIDATE_V2_PREFIX = 'staging/r2-queue/candidates/v2/';
const CANDIDATE_QUARANTINE_PREFIX = 'derived/publisher-quarantine/v1/';
const TYPED_RECORD_SET_PREFIX = 'staging/automation/typed-records/';
const TYPED_HOLD_PREFIX = 'derived/publisher-hold/v1/';
const TYPED_COMPLETE_PREFIX = 'derived/publisher-typed-complete/v1/';
const TYPED_SOURCE_REF = 'main';
const TYPED_PROJECTOR_VERSION = 'r2-queue-mapper-v4';
const TYPED_INGEST_PATH = '/api/foundation/ingest/typed';
const PUBLISHER_VERSION = 'publisher-v10';
const RESEARCH_BUNDLE_PREFIX = 'datasets/ds.business.research-bundles.derived/v1/';
const MAKE_MONEY_VIEW_PREFIX = 'views/make-money/v1/entities/';
const ENTITY_CORE_PREFIX = 'datasets/ds.business.entities.core/v1/entities/';
const JOURNAL_PREFIX = 'journal/v1/';
const ROTATION_INTERVAL_MS = 5 * 60 * 1000;
const WEBHOOK_PATH = '/github-webhook';
const EVENT_SCHEMA_VERSION = 'foundation-publisher-event.v1';
const EDITION_BATCH_CRON = '50 23,5,11 * * *';
const DIRECT_FALLBACK_LIMITS = Object.freeze({
  MAX_BUNDLES_PER_RUN: '1',
  MAX_BUNDLES_SCANNED_PER_RUN: '8',
  MAX_CANDIDATE_FILES_PER_RUN: '8',
  MAX_TYPED_SIDECARS_PER_RUN: '8',
  MAX_VIEW_REBUILD_STEPS_PER_RUN: '1',
  VIEW_REBUILD_PAGE_LIMIT: '1',
});

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validateJournalSchema = ajv.compile(journalEntrySchema);
const validatePlannedWritesSchema = ajv.compile(plannedWritesSchema);
const validateResearchBundleSchema = ajv.compile(researchBundleSchema);

const MAKE_MONEY_COVERAGE_DIMENSIONS = Object.freeze([
  'identity', 'founders', 'location', 'status', 'team_history', 'timeline',
  'revenue', 'peak_revenue', 'mrr_arr', 'gmv', 'gross_profit', 'operating_profit',
  'net_profit', 'costs', 'cost_breakdown', 'margin', 'owner_take_home', 'pricing',
  'pricing_history', 'refunds', 'retention_churn', 'funding', 'exit_value',
  'payer_receiver_purpose', 'customers', 'customer_pain', 'substitutes',
  'first_customers', 'initial_channel', 'breakout', 'current_channels',
  'founder_background', 'prior_failures', 'workload', 'support_burden',
  'outsourcing', 'automation', 'capital_required', 'technology',
  'competitors', 'dependencies', 'regulation', 'why_now',
  'provenance_rights', 'conflicts', 'additional_observations',
]);
const MAKE_MONEY_COVERAGE_DIMENSION_SET = new Set(MAKE_MONEY_COVERAGE_DIMENSIONS);
const COVERAGE_STATUSES = new Set([
  'found',
  'attempted_unavailable',
  'not_attempted',
  'not_applicable',
  'unknown',
]);
const MAX_BUNDLE_STRING_CHARS = 256_000;
const MAX_BUNDLE_ARRAY_ITEMS = 10_000;
const MAX_BUNDLE_OBJECT_PROPERTIES = 256;
const MAX_BUNDLE_NODES = 100_000;

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validatePayloadBounds(value, path, issues, state = { nodes: 0 }, depth = 0) {
  if (issues.length >= 20) return;
  state.nodes += 1;
  if (state.nodes > MAX_BUNDLE_NODES) {
    issues.push(`bundle contains more than ${MAX_BUNDLE_NODES} values`);
    return;
  }
  if (typeof value === 'string') {
    if (value.length > MAX_BUNDLE_STRING_CHARS) issues.push(`${path} exceeds ${MAX_BUNDLE_STRING_CHARS} characters`);
    return;
  }
  if (depth > 12) {
    issues.push(`${path} is nested too deeply`);
    return;
  }
  if (Array.isArray(value)) {
    if (value.length > MAX_BUNDLE_ARRAY_ITEMS) issues.push(`${path} contains more than ${MAX_BUNDLE_ARRAY_ITEMS} items`);
    value.slice(0, MAX_BUNDLE_ARRAY_ITEMS).forEach((item, index) => validatePayloadBounds(item, `${path}[${index}]`, issues, state, depth + 1));
    return;
  }
  if (isObject(value)) {
    const entries = Object.entries(value);
    if (entries.length > MAX_BUNDLE_OBJECT_PROPERTIES) issues.push(`${path} contains more than ${MAX_BUNDLE_OBJECT_PROPERTIES} properties`);
    entries.slice(0, MAX_BUNDLE_OBJECT_PROPERTIES).forEach(([key, item]) => validatePayloadBounds(item, `${path}.${key}`, issues, state, depth + 1));
  }
}

function requiredTrimmedString(value, path) {
  return typeof value === 'string' && value.trim() ? null : `${path} is required`;
}

function researchBundleStructuralError(bundle) {
  const subjectError = requiredTrimmedString(bundle.subject?.query, 'subject.query');
  if (subjectError) return subjectError;
  const agentError = requiredTrimmedString(bundle.agent?.name, 'agent.name');
  if (agentError) return agentError;

  const sources = Array.isArray(bundle.sources) ? bundle.sources : [];
  for (const [index, source] of sources.entries()) {
    if (!/^src\.[a-z0-9][a-z0-9._-]*$/.test(source.source_id)) return `sources[${index}].source_id is invalid`;
    for (const field of ['provider_name', 'source_type']) {
      const error = requiredTrimmedString(source[field], `sources[${index}].${field}`);
      if (error) return error;
    }
  }

  const evidence = Array.isArray(bundle.evidence) ? bundle.evidence : [];
  for (const [index, item] of evidence.entries()) {
    if (!/^src\.[a-z0-9][a-z0-9._-]*$/.test(item.source_id)) return `evidence[${index}].source_id is invalid`;
  }

  const requiredFields = [
    ['entities', ['entity_type', 'canonical_name']],
    ['claims', ['statement']],
    ['metrics', ['entity_id', 'metric_type']],
    ['money_signals', ['purpose', 'money_type']],
    ['events', ['event_type', 'description']],
    ['relationships', ['subject_entity_id', 'predicate', 'object']],
    ['derived', ['derived_type']],
  ];
  for (const [collection, fields] of requiredFields) {
    const records = Array.isArray(bundle[collection]) ? bundle[collection] : [];
    for (const [index, record] of records.entries()) {
      for (const field of fields) {
        const error = requiredTrimmedString(record[field], `${collection}[${index}].${field}`);
        if (error) return error;
      }
    }
  }
  return null;
}

function isFoundationDateTime(value) {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
    !Number.isNaN(Date.parse(value))
  );
}

function nullableDateTimeError(record, key, path, required = false) {
  if (required && !Object.prototype.hasOwnProperty.call(record, key)) return `${path}.${key} is required`;
  if (record[key] !== undefined && record[key] !== null && !isFoundationDateTime(record[key])) {
    return `${path}.${key} must be an ISO date-time or null`;
  }
  return null;
}

function requiredNullableFieldsError(record, path, fields) {
  for (const field of fields) {
    if (!Object.prototype.hasOwnProperty.call(record, field)) return `${path}.${field} is required`;
    if (record[field] !== null && typeof record[field] !== 'string') return `${path}.${field} must be a string or null`;
  }
  return null;
}

function researchBundleSemanticError(bundle) {
  if (!isFoundationDateTime(bundle.retrieved_at)) return 'retrieved_at must be an ISO date-time';

  const evidence = Array.isArray(bundle.evidence) ? bundle.evidence : [];
  for (const [index, item] of evidence.entries()) {
    for (const field of ['published_at', 'retrieved_at']) {
      const error = nullableDateTimeError(item, field, `evidence[${index}]`, field === 'published_at' || field === 'retrieved_at');
      if (error) return error;
    }
  }

  const entities = Array.isArray(bundle.entities) ? bundle.entities : [];
  for (const [index, item] of entities.entries()) {
    const error = nullableDateTimeError(item, 'observed_at', `entities[${index}]`, true);
    if (error) return error;
  }

  const claims = Array.isArray(bundle.claims) ? bundle.claims : [];
  for (const [index, item] of claims.entries()) {
    for (const field of ['occurred_at', 'valid_from', 'valid_to']) {
      const error = nullableDateTimeError(item, field, `claims[${index}]`);
      if (error) return error;
    }
  }

  const metrics = Array.isArray(bundle.metrics) ? bundle.metrics : [];
  for (const [index, item] of metrics.entries()) {
    const path = `metrics[${index}]`;
    if (!(
      (typeof item.value === 'number' && Number.isFinite(item.value)) ||
      (typeof item.value === 'string' && item.value.trim().length > 0)
    )) return `${path}.value must be a finite number or non-empty string`;
    const fieldError = requiredNullableFieldsError(item, path, ['unit', 'currency', 'basis', 'scope']);
    if (fieldError) return fieldError;
    for (const field of ['period_start', 'period_end', 'point_in_time']) {
      const error = nullableDateTimeError(item, field, path, true);
      if (error) return error;
    }
  }

  const moneySignals = Array.isArray(bundle.money_signals) ? bundle.money_signals : [];
  for (const [index, item] of moneySignals.entries()) {
    const path = `money_signals[${index}]`;
    if (item.amount !== null && !(
      (typeof item.amount === 'number' && Number.isFinite(item.amount)) ||
      (typeof item.amount === 'string' && item.amount.trim().length > 0)
    )) return `${path}.amount must be a finite number, non-empty string, or null`;
    const fieldError = requiredNullableFieldsError(item, path, ['currency', 'unit', 'amount_label', 'basis', 'scope']);
    if (fieldError) return fieldError;
    for (const field of ['period_start', 'period_end', 'point_in_time']) {
      const error = nullableDateTimeError(item, field, path, true);
      if (error) return error;
    }
  }

  const events = Array.isArray(bundle.events) ? bundle.events : [];
  for (const [index, item] of events.entries()) {
    const error = nullableDateTimeError(item, 'occurred_at', `events[${index}]`, true);
    if (error) return error;
  }

  const relationships = Array.isArray(bundle.relationships) ? bundle.relationships : [];
  for (const [index, item] of relationships.entries()) {
    for (const field of ['valid_from', 'valid_to']) {
      const error = nullableDateTimeError(item, field, `relationships[${index}]`);
      if (error) return error;
    }
  }

  const derived = Array.isArray(bundle.derived) ? bundle.derived : [];
  for (const [index, item] of derived.entries()) {
    const error = nullableDateTimeError(item, 'created_at', `derived[${index}]`);
    if (error) return error;
  }
  return null;
}

function jsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value, null, 2), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

function encodeUtf8(value) {
  return new TextEncoder().encode(value);
}

function normalizedJsonText(value) {
  if (typeof value === 'string') return JSON.stringify(JSON.parse(value));
  return JSON.stringify(value);
}

async function sha256Hex(value) {
  const bytes = typeof value === 'string' ? encodeUtf8(value) : value;
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function hmacSha256Hex(secret, value) {
  const key = await crypto.subtle.importKey(
    'raw',
    encodeUtf8(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encodeUtf8(value));
  return [...new Uint8Array(signature)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function constantTimeEqual(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string' || left.length !== right.length) {
    return false;
  }
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

async function verifyGithubWebhookSignature(secret, body, signatureHeader) {
  if (!secret?.trim() || typeof signatureHeader !== 'string' || !signatureHeader.startsWith('sha256=')) {
    return false;
  }
  const expected = `sha256=${await hmacSha256Hex(secret, body)}`;
  return constantTimeEqual(expected, signatureHeader.toLowerCase());
}

function expectedRepository(env) {
  return `${env.GITHUB_OWNER}/${env.GITHUB_REPO}`;
}

function expectedGithubRef(env) {
  return `refs/heads/${env.GITHUB_REF}`;
}

function batchIdForScheduledTime(scheduledTime) {
  return `batch_${new Date(scheduledTime).toISOString().replace(/[^0-9]/g, '')}`;
}

function validBatchId(value) {
  return typeof value === 'string' && /^batch_[A-Za-z0-9_.:-]+$/.test(value);
}

function parsePublisherEvent(value) {
  if (!isObject(value)) return null;
  if (value.schema_version !== EVENT_SCHEMA_VERSION || value.type !== 'reconcile') return null;
  if (typeof value.delivery_id !== 'string' || !value.delivery_id.trim()) return null;
  if (typeof value.received_at !== 'string' || Number.isNaN(Date.parse(value.received_at))) return null;
  if (!validBatchId(value.batch_id) || typeof value.idempotency_key !== 'string' || !value.idempotency_key.trim()) return null;
  if (value.reason === 'github_push') return null;
  const continuationDepth = Number(value.continuation_depth || 0);
  const cycleOffset = Number(value.cycle_offset || 0);
  const historicalCoverage = Number(value.historical_coverage || 0);
  if (![continuationDepth, cycleOffset, historicalCoverage].every(Number.isFinite)) return null;
  if ([continuationDepth, cycleOffset, historicalCoverage].some((item) => item < 0)) return null;
  const producerCostHint = isObject(value.producer_cost_hint)
    ? {
      message_bytes: Math.floor(Math.max(0, Number(value.producer_cost_hint.message_bytes) || 0)),
      write_operations: Math.floor(Math.max(0, Number(value.producer_cost_hint.write_operations) || 0)),
      messages_written: Math.floor(Math.max(0, Number(value.producer_cost_hint.messages_written) || 0)),
    }
    : null;
  return {
    schema_version: EVENT_SCHEMA_VERSION,
    type: 'reconcile',
    delivery_id: value.delivery_id,
    received_at: value.received_at,
    before: typeof value.before === 'string' ? value.before : null,
    after: typeof value.after === 'string' ? value.after : null,
    reason: typeof value.reason === 'string' ? value.reason : 'github_push',
    continuation_depth: Math.floor(continuationDepth),
    cycle_offset: Math.floor(cycleOffset),
    historical_coverage: Math.floor(historicalCoverage),
    batch_id: value.batch_id,
    idempotency_key: value.idempotency_key,
    input_watermark: typeof value.input_watermark === 'string' ? value.input_watermark : null,
    producer_cost_hint: producerCostHint,
  };
}

function maxEventContinuations(env) {
  return Math.min(Math.max(Number(env.MAX_EVENT_CONTINUATIONS) || 100, 1), 500);
}

function eventTriggerTime(event) {
  return Date.parse(event.received_at);
}

function continuationProgress(summary) {
  const guaranteedFresh = Number(summary?.scan_window?.guaranteed_fresh_files || 0);
  return Math.max(1, Number(summary?.candidate_files_scanned || 0) - guaranteedFresh);
}

function needsContinuation(event, summary, env) {
  const totalHistorical = Math.max(
    0,
    Number(summary?.candidate_files_discovered || 0) -
      Number(summary?.scan_window?.guaranteed_fresh_files || 0)
  );
  const progress = continuationProgress(summary);
  const nextCoverage = event.historical_coverage + progress;
  return {
    progress,
    nextCoverage,
    shouldContinue:
      event.continuation_depth < maxEventContinuations(env) &&
      (
        nextCoverage < totalHistorical ||
        (
          Number(summary?.attempted || 0) >= Number(summary?.publish_budget || 1) &&
          Number(summary?.published || 0) > 0
        )
      ),
  };
}

function classifyPublisherOutcome(summary) {
  if (
    summary?.queue_discovery_error ||
    summary?.typed_discovery_error ||
    summary?.view_backfill_error ||
    Number(summary?.candidate_quarantine_write_failures || 0) > 0 ||
    Number(summary?.typed_hold_write_failures || 0) > 0 ||
    Number(summary?.typed_complete_write_failures || 0) > 0
  ) {
    return 'infrastructure_failure';
  }
  if (
    Number(summary?.failed || 0) > 0 ||
    Number(summary?.file_failures || 0) > 0 ||
    Number(summary?.typed_delivery_failures || 0) > 0
  ) {
    return 'candidate_failure';
  }
  return 'clean';
}

async function enqueueReconcile(env, event) {
  if (!env.PUBLISH_EVENTS || typeof env.PUBLISH_EVENTS.send !== 'function') {
    throw new Error('PUBLISH_EVENTS queue binding is required');
  }
  let enriched = { ...event };
  let previous = '';
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const serialized = JSON.stringify(enriched);
    const nextHint = {
      message_bytes: new TextEncoder().encode(serialized).byteLength,
      write_operations: queueOperationUnits(serialized),
      messages_written: 1,
    };
    const next = JSON.stringify({ ...event, producer_cost_hint: nextHint });
    enriched = { ...event, producer_cost_hint: nextHint };
    if (next === previous) break;
    previous = next;
  }
  await env.PUBLISH_EVENTS.send(enriched);
  console.log('[foundation-publisher] queue message scheduled', {
    delivery_id: enriched.delivery_id,
    queue_write_operations: enriched.producer_cost_hint.write_operations,
    message_bytes: enriched.producer_cost_hint.message_bytes,
  });
  return enriched;
}

function isQueueWriteLimitError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return /daily write operations limit|Queues free tier/i.test(message);
}

function directFallbackEnvironment(env) {
  return { ...env, ...DIRECT_FALLBACK_LIMITS };
}

async function handleGithubWebhook(request, env, ctx) {
  if (!env.GITHUB_WEBHOOK_SECRET?.trim()) {
    return jsonResponse({ error: 'webhook_not_configured' }, 503);
  }

  const body = await request.text();
  const signature = request.headers.get('x-hub-signature-256');
  if (!(await verifyGithubWebhookSignature(env.GITHUB_WEBHOOK_SECRET, body, signature))) {
    return jsonResponse({ error: 'invalid_signature' }, 401);
  }

  const githubEvent = request.headers.get('x-github-event');
  if (githubEvent === 'ping') {
    return jsonResponse({ ok: true, event: 'ping', version: PUBLISHER_VERSION });
  }
  if (githubEvent !== 'push') {
    return jsonResponse({ ok: true, ignored: 'non_push_event' }, 202);
  }

  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    return jsonResponse({ error: 'invalid_json' }, 400);
  }

  if (
    payload?.repository?.full_name !== expectedRepository(env) ||
    payload?.ref !== expectedGithubRef(env)
  ) {
    return jsonResponse({ ok: true, ignored: 'unexpected_repository_or_ref' }, 202);
  }

  const deliveryId = request.headers.get('x-github-delivery') || crypto.randomUUID();
  // GitHub remains a notification/health signal only.  Publication is
  // deliberately edition-batched so one push cannot wake a Worker and Queue
  // for every upstream write.  The scheduled handler below owns the single
  // reconciliation event for each 08:50/14:50/20:50 JST edition.
  return jsonResponse({
    ok: true,
    deferred: true,
    delivery_id: deliveryId,
    reason: 'edition_batch_schedule',
    version: PUBLISHER_VERSION,
  }, 202);
}

function isoParts(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid date-time: ${value}`);
  return {
    year: String(date.getUTCFullYear()).padStart(4, '0'),
    month: String(date.getUTCMonth() + 1).padStart(2, '0'),
    day: String(date.getUTCDate()).padStart(2, '0'),
  };
}

function createTelemetry() {
  return {
    provider_calls: {
      github_api_get: 0,
      make_money_http_fetch: 0,
      publisher_r2_head: 0,
      publisher_r2_get: 0,
      publisher_r2_put: 0,
      downstream_r2_head_bucket: 0,
      downstream_r2_get_object: 0,
      downstream_r2_put_object: 0,
    },
    mutation_counts: {
      publisher_journal_put: 0,
      downstream_put_object: 0,
      downstream_copy_object: 0,
      downstream_delete_object: 0,
      downstream_move: 0,
      downstream_rename: 0,
      downstream_overwrite: 0,
      downstream_legacy_universal: 0,
      downstream_bucket_or_config: 0,
      make_money_view_created: 0,
      make_money_view_updated: 0,
      make_money_view_unchanged: 0,
    },
    cost: null,
  };
}

function snapshotTelemetry(telemetry) {
  return JSON.parse(JSON.stringify(telemetry));
}

function addNumber(target, key, value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    target[key] = (target[key] || 0) + value;
  }
}

function accumulateDownstreamTelemetry(telemetry, payload) {
  if (!isObject(payload)) return;

  const provider = isObject(payload.provider_calls) ? payload.provider_calls : null;
  if (provider) {
    addNumber(telemetry.provider_calls, 'downstream_r2_head_bucket', provider.head_bucket);
    addNumber(telemetry.provider_calls, 'downstream_r2_get_object', provider.get_object);
    addNumber(telemetry.provider_calls, 'downstream_r2_put_object', provider.put_object);
    addAttributedR2Usage(telemetry.cost, {
      class_a_operations: provider.put_object,
      class_b_operations: Number(provider.head_bucket || 0) + Number(provider.get_object || 0),
    });
  }

  const mutations = isObject(payload.mutation_counts) ? payload.mutation_counts : null;
  if (mutations) {
    addNumber(telemetry.mutation_counts, 'downstream_put_object', mutations.put_object);
    addNumber(telemetry.mutation_counts, 'downstream_copy_object', mutations.copy_object);
    addNumber(telemetry.mutation_counts, 'downstream_delete_object', mutations.delete_object);
    addNumber(telemetry.mutation_counts, 'downstream_move', mutations.move);
    addNumber(telemetry.mutation_counts, 'downstream_rename', mutations.rename);
    addNumber(telemetry.mutation_counts, 'downstream_overwrite', mutations.overwrite);
    addNumber(telemetry.mutation_counts, 'downstream_legacy_universal', mutations.legacy_universal);
    addNumber(telemetry.mutation_counts, 'downstream_bucket_or_config', mutations.bucket_or_config);
  }

  const view = isObject(payload.view_projection) ? payload.view_projection : null;
  if (view) {
    addNumber(telemetry.mutation_counts, 'make_money_view_created', view.created);
    addNumber(telemetry.mutation_counts, 'make_money_view_updated', view.updated);
    addNumber(telemetry.mutation_counts, 'make_money_view_unchanged', view.unchanged);
  }

  addNumber(telemetry.mutation_counts, 'make_money_view_created', payload.view_created);
  addNumber(telemetry.mutation_counts, 'make_money_view_updated', payload.view_updated);
  addNumber(telemetry.mutation_counts, 'make_money_view_unchanged', payload.view_unchanged);
}

async function r2Head(telemetry, bucket, key) {
  telemetry.provider_calls.publisher_r2_head += 1;
  const result = await bucket.head(key);
  recordR2Operation(telemetry.cost, 'head');
  return result;
}

async function r2Get(telemetry, bucket, key) {
  telemetry.provider_calls.publisher_r2_get += 1;
  const result = await bucket.get(key);
  recordR2Operation(telemetry.cost, 'get', { bytes: result?.size || 0 });
  return result;
}

async function r2Put(telemetry, bucket, key, value, options) {
  telemetry.provider_calls.publisher_r2_put += 1;
  recordR2Operation(telemetry.cost, 'put', { bytes: value?.byteLength || 0 });
  return bucket.put(key, value, options);
}

async function githubJson(env, path, telemetry) {
  telemetry.provider_calls.github_api_get += 1;
  recordExternalRequest(telemetry.cost, 'github_api');
  const response = await fetch(`${GITHUB_API}${path}`, {
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${env.FOUNDATION_GITHUB_TOKEN}`,
      'user-agent': 'foundation-r2-queue-publisher',
      'x-github-api-version': '2022-11-28',
    },
  });
  if (!response.ok) {
    throw new Error(`GitHub ${response.status}: ${await response.text()}`);
  }
  return response.json();
}

function decodeBase64Utf8(value) {
  const normalized = value.replace(/\s+/g, '');
  const binary = atob(normalized);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function fetchGithubBlobText(env, blobSha, telemetry) {
  const owner = encodeURIComponent(env.GITHUB_OWNER);
  const repo = encodeURIComponent(env.GITHUB_REPO);
  const content = await githubJson(
    env,
    `/repos/${owner}/${repo}/git/blobs/${encodeURIComponent(blobSha)}`,
    telemetry
  );
  if (content?.encoding !== 'base64' || typeof content.content !== 'string') {
    throw new Error(`Unsupported GitHub blob response for ${blobSha}`);
  }
  return decodeBase64Utf8(content.content);
}

function parseCandidateFile(text) {
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    return {
      bundles: [],
      skipped: [{
        index: 0,
        run_id: null,
        reason_code: 'MALFORMED_IMMUTABLE_CANDIDATE',
        reason: 'candidate file is not valid JSON',
      }],
    };
  }
  const values = Array.isArray(value) ? value : [value];
  const bundles = [];
  const skipped = [];

  for (const [index, item] of values.entries()) {
    const rejection = candidateSkipReason(item);
    if (rejection) {
      skipped.push({
        index,
        run_id: isObject(item) && typeof item.run_id === 'string' ? item.run_id : null,
        ...rejection,
      });
      continue;
    }

    bundles.push(item);
  }

  return { bundles, skipped };
}

function isPublisherCandidatePath(path) {
  return (
    typeof path === 'string' &&
    path.startsWith(CANDIDATE_V2_PREFIX) &&
    path.endsWith('.json')
  );
}

async function listCandidateFiles(env, telemetry) {
  const owner = encodeURIComponent(env.GITHUB_OWNER);
  const repo = encodeURIComponent(env.GITHUB_REPO);
  const branch = await githubJson(
    env,
    `/repos/${owner}/${repo}/branches/${encodeURIComponent(env.GITHUB_REF)}`,
    telemetry
  );
  const treeSha = branch?.commit?.commit?.tree?.sha;
  if (!treeSha) throw new Error('GitHub branch tree SHA is unavailable');

  const tree = await githubJson(
    env,
    `/repos/${owner}/${repo}/git/trees/${encodeURIComponent(treeSha)}?recursive=1`,
    telemetry
  );
  if (tree?.truncated) {
    throw new Error('GitHub recursive tree was truncated; queue enumeration would be incomplete');
  }

  return {
    source_commit_sha: typeof branch?.commit?.sha === 'string' ? branch.commit.sha : null,
    tree_sha: treeSha,
    files: (tree?.tree || [])
      .filter((item) =>
        item?.type === 'blob' &&
        isPublisherCandidatePath(item.path) &&
        typeof item.sha === 'string'
      )
      .map((item) => ({ path: item.path, sha: item.sha }))
      .sort((left, right) => right.path.localeCompare(left.path)),
  };
}

/**
 * Reserve part of each bounded scan for newest work and rotate the remainder
 * through the historical backlog. With a stable backlog every file is reached;
 * when new files arrive, fresh work is still seen immediately.
 */
function selectCandidateFiles(allFiles, triggerTime, maxFiles, maxPublishes = Number.POSITIVE_INFINITY) {
  if (allFiles.length === 0) {
    return {
      files: [],
      strategy: {
        mode: 'empty',
        guaranteed_fresh_files: 0,
        rotating_budget: 0,
        rotating_start_index: 0,
        rotating_pool_size: 0,
        bundle_rotation_period: 1,
      },
    };
  }

  const cycle = Math.floor(triggerTime / ROTATION_INTERVAL_MS);

  // With a single publish slot, pinning the newest file would let one
  // permanently failing fresh bundle starve the entire backlog. Rotate the
  // complete queue so every file eventually owns the first/only attempt.
  if (maxPublishes <= 1) {
    const selectedCount = Math.min(maxFiles, allFiles.length);
    const start = cycle % allFiles.length;
    const rotated = [];
    for (let index = 0; index < selectedCount; index += 1) {
      rotated.push(allFiles[(start + index) % allFiles.length]);
    }
    return {
      files: rotated,
      strategy: {
        mode: 'full_queue_rotation_single_publish_slot',
        guaranteed_fresh_files: 0,
        rotating_budget: selectedCount,
        rotating_start_index: start,
        rotating_pool_size: allFiles.length,
        bundle_rotation_period: Math.max(1, allFiles.length),
        cycle,
      },
    };
  }

  // For normal multi-slot runs keep the newest file visible, while rotating
  // all historical files even when the queue fits inside maxFiles.
  const newest = allFiles[0];
  const pool = allFiles.slice(1);
  const rotatingBudget = Math.min(Math.max(0, maxFiles - 1), pool.length);
  const start = pool.length > 0 ? cycle % pool.length : 0;
  const rotated = [];

  for (let index = 0; index < rotatingBudget; index += 1) {
    rotated.push(pool[(start + index) % pool.length]);
  }

  return {
    files: [newest, ...rotated],
    strategy: {
      mode:
        allFiles.length <= maxFiles
          ? 'newest_plus_full_order_rotation'
          : 'newest_plus_bounded_queue_rotation',
      guaranteed_fresh_files: 1,
      rotating_budget: rotatingBudget,
      rotating_start_index: start,
      rotating_pool_size: pool.length,
      // Advance a file's bundle phase only after a complete historical-file
      // sweep. This decouples the two rotations and prevents modular aliasing.
      bundle_rotation_period: Math.max(1, pool.length),
      cycle,
    },
  };
}

async function fetchCandidateFile(env, file, telemetry) {
  return parseCandidateFile(await fetchGithubBlobText(env, file.sha, telemetry));
}


function isTypedRecordSetPath(path) {
  return (
    typeof path === 'string' &&
    path.startsWith(TYPED_RECORD_SET_PREFIX) &&
    path.endsWith('-typed-record-set-v1.json')
  );
}

function legacyCandidateSourceBlob(path) {
  if (typeof path !== 'string') return null;
  const match = /^staging\/r2-queue\/candidates\/v2\/([a-f0-9]{40})\//.exec(path);
  return match ? match[1] : null;
}

async function listTypedSidecarFiles(env, telemetry) {
  const owner = encodeURIComponent(env.GITHUB_OWNER);
  const repo = encodeURIComponent(env.GITHUB_REPO);
  const branch = await githubJson(
    env,
    `/repos/${owner}/${repo}/branches/${encodeURIComponent(TYPED_SOURCE_REF)}`,
    telemetry
  );
  const treeSha = branch?.commit?.commit?.tree?.sha;
  const sourceCommitSha = typeof branch?.commit?.sha === 'string' ? branch.commit.sha : null;
  if (!treeSha || !sourceCommitSha) {
    throw new Error('Typed source GitHub branch/tree SHA is unavailable');
  }

  const tree = await githubJson(
    env,
    `/repos/${owner}/${repo}/git/trees/${encodeURIComponent(treeSha)}?recursive=1`,
    telemetry
  );
  if (tree?.truncated) {
    throw new Error('Typed source GitHub recursive tree was truncated; discovery would be incomplete');
  }

  const treeByPath = new Map();
  const files = [];
  for (const item of tree?.tree || []) {
    if (item?.type !== 'blob' || typeof item.path !== 'string' || typeof item.sha !== 'string') continue;
    treeByPath.set(item.path, item.sha);
    if (isTypedRecordSetPath(item.path)) files.push({ path: item.path, sha: item.sha });
  }
  files.sort((left, right) => right.path.localeCompare(left.path));

  return {
    source_commit_sha: sourceCommitSha,
    tree_sha: treeSha,
    tree_by_path: treeByPath,
    files,
  };
}

function parseJsonObject(text) {
  try {
    const value = JSON.parse(text);
    return isObject(value) ? value : null;
  } catch {
    return null;
  }
}

async function typedHoldKey(file) {
  const identity = await sha256Hex(
    `${file.path}\u0000${file.sha}\u0000${TYPED_PROJECTOR_VERSION}`
  );
  return `${TYPED_HOLD_PREFIX}${identity}.json`;
}

async function typedCompleteKey(file) {
  const identity = await sha256Hex(
    `${file.path}\u0000${file.sha}\u0000${TYPED_PROJECTOR_VERSION}`
  );
  return `${TYPED_COMPLETE_PREFIX}${identity}.json`;
}

async function readTypedCompletion(env, file, telemetry) {
  const key = await typedCompleteKey(file);
  const object = await r2Get(telemetry, env.FOUNDATION_R2_LAKE, key);
  if (!object) return null;
  let value;
  try {
    value = JSON.parse(await object.text());
  } catch {
    throw new Error(`Typed completion marker is not valid JSON: ${key}`);
  }
  if (
    value?.schema_version !== 'publisher-typed-complete.v1' ||
    value?.status !== 'COMPLETE' ||
    value?.input_kind !== 'typed_record_set.v1' ||
    value?.typed_record_set_path !== file.path ||
    value?.typed_record_set_blob_sha !== file.sha ||
    value?.mapper_version !== TYPED_PROJECTOR_VERSION ||
    typeof value?.bundle_run_id !== 'string'
  ) {
    throw new Error(`Typed completion marker identity mismatch: ${key}`);
  }
  return { key, value };
}

async function writeTypedCompletion(
  env,
  telemetry,
  { file, sourceCommitSha, bundleRunId, coverageAssessment }
) {
  const key = await typedCompleteKey(file);
  const existing = await readTypedCompletion(env, file, telemetry);
  if (existing) {
    if (existing.value.bundle_run_id !== bundleRunId) {
      throw new Error(`Typed completion marker run mismatch: ${key}`);
    }
    return { status: 'EXISTS_IDENTICAL', key };
  }

  const bodyObject = {
    schema_version: 'publisher-typed-complete.v1',
    status: 'COMPLETE',
    input_kind: 'typed_record_set.v1',
    mapper_version: TYPED_PROJECTOR_VERSION,
    coverage_assessment: coverageAssessment || 'UNASSESSED',
    source_repository: `${env.GITHUB_OWNER}/${env.GITHUB_REPO}`,
    source_ref: TYPED_SOURCE_REF,
    first_source_commit_sha: sourceCommitSha,
    typed_record_set_path: file.path,
    typed_record_set_blob_sha: file.sha,
    bundle_run_id: bundleRunId,
  };
  const body = encodeUtf8(JSON.stringify(bodyObject));
  const bodySha = await sha256Hex(body);
  const created = await r2Put(telemetry, env.FOUNDATION_R2_LAKE, key, body, {
    onlyIf: { etagDoesNotMatch: '*' },
    httpMetadata: { contentType: 'application/json; charset=utf-8' },
    customMetadata: {
      'foundation-schema-version': 'publisher-typed-complete.v1',
      'typed-record-set-path': file.path,
      'typed-record-set-blob-sha': file.sha,
      'foundation-run-id': bundleRunId,
      'foundation-sha256': bodySha,
    },
  });
  if (!created) {
    const raced = await readTypedCompletion(env, file, telemetry);
    if (raced?.value?.bundle_run_id === bundleRunId) {
      return { status: 'EXISTS_IDENTICAL', key };
    }
    throw new Error(`Typed completion conditional create failed: ${key}`);
  }

  const readback = await r2Get(telemetry, env.FOUNDATION_R2_LAKE, key);
  if (!readback) throw new Error(`Typed completion marker missing after write: ${key}`);
  const readbackBytes = new Uint8Array(await readback.arrayBuffer());
  if (await sha256Hex(readbackBytes) !== bodySha) {
    throw new Error(`Typed completion marker readback verification failed: ${key}`);
  }
  return { status: 'CREATED', key };
}

async function readTypedInputHold(env, file, telemetry) {
  const key = await typedHoldKey(file);
  const object = await r2Get(telemetry, env.FOUNDATION_R2_LAKE, key);
  if (!object) return null;
  let value;
  try {
    value = JSON.parse(await object.text());
  } catch {
    throw new Error(`Typed HOLD marker is not valid JSON: ${key}`);
  }
  if (
    value?.schema_version !== 'publisher-input-hold.v1' ||
    value?.status !== 'HOLD' ||
    value?.input_kind !== 'typed_record_set.v1' ||
    value?.typed_record_set_path !== file.path ||
    value?.typed_record_set_blob_sha !== file.sha ||
    value?.mapper_version !== TYPED_PROJECTOR_VERSION
  ) {
    throw new Error(`Typed HOLD marker identity mismatch: ${key}`);
  }
  return { key, value };
}

async function writeTypedInputHold(
  env,
  telemetry,
  { file, sourceCommitSha, reasonCode, reason, details = null }
) {
  const key = await typedHoldKey(file);
  const existing = await readTypedInputHold(env, file, telemetry);
  if (existing) return { status: 'EXISTS_IDENTICAL', key };

  const bodyObject = {
    schema_version: 'publisher-input-hold.v1',
    status: 'HOLD',
    input_kind: 'typed_record_set.v1',
    reason_code: reasonCode,
    reason,
    mapper_version: TYPED_PROJECTOR_VERSION,
    source_repository: `${env.GITHUB_OWNER}/${env.GITHUB_REPO}`,
    source_ref: TYPED_SOURCE_REF,
    first_source_commit_sha: sourceCommitSha,
    typed_record_set_path: file.path,
    typed_record_set_blob_sha: file.sha,
    details,
  };
  const body = encodeUtf8(JSON.stringify(bodyObject));
  const bodySha = await sha256Hex(body);
  const created = await r2Put(telemetry, env.FOUNDATION_R2_LAKE, key, body, {
    onlyIf: { etagDoesNotMatch: '*' },
    httpMetadata: { contentType: 'application/json; charset=utf-8' },
    customMetadata: {
      'foundation-schema-version': 'publisher-input-hold.v1',
      'typed-record-set-path': file.path,
      'typed-record-set-blob-sha': file.sha,
      'foundation-sha256': bodySha,
    },
  });
  if (!created) {
    const raced = await readTypedInputHold(env, file, telemetry);
    if (raced) return { status: 'EXISTS_IDENTICAL', key };
    throw new Error(`Typed HOLD conditional create failed: ${key}`);
  }

  const readback = await r2Get(telemetry, env.FOUNDATION_R2_LAKE, key);
  if (!readback) throw new Error(`Typed HOLD missing after write: ${key}`);
  const readbackBytes = new Uint8Array(await readback.arrayBuffer());
  if (await sha256Hex(readbackBytes) !== bodySha) {
    throw new Error(`Typed HOLD readback verification failed: ${key}`);
  }
  return { status: 'CREATED', key };
}

async function prepareTypedDelivery(env, inventory, file, telemetry) {
  const sidecarText = await fetchGithubBlobText(env, file.sha, telemetry);
  const sidecar = parseJsonObject(sidecarText);
  if (!sidecar) {
    return {
      terminal: true,
      reason_code: 'SOURCE_JSON_INVALID',
      reason: 'typed sidecar is not a JSON object',
    };
  }

  const sourceArtifact = isObject(sidecar.source_artifact) ? sidecar.source_artifact : null;
  const sourceRunId = typeof sidecar.source_run_id === 'string' ? sidecar.source_run_id : null;
  const subjectRef = typeof sidecar.subject_ref === 'string' ? sidecar.subject_ref : null;
  const lane = sourceArtifact && typeof sourceArtifact.lane === 'string' ? sourceArtifact.lane : null;
  const artifactPath = sourceArtifact && typeof sourceArtifact.path === 'string' ? sourceArtifact.path : null;
  const artifactBlob = sourceArtifact && typeof sourceArtifact.blob_sha === 'string' ? sourceArtifact.blob_sha : null;

  if (
    !sourceRunId ||
    !subjectRef ||
    !lane ||
    !artifactPath ||
    !/^[a-f0-9]{40}$/.test(artifactBlob || '') ||
    !file.path.startsWith(`${TYPED_RECORD_SET_PREFIX}${lane}/`) ||
    !file.path.includes(`/${sourceRunId}/`)
  ) {
    return {
      terminal: true,
      reason_code: 'IDENTITY_MISMATCH',
      reason: 'typed sidecar identity fields are incomplete or inconsistent with its path',
    };
  }

  if (inventory.tree_by_path.get(file.path) !== file.sha) {
    return {
      terminal: true,
      reason_code: 'SIDECAR_BLOB_MISMATCH',
      reason: 'typed sidecar path/blob does not match the pinned main tree',
    };
  }
  if (inventory.tree_by_path.get(artifactPath) !== artifactBlob) {
    return {
      terminal: true,
      reason_code: 'SOURCE_ARTIFACT_MISMATCH',
      reason: 'source artifact path/blob does not match the pinned main tree',
    };
  }

  const sourceArtifactText = await fetchGithubBlobText(env, artifactBlob, telemetry);
  return {
    terminal: false,
    source_run_id: sourceRunId,
    subject_ref: subjectRef,
    lane,
    request_body: {
      write_authorized: true,
      source: {
        repository: `${env.GITHUB_OWNER}/${env.GITHUB_REPO}`,
        source_ref: TYPED_SOURCE_REF,
        source_commit_sha: inventory.source_commit_sha,
        typed_record_set_path: file.path,
        typed_record_set_blob_sha: file.sha,
        source_artifact_path: artifactPath,
        source_artifact_blob_sha: artifactBlob,
      },
      typed_record_set_text: sidecarText,
      source_artifact_text: sourceArtifactText,
    },
  };
}

async function ingestTypedSidecar(env, telemetry, prepared) {
  return serviceFetch(env, telemetry, TYPED_INGEST_PATH, prepared.request_body);
}

async function candidateQuarantineKey(file) {
  const identity = await sha256Hex(`${file.path}\u0000${file.sha}`);
  return `${CANDIDATE_QUARANTINE_PREFIX}${identity}.json`;
}

async function candidateQuarantineExists(env, file, telemetry) {
  const key = await candidateQuarantineKey(file);
  return Boolean(await r2Head(telemetry, env.FOUNDATION_R2_LAKE, key));
}

async function writeCandidateQuarantine(env, file, skipped, telemetry) {
  const key = await candidateQuarantineKey(file);
  const existing = await r2Head(telemetry, env.FOUNDATION_R2_LAKE, key);
  if (existing) return false;

  const body = encodeUtf8(JSON.stringify({
    schema_version: 'publisher-candidate-quarantine.v1',
    candidate_path: file.path,
    candidate_blob_sha: file.sha,
    reason_code: 'TERMINAL_INVALID_CANDIDATE',
    skipped,
    recorded_at: new Date().toISOString(),
  }));
  const created = await r2Put(telemetry, env.FOUNDATION_R2_LAKE, key, body, {
    onlyIf: { etagDoesNotMatch: '*' },
    httpMetadata: { contentType: 'application/json; charset=utf-8' },
    customMetadata: {
      'foundation-schema-version': 'publisher-candidate-quarantine.v1',
      'candidate-path': file.path,
      'candidate-blob-sha': file.sha,
    },
  });
  if (!created) return false;

  const readback = await r2Get(telemetry, env.FOUNDATION_R2_LAKE, key);
  if (!readback) throw new Error(`Candidate quarantine marker missing after write: ${key}`);
  const readbackBytes = new Uint8Array(await readback.arrayBuffer());
  if (await sha256Hex(readbackBytes) !== await sha256Hex(body)) {
    throw new Error(`Candidate quarantine marker readback verification failed: ${key}`);
  }
  return true;
}

function bundleRotationSeed(fileSha) {
  const parsed = Number.parseInt(String(fileSha).slice(0, 8), 16);
  return Number.isFinite(parsed) ? parsed : 0;
}

function selectBundlesForFile(
  bundles,
  fileSha,
  triggerTime,
  maxBundles,
  bundleRotationPeriod = 1
) {
  if (bundles.length === 0 || maxBundles <= 0) {
    return {
      bundles: [],
      start_index: 0,
      total_in_file: bundles.length,
    };
  }

  const cycle = Math.floor(triggerTime / ROTATION_INTERVAL_MS);
  const period = Math.max(1, Math.floor(bundleRotationPeriod) || 1);
  const bundleEpoch = Math.floor(cycle / period);
  // Rotate short files too, but advance this phase independently from the
  // candidate-file phase. A complete file-selection sweep happens before the
  // bundle start advances, so omitted file residues cannot alias permanently
  // with an identically-sized bundle set.
  const start = (bundleRotationSeed(fileSha) + bundleEpoch) % bundles.length;
  const selected = [];
  const selectedCount = Math.min(maxBundles, bundles.length);
  for (let index = 0; index < selectedCount; index += 1) {
    selected.push(bundles[(start + index) % bundles.length]);
  }
  return {
    bundles: selected,
    start_index: start,
    total_in_file: bundles.length,
  };
}

function bundleKey(bundle) {
  const parts = isoParts(bundle.retrieved_at);
  return `${RESEARCH_BUNDLE_PREFIX}${parts.year}/${parts.month}/${parts.day}/${bundle.run_id}.json`;
}

async function readR2Json(telemetry, bucket, key) {
  const object = await r2Get(telemetry, bucket, key);
  if (!object) return null;
  return JSON.parse(await object.text());
}

function collectReferencedEntityIds(target, values) {
  if (!Array.isArray(values)) return;
  for (const item of values) {
    if (!isObject(item)) continue;
    if (typeof item.entity_id === 'string' && item.entity_id) target.add(item.entity_id);
    if (Array.isArray(item.entity_ids)) {
      for (const entityId of item.entity_ids) {
        if (typeof entityId === 'string' && entityId) target.add(entityId);
      }
    }
    for (const key of ['payer_entity_id', 'receiver_entity_id', 'subject_entity_id', 'object_entity_id']) {
      if (typeof item[key] === 'string' && item[key]) target.add(item[key]);
    }
  }
}

function referencedEntityIds(bundle) {
  const ids = new Set();
  for (const field of [
    'entities',
    'claims',
    'metrics',
    'money_signals',
    'events',
    'relationships',
    'observations',
    'derived',
  ]) {
    collectReferencedEntityIds(ids, bundle[field]);
  }
  return [...ids];
}

async function isBundleFullyPublished(env, bundle, telemetry, diagnostics = null) {
  const record = (reason, entityId = null) => {
    if (!diagnostics) return;
    diagnostics[reason] = (diagnostics[reason] || 0) + 1;
    if (diagnostics.samples.length < 20) {
      diagnostics.samples.push({
        run_id: bundle.run_id,
        reason,
        ...(entityId ? { entity_id: entityId } : {}),
      });
    }
  };
  const key = bundleKey(bundle);
  const stored = await r2Get(telemetry, env.FOUNDATION_R2_LAKE, key);
  if (!stored) {
    record('canonical_missing');
    return false;
  }

  // Never deduplicate merely because the immutable key exists. Compare the
  // canonical JSON value that the downstream ingest produced; formatting
  // bytes such as a trailing newline are not a data difference.
  const storedBytes = new Uint8Array(await stored.arrayBuffer());
  let storedJson;
  try {
    storedJson = normalizedJsonText(new TextDecoder().decode(storedBytes));
  } catch {
    record('canonical_mismatch');
    return false;
  }
  if (storedJson !== normalizedJsonText(bundle)) {
    record('canonical_mismatch');
    return false;
  }

  const entityIds = referencedEntityIds(bundle);
  if (entityIds.length === 0) {
    record('canonical_only');
    return true;
  }

  for (const entityId of entityIds) {
    // Dangling relationship/counterparty references are allowed by the
    // Foundation bundle schema. If there is no canonical Entity core, there is
    // intentionally no Make-Money entity view to wait for.
    const core = await r2Head(
      telemetry,
      env.FOUNDATION_R2_LAKE,
      `${ENTITY_CORE_PREFIX}${entityId}.json`
    );
    if (!core) {
      record('entity_core_missing', entityId);
      continue;
    }

    const view = await readR2Json(
      telemetry,
      env.FOUNDATION_R2_LAKE,
      `${MAKE_MONEY_VIEW_PREFIX}${entityId}.json`
    );
    if (
      !isObject(view) ||
      !Array.isArray(view.source_run_ids) ||
      !view.source_run_ids.includes(bundle.run_id)
    ) {
      record(
        isObject(view) ? 'derived_view_source_missing' : 'derived_view_missing',
        entityId
      );
      return false;
    }
  }
  record('canonical_and_views_complete');
  return true;
}

function schemaErrorText(validator) {
  return (validator.errors || [])
    .slice(0, 20)
    .map((error) => `${error.instancePath || '/'} ${error.message || 'invalid'}`)
    .join('; ');
}

function makeMoneyCoverageError(bundle) {
  const entries = bundle.collection_coverage;
  if (!Array.isArray(entries)) return 'make_money candidate requires collection_coverage';

  const seen = new Set();
  for (const row of entries) {
    if (!isObject(row) || typeof row.dimension !== 'string' || !MAKE_MONEY_COVERAGE_DIMENSION_SET.has(row.dimension)) {
      return 'make_money candidate collection_coverage contains an unknown dimension';
    }
    if (seen.has(row.dimension)) return 'make_money candidate collection_coverage has duplicate dimensions';
    seen.add(row.dimension);
    if (typeof row.note !== 'string' || !row.note.trim()) {
      return `make_money coverage ${row.dimension} requires a note`;
    }
    if (!COVERAGE_STATUSES.has(row.status)) {
      return `make_money coverage ${row.dimension} has an invalid status`;
    }
    if (row.status === 'found') {
      if (!Array.isArray(row.record_refs) || row.record_refs.length === 0) {
        return `make_money coverage ${row.dimension} requires record_refs`;
      }
      for (const ref of row.record_refs) {
        const match = /^(entities|claims|metrics|money_signals|events|relationships|derived|observations|sources|evidence)\/(\d+)$/.exec(ref);
        if (!match || !Array.isArray(bundle[match[1]]) || !bundle[match[1]][Number(match[2])]) {
          return `make_money coverage ${row.dimension} has a dangling record reference`;
        }
      }
    }
    if (row.status === 'attempted_unavailable' || row.status === 'unknown') {
      if (!Array.isArray(row.attempts) || row.attempts.length === 0 || row.attempts.some((attempt) => typeof attempt !== 'string' || !attempt.trim())) {
        return `make_money coverage ${row.dimension} requires actual attempts`;
      }
    }
  }

  for (const dimension of MAKE_MONEY_COVERAGE_DIMENSIONS) {
    if (!seen.has(dimension)) return `make_money candidate is missing coverage dimension ${dimension}`;
  }
  if (!Array.isArray(bundle.money_signals)) return 'make_money candidate requires money_signals';
  const recordFields = ['entities', 'claims', 'metrics', 'money_signals', 'events', 'relationships', 'observations'];
  if (!recordFields.some((field) => Array.isArray(bundle[field]) && bundle[field].length > 0)) {
    return 'make_money candidate contains no research records';
  }
  return null;
}

function candidateSkipReason(item) {
  if (!isObject(item)) {
    return { reason_code: 'MALFORMED_IMMUTABLE_CANDIDATE', reason: 'candidate is not an object' };
  }
  if (item.schema_version === 'typed-record-set.v1' || Object.prototype.hasOwnProperty.call(item, 'typed_record_set')) {
    return {
      reason_code: 'SCHEMA_INVALID',
      reason: 'candidate uses the retired typed_record_set format',
    };
  }
  if (!validateResearchBundleSchema(item)) {
    return {
      reason_code: 'SCHEMA_INVALID',
      reason: `research-bundle.v1 schema validation failed: ${schemaErrorText(validateResearchBundleSchema)}`,
    };
  }
  if (item.quality?.schema_validation !== 'PASS') {
    return {
      reason_code: 'SCHEMA_INVALID',
      reason: 'quality.schema_validation must be PASS before R2 ingestion',
    };
  }
  const boundsIssues = [];
  validatePayloadBounds(item, 'bundle', boundsIssues);
  if (boundsIssues.length > 0) {
    return {
      reason_code: 'SCHEMA_INVALID',
      reason: boundsIssues[0],
    };
  }
  const structuralError = researchBundleStructuralError(item);
  if (structuralError) {
    return {
      reason_code: 'SCHEMA_INVALID',
      reason: structuralError,
    };
  }
  const semanticError = researchBundleSemanticError(item);
  if (semanticError) {
    return {
      reason_code: 'SCHEMA_INVALID',
      reason: semanticError,
    };
  }
  if (item.purpose === 'make_money') {
    const reason = makeMoneyCoverageError(item);
    if (reason) return { reason_code: 'COVERAGE_INVALID', reason };
  }
  return null;
}

function assertJournalEntrySchema(entry, label) {
  if (!validateJournalSchema(entry)) {
    throw new Error(`${label} failed journal-entry.v1 schema validation: ${schemaErrorText(validateJournalSchema)}`);
  }
}

function assertPlannedWritesSchema(manifest, label) {
  if (!validatePlannedWritesSchema(manifest)) {
    throw new Error(`${label} failed planned-writes.v1 schema validation: ${schemaErrorText(validatePlannedWritesSchema)}`);
  }
}

function buildJournalEntry({ journalId, publisherRunId, bundleRunId, status, observedAt, payload }) {
  return {
    schema_version: 'journal-entry.v1',
    journal_id: journalId,
    subject_refs: [
      'automation:foundation-r2-queue-publisher',
      bundleRunId ? `research-run:${bundleRunId}` : 'research-run:unknown',
    ],
    observation_type: `automation.publisher.${status}`,
    payload_schema_ref: null,
    payload,
    text_original: null,
    origin_type: 'observed',
    verification_status: 'UNVERIFIED',
    confidence: 1,
    source_availability: 'not_applicable',
    valid_time: null,
    observed_at: observedAt,
    recorded_at: observedAt,
    provenance: {
      run_id: publisherRunId,
      collector: 'foundation-r2-queue-publisher',
      collection_channel: 'cloudflare_worker',
      purpose: 'publish normalized R2 queue candidates and record execution outcomes',
      source_ids: [],
      source_locator: null,
      parser_or_transform_version: PUBLISHER_VERSION,
    },
    evidence_ids: [],
    supersedes: [],
    superseded_by: [],
    typed_projection_refs: [],
    rights_status: null,
    tags: ['automation', 'publisher', status.toLowerCase()],
    notes: null,
  };
}

function buildPlannedWritesManifest({ publisherRunId, key, bodySha256, bytes }) {
  return {
    schema_version: 'planned-writes.v1',
    run_id: publisherRunId,
    write_authorized: true,
    objects: [{
      logical_role: 'journal_entry',
      dataset_id: 'ds.foundation.journal.core',
      bucket: 'foundation-lake',
      key,
      content_sha256: bodySha256,
      bytes,
      content_type: 'application/json; charset=utf-8',
      create_only: true,
      source_evidence_ids: [],
      local_path: null,
      preflight_status: 'NOT_CHECKED',
    }],
    forbidden_operations: [
      'CopyObject',
      'DeleteObject',
      'Move',
      'Rename',
      'Overwrite',
      'BucketCreate',
      'LifecycleChange',
      'EnvChange',
      'ConfigChange',
      'BucketPolicyChange',
      'LegacyUniversalMutation',
    ],
  };
}

async function writePublisherJournal(
  env,
  telemetry,
  { publisherRunId, subjectKey, bundleRunId, status, payload, observedAt }
) {
  const now = observedAt || new Date().toISOString();
  const identityHash = await sha256Hex(JSON.stringify({
    publisherRunId,
    subjectKey,
    bundleRunId,
    status,
    payload,
  }));
  const journalId = `jr_publisher_${identityHash}`;
  const parts = isoParts(now);
  const key = `${JOURNAL_PREFIX}${parts.year}/${parts.month}/${parts.day}/${journalId}.json`;
  const entry = buildJournalEntry({
    journalId,
    publisherRunId,
    bundleRunId,
    status,
    observedAt: now,
    payload,
  });
  assertJournalEntrySchema(entry, 'generated publisher journal entry');

  const body = JSON.stringify(entry);
  const bytes = encodeUtf8(body);
  const bodySha256 = await sha256Hex(bytes);
  const manifest = buildPlannedWritesManifest({
    publisherRunId,
    key,
    bodySha256,
    bytes: bytes.byteLength,
  });
  assertPlannedWritesSchema(manifest, 'generated publisher planned writes');

  const existing = await r2Get(telemetry, env.FOUNDATION_R2_LAKE, key);
  if (existing) {
    const existingBytes = new Uint8Array(await existing.arrayBuffer());
    const existingSha = await sha256Hex(existingBytes);
    manifest.objects[0].preflight_status =
      existingSha === bodySha256 ? 'EXISTS_IDENTICAL' : 'EXISTS_CONFLICT';
    assertPlannedWritesSchema(manifest, 'publisher planned writes after preflight');
    if (existingSha === bodySha256) {
      const existingJson = JSON.parse(new TextDecoder().decode(existingBytes));
      assertJournalEntrySchema(existingJson, 'existing publisher journal readback');
      return { status: 'EXISTS_IDENTICAL', key, manifest };
    }
    throw new Error(`Publisher journal key conflict: ${key}`);
  }

  manifest.objects[0].preflight_status = 'ABSENT';
  assertPlannedWritesSchema(manifest, 'publisher planned writes after preflight');
  console.log('[foundation-publisher] planned write', manifest);

  const created = await r2Put(telemetry, env.FOUNDATION_R2_LAKE, key, bytes, {
    onlyIf: { etagDoesNotMatch: '*' },
    httpMetadata: { contentType: 'application/json; charset=utf-8' },
    customMetadata: {
      'foundation-run-id': publisherRunId,
      'foundation-dataset-id': 'ds.foundation.journal.core',
      'foundation-sha256': bodySha256,
      'foundation-schema-version': 'journal-entry.v1',
    },
  });
  if (!created) {
    const raced = await r2Get(telemetry, env.FOUNDATION_R2_LAKE, key);
    if (!raced) throw new Error(`Publisher journal conditional create failed: ${key}`);
    const racedBytes = new Uint8Array(await raced.arrayBuffer());
    if (await sha256Hex(racedBytes) !== bodySha256) {
      throw new Error(`Publisher journal concurrent conflict: ${key}`);
    }
    const racedJson = JSON.parse(new TextDecoder().decode(racedBytes));
    assertJournalEntrySchema(racedJson, 'publisher journal concurrent readback');
    return { status: 'EXISTS_IDENTICAL', key, manifest };
  }
  telemetry.mutation_counts.publisher_journal_put += 1;

  const readback = await r2Get(telemetry, env.FOUNDATION_R2_LAKE, key);
  if (!readback) throw new Error(`Publisher journal missing after write: ${key}`);
  const readbackBytes = new Uint8Array(await readback.arrayBuffer());
  const readbackSha = await sha256Hex(readbackBytes);
  if (readbackBytes.byteLength !== bytes.byteLength || readbackSha !== bodySha256) {
    throw new Error(`Publisher journal readback verification failed: ${key}`);
  }

  const readbackJson = JSON.parse(new TextDecoder().decode(readbackBytes));
  assertJournalEntrySchema(readbackJson, 'publisher journal readback');
  return { status: 'CREATED', key, manifest };
}

async function safePublisherJournal(env, telemetry, args) {
  try {
    return await writePublisherJournal(env, telemetry, args);
  } catch (error) {
    console.error('[foundation-publisher] audit journal write failed', {
      status: args.status,
      subject: args.subjectKey,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

function makeMoneyOrigin(env) {
  const raw = env.MAKE_MONEY_ORIGIN?.trim();
  if (!raw) throw new Error('MAKE_MONEY_ORIGIN is required');
  const origin = raw.replace(/\/+$/, '');
  if (!origin.startsWith('https://')) {
    throw new Error('MAKE_MONEY_ORIGIN must use https://');
  }
  return origin;
}

async function serviceFetch(env, telemetry, path, body) {
  telemetry.provider_calls.make_money_http_fetch += 1;
  recordExternalRequest(telemetry.cost, 'make_money_http');
  const response = await fetch(`${makeMoneyOrigin(env)}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-foundation-ingest-token': env.FOUNDATION_INGEST_TOKEN,
      'x-foundation-publisher': PUBLISHER_VERSION,
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { raw: text.slice(0, 4000) };
  }
  accumulateDownstreamTelemetry(telemetry, payload);
  return { response, text, payload };
}

async function ensureBundleSuccessAcknowledgement(env, telemetry, bundle, source) {
  const canonicalKey = bundleKey(bundle);
  const canonical = await r2Get(telemetry, env.FOUNDATION_R2_LAKE, canonicalKey);
  if (!canonical) {
    throw new Error(`Canonical bundle is missing while creating publication acknowledgement: ${canonicalKey}`);
  }

  const canonicalUploadedAt =
    canonical.uploaded instanceof Date
      ? canonical.uploaded.toISOString()
      : (canonical.uploaded ? new Date(canonical.uploaded).toISOString() : null);
  if (!canonicalUploadedAt || Number.isNaN(Date.parse(canonicalUploadedAt))) {
    throw new Error(`Canonical bundle upload time is unavailable for ${bundle.run_id}`);
  }

  const identity = await sha256Hex(JSON.stringify({
    bundle_run_id: bundle.run_id,
    github_blob_sha: source.sha,
    canonical_bundle_key: canonicalKey,
    canonical_uploaded_at: canonicalUploadedAt,
  }));
  const ackPublisherRunId = `run_publisher_ack_${identity}`;
  const result = await safePublisherJournal(env, telemetry, {
    publisherRunId: ackPublisherRunId,
    // Include the publisher generation in the append-only audit identity.
    // A deployment may legitimately change the journal provenance while the
    // canonical bundle remains the same; reusing the v4 key would turn that
    // normal upgrade into an immutable journal conflict.
    subjectKey: `bundle-success-ack:${PUBLISHER_VERSION}:${bundle.run_id}:${source.sha}`,
    bundleRunId: bundle.run_id,
    status: 'SUCCESS',
    // Operational time is the actual canonical R2 persistence time. Research
    // retrieval time remains separate in the payload below.
    observedAt: canonicalUploadedAt,
    payload: {
      audit_kind: 'publication_acknowledgement',
      bundle_run_id: bundle.run_id,
      bundle_retrieved_at: bundle.retrieved_at,
      canonical_bundle_key: canonicalKey,
      canonical_uploaded_at: canonicalUploadedAt,
      referenced_entity_ids: referencedEntityIds(bundle),
      github: {
        repository: `${env.GITHUB_OWNER}/${env.GITHUB_REPO}`,
        ref: env.GITHUB_REF,
        path: source.path,
        blob_sha: source.sha,
      },
    },
  });
  if (!result) {
    throw new Error(`Publication success acknowledgement could not be persisted for ${bundle.run_id}`);
  }
  return result;
}

async function advanceMakeMoneyViewBackfill(env, telemetry) {
  const { response, payload } = await serviceFetch(
    env,
    telemetry,
    '/api/foundation/views/rebuild',
    { limit: Math.min(Math.max(Number(env.VIEW_REBUILD_PAGE_LIMIT) || 5, 1), 20) }
  );
  if (!response.ok || !isObject(payload) || payload.success !== true) {
    throw new Error(`Make-Money view rebuild returned HTTP ${response.status}`);
  }
  return payload;
}

async function ingestBundle(env, bundle, source, triggerTime, publisherRunId, telemetry) {
  const startedAt = new Date().toISOString();
  let responseText = '';
  let responseStatus = 0;

  try {
    const result = await serviceFetch(
      env,
      telemetry,
      '/api/foundation/ingest',
      {
        write_authorized: true,
        bundle,
      }
    );
    responseStatus = result.response.status;
    responseText = result.text;
    const responsePayload = result.payload;

    if (!result.response.ok || !isObject(responsePayload) || responsePayload.success !== true) {
      throw new Error(`Foundation ingest returned HTTP ${result.response.status}`);
    }

    const finishedAt = new Date().toISOString();
    const successJournal = await safePublisherJournal(env, telemetry, {
      publisherRunId,
      subjectKey: `bundle:${bundle.run_id}`,
      bundleRunId: bundle.run_id,
      status: 'SUCCESS',
      payload: {
        triggered_at: new Date(triggerTime).toISOString(),
        started_at: startedAt,
        finished_at: finishedAt,
        github: {
          repository: `${env.GITHUB_OWNER}/${env.GITHUB_REPO}`,
          ref: env.GITHUB_REF,
          path: source.path,
          blob_sha: source.sha,
        },
        ingest: {
          run_id: responsePayload.run_id || bundle.run_id,
          counts: responsePayload.counts || null,
          provider_calls: responsePayload.provider_calls || null,
          mutation_counts: responsePayload.mutation_counts || null,
          readback_verified: responsePayload.readback_verified ?? null,
          view_projection: responsePayload.view_projection || null,
        },
      },
    });
    if (!successJournal) {
      throw new Error(`Canonical publication succeeded but success audit Journal failed for ${bundle.run_id}`);
    }
    await ensureBundleSuccessAcknowledgement(env, telemetry, bundle, source);
    return { status: 'published', runId: bundle.run_id };
  } catch (error) {
    const finishedAt = new Date().toISOString();
    const errorMessage = error instanceof Error ? error.message : String(error);
    await safePublisherJournal(env, telemetry, {
      publisherRunId,
      subjectKey: `bundle:${bundle.run_id}`,
      bundleRunId: bundle.run_id,
      status: 'FAILED',
      payload: {
        retryable: true,
        triggered_at: new Date(triggerTime).toISOString(),
        started_at: startedAt,
        finished_at: finishedAt,
        github: {
          repository: `${env.GITHUB_OWNER}/${env.GITHUB_REPO}`,
          ref: env.GITHUB_REF,
          path: source.path,
          blob_sha: source.sha,
        },
        ingest_http_status: responseStatus || null,
        ingest_response_excerpt: responseText.slice(0, 4000),
        error: errorMessage,
      },
    });
    console.error('[foundation-publisher] bundle failed', {
      run_id: bundle.run_id,
      error: errorMessage,
    });
    return { status: 'failed', runId: bundle.run_id };
  }
}

async function runPublisher(env, triggerTime, rotationCycleOffset = 0, queueDelivery = null, batchContext = null) {
  if (!env.FOUNDATION_GITHUB_TOKEN?.trim()) throw new Error('FOUNDATION_GITHUB_TOKEN is required');
  if (!env.FOUNDATION_INGEST_TOKEN?.trim()) throw new Error('FOUNDATION_INGEST_TOKEN is required');
  makeMoneyOrigin(env);

  const rotationTime = triggerTime + rotationCycleOffset * ROTATION_INTERVAL_MS;
  const publisherRunId =
    `run_publisher_${new Date(triggerTime).toISOString().replace(/[^0-9]/g, '')}_c${rotationCycleOffset}`;
  const context = batchContext || queueDelivery || {};
  const telemetry = createTelemetry();
  telemetry.cost = createCostMeter({
    service: 'foundation-r2-queue-publisher',
    runId: publisherRunId,
    trigger: queueDelivery ? 'queue_consumer' : 'direct_fallback',
    env,
  });
  const maxPublishes = Math.min(Math.max(Number(env.MAX_BUNDLES_PER_RUN) || 1, 1), 100);
  const maxScannedBundles = Math.min(
    Math.max(Number(env.MAX_BUNDLES_SCANNED_PER_RUN) || 8, maxPublishes),
    500
  );
  const maxFiles = Math.min(
    Math.max(Number(env.MAX_CANDIDATE_FILES_PER_RUN) || 8, 2),
    250
  );
  const maxTypedSidecars = Math.min(
    Math.max(Number(env.MAX_TYPED_SIDECARS_PER_RUN) || 100, 1),
    100
  );

  const maxViewBackfillSteps = Math.min(
    Math.max(Number(env.MAX_VIEW_REBUILD_STEPS_PER_RUN) || 1, 1),
    20
  );
  const viewBackfill = [];
  let viewBackfillError = null;
  for (let step = 0; step < maxViewBackfillSteps; step += 1) {
    try {
      const result = await advanceMakeMoneyViewBackfill(env, telemetry);
      viewBackfill.push(result);
      // Once global backfill is complete, unresolved replay remains a rolling
      // maintenance pass. If this step found nothing to replay, stop burning
      // service calls until the next event-driven reconciliation.
      if (
        result.complete === true &&
        Number(result.unresolved_replayed || 0) === 0
      ) {
        break;
      }
    } catch (error) {
      viewBackfillError = error instanceof Error ? error.message : String(error);
      console.error('[foundation-publisher] Make-Money view backfill failed', error);
      break;
    }
  }

  let allCandidateFiles = [];
  let sourceCommitSha = typeof context.input_watermark === 'string' ? context.input_watermark : null;
  let candidateTreeSha = null;
  let selection = {
    files: [],
    strategy: {
      mode: 'discovery_failed',
      guaranteed_fresh_files: 0,
      rotating_budget: 0,
      rotating_start_index: 0,
      rotating_pool_size: 0,
    },
  };
  let queueDiscoveryError = null;
  try {
    const inventory = await listCandidateFiles(env, telemetry);
    allCandidateFiles = inventory.files;
    sourceCommitSha = inventory.source_commit_sha || sourceCommitSha;
    candidateTreeSha = inventory.tree_sha;
    selection = selectCandidateFiles(allCandidateFiles, rotationTime, maxFiles, maxPublishes);
  } catch (error) {
    queueDiscoveryError = error instanceof Error ? error.message : String(error);
    console.error('[foundation-publisher] candidate queue discovery failed', error);
  }

  const candidateFiles = selection.files;

  let typedInventory = null;
  let typedDiscoveryError = null;
  let typedSelection = {
    files: [],
    strategy: {
      mode: 'discovery_failed',
      guaranteed_fresh_files: 0,
      rotating_budget: 0,
      rotating_start_index: 0,
      rotating_pool_size: 0,
    },
  };
  if (!queueDiscoveryError) {
    try {
      typedInventory = await listTypedSidecarFiles(env, telemetry);
      const legacySourceBlobs = new Set(
        allCandidateFiles
          .map((item) => legacyCandidateSourceBlob(item.path))
          .filter(Boolean)
      );
      const eligibleTypedFiles = typedInventory.files.filter(
        (item) => !legacySourceBlobs.has(item.sha)
      );
      typedSelection = selectCandidateFiles(
        eligibleTypedFiles,
        rotationTime,
        maxTypedSidecars,
        maxTypedSidecars
      );
    } catch (error) {
      typedDiscoveryError = error instanceof Error ? error.message : String(error);
      console.error('[foundation-publisher] typed sidecar discovery failed', error);
    }
  }

  const fairnessSlots = Math.max(
    1,
    Math.min(candidateFiles.length || 1, maxPublishes)
  );
  const perFileAttemptBudget = Math.max(1, Math.floor(maxPublishes / fairnessSlots));
  const perFileScanBudget = Math.max(
    perFileAttemptBudget,
    Math.ceil(maxScannedBundles / fairnessSlots)
  );

  let filesScanned = 0;
  let bundlesScanned = 0;
  let attempted = 0;
  let published = 0;
  let alreadyPublished = 0;
  let failed = 0;
  let fileFailures = 0;
  let skippedCandidates = 0;
  let terminalSkippedFiles = 0;
  let quarantineWrites = 0;
  let quarantineWriteFailures = 0;
  let typedScanned = 0;
  let typedPublished = 0;
  let typedAlreadyPublished = 0;
  let typedHeld = 0;
  let typedHeldExisting = 0;
  let typedHoldWrites = 0;
  let typedHoldWriteFailures = 0;
  let typedCompleteWrites = 0;
  let typedCompleteExisting = 0;
  let typedCompleteWriteFailures = 0;
  let typedDeliveryFailures = 0;
  const typedHoldReasonCounts = {};
  const typedHoldSamples = [];
  const typedPublishedRunIds = [];
  const publishedRunIds = [];
  const failedRunIds = [];
  const skippedRunIds = [];
  const skippedCandidateDetails = [];
  const publicationCheck = {
    canonical_missing: 0,
    canonical_mismatch: 0,
    canonical_only: 0,
    entity_core_missing: 0,
    derived_view_missing: 0,
    derived_view_source_missing: 0,
    canonical_and_views_complete: 0,
    samples: [],
  };

  for (const file of candidateFiles) {
    if (bundlesScanned >= maxScannedBundles || attempted >= maxPublishes) break;
    filesScanned += 1;

    try {
      if (await candidateQuarantineExists(env, file, telemetry)) {
        terminalSkippedFiles += 1;
        console.warn('[foundation-publisher] quarantined candidate file skipped', {
          path: file.path,
          blob_sha: file.sha,
        });
        continue;
      }
    } catch (error) {
      // A quarantine-index read is an optimization, not authority to discard
      // a candidate. On a transient R2 read failure, validate the immutable
      // GitHub blob normally and let the ordinary retry boundary handle it.
      console.warn('[foundation-publisher] quarantine lookup failed; validating candidate', {
        path: file.path,
        blob_sha: file.sha,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    let bundles;
    try {
      const parsed = await fetchCandidateFile(env, file, telemetry);
      bundles = parsed.bundles;
      for (const skipped of parsed.skipped) {
        skippedCandidates += 1;
        if (skipped.run_id) skippedRunIds.push(skipped.run_id);
        if (skippedCandidateDetails.length < 100) {
          skippedCandidateDetails.push({
            run_id: skipped.run_id,
            candidate_path: file.path,
            candidate_blob_sha: file.sha,
            reason_code: skipped.reason_code,
            index: skipped.index,
          });
        }
        console.warn('[foundation-publisher] terminal candidate skipped', {
          path: file.path,
          blob_sha: file.sha,
          index: skipped.index,
          run_id: skipped.run_id,
          reason_code: skipped.reason_code,
          reason: skipped.reason,
        });
      }
      if (bundles.length === 0 && parsed.skipped.length > 0) {
        try {
          if (await writeCandidateQuarantine(env, file, parsed.skipped, telemetry)) {
            quarantineWrites += 1;
          }
        } catch (error) {
          quarantineWriteFailures += 1;
          console.error('[foundation-publisher] candidate quarantine write failed', {
            path: file.path,
            blob_sha: file.sha,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    } catch (error) {
      fileFailures += 1;
      const errorMessage = error instanceof Error ? error.message : String(error);
      await safePublisherJournal(env, telemetry, {
        publisherRunId,
        subjectKey: `candidate-file:${file.sha}`,
        bundleRunId: null,
        status: 'FAILED',
        payload: {
          retryable: true,
          stage: 'candidate_file_parse',
          github: {
            repository: `${env.GITHUB_OWNER}/${env.GITHUB_REPO}`,
            ref: env.GITHUB_REF,
            path: file.path,
            blob_sha: file.sha,
          },
          error: errorMessage,
        },
      });
      console.error('[foundation-publisher] candidate file failed', {
        path: file.path,
        blob_sha: file.sha,
        error: errorMessage,
      });
      continue;
    }

    const remainingScanBudget = Math.max(0, maxScannedBundles - bundlesScanned);
    const fileWindow = selectBundlesForFile(
      bundles,
      file.sha,
      rotationTime,
      Math.max(1, Math.min(perFileScanBudget, remainingScanBudget)),
      selection.strategy.bundle_rotation_period || 1
    );
    let fileScanned = 0;
    let fileAttempted = 0;

    for (const bundle of fileWindow.bundles) {
      if (
        bundlesScanned >= maxScannedBundles ||
        attempted >= maxPublishes ||
        fileScanned >= perFileScanBudget ||
        fileAttempted >= perFileAttemptBudget
      ) break;

      bundlesScanned += 1;
      fileScanned += 1;

      try {
        if (await isBundleFullyPublished(env, bundle, telemetry, publicationCheck)) {
          await ensureBundleSuccessAcknowledgement(env, telemetry, bundle, file);
          alreadyPublished += 1;
          continue;
        }
      } catch (error) {
        console.warn('[foundation-publisher] publication-state check failed; retrying ingest', {
          run_id: bundle.run_id,
          error: error instanceof Error ? error.message : String(error),
        });
      }

      attempted += 1;
      fileAttempted += 1;
      const result = await ingestBundle(
        env,
        bundle,
        file,
        triggerTime,
        publisherRunId,
        telemetry
      );
      if (result.status === 'published') {
        published += 1;
        publishedRunIds.push(result.runId);
      } else {
        failed += 1;
        failedRunIds.push(result.runId);
      }
    }
  }


  if (typedInventory && !typedDiscoveryError) {
    for (const file of typedSelection.files) {
      typedScanned += 1;

      try {
        const existingCompletion = await readTypedCompletion(env, file, telemetry);
        if (existingCompletion) {
          typedCompleteExisting += 1;
          continue;
        }
      } catch (error) {
        typedCompleteWriteFailures += 1;
        console.error('[foundation-publisher] typed completion lookup failed', {
          path: file.path,
          blob_sha: file.sha,
          error: error instanceof Error ? error.message : String(error),
        });
        continue;
      }

      try {
        const existingHold = await readTypedInputHold(env, file, telemetry);
        if (existingHold) {
          typedHeldExisting += 1;
          continue;
        }
      } catch (error) {
        typedHoldWriteFailures += 1;
        console.error('[foundation-publisher] typed HOLD lookup failed', {
          path: file.path,
          blob_sha: file.sha,
          error: error instanceof Error ? error.message : String(error),
        });
        continue;
      }

      let prepared;
      try {
        prepared = await prepareTypedDelivery(env, typedInventory, file, telemetry);
      } catch (error) {
        typedDeliveryFailures += 1;
        console.error('[foundation-publisher] typed input preparation failed', {
          path: file.path,
          blob_sha: file.sha,
          error: error instanceof Error ? error.message : String(error),
        });
        continue;
      }

      if (prepared.terminal) {
        try {
          const hold = await writeTypedInputHold(env, telemetry, {
            file,
            sourceCommitSha: typedInventory.source_commit_sha,
            reasonCode: prepared.reason_code,
            reason: prepared.reason,
          });
          typedHeld += 1;
          if (hold.status === 'CREATED') typedHoldWrites += 1;
          typedHoldReasonCounts[prepared.reason_code] =
            Number(typedHoldReasonCounts[prepared.reason_code] || 0) + 1;
          if (typedHoldSamples.length < 20) {
            typedHoldSamples.push({
              path: file.path,
              blob_sha: file.sha,
              reason_code: prepared.reason_code,
            });
          }
        } catch (error) {
          typedHoldWriteFailures += 1;
          console.error('[foundation-publisher] typed HOLD write failed', {
            path: file.path,
            blob_sha: file.sha,
            error: error instanceof Error ? error.message : String(error),
          });
        }
        continue;
      }

      try {
        const result = await ingestTypedSidecar(env, telemetry, prepared);
        if (result.response.status === 422 && result.payload?.terminal === true) {
          const reasonCode =
            typeof result.payload?.reason_code === 'string'
              ? result.payload.reason_code
              : 'SOURCE_SCHEMA_INVALID';
          try {
            const hold = await writeTypedInputHold(env, telemetry, {
              file,
              sourceCommitSha: typedInventory.source_commit_sha,
              reasonCode,
              reason:
                typeof result.payload?.error === 'string'
                  ? result.payload.error
                  : 'typed ingest rejected immutable input',
              details: {
                issues: Array.isArray(result.payload?.issues)
                  ? result.payload.issues.slice(0, 20)
                  : [],
              },
            });
            typedHeld += 1;
            if (hold.status === 'CREATED') typedHoldWrites += 1;
            typedHoldReasonCounts[reasonCode] =
              Number(typedHoldReasonCounts[reasonCode] || 0) + 1;
            if (typedHoldSamples.length < 20) {
              typedHoldSamples.push({
                path: file.path,
                blob_sha: file.sha,
                reason_code: reasonCode,
              });
            }
          } catch (error) {
            typedHoldWriteFailures += 1;
            console.error('[foundation-publisher] typed HOLD write failed after terminal reject', {
              path: file.path,
              blob_sha: file.sha,
              error: error instanceof Error ? error.message : String(error),
            });
          }
          continue;
        }

        if (!result.response.ok || !isObject(result.payload) || result.payload.success !== true) {
          typedDeliveryFailures += 1;
          await safePublisherJournal(env, telemetry, {
            publisherRunId,
            subjectKey: `typed-sidecar:${file.sha}`,
            bundleRunId: typeof result.payload?.run_id === 'string' ? result.payload.run_id : null,
            status: 'FAILED',
            payload: {
              retryable: true,
              input_kind: 'typed_sidecar',
              github: {
                repository: `${env.GITHUB_OWNER}/${env.GITHUB_REPO}`,
                ref: TYPED_SOURCE_REF,
                commit_sha: typedInventory.source_commit_sha,
                path: file.path,
                blob_sha: file.sha,
              },
              ingest_http_status: result.response.status,
              ingest_response_excerpt: result.text.slice(0, 4000),
            },
          });
          continue;
        }

        const runId = typeof result.payload.run_id === 'string' ? result.payload.run_id : null;
        if (result.payload.canonical_ingest === 'ALREADY_COMMITTED') {
          typedAlreadyPublished += 1;
        } else {
          typedPublished += 1;
        }
        if (runId) typedPublishedRunIds.push(runId);
        if (!runId) {
          typedDeliveryFailures += 1;
          console.error('[foundation-publisher] typed ingest succeeded without a run_id', {
            path: file.path,
            blob_sha: file.sha,
          });
          continue;
        }
        try {
          const completion = await writeTypedCompletion(env, telemetry, {
            file,
            sourceCommitSha: typedInventory.source_commit_sha,
            bundleRunId: runId,
            coverageAssessment: result.payload.coverage_assessment || 'UNASSESSED',
          });
          if (completion.status === 'CREATED') typedCompleteWrites += 1;
          else typedCompleteExisting += 1;
        } catch (error) {
          typedCompleteWriteFailures += 1;
          console.error('[foundation-publisher] typed completion write failed', {
            path: file.path,
            blob_sha: file.sha,
            run_id: runId,
            error: error instanceof Error ? error.message : String(error),
          });
          continue;
        }
        await safePublisherJournal(env, telemetry, {
          publisherRunId,
          subjectKey: `typed-sidecar:${file.sha}`,
          bundleRunId: runId,
          status: 'SUCCESS',
          payload: {
            input_kind: 'typed_sidecar',
            mapper_version: result.payload.mapper_version || TYPED_PROJECTOR_VERSION,
            coverage_assessment: result.payload.coverage_assessment || 'UNASSESSED',
            github: {
              repository: `${env.GITHUB_OWNER}/${env.GITHUB_REPO}`,
              ref: TYPED_SOURCE_REF,
              commit_sha: typedInventory.source_commit_sha,
              path: file.path,
              blob_sha: file.sha,
            },
            ingest: {
              run_id: runId,
              counts: result.payload.counts || null,
              readback_verified: result.payload.readback_verified ?? null,
              view_projection: result.payload.view_projection || null,
            },
          },
        });
      } catch (error) {
        typedDeliveryFailures += 1;
        console.error('[foundation-publisher] typed sidecar delivery failed', {
          path: file.path,
          blob_sha: file.sha,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  // The summary Journal write itself deterministically performs one preflight
  // Get, one conditional Put, and one readback Get because this run ID is
  // unique. Include those operations in the persisted final totals.
  const finalTelemetry = snapshotTelemetry(telemetry);
  finalTelemetry.provider_calls.publisher_r2_get += 2;
  finalTelemetry.provider_calls.publisher_r2_put += 1;
  finalTelemetry.mutation_counts.publisher_journal_put += 1;
  if (queueDelivery) {
    const ackExpected =
      !viewBackfillError &&
      !queueDiscoveryError &&
      !typedDiscoveryError &&
      typedHoldWriteFailures === 0 &&
      typedCompleteWriteFailures === 0;
    recordQueueDelivery(finalTelemetry.cost, queueDelivery.message_body, {
      ack: ackExpected,
      retry: !ackExpected,
    });
    recordQueueHint(finalTelemetry.cost, queueDelivery.producer_cost_hint);
  }
  recordR2Operation(finalTelemetry.cost, 'get');
  recordR2Operation(finalTelemetry.cost, 'put');
  recordR2Operation(finalTelemetry.cost, 'get');
  const costTracking = finalizeCostMeter(finalTelemetry.cost, env);

  const summary = {
    schema_version: 'foundation-r2-queue-publisher-run.v5',
    publisher_version: PUBLISHER_VERSION,
    candidate_input_mode: 'legacy_candidates_plus_main_typed_sidecars',
    candidate_input_prefix: CANDIDATE_V2_PREFIX,
    typed_input_ref: TYPED_SOURCE_REF,
    typed_input_prefix: TYPED_RECORD_SET_PREFIX,
    trigger_mode: 'edition_batch_queue',
    publisher_run_id: publisherRunId,
    batch_id: context.batch_id || null,
    idempotency_key: context.idempotency_key || null,
    input_watermark: sourceCommitSha,
    candidate_tree_sha: candidateTreeSha,
    triggered_at: new Date(triggerTime).toISOString(),
    rotation_cycle_offset: rotationCycleOffset,
    candidate_files_discovered: allCandidateFiles.length,
    candidate_files_selected: candidateFiles.length,
    candidate_files_scanned: filesScanned,
    queue_discovery_error: queueDiscoveryError,
    typed_discovery_error: typedDiscoveryError,
    typed_source_commit_sha: typedInventory?.source_commit_sha || null,
    typed_tree_sha: typedInventory?.tree_sha || null,
    typed_sidecars_discovered: typedInventory?.files.length || 0,
    typed_sidecars_selected: typedSelection.files.length,
    typed_sidecars_scanned: typedScanned,
    typed_published: typedPublished,
    typed_already_published: typedAlreadyPublished,
    typed_held: typedHeld,
    typed_held_existing: typedHeldExisting,
    typed_hold_writes: typedHoldWrites,
    typed_hold_write_failures: typedHoldWriteFailures,
    typed_complete_writes: typedCompleteWrites,
    typed_complete_existing: typedCompleteExisting,
    typed_complete_write_failures: typedCompleteWriteFailures,
    typed_delivery_failures: typedDeliveryFailures,
    typed_hold_reason_counts: typedHoldReasonCounts,
    typed_hold_samples: typedHoldSamples,
    typed_published_run_ids: typedPublishedRunIds,
    scan_window: selection.strategy,
    typed_scan_window: typedSelection.strategy,
    per_file_fairness: {
      slots: fairnessSlots,
      attempt_budget: perFileAttemptBudget,
      scan_budget: perFileScanBudget,
      bundle_rotation: 'file_sha_plus_completed_file_sweep',
    },
    bundle_scan_budget: maxScannedBundles,
    bundles_scanned: bundlesScanned,
    publish_budget: maxPublishes,
    attempted,
    published,
    already_published: alreadyPublished,
    failed,
    file_failures: fileFailures,
    candidate_bundles_skipped: skippedCandidates,
    candidate_files_terminal_skipped: terminalSkippedFiles,
    candidate_quarantine_writes: quarantineWrites,
    candidate_quarantine_write_failures: quarantineWriteFailures,
    skipped_candidate_details: skippedCandidateDetails,
    publication_check: publicationCheck,
    published_run_ids: publishedRunIds,
    failed_run_ids: failedRunIds,
    skipped_run_ids: skippedRunIds,
    view_backfill: viewBackfill,
    view_backfill_error: viewBackfillError,
    provider_calls: finalTelemetry.provider_calls,
    mutation_counts: finalTelemetry.mutation_counts,
    cost_tracking: costTracking,
    reporting_accounting: {
      includes_this_summary_journal_write: true,
      expected_summary_write_calls: {
        publisher_r2_get: 2,
        publisher_r2_put: 1,
      },
      expected_summary_mutations: {
        publisher_journal_put: 1,
      },
    },
  };

  const summaryWrite = await safePublisherJournal(env, telemetry, {
    publisherRunId,
    subjectKey: 'publisher-run-summary',
    bundleRunId: null,
    status:
      failed > 0 ||
      fileFailures > 0 ||
      viewBackfillError ||
      queueDiscoveryError ||
      typedDiscoveryError ||
      typedHeld > 0 ||
      typedDeliveryFailures > 0 ||
      typedHoldWriteFailures > 0 ||
      typedCompleteWriteFailures > 0
        ? 'PARTIAL'
        : 'SUCCESS',
    payload: summary,
  });

  if (!summaryWrite) {
    throw new Error('Publisher final audit Journal could not be persisted');
  }

  console.log('[foundation-publisher] run complete', summary);
  return summary;
}

async function handleQueueMessage(message, env, dependencies = {}) {
  const publish = dependencies.runPublisher || runPublisher;
  const enqueue = dependencies.enqueueReconcile || enqueueReconcile;
  const event = parsePublisherEvent(message.body);
  if (!event) {
    console.error('[foundation-publisher] invalid or legacy queue message; no new batch started', { id: message.id });
    message.ack();
    return;
  }

  try {
    const summary = await publish(
      env,
      eventTriggerTime(event),
      event.cycle_offset,
      {
        message_body: message.body,
        producer_cost_hint: event.producer_cost_hint,
      },
      event,
    );
    const outcome = classifyPublisherOutcome(summary);

    // Discovery and view-rebuild failures mean the publisher could not
    // establish a trustworthy scan boundary. Retry the whole event so a
    // transient provider outage is not mistaken for a clean sweep.
    if (outcome === 'infrastructure_failure') {
      message.retry({ delaySeconds: 60 });
      return;
    }

    const continuation = needsContinuation(event, summary, env);
    if (continuation.shouldContinue) {
      await enqueue(env, {
        ...event,
        // A bad or temporarily unavailable candidate is recorded in the
        // journal, but must not pin the single-concurrency queue to the
        // same event. Rotation advances the scan so healthy candidates
        // can publish while the failed candidate is revisited by a later
        // GitHub event or rotation pass.
        reason: outcome === 'candidate_failure'
          ? 'bounded_backlog_continuation_after_candidate_failure'
          : 'bounded_backlog_continuation',
        continuation_depth: event.continuation_depth + 1,
        cycle_offset: event.cycle_offset + continuation.progress,
        historical_coverage: continuation.nextCoverage,
      });
    }

    if (outcome === 'candidate_failure') {
      console.warn('[foundation-publisher] candidate failure isolated; acknowledging event', {
        delivery_id: event.delivery_id,
        failed: summary.failed || 0,
        file_failures: summary.file_failures || 0,
        continuation_queued: continuation.shouldContinue,
      });
    }

    // Candidate failures are durable journal facts, not queue poison.
    // Acknowledge this event after scheduling any bounded continuation so
    // one bad bundle cannot be retried forever ahead of the rest.
    message.ack();
  } catch (error) {
    console.error('[foundation-publisher] queue event failed', {
      id: message.id,
      delivery_id: event.delivery_id,
      error: error instanceof Error ? error.message : String(error),
    });
    message.retry({ delaySeconds: 60 });
  }
}

export const __test = {
  selectCandidateFiles,
  selectBundlesForFile,
  verifyGithubWebhookSignature,
  parsePublisherEvent,
  continuationProgress,
  needsContinuation,
  classifyPublisherOutcome,
  directFallbackEnvironment,
  eventTriggerTime,
  isQueueWriteLimitError,
  isPublisherCandidatePath,
  isTypedRecordSetPath,
  legacyCandidateSourceBlob,
  typedHoldKey,
  typedCompleteKey,
  parseCandidateFile,
  candidateQuarantineKey,
  normalizedJsonText,
  makeMoneyCoverageDimensions: MAKE_MONEY_COVERAGE_DIMENSIONS,
  handleGithubWebhook,
  handleQueueMessage,
};

export default {
  async scheduled(controller, env, ctx) {
    const batchId = batchIdForScheduledTime(controller.scheduledTime);
    const event = {
      schema_version: EVENT_SCHEMA_VERSION,
      type: 'reconcile',
      delivery_id: `scheduled:${controller.scheduledTime}`,
      received_at: new Date(controller.scheduledTime).toISOString(),
      before: null,
      after: null,
      reason: 'scheduled_edition_batch',
      batch_id: batchId,
      idempotency_key: `publisher:${batchId}`,
      input_watermark: null,
      continuation_depth: 0,
      cycle_offset: 0,
      historical_coverage: 0,
    };
    const queueRun = enqueueReconcile(env, event).catch(async (error) => {
      if (!isQueueWriteLimitError(error)) throw error;
      // A Queue quota incident must not discard an entire edition.  Run one
      // deliberately small, idempotent pass; the next edition continues the
      // normal bounded rotation after the quota window recovers.
      const summary = await runPublisher(
        directFallbackEnvironment(env),
        eventTriggerTime(event),
        0,
        null,
        event,
      );
      console.warn('[foundation-publisher] edition queue quota reached; direct fallback complete', {
        delivery_id: event.delivery_id,
        published: summary.published,
        failed: summary.failed,
      });
    });
    ctx.waitUntil(queueRun);
  },

  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === 'POST' && url.pathname === WEBHOOK_PATH) {
      return handleGithubWebhook(request, env, ctx);
    }
    if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/health')) {
      return jsonResponse({
        service: 'foundation-r2-queue-publisher',
        version: PUBLISHER_VERSION,
        status: 'edition-batched',
        trigger: 'three daily edition batches -> cloudflare-queue (direct fallback on quota)',
        reconciliation_cron: EDITION_BATCH_CRON,
        high_frequency_polling: false,
        candidate_input_mode: 'legacy_candidates_plus_main_typed_sidecars',
        candidate_input_prefix: CANDIDATE_V2_PREFIX,
        typed_input_ref: TYPED_SOURCE_REF,
        typed_input_prefix: TYPED_RECORD_SET_PREFIX,
        direct_fallback_on_queue_daily_limit: true,
        cost_tracking: {
          enabled: true,
          schema_version: 'cloudflare-cost-usage.v1',
          estimation_mode: 'gross_usage_before_free_tier_and_fixed_plan',
          durable_record: 'foundation-lake/journal/v1/*/publisher-run-summary',
        },
      });
    }
    return jsonResponse({ error: 'not_found' }, 404);
  },

  async queue(batch, env) {
    for (const message of batch.messages) {
      await handleQueueMessage(message, env);
    }
  },
};
