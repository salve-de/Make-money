import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const item = {
  name: 'ShipPlug (Nick DiNatale)',
  entityId: 'ent_reported_b8c082b67876cacb5b1c1b32',
  requestedUrl: 'https://founderreports.com/interview/shipplug/',
  sourceId: 'src.founderreports.shipplug',
  evidenceId: 'ev_founderreports_shipplug',
  author: 'Nick DiNatale',
  observedAt: '2026-09-16T00:00:00.000Z',
};
const outDir = 'data/incoming/raw_snapshots_shipplug_20260916';
await fs.mkdir(outDir, { recursive: true });
const response = await fetch(item.requestedUrl, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; Make-Money research snapshot)', accept: 'text/html,application/xhtml+xml' } });
const body = Buffer.from(await response.arrayBuffer());
const sha256 = crypto.createHash('sha256').update(body).digest('hex');
const localPath = path.join(outDir, `${item.evidenceId}_${sha256}.html`);
await fs.writeFile(localPath, body);
const result = { ...item, status: response.ok ? 'CAPTURED' : 'CAPTURED_NON_2XX', httpStatus: response.status, contentType: response.headers.get('content-type'), bytes: body.length, sha256, localPath, fetchedAt: new Date().toISOString() };
const audit = { schemaVersion: 'raw-snapshot-audit.v1', snapshot: '2026-09-16', requested: 1, captured: response.ok ? 1 : 0, failed: response.ok ? 0 : 1, results: [result] };
await fs.writeFile('data/incoming/raw_snapshots_shipplug_20260916.audit.json', `${JSON.stringify(audit, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
