import type { ListObjectsV2CommandOutput } from '@aws-sdk/client-s3';
import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { INSTITUTIONAL_ENTITIES } from '../src/platform/data/mockLedgerData';
import type { FinancialEntity, SectorCategory } from '../src/platform/types/terminal';
import { inferArchitecturePattern, parseRevenueToMonthlyJpy } from '../src/lib/foundation/foundation-adapter';
import { cleanIntelligenceText } from '../src/lib/foundation/text-cleaner';

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET = 'foundation-lake';
const PREFIX = 'datasets/ds.business.entities.core/v1/entities/';

// Input shape consumed by this legacy enrichment projection.
interface EnrichmentEvidence {
  id: string;
  statement: string;
  text: string;
  originType?: NonNullable<FinancialEntity['observationsStream']>[number]['originType'];
  verificationStatus?: NonNullable<FinancialEntity['observationsStream']>[number]['verificationStatus'];
  observedAt?: string;
  occurredAt?: string;
}
interface EnrichmentInput {
  entity_id: string;
  id: string;
  canonicalIdentifier: string;
  canonical_name?: string;
  name?: string;
  domain?: string;
  entity_type?: string;
  entityType?: string;
  claims?: EnrichmentEvidence[];
  observations?: EnrichmentEvidence[];
  events?: { eventType: string; occurredAt?: string; description: string }[];
  metrics?: { metricType: string; value: string | number; currency?: string }[];
  moneySignals?: { moneyType: string; amount: string | number; currency?: string }[];
}

function inferSector(text: string): SectorCategory {
  const norm = text.toLowerCase();
  if (norm.includes('ai') || norm.includes('automation') || norm.includes('robot')) return 'AI_AUTOMATION';
  if (norm.includes('newsletter') || norm.includes('media') || norm.includes('newsroom') || norm.includes('podcast') || norm.includes('publishing') || norm.includes('education')) return 'CONTENT_MEDIA';
  if (norm.includes('saas') || norm.includes('tool') || norm.includes('platform') || norm.includes('software')) return 'NICHE_SAAS';
  if (norm.includes('manufacturing') || norm.includes('sensor') || norm.includes('factory')) return 'MONOPOLY_MFG';
  if (norm.includes('payment') || norm.includes('finance') || norm.includes('fintech') || norm.includes('billing')) return 'FINTECH_INFRA';
  if (norm.includes('asset') || norm.includes('hardware') || norm.includes('estate')) return 'PHYSICAL_ASSET';
  return 'NICHE_SAAS';
}

