import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { checkBlacklist } from './blacklist';

describe('blacklist gate', () => {
  it('rejects failory scraped blog pages', () => {
    const result = checkBlacklist({
      name: 'Accounting',
      url: 'https://www.failory.com/pitch-deck/accounting'
    });
    expect(result.isBlacklisted).toBe(true);
    expect(result.reason).toBe('FAILORY_SCRAPED_PAGE_NOT_COMPANY');
  });

  it('rejects the registered aggregator host even when the path is new', () => {
    const result = checkBlacklist({ url: 'https://www.failory.com/new-format/article' });
    expect(result.isBlacklisted).toBe(true);
    expect(result.reason).toBe('FAILORY_SCRAPED_PAGE_NOT_COMPANY');
  });

  it('rejects dummy example.com urls', () => {
    const result = checkBlacklist({
      name: 'Adriaan van Rossum',
      url: 'https://example.com'
    });
    expect(result.isBlacklisted).toBe(true);
    expect(result.reason).toBe('DUMMY_EXAMPLE_COM_URL');
  });

  it('rejects github zero-star repository entities', () => {
    const result = checkBlacklist({
      id: 'ent_repository_a4132fd6ec7cc9b49491',
      name: 'Levango7/Corps'
    });
    expect(result.isBlacklisted).toBe(true);
    expect(result.reason).toBe('ZERO_STAR_GITHUB_REPO_CODE_DUMP');
  });

  it('does not treat a blacklist domain in a query string as the candidate host', () => {
    const result = checkBlacklist({
      name: 'Legitimate redirect service',
      url: 'https://legitimate.example.org/landing?next=https%3A%2F%2Fexample.com'
    });
    expect(result.isBlacklisted).toBe(false);
  });

  it('does not treat a blacklist-looking path on another host as the candidate host', () => {
    const result = checkBlacklist({
      name: 'Legitimate service',
      url: 'https://legitimate.example.org/failory.com/interview'
    });
    expect(result.isBlacklisted).toBe(false);
  });

  it('does not broaden the configured repository rule to unrelated ids', () => {
    const result = checkBlacklist({ id: 'ent_my_repo_123', name: 'Legitimate Repository SaaS' });
    expect(result.isBlacklisted).toBe(false);
  });

  it('only applies the article-title fallback when no URL identifies a business', () => {
    expect(checkBlacklist({ name: 'The Pitch Deck', url: 'https://thepitchdeck.example.org' }).isBlacklisted).toBe(false);
    expect(checkBlacklist({ name: 'The Pitch Deck' }).isBlacklisted).toBe(true);
  });

  it('accepts legitimate businesses', () => {
    const result = checkBlacklist({
      id: 'ent_keyence',
      name: 'キーエンス (KEYENCE)',
      url: 'https://www.keyence.co.jp'
    });
    expect(result.isBlacklisted).toBe(false);
  });

  it('accepts real SaaS businesses', () => {
    const result = checkBlacklist({
      id: 'ent_1password_f08ccd0b403a1bf0dcdc',
      name: '1Password',
      url: 'https://1password.com'
    });
    expect(result.isBlacklisted).toBe(false);
  });

  it('keeps the registry entries attributable and structurally valid', () => {
    const registry = JSON.parse(readFileSync(resolve(process.cwd(), 'data/intelligence-blacklist.json'), 'utf8')) as {
      domains: unknown[];
      urlPatterns: unknown[];
      entityIdPatterns: unknown[];
      entities: Array<{ id: string; name: string; url: string; reason: string }>;
    };

    expect(registry.domains.length).toBeGreaterThan(0);
    expect(registry.urlPatterns.length).toBeGreaterThan(0);
    expect(registry.entityIdPatterns.length).toBeGreaterThan(0);
    expect(registry.entities.length).toBeGreaterThan(0);
    expect(new Set(registry.entities.map((entry) => entry.id)).size).toBe(registry.entities.length);
    for (const entry of registry.entities) {
      expect(entry.id.trim()).not.toBe('');
      expect(entry.name.trim()).not.toBe('');
      expect(entry.reason.trim()).not.toBe('');
      const host = new URL(entry.url).hostname.toLowerCase();
      expect(['www.failory.com', 'failory.com', 'example.com']).toContain(host);
    }
  });
});
