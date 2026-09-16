#!/usr/bin/env node

import fs from 'node:fs/promises';
import crypto from 'node:crypto';

const INPUT = process.env.MM_INPUT_FILE ?? 'data/incoming/batch_indie_hackers_verified_1000_20260916.json';
const OUTPUT = process.env.MM_OUTPUT_FILE ?? 'data/incoming/batch_indie_hackers_enriched_1000_20260916.json';
const AUDIT = process.env.MM_AUDIT_FILE ?? 'data/incoming/batch_indie_hackers_official_site_checks_1000_20260916.json';
const EXPECTED_COUNT = Number(process.env.MM_EXPECTED_COUNT ?? 1000);
const SNAPSHOT = '2026-09-16';
const BODY_LIMIT = 240_000;
const DEFAULT_TIMEOUT_MS = 7_000;

const arg = (name, fallback) => {
  const value = process.argv.find((item) => item.startsWith(`${name}=`));
  return value ? Number(value.slice(name.length + 1)) : fallback;
};

const concurrency = Math.max(1, Math.min(48, arg('--concurrency', 24)));
const timeoutMs = Math.max(1_000, Math.min(30_000, arg('--timeout', DEFAULT_TIMEOUT_MS)));

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const clean = (value, max = 180) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const htmlDecode = (value) => String(value ?? '')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>');
const isEbizFactsUrl = (value) => {
  try { return new URL(value).hostname.toLowerCase().replace(/^www\./, '') === 'ebizfacts.com'; } catch { return false; }
};

function extractTitle(body) {
  const match = body.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return clean(htmlDecode(match?.[1] ?? ''));
}

