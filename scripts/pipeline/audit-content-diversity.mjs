import { readFileSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const root = process.cwd();
const indexPath = path.join(root, 'data/entities-index.json');
const revisionIndex = process.argv.indexOf('--git-revision');
const revision = revisionIndex >= 0 ? process.argv[revisionIndex + 1] : '';
const indexText = revision
  ? execFileSync('git', ['show', `${revision}:data/entities-index.json`], { encoding: 'utf8', maxBuffer: 250 * 1024 * 1024 })
  : readFileSync(indexPath, 'utf8');
const entities = JSON.parse(indexText);

const FIELDS = [
  'tagline',
  'architecturePattern',
  'pipelineStack',
  'targetPainWallet',
  'essence.whatItDoes',
  'essence.targetCustomer',
  'essence.painRelief',
  'strategy.blindspot',
  'strategy.moatDescription',
  'strategy.secretInsight',
  'strategy.initialTraction',
  'strategy.actionPlaybook',
  'strategy.coldOutreachTemplate',
  'lootBlueprint.targetPrey',
  'lootBlueprint.structuralFlaw',
  'lootBlueprint.stealthEntry',
  'lootBlueprint.tollGateSetup',
  'lootBlueprint.executionChecklist',
];

const GENERIC_MARKERS = [
  '特化型課題解決ソリューション',
  '現場のボトルネックを解消し',
  '少数精鋭で手堅く現金を回収する',
  '特定業務摩擦直撃',
  '手作業の工数浪費や専門知識不足による機会損失',
  '大手汎用サービスがマニアックな現場の細かな要望を放置',
  '創業者が自身の課題を解決する最小限のツール',
  'Next.js/モダンWeb基盤 × 特化ロジックAPI × セルフサーブ決済配管',
  '独自の現場密着ワークフローと、一度業務に組み込んだら乗り換えが面倒',
  '公開情報では詳細不明だが、',
  'Google検索でSEOスパム記事に埋もれた中から',
  '特定ニッチ産業・ツールの網羅型ディレクトリポータル',
  'まずは無料',
];

const PNL_UNCONFIRMED_FIELDS = [
  'isRevenueUnconfirmed',
  'isOperatingProfitUnconfirmed',
  'isMarginUnconfirmed',
  'isGrossProfitUnconfirmed',
  'isGrossMarginUnconfirmed',
  'isCogsUnconfirmed',
  'isCostsUnconfirmed',
  'isNetProfitUnconfirmed',
];
const SUSPICIOUS_UNIT_RE = /¥\s*\d{4,}万円|(?:月商|年商)\s*[^。\n]{0,40}\d{4,}万円/u;
const GENERIC_SOURCE_DOC_RE = /実在財務シグナル検証レポート|公式プロダクト検証レポート/u;

const get = (object, dotted) => dotted.split('.').reduce((value, key) => value?.[key], object);

function textOf(value) {
  if (Array.isArray(value)) return value.map(textOf).join(' | ');
  if (value && typeof value === 'object') {
    if (typeof value.text === 'string') return value.text;
    return Object.values(value).map(textOf).join(' | ');
  }
  return value == null ? '' : String(value);
}

function normalize(value, { removeName, removeNumbers = true } = {}) {
  let text = textOf(value)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  if (removeName) {
    const name = normalize(removeName, { removeNumbers: false });
    if (name.length >= 2) text = text.split(name).join('<name>');
  }
  if (removeNumbers) text = text.replace(/[0-9０-９]+(?:[.,][0-9０-９]+)?/g, '<n>');
  return text
    .replace(/[「」『』【】()（）［］\[\]{}<>:：,，.。・/／×*＊!?！？\-—~〜]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasGenericMarker(value) {
  const text = textOf(value);
  return GENERIC_MARKERS.some((marker) => text.includes(marker));
}

function walkJson(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) walkJson(full, out);
    else if (entry.endsWith('.json')) out.push(full);
  }
  return out;
}

function observationText(entity) {
  return [
    ...(Array.isArray(entity.observations) ? entity.observations : []),
    ...(Array.isArray(entity.observationsStream) ? entity.observationsStream.map((item) => item?.text) : []),
  ].filter((item) => typeof item === 'string');
}

function batchOf(entity) {
  return entity.batchId || entity.provenance?.batchId || 'UNKNOWN';
}

function groupBy(entitiesForGroup, field, structural) {
  const result = new Map();
  for (const entity of entitiesForGroup) {
    const value = get(entity, field);
    if (!value) continue;
    const key = structural ? normalize(value, { removeName: entity.name }) : textOf(value).trim();
    if (!key) continue;
    const list = result.get(key) || [];
    list.push(entity);
    result.set(key, list);
  }
  return result;
}

function duplicateReport(items, field) {
  const exact = [...groupBy(items, field, false).values()].filter((list) => list.length > 1);
  const structural = [...groupBy(items, field, true).values()].filter((list) => list.length > 1);
  const generic = items.filter((item) => hasGenericMarker(get(item, field)));
  const largestExact = exact.sort((a, b) => b.length - a.length)[0] || [];
  const largestStructural = structural.sort((a, b) => b.length - a.length)[0] || [];
  return {
    exactGroups: exact.length,
    exactEntities: exact.reduce((sum, list) => sum + list.length, 0),
    largestExact: largestExact.length,
    largestExactNames: largestExact.slice(0, 8).map((item) => item.name),
    structuralGroups: structural.length,
    structuralEntities: structural.reduce((sum, list) => sum + list.length, 0),
    largestStructural: largestStructural.length,
    largestStructuralNames: largestStructural.slice(0, 8).map((item) => item.name),
    genericEntities: generic.length,
  };
}

function supportedRevenueBinding(entity) {
  return (Array.isArray(entity.claimBindings) ? entity.claimBindings : []).some((binding) => (
    binding?.claimKey === 'pnl.monthlyRevenue'
    && binding?.claimValue === entity.pnl?.monthlyRevenue
    && binding?.verificationStatus === 'SUPPORTED'
    && binding?.supportCheck === 'PASS'
    && typeof binding?.foundationEvidenceId === 'string'
    && binding.foundationEvidenceId.trim().length > 0
  ));
}

function finitePnl(entity) {
  const pnl = entity.pnl || {};
  const expenses = pnl.operatingExpenses;
  const expenseTotal = expenses && typeof expenses === 'object'
    ? Object.values(expenses).reduce((sum, value) => sum + Number(value || 0), 0)
    : Number.NaN;
  const values = [
    pnl.monthlyRevenue,
    pnl.cogs,
    pnl.grossProfit,
    pnl.grossMargin,
    pnl.operatingProfit,
    pnl.operatingMargin,
    pnl.estimatedAnnualNetProfit,
    expenseTotal,
  ].map(Number);
  return values.every(Number.isFinite) ? {
    revenue: values[0],
    cogs: values[1],
    grossProfit: values[2],
    grossMargin: values[3],
    operatingProfit: values[4],
    operatingMargin: values[5],
    annualNetProfit: values[6],
    expenseTotal: values[7],
  } : null;
}

function financialAudit(items) {
  const mathErrors = [];
  const marginErrors = [];
  const annualErrors = [];
  const missingUnconfirmedFlags = [];
  const reportedWithoutBinding = [];
  const verifiedWithoutBinding = [];
  const suspiciousUnitEntities = [];
  const genericSourceDocs = [];
  const formulaCounts = new Map();
  const statusCounts = {};

  for (const entity of items) {
    const pnl = entity.pnl || {};
    const status = pnl.financialStatus || 'MISSING';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
    const values = finitePnl(entity);
    if (values) {
      if (Math.abs(values.grossProfit - (values.revenue - values.cogs)) > 1) mathErrors.push(entity.name);
      if (values.revenue > 0 && Math.abs(values.grossMargin - (values.grossProfit / values.revenue) * 100) > 1.5) marginErrors.push(entity.name);
      if (values.revenue > 0 && Math.abs(values.operatingMargin - (values.operatingProfit / values.revenue) * 100) > 1.5) marginErrors.push(entity.name);
      if (Math.abs(values.operatingProfit - (values.grossProfit - values.expenseTotal)) > 1) mathErrors.push(entity.name);
      if (Math.abs(values.annualNetProfit - values.operatingProfit * 12) > 1) annualErrors.push(entity.name);
      const formula = [values.revenue, values.cogs, values.grossProfit, values.operatingProfit, values.grossMargin, values.operatingMargin, values.annualNetProfit, values.expenseTotal].join('|');
      const names = formulaCounts.get(formula) || [];
      names.push(entity.name);
      formulaCounts.set(formula, names);
    }
    if (PNL_UNCONFIRMED_FIELDS.some((field) => pnl[field] !== true)) missingUnconfirmedFlags.push(entity.name);
    if (status === 'REPORTED' && !supportedRevenueBinding(entity)) reportedWithoutBinding.push(entity.name);
    if (status === 'VERIFIED' && !supportedRevenueBinding(entity)) verifiedWithoutBinding.push(entity.name);
    if (observationText(entity).some((line) => SUSPICIOUS_UNIT_RE.test(line))) suspiciousUnitEntities.push(entity.name);
    if (GENERIC_SOURCE_DOC_RE.test(String(pnl.sourceDoc || ''))) genericSourceDocs.push(entity.name);
  }

  const repeatedFormulaSignatures = [...formulaCounts.entries()]
    .filter(([, names]) => names.length > 1)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 12)
    .map(([signature, names]) => ({ count: names.length, signature, names: names.slice(0, 8) }));

  return {
    statusCounts,
    arithmetic: {
      grossOrOperatingProfitErrors: mathErrors.length,
      marginErrors: marginErrors.length,
      annualNetProfitErrors: annualErrors.length,
      examples: [...new Set([...mathErrors, ...marginErrors, ...annualErrors])].slice(0, 12),
    },
    provenance: {
      missingUnconfirmedFlags: missingUnconfirmedFlags.length,
      reportedWithoutExactSupportedBinding: reportedWithoutBinding.length,
      verifiedWithoutExactSupportedBinding: verifiedWithoutBinding.length,
      genericSourceDocs: genericSourceDocs.length,
      examples: {
        reportedWithoutExactSupportedBinding: reportedWithoutBinding.slice(0, 12),
        verifiedWithoutExactSupportedBinding: verifiedWithoutBinding.slice(0, 12),
        suspiciousUnitEntities: suspiciousUnitEntities.slice(0, 12),
        genericSourceDocs: genericSourceDocs.slice(0, 12),
      },
    },
    repeatedFormulaSignatures,
  };
}

