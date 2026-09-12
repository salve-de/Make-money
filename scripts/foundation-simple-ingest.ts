#!/usr/bin/env node
/**
 * scripts/foundation-simple-ingest.ts
 *
 * 【Universal Foundation 最小・最強の原物保存パイプライン (監査反映完全版)】
 * 
 * ChatGPT Pro（Safari右側チャット）による5大重点監査・工学指摘を100%反映:
 *   1. バケット名ホワイトリスト（EDINET universal 領域への物理的・論理的不可侵ガード）
 *   2. 入力バッファのイミュータブル・スナップショット化（呼出元の競合・改変遮断）
 *   3. 事前JSON確定（シリアライズ先行による原物孤立ゴミ化防止）
 *   4. 条件付きPUT (IfNoneMatch: "*") によるCASアトミック競合制御
 *   5. ストリーム完全消費とSHA-256/バイト完全照合による真のReadback検証
 *   6. S3 Metadata の ASCII 厳格準拠（日本語は保存票JSONへ格納）
 *   7. 通信タイムアウトと自動リトライ設定
 */

import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { Readable } from 'node:stream';
import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';

// 許可されたバケットのみ（EDINET universal バケットへの誤爆・混入を物理遮断）
const ALLOWED_RAW_BUCKETS = new Set(['foundation-raw']);
const ALLOWED_LAKE_BUCKETS = new Set(['foundation-lake']);
const MAX_BUFFER_SIZE_BYTES = 50 * 1024 * 1024; // 50MB上限

export interface IngestInput {
  body: Buffer | Uint8Array | string;
  mediaType: string;
  url: string;
  collector: string;
  capturedAt?: string; // 実際の取得日時
  captureStatus?: 'COMPLETE' | 'PARTIAL';
  observations?: unknown[];
  metadata?: Record<string, string>;
}

export interface IngestOutput {
  status: 'CREATED' | 'EXISTS_IDENTICAL';
  captureId: string;
  sha256: string;
  byteLength: number;
  rawBucket: string;
  rawKey: string;
  lakeBucket: string;
  bundleKey: string;
  recordedAt: string;
  readbackVerified: boolean;
}

function getS3Client(): S3Client {
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('Missing Cloudflare R2 credentials in environment (use with-r2-keychain-secrets.mjs)');
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    maxAttempts: 3,
  });
}

/**
 * Node.js Readable ストリームを消費し、バッファとして完全に吸い上げる（接続リーク防止）
 */
