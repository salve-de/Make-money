type JsonRecord = Record<string, unknown>;
type CanonicalReader = (key: string) => Promise<Uint8Array | null>;

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Preparation only; deliberately not wired into the scheduled Writer yet.
 * research-bundle.v1 permits omitted unit/amount_label, while ingest.ts requires
 * explicit string|null. Fill only absent fields on a not-yet-stored bundle.
 * No stored bytes, business values, evidence, or other missing fields change.
 */
export async function prepareUnstoredMoneySignalDefaults(bundle: JsonRecord, readCanonical: CanonicalReader) {
  if (bundle.schema_version !== 'research-bundle.v1' || typeof bundle.run_id !== 'string'
    || !/^run_[A-Za-z0-9_.:-]+$/.test(bundle.run_id)
    || typeof bundle.retrieved_at !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(bundle.retrieved_at)) {
    throw new Error('Invalid bundle identity for null-default preparation');
  }
  const date = new Date(bundle.retrieved_at);
  if (!Number.isFinite(date.getTime())) throw new Error('Invalid bundle date');
  const partition = date.toISOString().slice(0, 10).replaceAll('-', '/');
  const key = `datasets/ds.business.research-bundles.derived/v1/${partition}/${bundle.run_id}.json`;
  const stored = await readCanonical(key);
  // Do not parse or regenerate an existing canonical bundle, even if the
  // incoming schema representation appears equivalent. Failures are not absence.
  if (stored !== null) return { status: 'EXISTING_BUNDLE_UNCHANGED' as const, key, stored };

  if (bundle.money_signals !== undefined && !Array.isArray(bundle.money_signals)) {
    throw new Error('money_signals must be an array');
  }
  const changes: Array<{ money_signal_id: string; fields: string[] }> = [];
  const moneySignals = (bundle.money_signals ?? []).map((row: unknown) => {
    if (!isRecord(row) || typeof row.money_signal_id !== 'string' || !/^ms_[a-f0-9]{24}$/.test(row.money_signal_id)) {
      throw new Error('Invalid MoneySignal identity');
    }
    const next = { ...row };
    const fields: string[] = [];
    for (const field of ['unit', 'amount_label']) {
      if (!Object.hasOwn(row, field)) {
        next[field] = null;
        fields.push(field);
      } else if (row[field] !== null && typeof row[field] !== 'string') {
        throw new Error(`Invalid MoneySignal ${field}; do not coerce`);
      }
    }
    if (fields.length) changes.push({ money_signal_id: row.money_signal_id, fields });
    return next;
  });
  return { status: 'PREPARED_UNSTORED_BUNDLE' as const, key, changes,
    bundle: changes.length ? { ...bundle, money_signals: moneySignals } : bundle };
}
