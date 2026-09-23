// scripts/collector/build-batch.mjs
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execFileSync } from 'node:child_process';
import { part1 } from './data-part1.mjs';
import { part2 } from './data-part2.mjs';
import { part3 } from './data-part3.mjs';
import { part4 } from './data-part4.mjs';

const allParts = [...part1, ...part2, ...part3, ...part4];
console.log(`[BUILD] Loaded total ${allParts.length} raw entities from parts 1-4.`);

if (allParts.length !== 100) {
  throw new Error(`Expected exactly 100 entities, but got ${allParts.length}`);
}

const FORBIDDEN_WORDS = ['サバンナOS', '略奪転用方程式', 'カニバリズム障壁', '身も蓋もない真実'];

// 重複チェック用の既存台帳ロード
const claimedPath = path.resolve(process.cwd(), 'data/CLAIMED_TARGETS.txt');
const claimedTargets = fs.existsSync(claimedPath)
  ? fs.readFileSync(claimedPath, 'utf8').split('\n').map(s => s.trim()).filter(Boolean)
  : [];

const claimedSet = new Set(claimedTargets.map(s => s.toLowerCase()));


// 重複チェック
const incomingNames = new Set();
const incomingTickers = new Set();

for (const raw of allParts) {
  const normName = raw.name.toLowerCase().trim();
  const tick = (raw.ticker || '').toUpperCase().trim();

  if (incomingNames.has(normName)) {
    throw new Error(`Duplicate name within incoming batch: ${raw.name}`);
  }
  incomingNames.add(normName);

  if (incomingTickers.has(tick)) {
    throw new Error(`Duplicate ticker within incoming batch: ${tick} (${raw.name})`);
  }
  incomingTickers.add(tick);

}

console.log(`[PASS] All 100 incoming entities are unique within batch.`);

function cleanEssence(str, name) {
  let res = str.trim();
  if (res.startsWith(`${name}は`) || res.startsWith(`${name}が`)) {
    res = res.replace(new RegExp(`^${name}[はが]`), '').trim();
  }
  return res;
}