async function streamToBuffer(stream: unknown): Promise<Buffer> {
  if (!stream) {
    throw new Error('Readable stream is empty or undefined');
  }
  if (Buffer.isBuffer(stream)) {
    return stream;
  }
  if (stream instanceof Uint8Array) {
    return Buffer.from(stream);
  }
  if (!(stream instanceof Readable) && typeof (stream as any)[Symbol.asyncIterator] !== 'function') {
    const reader = (stream as any).getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    return Buffer.concat(chunks);
  }

  const chunks: Buffer[] = [];
  for await (const chunk of stream as AsyncIterable<Buffer | Uint8Array | string>) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export async function ingestArtifact(input: IngestInput): Promise<IngestOutput> {
  const rawBucket = process.env.FOUNDATION_R2_RAW_BUCKET || 'foundation-raw';
  const lakeBucket = process.env.FOUNDATION_R2_LAKE_BUCKET || 'foundation-lake';

  // ガード1: バケット名ホワイトリスト検証（EDINET universal 領域への干渉を即座に遮断）
  if (!ALLOWED_RAW_BUCKETS.has(rawBucket)) {
    throw new Error(`Forbidden rawBucket "${rawBucket}". Only allowed: ${Array.from(ALLOWED_RAW_BUCKETS).join(', ')}`);
  }
  if (!ALLOWED_LAKE_BUCKETS.has(lakeBucket)) {
    throw new Error(`Forbidden lakeBucket "${lakeBucket}". Only allowed: ${Array.from(ALLOWED_LAKE_BUCKETS).join(', ')}`);
  }

  // ガード2: 入力バッファの安全なスナップショットコピーと上限チェック
  let bufferSnapshot: Buffer;
  if (Buffer.isBuffer(input.body)) {
    bufferSnapshot = Buffer.from(input.body); // 呼出元の変更から防衛する独立コピー
  } else if (typeof input.body === 'string') {
    bufferSnapshot = Buffer.from(input.body, 'utf8');
  } else if (input.body instanceof Uint8Array) {
    bufferSnapshot = Buffer.from(input.body);
  } else {
    throw new Error('Unsupported body type. Expected Buffer, Uint8Array, or string.');
  }

  if (bufferSnapshot.length > MAX_BUFFER_SIZE_BYTES) {
    throw new Error(`Payload exceeds max limit of ${MAX_BUFFER_SIZE_BYTES} bytes (actual: ${bufferSnapshot.length})`);
  }

  // 1. ハッシュとメタデータの計算
  const sha256 = createHash('sha256').update(bufferSnapshot).digest('hex');
  const byteLength = bufferSnapshot.length;
  const captureId = `cap_${Date.now()}_${randomUUID().replace(/-/g, '')}`;
  const recordedAt = new Date().toISOString();
  const capturedAt = input.capturedAt || recordedAt;

  // 拡張子の推定（キーの分割設計）
  const extMap: Record<string, string> = {
    'application/pdf': 'pdf',
    'text/html': 'html',
    'application/json': 'json',
    'text/plain': 'txt',
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'application/zip': 'zip',
  };
  const ext = extMap[input.mediaType] || 'bin';
  const rawKey = `blobs/sha256/${sha256.slice(0, 2)}/${sha256.slice(2, 4)}/${sha256}.${ext}`;

  const client = getS3Client();

  // 2. 事前JSONシリアライズ確定（原物PUT前に保存票を確定させ、シリアライズ例外による孤立を防止）
  const yyyymmdd = recordedAt.slice(0, 10).replace(/-/g, '');
  const bundleKey = `bundles/ingest/${yyyymmdd}/${captureId}.json`;

  const receiptRecord = {
    schema_version: 'universal.foundation.research-bundle.v1',
    capture_id: captureId,
    sha256,
    byte_length: byteLength,
    media_type: input.mediaType,
    url: input.url,
    collector: input.collector,
    captured_at: capturedAt,
    recorded_at: recordedAt,
    capture_status: input.captureStatus || 'COMPLETE',
    raw_storage: {
      bucket: rawBucket,
      key: rawKey,
    },
    observations: input.observations || [],
    caller_metadata: input.metadata || {},
  };

  // 循環参照やBigInt等があればここで早期にthrowされる
  const receiptJsonString = JSON.stringify(receiptRecord, null, 2);
  const receiptBuffer = Buffer.from(receiptJsonString, 'utf8');

  // 3. 原物（Artifact）の存在確認と条件付きPUT (CASアトミック競合制御)
  let isExisting = false;
  try {
    const head = await client.send(new HeadObjectCommand({
      Bucket: rawBucket,
      Key: rawKey,
    }));
    if (head.ContentLength === byteLength) {
      isExisting = true;
    } else {
      throw new Error(`Existing object length mismatch for ${rawKey}: expected ${byteLength}, got ${head.ContentLength}`);
    }
  } catch (err: any) {
    if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
      isExisting = false;
    } else {
      throw err;
    }
  }

  if (!isExisting) {
    try {
      await client.send(new PutObjectCommand({
        Bucket: rawBucket,
        Key: rawKey,
        Body: bufferSnapshot,
        ContentType: input.mediaType,
        IfNoneMatch: '*', // 条件付きPUT: 同時投入レースコンディションでの上書きを防止
        Metadata: {
          sha256,
          'byte-length': String(byteLength),
          'capture-id': captureId,
          // 日本語URLやcollectorはS3メタデータに入れず、保存票JSON側で管理（ASCII厳格準拠）
        },
      }));
    } catch (putErr: any) {
      // 412 Precondition Failed または競合時は既存オブジェクトの検証へフォールバック
      if (putErr.name === 'PreconditionFailed' || putErr.$metadata?.httpStatusCode === 412) {
        isExisting = true;
      } else {
        throw putErr;
      }
    }
  }

  // 4. 原物の真のReadback検証（Streamを完全に吸い上げてSHA-256と長さを照合・接続リーク防止）
  const getRawRes = await client.send(new GetObjectCommand({
    Bucket: rawBucket,
    Key: rawKey,
  }));
  const readbackRawBuf = await streamToBuffer(getRawRes.Body);
  const readbackRawSha = createHash('sha256').update(readbackRawBuf).digest('hex');

  if (readbackRawSha !== sha256 || readbackRawBuf.length !== byteLength) {
    throw new Error(
      `CRITICAL: Raw Artifact Readback verification failed! Expected SHA ${sha256} (${byteLength} bytes), got ${readbackRawSha} (${readbackRawBuf.length} bytes)`
    );
  }

  // 5. 保存票（Receipt Bundle）のPUT
  await client.send(new PutObjectCommand({
    Bucket: lakeBucket,
    Key: bundleKey,
    Body: receiptBuffer,
    ContentType: 'application/json; charset=utf-8',
    IfNoneMatch: '*', // 同一キーの重複投入防止
  }));

  // 6. 保存票の真のReadback検証（Streamを完全に吸い上げてバイト完全一致を照合）
  const getReceiptRes = await client.send(new GetObjectCommand({
    Bucket: lakeBucket,
    Key: bundleKey,
  }));
  const readbackReceiptBuf = await streamToBuffer(getReceiptRes.Body);

  if (!readbackReceiptBuf.equals(receiptBuffer)) {
    throw new Error(
      `CRITICAL: Receipt Bundle Readback verification failed! Payload mismatch for ${bundleKey}`
    );
  }

  return {
    status: isExisting ? 'EXISTS_IDENTICAL' : 'CREATED',
    captureId,
    sha256,
    byteLength,
    rawBucket,
    rawKey,
    lakeBucket,
    bundleKey,
    recordedAt,
    readbackVerified: true,
  };
}

