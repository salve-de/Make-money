import { describe, expect, it } from 'vitest';
import {
  PRODUCT_SCREEN_RULE,
  buildProductScreenNote,
  judgeProductImage,
  pickAmbiguousScreens,
  pickProductPageLinks,
  pickProductScreens,
  productScreenShape,
  rejudgeStagedProductScreen,
  signalTokens,
  type ProductImageCandidate,
} from './media-product-screen';

function candidate(overrides: Partial<ProductImageCandidate> = {}): ProductImageCandidate {
  return {
    url: 'https://ohdear.app/build/assets/home-hero-dashboard-1a2b3c.png',
    alt: '',
    width: 1600,
    height: 1000,
    renderedWidth: 900,
    className: '',
    context: '',
    zone: 'main',
    ...overrides,
  };
}

describe('signalTokens', () => {
  it('splits file names, camelCase and trailing digits', () => {
    expect(signalTokens('/images/redesign3/product-ill/inbox5.png')).toEqual(expect.arrayContaining(['product', 'ill', 'inbox5', 'inbox', 'png']));
    expect(signalTokens('feature_1.abc.png')).toEqual(expect.arrayContaining(['feature']));
    expect(signalTokens('feature1.png')).toEqual(expect.arrayContaining(['feature']));
    expect(signalTokens('heroDashboardImage')).toEqual(expect.arrayContaining(['hero', 'dashboard']));
  });
});

describe('productScreenShape', () => {
  it('accepts wide screens of 800px or more and phone-shaped tall screens, and nothing else', () => {
    expect(productScreenShape(1600, 1000)).toBe('landscape');
    expect(productScreenShape(800, 500)).toBe('landscape');
    expect(productScreenShape(790, 500)).toBeNull();
    expect(productScreenShape(1200, 1200)).toBeNull();
    expect(productScreenShape(1080, 951)).toBe('landscape');
    expect(productScreenShape(3000, 400)).toBeNull();
    expect(productScreenShape(1170, 2532)).toBe('portrait');
    expect(productScreenShape(900, 1000)).toBeNull();
    expect(productScreenShape(0, 0)).toBeNull();
  });
});

describe('judgeProductImage', () => {
  it('takes the dashboard hero images named in the owner examples', () => {
    expect(judgeProductImage(candidate()).verdict).toBe('screen');
    expect(judgeProductImage(candidate({ url: 'https://featurebase.app/images/redesign3/product-ill/inbox5.png' })).verdict).toBe('screen');
    expect(judgeProductImage(candidate({ url: 'https://zenvoice.example/assets/feature_1.8f3a.png', alt: 'ZenVoice dashboard with unpaid invoices' })).verdict).toBe('screen');
    expect(judgeProductImage(candidate({ url: 'https://example.com/a/img.png', alt: 'Campaign editor with a preview of the email' })).verdict).toBe('screen');
    expect(judgeProductImage(candidate({ url: 'https://example.jp/img/main.png', alt: '管理画面のイメージ' })).verdict).toBe('screen');
  });

  it('rejects promotional art: og images, logos, people, badges, backgrounds', () => {
    for (const url of [
      'https://example.com/og/home-dashboard.png',
      'https://example.com/images/ogp.png',
      'https://example.com/img/customer-logos-dashboard.png',
      'https://example.com/img/seo-banner.png',
      'https://example.com/img/team-people.jpg',
      'https://example.com/img/testimonial-dashboard.png',
      'https://example.com/img/g2-badge.png',
      'https://example.com/img/hero-bg-dashboard.png',
    ]) {
      expect(judgeProductImage(candidate({ url })).verdict, url).toBe('promo');
    }
    expect(judgeProductImage(candidate({ alt: 'Company logo' })).verdict).toBe('promo');
    expect(judgeProductImage(candidate({ alt: 'Trusted by teams', url: 'https://example.com/a/trusted-dashboard.png' })).verdict).toBe('promo');
    expect(judgeProductImage(candidate({ url: 'https://example.com/hero-dashboard.svg' })).verdict).toBe('promo');
    expect(judgeProductImage(candidate({ className: 'avatar rounded' })).verdict).toBe('promo');
  });

  it('does not let utility classes such as bg-white count as a promotional word', () => {
    expect(judgeProductImage(candidate({ className: 'w-full bg-white object-cover rounded-xl' })).verdict).toBe('screen');
  });

  it('rejects images that are not in the body of the page or are too small / badly shaped', () => {
    expect(judgeProductImage(candidate({ zone: 'footer' })).verdict).toBe('promo');
    expect(judgeProductImage(candidate({ zone: 'header' })).verdict).toBe('promo');
    expect(judgeProductImage(candidate({ zone: 'nav' })).verdict).toBe('promo');
    expect(judgeProductImage(candidate({ width: 700, height: 440 })).verdict).toBe('promo');
    expect(judgeProductImage(candidate({ width: 1000, height: 1000 })).verdict).toBe('promo');
    expect(judgeProductImage(candidate({ renderedWidth: 120 })).verdict).toBe('promo');
  });

  it('leaves a well-shaped image with no evidence as ambiguous (not collected), and a weak word alone is not enough', () => {
    expect(judgeProductImage(candidate({ url: 'https://example.com/img/a8f3c2.jpg' })).verdict).toBe('ambiguous');
    expect(judgeProductImage(candidate({ url: 'https://example.com/img/hero.jpg' })).verdict).toBe('ambiguous');
    expect(judgeProductImage(candidate({ url: 'https://example.com/img/hero.jpg', alt: 'Team collaborating in the office' })).verdict).toBe('ambiguous');
    // words that sit next to real screens but also next to stock art are not decisive either
    for (const url of ['https://example.com/files/Kratom-Shots-product.jpg', 'https://example.com/features-section.webp', 'https://example.com/hero/app-art.webp', 'https://example.com/img/screen-protector.jpg', 'https://example.com/img/admin-panel-mockup.jpg']) {
      expect(judgeProductImage(candidate({ url })).verdict, url).toBe('ambiguous');
    }
  });

  it('does not take the host name as evidence (app.example.com)', () => {
    expect(judgeProductImage(candidate({ url: 'https://app.logo-cdn.example/img/a8f3c2.jpg' })).verdict).toBe('ambiguous');
  });

  it('treats the surrounding heading as support only', () => {
    expect(judgeProductImage(candidate({ url: 'https://example.com/img/a8f3c2.jpg', context: 'Features' })).verdict).toBe('ambiguous');
    // A Japanese heading above the image is not evidence from the image itself.
    expect(judgeProductImage(candidate({ url: 'https://example.com/img/a8f3c2.jpg', context: '操作画面' })).verdict).toBe('ambiguous');
    expect(judgeProductImage(candidate({ url: 'https://example.com/img/a8f3c2.jpg', alt: '管理画面' })).verdict).toBe('screen');
  });
});

