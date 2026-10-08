/** Registry rules or a recorded individual review; source category (official/article/review) is not an allow-list. */
import { existsSync, readFileSync } from 'node:fs';
import { z } from 'zod';
import { resolveCatalogSourcePolicy } from '../../src/lib/foundation/publication-rights';
import rightsSnapshot from '../../data/foundation-public-rights-snapshot.json';
import { contentHash } from './publication-evaluation';
import { entryFor, hostOf, readLedgerCached, suspendedEntryFor } from '../rights/ledger-lib';

export const SOURCE_RIGHTS_FILE = 'data/catalog-source-rights.json';
const reviewSchema = z.object({
  url: z.url(), decision: z.enum(['allowed', 'held', 'blocked']),
  usage: z.literal('independently_worded_facts'), reviewer: z.string().trim().min(1),
  reviewedAt: z.iso.datetime({ offset: true }), termsUrl: z.url(), note: z.string().trim().min(1),
  recheckAfter: z.iso.datetime({ offset: true }).optional(),
});
export function sourcePolicy(url: string, officialUrl?: string | null): unknown | null {
  // 権利台帳（data/source-rights-ledger.json）で使用停止にしたドメインは、個別審査・標準の規則より先に不許可にする（pnpm rights:suspend）
  if (suspendedEntryFor(readLedgerCached(), url)) return null;
  return sourcePolicyIgnoringLedger(url, officialUrl);
}

/** 台帳の使用停止を見ない判定（rights:where などが「停止前に許可されていたか」を知るため） */
export function sourcePolicyIgnoringLedger(url: string, officialUrl?: string | null): unknown | null {
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
  if (policy) return { ...policy, registryHash: contentHash(rightsSnapshot) };
  return ledgerJudgmentPolicy(url);
}

/**
 * 標準の規則にも個別審査にも無いサイトでも、集める段のAIが3基準（ログイン不要・有料の壁なし・引用を禁じていない）を満たすと
 * 権利台帳に記録した使用中のドメインなら許可する（facts_only: 事実を自分の言葉で、リンク付き）。未確認が1つでもあれば許可しない。
 */
function ledgerJudgmentPolicy(url: string): unknown | null {
  const host = hostOf(url);
  if (!host) return null;
  const found = entryFor(readLedgerCached(), host);
  if (!found || found.entry.status !== 'active' || found.entry.decision.basis !== 'ai_judgment') return null;
  const c = found.entry.decision.checks;
  if (c.loginFree !== 'yes' || c.noPaywall !== 'yes' || !['permits', 'silent'].includes(c.quoteTerms)) return null;
  return { policyId: 'ledger.ai-judgment', sourceId: `ledger.${found.domain}`, providerName: found.entry.siteName, displayTier: 'facts_only' };
}
