/**
 * Stage official media assets (favicon, og:image, home / pricing screenshots)
 * with a provenance manifest per entity. Local staging only: nothing is written
 * to R2 or any other external service (see docs/MEDIA_ASSETS_AND_PROVENANCE.md).
 *
 * Usage:
 *   node --import tsx scripts/media/fetch-official-assets.ts --ids <id1,id2,...> [--limit N] [--out data/media-staging]
 *
 * Rules enforced here (owner decision 2026-09-29):
 *   - only the entity's official site (registrable domain of officialUrl / url) is visited or downloaded from;
 *   - robots.txt is fetched once per host and every page / file we request must be allowed;
 *   - bot walls and challenges are recorded as failures, never worked around;
 *   - every asset starts as rights.decision = "held" (basis official_marketing_material).
 */
import { createHash } from 'node:crypto';
import { appendFile, mkdir, readdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium, type Browser, type BrowserContext, type Page } from '@playwright/test';
import {
  MEDIA_ENTITY_ID_PATTERN,
  MediaAssetManifestFileSchema,
  MediaAssetManifestSchema,
  mediaAssetIdFromSha256,
  mediaRawKey,
  type MediaAssetKind,
  type MediaAssetManifest,
} from '../../src/shared/media-asset-schema';
import {
  MEDIA_FETCH_PRODUCT_TOKEN,
  PRICING_LINK_TEXT,
  isPublicWebHost,
  isSameSite,
  isTrackerHost,
  pickPricingLink,
  registrableDomain,
  robotsAllows,
  robotsPolicyFromFetch,
  sniffImage,
  type RobotsPolicy,
  type SniffedImage,
} from '../../src/shared/media-fetch-policy';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const DEFAULT_INDEX = join(REPO_ROOT, 'data/entities-index.json');
const DEFAULT_OUT = join(REPO_ROOT, 'data/media-staging');
const RAW_BUCKET = 'foundation-raw';

const VIEWPORT = { width: 1280, height: 800 };
const PROGRESS_FILE = 'progress.jsonl';
const NAVIGATION_TIMEOUT_MS = 20_000;
const LOAD_SETTLE_MS = 8_000;
const IDLE_SETTLE_MS = 4_000;
const FETCH_TIMEOUT_MS = 15_000;
const ENTITY_DEADLINE_MS = 150_000;
const MAX_REDIRECTS = 5;
const MAX_ROBOTS_BYTES = 512 * 1024;
const MAX_FAVICON_BYTES = 1024 * 1024;
const MAX_OG_IMAGE_BYTES = 8 * 1024 * 1024;
// No avif / webp token: sites that negotiate formats then answer with their canonical PNG / JPEG.
const IMAGE_ACCEPT = 'image/png,image/jpeg,image/gif,image/svg+xml,image/*;q=0.8,*/*;q=0.5';

const CHALLENGE_TITLE = /just a moment|attention required|access denied|are you a (human|robot)|verify (that )?you are (a )?human|captcha|pardon our interruption|unusual traffic|checking your browser|request unsuccessful/i;
const CHALLENGE_BODY = /enable javascript and cookies to continue|checking your browser before|verify you are human|access to this page has been denied|unusual traffic from your|automated (access|requests)|press (and|&) hold/i;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type StepKind = 'favicon' | 'og_image' | 'screenshot_home' | 'screenshot_pricing';
type StepStatus =
  | 'captured'
  | 'already_in_manifest'
  | 'skipped_duplicate'
  | 'not_found'
  | 'skipped_robots'
  | 'skipped_off_domain'
  | 'not_attempted'
  | 'failed';
type EntityStatus =
  | 'ok'
  | 'partial'
  | 'failed'
  | 'skipped_robots'
  | 'skipped_off_domain'
  | 'blocked_by_site'
  | 'id_not_found'
  | 'no_official_url';

interface StepResult {
  kind: StepKind;
  status: StepStatus;
  assetId?: string;
  file?: string;
  bytes?: number;
  url?: string;
  detail?: string;
}
type StepOutcome = Omit<StepResult, 'kind'>;

interface EntityResult {
  entityId: string;
  name: string | null;
  officialUrl: string | null;
  finalUrl: string | null;
  status: EntityStatus;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  steps: StepResult[];
  manifestPath: string | null;
  manifestRecords: number | null;
  error: string | null;
}

interface IndexEntity {
  id: string;
  name: string | null;
  url: string | null;
  officialUrl: string | null;
  country: string | null;
}

interface CliOptions {
  ids: string[];
  limit: number | null;
  out: string;
  index: string;
  validate: boolean;
  help: boolean;
  /** Steps to run (default: all four). `--kinds favicon,og_image` skips the screenshots. */
  kinds: StepKind[];
  /** Skip ids that an earlier run already recorded in progress.jsonl (resume). */
  skipProcessed: boolean;
  /** Entities processed at the same time; two entities of the same site are never processed together. */
  concurrency: number;
}

/** A refusal or failure that is expected and recorded per step, not a crash. */
class FetchProblem extends Error {
  constructor(
    readonly kind: 'skipped_robots' | 'skipped_off_domain' | 'not_found' | 'failed',
    message: string,
  ) {
    super(message);
  }
}

interface RunContext {
  capturedBy: string;
  outDir: string;
  userAgent: string;
  robots: RobotsCache;
  browser: Browser;
  kinds: StepKind[];
}

interface EntityContext {
  run: RunContext;
  entityId: string;
  name: string;
  home: URL;
  dir: string;
  existing: Map<string, MediaAssetManifest>;
  fresh: MediaAssetManifest[];
  seen: Map<string, StepKind>;
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const log = (message: string) => console.log(message);
const isoNow = () => new Date().toISOString();
const dateStamp = (date: Date) => date.toISOString().slice(0, 10).replaceAll('-', '');
const fileStamp = (date: Date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
const sleep = (ms: number) => new Promise<void>((done) => setTimeout(done, ms));

function describeError(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error);
  return text.split('\n')[0].slice(0, 300);
}

function parsePublicHttpUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    return (url.protocol === 'https:' || url.protocol === 'http:') && isPublicWebHost(url.hostname) ? url : null;
  } catch {
    return null;
  }
}

