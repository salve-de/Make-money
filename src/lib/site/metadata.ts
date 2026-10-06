import type { Metadata } from 'next';
import { absoluteUrl } from './url';

export const SITE_NAME = 'Make Money';
export const SITE_DESCRIPTION = '事業の収益構造や登録情報を、出典・時点・確認状況とあわせて閲覧できるデータベース。';
/** 共通のOG画像（src/app/opengraph-image.tsx が返す）。 */
export const OG_IMAGE_PATH = '/opengraph-image';
export const OG_IMAGE_ALT = 'Make Money 事業事例データベース';

export interface PageMetadataInput {
  /** 画面のタイトル（サイト名まで含めた完全な文字列）。 */
  title: string;
  description: string;
  /** 正規のパス（クエリなし、/ で始める）。nested ルートに継承されるので、子を持つ階層では渡さない。 */
  path?: string;
}

function shareImage() {
  return { url: absoluteUrl(OG_IMAGE_PATH), width: 1200, height: 630, alt: OG_IMAGE_ALT };
}

/** 検索に出してよい公開ページの共通メタデータ（タイトル・説明・canonical・OG・Twitterカード）。 */
export function pageMetadata({ title, description, path }: PageMetadataInput): Metadata {
  const url = path === undefined ? undefined : absoluteUrl(path);
  return {
    title,
    description,
    ...(url ? { alternates: { canonical: url } } : {}),
    openGraph: {
      type: 'website',
      locale: 'ja_JP',
      siteName: SITE_NAME,
      title,
      description,
      ...(url ? { url } : {}),
      images: [shareImage()],
    },
    twitter: { card: 'summary_large_image', title, description, images: [absoluteUrl(OG_IMAGE_PATH)] },
  };
}

/** 検索に出さないページ（ログイン・個人データ・作業中の画面）。共有用の情報も付けない。 */
export function noIndexMetadata(title: string): Metadata {
  return { title, robots: { index: false, follow: false } };
}

const DESCRIPTION_LIMIT = 120;

function clip(text: string, limit: number): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length <= limit ? flat : `${flat.slice(0, limit - 1)}…`;
}

/**
 * 事例ごとのメタデータ。公開目録にある事例（読み取り側で確認済みの名前と一行説明）だけを渡す。
 * null（目録に無い・読めない）の時は名前も出さず、検索にも出さない。
 * 評価・価格・点数などの構造化データは付けない。画像は第三者の画像を使わず、共通のOG画像のままにする。
 */
export function entityMetadata(entity: { id: string; name: string; tagline: string } | null): Metadata {
  if (!entity) return noIndexMetadata('事例が見つかりません | Make Money');
  const title = `${entity.name} | 事例 | ${SITE_NAME}`;
  const description = entity.tagline.trim() ? clip(entity.tagline, DESCRIPTION_LIMIT) : SITE_DESCRIPTION;
  return pageMetadata({ title, description, path: `/?entity=${encodeURIComponent(entity.id)}` });
}
