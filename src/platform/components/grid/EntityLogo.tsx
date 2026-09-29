'use client';

import React, { useState } from 'react';
import type { PublicMediaAsset } from '@/shared/media-display';

/**
 * The 20px mark in front of a company name in a list row: the entity's own logo / favicon / og:image,
 * only when the server has vetted it (allowed, not a person). Renders nothing without one, and nothing if the
 * file fails to load. The attribution is in the tooltip; the full text is shown with the larger images in the inspector.
 */
export function EntityLogo({ asset }: { asset: PublicMediaAsset | null | undefined }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  if (!asset || failedUrl === asset.url) return null;
  return (
    // A vetted official image served by our own route or the public R2 domain; the Next image optimizer is not part of the Workers deploy.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      data-testid="entity-logo"
      src={asset.url}
      alt=""
      width={20}
      height={20}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      title={asset.attribution}
      onError={() => setFailedUrl(asset.url)}
      className={`h-5 w-5 shrink-0 rounded-[3px] border border-white/[0.14] bg-white ${asset.kind === 'og_image' ? 'object-cover' : 'object-contain'}`}
    />
  );
}
