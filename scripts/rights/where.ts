/**
 * pnpm rights:where <ドメイン> [--json]
 * そのサイトが、どの事例のどの事実・分析・画面の文に使われているかを出す（読み取り専用）。
 */
import { findUsage } from './usage-lib';
import { entryFor, hostOf, readLedger } from './ledger-lib';

export function normalizeDomainArg(arg: string | undefined): string | null {
  if (!arg || arg.startsWith('--')) return null;
  return hostOf(/^https?:\/\//.test(arg) ? arg : `https://${arg}`);
}

export function printUsage(domain: string, json = false): number {
  const hits = findUsage(domain);
  const ledger = readLedger();
  const own = entryFor(ledger, domain);
  if (json) { console.log(JSON.stringify({ domain, ledger: own ? { domain: own.domain, status: own.entry.status } : null, hits }, null, 1)); return hits.length ? 0 : 1; }
  console.log(`[rights:where] ${domain}  台帳: ${own ? `${own.domain}（${own.entry.status === 'active' ? '使用中' : '使用停止'}）` : '未登録'}`);
  if (!hits.length) { console.log('  公開中の事例では使われていない'); return 1; }
  let facts = 0, metrics = 0, analysis = 0, screen = 0;
  for (const h of hits) {
    console.log(`\n■ ${h.caseName}（${h.caseId}）`);
    for (const s of h.sources) console.log(`  出典 ${s.id}  ${s.url}  ${s.allowedByRules ? '' : '【もともと不許可。画面には出ていない】'}`);
    for (const f of h.facts) console.log(`  事実 ${f.id}  ${f.text}`);
    for (const m of h.metrics) console.log(`  数字 ${m.id}  ${m.label}`);
    for (const a of h.analysis) console.log(`  分析 ${a.id}[${a.item}] 根拠を失う: ${a.basisLost.join(',')} / 残る根拠: ${a.basisKept.join(',') || 'なし'}`);
    for (const s of h.screen) console.log(`  画面の文 ${s.file}  ${s.kind}  ${s.ref}`);
    facts += h.facts.length; metrics += h.metrics.length; analysis += h.analysis.length; screen += h.screen.length;
  }
  console.log(`\n合計: 事例 ${hits.length} 件 / 事実 ${facts} / 数字 ${metrics} / 分析 ${analysis} / 画面の文 ${screen}`);
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const domain = normalizeDomainArg(process.argv[2]);
  if (!domain) { console.error('使い方: pnpm rights:where <ドメイン> [--json]'); process.exit(2); }
  process.exit(printUsage(domain, process.argv.includes('--json')) === 2 ? 2 : 0);
}