function extractDescription(body) {
  const match = body.match(/<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]*?)["'][^>]*>/i)
    ?? body.match(/<meta[^>]+content=["']([\s\S]*?)["'][^>]+name=["']description["'][^>]*>/i);
  return clean(htmlDecode(match?.[1] ?? ''), 240);
}

async function readExcerpt(response) {
  if (!response.body?.getReader) return '';
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const chunks = [];
  let size = 0;
  try {
    while (size < BODY_LIMIT) {
      const { value, done } = await reader.read();
      if (done) break;
      const remaining = BODY_LIMIT - size;
      const chunk = value.byteLength > remaining ? value.slice(0, remaining) : value;
      chunks.push(decoder.decode(chunk, { stream: true }));
      size += chunk.byteLength;
      if (chunk.byteLength < value.byteLength) break;
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  chunks.push(decoder.decode());
  return chunks.join('');
}

async function checkSite(entity) {
  const requestedUrl = entity.officialUrl || (!isEbizFactsUrl(entity.url) ? entity.url : '');
  if (!requestedUrl) {
    return {
      id: entity.id,
      name: entity.name,
      requestedUrl: null,
      finalUrl: null,
      status: null,
      ok: false,
      reachable: false,
      contentObserved: false,
      skipped: true,
      contentType: '',
      title: '',
      description: '',
      excerptBytes: 0,
      excerptSha256: null,
      checkedAt: `${SNAPSHOT}T00:00:00+09:00`,
      durationMs: 0,
      error: 'no official URL candidate',
    };
  }
  const startedAt = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(requestedUrl, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': 'Make-Money official-site verifier/1.0 (research; contact unavailable)',
        accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.1',
      },
    });
    const body = await readExcerpt(response);
    const contentType = response.headers.get('content-type') ?? '';
    const title = extractTitle(body);
    const description = extractDescription(body);
    const reachable = response.status >= 200 && response.status < 400;
    const contentObserved = /text\/html|application\/xhtml/i.test(contentType) || Boolean(title || description);
    return {
      id: entity.id,
      name: entity.name,
      requestedUrl,
      finalUrl: response.url,
      status: response.status,
      ok: response.ok,
      reachable,
      contentObserved,
      contentType,
      title,
      description,
      excerptBytes: Buffer.byteLength(body),
      excerptSha256: body ? sha256(body) : null,
      checkedAt: `${SNAPSHOT}T00:00:00+09:00`,
      durationMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      id: entity.id,
      name: entity.name,
      requestedUrl,
      finalUrl: null,
      status: null,
      ok: false,
      reachable: false,
      contentObserved: false,
      contentType: '',
      title: '',
      description: '',
      excerptBytes: 0,
      excerptSha256: null,
      checkedAt: `${SNAPSHOT}T00:00:00+09:00`,
      durationMs: Date.now() - startedAt,
      error: error?.name === 'AbortError' ? `timeout after ${timeoutMs}ms` : clean(error?.message ?? error, 240),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function mapWithWorkers(items, workerCount, fn) {
  const output = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      output[index] = await fn(items[index], index);
      if ((index + 1) % 50 === 0 || index + 1 === items.length) {
        console.error(`official-site-check ${index + 1}/${items.length}`);
      }
    }
  }
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return output;
}

function addObservation(entity, check) {
  const next = structuredClone(entity);
  if (check.skipped) {
    next.observationsStream = [...(Array.isArray(next.observationsStream) ? next.observationsStream : []), {
      id: `${next.id}-official-site-limit`,
      category: 'RESEARCH_LIMIT',
      originType: 'observed',
      verificationStatus: 'UNVERIFIED',
      text: '公式URL候補はプロフィール記事から確定できなかった。eBiz Facts記事を公式サイトの到達証明として扱わない。',
      sourceUrl: entity.pnl?.sourceDoc || entity.url,
      observedAt: SNAPSHOT,
      sourceClass: 'PRIMARY',
    }];
    next.unknownsNotes = [...new Set([...(Array.isArray(next.unknownsNotes) ? next.unknownsNotes : []), '公式URL候補が未確認。プロフィール記事は公式サイトの代用にしない。'])];
    return next;
  }
  const sourceUrl = check.finalUrl || check.requestedUrl;
  const successful = check.reachable && check.contentObserved;
  const statusText = check.status == null ? `取得失敗: ${check.error || '不明なエラー'}` : `HTTP ${check.status}`;
  if (successful) {
    next.evidenceCards = [...(Array.isArray(next.evidenceCards) ? next.evidenceCards : []), {
      id: `${next.id}-official-site`,
      type: 'UNKNOWN_AUDIT',
      title: '公式サイトの現行取得確認',
      evidenceStatus: 'VERIFIED',
      punchline: `公式URLから現行ページを取得できた（${statusText}）。これは提供内容の確認であり、利益の証明ではない。`,
      details: [
        check.title ? `ページタイトル: ${check.title}` : 'ページタイトルは未取得。',
        check.description ? `meta description: ${check.description}` : 'meta descriptionは未取得。',
        `取得先: ${sourceUrl}`,
        'このカードは公式サイトの到達性・掲載内容の観測であり、売上・原価・利益を確定する財務証拠ではない。',
      ],
      sourceNote: `公式サイト取得確認, ${SNAPSHOT} snapshot`,
      sourceClass: 'PRIMARY',
      sourceUrl,
      evidenceLocator: { type: 'html', ...(check.excerptSha256 ? { textHash: check.excerptSha256 } : {}) },
    }];
    next.observationsStream = [...(Array.isArray(next.observationsStream) ? next.observationsStream : []), {
      id: `${next.id}-official-site-observed`,
      category: 'TECH_VERIFICATION',
      originType: 'observed',
      verificationStatus: 'SUPPORTED',
      text: `公式URLの現行ページを取得: ${statusText}${check.title ? ` / ${check.title}` : ''}`,
      sourceUrl,
      observedAt: SNAPSHOT,
      sourceClass: 'PRIMARY',
      evidenceLocator: { type: 'html', ...(check.excerptSha256 ? { textHash: check.excerptSha256 } : {}) },
    }];
  } else {
    next.observationsStream = [...(Array.isArray(next.observationsStream) ? next.observationsStream : []), {
      id: `${next.id}-official-site-limit`,
      category: 'RESEARCH_LIMIT',
      originType: 'observed',
      verificationStatus: 'UNVERIFIED',
      text: `公式URLの現行内容を確認できなかった: ${statusText}`,
      sourceUrl: check.requestedUrl,
      observedAt: SNAPSHOT,
      sourceClass: 'PRIMARY',
    }];
  }
  const note = successful
    ? '公式サイトの到達性・掲載内容は確認したが、財務数値の一次確認は未実施。'
    : `公式サイトの現行内容は取得できなかった（${statusText}）。非稼働とは断定しない。`;
  next.unknownsNotes = [...new Set([...(Array.isArray(next.unknownsNotes) ? next.unknownsNotes : []), note])];
  return next;
}

const entities = JSON.parse(await fs.readFile(INPUT, 'utf8'));
if (!Array.isArray(entities) || entities.length !== EXPECTED_COUNT) throw new Error(`Expected exactly ${EXPECTED_COUNT} entities, got ${entities?.length}`);
const checks = await mapWithWorkers(entities, concurrency, checkSite);
const enriched = entities.map((entity, index) => addObservation(entity, checks[index]));
await fs.writeFile(OUTPUT, `${JSON.stringify(enriched, null, 2)}\n`, 'utf8');
await fs.writeFile(AUDIT, `${JSON.stringify(checks, null, 2)}\n`, 'utf8');
const reachable = checks.filter((x) => x.reachable).length;
const contentObserved = checks.filter((x) => x.contentObserved).length;
const failures = checks.length - reachable;
console.log(JSON.stringify({ input: INPUT, output: OUTPUT, audit: AUDIT, count: enriched.length, reachable, contentObserved, failures, concurrency, timeoutMs }, null, 2));
