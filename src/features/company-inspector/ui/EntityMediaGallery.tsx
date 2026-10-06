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
import { UI } from '@/shared/ui-strings';

/** 出典の文の末尾にあるURLの括弧は、すぐ下のリンクと重複して長いだけなので表示では省く（全文は title に残す）。 */
function attributionWithoutUrl(text: string): string {
  return text.replace(/\s*[（(]\s*https?:\/\/[^)）]*[)）]\s*$/, '');
}

/**
 * 冒頭に並べる小さな製品画面・アイコン。1枚ずつ、その画像に付いた出典の文と元ページへのリンクを添える。
 * サーバーが審査済みの画像だけを渡す（許可済み・人物でない）。1枚も無ければ枠ごと何も出さない。
 * 読み込めない画像は、出典の文ごと外す。拡大・ギャラリー化はしない（OWNER_INTENT 7章）。
 */
export function EntityMediaGalleryView({
  entityName,
  assets,
}: {
  entityName: string;
  assets: readonly PublicMediaAsset[];
  isHazardMode?: boolean;
}) {
  const [failed, setFailed] = useState<ReadonlySet<string>>(new Set());
  const shown = assets.filter((asset) => !failed.has(asset.assetId));
  if (shown.length === 0) return null;
  return (
    <section id="section-media" data-section="section-media" aria-label={UI.IMAGES_ARIA} className="scroll-mt-8 border-b border-term-line px-2.5 py-2 sm:px-3">
      <ul data-testid="media-gallery" className="m-0 flex list-none flex-wrap items-start gap-x-4 gap-y-3 p-0">
        {shown.map((asset) => {
          const icon = isMediaIconKind(asset.kind);
          return (
            <li key={asset.assetId} className="min-w-0 max-w-[9.5rem]">
              <figure className="m-0">
                {/* サーバーが審査した公式画像（自前のルートか公開 R2）。Workers 配信では Next の画像最適化を使わない。 */}
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
                  // 表示の上限（著作権法47条の5の軽微利用）: アイコン128px、画面写真480px。実際はさらに小さく並べる。
                  style={{
                    ...(asset.width && asset.height ? { aspectRatio: `${asset.width} / ${asset.height}` } : {}),
                    maxWidth: icon ? MEDIA_ICON_MAX_PX : MEDIA_THUMBNAIL_MAX_PX,
                    maxHeight: icon ? MEDIA_ICON_MAX_PX : MEDIA_THUMBNAIL_MAX_PX,
                  }}
                  className={`block w-auto border border-term-line bg-term-fg-strong object-contain ${icon ? 'h-12' : 'h-24 max-w-full'}`}
                />
                <figcaption className="mt-1 space-y-0.5 text-xs leading-snug text-term-label">
                  <span className="block text-term-muted">
                    {mediaKindLabel(asset.kind)}
                    <span data-testid="media-gallery-origin" className="ml-1">［{mediaOriginLabel(asset.kind)}］</span>
                  </span>
                  <span data-testid="media-gallery-attribution" className="block break-words" title={asset.attribution}>{attributionWithoutUrl(asset.attribution)}</span>
                  <a
                    data-testid="media-gallery-source-link"
                    href={asset.sourcePageUrl}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="inline-flex min-h-11 items-center text-term-sub underline underline-offset-2 hover:text-term-fg-strong lg:min-h-6"
                  >
                    出典ページを開く
                  </a>
                </figcaption>
              </figure>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function EntityMediaGallery({ entityId, entityName }: { entityId: string; entityName: string; /** 旧い呼び出し（画面文字の検査）との互換。表示には使わない */ isHazardMode?: boolean }) {
  const media = useEntityMedia([entityId]);
  return <EntityMediaGalleryView entityName={entityName} assets={pickGalleryAssets(media[entityId])} />;
}
