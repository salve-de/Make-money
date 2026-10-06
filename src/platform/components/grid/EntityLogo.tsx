'use client';

import React, { useState } from 'react';
import type { PublicMediaAsset } from '@/shared/media-display';

/**
 * 社名の前に出す小さなマーク: 事業自身のロゴ・ファビコン・og:image のうち、サーバーが審査済みにしたものだけ。
 * 読み込めない・ほぼ空白（透明や真っ白）の画像は出さない。社名（name）を渡された所では、代わりに頭文字の丸を出す。
 * 出典は title に入れ、全文は詳細の大きい画像の所に出す。
 */
/** `row`: 20px（一覧の行）。`header`: 詳細の上のバー（スマホ 20px、PC 24px）。`card`: 詳細の身元カード（48px）。 */
type Variant = 'row' | 'header' | 'card';
const SIZE: Record<Variant, { px: number; box: string; text: string }> = {
  row: { px: 20, box: 'h-5 w-5', text: 'text-xs' },
  header: { px: 24, box: 'h-5 w-5 lg:h-6 lg:w-6', text: 'text-xs' },
  card: { px: 48, box: 'h-12 w-12', text: 'text-xl' },
};

/** 縮小して画素を見て、全部が透明か、全部がほぼ同じ白なら空白とみなす。読み取れない画像（別オリジンで許可なし）は空白扱いにしない。 */
function isBlankImage(img: HTMLImageElement): boolean {
  if (img.naturalWidth <= 2 || img.naturalHeight <= 2) return true;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 8;
    canvas.height = 8;
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    ctx.drawImage(img, 0, 0, 8, 8);
    const { data } = ctx.getImageData(0, 0, 8, 8);
    let visible = 0;
    let nonWhite = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 24) {
        visible += 1;
        if (data[i] < 235 || data[i + 1] < 235 || data[i + 2] < 235) nonWhite += 1;
      }
    }
    return visible === 0 || nonWhite === 0;
  } catch {
    return false;
  }
}

export function EntityLogo({ asset, variant = 'row', name }: { asset: PublicMediaAsset | null | undefined; variant?: Variant; name?: string }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const size = SIZE[variant];
  const initial = name ? [...name.trim()][0]?.toUpperCase() : undefined;
  const fallback = initial ? (
    <span
      data-testid="entity-initial"
      data-initial={initial}
      aria-hidden="true"
      // 頭文字は文字の要素にせず、飾りとして CSS で描く（画面の文字検査の対象にしない）
      className={`${size.box} ${size.text} inline-flex shrink-0 items-center justify-center rounded-full border border-term-line bg-term-head font-semibold text-term-sub after:content-[attr(data-initial)]`}
    />
  ) : null;
  if (!asset || failedUrl === asset.url) return fallback;
  return (
    // 審査済みの公式画像を自前の経路か公開ドメインから配る。Next の画像最適化は Workers の配備に入っていない。
    // eslint-disable-next-line @next/next/no-img-element
    <img
      data-testid={variant === 'header' ? 'entity-header-logo' : variant === 'card' ? 'entity-card-logo' : 'entity-logo'}
      src={asset.url}
      alt=""
      width={size.px}
      height={size.px}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      title={asset.attribution}
      onError={() => setFailedUrl(asset.url)}
      onLoad={(event) => {
        if (isBlankImage(event.currentTarget)) setFailedUrl(asset.url);
      }}
      className={`${size.box} shrink-0 rounded-[3px] border border-white/[0.14] bg-white ${asset.kind === 'og_image' ? 'object-cover' : 'object-contain'}`}
    />
  );
}
