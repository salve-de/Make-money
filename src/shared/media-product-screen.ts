import { isSameSite } from './media-fetch-policy';

/**
 * Which images on an official site are "the product's real screen" (kind screenshot_product) and which are
 * promotional art (logos, people, badges, decorative banners). Pure functions only, so the fetcher
 * (scripts/media/fetch-official-assets.ts) and the automatic review (src/lib/media/auto-review.ts) apply the same rule.
 *
 * Owner decision 2026-10-02: the picture that matters is "what you see when you actually use the product".
 * Rule name: product-screen-rule:v1. Operating procedure: docs/MEDIA_ASSETS_AND_PROVENANCE.md (chapter 2.2)
 */

export const PRODUCT_SCREEN_RULE = 'product-screen-rule:v1';

/** Where in the page the image sits. Only the page body counts as product evidence. */
export type ProductImageZone = 'main' | 'header' | 'nav' | 'footer';

export interface ProductImageCandidate {
  /** Absolute http(s) URL the browser loaded (srcset already resolved). */
  url: string;
  alt: string;
  /** Natural size of the file as loaded by the browser. */
  width: number;
  height: number;
  /** Size on the page in CSS pixels (0 when unknown). */
  renderedWidth: number;
  /** class attribute of the img and its close ancestors. */
  className: string;
  /** Nearest heading / caption text around the image. */
  context: string;
  zone: ProductImageZone;
}

export type ProductScreenVerdict = {
  /** screen: collect it. ambiguous: no evidence either way, do not collect. promo: promotional art or unusable. */
  verdict: 'screen' | 'ambiguous' | 'promo';
  score: number;
  reasons: string[];
};

/** Words that mark promotional art. Matched on whole tokens of the path, alt text and class names. */
const PROMO_TOKENS = [
  'og', 'ogp', 'twitter', 'poster', 'banner', 'banners', 'seo', 'social', 'share', 'sharing', 'logo', 'logos', 'logotype', 'wordmark',
  'people', 'person', 'testimonial', 'testimonials', 'badge', 'badges', 'avatar', 'avatars', 'award', 'awards', 'rating', 'ratings',
  'star', 'stars', 'icon', 'icons', 'sprite', 'favicon', 'flag', 'emoji', 'background', 'bg', 'pattern', 'texture', 'gradient', 'cta',
  'headshot', 'portrait', 'founder', 'ceo', 'footer', 'qr', 'spinner', 'loader', 'placeholder', 'pixel', 'tracking', 'partner',
  'partners', 'client', 'clients', 'trusted', 'g2', 'capterra', 'trustpilot', 'producthunt',
];
/** class attributes are utility-class soup (bg-white, w-full): only unmistakable names count. */
const CLASS_PROMO_TOKENS = ['logo', 'logos', 'avatar', 'avatars', 'badge', 'badges', 'icon', 'icons', 'testimonial', 'testimonials', 'partner', 'partners', 'client', 'clients', 'person', 'people'];

/** Words that mark an actual screen of the product. Strong words are enough alone; weak words only count together with a good shape. */
const STRONG_TOKENS = ['dashboard', 'screenshot', 'screenshots', 'screencap', 'inbox', 'editor', 'interface', 'workspace', 'console'];
/**
 * Words that often appear next to a real screen but also next to stock art, photos and blog heroes (product shots of goods,
 * "feature" illustrations, phone mock-ups of artwork, "screen protector"). They only make an image "ambiguous": a person looks.
 */
const WEAK_TOKENS = [
  'screen', 'screens', 'admin', 'panel', 'builder', 'tracker', 'monitor', 'report', 'reports', 'analytics', 'invoice', 'composer', 'timeline',
  'kanban', 'demo', 'mockup', 'mock', 'product', 'products', 'feature', 'features', 'app', 'ui', 'ux', 'hero', 'thumbs', 'thumb', 'thumbnail',
  'preview', 'board', 'calendar', 'view', 'main', 'overview', 'tour', 'how',
];
/** Japanese words that cannot be split into tokens. */
const JAPANESE_SIGNALS = /ダッシュボード|管理画面|画面|スクリーンショット|操作|エディタ|イメージ画面|プレビュー|レポート画面/;

