'use client';

import React, { useState } from 'react';
import { useEntityMedia } from '@/platform/hooks/useEntityMedia';
import { mediaKindLabel, pickGalleryAssets, type PublicMediaAsset } from '@/shared/media-display';
import { InspectorSectionCard } from './InspectorSectionCard';

/**
 * Official product images (home / pricing screenshot, og:image) right under the summary, each with the source
 * text that came with it. Only images the server has vetted are ever offered (allowed, not a person); a case
 * without any renders nothing at all. An image that fails to load is dropped together with its caption.
 */
export function EntityMediaGalleryView({
  entityName,
  assets,
  isHazardMode = false,
}: {
  entityName: string;
  assets: readonly PublicMediaAsset[];
  isHazardMode?: boolean;
}) {
  const [failed, setFailed] = useState<ReadonlySet<string>>(new Set());
  const shown = assets.filter((asset) => !failed.has(asset.assetId));
  if (shown.length === 0) return null;
  return (
    <InspectorSectionCard id="section-media" index="01a" categoryEn="Product images" titleJa="製品画像" isHazardMode={isHazardMode}>
      <ul
        data-testid="media-gallery"
        // 1枚だけなら小さな3分割の1枠にせず、読める大きさで出す。
        className={`grid list-none items-start gap-3 py-3 ${shown.length === 1 ? 'max-w-[30rem]' : 'sm:grid-cols-2 xl:grid-cols-3'}`}
      >
        {shown.map((asset) => (
          <li key={asset.assetId} className="min-w-0">
            <figure className="m-0">
              {/* A vetted official image served by our own route or the public R2 domain; the Next image optimizer is not part of the Workers deploy. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                data-testid="media-gallery-image"
                data-kind={asset.kind}
                src={asset.url}
                alt={`${entityName}の${mediaKindLabel(asset.kind)}`}
                width={asset.width ?? undefined}
                height={asset.height ?? undefined}
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                onError={() => setFailed((current) => new Set(current).add(asset.assetId))}
                style={asset.width && asset.height ? { aspectRatio: `${asset.width} / ${asset.height}` } : undefined}
                className="block h-auto w-full rounded border border-white/[0.14] bg-white object-cover"
              />
              <figcaption className="mt-1.5 space-y-0.5 text-[11px] leading-snug text-zinc-400">
                <span className="block font-medium text-zinc-200">{mediaKindLabel(asset.kind)}</span>
                <span data-testid="media-gallery-attribution" className="block break-words">{asset.attribution}</span>
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </InspectorSectionCard>
  );
}

export function EntityMediaGallery({ entityId, entityName, isHazardMode }: { entityId: string; entityName: string; isHazardMode?: boolean }) {
  const media = useEntityMedia([entityId]);
  return <EntityMediaGalleryView entityName={entityName} assets={pickGalleryAssets(media[entityId])} isHazardMode={isHazardMode} />;
}