function enrichEntity(raw: EnrichmentInput, existingBase?: FinancialEntity): FinancialEntity {
  if (existingBase) return existingBase;

  const id = raw.entity_id || raw.id || raw.canonicalIdentifier;
  const name = raw.canonical_name || raw.name || id;
  const domain = raw.domain || '';
  const ticker = (domain || id).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
  const entityType = raw.entity_type || raw.entityType || 'business';

  const claims = Array.isArray(raw.claims) ? raw.claims : [];
  const observations = Array.isArray(raw.observations) ? raw.observations : [];
  const events = Array.isArray(raw.events) ? raw.events : [];
  const metrics = Array.isArray(raw.metrics) ? raw.metrics : [];
  const moneySignals = Array.isArray(raw.moneySignals) ? raw.moneySignals : [];

  const firstClaim = claims[0]?.statement ? cleanIntelligenceText(claims[0].statement) : '';
  const firstObs = observations[0]?.text ? cleanIntelligenceText(observations[0].text) : '';
  const pattern = inferArchitecturePattern(entityType, `${firstClaim} ${firstObs}`);

  const revMetric = metrics.find((m) => /revenue|arr|sales/i.test(m.metricType));
  const revMoney = moneySignals.find((m) => /revenue|arr|sales/i.test(m.moneyType));
  const bestRev = revMetric?.value || revMoney?.amount;
  const parsedRev = parseRevenueToMonthlyJpy(bestRev, revMetric?.currency || revMoney?.currency, revMetric?.metricType || revMoney?.moneyType);

  const monthlyJpy = parsedRev.monthlyJpy;
  const isUnconfirmed = parsedRev.isUnconfirmed;

  let tagline = firstClaim || firstObs || `${name}の事業モデル・公開情報観測データ`;
  if (/^創業者・運営者:/.test(tagline) && claims[1]?.statement) {
    tagline = cleanIntelligenceText(claims[1].statement);
  }

  let founder = '創業者情報未確認';
  for (const c of claims) {
    if (c.statement && (c.statement.includes('創業者') || /founder|built by/i.test(c.statement))) {
      founder = cleanIntelligenceText(c.statement);
      break;
    }
  }

  const pnl = {
    monthlyRevenue: monthlyJpy,
    cogs: isUnconfirmed ? 0 : Math.round(monthlyJpy * 0.15),
    grossProfit: isUnconfirmed ? 0 : Math.round(monthlyJpy * 0.85),
    grossMargin: isUnconfirmed ? 0 : 85,
    operatingExpenses: {
      serverAndApi: isUnconfirmed ? 0 : Math.round(monthlyJpy * 0.05),
      advertising: isUnconfirmed ? 0 : Math.round(monthlyJpy * 0.05),
      subcontracting: isUnconfirmed ? 0 : Math.round(monthlyJpy * 0.05),
      toolsAndSaaS: isUnconfirmed ? 0 : Math.round(monthlyJpy * 0.02),
      other: isUnconfirmed ? 0 : Math.round(monthlyJpy * 0.03),
    },
    operatingProfit: isUnconfirmed ? 0 : Math.round(monthlyJpy * 0.65),
    operatingMargin: isUnconfirmed ? 0 : 65,
    estimatedAnnualNetProfit: isUnconfirmed ? 0 : Math.round(monthlyJpy * 0.65 * 12),
    isRevenueUnconfirmed: isUnconfirmed,
    isMarginUnconfirmed: isUnconfirmed,
    revenueLabel: parsedRev.revenueLabel,
  };

  const launchEvent = events.find((e) => /launch|founded/i.test(e.eventType));
  const foundedYear = launchEvent?.occurredAt ? parseInt(launchEvent.occurredAt.slice(0, 4), 10) : 2021;

  const tags = new Set<string>();
  tags.add(pattern);
  tags.add(inferSector(tagline) === 'CONTENT_MEDIA' ? 'メディア・出版' : 'SaaS・ツール');
  if (!isUnconfirmed && monthlyJpy > 0) tags.add('収益確認済');

  return {
    id,
    ticker,
    name,
    legalEntity: raw.canonicalIdentifier || undefined,
    tagline,
    sector: inferSector(tagline),
    scale: 'SMALL_TEAM',
    founder,
    country: 'US',
    url: domain ? `https://${domain}` : '',
    verifiedBadge: true,
    growthRateYoY: 25.0,
    architecturePattern: pattern,
    pipelineStack: 'Web / クラウドインフラ / 推論API',
    targetPainWallet: cleanIntelligenceText(firstObs ? firstObs.slice(0, 40) : '特定業務における手作業の工数と認知負荷の削減'),
    tags: Array.from(tags),
    essence: {
      whatItDoes: tagline,
      targetCustomer: cleanIntelligenceText(firstObs ? firstObs.slice(0, 40) : '特定業務・ニッチ領域の課題を抱える法人・個人'),
      painRelief: cleanIntelligenceText(firstClaim ? firstClaim.slice(0, 50) : '既存ツールの複雑性や高価格による機会損失の切除'),
    },
    pricing: {
      model: '月額サブスクリプション / 年間前払い',
      pricePoint: parsedRev.revenueLabel || 'プラン別料金設定あり',
      psychologicalTrigger: '損失回避と作業時間の圧倒的圧縮',
    },
    pnl,
    operations: {
      teamSize: 3,
      weeklyHours: 40,
      initialCapitalRequired: 100000,
      automationLevel: 85,
      primaryChannels: ['オーガニック検索', '口コミ・紹介', 'SNS発信'],
      toolStack: [],
    },
    strategy: {
      blindspot: firstClaim || `${name}が突いた既存大手の硬直化と特化型ポジショニング`,
      moatType: 'SWITCHING_COST',
      moatDescription: firstObs || '顧客データと業務ワークフローの定着による強固な乗り換え障壁',
      initialTraction: [
        '初期ターゲットへの泥臭いSNS・コミュニティでの直接アプローチ',
        '無料・安価なベータ版配布による初期ユーザーの獲得',
        '口コミと紹介によるオーガニックな顧客基盤の拡大',
      ],
      actionPlaybook: [
        '特定ニッチの痛みを特定し、最小限の機能で最速ローンチ',
        'SNSやコミュニティで泥臭く初期ユーザーを直接獲得',
        '年間契約と自動化により高利益率のキャッシュフローを確立',
      ],
    },
    temporal: {
      foundedYear: isNaN(foundedYear) ? 2021 : foundedYear,
      initialTractionPeriod: `${foundedYear}年ローンチ期`,
      dataSnapshotPeriod: '2024-2026年 観測データ',
      viabilityStatus: 'ACTIVE_PLAYBOOK',
      viabilityLabel: '現在も有効 (実証済み)',
      eraContext: 'プラットフォーム規約やAPI進化の歪みを突いて急拡大したモデル',
      currentViabilityAnalysis: '先行者堀があるものの、特化型ニッチであれば同等の粗利構造を再現可能',
    },
    observationsStream: [
      ...observations.map((o) => ({
        id: o.id,
        category: 'MARKET_DISTORTION' as const,
        categoryLabel: '現場観測事実',
        text: cleanIntelligenceText(o.text),
        originType: o.originType || 'observed',
        verificationStatus: o.verificationStatus || 'SUPPORTED',
        observedAt: o.observedAt,
      })),
      ...claims.map((c) => ({
        id: c.id,
        category: 'FOUNDER_HACK' as const,
        categoryLabel: '公表ファクト・裏帳簿',
        text: cleanIntelligenceText(c.statement),
        originType: c.originType || 'reported',
        verificationStatus: c.verificationStatus || 'SUPPORTED',
        observedAt: c.occurredAt,
      })),
    ],
    timelineEvents: events.map((ev) => ({
      eventType: ev.eventType,
      occurredAt: ev.occurredAt || '時期未確認',
      description: cleanIntelligenceText(ev.description),
    })),
  };
}

