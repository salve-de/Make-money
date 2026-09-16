#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const input = path.join(root, 'data/incoming/batch_indie_hackers_reported_1000_20260916.json');
const output = path.join(root, 'data/incoming/batch_indie_hackers_verified_1000_20260916.json');

const validCategories = new Set([
  'MARKET_DISTORTION',
  'SAVANNAH_PAIN',
  'INCUMBENT_DILEMMA',
  'FOUNDER_HACK',
  'FORUM_RAGE',
  'TECH_VERIFICATION',
  'RESEARCH_LIMIT',
]);

function normalizeCard(card, index) {
  const next = { ...card };
  if (!next.evidenceStatus || !['VERIFIED', 'REPORTED', 'ESTIMATED', 'POST_MORTEM', 'UNKNOWN'].includes(next.evidenceStatus)) {
    next.evidenceStatus = 'UNKNOWN';
  }
  if (next.evidenceLocator?.type === 'url' || !next.evidenceLocator || !['pdf', 'html', 'json', 'text', 'media'].includes(next.evidenceLocator.type)) {
    next.evidenceLocator = { type: 'html' };
  }
  if (!next.id) next.id = `card-${index + 1}`;
  if (!next.title) next.title = `公開情報カード ${index + 1}`;
  if (!next.punchline) next.punchline = '公開情報の記録。未確認範囲を分離して保持。';
  if (!next.type || !['THE_CRIME', 'SMOKING_GUN', 'DIRTY_GENESIS', 'ASYMMETRIC_LEVERAGE', 'INCUMBENT_TRAP', 'FATAL_BLEED', 'LOOT_BLUEPRINT', 'UNKNOWN_AUDIT'].includes(next.type)) {
    next.type = 'UNKNOWN_AUDIT';
  }
  return next;
}

