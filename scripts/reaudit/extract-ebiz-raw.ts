/**
 * eBiz Facts 原文の読み取り専用抽出（extract-ebiz-raw v1）— 2026-09-29 / レーンB
 *
 * data/entities-index.json のうち `reaudit.family === 'ebizfacts'` の記録について、
 * `sourceMetadata.rawStorage.payloadKey` が指す foundation-raw の保存済み HTML を読み取り専用（GetObject のみ）で取得し、
 *   1. data/r2-local/foundation-raw/<payloadKey> に HTML をキャッシュ（既にあれば再取得しない。--refetch で強制）
 *   2. data/r2-local/ebiz-text/<entityId>.txt に本文テキスト（script/style/nav/フォーム除去、段落・引用・リンク保持）を保存
 * する。どちらも gitignore 済み（/data/r2-local/）。R2 への書込み・削除・上書きは一切行わない。
 * 原文は非公開のまま。本文テキストは調査担当が「自分の言葉」で事実を抽出するための私的な作業ファイルであり、転載しない。
 *
 * 使い方:
 *   node scripts/with-r2-keychain-secrets.mjs node --import tsx scripts/reaudit/extract-ebiz-raw.ts --range 0-24
 *   node --import tsx scripts/reaudit/extract-ebiz-raw.ts --range 0-760 --offline      # キャッシュ済み HTML からテキストだけ再生成（R2 に触れない）
 *   node scripts/with-r2-keychain-secrets.mjs node --import tsx scripts/reaudit/extract-ebiz-raw.ts --discover-missing
 *     payloadKey が記録に無い記録（16件）について、foundation-raw の evidence/ を ListObjects し、どの記録からも参照されていない HTML のうち
 *     `<article id="post-N">` が sourceMetadata.postId と一致するものを特定して data/r2-local/ebiz-text/_payload-key-overrides.json に保存する（読み取りのみ）。
 *   オプション: --concurrency 6 / --refetch（キャッシュ済みでも再取得）/ --offline（R2 に接続しない）
 *
 * --range a-b は candidate-skeleton.ts の `--family ebizfacts` と同じ意味（ebizfacts 761件の 0 始まり位置、両端含む）。
 */
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { appendFile, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { GetObjectCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';

type AnyRecord = Record<string, unknown>;

const ROOT = process.cwd();
const RAW_CACHE_ROOT = resolve(ROOT, 'data/r2-local/foundation-raw');
const TEXT_ROOT = resolve(ROOT, 'data/r2-local/ebiz-text');
const FETCH_LOG = resolve(TEXT_ROOT, '_fetch-log.jsonl');
const ALLOWED_BUCKET = 'foundation-raw';

const args = process.argv.slice(2);
const opt = (name: string): string | undefined => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
const flag = (name: string): boolean => args.includes(`--${name}`);
const rangeArg = opt('range');
const concurrency = Math.max(1, Math.min(12, Number.parseInt(opt('concurrency') ?? '6', 10) || 6));
const refetch = flag('refetch');
const offline = flag('offline');
const wantDiscover = flag('discover-missing');
if (!wantDiscover && (!rangeArg || !/^\d+-\d+$/.test(rangeArg))) {
  console.error('usage: --range a-b [--concurrency n] [--refetch] [--offline]   |   --discover-missing');
  process.exit(64);
}
const OVERRIDES_PATH = resolve(TEXT_ROOT, '_payload-key-overrides.json');

// ---------------------------------------------------------------------------
// HTML → テキスト（外部パーサ無しの最小実装。WordPress 記事本文 `.entry-content` を対象にする）
// ---------------------------------------------------------------------------
const NAMED_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', hellip: '…', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”',
  laquo: '«', raquo: '»', bull: '•', middot: '·', copy: '©', reg: '®', trade: '™', times: '×', euro: '€', pound: '£', yen: '¥', cent: '¢', deg: '°',
  eacute: 'é', egrave: 'è', aacute: 'á', agrave: 'à', uuml: 'ü', ouml: 'ö', auml: 'ä', ntilde: 'ñ', ccedil: 'ç', szlig: 'ß', oacute: 'ó', iacute: 'í', uacute: 'ú',
};

function decodeEntities(input: string): string {
  return input
    .replace(/&#x([0-9a-f]+);/gi, (_m, h: string) => { const c = Number.parseInt(h, 16); return Number.isFinite(c) && c > 0 && c < 0x110000 ? String.fromCodePoint(c) : ''; })
    .replace(/&#(\d+);/g, (_m, d: string) => { const c = Number.parseInt(d, 10); return Number.isFinite(c) && c > 0 && c < 0x110000 ? String.fromCodePoint(c) : ''; })
    .replace(/&([a-z][a-z0-9]+);/gi, (m, n: string) => NAMED_ENTITIES[n.toLowerCase()] ?? m);
}

/** `startIdx` にある `<tag ...>` の対応する閉じタグまでを返す（入れ子を数える）。見つからなければ null。 */
function sliceBalanced(html: string, startIdx: number, tag: string): string | null {
  const re = new RegExp(`<(/?)${tag}\\b[^>]*>`, 'gi');
  re.lastIndex = startIdx;
  let depth = 0;
  for (let m = re.exec(html); m; m = re.exec(html)) {
    if (m[1] === '/') depth -= 1; else if (!m[0].endsWith('/>')) depth += 1;
    if (depth === 0) return html.slice(startIdx, re.lastIndex);
  }
  return null;
}

const Q_OPEN = '';
const Q_CLOSE = '';

interface ExtractedText { text: string; links: string[] }

/** 記事 HTML の断片を、段落・箇条書き・引用・リンク位置（[Ln]）を保ったテキストへ変換する。 */
function htmlFragmentToText(fragment: string, pageHost = 'ebizfacts.com'): ExtractedText {
  const links: string[] = [];
  const linkIndex = (rawHref: string): number | null => {
    const href = decodeEntities(rawHref.trim());
    if (!href || href.startsWith('#') || /^(javascript|mailto|tel):/i.test(href)) return null;
    const abs = href.startsWith('//') ? `https:${href}` : href;
    let host = '';
    try { host = new URL(abs).hostname.replace(/^www\./, ''); } catch { return null; }
    if (host === pageHost) return null; // 自サイト内リンク（カテゴリ・関連記事）は除外
    const at = links.indexOf(abs);
    if (at >= 0) return at + 1;
    links.push(abs);
    return links.length;
  };

  let s = fragment;
  s = s.replace(/<!--[\s\S]*?-->/g, ' ');
  s = s.replace(/<(script|style|noscript|svg|form|button|select|textarea|template)\b[\s\S]*?<\/\1>/gi, ' ');
  s = s.replace(/<iframe\b[^>]*?\bsrc\s*=\s*("([^"]*)"|'([^']*)')[^>]*>(?:\s*<\/iframe>)?/gi, (_m, _q, d: string | undefined, sq: string | undefined) => {
    const n = linkIndex(d ?? sq ?? ''); return n ? ` [埋め込み][L${n}] ` : ' ';
  });
  s = s.replace(/<a\b[^>]*?\bhref\s*=\s*("([^"]*)"|'([^']*)')[^>]*>([\s\S]*?)<\/a>/gi, (_m, _q, d: string | undefined, sq: string | undefined, inner: string) => {
    const n = linkIndex(d ?? sq ?? ''); return n ? `${inner}[L${n}]` : inner;
  });
  s = s.replace(/<br\s*\/?>/gi, '\n');
  s = s.replace(/<blockquote\b[^>]*>/gi, `\n${Q_OPEN}\n`).replace(/<\/blockquote>/gi, `\n${Q_CLOSE}\n`);
  s = s.replace(/<li\b[^>]*>/gi, '\n- ');
  s = s.replace(/<\/li>/gi, '');
  s = s.replace(/<h([1-6])\b[^>]*>/gi, '\n\n## ');
  s = s.replace(/<\/(h[1-6])>/gi, '\n');
  s = s.replace(/<(td|th)\b[^>]*>/gi, ' | ');
  s = s.replace(/<\/?(p|div|section|article|header|footer|main|ul|ol|table|thead|tbody|tr|figure|figcaption|hr|pre|dl|dt|dd|cite)\b[^>]*>/gi, '\n');
  s = s.replace(/<[^>]+>/g, '');
  s = decodeEntities(s).replace(/ /g, ' ');

  const out: string[] = [];
  let inQuote = false;
  for (const raw of s.split('\n')) {
    let line = raw.replace(/[ \t\r\f\v]+/g, ' ').trim();
    if (line.includes(Q_OPEN) || line.includes(Q_CLOSE)) {
      const opens = line.includes(Q_OPEN); const closes = line.includes(Q_CLOSE);
      line = line.split(Q_OPEN).join('').split(Q_CLOSE).join('').trim();
      if (opens) inQuote = true;
      if (line) out.push(inQuote ? `> ${line}` : line);
      if (closes) inQuote = false;
      continue;
    }
    out.push(line ? (inQuote ? `> ${line}` : line) : '');
  }
  // 空の箇条書き記号（"- " だけの行）を落とし、連続する箇条書きの間の空行を詰める。
  const cleaned = out.filter((l) => l !== '-' && l !== '> -');
  const compact: string[] = [];
  for (let i = 0; i < cleaned.length; i += 1) {
    if (cleaned[i] === '' && compact.length > 0 && /^- /.test(compact[compact.length - 1]) && /^- /.test(cleaned.slice(i + 1).find((l) => l !== '') ?? '')) continue;
    compact.push(cleaned[i]);
  }
  const text = compact.join('\n').replace(/\n{3,}/g, '\n\n').replace(/^\s+|\s+$/g, '');
  return { text, links };
}

