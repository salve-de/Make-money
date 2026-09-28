export async function withOneFoundationPageRetry<T>(
  request: () => Promise<T>,
  canRetry: () => boolean,
  waitBeforeRetry: () => Promise<void>,
): Promise<T> {
  try {
    return await request();
  } catch (firstError) {
    if (!canRetry()) throw firstError;

    await waitBeforeRetry();

    // A query can commit while the backoff timer is pending. Recheck at the
    // point of retry so an obsolete cursor never starts another network read.
    if (!canRetry()) throw firstError;
    return request();
  }
}