function catalogSafetyAudit(items) {
  const acquisitionEntities = items.filter((entity) => entity.acquisition && typeof entity.acquisition === 'object');
  const nonNeutralTagEntities = items.filter((entity) => (Array.isArray(entity.tags) ? entity.tags : []).some((tag) => (
    tag !== '収集事例' && !(entity.pnl?.financialStatus === 'POST_MORTEM' && tag === '失敗・撤退の検証')
  )));
  const temporalStatusCounts = {};
  const foundedYearEntities = [];
  const nonUnknownTemporalEntities = [];
  const verifiedBadgeEntities = [];
  const verifiedCardEntities = [];
  const legacyGeneratedFieldEntities = [];

  for (const entity of items) {
    const temporal = entity.temporal;
    if (temporal && typeof temporal === 'object') {
      const status = temporal.viabilityStatus || 'MISSING';
      temporalStatusCounts[status] = (temporalStatusCounts[status] || 0) + 1;
      if (Number(temporal.foundedYear) > 0) foundedYearEntities.push(entity.name);
      if (status !== 'UNKNOWN') nonUnknownTemporalEntities.push(entity.name);
    }
    if (entity.verifiedBadge === true) verifiedBadgeEntities.push(entity.name);
    if (Array.isArray(entity.evidenceCards) && entity.evidenceCards.some((card) => card?.evidenceStatus === 'VERIFIED')) {
      verifiedCardEntities.push(entity.name);
    }
    const repairedFields = [
      entity.tagline,
      entity.architecturePattern,
      entity.pipelineStack,
      entity.essence?.whatItDoes,
      entity.strategy?.blindspot,
      entity.lootBlueprint?.structuralFlaw,
    ].map(textOf).join(' ');
    if (/累計売上4億円超|エンジニアが作った画面が絶望的にダサい/.test(repairedFields)) {
      legacyGeneratedFieldEntities.push(entity.name);
    }
  }

  return {
    acquisitionEntities: acquisitionEntities.length,
    nonNeutralTagEntities: nonNeutralTagEntities.length,
    temporalStatusCounts,
    foundedYearEntities: foundedYearEntities.length,
    nonUnknownTemporalEntities: nonUnknownTemporalEntities.length,
    verifiedBadgeEntities: verifiedBadgeEntities.length,
    verifiedCardEntities: verifiedCardEntities.length,
    legacyGeneratedFieldEntities: legacyGeneratedFieldEntities.length,
    examples: {
      acquisitionEntities: acquisitionEntities.slice(0, 12).map((entity) => entity.name),
      nonNeutralTagEntities: nonNeutralTagEntities.slice(0, 12).map((entity) => entity.name),
      foundedYearEntities: foundedYearEntities.slice(0, 12),
      nonUnknownTemporalEntities: nonUnknownTemporalEntities.slice(0, 12),
      verifiedBadgeEntities: verifiedBadgeEntities.slice(0, 12),
      verifiedCardEntities: verifiedCardEntities.slice(0, 12),
      legacyGeneratedFieldEntities: legacyGeneratedFieldEntities.slice(0, 12),
    },
  };
}