function firstMatch(html: string, re: RegExp): string | null {
  const m = re.exec(html);
  return m ? decodeEntities((m[1] ?? '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim() : null;
}

/** 保存済み HTML 全体から、調査担当が読むための作業テキストを組み立てる。 */
function buildWorkingText(html: string, meta: { id: string; name: string; url: string; publishedAt: string | null }): string {
  const title = firstMatch(html, /<h1\b[^>]*itemprop="headline"[^>]*>([\s\S]*?)<\/h1>/i) ?? firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i) ?? '(no title)';
  const articleStart = html.search(/<article\b/i);
  const article = articleStart >= 0 ? (sliceBalanced(html, articleStart, 'article') ?? html.slice(articleStart)) : html;
  const contentStart = article.search(/<div\b[^>]*class="[^"]*\bentry-content\b[^"]*"/i);
  const content = contentStart >= 0 ? (sliceBalanced(article, contentStart, 'div') ?? article.slice(contentStart)) : article;
  const { text, links } = htmlFragmentToText(content);
  const body = text
    .split('\n')
    .filter((l) => !/^Get \d+ more business ideas/i.test(l) && !/^Read this next/i.test(l))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');
  const tags = [...article.matchAll(/rel="tag"[^>]*>([\s\S]*?)<\/a>/gi)].map((m) => decodeEntities(m[1].replace(/<[^>]+>/g, '')).trim()).filter(Boolean);
  const category = firstMatch(article, /class="category"[^>]*>([\s\S]*?)<\/p>/i);
  const updated = firstMatch(article, /class="last-updated"[^>]*>([\s\S]*?)<\/p>/i);
  const header = [
    `ID: ${meta.id}`,
    `NAME(catalog): ${meta.name}`,
    `TITLE: ${title}`,
    `URL: ${meta.url}`,
    `PUBLISHED(catalog): ${meta.publishedAt ?? 'unknown'}`,
    `PAGE-UPDATED: ${updated ?? 'unknown'}`,
    `CATEGORY: ${category ?? 'unknown'}`,
    `TAGS: ${tags.join(', ') || 'none'}`,
  ].join('\n');
  const linkBlock = links.length ? `\n\n--- LINKS ---\n${links.map((u, i) => `[L${i + 1}] ${u}`).join('\n')}` : '';
  return `${header}\n\n--- BODY ---\n${body}${linkBlock}\n`;
}

// ---------------------------------------------------------------------------
// R2 読み取り（GetObject のみ）
// ---------------------------------------------------------------------------
let s3: S3Client | null = null;
function client(): S3Client {
  if (s3) return s3;
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID; const ak = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID; const sk = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  if (!accountId || !ak || !sk) throw new Error('R2 credentials are not in the environment (run through scripts/with-r2-keychain-secrets.mjs, or use --offline)');
  s3 = new S3Client({ region: 'auto', endpoint: `https://${accountId}.r2.cloudflarestorage.com`, credentials: { accessKeyId: ak, secretAccessKey: sk } });
  return s3;
}

async function getObjectBytes(bucket: string, key: string): Promise<Buffer> {
  if (bucket !== ALLOWED_BUCKET) throw new Error(`refusing to read bucket ${bucket} (this lane reads ${ALLOWED_BUCKET} only)`);
  let lastErr: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const res = await client().send(new GetObjectCommand({ Bucket: bucket, Key: key }));
      if (!res.Body) throw new Error('empty body');
      return Buffer.from(await res.Body.transformToByteArray());
    } catch (err) {
      lastErr = err;
      const name = err instanceof Error ? err.name : '';
      if (name === 'NoSuchKey' || name === 'AccessDenied') break; // 再試行しても直らない
      await new Promise((r) => setTimeout(r, 400 * attempt * attempt));
    }
  }
  throw new Error(lastErr instanceof Error ? `${lastErr.name}: ${lastErr.message}`.slice(0, 200) : String(lastErr).slice(0, 200));
}

