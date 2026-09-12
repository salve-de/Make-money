import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export interface BlacklistReason {
  isBlacklisted: boolean;
  reason?: string;
  matchedRule?: string;
}

export interface BlacklistCandidate {
  id?: string;
  name?: string;
  url?: string;
  domain?: string;
}

interface BlacklistSchema {
  domains: { domain: string; reason: string }[];
  urlPatterns: string[];
  entityIdPatterns: string[];
  entities: { id: string; name: string; url: string; reason: string }[];
}

const FALLBACK_BLACKLIST: BlacklistSchema = {
  domains: [
    { domain: 'failory.com', reason: 'まとめブログ・ピッチデッキ記事・失敗談コラムサイト（企業ではない）' },
    { domain: 'example.com', reason: 'ダミー・プレースホルダーURL' },
  ],
  urlPatterns: ['*failory.com*', '*example.com*'],
  entityIdPatterns: ['ent_repository_*'],
  entities: [],
};

let cachedBlacklist: BlacklistSchema | null = null;
let domainReasons: Map<string, string> | null = null;
let idEntries: Map<string, { id: string; name: string; url: string; reason: string }> | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string' && item.trim().length > 0);
}

function parseBlacklist(value: unknown): BlacklistSchema | null {
  if (!isRecord(value)) return null;
  const domains = value.domains;
  const entities = value.entities;
  if (
    !Array.isArray(domains) ||
    !domains.every(
      (entry) =>
        isRecord(entry) &&
        typeof entry.domain === 'string' &&
        entry.domain.trim().length > 0 &&
        typeof entry.reason === 'string' &&
        entry.reason.trim().length > 0,
    ) ||
    !isStringArray(value.urlPatterns) ||
    !isStringArray(value.entityIdPatterns) ||
    !Array.isArray(entities) ||
    !entities.every(
      (entry) =>
        isRecord(entry) &&
        typeof entry.id === 'string' &&
        entry.id.trim().length > 0 &&
        typeof entry.name === 'string' &&
        entry.name.trim().length > 0 &&
        typeof entry.url === 'string' &&
        entry.url.trim().length > 0 &&
        typeof entry.reason === 'string' &&
        entry.reason.trim().length > 0,
    )
  ) {
    return null;
  }

  return {
    domains: domains as BlacklistSchema['domains'],
    urlPatterns: value.urlPatterns as string[],
    entityIdPatterns: value.entityIdPatterns as string[],
    entities: entities as BlacklistSchema['entities'],
  };
}

function configureBlacklist(value: BlacklistSchema) {
  cachedBlacklist = value;
  domainReasons = new Map(value.domains.map((entry) => [entry.domain.trim().toLowerCase().replace(/^\.+|\.+$/g, ''), entry.reason]));
  idEntries = new Map(value.entities.map((entry) => [entry.id, entry]));
}

function loadBlacklist(): BlacklistSchema {
  if (!cachedBlacklist) {
    try {
      const filePath = resolve(process.cwd(), 'data/intelligence-blacklist.json');
      const raw = readFileSync(filePath, 'utf8');
      const parsed = parseBlacklist(JSON.parse(raw));
      configureBlacklist(parsed ?? FALLBACK_BLACKLIST);
    } catch {
      // ファイルが未配置・破損でも、既知のゴミ入口だけは安全側に止める。
      configureBlacklist(FALLBACK_BLACKLIST);
    }
  }
  return cachedBlacklist!;
}

function globMatches(value: string, pattern: string): boolean {
  const escaped = pattern
    .toLowerCase()
    .split('*')
    .map((part) => part.replace(/[\\^$+?.()|[\]{}]/g, '\\$&'))
    .join('.*');
  return new RegExp(`^${escaped}$`, 'i').test(value);
}

function hostMatchesDomain(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

function normalizeUrl(candidateUrl: string): { host: string; target: string } {
  const raw = candidateUrl.trim().toLowerCase();
  if (!raw) return { host: '', target: '' };
  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.toLowerCase().replace(/\.$/, '');
    // Query文字列に含まれる別サイト名で誤遮断しないよう、規則はhost+pathへ適用する。
    return { host, target: `${host}${parsed.pathname.toLowerCase()}` };
  } catch {
    return { host: '', target: raw };
  }
}