const rawById = new Map();
for (const file of walkJson(path.join(root, 'data/incoming'))) {
  let rows;
  try {
    rows = JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    continue;
  }
  if (!Array.isArray(rows)) continue;
  for (const row of rows) {
    if (!row?.id) continue;
    const previous = rawById.get(row.id);
    if (!previous || JSON.stringify(row).length > JSON.stringify(previous).length) rawById.set(row.id, row);
  }
}

const sourceCounts = new Map();
const descriptionValues = new Set();
const titleValues = new Set();
for (const entity of entities) {
  const observations = observationText(entity);
  const description = observations.find((item) => /^Indie Hackers(?:公開説明| listing):/.test(item) || /Indie Hackersの掲載説明は/.test(item));
  const ebiz = observations.find((item) => /^(?:eBiz Factsプロフィール記事|eBiz Facts記事要約|プロフィール記事|記事要約):/.test(item));
  const title = observations.find((item) => /title=/.test(item) && !/タイトル未取得|HTTP ERROR|Just a moment/i.test(item));
  const source = description ? 'indie-description' : ebiz ? 'ebiz-summary' : title ? 'title' : 'none';
  sourceCounts.set(source, (sourceCounts.get(source) || 0) + 1);
  if (description) descriptionValues.add(description);
  if (title) titleValues.add(title);
}

