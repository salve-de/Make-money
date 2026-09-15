/** Read optional historical UI fields without weakening the canonical entity contract. */
function readField(value: unknown, key: string): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !Object.hasOwn(value, key)) return undefined;
  return Reflect.get(value, key);
}
export function legacyText(value: unknown, key: string): string | undefined {
  const field = readField(value, key);
  return typeof field === 'string' ? field : undefined;
}
export function legacyNumber(value: unknown, key: string): number | undefined {
  const field = readField(value, key);
  return typeof field === 'number' && Number.isFinite(field) ? field : undefined;
}
