/** Registry rules or a recorded individual review; source category (official/article/review) is not an allow-list. */
import { existsSync, readFileSync } from 'node:fs';
import { z } from 'zod';
import { resolveCatalogSourcePolicy } from '../../src/lib/foundation/publication-rights';
import rightsSnapshot from '../../data/foundation-public-rights-snapshot.json';
import { contentHash } from './publication-evaluation';

export const SOURCE_RIGHTS_FILE = 'data/catalog-source-rights.json';
const reviewSchema = z.object({
  url: z.url(), decision: z.enum(['allowed', 'held', 'blocked']),
  usage: z.literal('independently_worded_facts'), reviewer: z.string().trim().min(1),
  reviewedAt: z.iso.datetime({ offset: true }), termsUrl: z.url(), note: z.string().trim().min(1),
  recheckAfter: z.iso.datetime({ offset: true }).optional(),
});
export function sourcePolicy(url: string, officialUrl?: string | null): unknown | null {
  // Individual revocations take priority over an otherwise allowing registry entry.
  if (existsSync(SOURCE_RIGHTS_FILE)) {
    const reviews = JSON.parse(readFileSync(SOURCE_RIGHTS_FILE, 'utf8')) as Record<string, unknown>;
    if (Object.hasOwn(reviews, url)) {
      const review = reviewSchema.safeParse(reviews[url]);
      if (!review.success || review.data.url !== url || review.data.decision !== 'allowed' ||
          (review.data.recheckAfter && Date.parse(review.data.recheckAfter) <= Date.now())) return null;
      return review.data;
    }
  }
  const policy = resolveCatalogSourcePolicy(url, officialUrl);
  return policy ? { ...policy, registryHash: contentHash(rightsSnapshot) } : null;
}
