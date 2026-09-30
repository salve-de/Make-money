/**
 * 出典の結び付け。
 * 結び付ける順: 行の中のURL → 行頭の出典名 → eBiz の記事 → ホスト名。
 * 結び付かない行は呼び出し側が unbound に積む（画面には出さない）。
 */
import type { ReaderCase } from '../../src/shared/reader-case';

type SourceKind = ReaderCase['sources'][number]['kind'];

export interface SourceHints {
  url?: string;
  publisher?: string;
  title?: string;
  publishedAt?: string | null;
  checkedAt?: string | null;
  sourceType?: string;
  sourceClass?: string;
  rightsTier?: string;
}

interface RawSource {
  id: string;
  url: string;
  publisher: string;
  title?: string;
  publishedAt?: string;
  checkedAt?: string;
  kind: SourceKind;
}

const ISO = /^\d{4}-\d{2}(-\d{2})?$/;
const isoOrUndef = (v: unknown): string | undefined => (typeof v === 'string' && ISO.test(v) ? v : undefined);

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

export function canonicalUrl(url: string): string {
  try {
    const u = new URL(url.trim());
    const path = u.pathname.replace(/\/+$/, '');
    return `${u.hostname.toLowerCase().replace(/^www\./, '')}${path}${u.search}`;
  } catch {
    return url.trim();
  }
}

