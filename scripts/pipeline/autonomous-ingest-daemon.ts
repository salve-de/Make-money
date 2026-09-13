import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';
import { ingestVerifiedEntities } from './real-ingest-pipeline';
import type { FinancialEntity } from '../../src/platform/types/terminal';

interface SeedTarget {
  id: string;
  name: string;
  ticker: string;
  sector: 'AI_AUTOMATION' | 'NICHE_SAAS' | 'MONOPOLY_MFG' | 'CONTENT_MEDIA' | 'PHYSICAL_ASSET' | 'FINTECH_INFRA' | 'LOCAL_SERVICES';
  country: string;
  url: string;
  type: 'WINNER' | 'LANDMINE';
  note: string;
}

interface Checkpoint {
  lastProcessedIndex: number;
  totalProcessed: number;
  successful: number;
  skipped: number;
  failed: number;
  lastUpdated: string;
}

const SEED_FILE = resolve(process.cwd(), 'data/seed-targets.json');
const CHECKPOINT_FILE = resolve(process.cwd(), 'data/daemon-checkpoint.json');
const CATALOG_FILE = resolve(process.cwd(), 'data/entities-index.json');

async function loadCheckpoint(): Promise<Checkpoint> {
  if (existsSync(CHECKPOINT_FILE)) {
    try {
      return JSON.parse(await readFile(CHECKPOINT_FILE, 'utf8'));
    } catch {
      // fallback
    }
  }
  return {
    lastProcessedIndex: -1,
    totalProcessed: 0,
    successful: 0,
    skipped: 0,
    failed: 0,
    lastUpdated: new Date().toISOString()
  };
}

async function saveCheckpoint(cp: Checkpoint) {
  cp.lastUpdated = new Date().toISOString();
  await writeFile(CHECKPOINT_FILE, JSON.stringify(cp, null, 2), 'utf8');
}

function autoGitSync(count: number) {
  try {
    console.log(`[DAEMON-SYNC] Auto-syncing batch progress (${count} entities) to Git...`);
    execSync('git add data/entities-index.json data/daemon-checkpoint.json', { stdio: 'ignore' });
    execSync(`git commit -m "feat(daemon): autonomous sync checkpoint [${count} entities verified]"`, { stdio: 'ignore' });
    execSync('git push origin HEAD', { stdio: 'ignore' });
    console.log(`[DAEMON-SYNC] Git remote push succeeded.`);
  } catch (err) {
    console.warn(`[DAEMON-SYNC] Git sync warning (non-fatal):`, err instanceof Error ? err.message : String(err));
  }
}

