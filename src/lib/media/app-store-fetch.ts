import { createHash } from 'node:crypto';
import { appendFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import {
  MEDIA_ENTITY_ID_PATTERN,
  MediaAssetManifestFileSchema,
  MediaAssetManifestSchema,
  mediaAssetIdFromSha256,
  mediaRawKey,
  type MediaAssetKind,
  type MediaAssetManifest,
} from '../../shared/media-asset-schema';
import { readMediaManifest, stagedFileName } from '../../shared/media-asset-store';
import { isSameSite, sniffImage, type SniffedImage } from '../../shared/media-fetch-policy';

/**
 * Fetches the app icon and up to three store screenshots of an entity's iOS app through Apple's public
 * iTunes Lookup / Search API (https://itunes.apple.com/lookup, /search) and records them in the media ledger
 * (kind app_icon / store_screenshot, basis official_marketing_material, decision held).
 *
 * Scope rules (docs/MEDIA_ASSETS_AND_PROVENANCE.md chapter 2 and 6.2):
 *   - an entity is a target when its record links to apps.apple.com (reaudit.sources or officialUrl); otherwise the app is
 *     searched by name and accepted only when its sellerUrl belongs to the entity's official domain;
 *   - Google Play is out of scope (no official API; scraping its HTML is grey under its terms);
 *   - images are downloaded only from Apple's image CDN (*.mzstatic.com) as named by the API response;
 *   - at most one API request per interval; 403/429 back off and, when they persist, stop the run.
 *
 * Kept out of the script so that it can be tested (vitest only collects src/**).
 */

export const APP_STORE_USER_AGENT = 'MakeMoneyMediaFetch/1.0 (+app-store-artwork; identification and explanation use)';
export const APP_STORE_PROGRESS_FILE = 'appstore-progress.jsonl';
export const APP_STORE_MAX_SCREENSHOTS = 3;
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const RAW_BUCKET = 'foundation-raw';

export interface ItunesApp {
  trackId?: number;
  trackName?: string;
  trackViewUrl?: string;
  sellerName?: string;
  sellerUrl?: string;
  artworkUrl512?: string;
  screenshotUrls?: string[];
  ipadScreenshotUrls?: string[];
}

export interface AppStoreEntity {
  id: string;
  name: string;
  country: string | null;
  officialUrl: string | null;
  /** Every URL of the record that could point at the App Store (reaudit.sources[].url, officialUrl, url). */
  candidateUrls: string[];
}

export interface AppStoreRef {
  appId: string;
  /** Two-letter storefront from the URL path (`/jp/app/...`), default `us`. */
  storefront: string;
  url: string;
}

/** The first apps.apple.com app URL among `urls` (…/app/<slug>/id123456789 or …/id123456789). */
export function extractAppStoreRef(urls: readonly string[]): AppStoreRef | null {
  for (const raw of urls) {
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      continue;
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') continue;
    if (url.hostname.toLowerCase() !== 'apps.apple.com') continue;
    const id = /\/id(\d{5,15})(?:[/?#]|$)/.exec(url.pathname)?.[1];
    if (!id) continue;
    const storefront = /^\/([a-z]{2})\//.exec(url.pathname)?.[1] ?? 'us';
    return { appId: id, storefront, url: raw };
  }
  return null;
}

/** "Steve Hanov (Micro-SaaS)" -> "Steve Hanov": the parenthesised part is our own label, not the app's name. */
export function searchTermFor(name: string): string {
  return name.replace(/[（(][^）)]*[）)]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100);
}

/** The first search result whose sellerUrl is on the entity's official site (same registrable domain). */
export function pickSearchMatch(results: readonly ItunesApp[], officialUrl: string): ItunesApp | null {
  for (const app of results) {
    if (!app.sellerUrl || !app.trackViewUrl || !app.artworkUrl512) continue;
    if (isSameSite(app.sellerUrl, officialUrl)) return app;
  }
  return null;
}

export function isAppleImageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && (url.hostname === 'mzstatic.com' || url.hostname.endsWith('.mzstatic.com'));
  } catch {
    return false;
  }
}

export type AppStoreOutcomeStatus = 'captured' | 'nothing_new' | 'skipped' | 'error';

export interface AppStoreOutcome {
  entityId: string;
  status: AppStoreOutcomeStatus;
  reason: string;
  trackViewUrl?: string;
  icons: number;
  screenshots: number;
}

export interface JsonResponse {
  status: number;
  json: unknown;
}
export interface BytesResponse {
  status: number;
  finalUrl: string;
  bytes: Uint8Array;
}

/** Thrown when Apple keeps refusing (403/429): the run stops instead of hammering the API. */
export class AppStoreRateLimited extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AppStoreRateLimited';
  }
}