console.log(JSON.stringify({
  total: entities.length,
  uniqueIds: new Set(entities.map((item) => item.id)).size,
  rawIncomingRecords: rawById.size,
  sourceCounts: Object.fromEntries(sourceCounts),
  uniqueIndieDescriptions: descriptionValues.size,
  uniqueTitles: titleValues.size,
  fields: Object.fromEntries(FIELDS.map((field) => [field, duplicateReport(entities, field)])),
  financial: financialAudit(entities),
  catalogSafety: catalogSafetyAudit(entities),
  batches: Object.fromEntries([...new Set(entities.map(batchOf))].sort().map((batch) => {
    const batchEntities = entities.filter((entity) => batchOf(entity) === batch);
    const tagline = duplicateReport(batchEntities, 'tagline');
    const architecture = duplicateReport(batchEntities, 'architecturePattern');
    return [batch, {
      total: batchEntities.length,
      taglineUnique: new Set(batchEntities.map((item) => textOf(item.tagline))).size,
      taglineStructuralLargest: tagline.largestStructural,
      architectureUnique: new Set(batchEntities.map((item) => textOf(item.architecturePattern))).size,
      architectureStructuralLargest: architecture.largestStructural,
      genericTaglines: tagline.genericEntities,
    }];
  })),
}, null, 2));