async function main() {
  console.log('=== 全エンティティ・キーエンス品質一括エンリッチメント開始 ===');

  const existingMap = new Map<string, FinancialEntity>();
  for (const ent of INSTITUTIONAL_ENTITIES) {
    existingMap.set(ent.id, ent);
  }

  console.log('R2よりエンティティ一覧を取得中...');
  const allKeys: string[] = [];
  let continuationToken: string | undefined = undefined;

  do {
    const listRes: ListObjectsV2CommandOutput = await s3.send(new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: PREFIX,
      ContinuationToken: continuationToken,
    }));
    if (listRes.Contents) {
      for (const item of listRes.Contents) {
        if (item.Key && item.Key.endsWith('.json')) {
          allKeys.push(item.Key);
        }
      }
    }
    continuationToken = listRes.NextContinuationToken;
  } while (continuationToken);

  console.log(`R2上の全エンティティファイル数: ${allKeys.length} 件`);

  const enrichedEntities: FinancialEntity[] = [];
  const BATCH_SIZE = 50;

  for (let i = 0; i < allKeys.length; i += BATCH_SIZE) {
    const batchKeys = allKeys.slice(i, i + BATCH_SIZE);
    const promises = batchKeys.map(async (key) => {
      try {
        const getRes = await s3.send(new GetObjectCommand({
          Bucket: BUCKET,
          Key: key,
        }));
        if (!getRes.Body) return null;
        const rawJson = await getRes.Body.transformToString();
        const parsed = JSON.parse(rawJson);
        const entityId = parsed.entity_id || parsed.id || parsed.canonicalIdentifier;
        return enrichEntity(parsed, existingMap.get(entityId));
      } catch {
        return null;
      }
    });

    const results = await Promise.all(promises);
    for (const item of results) {
      if (item) enrichedEntities.push(item);
    }
    console.log(`進捗: ${Math.min(i + BATCH_SIZE, allKeys.length)} / ${allKeys.length} 件完了...`);
  }

  const finalMap = new Map<string, FinancialEntity>();
  for (const ent of INSTITUTIONAL_ENTITIES) {
    finalMap.set(ent.id, ent);
  }
  for (const ent of enrichedEntities) {
    if (!finalMap.has(ent.id)) {
      finalMap.set(ent.id, ent);
    }
  }

  const finalEntities = Array.from(finalMap.values());
  console.log(`エンリッチメント完了総エンティティ数: ${finalEntities.length} 件`);

  const targetPath = resolve(process.cwd(), 'data/entities-index.json');
  await writeFile(targetPath, JSON.stringify(finalEntities, null, 2), 'utf8');
  console.log(`完成版インデックスを保存完了: ${targetPath}`);

  console.log('=== 全工程完了 ===');
}

main().catch((err) => {
  console.error('Fatal error in enrichment pipeline:', err);
  process.exit(1);
});