export interface AppStoreDeps {
  getJson: (url: string) => Promise<JsonResponse>;
  getBytes: (url: string) => Promise<BytesResponse>;
  sleep: (ms: number) => Promise<void>;
  now: () => Date;
  /** Minimum gap between two API requests (ms). Image downloads are not counted. */
  minIntervalMs: number;
}

export interface AppStoreContext {
  deps: AppStoreDeps;
  stagingRoot: string;
  capturedBy: string;
  lastApiCallAt: number;
  backoffMs: number;
}

export function newAppStoreContext(deps: AppStoreDeps, stagingRoot: string): AppStoreContext {
  return { deps, stagingRoot: resolve(stagingRoot), capturedBy: `media-appstore-${deps.now().toISOString().slice(0, 10).replaceAll('-', '')}`, lastApiCallAt: 0, backoffMs: 0 };
}

async function apiJson(ctx: AppStoreContext, url: string): Promise<JsonResponse> {
  for (let attempt = 0; ; attempt += 1) {
    const wait = ctx.lastApiCallAt + ctx.deps.minIntervalMs + ctx.backoffMs - ctx.deps.now().getTime();
    if (wait > 0) await ctx.deps.sleep(wait);
    ctx.lastApiCallAt = ctx.deps.now().getTime();
    const response = await ctx.deps.getJson(url);
    if (response.status === 403 || response.status === 429) {
      if (attempt >= 2) throw new AppStoreRateLimited(`iTunes API answered HTTP ${response.status} three times in a row`);
      ctx.backoffMs = Math.max(ctx.backoffMs * 2, 30_000);
      await ctx.deps.sleep(ctx.backoffMs);
      continue;
    }
    ctx.backoffMs = Math.floor(ctx.backoffMs / 2);
    return response;
  }
}

function resultsOf(json: unknown): ItunesApp[] {
  if (!json || typeof json !== 'object') return [];
  const results = (json as { results?: unknown }).results;
  return Array.isArray(results) ? (results.filter((item) => item && typeof item === 'object') as ItunesApp[]) : [];
}

async function resolveApp(ctx: AppStoreContext, entity: AppStoreEntity): Promise<{ app: ItunesApp; via: string } | { skip: string; retry?: boolean }> {
  const ref = extractAppStoreRef(entity.candidateUrls);
  if (ref) {
    const response = await apiJson(ctx, `https://itunes.apple.com/lookup?id=${ref.appId}&country=${ref.storefront}&entity=software`);
    if (response.status !== 200) return { skip: `lookup failed (HTTP ${response.status})`, retry: true };
    const app = resultsOf(response.json).find((item) => item.trackViewUrl && item.artworkUrl512);
    return app ? { app, via: `lookup id${ref.appId}` } : { skip: `lookup id${ref.appId} returned no app (removed from the store?)` };
  }
  if (!entity.officialUrl) return { skip: 'no apps.apple.com URL and no official URL to match a search result against' };
  const term = searchTermFor(entity.name);
  if (term.length < 2) return { skip: 'company name too short to search' };
  const storefront = entity.country === 'JP' ? 'jp' : 'us';
  const response = await apiJson(ctx, `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=software&limit=10&country=${storefront}`);
  if (response.status !== 200) return { skip: `search failed (HTTP ${response.status})`, retry: true };
  const results = resultsOf(response.json);
  if (results.length === 0) return { skip: `search "${term}" found no app` };
  const match = pickSearchMatch(results, entity.officialUrl);
  return match ? { app: match, via: `search "${term}"` } : { skip: `search "${term}": no result whose sellerUrl is on the official domain (${results.length} results)` };
}

const NOTE =
  'Apple 公開 iTunes Lookup/Search API 経由で取得（アプリの販促素材。権利区分 official_marketing_material）。' +
  '識別・説明の目的に限り小さく表示し、出典リンクを付け、削除依頼に応じる。自動取得のため held、目視または自動判定 (auto-review) を経るまで表示しない。';

