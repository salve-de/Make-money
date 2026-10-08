/**
 * pnpm rights:seed [--dry-run]
 * 公開中の事例が使っている出典のドメインを洗い出し、権利台帳に足りない分だけ記録する（既にある項目は触らない）。
 * 根拠が確かめられていない項目は「未確認」と書く。使用停止にはしない。
 * 台帳に載っていない出典を見つけたら未確認の欄を作る処理は ensureDomainEntries（取り込みの検査からも呼ぶ）。
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolveCatalogSourcePolicy } from '../../src/lib/foundation/publication-rights';
import rightsSnapshot from '../../data/foundation-public-rights-snapshot.json';
import { SOURCE_RIGHTS_FILE, sourcePolicyIgnoringLedger } from '../reader-case/source-policy';
import { domainCovers, hostOf, nowIso, readLedger, writeLedger, type DomainEntry, type Ledger } from './ledger-lib';
import { loadUnfilteredReaders } from './usage-lib';

/** サブドメインを親にまとめない（別の書き手の場所）プラットフォーム */
const PLATFORM_HOSTS = new Set(['substack.com', 'hashnode.dev', 'github.io', 'medium.com', 'wordpress.com', 'blogspot.com']);

export const OWNER_WORDS_20261008 = [
  { at: '2026-10-08T00:00:00+09:00', text: 'お前の方で大丈夫なやつを選んで出すんだよ', verbatim: true },
  { at: '2026-10-08T00:00:00+09:00', text: 'それらも記録してね　権利関係', verbatim: true },
  { at: '2026-10-08T00:00:00+09:00', text: 'あとで誰かに何か言われたら柔軟にできるように', verbatim: true },
  { at: '2026-10-08T00:00:00+09:00', text: '法的に変わったりしたらとかさ', verbatim: true },
  { at: '2026-10-08T00:00:00+09:00', text: '今後は絶対にそれも加味して集めるようにして、できるようにして', verbatim: true },
];

export type Tri = 'yes' | 'no' | 'unconfirmed';
/** 集める段のAIが出典ごとに書く権利の判断（3基準）。書いていなければ未確認 */
export interface AiRights { loginFree?: Tri; noPaywall?: Tri; quoteTerms?: 'permits' | 'prohibits' | 'silent' | 'unconfirmed'; termsUrl?: string | null; note?: string }
export interface SourceRef { caseId: string; url: string; publisher: string; entityUrl: string; rights?: AiRights }
type Review = { url: string; decision: string; reviewer: string; reviewedAt: string; termsUrl: string; note: string };
type EvidenceFile = { cases: Record<string, { sources: Record<string, { textHash: string; fetchedAt: string; via?: 'direct' | 'wayback' }> }> };
const readJson = <T,>(f: string, d: T): T => (existsSync(f) ? (JSON.parse(readFileSync(f, 'utf8')) as T) : d);

/** 親ホストが同じ集合にあれば親にまとめる（docs.churnkey.co → churnkey.co）。プラットフォームの子は別扱い */
export function groupDomains(hosts: string[]): Map<string, string> {
  const set = new Set(hosts);
  const out = new Map<string, string>();
  for (const h of hosts) {
    let best = h;
    const parts = h.split('.');
    for (let i = 1; i < parts.length - 1; i++) {
      const parent = parts.slice(i).join('.');
      if (PLATFORM_HOSTS.has(parent)) break;
      if (set.has(parent)) best = parent;
    }
    out.set(h, best);
  }
  return out;
}