const PROMO_SET = new Set(PROMO_TOKENS);
const CLASS_PROMO_SET = new Set(CLASS_PROMO_TOKENS);
const STRONG_SET = new Set(STRONG_TOKENS);
const WEAK_SET = new Set(WEAK_TOKENS);

/** Lower-cased alphanumeric tokens: "hero-dashboard_v2.png" -> hero, dashboard, v2, png. camelCase is split too. */
export function signalTokens(text: string): string[] {
  return text
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .flatMap((token) => {
      // feature1, feature_1 -> feature ; ui2 -> ui. Digits stuck on a word do not hide it.
      const stripped = token.replace(/\d+$/, '');
      return stripped && stripped !== token ? [token, stripped] : [token];
    });
}

function pathAndQuery(url: string): string {
  try {
    const parsed = new URL(url);
    return decodeURIComponent(`${parsed.pathname}${parsed.search}`);
  } catch {
    return '';
  }
}

const hasExtension = (url: string, extensions: readonly string[]): boolean => {
  const path = pathAndQuery(url).toLowerCase().split('?')[0];
  return extensions.some((extension) => path.endsWith(`.${extension}`));
};

/**
 * Shape check. Landscape screens are at least 800px wide; phone screens are tall with a device ratio.
 * Squares, strips and very long pages are not treated as screens.
 */
export function productScreenShape(width: number, height: number): 'landscape' | 'portrait' | null {
  if (!(width > 0) || !(height > 0)) return null;
  const ratio = width / height;
  if (width >= 800 && ratio >= 1.05 && ratio <= 2.6) return 'landscape';
  if (height >= 800 && width >= 300 && ratio >= 1 / 2.4 && ratio <= 1 / 1.6) return 'portrait';
  return null;
}

export function judgeProductImage(candidate: ProductImageCandidate): ProductScreenVerdict {
  const reasons: string[] = [];
  const promo = (reason: string): ProductScreenVerdict => ({ verdict: 'promo', score: 0, reasons: [...reasons, reason] });

  if (hasExtension(candidate.url, ['svg', 'ico'])) return promo('svg_or_ico');
  if (candidate.zone !== 'main') return promo(`zone_${candidate.zone}`);

  const path = pathAndQuery(candidate.url);
  const pathTokens = signalTokens(path);
  const altTokens = signalTokens(candidate.alt);
  const classTokens = signalTokens(candidate.className);
  const promoHit = [...pathTokens, ...altTokens].find((token) => PROMO_SET.has(token)) ?? classTokens.find((token) => CLASS_PROMO_SET.has(token));
  if (promoHit) return promo(`promo_word:${promoHit}`);

  const shape = productScreenShape(candidate.width, candidate.height);
  if (!shape) return promo(`shape:${candidate.width}x${candidate.height}`);
  if (candidate.renderedWidth > 0 && candidate.renderedWidth < 240) return promo(`rendered_small:${Math.round(candidate.renderedWidth)}`);

  // The surrounding heading is only supporting evidence ("Features" above a stock illustration proves nothing).
  const ownTexts = [path, candidate.alt, candidate.className];
  const ownTokens = ownTexts.flatMap(signalTokens);
  const contextTokens = signalTokens(candidate.context);
  const japanese = ownTexts.some((text) => JAPANESE_SIGNALS.test(text)) || JAPANESE_SIGNALS.test(candidate.context);
  const strong = [...new Set(ownTokens.filter((token) => STRONG_SET.has(token)))];
  const weak = [...new Set([...ownTokens, ...contextTokens].filter((token) => WEAK_SET.has(token) || (STRONG_SET.has(token) && !strong.includes(token))))];
  if (strong.length > 0 || japanese) reasons.push(`signal:${[...strong, ...(japanese ? ['ja'] : [])].join('+')}`);
  else if (weak.length > 0) reasons.push(`weak:${weak.join('+')}`);

  // Without a decisive word (dashboard, screenshot, inbox, editor, interface, workspace, console, 画面 ...) nobody can tell from the text:
  // the image is "ambiguous" and is only collected for a person to look at.
  if (strong.length === 0 && !japanese) return { verdict: 'ambiguous', score: weak.length > 0 ? 2 : 1, reasons: [`shape:${shape}`, ...(weak.length > 0 ? reasons : ['no_signal'])] };
  const score = Math.min(strong.length, 3) * 3 + (japanese ? 3 : 0) + Math.min(weak.length, 2) + (candidate.width >= 1200 ? 1 : 0) + (candidate.alt.trim() ? 1 : 0);
  return { verdict: 'screen', score, reasons: [`shape:${shape}`, ...reasons] };
}

