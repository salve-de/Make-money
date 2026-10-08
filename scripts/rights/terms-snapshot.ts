/**
 * pnpm rights:terms [<ドメイン>] [--all]
 * 規約ページ（台帳の termsUrl）を取得し、本文の指紋（sha256）と取得日を台帳に記録する。本文は data/source-cache/terms/<ドメイン>.txt（git 管理外）へ置く。
 * 取得は読むだけ（GET 1回）。対象は termsUrl が決まっている項目。ドメイン省略時は指紋が未記録の項目すべて、--all は全項目を取り直す。
 */
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { nowIso, readLedger, writeLedger } from './ledger-lib';

export const TERMS_CACHE_DIR = 'data/source-cache/terms';

/** HTML から本文の文字だけを取り出し、空白をそろえる（指紋がレイアウト差で揺れにくいように） */
export function normalizeText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ').trim();
}

export async function fetchTermsFingerprint(url: string): Promise<{ hash: string; text: string; textLength: number } | { error: string }> {
  try {
    const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(20_000), headers: { 'user-agent': 'Make-Money-RightsLedger/1.0 (terms fingerprint)' } });
    if (!res.ok) return { error: `HTTP ${res.status}` };
    const text = normalizeText(await res.text());
    if (text.length < 200) return { error: `本文が短すぎる（${text.length}文字。取得できていない可能性）` };
    return { hash: createHash('sha256').update(text).digest('hex'), text, textLength: text.length };
  } catch (e) { return { error: e instanceof Error ? e.message : String(e) }; }
}

async function main(): Promise<number> {
  const target = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2].toLowerCase() : null;
  const all = process.argv.includes('--all');
  const ledger = readLedger();
  let changed = 0;
  for (const [domain, e] of Object.entries(ledger.domains)) {
    if (target && domain !== target) continue;
    const url = e.decision.termsUrl;
    if (!url) { if (target) console.log(`${domain}: 規約の URL が未記録（台帳の decision.termsUrl に入れてから実行）`); continue; }
    if (!target && !all && e.evidence.terms) continue;
    const r = await fetchTermsFingerprint(url);
    if ('error' in r) { console.log(`${domain}: 取得できず（${r.error}）`); continue; }
    const at = nowIso();
    mkdirSync(TERMS_CACHE_DIR, { recursive: true });
    writeFileSync(`${TERMS_CACHE_DIR}/${domain}.txt`, r.text);
    const was = e.evidence.terms?.hash;
    e.evidence.terms = { url, hash: r.hash, fetchedAt: at, textLength: r.textLength };
    e.decision.termsCheckedAt = at;
    e.history.push({ at, by: '担当(rights:terms)', action: 'terms-snapshot', reason: was && was !== r.hash ? `規約ページの指紋が変わった（${was.slice(0, 8)} → ${r.hash.slice(0, 8)}）` : `規約ページの指紋を記録（${r.hash.slice(0, 8)}、${r.textLength}文字）` });
    console.log(`${domain}: 記録 ${r.hash.slice(0, 12)}…（${r.textLength}文字）${was && was !== r.hash ? ' ※前回から変化' : ''}`);
    changed++;
  }
  if (changed) writeLedger(ledger);
  console.log(`[rights:terms] ${changed} 件を記録`);
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) void main().then((c) => process.exit(c));
