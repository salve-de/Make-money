import { describe, it, expect } from 'vitest';
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
});