function cachePathFor(key: string): string {
  const out = resolve(RAW_CACHE_ROOT, key);
  const rel = relative(RAW_CACHE_ROOT, out);
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) throw new Error(`unsafe payloadKey: ${key}`);
  return out;
}

interface Row { index: number; id: string; name: string; status: 'fetched' | 'cached' | 'failed' | 'no-payload-key'; bytes: number; shaMatchesRecord: boolean | null; textChars: number; note: string }

interface Override { payloadKey: string; matchedBy: string; sha256: string; bytes: number }

async function loadOverrides(): Promise<Record<string, Override>> {
  try { return JSON.parse(await readFile(OVERRIDES_PATH, 'utf8')) as Record<string, Override>; } catch { return {}; }
}

async function processOne(index: number, e: AnyRecord, overrides: Record<string, Override>): Promise<Row> {
  const id = String(e.id); const name = String(e.name);
  const sm = (e.sourceMetadata as AnyRecord | undefined) ?? {};
  const raw = (sm.rawStorage as AnyRecord | undefined) ?? {};
  const override = overrides[id];
  const key = typeof raw.payloadKey === 'string' ? raw.payloadKey : (override?.payloadKey ?? '');
  const bucket = typeof raw.bucket === 'string' ? raw.bucket : ALLOWED_BUCKET;
  if (!key) return { index, id, name, status: 'no-payload-key', bytes: 0, shaMatchesRecord: null, textChars: 0, note: 'sourceMetadata.rawStorage.payloadKey なし（evidence/ にも post-id 一致の原文なし）' };
  try {
    const cachePath = cachePathFor(key);
    let status: Row['status'] = 'cached';
    let buf: Buffer;
    if (!refetch && existsSync(cachePath) && (await stat(cachePath)).size > 0) {
      buf = await readFile(cachePath);
    } else {
      if (offline) return { index, id, name, status: 'failed', bytes: 0, shaMatchesRecord: null, textChars: 0, note: 'キャッシュ無し（--offline）' };
      buf = await getObjectBytes(bucket, key);
      await mkdir(dirname(cachePath), { recursive: true });
      await writeFile(cachePath, buf);
      status = 'fetched';
    }
    const expected = typeof sm.rawContentSha256 === 'string' ? sm.rawContentSha256 : null;
    const actual = createHash('sha256').update(buf).digest('hex');
    const shaMatchesRecord = expected ? expected === actual : null;
    const firstSource = (((e.reaudit as AnyRecord | undefined)?.sources as AnyRecord[] | undefined) ?? [])[0];
    const url = String(firstSource?.url ?? (e.pnl as AnyRecord | undefined)?.sourceDoc ?? '');
    const text = buildWorkingText(buf.toString('utf8'), { id, name, url, publishedAt: typeof sm.publishedAt === 'string' ? sm.publishedAt : null });
    await mkdir(TEXT_ROOT, { recursive: true });
    await writeFile(resolve(TEXT_ROOT, `${id}.txt`), text, 'utf8');
    const note = !raw.payloadKey && override
      ? `payloadKey は記録に無く post-id 一致で特定（${override.matchedBy}）。sha256 は記録値と一致しない（記録値は別表現のハッシュ）`
      : (shaMatchesRecord === false ? 'sha256 不一致（記録値と異なる）' : '');
    return { index, id, name, status, bytes: buf.length, shaMatchesRecord, textChars: text.length, note };
  } catch (err) {
    return { index, id, name, status: 'failed', bytes: 0, shaMatchesRecord: null, textChars: 0, note: err instanceof Error ? err.message.slice(0, 200) : String(err).slice(0, 200) };
  }
}