/** Best first. Equal scores keep the page order the caller passed in. */
export function pickProductScreens(candidates: readonly ProductImageCandidate[], limit: number): { candidate: ProductImageCandidate; verdict: ProductScreenVerdict }[] {
  const seen = new Set<string>();
  const screens: { candidate: ProductImageCandidate; verdict: ProductScreenVerdict; index: number }[] = [];
  candidates.forEach((candidate, index) => {
    if (seen.has(candidate.url)) return;
    seen.add(candidate.url);
    const verdict = judgeProductImage(candidate);
    if (verdict.verdict === 'screen') screens.push({ candidate, verdict, index });
  });
  return screens
    .sort((a, b) => b.verdict.score - a.verdict.score || a.index - b.index)
    .slice(0, limit)
    .map(({ candidate, verdict }) => ({ candidate, verdict }));
}

/**
 * Well-shaped images with no evidence either way, largest first. They are never collected by default; the fetcher stages them
 * (verdict ambiguous, so the automatic review keeps them held) only when a person is going to look at them.
 */
export function pickAmbiguousScreens(candidates: readonly ProductImageCandidate[], limit: number): { candidate: ProductImageCandidate; verdict: ProductScreenVerdict }[] {
  const seen = new Set<string>();
  const found: { candidate: ProductImageCandidate; verdict: ProductScreenVerdict }[] = [];
  for (const candidate of candidates) {
    if (seen.has(candidate.url)) continue;
    seen.add(candidate.url);
    const verdict = judgeProductImage(candidate);
    if (verdict.verdict === 'ambiguous') found.push({ candidate, verdict });
  }
  return found.sort((a, b) => b.candidate.width * b.candidate.height - a.candidate.width * a.candidate.height).slice(0, limit);
}

/** One line of the ledger note: the rule name, the verdict and the evidence, so the automatic review can re-judge the same input. */
export function buildProductScreenNote(candidate: ProductImageCandidate, verdict: ProductScreenVerdict): string {
  const clip = (text: string, max: number) => text.replace(/\s+/g, ' ').trim().slice(0, max);
  return (
    `実際の製品画面の候補 [${PRODUCT_SCREEN_RULE}] 判定=${verdict.verdict} 根拠=${verdict.reasons.join(',')} ` +
    `位置=${candidate.zone} alt=${JSON.stringify(clip(candidate.alt, 120))} class=${JSON.stringify(clip(candidate.className, 120))} context=${JSON.stringify(clip(candidate.context, 120))}`
  );
}

function readQuoted(note: string, key: string): string {
  const match = new RegExp(`${key}=("(?:[^"\\\\]|\\\\.)*")`).exec(note);
  if (!match) return '';
  try {
    const value: unknown = JSON.parse(match[1]);
    return typeof value === 'string' ? value : '';
  } catch {
    return '';
  }
}