function buildEntry(domain: string, refs: SourceRef[], reviews: Record<string, Review>, evidence: EvidenceFile, by: string, at: string): DomainEntry {
  const own = refs.filter((r) => { const h = hostOf(r.url); return !!h && domainCovers(domain, h); });
  const reviewed = own.map((r) => reviews[r.url]).filter((r): r is Review => !!r);
  const policies = [...new Map(own.map((r) => [r.url, resolveCatalogSourcePolicy(r.url, r.entityUrl)]).filter(([, p]) => !!p) as [string, NonNullable<ReturnType<typeof resolveCatalogSourcePolicy>>][]).values()];
  const policyIds = [...new Set(policies.map((p) => p.policyId))];
  const tier = policies.some((p) => p.displayTier === 'automatic') ? 'automatic' : policies.length ? 'facts_only' : reviewed.length ? 'facts_only' : 'unconfirmed';
  const ai = own.map((r) => r.rights).filter((r): r is AiRights => !!r);
  const merge = (pick: (r: AiRights) => Tri | undefined): Tri => {
    const v = ai.map(pick).filter((x): x is Tri => !!x);
    return v.includes('no') ? 'no' : v.length === ai.length && ai.length > 0 && v.every((x) => x === 'yes') ? 'yes' : 'unconfirmed';
  };
  const aiQuote = ai.map((r) => r.quoteTerms).filter((x): x is NonNullable<AiRights['quoteTerms']> => !!x);
  const aiChecks = {
    loginFree: merge((r) => r.loginFree), noPaywall: merge((r) => r.noPaywall),
    quoteTerms: aiQuote.includes('prohibits') ? 'prohibits' as const : aiQuote.length && aiQuote.length === ai.length && aiQuote.every((q) => q === 'permits' || q === 'silent') ? (aiQuote.every((q) => q === 'permits') ? 'permits' as const : 'silent' as const) : 'unconfirmed' as const,
  };
  const aiGiven = ai.length > 0 && ai.some((r) => r.loginFree || r.noPaywall || r.quoteTerms);
  const hasRule = reviewed.some((r) => r.decision === 'allowed') || policyIds.length > 0;
  const basis = reviewed.some((r) => r.decision === 'allowed') ? 'individual_review' : policyIds.length ? 'registry' : aiGiven ? 'ai_judgment' : 'unconfirmed';
  const failed = !hasRule && aiGiven && (aiChecks.loginFree === 'no' || aiChecks.noPaywall === 'no' || aiChecks.quoteTerms === 'prohibits');
  const snapshotRecords = (rightsSnapshot as { records: { policy: { policy_id: string; reviewed_at: string } }[] }).records;
  const policyDates = policyIds.map((id) => snapshotRecords.find((r) => r.policy.policy_id === id)?.policy.reviewed_at).filter((d): d is string => !!d).sort();
  const pages = own.flatMap((r) => {
    const p = evidence.cases[r.caseId]?.sources[r.url];
    return p ? [{ caseId: r.caseId, url: r.url, textHash: p.textHash, fetchedAt: p.fetchedAt, ...(p.via ? { via: p.via } : {}) }] : [];
  });
  const aiNote = ai.map((r) => r.note).filter(Boolean).join(' / ');
  const allDirect = pages.length > 0 && pages.length === own.length && pages.every((p) => p.via === 'direct');
  const publisher = [...own.map((r) => r.publisher)].sort((a, b) => own.filter((r) => r.publisher === b).length - own.filter((r) => r.publisher === a).length)[0] ?? domain;
  const reviewNote = reviewed.map((r) => `個別審査(${r.reviewedAt.slice(0, 10)}): ${r.note}`).join(' / ');
  const checkNote = [
    allDirect ? `ログイン不要: 取得時（${pages[0]!.fetchedAt.slice(0, 10)}ほか）に直接取得で本文を読めた（HTTP 200）。` : pages.length ? 'ログイン不要: 一部または全部を魚拓経由で取得しており、直接は未確認。' : 'ログイン不要: 取得記録なし（未確認）。',
    '有料の壁・規約の引用禁止条項: 未確認（確かめたら rights:review で更新する）。',
    reviewNote, aiNote ? `AIの判断(${at.slice(0, 10)}): ${aiNote}` : '', policyIds.length ? `標準の規則: ${policyIds.join(', ')}` : '',
  ].filter(Boolean).join(' ');
  const termsUrl = reviewed.find((r) => r.termsUrl)?.termsUrl ?? ai.find((r) => r.termsUrl)?.termsUrl ?? null;
  return {
    siteName: publisher, siteUrl: `https://${domain}/`, status: failed ? 'suspended' : 'active',
    statusReason: failed ? '3基準（ログイン不要・有料の壁なし・引用を禁じていない）を満たさないと判断。記録には残し、画面には出さない' : basis === 'unconfirmed' ? '取り込み時に自動で記録（根拠は未確認）' : '使用中',
    statusChangedAt: at,
    decision: {
      decidedAt: basis === 'ai_judgment' ? at : basis === 'individual_review' ? (reviewed.find((r) => r.decision === 'allowed')!.reviewedAt) : (policyDates.at(-1) ?? at),
      decidedBy: basis === 'ai_judgment' ? `AI（集める段の自動判断、${at.slice(0, 10)}）` : basis === 'individual_review' ? `オーナー承認（調整役経由、${reviewed[0]!.reviewedAt.slice(0, 10)}）／台帳への記録は担当(${at.slice(0, 10)})`
        : basis === 'registry' ? `標準の権利規則（Universal Foundation の審査）／台帳への記録は担当(${at.slice(0, 10)})` : `担当(${at.slice(0, 10)})。根拠は未確認`,
      basis, policyIds, reviewUrls: reviewed.map((r) => r.url), displayTier: tier,
      usage: '数字と事実だけを自分の言葉で書き、出典の名前・URL・日付を付ける。文章・画像は写さない（本人の発言は「本人申告」と表示）',
      checks: basis === 'ai_judgment' ? { ...aiChecks, note: checkNote } : { loginFree: allDirect ? 'yes' : 'unconfirmed', noPaywall: 'unconfirmed', quoteTerms: 'unconfirmed', note: checkNote },
      termsUrl, termsCheckedAt: null,
    },
    ownerWords: OWNER_WORDS_20261008,
    evidence: { terms: null, sourcePages: pages },
    history: [{ at, by, action: 'seed', reason: basis === 'unconfirmed' ? '台帳に新しく記録（根拠は未確認）' : basis === 'ai_judgment' ? `集める段でAIが3基準で判断して記録${failed ? '（基準を満たさず使用停止）' : ''}` : '既存の権利判断から台帳に記録' }],
  };
}