function buildRecord(ctx: AppStoreContext, entity: AppStoreEntity, app: ItunesApp, kind: MediaAssetKind, assetUrl: string, bytes: Uint8Array, sniffed: SniffedImage, note: string): MediaAssetManifest {
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const trackViewUrl = new URL(app.trackViewUrl as string);
  trackViewUrl.hash = '';
  return MediaAssetManifestSchema.parse({
    assetId: mediaAssetIdFromSha256(sha256),
    entityId: entity.id,
    kind,
    sourcePageUrl: trackViewUrl.href,
    assetUrl,
    retrievedAt: ctx.deps.now().toISOString(),
    capturedBy: ctx.capturedBy,
    sha256,
    bytes: bytes.byteLength,
    contentType: sniffed.contentType,
    width: sniffed.width,
    height: sniffed.height,
    rights: {
      basis: 'official_marketing_material',
      termsUrl: null,
      licence: null,
      attribution: `出典: ${entity.name.slice(0, 100)} App Store 掲載画像 (${trackViewUrl.href.slice(0, 300)})`,
      decision: 'held',
      reviewedAt: null,
      notes: `${note} ${NOTE}`,
    },
    storage: { bucket: RAW_BUCKET, key: mediaRawKey(entity.id, sha256, sniffed.extension), publicKey: null },
    subjectIsPerson: true,
  });
}

async function writeManifestAtomically(dir: string, records: MediaAssetManifest[]): Promise<void> {
  const merged = MediaAssetManifestFileSchema.parse(records);
  const path = join(dir, 'manifest.json');
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(merged, null, 2)}\n`);
  await rename(temporary, path);
}

/** Process one entity: resolve the app, download the icon and up to three screenshots, extend manifest.json. */
export async function fetchAppStoreAssetsForEntity(ctx: AppStoreContext, entity: AppStoreEntity): Promise<AppStoreOutcome> {
  const outcome = (status: AppStoreOutcomeStatus, reason: string, extra: Partial<AppStoreOutcome> = {}): AppStoreOutcome => ({ entityId: entity.id, status, reason, icons: 0, screenshots: 0, ...extra });
  if (!MEDIA_ENTITY_ID_PATTERN.test(entity.id)) return outcome('skipped', 'invalid entity id');
  const resolved = await resolveApp(ctx, entity);
  if ('skip' in resolved) return outcome(resolved.retry ? 'error' : 'skipped', resolved.skip);
  const { app, via } = resolved;
  const trackViewUrl = app.trackViewUrl as string;

  const wanted: { kind: MediaAssetKind; url: string; note: string }[] = [];
  if (app.artworkUrl512) wanted.push({ kind: 'app_icon', url: app.artworkUrl512, note: `アプリのアイコン (artworkUrl512, ${via})。` });
  const shots = (app.screenshotUrls?.length ? app.screenshotUrls : (app.ipadScreenshotUrls ?? [])).filter((url) => typeof url === 'string').slice(0, APP_STORE_MAX_SCREENSHOTS);
  shots.forEach((url, index) => wanted.push({ kind: 'store_screenshot', url, note: `ストアのスクリーンショット ${index + 1}/${shots.length} (${via})。` }));

  const dir = join(ctx.stagingRoot, entity.id);
  const existing = (await readMediaManifest(entity.id, { root: ctx.stagingRoot })) ?? [];
  const known = new Set(existing.map((record) => record.assetId));
  const fresh: MediaAssetManifest[] = [];
  const problems: string[] = [];

  for (const item of wanted) {
    if (!isAppleImageUrl(item.url)) {
      problems.push(`${item.kind}: image host is not Apple's CDN`);
      continue;
    }
    let downloaded: BytesResponse;
    try {
      downloaded = await ctx.deps.getBytes(item.url);
    } catch (error) {
      problems.push(`${item.kind}: download failed (${error instanceof Error ? error.message : String(error)})`);
      continue;
    }
    if (downloaded.status !== 200 || !isAppleImageUrl(downloaded.finalUrl)) {
      problems.push(`${item.kind}: HTTP ${downloaded.status}`);
      continue;
    }
    if (downloaded.bytes.byteLength === 0 || downloaded.bytes.byteLength > MAX_IMAGE_BYTES) {
      problems.push(`${item.kind}: unexpected size ${downloaded.bytes.byteLength}`);
      continue;
    }
    const sniffed = sniffImage(downloaded.bytes);
    if (!sniffed) {
      problems.push(`${item.kind}: not an image`);
      continue;
    }
    const record = buildRecord(ctx, entity, { ...app, trackViewUrl }, item.kind, item.url, downloaded.bytes, sniffed, item.note);
    if (known.has(record.assetId) || fresh.some((other) => other.assetId === record.assetId)) continue;
    await mkdir(dir, { recursive: true });
    try {
      await writeFile(join(dir, stagedFileName(record)), downloaded.bytes, { flag: 'wx' });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    }
    fresh.push(record);
  }

  if (fresh.length > 0) await writeManifestAtomically(dir, [...existing, ...fresh]);
  const icons = fresh.filter((record) => record.kind === 'app_icon').length;
  const screenshots = fresh.filter((record) => record.kind === 'store_screenshot').length;
  const detail = problems.length > 0 ? ` (${problems.join('; ')})` : '';
  if (fresh.length > 0) return outcome('captured', `${via}${detail}`, { trackViewUrl, icons, screenshots });
  return problems.length > 0 ? outcome('error', `${via}${detail}`, { trackViewUrl }) : outcome('nothing_new', `${via}: every image was already in the ledger`, { trackViewUrl });
}