function withoutHash(url: URL): string {
  const copy = new URL(url.href);
  copy.hash = '';
  return copy.href;
}


// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const ALL_STEP_KINDS: StepKind[] = ['favicon', 'og_image', 'screenshot_home', 'screenshot_pricing'];
const STEP_KINDS = ALL_STEP_KINDS;

const USAGE = `Usage: node --import tsx scripts/media/fetch-official-assets.ts --ids <id1,id2,...> [--limit N] [--out data/media-staging]
       node --import tsx scripts/media/fetch-official-assets.ts --validate [--ids <id1,id2,...>] [--out data/media-staging]

  --ids       Comma separated entity ids from data/entities-index.json (required unless --validate)
  --limit     Process at most N of the given ids
  --out       Staging directory (default: data/media-staging)
  --validate  Do not fetch: check hand-edited manifest.json files against the schema and the files on disk
  --index     Entity index to read (default: data/entities-index.json; for tests)
  --kinds     Comma separated steps to run: favicon,og_image,screenshot_home,screenshot_pricing (default: all)
  --skip-processed  Skip ids already recorded in <out>/progress.jsonl (one line is appended per finished entity)
  --concurrency N   Entities in parallel (default 1, max 8); never two of the same registrable domain at once
`;

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = { ids: [], limit: null, out: DEFAULT_OUT, index: DEFAULT_INDEX, validate: false, help: false, kinds: [...ALL_STEP_KINDS], skipProcessed: false, concurrency: 1 };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const equals = arg.startsWith('--') ? arg.indexOf('=') : -1;
    const flag = equals > 0 ? arg.slice(0, equals) : arg;
    const inline = equals > 0 ? arg.slice(equals + 1) : undefined;
    const value = (): string => {
      const next = inline ?? argv[++i];
      if (next === undefined || next === '') throw new Error(`${flag} needs a value`);
      return next;
    };
    switch (flag) {
      case '--ids':
        options.ids = [...new Set(value().split(',').map((id) => id.trim()).filter(Boolean))];
        break;
      case '--limit': {
        const limit = Number(value());
        if (!Number.isInteger(limit) || limit < 1) throw new Error('--limit must be a positive integer');
        options.limit = limit;
        break;
      }
      case '--out':
        options.out = resolve(value());
        break;
      case '--index':
        options.index = resolve(value());
        break;
      case '--validate':
        options.validate = true;
        break;
      case '--kinds': {
        const kinds = [...new Set(value().split(',').map((kind) => kind.trim()).filter(Boolean))];
        const unknown = kinds.filter((kind) => !ALL_STEP_KINDS.includes(kind as StepKind));
        if (unknown.length > 0 || kinds.length === 0) throw new Error(`--kinds accepts ${ALL_STEP_KINDS.join(',')} (got ${unknown.join(',') || 'nothing'})`);
        options.kinds = ALL_STEP_KINDS.filter((kind) => kinds.includes(kind));
        break;
      }
      case '--skip-processed':
        options.skipProcessed = true;
        break;
      case '--concurrency': {
        const concurrency = Number(value());
        if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 8) throw new Error('--concurrency must be an integer from 1 to 8');
        options.concurrency = concurrency;
        break;
      }
      case '--help':
      case '-h':
        options.help = true;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}\n\n${USAGE}`);
    }
  }
  if (options.help) return options;
  if (options.ids.length === 0 && !options.validate) throw new Error(`--ids is required\n\n${USAGE}`);
  const invalid = options.ids.filter((id) => !MEDIA_ENTITY_ID_PATTERN.test(id));
  if (invalid.length > 0) throw new Error(`Invalid entity id(s): ${invalid.join(', ')}`);
  if (options.limit !== null) options.ids = options.ids.slice(0, options.limit);
  return options;
}

async function loadEntities(indexPath: string, wanted: Set<string>): Promise<Map<string, IndexEntity>> {
  const parsed: unknown = JSON.parse(await readFile(indexPath, 'utf8'));
  if (!Array.isArray(parsed)) throw new Error(`${indexPath} must contain an array`);
  const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null);
  const entities = new Map<string, IndexEntity>();
  for (const item of parsed as Record<string, unknown>[]) {
    const id = typeof item?.id === 'string' ? item.id : '';
    if (!wanted.has(id)) continue;
    entities.set(id, { id, name: text(item.name), url: text(item.url), officialUrl: text(item.officialUrl), country: text(item.country) });
  }
  return entities;
}

// ---------------------------------------------------------------------------
// Network: polite fetch with a per-hop policy, and robots.txt
// ---------------------------------------------------------------------------

interface FetchedBytes {
  finalUrl: URL;
  status: number;
  contentType: string | null;
  bytes: Uint8Array;
}

async function readLimited(response: Response, maxBytes: number): Promise<Uint8Array> {
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) {
    await response.body?.cancel();
    throw new FetchProblem('failed', `file is ${declared} bytes, over the ${maxBytes} byte limit`);
  }
  if (!response.body) return new Uint8Array(0);
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new FetchProblem('failed', `file exceeds the ${maxBytes} byte limit`);
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

/** GET with manual redirects; `allowHop` must throw a FetchProblem to refuse a URL (checked before every request). */
async function fetchBytes(
  start: URL,
  options: { userAgent: string; referer?: string; accept: string; maxBytes: number; allowHop: (url: URL) => Promise<void> },
): Promise<FetchedBytes> {
  let url = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    await options.allowHop(url);
    let response: Response;
    try {
      response = await fetch(url, {
        redirect: 'manual',
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: { 'user-agent': options.userAgent, accept: options.accept, ...(options.referer ? { referer: options.referer } : {}) },
      });
    } catch (error) {
      throw new FetchProblem('failed', `request failed: ${describeError(error)}`);
    }
    const location = response.headers.get('location');
    if (response.status >= 300 && response.status < 400 && location) {
      await response.body?.cancel();
      try {
        url = new URL(location, url);
      } catch {
        throw new FetchProblem('failed', `invalid redirect target: ${location.slice(0, 200)}`);
      }
      continue;
    }
    let bytes: Uint8Array;
    try {
      if (options.maxBytes > 0) {
        bytes = await readLimited(response, options.maxBytes);
      } else {
        await response.body?.cancel(); // headers only: used to resolve redirects
        bytes = new Uint8Array(0);
      }
    } catch (error) {
      if (error instanceof FetchProblem) throw error;
      throw new FetchProblem('failed', `download failed: ${describeError(error)}`);
    }
    return { finalUrl: url, status: response.status, contentType: response.headers.get('content-type'), bytes };
  }
  throw new FetchProblem('failed', `more than ${MAX_REDIRECTS} redirects`);
}

/** robots.txt, fetched once per origin and shared by every entity of the run. */
class RobotsCache {
  private readonly cache = new Map<string, Promise<RobotsPolicy>>();

  constructor(private readonly userAgent: string) {}

  policyFor(url: URL): Promise<RobotsPolicy> {
    let policy = this.cache.get(url.origin);
    if (!policy) {
      policy = this.load(url.origin);
      this.cache.set(url.origin, policy);
    }
    return policy;
  }

  async check(url: URL): Promise<{ allowed: boolean; reason: string }> {
    const policy = await this.policyFor(url);
    if (robotsAllows(policy, url)) return { allowed: true, reason: '' };
    const why = policy.kind === 'rules' ? 'a Disallow rule matches' : policy.reason;
    return { allowed: false, reason: `robots.txt forbids ${url.pathname}${url.search} (${why})` };
  }

  private async load(origin: string): Promise<RobotsPolicy> {
    const robotsUrl = new URL('/robots.txt', origin);
    try {
      const response = await fetchBytes(robotsUrl, {
        userAgent: this.userAgent,
        accept: 'text/plain,*/*;q=0.5',
        maxBytes: MAX_ROBOTS_BYTES,
        allowHop: async (hop) => {
          if (!isSameSite(hop, robotsUrl)) throw new FetchProblem('skipped_off_domain', `robots.txt redirected off-site: ${hop.href}`);
        },
      });
      return robotsPolicyFromFetch({ status: response.status, body: new TextDecoder('utf-8').decode(response.bytes) });
    } catch (error) {
      return robotsPolicyFromFetch({ error: describeError(error) });
    }
  }
}

/** Every URL we request (and every redirect hop) must be on the official site and allowed by robots.txt. */
function assetGuard(ec: EntityContext): (url: URL) => Promise<void> {
  return async (hop) => {
    if (!isSameSite(hop, ec.home)) throw new FetchProblem('skipped_off_domain', `not on the official site: ${hop.href}`);
    const verdict = await ec.run.robots.check(hop);
    if (!verdict.allowed) throw new FetchProblem('skipped_robots', verdict.reason);
  };
}

/**
 * Playwright does not route HTTP redirect hops through page.route(), so a 3xx to another site would be followed
 * (and that site rendered) before we notice. Resolve the redirect chain first, hop by hop, with the same
 * site / robots.txt checks as every other request, and let the browser open the resolved URL directly.
 * Network trouble is not our verdict to give: the browser will report it.
 */
async function resolveOfficialRedirects(ec: EntityContext, start: URL): Promise<URL> {
  try {
    const response = await fetchBytes(start, {
      userAgent: ec.run.userAgent,
      accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
      maxBytes: 0,
      allowHop: assetGuard(ec),
    });
    return response.finalUrl;
  } catch (error) {
    if (error instanceof FetchProblem && (error.kind === 'skipped_robots' || error.kind === 'skipped_off_domain')) throw error;
    return start;
  }
}

async function downloadImage(
  ec: EntityContext,
  url: URL,
  maxBytes: number,
  referer: string,
): Promise<{ finalUrl: URL; bytes: Uint8Array; sniffed: SniffedImage }> {
  const response = await fetchBytes(url, { userAgent: ec.run.userAgent, referer, accept: IMAGE_ACCEPT, maxBytes, allowHop: assetGuard(ec) });
  if (response.status === 404 || response.status === 410) throw new FetchProblem('not_found', `HTTP ${response.status}`);
  if (response.status < 200 || response.status >= 300) throw new FetchProblem('failed', `HTTP ${response.status}`);
  const sniffed = sniffImage(response.bytes);
  if (!sniffed) throw new FetchProblem('failed', `not an image (content-type ${response.contentType ?? 'none'}, ${response.bytes.byteLength} bytes)`);
  return { finalUrl: response.finalUrl, bytes: response.bytes, sniffed };
}

function decodeDataImage(href: string, maxBytes: number): { bytes: Uint8Array; sniffed: SniffedImage } {
  const match = /^data:([^,]*),([\s\S]*)$/i.exec(href);
  if (!match) throw new FetchProblem('failed', 'malformed data: URL');
  let bytes: Uint8Array;
  try {
    bytes = /;base64$/i.test(match[1]) ? Buffer.from(match[2], 'base64') : Buffer.from(decodeURIComponent(match[2]), 'utf8');
  } catch {
    throw new FetchProblem('failed', 'undecodable data: URL');
  }
  if (bytes.byteLength > maxBytes) throw new FetchProblem('failed', 'data: URL image is too large');
  const sniffed = sniffImage(bytes);
  if (!sniffed) throw new FetchProblem('failed', 'data: URL is not an image');
  return { bytes, sniffed };
}

// ---------------------------------------------------------------------------
// Staging files and manifest
// ---------------------------------------------------------------------------

/**
 * Captures are fail-closed: decision "held" and subjectIsPerson true. Here `true` means "not yet confirmed"
 * (real captures: photoai.com's og:image and stevehanov.ca's home page are dominated by photographs of people);
 * the reviewer records false after looking at the picture (scripts/media/review-assets.ts appends it to decisions.jsonl;
 * this manifest is never edited), which the schema requires before "allowed".
 */
const HELD_NOTE =
  '自動取得 (media-fetch)。権利審査前のため held。許可前に目視で (1) 人物が主題でない (2) 同意バナー・個人情報・ログイン画面が写っていない ' +
  '(3) 識別・説明目的に限る、を確認し、review-assets で判定を追記する（この manifest は書き換えない。自動取得の既定値 subjectIsPerson=true は「未確認」の意味）。';

async function stageAsset(
  ec: EntityContext,
  stepKind: StepKind,
  bytes: Uint8Array,
  info: { sourcePageUrl: string; assetUrl: string | null; sniffed: SniffedImage; note: string },
): Promise<StepOutcome> {
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const assetId = mediaAssetIdFromSha256(sha256);
  const fileName = `${assetId}.${info.sniffed.extension}`;

  const earlier = ec.seen.get(sha256);
  if (earlier) return { status: 'skipped_duplicate', assetId, detail: `identical bytes already captured as ${earlier}` };
  ec.seen.set(sha256, stepKind);

  const existing = ec.existing.get(assetId);
  if (existing) {
    return {
      status: 'already_in_manifest',
      assetId,
      file: `${ec.entityId}/${fileName}`,
      bytes: bytes.byteLength,
      detail: `kept the existing record (kind ${existing.kind}, decision ${existing.rights.decision})`,
    };
  }

  const record = MediaAssetManifestSchema.parse({
    assetId,
    entityId: ec.entityId,
    kind: stepKind satisfies MediaAssetKind,
    sourcePageUrl: info.sourcePageUrl,
    assetUrl: info.assetUrl,
    retrievedAt: isoNow(),
    capturedBy: ec.run.capturedBy,
    sha256,
    bytes: bytes.byteLength,
    contentType: info.sniffed.contentType,
    width: info.sniffed.width,
    height: info.sniffed.height,
    rights: {
      basis: 'official_marketing_material',
      termsUrl: null,
      licence: null,
      attribution: `出典: ${ec.name.slice(0, 120)} 公式サイト (${info.sourcePageUrl.slice(0, 300)})`,
      decision: 'held',
      reviewedAt: null,
      notes: [info.note, HELD_NOTE].filter(Boolean).join(' '),
    },
    storage: { bucket: RAW_BUCKET, key: mediaRawKey(ec.entityId, sha256, info.sniffed.extension), publicKey: null },
    subjectIsPerson: true,
  });

  await mkdir(ec.dir, { recursive: true });
  try {
    await writeFile(join(ec.dir, fileName), bytes, { flag: 'wx' });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
  }
  ec.fresh.push(record);
  return { status: 'captured', assetId, file: `${ec.entityId}/${fileName}`, bytes: bytes.byteLength };
}

async function loadExistingManifest(dir: string): Promise<MediaAssetManifest[]> {
  let text: string;
  try {
    text = await readFile(join(dir, 'manifest.json'), 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
  const parsed = MediaAssetManifestFileSchema.safeParse(JSON.parse(text));
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new Error(`existing manifest.json is invalid (${first?.path.join('.') ?? '?'}: ${first?.message ?? 'unknown'}); fix or move it before re-running`);
  }
  return parsed.data;
}

/** Append-only merge: records that are already in the manifest are never rewritten. */
async function writeManifest(ec: EntityContext): Promise<{ path: string; records: number } | null> {
  if (ec.fresh.length === 0) return null;
  const merged = MediaAssetManifestFileSchema.parse([...ec.existing.values(), ...ec.fresh]);
  const path = join(ec.dir, 'manifest.json');
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(merged, null, 2)}\n`);
  await rename(temporary, path);
  return { path, records: merged.length };
}