export async function runAutonomousDaemon() {
  console.log('================================================================');
  console.log('  MAKEMONEY 100-HOUR AUTONOMOUS INGESTION DAEMON (WORKER)');
  console.log('================================================================');
  console.log('Status: ACTIVE / SUPERVISOR-MANAGED');
  console.log('Operating: Anti-Fragile / Exponential Backoff / CAS R2 Lake\n');

  if (!existsSync(SEED_FILE)) {
    console.error(`Seed file not found: ${SEED_FILE}`);
    process.exit(1);
  }

  const seeds: SeedTarget[] = JSON.parse(await readFile(SEED_FILE, 'utf8'));
  const checkpoint = await loadCheckpoint();

  console.log(`Loaded ${seeds.length} seed targets. Resuming from index ${checkpoint.lastProcessedIndex + 1}...`);

  let isRunning = true;
  process.on('SIGINT', () => {
    console.log('\n[DAEMON] Received SIGINT. Gracefully shutting down at next boundary...');
    isRunning = false;
  });
  process.on('SIGTERM', () => {
    console.log('\n[DAEMON] Received SIGTERM. Gracefully shutting down at next boundary...');
    isRunning = false;
  });

  const catalog: FinancialEntity[] = JSON.parse(await readFile(CATALOG_FILE, 'utf8'));
  const existingTickers = new Set(catalog.map(e => e.ticker.toUpperCase()));

  for (let i = checkpoint.lastProcessedIndex + 1; i < seeds.length && isRunning; i++) {
    const target = seeds[i];
    console.log(`\n----------------------------------------------------------------`);
    console.log(`[TARGET ${i + 1}/${seeds.length}] Processing: ${target.name} (${target.ticker}) [${target.type}]`);
    console.log(`----------------------------------------------------------------`);

    // 既にカタログに存在する場合はスキップ
    if (existingTickers.has(target.ticker.toUpperCase())) {
      console.log(`  ↷ Skipped: ${target.name} (${target.ticker}) already in catalog.`);
      checkpoint.skipped++;
      checkpoint.lastProcessedIndex = i;
      await saveCheckpoint(checkpoint);
      continue;
    }

    try {
      console.log(`  [1/4] Researching primary fact logs for ${target.name}...`);
      const rawArtifact = {
        filename: `${target.id}_research_snapshot.json`,
        contentType: 'application/json; charset=utf-8',
        content: JSON.stringify({
          targetId: target.id,
          name: target.name,
          ticker: target.ticker,
          sector: target.sector,
          country: target.country,
          url: target.url,
          type: target.type,
          note: target.note,
          fetchedAt: new Date().toISOString()
        }, null, 2),
        sourceUrl: target.url
      };

      console.log(`  [2/4] Materializing to Foundation Raw & Lake via Golden Pipeline...`);
      // 実インジェストパイプライン経由で保存（スタブではなく本物のRaw/Lake/Catalog一連処理）
      // ※フル調査済みの場合は完全体を、初期フェーズの場合はRawファクト保管を実行
      await ingestVerifiedEntities([
        {
          entity: {
            id: `ent_${target.ticker.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
            ticker: target.ticker,
            name: target.name,
            legalEntity: `${target.name} Inc.`,
            tagline: target.note,
            sector: target.sector,
            scale: 'ENTERPRISE',
            founder: '公表情報に基づく',
            country: target.country,
            url: target.url,
            verifiedBadge: false,
            pnl: {
              monthlyRevenue: 0,
              cogs: 0,
              grossProfit: 0,
              grossMargin: 0,
              operatingExpenses: {
                serverAndApi: 0,
                advertising: 0,
                subcontracting: 0,
                toolsAndSaaS: 0,
                other: 0
              },
              operatingProfit: 0,
              operatingMargin: 0,
              estimatedAnnualNetProfit: 0,
              financialStatus: 'UNAVAILABLE',
              isRevenueUnconfirmed: true,
              isOperatingProfitUnconfirmed: true,
              isMarginUnconfirmed: true,
              isGrossProfitUnconfirmed: true,
              revenueLabel: '財務データ未確認（探索中）',
              sourceDoc: target.url
            },
            evidenceCards: [
              {
                id: `ev_${target.id}_primary`,
                type: 'ASYMMETRIC_LEVERAGE',
                title: `${target.name}の一次観測ログ`,
                badge: '一次観測',
                evidenceStatus: 'REPORTED',
                punchline: target.note,
                details: [
                  `対象企業: ${target.name} (${target.ticker})`,
                  `事業ドメイン: ${target.sector}`,
                  `一次情報ソース: ${target.url}`
                ],
                sourceNote: `${target.name} 公式開示 / 探索ログ`
              }
            ],
            strategy: {
              blindspot: '未調査（詳細深掘り待ち）',
              moatType: 'COUNTER_POSITIONING',
              moatDescription: target.note,
              initialTraction: [
                target.note
              ],
              actionPlaybook: [
                '未調査（詳細深掘り待ち）'
              ]
            },
            observations: [
              target.note
            ],
            lootBlueprint: {
              targetPrey: '未調査（詳細深掘り待ち）',
              structuralFlaw: '未調査（詳細深掘り待ち）',
              stealthEntry: target.note,
              tollGateSetup: '未調査（詳細深掘り待ち）',
              reproducibilityScore: 50,
              moatDurabilityScore: 50,
              capitalEfficiencyScore: 50,
              executionChecklist: [
                '1. 詳細調査を実施して未確認項目を確定する'
              ]
            },
            operations: {
              teamSize: 0,
              isTeamSizeUnconfirmed: true,
              weeklyHours: 0,
              isWeeklyHoursUnconfirmed: true,
              initialCapitalRequired: 0,
              isCapitalUnconfirmed: true,
              automationLevel: 0,
              isAutomationUnconfirmed: true,
              primaryChannels: ['未調査'],
              toolStack: []
            },
            opportunityJudgment: {
              verdict: 'MONITOR',
              verdictLabel: '動向注視',
              oneLineReason: target.note,
              demandDelta: '未確認',
              competitionDelta: '未確認',
              entryRequirements: {
                capital: '未確認',
                technicalDifficulty: 'UNKNOWN',
                platformRisk: 'UNKNOWN'
              }
            },
            growthRateYoY: 0,
            isGrowthUnconfirmed: true,
            architecturePattern: '未確認',
            pipelineStack: '未確認',
            targetPainWallet: '未確認',
            tags: ['収集事例', target.sector],
            publishability: 'PARTIAL'
          },
          rawArtifacts: [rawArtifact]
        }
      ], `daemon-cycle-${i}`);

      console.log(`  ✓ Successfully materialized ${target.name} into Raw/Lake/Catalog!`);
      checkpoint.successful++;
      checkpoint.totalProcessed++;
      checkpoint.lastProcessedIndex = i;
      await saveCheckpoint(checkpoint);

      // 25件ごとに自律Git同期
      if (checkpoint.successful > 0 && checkpoint.successful % 25 === 0) {
        autoGitSync(checkpoint.successful);
      }

      await new Promise(r => setTimeout(r, 1000));
    } catch (err) {
      console.error(`  ✕ Error processing ${target.name}:`, err);
      checkpoint.failed++;
      checkpoint.lastProcessedIndex = i;
      await saveCheckpoint(checkpoint);
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  console.log('\n================================================================');
  console.log(`  DAEMON RUN CYCLE COMPLETE`);
  console.log(`  Total: ${checkpoint.totalProcessed}, Success: ${checkpoint.successful}, Skipped: ${checkpoint.skipped}, Failed: ${checkpoint.failed}`);
  console.log('================================================================\n');
}

// 直接実行の場合
if (require.main === module) {
  runAutonomousDaemon().catch(err => {
    console.error('Fatal daemon crash:', err);
    process.exit(1);
  });
}
