'use client';

import React, { useState } from 'react';
import { useEntityMedia } from '@/platform/hooks/useEntityMedia';
import {
  MEDIA_ICON_MAX_PX,
  MEDIA_THUMBNAIL_MAX_PX,
  isMediaIconKind,
  mediaKindLabel,
  mediaOriginLabel,
  pickGalleryAssets,
  type PublicMediaAsset,
} from '@/shared/media-display';
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
                // Size caps (art. 47-5 minor use): icons 128px, previews and store images 480px on the long side.
                style={{
                  ...(asset.width && asset.height ? { aspectRatio: `${asset.width} / ${asset.height}` } : {}),
                  maxWidth: isMediaIconKind(asset.kind) ? MEDIA_ICON_MAX_PX : MEDIA_THUMBNAIL_MAX_PX,
                  maxHeight: isMediaIconKind(asset.kind) ? MEDIA_ICON_MAX_PX : MEDIA_THUMBNAIL_MAX_PX,
                }}
                className="block h-auto w-full rounded border border-term-line bg-white object-contain"
              />
              <figcaption className="mt-1.5 space-y-0.5 text-[11px] leading-snug text-term-label">
                <span className="block font-medium text-term-fg">
                  {mediaKindLabel(asset.kind)}
                  <span data-testid="media-gallery-origin" className="ml-1.5 font-normal text-term-label">［{mediaOriginLabel(asset.kind)}］</span>
                </span>
                <span data-testid="media-gallery-attribution" className="block break-words">{asset.attribution}</span>
                <a
                  data-testid="media-gallery-source-link"
                  href={asset.sourcePageUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="block break-all text-term-fg underline underline-offset-2"
                >
                  出典ページを開く
                </a>
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </InspectorSectionCard>
  );
}

/** 詳細の先頭に置く1枚（画面写真・og:image など、アイコン以外で最初の物）。 */
export function pickHeroAsset(assets: readonly PublicMediaAsset[]): PublicMediaAsset | null {
  return assets.find((asset) => !isMediaIconKind(asset.kind)) ?? null;
}

/**
 * 概要と数字のすぐ下に出す製品の画像1枚。出典の文と出典ページへのリンクを必ず添える。大きさは長辺 480px まで。
 * 読み込めなければ何も出さない。
 */
export function EntityHeroImageView({ entityName, asset }: { entityName: string; asset: PublicMediaAsset | null }) {
  const [failedId, setFailedId] = useState<string | null>(null);
  if (!asset || failedId === asset.assetId) return null;
  return (
    <figure data-testid="media-hero" className="m-0 px-2.5 pb-3 sm:px-3">
      {/* A vetted official image served by our own route or the public R2 domain; the Next image optimizer is not part of the Workers deploy. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        data-testid="media-hero-image"
        data-kind={asset.kind}
        src={asset.url}
        alt={`${entityName}の${mediaKindLabel(asset.kind)}`}
        width={asset.width ?? undefined}
        height={asset.height ?? undefined}
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailedId(asset.assetId)}
        style={{
          ...(asset.width && asset.height ? { aspectRatio: `${asset.width} / ${asset.height}` } : {}),
          maxWidth: MEDIA_THUMBNAIL_MAX_PX,
          maxHeight: MEDIA_THUMBNAIL_MAX_PX,
        }}
        className="block h-auto w-full rounded border border-term-line bg-white object-contain"
      />
      <figcaption className="mt-1 flex flex-wrap gap-x-2 text-xs leading-snug text-term-label">
        <span data-testid="media-hero-attribution" className="min-w-0 break-words">{asset.attribution}</span>
        <a href={asset.sourcePageUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-term-sub underline underline-offset-2 hover:text-term-fg-strong">
          出典ページを開く
        </a>
      </figcaption>
    </figure>
  );
}

export function EntityHeroImage({ entityId, entityName }: { entityId: string; entityName: string }) {
  const media = useEntityMedia([entityId]);
  return <EntityHeroImageView entityName={entityName} asset={pickHeroAsset(pickGalleryAssets(media[entityId]))} />;
}

/** 残りの画像（先頭に出した1枚を除く）。 */
export function EntityMediaGallery({ entityId, entityName, isHazardMode }: { entityId: string; entityName: string; isHazardMode?: boolean }) {
  const media = useEntityMedia([entityId]);
  const assets = pickGalleryAssets(media[entityId]);
  const hero = pickHeroAsset(assets);
  return <EntityMediaGalleryView entityName={entityName} assets={assets.filter((asset) => asset !== hero)} isHazardMode={isHazardMode} />;
}
