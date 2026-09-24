export const PUBLIC_OBSERVATION_LIMITS = {
  maxObservationBytes: 16 * 1024,
  maxEntityBytes: 64 * 1024,
  maxDepth: 6,
  maxObjectKeys: 64,
  maxArrayItems: 100,
  maxStringBytes: 4 * 1024,
} as const;

export interface SanitizedPublicPayload {
  value: unknown;
  bytes: number;
}

const encoder = new TextEncoder();

function byteLength(value: string): number {
  return encoder.encode(value).byteLength;
}

function sanitizeValue(value: unknown, depth: number): unknown {
  if (depth > PUBLIC_OBSERVATION_LIMITS.maxDepth) {
    throw new Error('PUBLIC_PAYLOAD_DEPTH_LIMIT');
  }
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('PUBLIC_PAYLOAD_NON_FINITE_NUMBER');
    return value;
  }
  if (typeof value === 'string') {
    if (byteLength(value) > PUBLIC_OBSERVATION_LIMITS.maxStringBytes) {
      throw new Error('PUBLIC_PAYLOAD_STRING_LIMIT');
    }
    return value;
  }
  if (Array.isArray(value)) {
    if (value.length > PUBLIC_OBSERVATION_LIMITS.maxArrayItems) {
      throw new Error('PUBLIC_PAYLOAD_ARRAY_LIMIT');
    }
    return value.map((item) => sanitizeValue(item, depth + 1));
  }
  if (typeof value === 'object' && value !== null) {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length > PUBLIC_OBSERVATION_LIMITS.maxObjectKeys) {
      throw new Error('PUBLIC_PAYLOAD_KEY_LIMIT');
    }
    const result: Record<string, unknown> = {};
    for (const [key, item] of entries) {
      result[key] = sanitizeValue(item, depth + 1);
    }
    return result;
  }
  throw new Error('PUBLIC_PAYLOAD_UNSUPPORTED_VALUE');
}

/**
 * Validate a public-only structured payload without mutating/truncating it.
 * Any violation drops the whole public payload; private canonical data is
 * untouched.
 */
export function sanitizePublicObservationPayload(
  value: unknown,
): SanitizedPublicPayload | null {
  if (value === undefined || value === null) return null;
  try {
    const sanitized = sanitizeValue(value, 0);
    const serialized = JSON.stringify(sanitized);
    const bytes = byteLength(serialized);
    if (bytes > PUBLIC_OBSERVATION_LIMITS.maxObservationBytes) return null;
    return { value: sanitized, bytes };
  } catch {
    return null;
  }
}

export function canAdmitPublicPayload(
  usedEntityBytes: number,
  payloadBytes: number,
): boolean {
  return usedEntityBytes + payloadBytes <= PUBLIC_OBSERVATION_LIMITS.maxEntityBytes;
}
