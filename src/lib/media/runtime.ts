import { getRuntimeEnvValue } from '../runtime/cloudflare';
import { createPublicMediaReader, type PublicMediaReader } from './public-reader';
import { createR2PublicObjectSource } from './r2-public-source';
import { resolveMediaSource, type MediaSourceConfig } from './source';

/** Server-only wiring of the media routes: environment -> source, and one long-lived public reader (its listing cache). */

export async function readMediaSource(): Promise<MediaSourceConfig> {
  const [mediaSource, stagingDir, publicDomain] = await Promise.all([
    getRuntimeEnvValue('MEDIA_SOURCE'),
    getRuntimeEnvValue('MEDIA_STAGING_DIR'),
    getRuntimeEnvValue('CLOUDFLARE_R2_PUBLIC_DOMAIN'),
  ]);
  return resolveMediaSource(
    { NODE_ENV: process.env.NODE_ENV, MEDIA_SOURCE: mediaSource, MEDIA_STAGING_DIR: stagingDir, CLOUDFLARE_R2_PUBLIC_DOMAIN: publicDomain },
    process.cwd(),
  );
}

let shared: { publicDomain: string | null; reader: PublicMediaReader } | null = null;

export function publicMediaReaderFor(publicDomain: string | null): PublicMediaReader {
  if (!shared || shared.publicDomain !== publicDomain) {
    shared = { publicDomain, reader: createPublicMediaReader({ source: createR2PublicObjectSource(), publicDomain }) };
  }
  return shared.reader;
}
