const LEGACY_PROOF_PREFIXES: Record<string, string> = {
  ent_betterstack: 'ent_betteruptime',
  ent_midjourney: 'ent_midjourney',
};

/**
 * Radar copy may retain a small set of known historical short IDs, but
 * navigation must only use an ID that actually exists in the current ledger.
 * Unknown IDs never get generic prefix matching: only an explicit legacy alias
 * may use prefix resolution, and ambiguity fails closed.
 */
export function resolveRadarProofEntityId(
  requestedId: string | null | undefined,
  existingIds: readonly string[],
): string | null {
  const requested = requestedId?.trim();
  if (!requested) return null;

  if (existingIds.includes(requested)) return requested;

  const prefix = LEGACY_PROOF_PREFIXES[requested];
  if (!prefix) return null;

  const matches = existingIds.filter((id) => id === prefix || id.startsWith(`${prefix}_`));
  return matches.length === 1 ? matches[0] : null;
}
