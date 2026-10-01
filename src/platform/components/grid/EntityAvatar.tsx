'use client';

import React, { useState } from 'react';
import type { PublicMediaAsset } from '@/shared/media-display';

/**
 * 会社名の前の四角い印。許可済みの公式ロゴがあればそれ、無い・読めない時は頭文字の四角（メールや Slack と同じ慣習）。
 * ロゴが届くまでは頭文字を出し、読み込めたらロゴに差し替える（白い空の四角を見せない）。
 * 行の高さと名前の位置は、ロゴの有無でずれない。飾りなので読み上げない（名前は隣にある）。
 */
export function EntityAvatar({ name, asset, size = 28 }: { name: string; asset: PublicMediaAsset | null | undefined; size?: number }) {
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const initial = Array.from(name.trim())[0]?.toUpperCase() ?? '?';
  const showImage = Boolean(asset && failedUrl !== asset.url);
  const loaded = Boolean(asset && loadedUrl === asset.url);
  return (
    <span aria-hidden="true" style={{ width: size, height: size }} className="relative inline-flex shrink-0">
      {!loaded && (
        <span
          data-testid="entity-initial"
          style={{ fontSize: Math.round(size * 0.46) }}
          className="absolute inset-0 inline-flex select-none items-center justify-center rounded-md border border-term-line bg-term-head font-semibold leading-none text-term-sub"
        >
          {initial}
        </span>
      )}
      {showImage && asset && (
        // A vetted official image served by our own route or the public R2 domain; the Next image optimizer is not part of the Workers deploy.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          data-testid="entity-logo"
          src={asset.url}
          alt=""
          width={size}
          height={size}
          decoding="async"
          referrerPolicy="no-referrer"
          title={asset.attribution}
          onLoad={() => setLoadedUrl(asset.url)}
          onError={() => setFailedUrl(asset.url)}
          className={`absolute inset-0 h-full w-full rounded-md border border-white/[0.14] bg-white ${asset.kind === 'og_image' ? 'object-cover' : 'object-contain p-[2px]'} ${loaded ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
    </span>
  );
}
