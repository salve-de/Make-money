/**
 * 受入済み候補の通常取り込み（ingest-accepted v1）— 2026-09-29
 * 明示的に指定した候補ファイルだけを、公式ページの原本（Tier 1）を rawArtifacts として添えて通常パイプラインへ流す。
 * R2 未設定なら失敗する（黙ってローカル退避しない）。取り込み後に R2 の journal を読み戻して SHA を確認する。
 *
 * 使い方: node scripts/with-r2-keychain-secrets.mjs node --import tsx scripts/reaudit/ingest-accepted.ts --file data/incoming/<accepted>.json --reviewer "<name>"
 *   （`pnpm r2:with-secrets -- node …` は "--" をそのまま渡して ENOENT になるため使わない）
 * sec.gov の出典を含む場合は SEC_USER_AGENT="<組織名> <連絡先メール>" が必須（SEC Fair Access 方針）。任意で RESEARCH_USER_AGENT で既定 UA を上書きできる。
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { createHash } from 'node:crypto';
import { ingestVerifiedEntities, type IngestEntityInput, type RawArtifact } from '../pipeline/real-ingest-pipeline';
import type { FinancialEntity } from '../../src/shared/terminal';

type AnyRecord = Record<string, unknown>;
const args = process.argv.slice(2);
const opt = (name: string): string | undefined => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
const file = opt('file'); const reviewer = opt('reviewer') ?? 'lead (scripted accepted ingest)';
if (!file) { console.error('usage: --file <accepted.json> [--reviewer <name>]'); process.exit(64); }

const DEFAULT_USER_AGENT = 'Mozilla/5.0 (compatible; MakeMoneyResearch/1.0; +https://github.com/salve-de/Make-money)';
const MAX_RAW_BYTES = 32 * 1024 * 1024;
const isSecHost = (url: string): boolean => /^https?:\/\/([a-z0-9-]+\.)*sec\.gov\//i.test(url);

/** SEC の Fair Access 方針は連絡先入りの User-Agent を求める。sec.gov には SEC_USER_AGENT が無ければ取りに行かない。 */
function userAgentFor(url: string): string {
  if (isSecHost(url)) {
    const ua = process.env.SEC_USER_AGENT?.trim();
    if (!ua || !/@/.test(ua)) throw new Error(`SEC_USER_AGENT env with a contact address is required to fetch ${url} (SEC fair access policy)`);
    return ua;
  }
  return process.env.RESEARCH_USER_AGENT?.trim() || DEFAULT_USER_AGENT;
}

function extensionFor(contentType: string): string {
  if (/json/.test(contentType)) return 'json';
  if (/xml/.test(contentType)) return 'xml';
  if (/plain/.test(contentType)) return 'txt';
  if (/pdf/.test(contentType)) return 'pdf';
  return 'html';
}

async function fetchArtifact(url: string): Promise<RawArtifact | null> {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': userAgentFor(url), Accept: '*/*' }, redirect: 'follow' });
    if (!res.ok) { console.warn(`  ⚠ raw fetch ${url} → HTTP ${res.status} (skipped)`); return null; }
    const contentType = (res.headers.get('content-type') ?? 'text/html').split(';')[0].trim();
    const content = await res.text();
    const bytes = Buffer.byteLength(content);
    if (bytes > MAX_RAW_BYTES) { console.warn(`  ⚠ raw fetch ${url} is ${bytes} bytes (> ${MAX_RAW_BYTES}); skipped, the source URL stays in the review record`); return null; }
    const filename = `${new URL(url).hostname}${new URL(url).pathname}`.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/_+$/, '') || 'index';
    console.log(`  ✓ raw fetch ${url} (${bytes} bytes, ${contentType})`);
    return { content, contentType, filename: `${filename}.${extensionFor(contentType)}`, sourceUrl: url };
  } catch (err) { console.warn(`  ⚠ raw fetch ${url} failed: ${err instanceof Error ? err.message : String(err)}`); return null; }
}

async function main() {
  const records = JSON.parse(readFileSync(resolve(file!), 'utf8')) as AnyRecord[];
  const secSourceCount = records.reduce((count, rec) => {
    const sources = ((rec.reaudit as AnyRecord | undefined)?.sources as AnyRecord[] | undefined) ?? [];
    return count + sources.filter((s) => typeof s.url === 'string' && isSecHost(s.url)).length;
  }, 0);
  if (secSourceCount > 0 && !/@/.test(process.env.SEC_USER_AGENT?.trim() ?? '')) {
    console.error(`!! ${secSourceCount} sec.gov source(s) in this batch: set SEC_USER_AGENT="<org> <contact email>" (SEC fair access policy) before ingesting`);
    process.exit(64);
  }
  const inputs: IngestEntityInput[] = [];
  for (const rec of records) {
    const reaudit = (rec.reaudit as AnyRecord | undefined) ?? {};
    const sources = Array.isArray(reaudit.sources) ? (reaudit.sources as AnyRecord[]) : [];
    const tier1 = sources.filter((s) => typeof s.url === 'string' && String(s.rightsTier).startsWith('TIER1')).map((s) => s.url as string);
    console.log(`\n[${String(rec.name)}] Tier-1 sources to capture as raw: ${tier1.length}`);
    const rawArtifacts: RawArtifact[] = [];
    for (const u of tier1) { const a = await fetchArtifact(u); if (a) rawArtifacts.push(a); }
    inputs.push({ entity: rec as unknown as FinancialEntity, rawArtifacts, review: { reviewer, reviewedAt: new Date().toISOString(), sourceUrls: sources.map((s) => String(s.url)) } });
  }
  const batchName = resolve(file!).split('/').pop()!.replace(/\.json$/, '');
  const total = await ingestVerifiedEntities(inputs, batchName);
  console.log(`\ncatalog size after ingest: ${total}`);

  // R2 readback（foundation-lake の journal を列挙して本文 SHA-256 を確認）
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID; const ak = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID; const sk = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  if (!accountId || !ak || !sk) { console.error('!! no R2 credentials in env; readback skipped (this run must not be reported as R2 delivery)'); process.exit(2); }
  const client = new S3Client({ region: 'auto', endpoint: `https://${accountId}.r2.cloudflarestorage.com`, credentials: { accessKeyId: ak, secretAccessKey: sk } });
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, '/');
  for (const rec of records) {
    const prefix = `journal/v1/${day}/${String(rec.id)}`;
    const list = await client.send(new ListObjectsV2Command({ Bucket: 'foundation-lake', Prefix: prefix }));
    for (const o of list.Contents ?? []) {
      const got = await client.send(new GetObjectCommand({ Bucket: 'foundation-lake', Key: o.Key! }));
      const body = await got.Body!.transformToString();
      const sha = createHash('sha256').update(body).digest('hex');
      const parsed = JSON.parse(body) as AnyRecord;
      console.log(`  ✓ readback foundation-lake/${o.Key} bytes=${Buffer.byteLength(body)} sha256=${sha} linkedRaw=${Array.isArray(parsed.raw_evidence) ? (parsed.raw_evidence as unknown[]).length : 'n/a'}`);
    }
    if (!(list.Contents ?? []).length) console.error(`  !! no journal object found under ${prefix}`);
  }
}
main().catch((err) => { console.error(err); process.exit(1); });