// ---------------------------------------------------------------------------
// Browser capture
// ---------------------------------------------------------------------------

interface PageFacts {
  title: string;
  bodyText: string;
  icons: { href: string; sizes: string; type: string }[];
  ogImage: string;
  pricingLinks: { href: string; text: string; inNav: boolean }[];
}

async function readPageFacts(page: Page): Promise<PageFacts> {
  return page.evaluate((pattern: string) => {
    const matcher = new RegExp(pattern, 'i');
    const attr = (element: Element, name: string) => element.getAttribute(name) ?? '';
    const resolve = (value: string) => {
      try {
        return new URL(value, document.baseURI).href;
      } catch {
        return '';
      }
    };
    const icons = Array.from(document.querySelectorAll('link[rel]'))
      .filter((element) => attr(element, 'rel').toLowerCase().split(/\s+/).includes('icon'))
      .map((element) => ({ href: resolve(attr(element, 'href')), sizes: attr(element, 'sizes'), type: attr(element, 'type') }))
      .filter((icon) => icon.href);
    const meta = (selector: string) => document.querySelector(selector)?.getAttribute('content')?.trim() ?? '';
    const og =
      meta('meta[property="og:image"]') || meta('meta[name="og:image"]') || meta('meta[property="og:image:secure_url"]') || meta('meta[property="og:image:url"]');
    const pricingLinks = Array.from(document.querySelectorAll('a[href]')).flatMap((anchor) => {
      const visible = ((anchor as HTMLElement).innerText || anchor.textContent || '').replace(/\s+/g, ' ').trim();
      const label = [visible, attr(anchor, 'aria-label'), attr(anchor, 'title')].find((candidate) => candidate && candidate.length <= 80 && matcher.test(candidate));
      return label ? [{ href: (anchor as HTMLAnchorElement).href, text: label, inNav: Boolean(anchor.closest('nav, header')) }] : [];
    });
    return {
      title: document.title || '',
      bodyText: (document.body?.innerText || '').slice(0, 2000),
      icons,
      ogImage: og ? resolve(og) : '',
      pricingLinks: pricingLinks.slice(0, 40),
    };
  }, PRICING_LINK_TEXT.source);
}

