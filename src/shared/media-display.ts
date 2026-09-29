import type { MediaAssetKind } from './media-asset-schema';

/**
 * What the browser is told about displayable media: the response of GET /api/media and the rules
 * that pick a list logo and the inspector gallery from it. Safe for client bundles: no zod, no fs,
 * type-only imports. The server side (which assets may be shown at all) is media-decisions.ts.
 *
 * Operating procedure: docs/MEDIA_ASSETS_AND_PROVENANCE.md (chapter 11)
 */

export const PUBLIC_MEDIA_RESPONSE_SCHEMA = 'make-money-media-response.v1';
/** Most entity ids one request may carry. */
export const MEDIA_API_MAX_ENTITIES = 40;
/** Longest request URL the media API reads (40 ids of 128 characters fit with room to spare). */
export const MEDIA_API_MAX_URL_LENGTH = 8192;

export type MediaSourceKind = 'local_staging' | 'foundation_public' | 'off';

/** One image the UI is allowed to show, with the text that must be shown with it. */
export interface PublicMediaAsset {
  assetId: string;
  kind: MediaAssetKind;
  /** Same-origin `/api/media/file?...` (development) or an https URL on the public R2 domain. */
  url: string;
  contentType: string;
  width: number | null;
  height: number | null;
  /** Shown under the image, e.g. "出典: キーエンス (KEYENCE) 公式サイト (https://www.keyence.co.jp/)". */
  attribution: string;
  sourcePageUrl: string;
  retrievedAt: string;
}

export interface PublicMediaResponse {
  schema: typeof PUBLIC_MEDIA_RESPONSE_SCHEMA;
  source: MediaSourceKind;
  /** False when the source cannot serve at all (for example no public domain is configured): show nothing. */
  available: boolean;
  reason?: string;
  /** Only entities that have at least one displayable image are present. */
  entities: Record<string, PublicMediaAsset[]>;
}

/** Same alphabet as MEDIA_ENTITY_ID_PATTERN in media-asset-schema.ts (a test keeps them equal). */
export const MEDIA_ENTITY_ID_RE = /^ent_[A-Za-z0-9_-]+$/;
export const MEDIA_ENTITY_ID_MAX_LENGTH = 128;

export function isMediaEntityId(value: unknown): value is string {
  return typeof value === 'string' && value.length <= MEDIA_ENTITY_ID_MAX_LENGTH && MEDIA_ENTITY_ID_RE.test(value);
}

/** Kinds the UI may show as the small logo in a list row, best first. */
export const MEDIA_LOGO_KINDS: readonly MediaAssetKind[] = ['logo', 'favicon', 'og_image'];
/** Kinds shown in the inspector gallery, in display order. */
export const MEDIA_GALLERY_KINDS: readonly MediaAssetKind[] = ['screenshot_home', 'screenshot_pricing', 'og_image'];

/** Same list as MEDIA_ASSET_KINDS in media-asset-schema.ts (a test keeps them equal). */
const KNOWN_KINDS: ReadonlySet<string> = new Set<MediaAssetKind>([
  'logo',
  'favicon',
  'og_image',
  'screenshot_home',
  'screenshot_pricing',
  'screenshot_product',
  'product_image',
  'press_kit',
  'generated_chart',
  'generated_illustration',
  'open_licence_image',
]);

const KIND_LABELS: Partial<Record<MediaAssetKind, string>> = {
  logo: 'ロゴ',
  favicon: 'ロゴ',
  og_image: '公式サイトの紹介画像',
  screenshot_home: '公式サイトのトップページ',
  screenshot_pricing: '公式サイトの料金ページ',
};

export function mediaKindLabel(kind: MediaAssetKind): string {
  return KIND_LABELS[kind] ?? '公式画像';
}

/** The newest asset of each requested kind, in the order of `kinds`. */
function newestPerKind(assets: readonly PublicMediaAsset[], kinds: readonly MediaAssetKind[]): PublicMediaAsset[] {
  const picked: PublicMediaAsset[] = [];
  for (const kind of kinds) {
    let best: PublicMediaAsset | null = null;
    for (const asset of assets) {
      if (asset.kind === kind && (best === null || Date.parse(asset.retrievedAt) > Date.parse(best.retrievedAt))) best = asset;
    }
    if (best) picked.push(best);
  }
  return picked;
}

