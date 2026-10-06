import { SITE_DESCRIPTION, SITE_NAME } from './metadata';
import { absoluteUrl } from './url';

/**
 * サイト全体の構造化データ（WebSite だけ）。
 * 事例ごとの Review / AggregateRating や、価格・評価の記述は事実と限らないので付けない。
 */
export function websiteJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: absoluteUrl('/'),
    description: SITE_DESCRIPTION,
    inLanguage: 'ja',
  };
}

/** `<` を逃がして、文字列の中から script を閉じられないようにする。 */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

/** ルートの layout.tsx の <body> 内に置く。 */
export function SiteJsonLd() {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(websiteJsonLd()) }} />;
}
