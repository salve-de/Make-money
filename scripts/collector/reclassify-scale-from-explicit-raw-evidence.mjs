import fs from 'node:fs';
import path from 'node:path';

const inputPath = process.env.MM_INPUT_FILE ?? 'data/incoming/batch_new_1000_final_primary_mubs_20260916.json';
const auditPath = process.env.MM_RAW_AUDIT_FILE ?? 'data/incoming/raw_snapshots_new1000_20260916.audit.json';
const outputPath = process.env.MM_OUTPUT_FILE ?? inputPath;
const entities = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const rawAudit = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
const captures = rawAudit.results ?? rawAudit;
const byId = new Map(captures.filter((item) => item.status === 'CAPTURED').map((item) => [item.entityId, item]));
const patterns = {
  SOLO: /(?:tag-solopreneur|\b(one[- ]person|one[- ]man|one[- ]woman|one[- ]employee|1[- ](?:person|employee)|solo (?:founder|developer|business|operator)|sole (?:founder|employee|operator)|no employees|zero employees|single[- ](?:person|founder|employee)|all by myself|entirely by myself)\b)/i,
  SMALL_TEAM: /\b(co-?founders?|two founders|three founders|two[- ]person|three[- ]person|[2-9][- ]person|small team|tiny team|a team of [2-9]|[2-9] people|[2-9] employees|two guys|two (?:[a-z]+ )?brothers|two friends|two of us|three people|[2-9] person team|family[- ]?(?:run|business)|married couple|husband and wife|father and son|brother and sister|me and my (?:wife|husband|brother|sister|father|son|partner)|(?:wife|husband) and I (?:started|run|built|operate)|started by [^.!?]{0,80} and (?:his|her) (?:wife|husband))\b/i,
};
const result = [];
const changes = [];
for (const entity of entities) {
  if (entity.scale !== 'UNKNOWN') { result.push(entity); continue; }
  const capture = byId.get(entity.id);
  if (!capture?.localPath) { result.push(entity); continue; }
  let body;
  try { body = fs.readFileSync(path.resolve(capture.localPath), 'utf8'); } catch { result.push(entity); continue; }
  body = body.match(/<article\b[\s\S]*?<\/article>/i)?.[0] ?? body;
  const matches = Object.entries(patterns).flatMap(([scale, pattern]) => {
    const match = body.match(pattern);
    return match ? [{ scale, phrase: match[0] }] : [];
  });
  if (matches.length !== 1) { result.push(entity); continue; }
  const match = matches[0];
  const index = body.toLowerCase().indexOf(match.phrase.toLowerCase());
  const excerpt = body.slice(Math.max(0, index - 100), Math.min(body.length, index + match.phrase.length + 100)).replace(/\s+/g, ' ').trim();
  const updated = {
    ...entity,
    scale: match.scale,
    sourceMetadata: {
      ...entity.sourceMetadata,
      scaleEvidence: {
        originType: 'observed',
        phrase: match.phrase,
        excerpt,
        sourceSha256: entity.sourceMetadata?.rawContentSha256 ?? null,
      },
    },
  };
  result.push(updated);
  changes.push({ id: entity.id, name: entity.name, from: 'UNKNOWN', to: match.scale, phrase: match.phrase });
}
fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ inputPath, outputPath, count: result.length, changed: changes.length, byScale: changes.reduce((counts, item) => { counts[item.to] = (counts[item.to] ?? 0) + 1; return counts; }, {}), changes: changes.slice(0, 12) }, null, 2));
