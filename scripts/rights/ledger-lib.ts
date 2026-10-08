/**
 * 出典の権利台帳（ドメインごと）。正本は data/source-rights-ledger.json。詳細は docs/architecture/RIGHTS_LEDGER.md。
 * - 公開を止める関門ではない。「使ってよいと判断した根拠」を横に残し、苦情・規約の変更に備えるためのもの。
 * - 唯一、公開に効くのは status=suspended（使用停止）。source-policy.ts がこの台帳を見て、該当ドメインの出典を不許可にする。
 * - URL 単位の個別審査（data/catalog-source-rights.json）と標準の規則（UF のスナップショット）はそのまま。台帳はドメイン単位の根拠と状態を足す。
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { z } from 'zod';

export const LEDGER_FILE = 'data/source-rights-ledger.json';
/** 判断から見直しまでの日数（台帳の reviewAfterDays が無い時の初期値） */
export const DEFAULT_REVIEW_DAYS = 180;

const tri = z.enum(['yes', 'no', 'unconfirmed']);
const quoteTerms = z.enum(['permits', 'prohibits', 'silent', 'unconfirmed']);
const isoTime = z.iso.datetime({ offset: true });

const termsEvidence = z.object({
  url: z.url(), hash: z.string().regex(/^[0-9a-f]{64}$/), fetchedAt: isoTime, textLength: z.number().int().nonnegative(),
});
const sourcePageEvidence = z.object({
  caseId: z.string().min(1), url: z.url(), textHash: z.string().regex(/^[0-9a-f]{64}$/), fetchedAt: isoTime,
  via: z.enum(['direct', 'wayback']).optional(),
});

export const domainEntrySchema = z.object({
  siteName: z.string().trim().min(1),
  siteUrl: z.url(),
  status: z.enum(['active', 'suspended']),
  statusReason: z.string().trim().min(1),
  statusChangedAt: isoTime,
  decision: z.object({
    decidedAt: isoTime,
    decidedBy: z.string().trim().min(1),
    /** registry=UF の標準規則 / individual_review=URL 単位の個別審査 / ai_judgment=集める段のAIが3基準（ログイン不要・有料の壁なし・引用を禁じていない）で判断 / unconfirmed=根拠を確かめられていない */
    basis: z.enum(['registry', 'individual_review', 'ai_judgment', 'unconfirmed']),
    policyIds: z.array(z.string()),
    /** 個別審査の記録（data/catalog-source-rights.json のキー） */
    reviewUrls: z.array(z.url()),
    displayTier: z.enum(['automatic', 'facts_only', 'unconfirmed']),
    usage: z.string().trim().min(1),
    checks: z.object({
      loginFree: tri, noPaywall: tri, quoteTerms,
      note: z.string().trim().min(1),
    }),
    termsUrl: z.url().nullable(),
    termsCheckedAt: isoTime.nullable(),
  }),
  ownerWords: z.array(z.object({ at: isoTime, text: z.string().min(1), verbatim: z.boolean() })),
  evidence: z.object({ terms: termsEvidence.nullable(), sourcePages: z.array(sourcePageEvidence) }),
  history: z.array(z.object({ at: isoTime, by: z.string().min(1), action: z.enum(['seed', 'review', 'suspend', 'resume', 'terms-snapshot', 'note']), reason: z.string().min(1) })),
});
export type DomainEntry = z.infer<typeof domainEntrySchema>;

export const ledgerSchema = z.object({
  version: z.literal(1),
  note: z.string(),
  reviewAfterDays: z.number().int().positive(),
  domains: z.record(z.string().regex(/^[a-z0-9-]+(\.[a-z0-9-]+)+$/), domainEntrySchema),
});
export type Ledger = z.infer<typeof ledgerSchema>;

export function emptyLedger(): Ledger {
  return {
    version: 1,
    note: '出典の権利台帳（ドメインごと）。手で直してよい。使い方と手順は docs/architecture/RIGHTS_LEDGER.md。pnpm rights:where / rights:suspend / rights:review',
    reviewAfterDays: DEFAULT_REVIEW_DAYS,
    domains: {},
  };
}

export function readLedger(file = LEDGER_FILE): Ledger {
  if (!existsSync(file)) return emptyLedger();
  return ledgerSchema.parse(JSON.parse(readFileSync(file, 'utf8')));
}

export function writeLedger(ledger: Ledger, file = LEDGER_FILE): void {
  const sorted: Ledger = { ...ledger, domains: Object.fromEntries(Object.entries(ledger.domains).sort(([a], [b]) => a.localeCompare(b))) };
  writeFileSync(file, `${JSON.stringify(ledgerSchema.parse(sorted), null, 1)}\n`);
}

export function hostOf(url: string): string | null {
  try { return new URL(url).hostname.toLowerCase().replace(/\.$/, '').replace(/^www\./, ''); } catch { return null; }
}

/** 台帳の項目 domain が host を含むか（同じ、またはサブドメイン） */
export function domainCovers(domain: string, host: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

/** host を担当する台帳の項目（最も具体的＝長いもの）。無ければ null */
export function entryFor(ledger: Ledger, host: string): { domain: string; entry: DomainEntry } | null {
  let best: string | null = null;
  for (const d of Object.keys(ledger.domains)) if (domainCovers(d, host) && (best === null || d.length > best.length)) best = d;
  return best ? { domain: best, entry: ledger.domains[best]! } : null;
}

/**
 * 使用停止になっているドメインの項目（無ければ null）。
 * 具体的な項目が active でも、親ドメインが suspended ならそちらを優先する（親の停止は子を含む）。
 */
export function suspendedEntryFor(ledger: Ledger, url: string): { domain: string; entry: DomainEntry } | null {
  const host = hostOf(url);
  if (!host) return null;
  for (const [d, e] of Object.entries(ledger.domains)) if (e.status === 'suspended' && domainCovers(d, host)) return { domain: d, entry: e };
  return null;
}

let cache: { mtimeKey: string; ledger: Ledger } | null = null;
/** source-policy.ts から毎回呼ばれるので、内容が変わるまで解析し直さない。壊れた台帳は例外にして止める（黙って空扱いにしない） */
export function readLedgerCached(file = LEDGER_FILE): Ledger {
  if (!existsSync(file)) return emptyLedger();
  const raw = readFileSync(file, 'utf8');
  if (cache && cache.mtimeKey === raw) return cache.ledger;
  const ledger = ledgerSchema.parse(JSON.parse(raw));
  cache = { mtimeKey: raw, ledger };
  return ledger;
}

export function nowIso(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? '+' : '-';
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}${sign}${p(Math.floor(Math.abs(off) / 60))}:${p(Math.abs(off) % 60)}`;
}

/** 台帳の項目の見直し期限（判断日 + 日数）が過ぎているか */
export function reviewOverdue(entry: DomainEntry, days: number, now = Date.now()): boolean {
  return Date.parse(entry.decision.decidedAt) + days * 86400_000 <= now;
}