const looksLikeChallenge = (facts: Pick<PageFacts, 'title' | 'bodyText'>) =>
  CHALLENGE_TITLE.test(facts.title) || (facts.bodyText.length < 1200 && CHALLENGE_BODY.test(facts.bodyText));

type OpenOutcome =
  | { ok: true; url: URL; facts: PageFacts }
  | { ok: false; kind: 'skipped_robots' | 'skipped_off_domain' | 'blocked_by_site' | 'failed'; detail: string };

/** Navigate inside the official site, wait for the page to settle and refuse walls, errors and off-site landings. */
async function openPage(ec: EntityContext, page: Page, target: URL, offSite: { url: string | null }): Promise<OpenOutcome> {
  try {
    return await navigate(ec, page, target, offSite);
  } catch (error) {
    return { ok: false, kind: 'failed', detail: `page could not be read: ${describeError(error)}` };
  }
}

async function navigate(ec: EntityContext, page: Page, target: URL, offSite: { url: string | null }): Promise<OpenOutcome> {
  offSite.url = null;
  let destination: URL;
  try {
    destination = await resolveOfficialRedirects(ec, target);
  } catch (error) {
    if (error instanceof FetchProblem && (error.kind === 'skipped_robots' || error.kind === 'skipped_off_domain')) return { ok: false, kind: error.kind, detail: error.message };
    return { ok: false, kind: 'failed', detail: `redirect check failed: ${describeError(error)}` };
  }

  let status = 0;
  try {
    const response = await page.goto(destination.href, { waitUntil: 'domcontentloaded', timeout: NAVIGATION_TIMEOUT_MS });
    status = response?.status() ?? 0;
  } catch (error) {
    if (offSite.url) return { ok: false, kind: 'skipped_off_domain', detail: `navigation left the official site: ${offSite.url}` };
    return { ok: false, kind: 'failed', detail: `navigation failed: ${describeError(error)}` };
  }
  await page.waitForLoadState('load', { timeout: LOAD_SETTLE_MS }).catch(() => undefined);
  await page.waitForLoadState('networkidle', { timeout: IDLE_SETTLE_MS }).catch(() => undefined);
  await sleep(700);

  const url = new URL(page.url());
  if (!isSameSite(url, ec.home)) {
    const detail = offSite.url ? `the page tried to navigate off the official site: ${offSite.url}` : `landed off the official site: ${url.href}`;
    return { ok: false, kind: 'skipped_off_domain', detail };
  }
  if (url.href !== destination.href) {
    const verdict = await ec.run.robots.check(url);
    if (!verdict.allowed) return { ok: false, kind: 'skipped_robots', detail: verdict.reason };
  }
  const facts = await readPageFacts(page);
  if (looksLikeChallenge(facts)) return { ok: false, kind: 'blocked_by_site', detail: `bot check page (HTTP ${status}, title "${facts.title.slice(0, 80)}")` };
  if (status === 403 || status === 429 || status === 503) return { ok: false, kind: 'blocked_by_site', detail: `HTTP ${status}` };
  if (status >= 400) return { ok: false, kind: 'failed', detail: `HTTP ${status}` };
  return { ok: true, url, facts };
}