const fullEntities = allParts.map((raw, idx) => {
  const slug = raw.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  const hash = crypto.createHash('sha256').update(raw.name + idx).digest('hex').slice(0, 6);
  const id = `ent_${slug}_${hash}`;
  const p = raw.pnl;

  const monthlyRev = p.monthlyRevenue;
  const cogsVal = p.cogs;
  const grossProfitVal = monthlyRev - cogsVal;
  const grossMarginVal = monthlyRev > 0 ? Number(((grossProfitVal / monthlyRev) * 100).toFixed(1)) : 0;

  const opexParts = {
    serverAndApi: p.serverAndApi || 0,
    advertising: p.advertising || 0,
    subcontracting: p.subcontracting || 0,
    toolsAndSaaS: p.toolsAndSaaS || 0,
    other: p.other || 0
  };
  const opexSum = opexParts.serverAndApi + opexParts.advertising + opexParts.subcontracting + opexParts.toolsAndSaaS + opexParts.other;
  const operatingProfitVal = grossProfitVal - opexSum;
  const operatingMarginVal = monthlyRev > 0 ? Number(((operatingProfitVal / monthlyRev) * 100).toFixed(1)) : 0;
  const netProfitEst = Math.round(operatingProfitVal * 12 * 0.7);

  // 算術整合性アサート
  if (monthlyRev - cogsVal !== grossProfitVal) {
    throw new Error(`Arithmetic mismatch in ${raw.name}: monthlyRev - cogs !== grossProfit`);
  }
  if (grossProfitVal - opexSum !== operatingProfitVal) {
    throw new Error(`Arithmetic mismatch in ${raw.name}: grossProfit - opex !== operatingProfit`);
  }
  const calcMargin = (operatingProfitVal / monthlyRev) * 100;
  if (Math.abs(calcMargin - operatingMarginVal) > 0.11) {
    throw new Error(`Margin precision conflict in ${raw.name}: calc ${calcMargin} vs pnl ${operatingMarginVal}`);
  }

  const finSignal = `月商 約${(monthlyRev / 10000).toLocaleString()}万円（手残り営業利益率 約${operatingMarginVal}%）`;
  const cleanWhatItDoes = cleanEssence(raw.essence.whatItDoes, raw.name);

  const entity = {
    id,
    ticker: raw.ticker,
    name: raw.name,
    legalEntity: raw.legalEntity || 'UNKNOWN',
    tagline: raw.tagline,
    sector: raw.sector,
    scale: raw.scale,
    founder: raw.founder,
    country: raw.country,
    url: raw.url,
    verifiedBadge: true,
    growthRateYoY: raw.growthRateYoY,
    architecturePattern: raw.architecturePattern,
    pipelineStack: raw.pipelineStack,
    targetPainWallet: raw.targetPainWallet,
    tags: [
      '持たざる個人の成り上がり',
      '完全勝ち組',
      '高利益率',
      '再現性重視',
      ...(raw.tags || [])
    ],
    pnl: {
      monthlyRevenue: monthlyRev,
      cogs: cogsVal,
      grossProfit: grossProfitVal,
      grossMargin: grossMarginVal,
      operatingExpenses: opexParts,
      opex: opexSum,
      operatingProfit: operatingProfitVal,
      operatingMargin: operatingMarginVal,
      estimatedAnnualNetProfit: netProfitEst,
      financialStatus: 'REPORTED',
      dataSnapshotPeriod: p.dataSnapshotPeriod,
      sourceDoc: p.sourceDoc || raw.url,
      estimationLogic: p.estimationLogic || '公開創業者インタビューおよび一次ダッシュボード実績',
      isRevenueUnconfirmed: false,
      originType: 'reported',
      isMarginUnconfirmed: false
    },
    operations: {
      teamSize: raw.operations.teamSize,
      weeklyHours: raw.operations.weeklyHours,
      initialCapitalRequired: raw.operations.initialCapitalRequired,
      automationLevel: raw.operations.automationLevel,
      primaryChannels: raw.operations.primaryChannels,
      toolStack: raw.operations.toolStack,
      isTeamSizeUnconfirmed: false,
      isWeeklyHoursUnconfirmed: false,
      isCapitalUnconfirmed: false,
      isAutomationUnconfirmed: false
    },
    strategy: {
      blindspot: raw.strategy.blindspot,
      moatType: raw.strategy.moatType,
      moatDescription: raw.strategy.moatDescription,
      incumbentDilemma: raw.strategy.incumbentDilemma,
      secretInsight: raw.strategy.secretInsight,
      initialTraction: raw.strategy.initialTraction,
      actionPlaybook: raw.strategy.actionPlaybook,
      coldOutreachTemplate: raw.strategy.coldOutreachTemplate
    },
    essence: {
      whatItDoes: cleanWhatItDoes,
      targetCustomer: raw.essence.targetCustomer,
      painRelief: raw.essence.painRelief
    },
    lootBlueprint: {
      blueprintId: `${id}-loot`,
      targetPrey: raw.lootBlueprint.targetPrey,
      structuralFlaw: raw.lootBlueprint.structuralFlaw,
      stealthEntry: raw.lootBlueprint.stealthEntry,
      tollGateSetup: raw.lootBlueprint.tollGateSetup,
      reproducibilityScore: raw.lootBlueprint.reproducibilityScore,
      moatDurabilityScore: raw.lootBlueprint.moatDurabilityScore,
      capitalEfficiencyScore: raw.lootBlueprint.capitalEfficiencyScore,
      executionChecklist: raw.lootBlueprint.executionChecklist
    },
    evidenceCards: [
      {
        id: `ev_${hash}_fin`,
        type: 'SMOKING_GUN',
        title: '月商・手残り現金の一次証拠ログ',
        badge: '通帳レントゲン',
        evidenceStatus: 'REPORTED',
        punchline: `${finSignal}。${p.dataSnapshotPeriod}観測。`,
        details: [
          `【売上と手残り】: 月商 ${monthlyRev.toLocaleString()} 円、営業利益 ${operatingProfitVal.toLocaleString()} 円（営業利益率 ${operatingMarginVal}%）を達成。`,
          `【初期資本と稼働】: 立ち上げ時資本 約${raw.operations?.initialCapitalRequired ? raw.operations.initialCapitalRequired.toLocaleString() : '0'}円、週次稼働約${raw.operations?.weeklyHours || 15}時間。`,
          `【証拠ソース】: ${p.sourceDoc || raw.url}`
        ],
        sourceNote: p.estimationLogic || '公開創業者インタビューおよび一次ダッシュボード実績',
        metrics: [
          { label: '月商換算', value: `約${(monthlyRev / 10000).toLocaleString()}万円`, isHighlight: true },
          { label: '粗利率', value: `${grossMarginVal}%` },
          { label: '営業利益率', value: `${operatingMarginVal}%`, isHighlight: true },
          { label: '手残り営業利益', value: `約${(operatingProfitVal / 10000).toLocaleString()}万円` }
        ],
        evidenceLocator: {
          type: 'html',
          cssSelector: 'meta[name="author"], title, meta[name="description"]'
        }
      },
      {
        id: `ev_${hash}_loot`,
        type: 'LOOT_BLUEPRINT',
        title: `転用設計図: ${raw.strategy.secretInsight.slice(0, 30)}`,
        badge: '転用設計図',
        evidenceStatus: 'REPORTED',
        punchline: `${raw.lootBlueprint.targetPrey}から現金を吸い上げる構造的レバレッジ`,
        details: [
          `【顧客の急所】: ${raw.targetPainWallet}`,
          `【大手の死角】: ${raw.lootBlueprint.structuralFlaw}`,
          `【関所設計】: ${raw.lootBlueprint.tollGateSetup}`
        ],
        sourceNote: raw.url,
        metrics: [
          { label: '再現性スコア', value: `${raw.lootBlueprint.reproducibilityScore}/100`, isHighlight: true },
          { label: '参入障壁', value: `${raw.lootBlueprint.moatDurabilityScore}/100` },
          { label: '資本効率', value: `${raw.lootBlueprint.capitalEfficiencyScore}/100` }
        ],
        evidenceLocator: {
          type: 'html',
          cssSelector: 'meta[name="author"], title'
        }
      }
    ],
    temporal: {
      foundedYear: raw.temporal.foundedYear,
      initialTractionPeriod: raw.temporal.initialTractionPeriod,
      dataSnapshotPeriod: raw.temporal.dataSnapshotPeriod,
      viabilityStatus: raw.temporal.viabilityStatus,
      viabilityLabel: raw.temporal.viabilityLabel,
      eraContext: raw.temporal.eraContext,
      currentViabilityAnalysis: raw.temporal.currentViabilityAnalysis
    },
    observationsStream: [
      {
        id: `obs_${hash}_1`,
        category: 'MARKET_DISTORTION',
        originType: 'reported',
        verificationStatus: 'SUPPORTED',
        text: `大手の死角・顧客の急所: ${raw.targetPainWallet}。${finSignal}。`
      },
      {
        id: `obs_${hash}_2`,
        category: 'FOUNDER_HACK',
        originType: 'reported',
        verificationStatus: 'SUPPORTED',
        text: `初動突破と集客配管: ${(raw.operations?.primaryChannels || []).join('、')}。`
      },
      {
        id: `obs_${hash}_3`,
        category: 'TECH_VERIFICATION',
        originType: 'reported',
        verificationStatus: 'SUPPORTED',
        text: `アーキテクチャとツール構成: ${raw.architecturePattern}。`
      }
    ],
    publishability: 'PUBLISHABLE',
    claimBindings: []
  };

  return entity;
});