/** payloadKey 未設定の記録について、evidence/ の未参照 HTML を post-id で突き合わせる（ListObjects + GetObject のみ）。 */
async function discoverMissing(catalog: AnyRecord[], pool: AnyRecord[]): Promise<void> {
  if (offline) throw new Error('--discover-missing needs R2 access');
  const missing = pool.filter((e) => !(((e.sourceMetadata as AnyRecord | undefined)?.rawStorage as AnyRecord | undefined)?.payloadKey));
  const byPost = new Map(missing.map((e) => [String((e.sourceMetadata as AnyRecord).postId), e]));
  const referenced = new Set(catalog.map((e) => (((e.sourceMetadata as AnyRecord | undefined)?.rawStorage as AnyRecord | undefined)?.payloadKey)).filter((k): k is string => typeof k === 'string'));
  const keys: string[] = [];
  let token: string | undefined;
  do {
    const res = await client().send(new ListObjectsV2Command({ Bucket: ALLOWED_BUCKET, Prefix: 'evidence/', ContinuationToken: token, MaxKeys: 1000 }));
    for (const o of res.Contents ?? []) if (o.Key && o.Key.endsWith('/payload.html') && !referenced.has(o.Key)) keys.push(o.Key);
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  console.log(`missing payloadKey: ${missing.length} records / unreferenced html payloads in evidence/: ${keys.length}`);
  const overrides = await loadOverrides();
  let cursor = 0;
  await Promise.all(Array.from({ length: concurrency }, async () => {
    for (;;) {
      const at = cursor; cursor += 1;
      if (at >= keys.length) return;
      const key = keys[at];
      try {
        const buf = await getObjectBytes(ALLOWED_BUCKET, key);
        const post = /<article\b[^>]*\bid="post-(\d+)"/i.exec(buf.toString('utf8'))?.[1];
        const rec = post ? byPost.get(post) : undefined;
        if (!rec) continue;
        const cachePath = cachePathFor(key);
        await mkdir(dirname(cachePath), { recursive: true });
        await writeFile(cachePath, buf);
        overrides[String(rec.id)] = { payloadKey: key, matchedBy: `article id=post-${post} == sourceMetadata.postId`, sha256: createHash('sha256').update(buf).digest('hex'), bytes: buf.length };
      } catch (err) { console.warn(`  ! ${key}: ${err instanceof Error ? err.message : String(err)}`); }
    }
  }));
  await mkdir(TEXT_ROOT, { recursive: true });
  await writeFile(OVERRIDES_PATH, JSON.stringify(overrides, null, 2), 'utf8');
  const stillMissing = missing.filter((e) => !overrides[String(e.id)]);
  console.log(`overrides: ${Object.keys(overrides).length} matched / still without raw: ${stillMissing.length}`);
  for (const e of stillMissing) console.log(`  - no raw in R2: ${String(e.id)} (postId ${String((e.sourceMetadata as AnyRecord).postId)})`);
}

async function main() {
  const catalog = JSON.parse(await readFile(resolve(ROOT, 'data/entities-index.json'), 'utf8')) as AnyRecord[];
  const pool = catalog.filter((e) => ((e.reaudit as AnyRecord | undefined)?.family) === 'ebizfacts');
  if (wantDiscover) { await discoverMissing(catalog, pool); return; }
  const overrides = await loadOverrides();
  const [a, b] = rangeArg!.split('-').map((n) => Number.parseInt(n, 10));
  const targets = pool.slice(a, b + 1).map((e, i) => ({ e, index: a + i }));
  if (targets.length === 0) { console.error('no targets in range'); process.exit(1); }

  const rows: Row[] = [];
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, targets.length) }, async () => {
    for (;;) {
      const at = cursor; cursor += 1;
      if (at >= targets.length) return;
      const row = await processOne(targets[at].index, targets[at].e, overrides);
      rows.push(row);
    }
  });
  await Promise.all(workers);
  rows.sort((x, y) => x.index - y.index);

  await mkdir(TEXT_ROOT, { recursive: true });
  const stamp = new Date().toISOString();
  await appendFile(FETCH_LOG, rows.map((r) => JSON.stringify({ at: stamp, range: rangeArg, ...r })).join('\n') + '\n', 'utf8');
  for (const r of rows) console.log(`${String(r.index).padStart(3)} ${r.status.padEnd(14)} bytes=${String(r.bytes).padStart(6)} text=${String(r.textChars).padStart(5)} ${r.id}${r.note ? `  !! ${r.note}` : ''}`);
  const count = (s: Row['status']) => rows.filter((r) => r.status === s).length;
  console.log(`\nrange ${rangeArg}: total=${rows.length} fetched=${count('fetched')} cached=${count('cached')} failed=${count('failed')} no-payload-key=${count('no-payload-key')} sha-mismatch=${rows.filter((r) => r.shaMatchesRecord === false).length}`);
  if (count('failed') > 0) process.exitCode = 3;
}

main().catch((err) => { console.error(err instanceof Error ? err.message : String(err)); process.exit(1); });