function normalizeEntity(entity) {
  const next = structuredClone(entity);
  next.growthRateYoY = typeof next.growthRateYoY === 'number' && Number.isFinite(next.growthRateYoY) ? next.growthRateYoY : 0;
  next.isGrowthUnconfirmed = true;

  const pnl = next.pnl ?? {};
  next.pnl = {
    monthlyRevenue: typeof pnl.monthlyRevenue === 'number' ? pnl.monthlyRevenue : 0,
    cogs: typeof pnl.cogs === 'number' ? pnl.cogs : 0,
    grossProfit: typeof pnl.grossProfit === 'number' ? pnl.grossProfit : 0,
    grossMargin: typeof pnl.grossMargin === 'number' ? pnl.grossMargin : 0,
    operatingExpenses: {
      serverAndApi: typeof pnl.operatingExpenses?.serverAndApi === 'number' ? pnl.operatingExpenses.serverAndApi : 0,
      advertising: typeof pnl.operatingExpenses?.advertising === 'number' ? pnl.operatingExpenses.advertising : 0,
      subcontracting: typeof pnl.operatingExpenses?.subcontracting === 'number' ? pnl.operatingExpenses.subcontracting : 0,
      toolsAndSaaS: typeof pnl.operatingExpenses?.toolsAndSaaS === 'number' ? pnl.operatingExpenses.toolsAndSaaS : 0,
      other: typeof pnl.operatingExpenses?.other === 'number' ? pnl.operatingExpenses.other : 0,
    },
    operatingProfit: typeof pnl.operatingProfit === 'number' ? pnl.operatingProfit : 0,
    operatingMargin: typeof pnl.operatingMargin === 'number' ? pnl.operatingMargin : 0,
    estimatedAnnualNetProfit: typeof pnl.estimatedAnnualNetProfit === 'number' ? pnl.estimatedAnnualNetProfit : 0,
    financialStatus: 'UNAVAILABLE',
    dataSnapshotPeriod: pnl.dataSnapshotPeriod || '2026-09-16公開ディレクトリ取得',
    sourceDoc: pnl.sourceDoc || next.url,
    sourceClass: 'INDEPENDENT_SECONDARY',
    estimationLogic: pnl.estimationLogic || '利益・原価が公開されていないため、P&Lは未確認。',
    revenueLabel: pnl.revenueLabel || '掲載月間売上欄は報告値・利益ではない',
    isRevenueUnconfirmed: true,
    isOperatingProfitUnconfirmed: true,
    isMarginUnconfirmed: true,
    isGrossProfitUnconfirmed: true,
    isGrossMarginUnconfirmed: true,
    isCogsUnconfirmed: true,
    isCostsUnconfirmed: true,
    isNetProfitUnconfirmed: true,
  };

  const operations = next.operations ?? {};
  next.operations = {
    teamSize: typeof operations.teamSize === 'number' ? operations.teamSize : 0,
    weeklyHours: typeof operations.weeklyHours === 'number' ? operations.weeklyHours : 0,
    initialCapitalRequired: typeof operations.initialCapitalRequired === 'number' ? operations.initialCapitalRequired : 0,
    automationLevel: typeof operations.automationLevel === 'number' ? operations.automationLevel : 0,
    primaryChannels: Array.isArray(operations.primaryChannels) ? operations.primaryChannels.filter((v) => typeof v === 'string') : [],
    toolStack: Array.isArray(operations.toolStack) ? operations.toolStack : [],
    isTeamSizeUnconfirmed: true,
    isWeeklyHoursUnconfirmed: true,
    isCapitalUnconfirmed: true,
    isAutomationUnconfirmed: true,
  };

  const temporal = next.temporal ?? {};
  next.temporal = {
    foundedYear: typeof temporal.foundedYear === 'number' && Number.isFinite(temporal.foundedYear) ? temporal.foundedYear : 0,
    initialTractionPeriod: temporal.initialTractionPeriod || '掲載開始時期・初動獲得経路は未確認。',
    dataSnapshotPeriod: temporal.dataSnapshotPeriod || '2026-09-16公開レコード',
    viabilityStatus: ['ACTIVE_PLAYBOOK', 'RISING_WAVE', 'MATURED_MOAT', 'HISTORICAL_WINDOW', 'EVOLVING_BARRIER', 'UNKNOWN'].includes(temporal.viabilityStatus) ? temporal.viabilityStatus : 'UNKNOWN',
    viabilityLabel: temporal.viabilityLabel || '未確認',
    eraContext: temporal.eraContext || '公開ディレクトリ掲載情報の取得時点。',
    currentViabilityAnalysis: temporal.currentViabilityAnalysis || '利益・継続性・現在の稼働状況は未確認。',
  };

  next.evidenceCards = Array.isArray(next.evidenceCards) ? next.evidenceCards.map(normalizeCard) : [];
  if (!next.evidenceCards.some((card) => card.type === 'LOOT_BLUEPRINT')) {
    next.evidenceCards.unshift({
      id: `${next.id}-loot`,
      type: 'LOOT_BLUEPRINT',
      title: '公開情報から分離した転用仮説',
      evidenceStatus: 'UNKNOWN',
      punchline: '公開表示から利益や具体的な手口は確定できない。',
      details: ['追加の一次情報が必要。推測を実績として扱わない。'],
      sourceNote: next.url,
      sourceClass: 'INDEPENDENT_SECONDARY',
      evidenceLocator: { type: 'html' },
    });
  }

  next.observations = Array.isArray(next.observations) ? next.observations.filter((v) => typeof v === 'string') : [];
  next.observationsStream = Array.isArray(next.observationsStream)
    ? next.observationsStream.map((observation, obsIndex) => ({
        ...observation,
        id: observation.id || `${next.id}-observation-${obsIndex + 1}`,
        category: validCategories.has(observation.category) ? observation.category : (obsIndex === 0 ? 'MARKET_DISTORTION' : 'RESEARCH_LIMIT'),
        originType: ['observed', 'inferred', 'reported', 'estimated', 'unknown'].includes(observation.originType) ? observation.originType : 'reported',
        verificationStatus: ['SUPPORTED', 'UNVERIFIED', 'REFUTED'].includes(observation.verificationStatus) ? observation.verificationStatus : 'UNVERIFIED',
      }))
    : [];

  const loot = next.lootBlueprint ?? {};
  next.lootBlueprint = {
    blueprintId: loot.blueprintId || `${next.id}-loot`,
    targetPrey: loot.targetPrey || '対象顧客は未確認',
    structuralFlaw: loot.structuralFlaw || '構造的な優位性は未確認',
    stealthEntry: loot.stealthEntry || '追加の一次情報が必要',
    tollGateSetup: loot.tollGateSetup || '料金・継続条件・原価は未確認',
    reproducibilityScore: typeof loot.reproducibilityScore === 'number' ? loot.reproducibilityScore : 0,
    moatDurabilityScore: typeof loot.moatDurabilityScore === 'number' ? loot.moatDurabilityScore : 0,
    capitalEfficiencyScore: typeof loot.capitalEfficiencyScore === 'number' ? loot.capitalEfficiencyScore : 0,
    executionChecklist: Array.isArray(loot.executionChecklist) ? loot.executionChecklist.filter((v) => typeof v === 'string') : ['公開説明と料金を一次情報で照合する。'],
  };

  next.publishability = typeof next.publishability === 'string' && ['PUBLISHABLE', 'PARTIAL', 'RAW', 'ARCHIVED', 'REJECTED_AS_CASE'].includes(next.publishability) ? next.publishability : 'PARTIAL';
  next.claimBindings = Array.isArray(next.claimBindings) ? next.claimBindings : [];
  next.batchId = next.batchId || 'batch-indie-hackers-reported-20260916';
  return next;
}

const raw = JSON.parse(fs.readFileSync(input, 'utf8'));
if (!Array.isArray(raw)) throw new Error('Input is not an array');
const normalized = raw.map(normalizeEntity);
fs.writeFileSync(output, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
console.log(`normalized ${normalized.length} records -> ${output}`);
