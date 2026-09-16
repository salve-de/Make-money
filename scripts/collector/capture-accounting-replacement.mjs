import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const item = {
  name: 'Anonymous Niche Accounting SaaS (r/saasforsale 2026)',
  requestedUrl: 'https://www.reddit.com/r/saasforsale/comments/1wat14x/for_sale_niche_accounting_saas_35k_mrr_20_yoy/',
  sourceId: 'src.reddit.saasforsale.1wat14x.accounting',
  evidenceId: 'ev_reddit_saasforsale_1wat14x_accounting',
  author: 'anonymous seller',
  observedAt: '2026-09-16T00:00:00.000Z',
};
const outDir = 'data/incoming/raw_snapshots_accounting_replacement_20260916';
await fs.mkdir(outDir, { recursive: true });
const response = await fetch(item.requestedUrl, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; Make-Money research snapshot)', accept: 'text/html,application/xhtml+xml' } });
const body = Buffer.from(await response.arrayBuffer());
const sha256 = crypto.createHash('sha256').update(body).digest('hex');
const localPath = path.join(outDir, `${item.evidenceId}_${sha256}.html`);
await fs.writeFile(localPath, body);
const entityId = 'ent_reported_542f0372a82890ee2ff5986b';
const result = { ...item, entityId, sourceUrl: item.requestedUrl, status: response.ok ? 'CAPTURED' : 'CAPTURED_NON_2XX', httpStatus: response.status, contentType: response.headers.get('content-type'), bytes: body.length, sha256, localPath, fetchedAt: new Date().toISOString() };
const audit = { schemaVersion: 'raw-snapshot-audit.v1', snapshot: '2026-09-16', requested: 1, captured: 1, failed: 0, results: [result] };
await fs.writeFile('data/incoming/raw_snapshots_accounting_replacement_20260916.audit.json', `${JSON.stringify(audit, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
