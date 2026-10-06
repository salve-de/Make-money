import { describe, expect, it } from 'vitest';
import { contentSecurityPolicy, securityHeaderRules } from './headers';

const production = { production: true, firebaseAuthDomain: 'make-money-salve-prod.firebaseapp.com' };

function directive(csp: string, name: string): string[] {
  const found = csp.split('; ').find((part) => part.startsWith(`${name} `));
  return found ? found.slice(name.length + 1).split(' ') : [];
}

describe('contentSecurityPolicy', () => {
  const csp = contentSecurityPolicy(production);

  it('許可する取得元が、実際に使っているログイン・通信先だけに限られている', () => {
    expect(directive(csp, 'default-src')).toEqual(["'self'"]);
    expect(directive(csp, 'script-src')).toEqual(["'self'", "'unsafe-inline'", 'https://apis.google.com']);
    expect(directive(csp, 'connect-src')).toEqual(expect.arrayContaining([
      "'self'",
      'https://identitytoolkit.googleapis.com',
      'https://securetoken.googleapis.com',
      'https://www.googleapis.com',
      'https://make-money-salve-prod.firebaseapp.com',
    ]));
    expect(directive(csp, 'frame-src')).toEqual(expect.arrayContaining(["'self'", 'https://make-money-salve-prod.firebaseapp.com', 'https://accounts.google.com']));
    expect(directive(csp, 'object-src')).toEqual(["'none'"]);
    expect(directive(csp, 'frame-ancestors')).toEqual(["'none'"]);
    expect(directive(csp, 'base-uri')).toEqual(["'self'"]);
    expect(directive(csp, 'form-action')).toEqual(["'self'"]);
  });

  it('画像は同じサイト・data・https のみで、http の画像は許さない', () => {
    expect(directive(csp, 'img-src')).toEqual(["'self'", 'data:', 'blob:', 'https:']);
  });

  it('本番では eval と ws を許さず、https への自動切り替えを付ける', () => {
    expect(csp).not.toContain('unsafe-eval');
    expect(csp).not.toMatch(/\bwss?:/);
    expect(csp).toContain('upgrade-insecure-requests');
  });

  it('開発では HMR 用の ws: と React 開発用の unsafe-eval だけを足す', () => {
    const dev = contentSecurityPolicy({ production: false });
    expect(directive(dev, 'script-src')).toContain("'unsafe-eval'");
    expect(directive(dev, 'connect-src')).toEqual(expect.arrayContaining(['ws:', 'wss:']));
    expect(dev).not.toContain('upgrade-insecure-requests');
  });

  it('認証ドメインに不正な文字があっても、ポリシーを壊さない', () => {
    const csp = contentSecurityPolicy({ production: true, firebaseAuthDomain: "evil.example; script-src *" });
    expect(csp).not.toContain('evil.example');
    expect(directive(csp, 'script-src')).toEqual(["'self'", "'unsafe-inline'", 'https://apis.google.com']);
  });
});

describe('securityHeaderRules', () => {
  const rules = securityHeaderRules(production);
  const byKey = (headers: { key: string; value: string }[]) => Object.fromEntries(headers.map((h) => [h.key, h.value]));
  const matches = (source: string, path: string) => new RegExp(`^${source.replace(/:path\*/, '.*')}$`).test(path);

  it('通常の画面と API には、クリックジャッキング防止・MIME 固定・HSTS を付ける', () => {
    const base = byKey(rules[0].headers);
    expect(base['X-Frame-Options']).toBe('DENY');
    expect(base['X-Content-Type-Options']).toBe('nosniff');
    expect(base['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(base['Strict-Transport-Security']).toBe('max-age=31536000');
    expect(base['Permissions-Policy']).toContain('camera=()');
  });

  it('Firebase のポップアップログインを壊す Cross-Origin-Opener-Policy は付けない', () => {
    for (const rule of rules) expect(rule.headers.map((h) => h.key)).not.toContain('Cross-Origin-Opener-Policy');
  });

  it('生成アプリのプレビューは、サイト全体の CSP から外し、サンドボックスと自サイト内の埋め込みだけ許す', () => {
    const [, csp, preview] = rules;
    expect(csp.source).toContain('api/build/preview/');
    const policy = byKey(preview.headers);
    expect(policy['Content-Security-Policy']).toContain('sandbox');
    expect(policy['Content-Security-Policy']).not.toContain('allow-same-origin');
    expect(policy['Content-Security-Policy']).toContain("frame-ancestors 'self'");
    expect(policy['X-Frame-Options']).toBe('SAMEORIGIN');
    expect(preview.source).toBe('/api/build/preview/:path*');
    expect(matches(preview.source, '/api/build/preview/abc/index.html')).toBe(true);
  });

  it('自分で CSP を付ける経路（画像配信・配信停止ページ）には、全体の CSP を重ねない', () => {
    const csp = rules[1];
    expect(csp.source).toContain('api/media/file');
    expect(csp.source).toContain('api/notifications/unsubscribe');
    expect(rules[0].source).not.toContain('api/media/file');
  });

  it('開発では HSTS を付けない', () => {
    const dev = byKey(securityHeaderRules({ production: false })[0].headers);
    expect(dev['Strict-Transport-Security']).toBeUndefined();
  });
});