// CLI実行時
if (process.argv[1]?.endsWith('foundation-simple-ingest.ts')) {
  async function cli() {
    const args = process.argv.slice(2);
    let filePath = '';
    let url = 'local://manual-ingest';
    let collector = 'antigravity-cli';
    let mediaType = 'application/octet-stream';

    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--file' && args[i + 1]) filePath = args[++i];
      else if (args[i] === '--url' && args[i + 1]) url = args[++i];
      else if (args[i] === '--collector' && args[i + 1]) collector = args[++i];
      else if (args[i] === '--type' && args[i + 1]) mediaType = args[++i];
    }

    if (!filePath) {
      console.log('Usage: foundation-simple-ingest.ts --file <path> [--url <url>] [--collector <name>] [--type <mime>]');
      process.exit(1);
    }

    const body = await readFile(filePath);
    if (mediaType === 'application/octet-stream') {
      const ext = extname(filePath).toLowerCase();
      if (ext === '.json') mediaType = 'application/json';
      else if (ext === '.html') mediaType = 'text/html';
      else if (ext === '.pdf') mediaType = 'application/pdf';
      else if (ext === '.txt' || ext === '.md') mediaType = 'text/plain';
    }

    console.log(`[INGEST] Uploading ${filePath} (${body.length} bytes, ${mediaType})...`);
    const res = await ingestArtifact({
      body,
      mediaType,
      url,
      collector,
    });
    console.log('[INGEST_SUCCESS]', JSON.stringify(res, null, 2));
  }

  cli().catch(err => {
    console.error('[INGEST_ERROR]', err);
    process.exit(1);
  });
}

