/**
 * 公開版の全事例の出典URLを取得し、本文を data/source-cache/ に保存する。
 * 通常の GET のみ。同時8・ホストごと1秒間隔・20秒で打ち切り。403/429/CAPTCHA/ログイン壁は回避しない。
 * 使い方: node --import tsx scripts/reader-case/fetch-sources.ts [--ids <file>] [--refresh]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { argValue, loadReaders, readIdsFile } from './load-readers';
import { CACHE_DIR, MIN_TEXT, cachePath, readCache, type SourceCacheRecord } from './verify-lib';

const UA = 'KinRokokuVerifier/1.0 (+contact via site)';
const MAX_TEXT = 200_000;
const CONCURRENCY = 8;
const HOST_INTERVAL_MS = 1000;
const TIMEOUT_MS = 20_000;
const SKIP_HOSTS = /(^|\.)linkedin\.com$/i;

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '-', mdash: '-', hellip: '...', rsquo: "'", lsquo: "'", ldquo: '"', rdquo: '"' };

export function htmlToText(html: string): string {
  const meta: string[] = [];
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  if (title) meta.push(title);
  for (const m of html.matchAll(/<meta[^>]+(?:name|property)=["'](?:description|og:description|og:title)["'][^>]*>/gi)) {
    const c = m[0].match(/content=["']([^"']*)["']/i)?.[1];
    if (c) meta.push(c);
  }
  const body = html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|svg|template|iframe)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/(p|div|li|h[1-6]|tr|br|section|article)>|<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');
  const decoded = `${meta.join('\n')}\n${body}`
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Math.min(Number(n), 0x10ffff)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(Math.min(parseInt(n, 16), 0x10ffff)))
    .replace(/&([a-z]+);/gi, (m, n: string) => ENTITIES[n.toLowerCase()] ?? m);
  return decoded.replace(/[ \t ]+/g, ' ').replace(/\s*\n\s*/g, '\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, MAX_TEXT);
}

// ホストごとに1秒間隔を空ける（同じホストの取得は順番待ち）
const hostNext = new Map<string, number>();
async function politeWait(host: string): Promise<void> {
  const now = Date.now();
  const at = Math.max(now, hostNext.get(host) ?? 0);
  hostNext.set(host, at + HOST_INTERVAL_MS);
  if (at > now) await new Promise((r) => setTimeout(r, at - now));
}

async function get(url: string): Promise<{ status: number; finalUrl: string; text: string; contentType: string; error?: string }> {
  let host = '';
  try {
    host = new URL(url).host;
  } catch {
    return { status: 0, finalUrl: url, text: '', contentType: '', error: 'bad-url' };
  }
  await politeWait(host);
  try {
    const res = await fetch(url, {
      headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.5', 'accept-language': 'en,ja;q=0.8' },
      redirect: 'follow',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const contentType = res.headers.get('content-type') ?? '';
    if (/pdf/i.test(contentType) || /\.pdf(\?|$)/i.test(url)) {
      return { status: res.status, finalUrl: res.url, text: '', contentType, error: 'pdf-not-parsed' };
    }
    if (/^(image|video|audio)\//i.test(contentType)) return { status: res.status, finalUrl: res.url, text: '', contentType, error: 'non-text' };
    const body = await res.text();
    const text = /html|xml/i.test(contentType) || /^\s*</.test(body) ? htmlToText(body) : body.slice(0, MAX_TEXT);
    return { status: res.status, finalUrl: res.url, text, contentType };
  } catch (e) {
    const err = e as Error & { cause?: { code?: string } };
    const code = err.name === 'TimeoutError' || err.name === 'AbortError' ? 'timeout' : (err.cause?.code ?? err.message).toString().slice(0, 60);
    return { status: 0, finalUrl: url, text: '', contentType: '', error: code };
  }
}

export async function fetchOne(url: string): Promise<SourceCacheRecord> {
  const now = new Date().toISOString();
  let host = '';
  try {
    host = new URL(url).hostname;
  } catch {
    /* handled in get */
  }
  if (SKIP_HOSTS.test(host)) return { url, status: 0, fetchedAt: now, via: 'direct', text: '', error: 'skipped-linkedin' };
  const d = await get(url);
  const direct: SourceCacheRecord = { url, finalUrl: d.finalUrl, status: d.status, fetchedAt: now, via: 'direct', text: d.status === 200 ? d.text : '', ...(d.error ? { error: d.error } : {}), contentType: d.contentType };
  if (d.status === 200 && d.text.length >= 500) return direct;
  if (d.error === 'pdf-not-parsed') return direct;
  // 1回だけ Wayback を試す
  const w = await get(`https://web.archive.org/web/2026/${url}`);
  if (w.status === 200 && w.text.length >= MIN_TEXT && w.text.length > direct.text.length) {
    return { url, finalUrl: w.finalUrl, status: 200, fetchedAt: now, via: 'wayback', text: w.text, contentType: w.contentType };
  }
  if (direct.text.length === 0 && !direct.error) direct.error = `http-${d.status}`;
  return direct;
}

async function main() {
  const idsFile = argValue('--ids');
  const refresh = process.argv.includes('--refresh');
  const readers = loadReaders(idsFile ? readIdsFile(idsFile) : undefined);
  const urls = new Set<string>();
  for (const r of readers.values()) for (const s of r.sources) urls.add(s.url);
  const all = [...urls];
  mkdirSync(CACHE_DIR, { recursive: true });
  const todo = all.filter((u) => refresh || !readCache(u));
  console.log(`cases=${readers.size} urls=${all.length} todo=${todo.length}`);
  let done = 0;
  let next = 0;
  const tally: Record<string, number> = {};
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (next < todo.length) {
        const url = todo[next++]!;
        const rec = await fetchOne(url);
        writeFileSync(cachePath(url), JSON.stringify(rec));
        const k = rec.text.length >= MIN_TEXT ? `ok-${rec.via}` : `fail-${rec.error ?? rec.status}`;
        tally[k] = (tally[k] ?? 0) + 1;
        if (++done % 100 === 0) console.log(`${done}/${todo.length}`, JSON.stringify(tally));
      }
    }),
  );
  console.log(`fetched ${done}/${todo.length}`, JSON.stringify(tally));
}

if (process.argv[1]?.endsWith('fetch-sources.ts')) void main();
