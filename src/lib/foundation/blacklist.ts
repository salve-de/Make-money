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

let cachedBlacklist: BlacklistSchema | null = null;
let domainSet: Set<string> | null = null;
let idSet: Set<string> | null = null;
let nameSet: Set<string> | null = null;

function loadBlacklist(): BlacklistSchema {
  if (!cachedBlacklist) {
    try {
      const filePath = resolve(process.cwd(), 'data/intelligence-blacklist.json');
      const raw = readFileSync(filePath, 'utf8');
      cachedBlacklist = JSON.parse(raw);
      
      domainSet = new Set(cachedBlacklist!.domains.map(d => d.domain.toLowerCase()));
      idSet = new Set(cachedBlacklist!.entities.map(e => e.id));
      nameSet = new Set(cachedBlacklist!.entities.map(e => e.name.toLowerCase()));
    } catch {
      // フォールバック（ファイル未配置時）
      cachedBlacklist = {
        domains: [{ domain: 'failory.com', reason: 'ブログ記事・ピッチデッキまとめ' }, { domain: 'example.com', reason: 'ダミーURL' }],
        urlPatterns: ['*failory.com*', '*example.com*'],
        entityIdPatterns: ['ent_repository_*'],
        entities: []
      };
      domainSet = new Set(['failory.com', 'example.com']);
      idSet = new Set();
      nameSet = new Set();
    }
  }
  return cachedBlacklist!;
}

/**
 * 対象のエンティティ候補がブラックリスト（ゴミ・偽企業）に該当するかを高速判定
 */
export function checkBlacklist(candidate: BlacklistCandidate): BlacklistReason {
  loadBlacklist();

  const id = candidate.id || '';
  const url = (candidate.url || '').toLowerCase();
  const domain = (candidate.domain || '').toLowerCase();
  const name = (candidate.name || '').toLowerCase();

  // 1. ID直接一致
  if (id && idSet?.has(id)) {
    const entry = cachedBlacklist!.entities.find(e => e.id === id);
    return {
      isBlacklisted: true,
      reason: entry?.reason || 'BLACKLISTED_ENTITY_ID',
      matchedRule: `id:${id}`
    };
  }

  // 2. IDパターン判定（GitHub Star 0リポジトリ等）
  if (id.startsWith('ent_repository_') || id.includes('_repo_')) {
    return {
      isBlacklisted: true,
      reason: 'ZERO_STAR_GITHUB_REPO_CODE_DUMP',
      matchedRule: 'pattern:ent_repository_*'
    };
  }

  // 3. ドメイン完全一致
  if (domain && domainSet?.has(domain)) {
    return {
      isBlacklisted: true,
      reason: 'EXCLUDED_AGGREGATOR_DOMAIN',
      matchedRule: `domain:${domain}`
    };
  }

  // 4. URL内の除外ドメイン・キーワード判定
  if (url) {
    if (url.includes('failory.com')) {
      return {
        isBlacklisted: true,
        reason: 'FAILORY_SCRAPED_PAGE_NOT_COMPANY',
        matchedRule: 'url:failory.com'
      };
    }
    if (url.includes('example.com') || url === 'https://example.com' || url === 'http://example.com') {
      return {
        isBlacklisted: true,
        reason: 'DUMMY_EXAMPLE_COM_URL',
        matchedRule: 'url:example.com'
      };
    }
  }

  // 5. 明示的なブログ記事タイトルの社名誤認判定
  if (name.includes('pitch deck') || name.startsWith('top ') && name.includes(' pitch decks') || name.startsWith('the pitch deck')) {
    return {
      isBlacklisted: true,
      reason: 'PITCH_DECK_ARTICLE_TITLE_MISIDENTIFIED_AS_COMPANY',
      matchedRule: `name:${name}`
    };
  }

  return { isBlacklisted: false };
}
