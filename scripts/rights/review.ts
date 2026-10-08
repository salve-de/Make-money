/**
 * pnpm rights:review [--fetch] [--json]
 * 見直しが要るサイトの一覧を出す（読み取り中心。公開は止めない。常に終了コード0）。
 *  1. 判断から reviewAfterDays（初期180日）たった
 *  2. 規約ページの指紋が変わった（--fetch の時だけ取得して比べる。台帳は書き換えない）
 *  3. 個別審査（data/catalog-source-rights.json）の recheckAfter が過ぎた／期限が近い（30日以内）
 *  4. 個別審査にあるのに台帳に無いドメイン、根拠が未確認のまま残っている項目
 * 毎日の定期実行（scripts/reader-case/run-daily.sh）から呼ばれる。
 */
import { existsSync, readFileSync } from 'node:fs';
import { SOURCE_RIGHTS_FILE } from '../reader-case/source-policy';
import { domainCovers, hostOf, readLedger, reviewOverdue } from './ledger-lib';
import { fetchTermsFingerprint } from './terms-snapshot';

export interface ReviewFinding { domain: string; kind: 'overdue' | 'terms-changed' | 'terms-unreachable' | 'recheck-expired' | 'recheck-soon' | 'not-in-ledger' | 'unconfirmed'; detail: string }

export async function collectFindings(opts: { fetchTerms: boolean; now?: number }): Promise<ReviewFinding[]> {
  const now = opts.now ?? Date.now();
  const ledger = readLedger();
  const out: ReviewFinding[] = [];
  for (const [domain, e] of Object.entries(ledger.domains)) {
    if (e.status === 'suspended') continue;
    if (reviewOverdue(e, ledger.reviewAfterDays, now)) out.push({ domain, kind: 'overdue', detail: `判断(${e.decision.decidedAt.slice(0, 10)})から${ledger.reviewAfterDays}日以上たった` });
    const unconfirmed = Object.entries(e.decision.checks).filter(([k, v]) => k !== 'note' && v === 'unconfirmed').map(([k]) => ({ loginFree: 'ログイン不要', noPaywall: '有料の壁なし', quoteTerms: '引用禁止の有無' } as Record<string, string>)[k]);
    if (e.decision.basis === 'unconfirmed' || unconfirmed.length) out.push({ domain, kind: 'unconfirmed', detail: `未確認: ${[...(e.decision.basis === 'unconfirmed' ? ['根拠'] : []), ...unconfirmed].join('、')}` });
    if (opts.fetchTerms && e.evidence.terms) {
      const r = await fetchTermsFingerprint(e.evidence.terms.url);
      if ('error' in r) out.push({ domain, kind: 'terms-unreachable', detail: `規約ページを取得できない（${r.error}）: ${e.evidence.terms.url}` });
      else if (r.hash !== e.evidence.terms.hash) out.push({ domain, kind: 'terms-changed', detail: `規約ページの指紋が変わった（記録 ${e.evidence.terms.fetchedAt.slice(0, 10)} の ${e.evidence.terms.hash.slice(0, 8)} → 今 ${r.hash.slice(0, 8)}）: ${e.evidence.terms.url}` });
    }
  }
  const reviews = existsSync(SOURCE_RIGHTS_FILE) ? (JSON.parse(readFileSync(SOURCE_RIGHTS_FILE, 'utf8')) as Record<string, { decision: string; recheckAfter?: string }>) : {};
  for (const [url, r] of Object.entries(reviews)) {
    const host = hostOf(url);
    if (!host) continue;
    if (r.recheckAfter) {
      const t = Date.parse(r.recheckAfter);
      if (t <= now) out.push({ domain: host, kind: 'recheck-expired', detail: `個別審査の期限(${r.recheckAfter.slice(0, 10)})が過ぎ、出典判定は不許可になっている: ${url}` });
      else if (t - now < 30 * 86400_000) out.push({ domain: host, kind: 'recheck-soon', detail: `個別審査の期限(${r.recheckAfter.slice(0, 10)})まで30日未満: ${url}` });
    }
    // 不承認(held/blocked)の URL は台帳に入れない（同じドメインの公式サイトを巻き込まないため）。許可の URL だけ台帳に要る
    if (r.decision === 'allowed' && !Object.keys(ledger.domains).some((d) => domainCovers(d, host))) out.push({ domain: host, kind: 'not-in-ledger', detail: `個別審査で許可済みだが台帳に無い: ${url}（pnpm rights:seed）` });
  }
  return out;
}

const LABEL: Record<ReviewFinding['kind'], string> = {
  overdue: '見直し期限', 'terms-changed': '規約が変わった', 'terms-unreachable': '規約を取得できない', 'recheck-expired': '個別審査の期限切れ',
  'recheck-soon': '個別審査の期限が近い', 'not-in-ledger': '台帳に無い', unconfirmed: '未確認が残る',
};

async function main(): Promise<void> {
  const findings = await collectFindings({ fetchTerms: process.argv.includes('--fetch') });
  if (process.argv.includes('--json')) console.log(JSON.stringify(findings, null, 1));
  else {
    const ledger = readLedger();
    const urgent = findings.filter((f) => f.kind !== 'unconfirmed');
    console.log(`[rights:review] 台帳 ${Object.keys(ledger.domains).length} ドメイン / 見直し要 ${urgent.length} 件 / 未確認が残る ${findings.length - urgent.length} 件${process.argv.includes('--fetch') ? '（規約ページを取得して比較）' : '（規約ページは取得していない。--fetch で比較）'}`);
    const listed = process.argv.includes('--unconfirmed') ? [...urgent, ...findings.filter((x) => x.kind === 'unconfirmed')] : urgent;
    if (!process.argv.includes('--unconfirmed') && findings.length > urgent.length) console.log('  （未確認の項目の一覧は --unconfirmed）');
    for (const f of listed) console.log(`  [${LABEL[f.kind]}] ${f.domain}  ${f.detail}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) void main();
