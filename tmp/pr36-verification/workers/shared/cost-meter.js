const DEFAULT_PRICING = Object.freeze({
  source: 'Cloudflare public pricing',
  version: 'cloudflare-public-2026-09-22',
  currency: 'USD',
  rates: {
    r2_class_a_usd_per_million: 4.5,
    r2_class_b_usd_per_million: 0.36,
    queue_operations_usd_per_million: 0.4,
    worker_requests_usd_per_million: 0.3,
    worker_cpu_ms_usd_per_million: 0.02,
    r2_standard_storage_usd_per_gb_month: 0.015,
  },
  included_usage: {
    r2_class_a_operations_per_month: 1_000_000,
    r2_class_b_operations_per_month: 10_000_000,
    queue_operations_per_day_free: 10_000,
    worker_requests_per_day_free: 100_000,
    worker_requests_per_month_paid: 10_000_000,
    worker_cpu_ms_per_month_paid: 30_000_000,
  },
});

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function nonNegative(value, fallback = 0) {
  return Math.max(0, finiteNumber(value, fallback));
}

function integer(value, fallback = 0) {
  return Math.floor(nonNegative(value, fallback));
}

function envNumber(env, name, fallback) {
  return nonNegative(env?.[name], fallback);
}

export function pricingFromEnv(env = {}) {
  return {
    source: env.COST_PRICING_SOURCE?.trim() || DEFAULT_PRICING.source,
    version: env.COST_PRICING_VERSION?.trim() || DEFAULT_PRICING.version,
    currency: env.COST_CURRENCY?.trim() || DEFAULT_PRICING.currency,
    rates: {
      r2_class_a_usd_per_million: envNumber(
        env,
        'COST_R2_CLASS_A_USD_PER_MILLION',
        DEFAULT_PRICING.rates.r2_class_a_usd_per_million,
      ),
      r2_class_b_usd_per_million: envNumber(
        env,
        'COST_R2_CLASS_B_USD_PER_MILLION',
        DEFAULT_PRICING.rates.r2_class_b_usd_per_million,
      ),
      queue_operations_usd_per_million: envNumber(
        env,
        'COST_QUEUE_OPERATIONS_USD_PER_MILLION',
        DEFAULT_PRICING.rates.queue_operations_usd_per_million,
      ),
      worker_requests_usd_per_million: envNumber(
        env,
        'COST_WORKER_REQUESTS_USD_PER_MILLION',
        DEFAULT_PRICING.rates.worker_requests_usd_per_million,
      ),
      worker_cpu_ms_usd_per_million: envNumber(
        env,
        'COST_WORKER_CPU_MS_USD_PER_MILLION',
        DEFAULT_PRICING.rates.worker_cpu_ms_usd_per_million,
      ),
      r2_standard_storage_usd_per_gb_month: envNumber(
        env,
        'COST_R2_STANDARD_STORAGE_USD_PER_GB_MONTH',
        DEFAULT_PRICING.rates.r2_standard_storage_usd_per_gb_month,
      ),
    },
    included_usage: { ...DEFAULT_PRICING.included_usage },
  };
}

function byteLength(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, value);
  if (value instanceof Uint8Array) return value.byteLength;
  if (value instanceof ArrayBuffer) return value.byteLength;
  const encoded = new TextEncoder().encode(
    typeof value === 'string' ? value : JSON.stringify(value ?? null),
  );
  return encoded.byteLength;
}

/**
 * Cloudflare Queues counts each 64 KB of message data as one operation and
 * includes approximately 100 bytes of internal message metadata.
 */
export function queueOperationUnits(value) {
  return Math.max(1, Math.ceil((byteLength(value) + 100) / 64_000));
}

function blankUsage() {
  return {
    workers: {
      invocations: 1,
      request_count: 1,
      cpu_ms: null,
    },
    queue: {
      message_bytes: 0,
      messages_written: 0,
      messages_delivered: 0,
      messages_deleted: 0,
      write_operations: 0,
      read_operations: 0,
      delete_operations: 0,
      dlq_write_operations: 0,
      retry_scheduled: 0,
    },
    r2: {
      class_a_operations: 0,
      class_b_operations: 0,
      free_delete_operations: 0,
      bytes_read: 0,
      bytes_written: 0,
    },
    external_requests: {
      github_api: 0,
      make_money_http: 0,
      source_fetch: 0,
      other: 0,
    },
  };
}

export function createCostMeter({
  service,
  runId = null,
  trigger = null,
  env = {},
  startedAt = new Date().toISOString(),
} = {}) {
  const pricing = pricingFromEnv(env);
  return {
    schema_version: 'cloudflare-cost-usage.v1',
    service: service || 'unknown',
    run_id: runId,
    trigger,
    started_at: startedAt,
    pricing_source: pricing.source,
    pricing_version: pricing.version,
    currency: pricing.currency,
    usage: blankUsage(),
  };
}

function ensureMeter(meter) {
  if (!meter || typeof meter !== 'object' || !meter.usage) {
    throw new Error('cost meter is required');
  }
  return meter;
}

export function recordWorkerCpu(meter, cpuMs) {
  ensureMeter(meter).usage.workers.cpu_ms = Number.isFinite(Number(cpuMs))
    ? nonNegative(cpuMs)
    : null;
}

export function recordQueueWrite(meter, value) {
  const target = ensureMeter(meter).usage.queue;
  const units = queueOperationUnits(value);
  target.message_bytes += byteLength(value);
  target.messages_written += 1;
  target.write_operations += units;
  return units;
}

