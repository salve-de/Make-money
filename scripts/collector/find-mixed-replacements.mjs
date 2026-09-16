import fs from 'node:fs';

const SOURCE = fs.readFileSync('scripts/collector/collect-indiehackers-1000.mjs', 'utf8');
const APP = SOURCE.match(/const APP = '([^']+)'/)?.[1];
const KEY = SOURCE.match(/const KEY = '([^']+)'/)?.[1];
const ENDPOINT = `https://${APP}-dsn.algolia.net/1/indexes/products/query`;
const OUTPUT = 'data/incoming/batch_indie_hackers_replacement_candidates_20260916.json';
const norm = (v) => String(v ?? '').normalize('NFKC').toLowerCase().replace(/\[[^\]]*\]/g, '').replace(/\b(inc|llc|corp|corporation|co|ltd|plc|gmbh|holdings|company|group|app|ai|io|so|dev|hq|software|technology|technologies|limited)\b/g, '').replace(/[\s._'’`"()\[\]{}:+,&/\\-]+/g, '');
const domain = (v) => { try { return new URL(v).hostname.toLowerCase().replace(/^www\./, ''); } catch { return ''; } };
const tokens = (v) => String(v ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(/\s+/).filter((x) => x.length >= 4 && !new Set('the app ai free pro online by for and with from to a an your my io com inc ltd software tool website product project'.split(' ')).has(x));
const forbidden = /(iptv|paypal\s*account|buy\s*(old\s*)?(account|gmail)|account(s)?\s*(market|for\s*sale)|ransomware|crypto|bitcoin|binance|daily\s*profit|investment\s*earn|casino|gambl|escort|porn|xxx|adult|sportsbook|betting|guest\s*post|followers|likes|instagram\s*service|facebook\.com|tiktok\s*views|youtube\s*views|nft\s*mint|forex\s*signal|deepfake|link\s*building|backlink|seo\s*agency|press\s*agency|marketing\s*agency|web\s*development\s*company|smm|airbnb\s*clone\s*script|psychedelic|shroom)/i;
const social = /(facebook\.com|twitter\.com|x\.com|linkedin\.com|instagram\.com|t\.me|wa\.me)/i;

const claims = new Set(fs.readFileSync('data/CLAIMED_TARGETS.txt', 'utf8').split(/\r?\n/).map((x) => norm(x.split('[CLAIMED')[0])).filter(Boolean));
const current = JSON.parse(fs.readFileSync('data/incoming/batch_indie_hackers_mixed_1000_20260916.json', 'utf8'));
const central = JSON.parse(fs.readFileSync('data/entities-index.json', 'utf8'));
const usedNames = new Set([...current, ...central].map((x) => norm(x.name)));
const usedDomains = new Set([...current, ...central].map((x) => domain(x.url)).filter(Boolean));

async function pool() {
  const out = new Map();
  for (const tag of ['founders-solo', 'employees-under-10', 'employees-10-plus', 'funding-bootstrapped', 'funding-self', 'commitment-full-time']) {
    for (let page = 0; page < 3; page += 1) {
      const params = new URLSearchParams({ hitsPerPage: '1000', page: String(page), query: '', numericFilters: 'revenue>=1500,revenue<=100000', tagFilters: tag });
      const response = await fetch(ENDPOINT, { method: 'POST', headers: { 'X-Algolia-Application-Id': APP, 'X-Algolia-API-Key': KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ params: params.toString() }) });
      if (!response.ok) throw new Error(`Algolia ${response.status}`);
      const json = await response.json();
      for (const hit of json.hits ?? []) out.set(hit.productId ?? hit.objectID, hit);
      if ((json.hits ?? []).length < 1000) break;
    }
  }
  return [...out.values()];
}

const candidates = (await pool()).filter((x) => {
  const name = String(x.name ?? '').trim();
  const tagline = String(x.tagline ?? '').trim();
  const description = String(x.description ?? '').trim();
  const url = String(x.websiteUrl ?? '').trim();
  const tags = Array.isArray(x._tags) ? x._tags : [];
  return name.length >= 3 && tagline.length >= 12 && description.length >= 20 && /^https?:\/\//i.test(url) && domain(url)
    && !tags.includes('employees-50-plus') && (tags.includes('founders-solo') || tags.includes('employees-0') || tags.includes('employees-under-10') || tags.includes('employees-10-plus'))
    && !social.test(url) && !forbidden.test([name, tagline, description, url].join(' ')) && !claims.has(norm(name)) && !usedNames.has(norm(name)) && !usedDomains.has(domain(url));
});

const results = [];
let cursor = 0;
async function worker() {
  while (cursor < candidates.length) {
    const candidate = candidates[cursor];
    cursor += 1;
    let status = 0; let finalUrl = candidate.websiteUrl; let title = ''; let body = '';
    try {
      const response = await fetch(candidate.websiteUrl, { redirect: 'follow', signal: AbortSignal.timeout(7000), headers: { 'user-agent': 'Make-Money-source-audit/1.0' } });
      status = response.status; finalUrl = response.url; body = await response.text();
      title = (body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '').replace(/\s+/g, ' ').trim().slice(0, 180);
      const page = `${title} ${finalUrl}`;
      const nameTokens = tokens(candidate.name);
      const matchedTokens = nameTokens.filter((token) => page.toLowerCase().includes(token));
      if (status === 200 && !social.test(finalUrl) && !forbidden.test(page) && (nameTokens.length === 0 || matchedTokens.length > 0)) {
        results.push({ ...candidate, officialAudit: { status, finalUrl, title, matchedTokens, checkedAt: '2026-09-16' } });
      }
    } catch {}
  }
}
await Promise.all(Array.from({ length: 24 }, () => worker()));
results.sort((a, b) => Number(b._tags?.includes('founders-solo') || b._tags?.includes('employees-under-10')) - Number(a._tags?.includes('founders-solo') || a._tags?.includes('employees-under-10')) || (Number(b.revenue) || 0) - (Number(a.revenue) || 0));
fs.writeFileSync(OUTPUT, `${JSON.stringify(results, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ output: OUTPUT, candidates: candidates.length, validated: results.length, soloOrUnder10: results.filter((x) => x._tags?.includes('founders-solo') || x._tags?.includes('employees-under-10')).length }, null, 2));