describe('pickProductScreens', () => {
  it('keeps only screens, best evidence first, no duplicate URLs, at most the limit', () => {
    const strong = candidate({ url: 'https://example.com/a/screenshot-dashboard.png', alt: 'Dashboard screenshot' });
    const second = candidate({ url: 'https://example.com/a/inbox-view.png' });
    const picked = pickProductScreens([candidate({ url: 'https://example.com/a/feature-1.png' }), second, candidate({ url: 'https://example.com/a/logo.png' }), strong, strong, candidate({ url: 'https://example.com/a/zzz.png' })], 5);
    expect(picked.map((item) => item.candidate.url)).toEqual([strong.url, second.url]);
    expect(pickProductScreens([strong, second], 1)).toHaveLength(1);
    // the unclear ones, largest first, are only for a person to look at
    const big = candidate({ url: 'https://example.com/a/zzz.png', width: 2400, height: 1400 });
    const small = candidate({ url: 'https://example.com/a/feature-1.png', width: 1000, height: 600 });
    expect(pickAmbiguousScreens([small, strong, big], 5).map((item) => item.candidate.url)).toEqual([big.url, small.url]);
  });
});

describe('ledger note round trip', () => {
  it('lets the automatic review reproduce the verdict from the stored record', () => {
    const c = candidate({ url: 'https://example.com/a/img1.png', alt: 'ZenVoice dashboard "main" view', className: 'rounded', context: 'Features' });
    const verdict = judgeProductImage(c);
    expect(verdict.verdict).toBe('screen');
    const notes = buildProductScreenNote(c, verdict);
    expect(notes).toContain(PRODUCT_SCREEN_RULE);
    expect(rejudgeStagedProductScreen({ assetUrl: c.url, width: c.width, height: c.height, notes })?.verdict).toBe('screen');
    expect(rejudgeStagedProductScreen({ assetUrl: c.url, width: c.width, height: c.height, notes: 'no marker' })).toBeNull();
    expect(rejudgeStagedProductScreen({ assetUrl: null, width: c.width, height: c.height, notes })).toBeNull();
    // evidence that disappeared (different file size) is judged again, not trusted
    expect(rejudgeStagedProductScreen({ assetUrl: c.url, width: 400, height: 300, notes })?.verdict).toBe('promo');
  });
});

describe('pickProductPageLinks', () => {
  const home = new URL('https://www.example.com/');
  const link = (href: string, text: string, inNav = true) => ({ href, text, inNav });

  it('picks same-site feature, how-it-works and docs pages, nav first, at most three, never the current page', () => {
    const picked = pickProductPageLinks(
      [
        link('https://www.example.com/pricing', 'Pricing'),
        link('https://www.example.com/blog/launch', 'Features'),
        link('https://www.example.com/features', 'Features'),
        link('https://www.example.com/how-it-works', 'How it works'),
        link('https://docs.example.com/', 'Docs'),
        link('https://www.example.com/product', 'Product', false),
        link('https://www.example.com/about', 'About'),
        link('https://other.example.net/features', 'Features'),
        link('https://www.example.com/login', 'Log in'),
        link('https://www.example.com/', 'Home'),
        link('https://www.example.com/features#top', 'Features'),
      ],
      home,
      home,
    );
    expect(picked.map((url) => url.href)).toEqual([
      'https://www.example.com/features',
      'https://www.example.com/how-it-works',
      'https://www.example.com/product',
    ]);
    // docs on a subdomain of the official site are eligible too
    expect(pickProductPageLinks([link('https://docs.example.com/', 'Docs')], home, home).map((url) => url.href)).toEqual(['https://docs.example.com/']);
  });

  it('understands Japanese link texts and skips files and deep pages', () => {
    const picked = pickProductPageLinks(
      [link('https://www.example.com/function/', '機能'), link('https://www.example.com/guide.pdf', 'ガイド'), link('https://www.example.com/a/b/c/features', 'Features'), link('https://www.example.com/service', 'サービス')],
      home,
      home,
    );
    expect(picked.map((url) => url.pathname)).toEqual(['/function/', '/service']);
  });
});