function rankIcons(icons: PageFacts['icons']): string[] {
  const score = (icon: PageFacts['icons'][number]) => {
    if (/svg/i.test(icon.type) || /\.svg(?:[?#]|$)/i.test(icon.href)) return 1000;
    if (/^any$/i.test(icon.sizes.trim())) return 900;
    const sizes = [...icon.sizes.matchAll(/(\d+)x(\d+)/gi)].map((m) => Math.max(Number(m[1]), Number(m[2])));
    return sizes.length > 0 ? Math.max(...sizes) : 0;
  };
  const ordered = icons.map((icon, index) => ({ icon, index, score: score(icon) })).sort((a, b) => b.score - a.score || a.index - b.index);
  return [...new Set(ordered.map((item) => item.icon.href))];
}

const PROBLEM_PRECEDENCE: FetchProblem['kind'][] = ['failed', 'skipped_robots', 'skipped_off_domain', 'not_found'];

/** Try candidates in order; the first usable one wins, otherwise report the most informative problem. */
async function firstUsable(candidates: string[], attempt: (candidate: string) => Promise<StepOutcome>): Promise<StepOutcome> {
  const problems: FetchProblem[] = [];
  for (const candidate of candidates) {
    try {
      return await attempt(candidate);
    } catch (error) {
      problems.push(error instanceof FetchProblem ? error : new FetchProblem('failed', describeError(error)));
    }
  }
  const worst = PROBLEM_PRECEDENCE.map((kind) => problems.find((problem) => problem.kind === kind)).find(Boolean);
  return worst ? { status: worst.kind, detail: worst.message } : { status: 'not_found', detail: 'no candidate URL' };
}

async function captureDownload(ec: EntityContext, kind: 'favicon' | 'og_image', url: URL, maxBytes: number, pageUrl: URL, note: string): Promise<StepOutcome> {
  const { finalUrl, bytes, sniffed } = await downloadImage(ec, url, maxBytes, pageUrl.href);
  const staged = await stageAsset(ec, kind, bytes, { sourcePageUrl: withoutHash(pageUrl), assetUrl: url.href, sniffed, note });
  const redirected = finalUrl.href === url.href ? '' : `redirected to ${finalUrl.href}`;
  return { ...staged, url: url.href, detail: [staged.detail, redirected].filter(Boolean).join('; ') || undefined };
}

async function captureFavicon(ec: EntityContext, facts: PageFacts, pageUrl: URL): Promise<StepOutcome> {
  const fallback = new URL('/favicon.ico', pageUrl).href;
  const candidates = [...new Set([...rankIcons(facts.icons).slice(0, 3), fallback])];
  const note = '識別用の小さなロゴとしてのみ使用する（装飾利用不可）。';
  return firstUsable(candidates, async (candidate) => {
    if (candidate.startsWith('data:')) {
      const { bytes, sniffed } = decodeDataImage(candidate, MAX_FAVICON_BYTES);
      const staged = await stageAsset(ec, 'favicon', bytes, { sourcePageUrl: withoutHash(pageUrl), assetUrl: null, sniffed, note: `${note}<link rel=icon> の data: URI。` });
      return { ...staged, url: 'data:' };
    }
    return captureDownload(ec, 'favicon', new URL(candidate), MAX_FAVICON_BYTES, pageUrl, note);
  });
}

async function captureOgImage(ec: EntityContext, facts: PageFacts, pageUrl: URL): Promise<StepOutcome> {
  if (!facts.ogImage) return { status: 'not_found', detail: 'no og:image meta tag' };
  const url = parsePublicHttpUrl(facts.ogImage);
  if (!url) return { status: 'failed', detail: `og:image is not a public http(s) URL: ${facts.ogImage.slice(0, 200)}` };
  return firstUsable([url.href], () => captureDownload(ec, 'og_image', url, MAX_OG_IMAGE_BYTES, pageUrl, ''));
}

async function captureScreenshot(ec: EntityContext, page: Page, kind: 'screenshot_home' | 'screenshot_pricing', pageUrl: URL): Promise<StepOutcome> {
  let png: Uint8Array;
  try {
    png = await page.screenshot({ type: 'png', animations: 'disabled', caret: 'hide', timeout: 15_000 });
  } catch (error) {
    return { status: 'failed', detail: `screenshot failed: ${describeError(error)}` };
  }
  const sniffed = sniffImage(png) ?? { contentType: 'image/png', extension: 'png', width: VIEWPORT.width, height: VIEWPORT.height };
  const staged = await stageAsset(ec, kind, png, {
    sourcePageUrl: withoutHash(pageUrl),
    assetUrl: null,
    sniffed,
    note: 'ビューポート 1280x800 で当方が描画したスクリーンショット。同意バナーが写り込むことがある。',
  });
  return { ...staged, url: pageUrl.href };
}

async function capturePricing(ec: EntityContext, page: Page, facts: PageFacts, current: URL, offSite: { url: string | null }): Promise<StepOutcome> {
  const target = pickPricingLink(facts.pricingLinks, ec.home, current);
  if (!target) return { status: 'not_found', detail: 'no usable same-site pricing link (text /pricing|料金|price/i; articles, help pages and the current page are ignored)' };
  const verdict = await ec.run.robots.check(target);
  if (!verdict.allowed) return { status: 'skipped_robots', url: target.href, detail: verdict.reason };
  const opened = await openPage(ec, page, target, offSite);
  if (!opened.ok) return { status: opened.kind === 'blocked_by_site' ? 'failed' : opened.kind, url: target.href, detail: opened.detail };
  return captureScreenshot(ec, page, 'screenshot_pricing', opened.url);
}

/** Resolves true when the home page was captured (steps hold the per-asset results), false when it was refused. */
async function runBrowserCapture(ec: EntityContext, context: BrowserContext, result: EntityResult): Promise<boolean> {
  // tsx compiles with keepNames, which wraps nested functions in a __name() helper that does not exist inside the
  // page; the function passed to page.evaluate() is serialised as source text, so provide a no-op helper there.
  await context.addInitScript('globalThis.__name = globalThis.__name || ((fn) => fn);');
  const page = await context.newPage();
  page.setDefaultTimeout(10_000);
  page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT_MS);
  page.on('dialog', (dialog) => void dialog.dismiss().catch(() => undefined));
  context.on('page', (popup) => {
    if (popup !== page) void popup.close().catch(() => undefined);
  });

  // Top-level navigation may never leave the official site; third-party trackers are not loaded.
  const offSite: { url: string | null } = { url: null };
  await page.route('**/*', async (route) => {
    const request = route.request();
    let target: URL;
    try {
      target = new URL(request.url());
    } catch {
      return route.continue();
    }
    if (target.protocol !== 'http:' && target.protocol !== 'https:') return route.continue();
    if (request.isNavigationRequest() && request.frame() === page.mainFrame() && !isSameSite(target, ec.home)) {
      offSite.url ??= target.href;
      return route.abort('blockedbyclient');
    }
    if (isTrackerHost(target.hostname) && !isSameSite(target, ec.home)) return route.abort('blockedbyclient');
    return route.continue();
  });

  const home = await openPage(ec, page, ec.home, offSite);
  if (!home.ok) {
    result.status = home.kind;
    result.error = home.detail;
    return false;
  }
  result.finalUrl = home.url.href;

  // One failing step must not discard the others.
  const attempt = async (kind: StepKind, work: () => Promise<StepOutcome>) => {
    try {
      result.steps.push({ kind, ...(await work()) });
    } catch (error) {
      result.steps.push({ kind, status: error instanceof FetchProblem ? error.kind : 'failed', detail: describeError(error) });
    }
  };
  const wanted = (kind: StepKind) => ec.run.kinds.includes(kind);
  if (wanted('screenshot_home')) await attempt('screenshot_home', () => captureScreenshot(ec, page, 'screenshot_home', home.url));
  if (wanted('favicon')) await attempt('favicon', () => captureFavicon(ec, home.facts, home.url));
  if (wanted('og_image')) await attempt('og_image', () => captureOgImage(ec, home.facts, home.url));
  if (wanted('screenshot_pricing')) await attempt('screenshot_pricing', () => capturePricing(ec, page, home.facts, home.url, offSite));
  return true;
}

function summarizeStatus(steps: StepResult[]): EntityStatus {
  const kept = steps.filter((step) => step.status === 'captured' || step.status === 'already_in_manifest' || step.status === 'skipped_duplicate');
  if (kept.length === 0) return 'failed';
  const problems = steps.filter((step) => step.status === 'failed' || step.status === 'skipped_robots' || step.status === 'skipped_off_domain' || step.status === 'not_attempted');
  return problems.length > 0 ? 'partial' : 'ok';
}

async function withDeadline<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`entity deadline of ${ms} ms exceeded`)), ms);
  });
  work.catch(() => undefined); // the context is closed on timeout; the late rejection is expected
  try {
    return await Promise.race([work, deadline]);
  } finally {
    clearTimeout(timer);
  }
}

