import fs from 'node:fs';

const inputPath = process.env.MM_INPUT_FILE ?? 'data/incoming/batch_ebizfacts_profiles_clean_enriched_1000_20260916.json';
const outputPath = process.env.MM_OUTPUT_FILE ?? 'data/incoming/batch_ebizfacts_profit_shortlist_100_20260916.json';
const auditPath = process.env.MM_AUDIT_FILE ?? 'data/incoming/batch_ebizfacts_profit_shortlist_100_audit_20260916.json';
const rows = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const directProfit = /\b(?:profit|profitable|profitability|net\s+profit|gross\s+profit|profit\s+margin|take[- ]?home|in\s+the\s+bank|cleared|after\s+(?:fees|costs)|margin)\b/i;
const forbidden = /(gambl|casino|betting|sportsbook|wager|cash\s+prize|healthywage|lottery|psychedelic|shroom|porn|escort|adult|toto22|crypto\s*casino|iptv|サバンナOS|略奪転用方程式|カニバリズム障壁|身も蓋もない真実|地雷検死|検死開示|ホスティング関所|決済関所)/i;
const nonBusiness = /(travel\s+cheap|valuation|sold\s+(?:his|her|the|it)|sold\s+for|domain\s+flip|website\s+flip|one[- ]hour|while\s+in\s+college|\bcollege\b|doing\s+absolutely\s+nothing|playing\s+games|profit\s+every\s+time|before\s+creating\s+it|cash\s+prize|wager|app\s+.*sold|\$?149\s+revenue|\b145\s+in\s+1\s+day|\b1000\+?\s+in\s+(?:7|10)\s+days|profit\s+in\s+(?:7|10|15|30|45|100)\s+days)/i;

function directlyLinkedToProfit(metric) {
  const source = String(metric.source ?? '').toLowerCase();
  const raw = String(metric.original ?? '').trim().toLowerCase();
  const context = String(metric.context ?? '').toLowerCase();
  if (!raw || !context) return false;
  if (source === 'profile-card' || source === 'title') return directProfit.test(context);
  const rawIndex = context.indexOf(raw);
  if (rawIndex < 0) return false;
  const before = context.slice(Math.max(0, rawIndex - 90), rawIndex);
  const after = context.slice(rawIndex + raw.length, rawIndex + raw.length + 90);
  const profitBefore = /\b(?:profit(?:able|s|ability)?|net\s+profit|gross\s+profit|take[- ]?home|pocketed|cleared|in\s+the\s+bank)\b[^$€£¥]{0,30}$/i.test(before);
  const profitAfter = /^\s*(?:profit(?:able|s|ability)?|net\s+profit|gross\s+profit|take[- ]?home|pocketed|cleared|in\s+the\s+bank)\b/i.test(after);
  return profitBefore || profitAfter;
}

function profitEvidence(entity) {
  return (entity.reportedMetrics ?? []).filter((metric) => directlyLinkedToProfit(metric));
}

function marginEvidence(entity) {
  return (entity.reportedMetrics ?? []).filter((metric) => {
    const text = `${metric.original ?? ''} ${metric.context ?? ''}`;
    return /(?:profit|gross|net)\s+margin|\bmargin\b/i.test(text);
  });
}

function contextEvidence(entity) {
  return (entity.reportedMetrics ?? []).filter((metric) => directProfit.test(String(metric.context ?? '')) && !directlyLinkedToProfit(metric));
}

function score(entity, evidence) {
  const text = evidence.map((metric) => `${metric.unit} ${metric.original} ${metric.context}`).join(' ');
  let value = 0;
  if (evidence.some((metric) => /MONTHLY_PROFIT|ANNUAL_PROFIT/i.test(metric.unit))) value += 140;
  if (/net\s+profit|profit\s+margin|take[- ]?home|in\s+the\s+bank/i.test(text)) value += 45;
  if (/after\s+(?:fees|costs)|cleared/i.test(text)) value += 30;
  if (entity.scale === 'SOLO') value += 35;
  if (entity.scale === 'SMALL_TEAM') value += 25;
  if (entity.temporal?.dataSnapshotPeriod?.includes('2026')) value += 10;
  if ((entity.evidenceCards ?? []).some((card) => card.title === '公式サイトの現行取得確認')) value += 10;
  return value;
}

const candidates = rows
  .filter((entity) => !forbidden.test(JSON.stringify(entity)) && !nonBusiness.test(entity.name))
  .map((entity) => {
  const evidence = profitEvidence(entity);
  const margins = marginEvidence(entity);
  const contexts = contextEvidence(entity);
  return { entity, evidence, margins, contexts, score: score(entity, evidence) + (margins.length ? 15 : 0) + (contexts.length ? 5 : 0) };
  })
  .filter((item) => item.evidence.length > 0 || item.margins.length > 0 || item.contexts.length > 0)
  .sort((a, b) => b.score - a.score || a.entity.name.localeCompare(b.entity.name));

if (candidates.length < 100) throw new Error(`Only ${candidates.length} profit-evidence candidates found`);
const selected = candidates.slice(0, 100).map((item) => item.entity);
const audit = candidates.slice(0, 100).map((item, index) => ({
  rank: index + 1,
  id: item.entity.id,
  name: item.entity.name,
  scale: item.entity.scale,
  score: item.score,
  evidenceType: item.evidence.length > 0 ? 'DIRECT_PROFIT_AMOUNT' : item.margins.length > 0 ? 'REPORTED_MARGIN_CONTEXT' : 'PROFIT_WORD_CONTEXT',
  evidence: [...item.evidence, ...item.margins, ...item.contexts].slice(0, 5),
  financialStatus: item.entity.pnl?.financialStatus ?? null,
  independentAudit: false,
}));

if (new Set(selected.map((entity) => entity.id)).size !== selected.length) throw new Error('Duplicate shortlist IDs');
if (selected.some((entity) => forbidden.test(JSON.stringify(entity)))) throw new Error('Forbidden content in shortlist');
fs.writeFileSync(outputPath, `${JSON.stringify(selected, null, 2)}\n`, 'utf8');
fs.writeFileSync(auditPath, `${JSON.stringify(audit, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ input: rows.length, profitEvidenceCandidates: candidates.length, selected: selected.length, outputPath, auditPath }, null, 2));