/** The image for the 20px logo slot of a list row: logo, else favicon, else og:image. */
export function pickEntityLogo(assets: readonly PublicMediaAsset[] | undefined): PublicMediaAsset | null {
  return assets ? (newestPerKind(assets, MEDIA_LOGO_KINDS)[0] ?? null) : null;
}

/** The images for the inspector gallery: newest home screenshot, pricing screenshot, og:image. */
export function pickGalleryAssets(assets: readonly PublicMediaAsset[] | undefined): PublicMediaAsset[] {
  return assets ? newestPerKind(assets, MEDIA_GALLERY_KINDS) : [];
}

/** `?entity_id=a&entity_id=b` for a batch of valid ids (invalid ids are dropped, duplicates removed). */
export function mediaQueryString(entityIds: readonly string[]): string {
  const ids = [...new Set(entityIds.filter(isMediaEntityId))].slice(0, MEDIA_API_MAX_ENTITIES);
  return ids.map((id) => `entity_id=${encodeURIComponent(id)}`).join('&');
}

/** Same-origin file route of the development server, or an absolute https URL. Anything else is refused. */
export function isSafeMediaUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 2048) return false;
  if (value.startsWith('/api/media/file?')) return true;
  if (!URL.canParse(value)) return false;
  const url = new URL(value);
  return url.protocol === 'https:' && url.username === '' && url.password === '';
}

function isHttpUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 2048 || !URL.canParse(value)) return false;
  const protocol = new URL(value).protocol;
  return protocol === 'https:' || protocol === 'http:';
}

const isDimension = (value: unknown): value is number | null => value === null || (typeof value === 'number' && Number.isInteger(value) && value > 0 && value <= 100_000);

function parseAsset(value: unknown): PublicMediaAsset | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  if (typeof item.assetId !== 'string' || !/^ma_[0-9a-f]{24}$/.test(item.assetId)) return null;
  if (typeof item.kind !== 'string' || !KNOWN_KINDS.has(item.kind)) return null;
  if (!isSafeMediaUrl(item.url) || !isHttpUrl(item.sourcePageUrl)) return null;
  if (typeof item.contentType !== 'string' || !/^image\/[a-z0-9][a-z0-9.+-]*$/.test(item.contentType)) return null;
  if (!isDimension(item.width) || !isDimension(item.height)) return null;
  if (typeof item.attribution !== 'string' || !/\S/.test(item.attribution) || item.attribution.length > 500) return null;
  if (typeof item.retrievedAt !== 'string' || Number.isNaN(Date.parse(item.retrievedAt))) return null;
  return {
    assetId: item.assetId,
    kind: item.kind as MediaAssetKind,
    url: item.url,
    contentType: item.contentType,
    width: item.width,
    height: item.height,
    attribution: item.attribution,
    sourcePageUrl: item.sourcePageUrl,
    retrievedAt: item.retrievedAt,
  };
}

/**
 * Defensive reader for the /api/media response in the browser: anything unexpected yields "no media",
 * a malformed asset is dropped on its own, and an asset without attribution text is never returned
 * (an image is not shown without its source).
 */
export function parsePublicMediaResponse(json: unknown): Record<string, PublicMediaAsset[]> {
  const result: Record<string, PublicMediaAsset[]> = {};
  if (!json || typeof json !== 'object') return result;
  const body = json as Record<string, unknown>;
  if (body.schema !== PUBLIC_MEDIA_RESPONSE_SCHEMA || body.available === false) return result;
  if (!body.entities || typeof body.entities !== 'object' || Array.isArray(body.entities)) return result;
  for (const [entityId, assets] of Object.entries(body.entities as Record<string, unknown>)) {
    if (!isMediaEntityId(entityId) || !Array.isArray(assets)) continue;
    const parsed = assets.map(parseAsset).filter((asset): asset is PublicMediaAsset => asset !== null);
    if (parsed.length > 0) result[entityId] = parsed;
  }
  return result;
}