async function processEntity(run: RunContext, entityId: string, entities: Map<string, IndexEntity>): Promise<EntityResult> {
  const started = new Date();
  const result: EntityResult = {
    entityId,
    name: null,
    officialUrl: null,
    finalUrl: null,
    status: 'failed',
    startedAt: started.toISOString(),
    finishedAt: '',
    durationMs: 0,
    steps: [],
    manifestPath: null,
    manifestRecords: null,
    error: null,
  };
  let context: BrowserContext | undefined;
  try {
    const entity = entities.get(entityId);
    if (!entity) {
      result.status = 'id_not_found';
      result.error = 'id is not in the entity index';
      return result;
    }
    result.name = entity.name;
    const rawUrl = entity.officialUrl ?? entity.url ?? '';
    result.officialUrl = rawUrl || null;
    const home = parsePublicHttpUrl(rawUrl);
    if (!home) {
      result.status = 'no_official_url';
      result.error = rawUrl ? `not a public http(s) URL: ${rawUrl.slice(0, 200)}` : 'record has neither officialUrl nor url';
      return result;
    }

    const homeRobots = await run.robots.check(home);
    if (!homeRobots.allowed) {
      result.status = 'skipped_robots';
      result.error = homeRobots.reason;
      return result;
    }

    const dir = join(run.outDir, entityId);
    const ec: EntityContext = {
      run,
      entityId,
      name: entity.name ?? entityId,
      home,
      dir,
      existing: new Map((await loadExistingManifest(dir)).map((record) => [record.assetId, record])),
      fresh: [],
      seen: new Map(),
    };

    context = await run.browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: 1,
      userAgent: run.userAgent,
      locale: entity.country === 'JP' ? 'ja-JP' : 'en-US',
      serviceWorkers: 'block',
      acceptDownloads: false,
      reducedMotion: 'reduce',
    });

    let completed = false;
    try {
      completed = await withDeadline(runBrowserCapture(ec, context, result), ENTITY_DEADLINE_MS);
    } catch (error) {
      result.status = 'failed';
      result.error = describeError(error);
      await context.close().catch(() => undefined); // stop background work before the manifest is written
    }
    // Record whatever was staged, also after a failure, so that no file is left without provenance.
    const manifest = await writeManifest(ec);
    if (manifest) {
      result.manifestPath = manifest.path;
      result.manifestRecords = manifest.records;
    }
    if (completed) result.status = summarizeStatus(result.steps);
  } catch (error) {
    result.status = 'failed';
    result.error = describeError(error);
  } finally {
    await context?.close().catch(() => undefined);
    for (const kind of run.kinds) {
      if (!result.steps.some((step) => step.kind === kind)) result.steps.push({ kind, status: 'not_attempted', detail: result.error ?? 'not reached' });
    }
    result.steps.sort((a, b) => STEP_KINDS.indexOf(a.kind) - STEP_KINDS.indexOf(b.kind));
    const finished = new Date();
    result.finishedAt = finished.toISOString();
    result.durationMs = finished.getTime() - started.getTime();
  }
  return result;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

