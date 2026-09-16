import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const snapshot = '2026-09-16';
const outDir = 'data/incoming/raw_snapshots_new_cases_20260916';
const cases = [
  {
    name: 'Anonymous Feedback Widget SaaS (Gr00byandahalf)',
    sourceUrl: 'https://www.reddit.com/r/SaaS/comments/1mn0eo9/bootstrapped_a_tiny_saas_and_finally_sold_feels/',
    sourceId: 'src.reddit.saas.1mn0eo9',
    evidenceId: 'ev_reddit_saas_1mn0eo9',
    author: 'Gr00byandahalf',
    observedAt: '2025-08-11T00:00:00.000Z',
  },
  {
    name: 'Unlust (anonymous solo B2C app)',
    sourceUrl: 'https://www.reddit.com/r/EntrepreneurRideAlong/comments/1u23j0i/12_months_24k_one_nearfatal_crash_what_i_learned/',
    sourceId: 'src.reddit.entrepreneurridealong.1u23j0i',
    evidenceId: 'ev_reddit_unlust_1u23j0i',
    author: 'Kind_Guide_1232',
    observedAt: '2026-05-01T00:00:00.000Z',
  },
];

await fs.mkdir(outDir, { recursive: true });
const results = [];
for (const item of cases) {
  const response = await fetch(item.sourceUrl, {
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; Make-Money research snapshot; +https://www.reddit.com/)',
      accept: 'text/html,application/xhtml+xml',
    },
  });
  const body = Buffer.from(await response.arrayBuffer());
  const sha256 = crypto.createHash('sha256').update(body).digest('hex');
  const localPath = path.join(outDir, `${sha256}.html`);
  await fs.writeFile(localPath, body);
  results.push({
    name: item.name,
    requestedUrl: item.sourceUrl,
    sourceId: item.sourceId,
    evidenceId: item.evidenceId,
    author: item.author,
    observedAt: item.observedAt,
    status: response.ok ? 'CAPTURED' : 'CAPTURED_NON_2XX',
    httpStatus: response.status,
    contentType: response.headers.get('content-type'),
    bytes: body.length,
    sha256,
    localPath,
    fetchedAt: new Date().toISOString(),
  });
}
const audit = {
  schemaVersion: 'raw-snapshot-audit.v1',
  snapshot,
  requested: cases.length,
  captured: results.filter((x) => x.status.startsWith('CAPTURED')).length,
  failed: results.filter((x) => !x.status.startsWith('CAPTURED')).length,
  results,
};
await fs.writeFile('data/incoming/raw_snapshots_new_cases_20260916.audit.json', `${JSON.stringify(audit, null, 2)}\n`);
console.log(JSON.stringify({ requested: audit.requested, captured: audit.captured, failed: audit.failed, results }, null, 2));
