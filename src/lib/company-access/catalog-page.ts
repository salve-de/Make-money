export function isValidCatalogPageProgress(value: {
  offset: number;
  dataLength: number;
  generation: unknown;
  total: unknown;
  nextOffset: unknown;
}): boolean {
  const { offset, dataLength, generation, total, nextOffset } = value;
  if (!Number.isSafeInteger(offset) || offset < 0 || !Number.isSafeInteger(dataLength) || dataLength < 0) return false;
  if (typeof generation !== 'string' || generation.length === 0) return false;
  if (!Number.isSafeInteger(total) || (total as number) < 0) return false;

  const consumed = offset + dataLength;
  if (!Number.isSafeInteger(consumed) || consumed > (total as number)) return false;
  if (dataLength === 0 && consumed < (total as number)) return false;
  const expectedNextOffset = consumed < (total as number) ? consumed : null;
  return nextOffset === expectedNextOffset;
}
