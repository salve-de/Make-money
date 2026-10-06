#!/usr/bin/env node
/**
 * 自動運転の鮮度チェック（読み取り専用）。docs/launch/MONITORING.md を参照。
 *
 * 見るもの:
 *   1. journal の鮮度   foundation-lake の journal/v1/YYYY/MM/DD/ のうち、最新のオブジェクトの更新時刻が閾値より古くないか
 *   2. 公開版の実在     data/catalog-release.json の summaries / discovery の R2 オブジェクトが在るか（HEAD のみ）
 *   3. 公開版の一致     --site-url を渡した時だけ。<site>/api/health の release が、手元の公開版（summaries.hash の先頭12文字）と一致するか
 *
 * 安全:
 *   - R2 には List / Head だけを使う。Put / Delete / Copy は import すらしない。
 *   - 鍵（CLOUDFLARE_R2_*）は環境変数から読むだけで、表示も保存もしない。
 *   - 鍵が無い時は「確認できない」と書いて終了コード 2 で終わる（緑の成功にはしない）。
 *
 * 使い方:
 *   node scripts/with-r2-keychain-secrets.mjs node scripts/ops/check-freshness.mjs [--max-age-hours 30] [--site-url https://…] [--json]
 *   （鍵注入ラッパー scripts/with-r2-keychain-secrets.mjs は macOS のキーチェーンから読む。読み取りだけに使う）
 *
 * 引数・環境変数:
 *   --max-age-hours N   journal の許容経過時間（既定 30。Publisher は日本時間 8:50/14:50/20:50 の1日3回）
 *   --lake-bucket NAME  既定 foundation-lake（環境変数 FOUNDATION_R2_LAKE_BUCKET でも指定可）
 *   --site-url URL      本番の URL。指定時だけ /api/health を GET して公開版を比べる
 *   --manifest PATH     既定 data/catalog-release.json
 *   --days N            journal を探す日数（UTC。既定 3）
 *   --json              結果を JSON で出す
 *
 * 終了コード: 0 = すべて正常 / 1 = 異常を検出 / 2 = 確認できない（鍵・引数・接続）
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { HeadObjectCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';

export const EXIT_OK = 0;
export const EXIT_PROBLEM = 1;
export const EXIT_UNVERIFIABLE = 2;

class UsageError extends Error {}

export function parseArgs(argv) {
  const options = { maxAgeHours: 30, days: 3, json: false, siteUrl: null, manifest: 'data/catalog-release.json', lakeBucket: null };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => { const v = argv[++i]; if (v === undefined) throw new UsageError(`${arg} には値が必要です`); return v; };
    if (arg === '--json') options.json = true;
    else if (arg === '--max-age-hours') options.maxAgeHours = Number(next());
    else if (arg === '--days') options.days = Number(next());
    else if (arg === '--site-url') options.siteUrl = next();
    else if (arg === '--manifest') options.manifest = next();
    else if (arg === '--lake-bucket') options.lakeBucket = next();
    else throw new UsageError(`知らない引数です: ${arg}`);
  }
  if (!Number.isFinite(options.maxAgeHours) || options.maxAgeHours <= 0) throw new UsageError('--max-age-hours は正の数にしてください');
  if (!Number.isInteger(options.days) || options.days < 1 || options.days > 14) throw new UsageError('--days は 1〜14 の整数にしてください');
  if (options.siteUrl && !/^https?:\/\/[^\s]+$/.test(options.siteUrl)) throw new UsageError('--site-url は http(s):// で始まる URL にしてください');
  return options;
}

/** now から遡った UTC の日付接頭辞（journal/v1/YYYY/MM/DD/）。 */
export function journalPrefixes(now, days) {
  return Array.from({ length: days }, (_, offset) => {
    const d = new Date(now.getTime() - offset * 86_400_000);
    const pad = (n) => String(n).padStart(2, '0');
    return `journal/v1/${d.getUTCFullYear()}/${pad(d.getUTCMonth() + 1)}/${pad(d.getUTCDate())}/`;
  });
}

/** 一覧（{ key, lastModified }）から最新を選び、経過時間を判定する。 */
export function judgeJournalAge(objects, now, maxAgeHours) {
  if (objects.length === 0) return { status: 'problem', reason: '対象期間に journal が1件も無い', latest: null, ageHours: null };
  const latest = objects.reduce((a, b) => (b.lastModified > a.lastModified ? b : a));
  const ageHours = (now.getTime() - latest.lastModified.getTime()) / 3_600_000;
  const stale = ageHours > maxAgeHours;
  return {
    status: stale ? 'problem' : 'ok',
    reason: stale ? `最新の journal が ${ageHours.toFixed(1)} 時間前（閾値 ${maxAgeHours} 時間）` : `最新の journal は ${ageHours.toFixed(1)} 時間前`,
    latest: { key: latest.key, lastModified: latest.lastModified.toISOString() },
    ageHours: Number(ageHours.toFixed(2)),
  };
}