/**
 * refs の出典を担当するドメインが台帳に無ければ、未確認の項目を足して返す（既存の項目は変えない）。取り込みの検査・調査の記録から呼ぶ。
 * 戻り値は足した domain の一覧。
 */
export function ensureDomainEntries(ledger: Ledger, refs: SourceRef[], by: string, at = nowIso()): string[] {
  const reviews = readJson<Record<string, Review>>(SOURCE_RIGHTS_FILE, {});
  const evidence = readJson<EvidenceFile>('data/publication-evidence.json', { cases: {} });
  const hosts = [...new Set(refs.map((r) => hostOf(r.url)).filter((h): h is string => !!h))];
  const grouped = groupDomains([...hosts, ...Object.keys(ledger.domains)]);
  const added: string[] = [];
  for (const h of hosts) {
    const covered = Object.keys(ledger.domains).some((d) => domainCovers(d, h));
    if (covered) continue;
    const domain = grouped.get(h) ?? h;
    ledger.domains[domain] = buildEntry(domain, refs, reviews, evidence, by, at);
    added.push(domain);
  }
  return added;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dry = process.argv.includes('--dry-run');
  const refs: SourceRef[] = [];
  for (const [caseId, { reader, entityUrl }] of loadUnfilteredReaders()) {
    for (const s of reader.sources) if (sourcePolicyIgnoringLedger(s.url, entityUrl)) refs.push({ caseId, url: s.url, publisher: s.publisher, entityUrl });
  }
  const ledger = readLedger();
  const added = ensureDomainEntries(ledger, refs, '担当(rights-ledger)');
  console.log(`[rights:seed] 公開中の事例の出典 ${refs.length} 件 → 新しく記録したドメイン ${added.length} 件（台帳は計 ${Object.keys(ledger.domains).length} 件）`);
  for (const d of added) console.log(`  + ${d}  [${ledger.domains[d]!.decision.basis}]`);
  if (!dry && added.length) writeLedger(ledger);
}
