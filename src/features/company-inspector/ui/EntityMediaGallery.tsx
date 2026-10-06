'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { UI } from '@/shared/ui-strings';

/**
 * 公式の製品画像（トップ・料金の画面、og:image）を、概要の1文のすぐ下に横一列で出す。多い時は矢印か横の送りで動かす。
 * 出典の文は画像ごとに並べず、同じ出典はまとめて1回だけ下に出す。審査済み（許可・人物でない）の画像だけを出し、
 * 1枚も無い事例では何も出さない。読み込めなかった画像は取り除く。
 */
/** 出典文の末尾の（URL）は出典ページのリンクが担うので、画面では外す */
function attributionName(attribution: string): string {
  return attribution.replace(/\s*[（(]https?:\/\/[^)）]*[)）]\s*$/, '').trim() || attribution;
}

export function EntityMediaGalleryView({
  entityName,
  assets,
}: {
  entityName: string;
  assets: readonly PublicMediaAsset[];
  isHazardMode?: boolean;
}) {
  const [failed, setFailed] = useState<ReadonlySet<string>>(new Set());
  const trackRef = useRef<HTMLUListElement>(null);
  const [edge, setEdge] = useState<{ start: boolean; end: boolean }>({ start: true, end: true });
  const shown = assets.filter((asset) => !failed.has(asset.assetId));
  const measure = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setEdge({ start: el.scrollLeft <= 2, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2 });
  }, []);
  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure, shown.length]);
  if (shown.length === 0) return null;
  const slide = (direction: 1 | -1) => {
    const el = trackRef.current;
    if (el) el.scrollBy({ left: direction * Math.max(160, el.clientWidth * 0.8), behavior: 'smooth' });
  };
  // 種類と出典文が同じ画像は1段落にまとめ、出典ページのリンクだけ並べる
  const captions = [...shown.reduce((groups, asset) => {
    const key = `${asset.kind}|${attributionName(asset.attribution)}`;
    const group = groups.get(key);
    if (!group) groups.set(key, { asset, urls: [asset.sourcePageUrl] });
    else if (!group.urls.includes(asset.sourcePageUrl)) group.urls.push(asset.sourcePageUrl);
    return groups;
  }, new Map<string, { asset: (typeof shown)[number]; urls: string[] }>()).values()];
  const scrollable = !(edge.start && edge.end);
  const arrow = 'absolute top-1/2 z-10 flex h-11 w-9 -translate-y-1/2 items-center justify-center border border-term-line bg-term-panel/90 text-lg text-term-fg-strong hover:bg-term-head disabled:opacity-30 lg:h-9 lg:w-8';
  return (
    <section id="section-media" aria-label={UI.IMAGES_ARIA} className="border-b border-term-line">
      <div className="relative">
        <ul
          ref={trackRef}
          data-testid="media-gallery"
          onScroll={measure}
          tabIndex={0}
          className="flex list-none snap-x snap-mandatory items-center gap-2 overflow-x-auto px-2.5 py-2.5 sm:px-3 [scrollbar-width:thin]"
        >
          {shown.map((asset) => (
            <li key={asset.assetId} className="shrink-0 snap-start">
              {/* A vetted official image served by our own route or the public R2 domain; the Next image optimizer is not part of the Workers deploy. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                data-testid="media-gallery-image"
                data-kind={asset.kind}
                src={asset.url}
                alt={`${entityName}の${mediaKindLabel(asset.kind)}`}
                width={asset.width ?? undefined}
                height={asset.height ?? undefined}
                loading="eager"
                decoding="async"
                referrerPolicy="no-referrer"
                onError={() => setFailed((current) => new Set(current).add(asset.assetId))}
                // 小さな引用の範囲（著作権法47条の5）: アイコンは長辺128px、画面・店の画像は480px まで。高さは枠で揃える。
                style={{
                  ...(asset.width && asset.height ? { aspectRatio: `${asset.width} / ${asset.height}` } : {}),
                  maxWidth: isMediaIconKind(asset.kind) ? MEDIA_ICON_MAX_PX : `min(${MEDIA_THUMBNAIL_MAX_PX}px, calc(100vw - 1.25rem))`,
                  maxHeight: isMediaIconKind(asset.kind) ? MEDIA_ICON_MAX_PX : MEDIA_THUMBNAIL_MAX_PX,
                }}
                className="block h-40 w-auto rounded border border-term-line bg-white object-contain sm:h-44"
              />
            </li>
          ))}
        </ul>
        {scrollable && (
          <>
            <button type="button" aria-label={UI.GALLERY_PREV} disabled={edge.start} onClick={() => slide(-1)} className={`${arrow} left-1`}>‹</button>
            <button type="button" aria-label={UI.GALLERY_NEXT} disabled={edge.end} onClick={() => slide(1)} className={`${arrow} right-1`}>›</button>
          </>
        )}
      </div>
      <div className="space-y-1 px-2.5 pb-2.5 text-[11px] leading-snug text-term-label sm:px-3">
        {captions.map(({ asset, urls }) => (
          <p key={`${asset.kind}|${attributionName(asset.attribution)}`} className="break-words">
            <span className="font-medium text-term-fg">
              {mediaKindLabel(asset.kind)}
              <span data-testid="media-gallery-origin" className="ml-1 font-normal text-term-label">［{mediaOriginLabel(asset.kind)}］</span>
            </span>
            <span data-testid="media-gallery-attribution" className="ml-1.5">{attributionName(asset.attribution)}</span>
            {urls.map((url) => (
              <a
                key={url}
                data-testid="media-gallery-source-link"
                href={url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="ml-1.5 text-term-fg underline underline-offset-2"
              >
                出典ページを開く
              </a>
            ))}
          </p>
        ))}
      </div>
    </section>
  );
}

export function EntityMediaGallery({ entityId, entityName, isHazardMode }: { entityId: string; entityName: string; isHazardMode?: boolean }) {
  const media = useEntityMedia([entityId]);
  return <EntityMediaGalleryView entityName={entityName} assets={pickGalleryAssets(media[entityId])} isHazardMode={isHazardMode} />;
}
