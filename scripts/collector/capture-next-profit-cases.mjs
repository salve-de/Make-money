import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const outDir = 'data/incoming/raw_snapshots_next_profit_cases_20260916';
const cases = [
  { name: 'Anonymous B2C SaaS Personal Finance Side-Hustle (r/acquiresaas 2026)', sourceUrl: 'https://www.reddit.com/r/acquiresaas/comments/1v77f9j/selling_2_saas_1_ios_app_127k_rev_prior_6_months/?case=finance', sourceId: 'src.reddit.acquiresaas.1v77f9j.finance', evidenceId: 'ev_reddit_acquiresaas_1v77f9j_finance', author: 'anonymous seller', observedAt: '2026-07-26T00:00:00.000Z' },
  { name: 'Anonymous B2C SaaS Career (r/acquiresaas 2026)', sourceUrl: 'https://www.reddit.com/r/acquiresaas/comments/1v77f9j/selling_2_saas_1_ios_app_127k_rev_prior_6_months/?case=career', sourceId: 'src.reddit.acquiresaas.1v77f9j.career', evidenceId: 'ev_reddit_acquiresaas_1v77f9j_career', author: 'anonymous seller', observedAt: '2026-07-26T00:00:00.000Z' },
  { name: 'Anonymous iOS Sports App (r/acquiresaas 2026)', sourceUrl: 'https://www.reddit.com/r/acquiresaas/comments/1v77f9j/selling_2_saas_1_ios_app_127k_rev_prior_6_months/?case=sports', sourceId: 'src.reddit.acquiresaas.1v77f9j.sports', evidenceId: 'ev_reddit_acquiresaas_1v77f9j_sports', author: 'anonymous seller', observedAt: '2026-07-26T00:00:00.000Z' },
  { name: 'The Ways To Wealth (R.J. Weiss)', sourceUrl: 'https://founderreports.com/interview/the-ways-to-wealth/', sourceId: 'src.founderreports.thewaystowealth', evidenceId: 'ev_founderreports_ways_to_wealth', author: 'R.J. Weiss', observedAt: '2024-03-16T00:00:00.000Z' },
];
await fs.mkdir(outDir, { recursive: true });
const results = [];
for (const item of cases) {
  const response = await fetch(item.sourceUrl, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; Make-Money research snapshot)', accept: 'text/html,application/xhtml+xml' } });
  const body = Buffer.from(await response.arrayBuffer());
  const sha256 = crypto.createHash('sha256').update(body).digest('hex');
  const localPath = path.join(outDir, `${item.evidenceId}_${sha256}.html`);
  await fs.writeFile(localPath, body);
  results.push({ ...item, requestedUrl: item.sourceUrl, status: response.ok ? 'CAPTURED' : 'CAPTURED_NON_2XX', httpStatus: response.status, contentType: response.headers.get('content-type'), bytes: body.length, sha256, localPath, fetchedAt: new Date().toISOString() });
}
const audit = { schemaVersion: 'raw-snapshot-audit.v1', snapshot: '2026-09-16', requested: cases.length, captured: results.length, failed: 0, results };
await fs.writeFile('data/incoming/raw_snapshots_next_profit_cases_20260916.audit.json', `${JSON.stringify(audit, null, 2)}\n`);
console.log(JSON.stringify({ requested: audit.requested, captured: audit.captured, failed: audit.failed, results }, null, 2));
