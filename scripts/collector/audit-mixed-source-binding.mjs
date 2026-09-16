import fs from 'node:fs';

const INPUT = process.env.MM_INPUT_FILE ?? 'data/incoming/batch_indie_hackers_mixed_enriched_1000_20260916.json';
const OUTPUT = process.env.MM_OUTPUT_FILE ?? 'data/incoming/batch_indie_hackers_mixed_source_binding_audit_1000_20260916.json';

const rows = JSON.parse(fs.readFileSync(INPUT, 'utf8'));
const generic = new Set('the app ai free pro online by for and with from to a an your my io com inc ltd software tool website product project'.split(' '));
const tokens = (value) => String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(/\s+/).filter((x) => x.length >= 4 && !generic.has(x));
const host = (value) => { try { return new URL(value).hostname.toLowerCase().replace(/^www\./, ''); } catch { return ''; } };
const forbidden = /(gambl|casino|betting|sportsbook|psychedelic|shroom|porn|escort|adult|toto22|crypto\s*casino|iptv)/i;

const byDomain = new Map();
const entityByDomain = new Map();
const results = rows.map((row) => {
  const entityDomain = host(row.url);
  if (entityDomain) {
    if (!entityByDomain.has(entityDomain)) entityByDomain.set(entityDomain, []);
    entityByDomain.get(entityDomain).push(row.name);
  }
  const card = (row.evidenceCards ?? []).find((x) => x.title === '公式サイトの現行取得確認');
  if (!card) return { id: row.id, name: row.name, status: 'UNREACHABLE_OR_NO_OFFICIAL_CARD', finalUrl: null, title: null, reasons: ['NO_OFFICIAL_CARD', ...(forbidden.test(JSON.stringify(row)) ? ['FORBIDDEN_ENTITY_TEXT'] : [])] };
  const titleLine = String(card.details?.find((x) => x.startsWith('ページタイトル:')) ?? '');
  const title = titleLine.replace(/^ページタイトル:\s*/, '');
  const page = `${title} ${card.sourceUrl ?? ''}`;
  const nameTokens = tokens(row.name);
  const overlap = nameTokens.filter((token) => page.toLowerCase().includes(token));
  const reasons = [];
  if (forbidden.test(JSON.stringify(row))) reasons.push('FORBIDDEN_ENTITY_TEXT');
  if (forbidden.test(page)) reasons.push('FORBIDDEN_DESTINATION');
  if (nameTokens.length > 0 && overlap.length === 0) reasons.push('NAME_TITLE_MISMATCH_REVIEW');
  const finalDomain = host(card.sourceUrl);
  if (finalDomain) {
    if (!byDomain.has(finalDomain)) byDomain.set(finalDomain, []);
    byDomain.get(finalDomain).push(row.name);
  }
  return { id: row.id, name: row.name, status: card.status ?? null, finalUrl: card.sourceUrl ?? null, title, reasons };
});

for (const result of results) {
  const d = host(result.finalUrl);
  if (d && (byDomain.get(d)?.length ?? 0) > 1) result.reasons.push('DUPLICATE_FINAL_DOMAIN_REVIEW');
  const entityDomain = host(rows.find((row) => row.id === result.id)?.url);
  if (entityDomain && (entityByDomain.get(entityDomain)?.length ?? 0) > 1) result.reasons.push('DUPLICATE_ENTITY_DOMAIN_REVIEW');
  if (result.reasons.length === 0) result.reasons.push('BINDING_OBSERVED');
}

fs.writeFileSync(OUTPUT, `${JSON.stringify(results, null, 2)}\n`, 'utf8');
const counts = Object.fromEntries([...new Set(results.flatMap((x) => x.reasons))].map((reason) => [reason, results.filter((x) => x.reasons.includes(reason)).length]));
console.log(JSON.stringify({ input: INPUT, output: OUTPUT, count: results.length, counts, uniqueFinalDomains: byDomain.size }, null, 2));
