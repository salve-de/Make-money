import { describe, expect, it } from 'vitest';
import { normalizePublicDomain, resolveMediaSource } from './source';

describe('normalizePublicDomain', () => {
  it('keeps a plain https origin and drops a trailing slash', () => {
    expect(normalizePublicDomain('https://assets.example.com')).toBe('https://assets.example.com');
    expect(normalizePublicDomain(' https://assets.example.com/ ')).toBe('https://assets.example.com');
    expect(normalizePublicDomain('https://pub-abc123.r2.dev')).toBe('https://pub-abc123.r2.dev');
  });

  it('refuses everything else: http, credentials, paths, queries, junk, unset', () => {
    for (const bad of ['http://assets.example.com', 'https://user:pw@assets.example.com', 'https://assets.example.com/media', 'https://assets.example.com/?x=1', 'https://assets.example.com/#x', 'assets.example.com', 'javascript:alert(1)', '', '   ', undefined]) {
      expect(normalizePublicDomain(bad)).toBeNull();
    }
  });
});

describe('resolveMediaSource', () => {
  const cwd = '/work/repo';

  it('reads the local staging directory under next dev and foundation-public otherwise', () => {
    expect(resolveMediaSource({ NODE_ENV: 'development' }, cwd)).toEqual({ kind: 'local_staging', root: '/work/repo/data/media-staging' });
    expect(resolveMediaSource({ NODE_ENV: 'production', CLOUDFLARE_R2_PUBLIC_DOMAIN: 'https://assets.example.com/' }, cwd)).toEqual({ kind: 'foundation_public', publicDomain: 'https://assets.example.com' });
    expect(resolveMediaSource({ NODE_ENV: 'production' }, cwd)).toEqual({ kind: 'foundation_public', publicDomain: null });
    expect(resolveMediaSource({}, cwd)).toEqual({ kind: 'foundation_public', publicDomain: null });
  });

  it('lets MEDIA_SOURCE and MEDIA_STAGING_DIR override (the e2e server runs a production build against local files)', () => {
    expect(resolveMediaSource({ NODE_ENV: 'production', MEDIA_SOURCE: 'local_staging', MEDIA_STAGING_DIR: '/abs/staging' }, cwd)).toEqual({ kind: 'local_staging', root: '/abs/staging' });
    expect(resolveMediaSource({ NODE_ENV: 'development', MEDIA_SOURCE: 'foundation_public' }, cwd)).toEqual({ kind: 'foundation_public', publicDomain: null });
    expect(resolveMediaSource({ NODE_ENV: 'development', MEDIA_SOURCE: 'off' }, cwd)).toEqual({ kind: 'off' });
  });

  it('switches media off for an unknown MEDIA_SOURCE instead of guessing, and never reads local files by default in production', () => {
    expect(resolveMediaSource({ NODE_ENV: 'production', MEDIA_SOURCE: 'local' }, cwd)).toEqual({ kind: 'off' });
    expect(resolveMediaSource({ NODE_ENV: 'production', MEDIA_STAGING_DIR: '/abs/staging' }, cwd).kind).toBe('foundation_public');
  });
});