// ---------------------------------------------------------------------------
// Run over many entities with a resumable progress file
// ---------------------------------------------------------------------------

export async function readAppStoreProgress(stagingRoot: string): Promise<Set<string>> {
  const done = new Set<string>();
  let text: string;
  try {
    text = await readFile(join(stagingRoot, APP_STORE_PROGRESS_FILE), 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return done;
    throw error;
  }
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    try {
      const row = JSON.parse(line) as { entityId?: unknown; status?: unknown };
      // Errors are retried on the next run; captured, nothing_new and skipped (with their reason) are final.
      if (typeof row.entityId === 'string' && row.status !== 'error') done.add(row.entityId);
    } catch {
      // half-written last line of a killed run
    }
  }
  return done;
}

export interface AppStoreRunSummary {
  processed: number;
  alreadyDone: number;
  remaining: number;
  captured: number;
  skipped: number;
  errors: number;
  icons: number;
  screenshots: number;
  stoppedEarly: string | null;
}

export async function runAppStoreFetch(
  ctx: AppStoreContext,
  entities: readonly AppStoreEntity[],
  options: { limit?: number | null; log: (line: string) => void },
): Promise<AppStoreRunSummary> {
  const done = await readAppStoreProgress(ctx.stagingRoot);
  const pending = entities.filter((entity) => !done.has(entity.id));
  const queue = options.limit ? pending.slice(0, options.limit) : pending;
  const summary: AppStoreRunSummary = { processed: 0, alreadyDone: entities.length - pending.length, remaining: pending.length, captured: 0, skipped: 0, errors: 0, icons: 0, screenshots: 0, stoppedEarly: null };
  await mkdir(ctx.stagingRoot, { recursive: true });
  for (const entity of queue) {
    let outcome: AppStoreOutcome;
    try {
      outcome = await fetchAppStoreAssetsForEntity(ctx, entity);
    } catch (error) {
      if (error instanceof AppStoreRateLimited) {
        summary.stoppedEarly = error.message;
        options.log(`STOP  ${error.message}`);
        break;
      }
      outcome = { entityId: entity.id, status: 'error', reason: error instanceof Error ? error.message : String(error), icons: 0, screenshots: 0 };
    }
    summary.processed += 1;
    summary.remaining -= 1;
    if (outcome.status === 'captured') summary.captured += 1;
    else if (outcome.status === 'skipped') summary.skipped += 1;
    else if (outcome.status === 'error') summary.errors += 1;
    summary.icons += outcome.icons;
    summary.screenshots += outcome.screenshots;
    await appendFile(join(ctx.stagingRoot, APP_STORE_PROGRESS_FILE), `${JSON.stringify({ ...outcome, at: ctx.deps.now().toISOString() })}\n`);
    options.log(`[${summary.processed}/${queue.length}] ${outcome.status.toUpperCase().padEnd(9)} ${entity.id}  icon=${outcome.icons} shots=${outcome.screenshots}  ${outcome.reason.slice(0, 160)}`);
  }
  return summary;
}

// ---------------------------------------------------------------------------
// Target list
// ---------------------------------------------------------------------------

/**
 * Entities of the published catalog (`catalogIds`) that can be handled: a direct App Store link, or an official URL to
 * match a name search against. `index` is the parsed data/entities-index.json.
 */
export function selectAppStoreEntities(index: unknown, catalogIds: ReadonlySet<string>): AppStoreEntity[] {
  if (!Array.isArray(index)) throw new Error('entities-index.json must contain an array');
  const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null);
  const entities: AppStoreEntity[] = [];
  for (const item of index as Record<string, unknown>[]) {
    const id = text(item?.id);
    if (!id || !catalogIds.has(id)) continue;
    const reaudit = item.reaudit as { sources?: { url?: unknown }[] } | undefined;
    const sourceUrls = (Array.isArray(reaudit?.sources) ? reaudit.sources : []).map((source) => text(source?.url)).filter((url): url is string => url !== null);
    const officialUrl = text(item.officialUrl);
    const candidateUrls = [...sourceUrls, ...(officialUrl ? [officialUrl] : [])];
    const hasLink = extractAppStoreRef(candidateUrls) !== null;
    if (!hasLink && !officialUrl) continue;
    entities.push({ id, name: text(item.name) ?? id, country: text(item.country), officialUrl, candidateUrls });
  }
  return entities;
}