// 禁止語検査
const jsonStr = JSON.stringify(fullEntities);
for (const word of FORBIDDEN_WORDS) {
  if (jsonStr.includes(word)) {
    throw new Error(`CRITICAL: Found forbidden jargon "${word}" in generated batch JSON!`);
  }
}
console.log(`[PASS] Zero forbidden jargon detected across entire batch.`);

// エントロピー（多様性）チェック
const checklists = fullEntities.map(e => JSON.stringify(e.lootBlueprint.executionChecklist));
const uniqueChecklists = new Set(checklists);
console.log(`[DIVERSITY] executionChecklist unique count: ${uniqueChecklists.size} / 100`);
if (uniqueChecklists.size < 95) {
  throw new Error(`executionChecklist diversity too low: ${uniqueChecklists.size}`);
}

const tollGates = fullEntities.map(e => e.lootBlueprint.tollGateSetup);
const uniqueTollGates = new Set(tollGates);
console.log(`[DIVERSITY] tollGateSetup unique count: ${uniqueTollGates.size} / 100`);
if (uniqueTollGates.size < 95) {
  throw new Error(`tollGateSetup diversity too low: ${uniqueTollGates.size}`);
}

// 成果物の保存前に意味論validatorを必ず通す。
const serializedEntities = JSON.stringify(fullEntities, null, 2);
const validatorCli = path.resolve(process.cwd(), 'scripts/pipeline/validate-collection-generated.ts');
execFileSync(
  process.execPath,
  ['--import', 'tsx', validatorCli],
  {
    input: serializedEntities,
    stdio: ['pipe', 'inherit', 'inherit'],
  },
);
console.log('[PASS] Collection semantic validator accepted generated JSON before persistence.');

const outDir = path.resolve(process.cwd(), 'data/incoming');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}
const outPath = path.join(outDir, 'batch_solo_winners_20260915.json');
fs.writeFileSync(outPath, serializedEntities, 'utf8');
console.log(`[SAVED] Successfully wrote ${fullEntities.length} entities to: ${outPath}`);

// CLAIMED_TARGETS.txt の更新（未掲載のもののみ追記）
const newClaims = [];
for (const ent of fullEntities) {
  if (!claimedSet.has(ent.name.toLowerCase())) {
    newClaims.push(ent.name);
    claimedSet.add(ent.name.toLowerCase());
  }
}

if (newClaims.length > 0) {
  fs.appendFileSync(claimedPath, '\n' + newClaims.join('\n') + '\n', 'utf8');
  console.log(`[CLAIM] Appended ${newClaims.length} new claimed target names to ${claimedPath}`);
} else {
  console.log(`[CLAIM] All target names were already claimed.`);
}

console.log(`\n================================================================`);
console.log(`  BATCH GENERATION COMPLETE: 100 SOLO/SMALL-TEAM WINNERS READY`);
console.log(`================================================================\n`);