/** 文中のURLを取り出す。末尾の句読点・括弧は含めない。 */
export function extractUrls(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(/https?:\/\/[^\s「」（）()\[\]、。,"'<>]+/g)) out.push(m[0].replace(/[.,;:!?]+$/, ''));
  return out;
}

const PUBLISHER_BY_HOST: [RegExp, string][] = [
  [/(^|\.)indiehackers\.com$/, 'Indie Hackers'],
  [/(^|\.)ebizfacts\.com$/, 'eBiz Facts'],
  [/(^|\.)sec\.gov$/, 'SEC EDGAR'],
  [/(^|\.)wikipedia\.org$/, 'Wikipedia'],
  [/(^|\.)github\.com$/, 'GitHub'],
  [/(^|\.)producthunt\.com$/, 'Product Hunt'],
  [/(^|\.)trustmrr\.com$/, 'TrustMRR'],
  [/(^|\.)apps\.apple\.com$/, 'App Store'],
  [/(^|\.)play\.google\.com$/, 'Google Play'],
  [/(^|\.)web\.archive\.org$/, 'Internet Archive'],
  [/(^|\.)edinet-fsa\.go\.jp$/, 'EDINET'],
  [/(^|\.)starterstory\.com$/, 'Starter Story'],
  [/(^|\.)failory\.com$/, 'Failory'],
];

export function publisherFromHost(host: string): string {
  for (const [re, name] of PUBLISHER_BY_HOST) if (re.test(host)) return name;
  return host;
}

const LISTING_HOSTS = /(^|\.)(indiehackers\.com|producthunt\.com|trustmrr\.com|apps\.apple\.com|play\.google\.com|chromewebstore\.google\.com|crunchbase\.com|g2\.com|capterra\.com|acquire\.com|flippa\.com|microns\.io|betalist\.com)$/;
const ARTICLE_HOSTS = /(^|\.)(ebizfacts\.com|starterstory\.com|failory\.com|indiehustle\.co|medium\.com|substack\.com|beehiiv\.com|techcrunch\.com|forbes\.com|bloomberg\.com|reuters\.com|nikkei\.com|sidehustlenation\.com)$/;
const FILING_HOSTS = /(^|\.)(sec\.gov|edinet-fsa\.go\.jp|e-business\.ee|companieshouse\.gov\.uk)$/;

export function detectKind(url: string, officialHost: string, h: SourceHints = {}): SourceKind {
  const host = hostOf(url);
  const type = `${h.sourceType ?? ''}`.toLowerCase();
  if (FILING_HOSTS.test(host) || /filing|10-k|20-f|annual[_ -]?report|registry|edinet|有価証券|決算/.test(type)) return 'FILING';
  if (/wayback|archive/.test(type) || /(^|\.)web\.archive\.org$/.test(host)) return 'ARCHIVE';
  if (officialHost && (host === officialHost || host.endsWith(`.${officialHost}`))) return 'OFFICIAL';
  if (/official|company[_ -]?(blog|press|statement)|press[_ -]?release|home|pricing/.test(type) && !/third|cited/.test(type)) return 'OFFICIAL';
  if (LISTING_HOSTS.test(host) || /listing|platform|marketplace/.test(type)) return 'LISTING';
  if (/founder/.test(type) && !/article|interview/.test(type)) return 'SELF_REPORTED';
  if (ARTICLE_HOSTS.test(host) || /article|news|interview|newsletter|podcast/.test(type)) return 'ARTICLE';
  if (/(^|\.)wikipedia\.org$/.test(host)) return 'THIRD_PARTY';
  if (h.sourceClass === 'PRIMARY') return 'OFFICIAL';
  return 'THIRD_PARTY';
}

/** 事例ごとの出典表。使った出典だけを sources に出す。 */
export class SourceTable {
  private known = new Map<string, SourceHints>();
  private used = new Map<string, RawSource>();
  private order: RawSource[] = [];
  readonly officialHost: string;

  constructor(entityUrl: string | undefined) {
    this.officialHost = entityUrl ? hostOf(entityUrl) : '';
  }

  learn(h: SourceHints): void {
    if (!h.url) return;
    const key = canonicalUrl(h.url);
    const prev = this.known.get(key) ?? {};
    this.known.set(key, {
      url: prev.url ?? h.url,
      publisher: prev.publisher ?? h.publisher,
      title: prev.title ?? h.title,
      publishedAt: prev.publishedAt ?? h.publishedAt,
      checkedAt: prev.checkedAt ?? h.checkedAt,
      sourceType: prev.sourceType ?? h.sourceType,
      sourceClass: prev.sourceClass ?? h.sourceClass,
      rightsTier: prev.rightsTier ?? h.rightsTier,
    });
  }

  /** URLから出典を得る。表に無いURLでも、正しいURLなら使う。 */
  use(url: string | undefined | null): RawSource | undefined {
    if (!url || !/^https?:\/\//i.test(url)) return undefined;
    try {
      new URL(url);
    } catch {
      return undefined;
    }
    const key = canonicalUrl(url);
    const got = this.used.get(key);
    if (got) return got;
    const h = this.known.get(key) ?? { url };
    const host = hostOf(url);
    const src: RawSource = {
      id: `s${this.order.length + 1}`,
      url: h.url ?? url,
      publisher: (h.publisher && h.publisher.trim()) || publisherFromHost(host) || host,
      title: h.title?.trim() || undefined,
      publishedAt: isoOrUndef(h.publishedAt),
      checkedAt: isoOrUndef(h.checkedAt),
      kind: detectKind(url, this.officialHost, h),
    };
    if (!src.publisher) return undefined;
    this.used.set(key, src);
    this.order.push(src);
    return src;
  }

  /** 行頭の出典名（「公式サイト」「Indie Hackers 掲載ページ」「www.x.com」など）から出典を得る。 */
  byLabel(label: string): RawSource | undefined {
    const l = label.trim();
    const candidates = [...this.known.values()].filter((h) => h.url);
    const pick = (f: (h: SourceHints) => boolean): RawSource | undefined => {
      const hit = candidates.find(f);
      return hit ? this.use(hit.url) : undefined;
    };
    if (/^www\.[\w.\-]+/.test(l)) {
      const host = l.match(/^www\.([\w.\-]+)/)![1]!.toLowerCase();
      return pick((h) => hostOf(h.url!) === host);
    }
    if (/Indie ?Hackers|^IH/.test(l)) {
      return pick((h) => /\/product\//.test(h.url!) && hostOf(h.url!) === 'indiehackers.com') ?? pick((h) => hostOf(h.url!) === 'indiehackers.com');
    }
    if (/eBiz/i.test(l)) return pick((h) => hostOf(h.url!) === 'ebizfacts.com');
    if (/Wikipedia/i.test(l)) return pick((h) => /wikipedia\.org$/.test(hostOf(h.url!)));
    if (/^公式|official/i.test(l)) {
      return (
        pick((h) => !!this.officialHost && hostOf(h.url!) === this.officialHost && h.sourceType !== 'pricing') ??
        pick((h) => !!this.officialHost && hostOf(h.url!).endsWith(`.${this.officialHost}`))
      );
    }
    if (/SEC|10-K|20-F/.test(l)) return pick((h) => /sec\.gov$/.test(hostOf(h.url!)));
    return undefined;
  }

  /** 事例で出典がただ1つなら、それを使う。 */
  onlyKnown(): RawSource | undefined {
    const urls = [...this.known.values()].filter((h) => h.url);
    return urls.length === 1 ? this.use(urls[0]!.url) : undefined;
  }

  list(): ReaderCase['sources'] {
    return this.order.map(({ id, url, publisher, title, publishedAt, checkedAt, kind }) => ({
      id,
      url,
      publisher,
      ...(title ? { title } : {}),
      ...(publishedAt ? { publishedAt } : {}),
      ...(checkedAt ? { checkedAt } : {}),
      kind,
    }));
  }
}

/** 出典の種類から、その出典による事実の帰属を決める。 */
export function attributionFor(kind: SourceKind): ReaderCase['facts'][number]['attribution'] {
  switch (kind) {
    case 'OFFICIAL':
      return 'OFFICIAL';
    case 'FILING':
      return 'FILING';
    case 'LISTING':
      return 'LISTING';
    case 'ARTICLE':
      return 'ARTICLE';
    case 'SELF_REPORTED':
      return 'SELF_REPORTED';
    default:
      return 'THIRD_PARTY';
  }
}
