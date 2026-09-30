import { resolve } from 'node:path';
import { MEDIA_STAGING_RELATIVE_DIR } from '../../shared/media-asset-store';

/**
 * Where GET /api/media reads displayable images from.
 *
 *   local_staging      data/media-staging (development, and the local e2e server). Decisions come from decisions.jsonl.
 *   foundation_public  the public bucket's media/<entityId>/ (production). Needs CLOUDFLARE_R2_PUBLIC_DOMAIN; without it nothing is shown.
 *   off                nothing is shown.
 *
 * Default: `next dev` (NODE_ENV=development) reads the local staging directory; everything else reads foundation-public.
 * `MEDIA_SOURCE` (local_staging | foundation_public | off) overrides that; any other value switches media off (fail closed).
 * `MEDIA_STAGING_DIR` moves the local staging root (the e2e server points it at the repository's data/media-staging,
 * because the standalone server runs from .next/standalone).
 */
export type MediaSourceConfig =
  | { kind: 'local_staging'; root: string }
  | { kind: 'foundation_public'; publicDomain: string | null }
  | { kind: 'off' };

export interface MediaEnv {
  NODE_ENV?: string;
  MEDIA_SOURCE?: string;
  MEDIA_STAGING_DIR?: string;
  CLOUDFLARE_R2_PUBLIC_DOMAIN?: string;
}

/** `https://assets.example.com/` -> `https://assets.example.com`. Anything that is not a plain https origin is refused. */
export function normalizePublicDomain(value: string | undefined): string | null {
  const text = value?.trim();
  if (!text || !URL.canParse(text)) return null;
  const url = new URL(text);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) return null;
  if (url.pathname !== '/' && url.pathname !== '') return null;
  return url.origin;
}

export function resolveMediaSource(env: MediaEnv, cwd: string): MediaSourceConfig {
  const explicit = env.MEDIA_SOURCE?.trim();
  const kind = explicit || (env.NODE_ENV === 'development' ? 'local_staging' : 'foundation_public');
  if (kind === 'local_staging') return { kind, root: resolve(env.MEDIA_STAGING_DIR?.trim() || resolve(cwd, MEDIA_STAGING_RELATIVE_DIR)) };
  if (kind === 'foundation_public') return { kind, publicDomain: normalizePublicDomain(env.CLOUDFLARE_R2_PUBLIC_DOMAIN) };
  return { kind: 'off' };
}