/**
 * Re-judge a staged screenshot_product from its ledger record. Returns null when the note does not carry the rule marker
 * (a record we did not build), so the caller leaves it held.
 */
export function rejudgeStagedProductScreen(record: { assetUrl: string | null; width: number | null; height: number | null; notes: string }): ProductScreenVerdict | null {
  if (!record.assetUrl || !record.width || !record.height || !record.notes.includes(`[${PRODUCT_SCREEN_RULE}]`)) return null;
  const zone = /位置=(main|header|nav|footer)/.exec(record.notes)?.[1] as ProductImageZone | undefined;
  return judgeProductImage({
    url: record.assetUrl,
    alt: readQuoted(record.notes, 'alt'),
    width: record.width,
    height: record.height,
    renderedWidth: 0,
    className: readQuoted(record.notes, 'class'),
    context: readQuoted(record.notes, 'context'),
    zone: zone ?? 'footer',
  });
}

// ---------------------------------------------------------------------------
// Which pages of the official site to read (home plus a few linked pages)
// ---------------------------------------------------------------------------

export interface PageLink {
  href: string;
  text: string;
  inNav: boolean;
}

const PRODUCT_PAGE_TEXT =
  /^(features?|product|products|platform|how it works|how-it-works|tour|take a tour|solutions?|use cases?|capabilities|overview|functionality|docs|documentation|guide|getting started|機能|機能紹介|使い方|サービス|製品|プロダクト|ドキュメント|ご利用の流れ|特長|特徴|できること)$/i;
const PRODUCT_PAGE_PATH = /^\/(features?|product|products|platform|how-it-works|tour|solutions?|functionality|functions?|services?|docs|documentation|guide|capabilities|overview|usage|howto)(\/[^/]+)?\/?$/i;
const NOT_PRODUCT_PAGE =
  /\/(blog|news|press|careers?|jobs?|login|log-in|signin|sign-in|signup|sign-up|register|pricing|plans?|privacy|terms|legal|contact|about|cart|checkout|account|support|community|forum|changelog|release-notes|status|cookie|tokushoho|company)(\/|$)|\.(pdf|zip|png|jpe?g|gif|svg|webp|mp4|csv)$/i;

/** Up to `max` same-site pages that explain the product (features, how it works, docs), best first. Never the page we are on. */
export function pickProductPageLinks(links: readonly PageLink[], home: URL, current: URL, max = 3): URL[] {
  const stripped = (url: URL) => `${url.origin}${url.pathname.replace(/\/+$/, '')}`;
  const scored: { url: URL; score: number; index: number }[] = [];
  links.forEach((link, index) => {
    let url: URL;
    try {
      url = new URL(link.href);
    } catch {
      return;
    }
    if ((url.protocol !== 'https:' && url.protocol !== 'http:') || !isSameSite(url, home)) return;
    if (stripped(url) === stripped(current) || stripped(url) === stripped(home)) return;
    if (NOT_PRODUCT_PAGE.test(url.pathname) || url.pathname.split('/').filter(Boolean).length > 2) return;
    const text = link.text.replace(/\s+/g, ' ').trim();
    const byText = text.length <= 40 && PRODUCT_PAGE_TEXT.test(text);
    const byPath = PRODUCT_PAGE_PATH.test(url.pathname);
    if (!byText && !byPath) return;
    scored.push({ url, score: (byText ? 2 : 0) + (byPath ? 2 : 0) + (link.inNav ? 1 : 0), index });
  });
  const picked: URL[] = [];
  const seen = new Set<string>();
  for (const { url } of scored.sort((a, b) => b.score - a.score || a.index - b.index)) {
    const key = stripped(url);
    if (seen.has(key)) continue;
    seen.add(key);
    url.hash = '';
    picked.push(url);
    if (picked.length >= max) break;
  }
  return picked;
}
