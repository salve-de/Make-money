import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const CLAIMED_FILE = resolve(process.cwd(), 'data/CLAIMED_TARGETS.txt');
const REGISTRY_FILE = resolve(process.cwd(), 'data/collected-registry.json');
const BUCKET = 'foundation-lake';

export function getS3Client(): S3Client {
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('Missing Cloudflare R2 credentials in environment.');
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

function normalizeLine(line: string): string {
  return line.trim().toLowerCase().replace(/[\s\-_・（）()株式会社有限会社llcinc\.corp]/g, '');
}

/**
 * R2から台帳を取得してローカルと安全にマージする
 */
export async function pullClaims(client = getS3Client()): Promise<number> {
  console.log(`[PULL] Fetching claimed targets from R2 (${BUCKET}/registry/claimed-targets.txt)...`);
  let remoteText = '';
  try {
    const res = await client.send(new GetObjectCommand({
      Bucket: BUCKET,
      Key: 'registry/claimed-targets.txt',
    }));
    remoteText = (await res.Body?.transformToString()) || '';
  } catch {
    console.warn(`[WARN] Remote registry not found or inaccessible on R2. Creating fresh remote.`);
  }

  const localText = existsSync(CLAIMED_FILE) ? await readFile(CLAIMED_FILE, 'utf8') : '';

  const localLines = localText.split('\n');
  const remoteLines = remoteText.split('\n');

  // ヘッダー保持
  const headerLines: string[] = [];
  const existingSet = new Set<string>();
  const mergedLines: string[] = [];

  const processLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    if (trimmed.startsWith('#')) {
      if (!headerLines.includes(trimmed)) headerLines.push(trimmed);
      return;
    }
    const norm = normalizeLine(trimmed);
    if (!existingSet.has(norm)) {
      existingSet.add(norm);
      mergedLines.push(trimmed);
    }
  };

  localLines.forEach(processLine);
  remoteLines.forEach(processLine);

  const finalOutput = `${headerLines.join('\n')}\n\n${mergedLines.join('\n')}\n`;
  await writeFile(CLAIMED_FILE, finalOutput, 'utf8');
  console.log(`[MERGED] Local CLAIMED_TARGETS.txt synchronized. Total entries: ${mergedLines.length}`);
  return mergedLines.length;
}

/**
 * ローカル台帳をR2へプッシュする
 */
export async function pushClaims(client = getS3Client()): Promise<void> {
  console.log(`[PUSH] Uploading claimed targets to R2 (${BUCKET}/registry/claimed-targets.txt)...`);
  if (existsSync(CLAIMED_FILE)) {
    const text = await readFile(CLAIMED_FILE, 'utf8');
    await client.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: 'registry/claimed-targets.txt',
      Body: text,
      ContentType: 'text/plain; charset=utf-8',
    }));
    console.log(`  ✓ Uploaded registry/claimed-targets.txt to R2`);
  }

  if (existsSync(REGISTRY_FILE)) {
    const jsonText = await readFile(REGISTRY_FILE, 'utf8');
    await client.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: 'registry/collected-registry.json',
      Body: jsonText,
      ContentType: 'application/json; charset=utf-8',
    }));
    console.log(`  ✓ Uploaded registry/collected-registry.json to R2`);
  }
}

async function main() {
  const mode = process.argv[2] || 'sync';
  const client = getS3Client();

  if (mode === 'pull') {
    await pullClaims(client);
  } else if (mode === 'push') {
    await pushClaims(client);
  } else {
    // 双方向同期 (Pull & Merge -> Push)
    console.log('=== [CLAIM REGISTRY R2 SYNCHRONIZATION] ===');
    await pullClaims(client);
    await pushClaims(client);
    console.log('=== [SYNCHRONIZATION COMPLETED] ===\n');
  }
}

if (process.argv[1]?.endsWith('sync-claims-r2.ts')) {
  main().catch(err => {
    console.error('Fatal Sync Error:', err);
    process.exit(1);
  });
}