/** /api/health の応答と手元の公開版を比べる。 */
export function judgeRelease(health, manifestHash) {
  const expected = manifestHash.slice(0, 12);
  if (!health || typeof health.release !== 'string') return { status: 'unverifiable', reason: '/api/health に release が無い（古い版かもしれない）' };
  return health.release === expected
    ? { status: 'ok', reason: `本番の公開版 ${health.release} は手元と一致` }
    : { status: 'problem', reason: `本番の公開版 ${health.release} が手元 ${expected} と不一致（catalog:publish と deploy の順番を確認）` };
}

function readCredentials(env) {
  const accountId = env.CLOUDFLARE_R2_ACCOUNT_ID?.trim();
  const accessKeyId = env.CLOUDFLARE_R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = env.CLOUDFLARE_R2_SECRET_ACCESS_KEY?.trim();
  return accountId && accessKeyId && secretAccessKey ? { accountId, accessKeyId, secretAccessKey } : null;
}

async function listJournal(client, bucket, prefixes) {
  const objects = [];
  for (const prefix of prefixes) {
    let token;
    do {
      const page = await client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: token, MaxKeys: 1000 }));
      for (const item of page.Contents ?? []) if (item.Key && item.LastModified) objects.push({ key: item.Key, lastModified: item.LastModified });
      token = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (token);
  }
  return objects;
}

async function headExists(client, bucket, key) {
  try {
    const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return { exists: true, bytes: head.ContentLength ?? null };
  } catch (error) {
    const status = error?.$metadata?.httpStatusCode;
    if (status === 404 || error?.name === 'NotFound') return { exists: false, bytes: null };
    throw error;
  }
}

export async function run(argv, env = process.env, now = new Date(), fetchImpl = fetch) {
  const options = parseArgs(argv);
  const checks = [];
  const credentials = readCredentials(env);
  if (!credentials) {
    return {
      exitCode: EXIT_UNVERIFIABLE,
      checks: [{ id: 'credentials', status: 'unverifiable', reason: 'R2 の読み取り鍵（CLOUDFLARE_R2_ACCOUNT_ID / _ACCESS_KEY_ID / _SECRET_ACCESS_KEY）が無いため確認できない' }],
    };
  }
  const manifest = JSON.parse(await readFile(resolve(options.manifest), 'utf8'));
  const bucket = options.lakeBucket ?? env.FOUNDATION_R2_LAKE_BUCKET?.trim() ?? 'foundation-lake';
  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${credentials.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: credentials.accessKeyId, secretAccessKey: credentials.secretAccessKey },
  });
  try {
    try {
      const objects = await listJournal(client, bucket, journalPrefixes(now, options.days));
      checks.push({ id: 'journal-freshness', ...judgeJournalAge(objects, now, options.maxAgeHours), count: objects.length });
    } catch {
      checks.push({ id: 'journal-freshness', status: 'unverifiable', reason: 'R2 の一覧を読めない（鍵の権限・接続を確認）' });
    }
    for (const part of ['summaries', 'discovery']) {
      try {
        const head = await headExists(client, bucket, manifest[part].key);
        checks.push({ id: `release-object:${part}`, status: head.exists ? 'ok' : 'problem', reason: head.exists ? `${part} の公開版オブジェクトが R2 に在る（${head.bytes} bytes）` : `${part} の公開版オブジェクトが R2 に無い（catalog:publish が未実行・失敗の可能性）` });
      } catch {
        checks.push({ id: `release-object:${part}`, status: 'unverifiable', reason: 'R2 を確認できない（鍵の権限・接続を確認）' });
      }
    }
  } finally {
    client.destroy();
  }
  if (options.siteUrl) {
    try {
      const response = await fetchImpl(`${options.siteUrl.replace(/\/$/, '')}/api/health`, { cache: 'no-store', signal: AbortSignal.timeout(10_000) });
      const body = await response.json().catch(() => null);
      checks.push({ id: 'release-match', ...judgeRelease(body, manifest.summaries.hash), httpStatus: response.status });
    } catch {
      checks.push({ id: 'release-match', status: 'unverifiable', reason: '本番の /api/health に接続できない' });
    }
  }
  const exitCode = checks.some((c) => c.status === 'problem') ? EXIT_PROBLEM
    : checks.some((c) => c.status === 'unverifiable') ? EXIT_UNVERIFIABLE : EXIT_OK;
  return { exitCode, checks };
}

function render(result, json) {
  if (json) return JSON.stringify(result, null, 2);
  const label = { ok: '正常', problem: '異常', unverifiable: '確認できない' };
  const lines = result.checks.map((c) => `[${label[c.status]}] ${c.id}: ${c.reason}`);
  lines.push(result.exitCode === EXIT_OK ? '結果: すべて正常' : result.exitCode === EXIT_PROBLEM ? '結果: 異常あり（終了コード 1）' : '結果: 確認できない項目あり（終了コード 2）。正常とは扱わない');
  return lines.join('\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const wantsJson = process.argv.includes('--json');
  run(process.argv.slice(2)).then((result) => {
    console.log(render(result, wantsJson));
    process.exitCode = result.exitCode;
  }).catch((error) => {
    // 鍵や内部の値を含み得る詳細は出さず、引数エラーだけ伝える
    console.error(`確認できない: ${error instanceof UsageError ? error.message : '実行に失敗しました'}`);
    process.exitCode = EXIT_UNVERIFIABLE;
  });
}