function urlPatternMatches(target: string, host: string, pattern: string): boolean {
  // URLらしい規則はhost境界も確認し、別サイトのpathに文字列が含まれるだけでは遮断しない。
  const domainToken = pattern.toLowerCase().match(/(?:[a-z0-9-]+\.)+[a-z]{2,}/)?.[0];
  if (domainToken && host && !hostMatchesDomain(host, domainToken)) return false;
  return globMatches(target, pattern);
}

/**
 * 対象のエンティティ候補がブラックリスト（ゴミ・偽企業）に該当するかを高速判定
 */
export function checkBlacklist(candidate?: BlacklistCandidate | null): BlacklistReason {
  const blacklist = loadBlacklist();

  const id = typeof candidate?.id === 'string' ? candidate.id : '';
  const normalizedUrl = normalizeUrl(typeof candidate?.url === 'string' ? candidate.url : '');
  const domain = typeof candidate?.domain === 'string' ? candidate.domain.toLowerCase().replace(/^\.+|\.+$/g, '') : '';
  const name = typeof candidate?.name === 'string' ? candidate.name.toLowerCase() : '';

  // 1. ID直接一致
  const entry = idEntries?.get(id);
  if (id && entry) {
    return {
      isBlacklisted: true,
      reason: entry.reason || 'BLACKLISTED_ENTITY_ID',
      matchedRule: `id:${id}`
    };
  }

  // 2. 設定されたIDパターン判定（GitHub Star 0リポジトリ等）
  const matchedIdPattern = blacklist.entityIdPatterns.find((pattern) => globMatches(id, pattern));
  if (matchedIdPattern) {
    return {
      isBlacklisted: true,
      reason: 'ZERO_STAR_GITHUB_REPO_CODE_DUMP',
      matchedRule: `pattern:${matchedIdPattern}`
    };
  }

  // 3. ドメイン完全一致（サブドメインも同じ登録ドメインとして扱う）。
  // URL由来のhostも対象にするが、クエリ文字列はhostに含まれない。
  const host = normalizedUrl.host || domain;
  const matchedDomain = [...(domainReasons?.keys() || [])].find((registered) => hostMatchesDomain(host, registered));
  if (matchedDomain) {
    return {
      isBlacklisted: true,
      reason: matchedDomain === 'example.com' ? 'DUMMY_EXAMPLE_COM_URL' : 'FAILORY_SCRAPED_PAGE_NOT_COMPANY',
      matchedRule: `domain:${matchedDomain}`
    };
  }

  // 4. URLパターン判定。設定ファイルの規則を実際に使い、クエリ文字列は対象外にする。
  const matchedUrlPattern = blacklist.urlPatterns.find((pattern) => urlPatternMatches(normalizedUrl.target, normalizedUrl.host, pattern));
  if (matchedUrlPattern) {
    if (normalizedUrl.host === 'example.com' || normalizedUrl.host.endsWith('.example.com')) {
      return {
        isBlacklisted: true,
        reason: 'DUMMY_EXAMPLE_COM_URL',
        matchedRule: `url:${matchedUrlPattern}`
      };
    }
    if (normalizedUrl.host === 'failory.com' || normalizedUrl.host.endsWith('.failory.com')) {
      return {
        isBlacklisted: true,
        reason: 'FAILORY_SCRAPED_PAGE_NOT_COMPANY',
        matchedRule: `url:${matchedUrlPattern}`
      };
    }
    return {
      isBlacklisted: true,
      reason: 'BLACKLISTED_URL_PATTERN',
      matchedRule: `url:${matchedUrlPattern}`
    };
  }

  // 5. 明示的なブログ記事タイトルの社名誤認判定
  const looksLikeArticleTitle =
    (name.startsWith('top ') && name.includes(' pitch decks')) || name.startsWith('the pitch deck');
  if (looksLikeArticleTitle && !normalizedUrl.host && !domain) {
    return {
      isBlacklisted: true,
      reason: 'PITCH_DECK_ARTICLE_TITLE_MISIDENTIFIED_AS_COMPANY',
      matchedRule: `name:${name}`
    };
  }

  return { isBlacklisted: false };
}
