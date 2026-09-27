import { describe, expect, it } from 'vitest';
import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server';
import { config } from './proxy';

const nextConfig = {};

describe('preview proxy matcher', () => {
  it('does not intercept Next.js internal hydration and HMR routes', () => {
    for (const url of [
      '/_next/webpack-hmr',
      '/_next/static/chunks/main-app.js',
      '/_next/static/chunks/app/page.js',
    ]) {
      expect(unstable_doesMiddlewareMatch({ config, nextConfig, url })).toBe(false);
    }
  });

  it('keeps ordinary root-relative preview assets and API routes eligible', () => {
    expect(unstable_doesMiddlewareMatch({ config, nextConfig, url: '/assets/app.js' })).toBe(true);
    expect(unstable_doesMiddlewareMatch({ config, nextConfig, url: '/api/generated-action' })).toBe(true);
  });

  it('does not recursively intercept the preview proxy route itself', () => {
    expect(
      unstable_doesMiddlewareMatch({
        config,
        nextConfig,
        url: '/api/build/preview/session-1/assets/app.js',
      }),
    ).toBe(false);
  });
});
