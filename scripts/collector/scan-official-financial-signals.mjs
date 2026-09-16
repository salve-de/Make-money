import fs from 'node:fs/promises';
import crypto from 'node:crypto';

const INPUT = process.env.MM_INPUT_FILE ?? 'data/incoming/batch_indie_hackers_mixed_1000_20260916.json';
const OUTPUT = process.env.MM_OUTPUT_FILE ?? 'data/incoming/batch_indie_hackers_mixed_official_financial_signals_1000.json';
const SNAPSHOT = '2026-09-16';
const timeoutMs = 7000;
const bodyLimit = 240000;
const workers = 24;

const sha256 = (v) => crypto.createHash('sha256').update(v).digest('hex');
const clean = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();
const stripMarkup = (v) => clean(String(v ?? '').replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' '));
const financial = /(?:\bMRR\b|\bARR\b|revenue|profit|profitability|monthly recurring|annual revenue|per month|\/month|\$\s*[\d,.]+\s*[KkMm]?|€\s*[\d,.]+\s*[KkMm]?|£\s*[\d,.]+\s*[KkMm]?|¥\s*[\d,.]+|\b\d[\d,.]*\s*(?:million|thousand|万|億))/i;
const title = (body) => clean(body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '');
const isEbizFactsUrl = (value) => {
  try { return new URL(value).hostname.toLowerCase().replace(/^www\./, '') === 'ebizfacts.com'; } catch { return false; }
};

async function readBody(response) {
  if (!response.body?.getReader) return '';
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const chunks = [];
  let size = 0;
  try {
    while (size < bodyLimit) {
      const { value, done } = await reader.read();
      if (done) break;
      const take = value.byteLength > bodyLimit - size ? value.slice(0, bodyLimit - size) : value;
      chunks.push(decoder.decode(take, { stream: true }));
      size += take.byteLength;
      if (take.byteLength < value.byteLength) break;
    }
  } finally { await reader.cancel().catch(() => {}); }
  chunks.push(decoder.decode());
  return chunks.join('');
}

async function scan(entity) {
  const requestedUrl = entity.officialUrl || (!isEbizFactsUrl(entity.url) ? entity.url : '');
  if (!requestedUrl) return { id: entity.id, name: entity.name, requestedUrl: null, finalUrl: null, status: null, reachable: false, skipped: true, title: '', financialSignalObserved: false, signals: [], bodySha256: null, checkedAt: SNAPSHOT, error: 'no official URL candidate' };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(requestedUrl, { redirect: 'follow', signal: controller.signal, headers: { 'user-agent': 'Make-Money financial-signal-audit/1.0', accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.1' } });
    const body = await readBody(response);
    const text = stripMarkup(body);
    const signals = [];
    const re = new RegExp(`.{0,120}${financial.source}.{0,160}`, 'gi');
    for (const match of text.matchAll(re)) {
      const snippet = clean(match[0]);
      if (snippet && !signals.includes(snippet)) signals.push(snippet);
      if (signals.length >= 5) break;
    }
    return { id: entity.id, name: entity.name, requestedUrl, finalUrl: response.url, status: response.status, reachable: response.status >= 200 && response.status < 400, title: title(body), financialSignalObserved: signals.length > 0, signals, bodySha256: body ? sha256(body) : null, checkedAt: SNAPSHOT };
  } catch (error) {
    return { id: entity.id, name: entity.name, requestedUrl, finalUrl: null, status: null, reachable: false, title: '', financialSignalObserved: false, signals: [], bodySha256: null, checkedAt: SNAPSHOT, error: error?.name === 'AbortError' ? `timeout after ${timeoutMs}ms` : clean(error?.message ?? error) };
  } finally { clearTimeout(timer); }
}

const entities = JSON.parse(await fs.readFile(INPUT, 'utf8'));
if (!Array.isArray(entities) || entities.length !== 1000) throw new Error(`Expected 1000 entities, got ${entities?.length}`);
const results = new Array(entities.length);
let cursor = 0;
await Promise.all(Array.from({ length: workers }, async () => {
  while (true) { const i = cursor++; if (i >= entities.length) return; results[i] = await scan(entities[i]); if ((i + 1) % 100 === 0) console.error(`financial-signal-scan ${i + 1}/1000`); }
}));
await fs.writeFile(OUTPUT, `${JSON.stringify(results, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ input: INPUT, output: OUTPUT, count: results.length, reachable: results.filter((x) => x.reachable).length, signalObserved: results.filter((x) => x.financialSignalObserved).length }, null, 2));
