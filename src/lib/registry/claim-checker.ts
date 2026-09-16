import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

export interface RegistryEntry {
  id: string;
  name: string;
  normName?: string;
  ticker?: string;
  domain?: string;
  sector?: string;
  status?: string;
}

export interface ClaimCheckResult {
  exists: boolean;
  status: 'EXISTS' | 'CLAIMED' | 'AVAILABLE';
  reason: string;
  matchType?: string;
  entity?: RegistryEntry;
}

export const KNOWN_ALIASES: Record<string, string> = {
  "basecamp": "37signals, llc（basecampは製品名）",
  "37signals": "37signals, llc（basecampは製品名）",
  "uniqlo": "fast retailing co., ltd. / uniqlo",
  "ユニクロ": "fast retailing co., ltd. / uniqlo",
  "ファーストリテイリング": "fast retailing co., ltd. / uniqlo",
  "facebook": "meta",
  "instagram": "meta",
  "whatsapp": "meta",
  "google": "alphabet",
  "youtube": "alphabet",
  "microacquire": "acquire.com",
  "convertkit": "kit (formerly convertkit)",
  "chatgpt": "openai",
  "anysphere": "cursor (anysphere)",
  "cursor": "cursor (anysphere)",
  "photoai": "photo ai",
  "interiorai": "interior ai",
  "loops": "loops.so",
  "dub": "dub.co",
  "screen studio": "screen studio",
  "cleanmymac": "cleanmymac (macpaw)",
  "macpaw": "cleanmymac (macpaw)",
};

export function normalize(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .trim()
    .replace(/[\s\-_・（）()株式会社有限会社llcinc\.corp]/g, '');
}

export async function checkTargetStatus(query: string): Promise<ClaimCheckResult> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { exists: false, status: 'AVAILABLE', reason: 'クエリが空です。' };
  }

  const qLower = trimmed.toLowerCase();
  const qNorm = normalize(trimmed);
  let qDomain = '';
  try {
    qDomain = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`).hostname.replace(/^www\./, '');
  } catch {}

  const targetNorm = KNOWN_ALIASES[qLower] ? normalize(KNOWN_ALIASES[qLower]) : qNorm;

  // 1. 収集済み台帳 (collected-registry.json)
  const registryPath = path.join(process.cwd(), 'data/collected-registry.json');
  if (existsSync(registryPath)) {
    try {
      const content = await fs.readFile(registryPath, 'utf8');
      const registry: RegistryEntry[] = JSON.parse(content);

      for (const r of registry) {
        const rNorm = r.normName || normalize(r.name);
        if (rNorm === targetNorm || rNorm === qNorm) {
          return {
            exists: true,
            status: 'EXISTS',
            matchType: 'EXACT_NAME',
            reason: `【収集済み】既に中央台帳に登録されています: "${r.name}" (ID: ${r.id})`,
            entity: r,
          };
        }
        if (r.ticker && (r.ticker.toLowerCase() === qLower || r.ticker.toLowerCase() === qNorm)) {
          return {
            exists: true,
            status: 'EXISTS',
            matchType: 'TICKER_MATCH',
            reason: `【収集済み】Tickerが一致します: "${r.ticker}" (${r.name})`,
            entity: r,
          };
        }
        if (qDomain && r.domain && (r.domain.toLowerCase() === qDomain || qDomain.endsWith(`.${r.domain.toLowerCase()}`) || r.domain.toLowerCase().endsWith(`.${qDomain}`))) {
          return {
            exists: true,
            status: 'EXISTS',
            matchType: 'DOMAIN_MATCH',
            reason: `【収集済み】ドメインが一致します: "${r.domain}" (${r.name})`,
            entity: r,
          };
        }
      }
    } catch (err) {
      console.error('[claim-checker] Error reading collected-registry.json:', err);
    }
  }

  // 2. 予約中台帳 (CLAIMED_TARGETS.txt)
  const claimedPath = path.join(process.cwd(), 'data/CLAIMED_TARGETS.txt');
  if (existsSync(claimedPath)) {
    try {
      const claimedContent = await fs.readFile(claimedPath, 'utf8');
      const lines = claimedContent.split('\n');
      for (const line of lines) {
        const lineTrim = line.trim();
        if (!lineTrim || lineTrim.startsWith('#')) continue;
        const cleanLine = lineTrim.split('[CLAIMED')[0].split('(')[0].trim();
        const lineNorm = normalize(cleanLine);
        if (!lineNorm) continue;

        if (lineNorm === targetNorm || lineNorm === qNorm) {
          return {
            exists: true,
            status: 'CLAIMED',
            matchType: 'CLAIM_EXACT',
            reason: `【予約中/他AI調査中】既に台帳に掲載されています: "${lineTrim}"`,
          };
        }

        if (qNorm.length >= 4 && lineNorm.length >= 4) {
          if (lineNorm.includes(qNorm) || qNorm.includes(lineNorm)) {
            const minLen = Math.min(lineNorm.length, qNorm.length);
            const maxLen = Math.max(lineNorm.length, qNorm.length);
            if (minLen / maxLen > 0.6) {
              return {
                exists: true,
                status: 'CLAIMED',
                matchType: 'CLAIM_SIMILAR',
                reason: `【予約中/他AI調査中】類似企業が既に台帳に掲載されています: "${lineTrim}"`,
              };
            }
          }
        }
      }
    } catch (err) {
      console.error('[claim-checker] Error reading CLAIMED_TARGETS.txt:', err);
    }
  }

  return {
    exists: false,
    status: 'AVAILABLE',
    reason: `未収集です（重複なし）。新規収集可能です: "${trimmed}"`,
  };
}

export async function addClaimEntry(target: string, agentId = 'EXTERNAL_AI'): Promise<void> {
  const claimedPath = path.join(process.cwd(), 'data/CLAIMED_TARGETS.txt');
  const entry = `${target.trim()} [CLAIMED:${agentId} @ ${new Date().toISOString().slice(0, 10)}]`;
  await fs.appendFile(claimedPath, `\n${entry}\n`, 'utf8');
}