function printEntity(result: EntityResult): void {
  const captured = result.steps.filter((step) => step.status === 'captured').length;
  log(`  ${result.status.toUpperCase().padEnd(18)} captured=${captured}  ${(result.durationMs / 1000).toFixed(1)}s${result.error ? `  (${result.error})` : ''}`);
  for (const step of result.steps) {
    log(`      ${step.kind.padEnd(17)} ${step.status.padEnd(20)} ${step.file ?? ''}${step.detail ? `  ${step.detail}` : ''}`);
  }
}

/** --validate: a hand-edited manifest must still satisfy the schema and describe the files that are really on disk. */
async function checkEntityManifest(dir: string, entityId: string): Promise<{ records: MediaAssetManifest[]; problems: string[] } | null> {
  let text: string;
  try {
    text = await readFile(join(dir, 'manifest.json'), 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    return { records: [], problems: [`manifest.json unreadable: ${describeError(error)}`] };
  }
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (error) {
    return { records: [], problems: [`manifest.json is not JSON: ${describeError(error)}`] };
  }
  const parsed = MediaAssetManifestFileSchema.safeParse(json);
  if (!parsed.success) return { records: [], problems: parsed.error.issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`) };

  const problems: string[] = [];
  for (const record of parsed.data) {
    if (record.entityId !== entityId) problems.push(`${record.assetId}: entityId ${record.entityId} does not match the directory ${entityId}`);
    const fileName = `${record.assetId}${record.storage.key.slice(record.storage.key.lastIndexOf('.'))}`;
    let bytes: Buffer;
    try {
      bytes = await readFile(join(dir, fileName));
    } catch {
      problems.push(`${record.assetId}: ${fileName} is missing`);
      continue;
    }
    if (bytes.byteLength !== record.bytes) problems.push(`${record.assetId}: ${fileName} has ${bytes.byteLength} bytes, the manifest says ${record.bytes}`);
    else if (createHash('sha256').update(bytes).digest('hex') !== record.sha256) problems.push(`${record.assetId}: ${fileName} does not match sha256`);
  }
  return { records: parsed.data, problems };
}

async function validateManifests(outDir: string, ids: string[]): Promise<boolean> {
  const explicit = ids.length > 0;
  const entityIds = explicit ? ids : (await readdir(outDir, { withFileTypes: true })).filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  let allValid = true;
  let checked = 0;
  for (const entityId of entityIds) {
    const checkedEntity = await checkEntityManifest(join(outDir, entityId), entityId);
    if (!checkedEntity) {
      if (explicit) {
        allValid = false;
        log(`MISSING  ${entityId}  no manifest.json`);
      }
      continue;
    }
    checked += 1;
    const tally: Record<string, number> = {};
    for (const record of checkedEntity.records) tally[record.rights.decision] = (tally[record.rights.decision] ?? 0) + 1;
    if (checkedEntity.problems.length === 0) {
      log(`OK       ${entityId}  ${checkedEntity.records.length} records ${JSON.stringify(tally)}`);
    } else {
      allValid = false;
      log(`INVALID  ${entityId}`);
      for (const problem of checkedEntity.problems) log(`           ${problem}`);
    }
  }
  log(`${checked} manifest(s) checked: ${allValid ? 'all valid' : 'PROBLEMS FOUND'}`);
  return allValid;
}

async function readProgressIds(path: string): Promise<Set<string>> {
  const ids = new Set<string>();
  let text: string;
  try {
    text = await readFile(path, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return ids;
    throw error;
  }
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    try {
      const entityId = (JSON.parse(line) as { entityId?: unknown }).entityId;
      if (typeof entityId === 'string') ids.add(entityId);
    } catch {
      // a half-written line (killed run) is ignored; that entity is simply processed again
    }
  }
  return ids;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    log(USAGE);
    return;
  }
  if (options.validate) {
    if (!(await validateManifests(options.out, options.ids))) process.exitCode = 1;
    return;
  }

  const started = new Date();
  const capturedBy = `media-fetch-${dateStamp(started)}`;
  await mkdir(options.out, { recursive: true });
  const entities = await loadEntities(options.index, new Set(options.ids));

  const browser = await chromium.launch({ headless: true });
  const chromeVersion = browser.version();
  const userAgent = `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36 ${MEDIA_FETCH_PRODUCT_TOKEN}/1.0`;
  const run: RunContext = { capturedBy, outDir: options.out, userAgent, robots: new RobotsCache(userAgent), browser, kinds: options.kinds };

  const progressPath = join(options.out, PROGRESS_FILE);
  const done = options.skipProcessed ? await readProgressIds(progressPath) : new Set<string>();
  const queue = options.ids.filter((id) => !done.has(id));
  log(`media-fetch ${capturedBy}: ${queue.length} entit${queue.length === 1 ? 'y' : 'ies'} (${options.ids.length - queue.length} already processed) kinds=${options.kinds.join(',')} concurrency=${options.concurrency} -> ${options.out}`);
  const results: EntityResult[] = [];
  const inFlightSites = new Set<string>();
  let finishedCount = 0;
  // Two entities of the same registrable domain never run together (one request stream per host).
  const siteOf = (entityId: string): string => {
    const url = parsePublicHttpUrl(entities.get(entityId)?.officialUrl ?? entities.get(entityId)?.url ?? '');
    return url ? registrableDomain(url.hostname) : `id:${entityId}`;
  };
  const worker = async () => {
    for (;;) {
      if (queue.length === 0) return;
      const pickIndex = queue.findIndex((id) => !inFlightSites.has(siteOf(id)));
      if (pickIndex < 0) {
        await sleep(200);
        continue;
      }
      const [entityId] = queue.splice(pickIndex, 1);
      const site = siteOf(entityId);
      inFlightSites.add(site);
      try {
        if (!run.browser.isConnected()) {
          log('  browser crashed earlier in this run; launching a new one');
          run.browser = await chromium.launch({ headless: true });
        }
        const result = await processEntity(run, entityId, entities);
        results.push(result);
        finishedCount += 1;
        log(`[${finishedCount}/${finishedCount + queue.length}] ${entityId}`);
        printEntity(result);
        await appendFile(progressPath, `${JSON.stringify({ entityId, status: result.status, kinds: options.kinds, at: isoNow(), captured: result.steps.filter((step) => step.status === 'captured').length })}\n`);
      } finally {
        inFlightSites.delete(site);
      }
    }
  };
  try {
    await Promise.all(Array.from({ length: Math.min(options.concurrency, Math.max(queue.length, 1)) }, worker));
  } finally {
    await run.browser.close().catch(() => undefined);
  }

  const finished = new Date();
  const byStatus: Record<string, number> = {};
  for (const result of results) byStatus[result.status] = (byStatus[result.status] ?? 0) + 1;
  const captured = results.flatMap((result) => result.steps).filter((step) => step.status === 'captured');
  const runLog = {
    schema: 'media-fetch-run.v1',
    runId: capturedBy,
    startedAt: started.toISOString(),
    finishedAt: finished.toISOString(),
    tool: { script: 'scripts/media/fetch-official-assets.ts', node: process.version, chromium: chromeVersion, userAgent },
    options: { ids: options.ids, limit: options.limit, out: options.out, index: options.index },
    summary: { entities: results.length, byStatus, assetsCaptured: captured.length, bytesCaptured: captured.reduce((sum, step) => sum + (step.bytes ?? 0), 0) },
    entities: results,
  };
  const logPath = join(options.out, `run-${fileStamp(started)}.json`);
  await writeFile(logPath, `${JSON.stringify(runLog, null, 2)}\n`, { flag: 'wx' });
  log(`run log: ${logPath}`);
  log(`summary: ${JSON.stringify(runLog.summary)}`);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