export function recordQueueDelivery(meter, value, { ack = false, retry = false, dlqWrite = false } = {}) {
  const target = ensureMeter(meter).usage.queue;
  const units = queueOperationUnits(value);
  target.message_bytes += byteLength(value);
  target.messages_delivered += 1;
  target.read_operations += units;
  if (ack) {
    target.messages_deleted += 1;
    target.delete_operations += units;
  }
  if (retry) target.retry_scheduled += 1;
  if (dlqWrite) target.dlq_write_operations += units;
  return units;
}

export function recordQueueAck(meter, value) {
  const target = ensureMeter(meter).usage.queue;
  const units = queueOperationUnits(value);
  target.message_bytes += byteLength(value);
  target.messages_deleted += 1;
  target.delete_operations += units;
  return units;
}

export function recordQueueHint(meter, hint) {
  if (!hint || typeof hint !== 'object') return;
  const target = ensureMeter(meter).usage.queue;
  target.message_bytes += integer(hint.message_bytes);
  target.messages_written += integer(hint.messages_written, 1);
  target.write_operations += integer(hint.write_operations, 1);
}

export function recordR2Operation(meter, operation, { bytes = 0 } = {}) {
  const target = ensureMeter(meter).usage.r2;
  const normalized = String(operation || '').toLowerCase();
  const amount = integer(bytes);
  if (['put', 'copy', 'multipart'].includes(normalized)) {
    target.class_a_operations += 1;
    target.bytes_written += amount;
  } else if (['get', 'head', 'list'].includes(normalized)) {
    target.class_b_operations += 1;
    target.bytes_read += amount;
  } else if (normalized === 'delete') {
    target.free_delete_operations += 1;
  }
}

export function recordExternalRequest(meter, kind = 'other') {
  const target = ensureMeter(meter).usage.external_requests;
  const key = Object.prototype.hasOwnProperty.call(target, kind) ? kind : 'other';
  target[key] += 1;
}

export function addAttributedR2Usage(meter, {
  class_a_operations = 0,
  class_b_operations = 0,
  bytes_read = 0,
  bytes_written = 0,
} = {}) {
  const target = ensureMeter(meter).usage.r2;
  target.class_a_operations += integer(class_a_operations);
  target.class_b_operations += integer(class_b_operations);
  target.bytes_read += integer(bytes_read);
  target.bytes_written += integer(bytes_written);
}

function roundUsd(value) {
  return Math.round(nonNegative(value) * 1_000_000) / 1_000_000;
}

export function finalizeCostMeter(meter, env = {}, finishedAt = new Date().toISOString()) {
  const source = ensureMeter(meter);
  const pricing = pricingFromEnv(env);
  const usage = JSON.parse(JSON.stringify(source.usage));
  const queueOperations =
    usage.queue.write_operations +
    usage.queue.read_operations +
    usage.queue.delete_operations +
    usage.queue.dlq_write_operations;
  const r2ClassA = usage.r2.class_a_operations;
  const r2ClassB = usage.r2.class_b_operations;
  const workerRequests = usage.workers.request_count;
  const workerCpuMs = usage.workers.cpu_ms;
  const costs = {
    r2_class_a_usd: roundUsd((r2ClassA / 1_000_000) * pricing.rates.r2_class_a_usd_per_million),
    r2_class_b_usd: roundUsd((r2ClassB / 1_000_000) * pricing.rates.r2_class_b_usd_per_million),
    queue_operations_usd: roundUsd((queueOperations / 1_000_000) * pricing.rates.queue_operations_usd_per_million),
    worker_requests_usd: roundUsd((workerRequests / 1_000_000) * pricing.rates.worker_requests_usd_per_million),
    worker_cpu_ms_usd: workerCpuMs === null
      ? null
      : roundUsd((workerCpuMs / 1_000_000) * pricing.rates.worker_cpu_ms_usd_per_million),
  };
  costs.gross_usage_before_free_tier_usd = roundUsd(
    Object.values(costs).filter((value) => typeof value === 'number').reduce((sum, value) => sum + value, 0),
  );

  const started = Date.parse(source.started_at);
  const finished = Date.parse(finishedAt);
  return {
    schema_version: source.schema_version,
    service: source.service,
    run_id: source.run_id,
    trigger: source.trigger,
    started_at: source.started_at,
    finished_at: finishedAt,
    wall_time_ms: Number.isNaN(started) || Number.isNaN(finished)
      ? null
      : Math.max(0, finished - started),
    pricing_source: pricing.source,
    pricing_version: pricing.version,
    currency: pricing.currency,
    estimation_mode: 'gross_usage_before_free_tier_and_fixed_plan',
    usage,
    derived: {
      queue_operations: queueOperations,
      r2_class_a_operations: r2ClassA,
      r2_class_b_operations: r2ClassB,
      worker_requests: workerRequests,
      worker_cpu_ms: workerCpuMs,
      storage_gb_month: null,
    },
    estimated_cost: costs,
    included_usage_not_applied: pricing.included_usage,
    reconciliation: {
      exact_invoice: false,
      reason: 'Cloudflare free-tier allocation, account plan, CPU metrics, and storage GB-month are account-level values.',
      cpu_ms_source: 'Cloudflare Workers Metrics or GraphQL Analytics API',
      storage_source: 'Cloudflare R2 Usage dashboard or billing export',
      next_step: 'Aggregate these receipts by billing period and compare with the Cloudflare billing dashboard.',
    },
  };
}

export const __test = {
  byteLength,
  blankUsage,
  pricingFromEnv,
  roundUsd,
};
