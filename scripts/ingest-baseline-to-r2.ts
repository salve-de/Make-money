import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { INSTITUTIONAL_ENTITIES } from '../src/platform/data/mockLedgerData';

const BUCKET = 'foundation-lake';

function createS3Client(): S3Client {
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY?.trim();

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('Cloudflare R2 credentials missing in environment');
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

async function main() {
  console.log('=== Ingesting Baseline 13 Entities & Bundles to Cloudflare R2 ===');
  const s3 = createS3Client();

  for (const entity of INSTITUTIONAL_ENTITIES) {
    console.log(`Processing: ${entity.name} (${entity.id})...`);

    // 1. Core Entity JSON の生成と保存
    const coreEntity = {
      entity_id: entity.id,
      entity_type: 'business_product',
      canonical_name: entity.name,
      aliases: [entity.ticker, entity.name],
      canonical_identifier: entity.url,
      domain: entity.url.replace(/^https?:\/\//, '').replace(/\/.*$/, ''),
      status: 'ACTIVE',
      observed_at: new Date().toISOString(),
      metadata: {
        ticker: entity.ticker,
        founder: entity.founder,
        country: entity.country,
        sector: entity.sector,
        scale: entity.scale,
        legalEntity: entity.legalEntity,
      },
    };

    const entityKey = `datasets/ds.business.entities.core/v1/entities/${entity.id}.json`;
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: entityKey,
        Body: Buffer.from(JSON.stringify(coreEntity, null, 2), 'utf8'),
        ContentType: 'application/json; charset=utf-8',
      })
    );
    console.log(`  -> Uploaded entity to ${entityKey}`);

    // 2. Research Bundle JSON の生成と保存
    // メトリクス
    const metrics = [
      {
        metric_id: `mt_rev_${entity.id}`,
        entity_id: entity.id,
        metric_type: 'monthly_revenue',
        value: entity.pnl.monthlyRevenue,
        unit: 'JPY/month',
        currency: 'JPY',
        origin_type: 'reported',
        basis: 'Financial report or founder public declaration',
      },
      {
        metric_id: `mt_profit_${entity.id}`,
        entity_id: entity.id,
        metric_type: 'operating_profit',
        value: entity.pnl.operatingProfit,
        unit: 'JPY/month',
        currency: 'JPY',
        origin_type: 'reported',
        basis: 'Calculated operating profit',
      },
      {
        metric_id: `mt_margin_${entity.id}`,
        entity_id: entity.id,
        metric_type: 'margin',
        value: entity.pnl.operatingMargin,
        unit: 'percent',
        currency: null,
        origin_type: 'reported',
        basis: 'Operating margin ratio',
      },
      {
        metric_id: `mt_team_${entity.id}`,
        entity_id: entity.id,
        metric_type: 'headcount',
        value: entity.operations.teamSize,
        unit: 'people',
        currency: null,
        origin_type: 'reported',
        basis: 'Observed or reported team size',
      },
    ];

    // 観測記録
    const observations = [];
    if (entity.tagline) {
      observations.push({
        id: `obs_tagline_${entity.id}`,
        category: 'MARKET_DISTORTION',
        text: entity.tagline,
        origin_type: 'observed',
        verification_status: 'SUPPORTED',
        entity_ids: [entity.id],
      });
    }
    if (entity.strategy) {
      observations.push({
        id: `obs_strategy_${entity.id}`,
        category: 'FOUNDER_TACTIC',
        text: `【大手の自爆・参入障壁】${entity.strategy.moatDescription}。大手の死角: ${entity.strategy.blindspot}`,
        origin_type: 'observed',
        verification_status: 'SUPPORTED',
        entity_ids: [entity.id],
      });
      if (entity.strategy.initialTraction && entity.strategy.initialTraction.length > 0) {
        observations.push({
          id: `obs_traction_${entity.id}`,
          category: 'EARLY_TRACTION',
          text: `【初動突破ゲリラ戦】${entity.strategy.initialTraction.join(' / ')}`,
          origin_type: 'observed',
          verification_status: 'SUPPORTED',
          entity_ids: [entity.id],
        });
      }
    }
    if (entity.observationsStream) {
      for (const obs of entity.observationsStream) {
        observations.push({
          id: `obs_stream_${entity.id}_${Math.random().toString(36).slice(2, 8)}`,
          category: obs.category,
          text: obs.text,
          origin_type: obs.originType || 'observed',
          verification_status: obs.verificationStatus || 'SUPPORTED',
          entity_ids: [entity.id],
        });
      }
    }

    const bundle = {
      schema_version: 'research-bundle.v1',
      run_id: `run_baseline_13_${entity.id}`,
      purpose: 'baseline_verified_entity_lake_ingest',
      subject: { query: entity.name, candidate_name: entity.name },
      entities: [coreEntity],
      metrics,
      observations,
      events: entity.timelineEvents?.map((ev) => ({
        event_type: ev.eventType,
        occurred_at: ev.occurredAt,
        description: ev.description,
      })) || [],
      temporal: entity.temporal,
      tagline: entity.tagline,
      architecturePattern: entity.architecturePattern,
      pipelineStack: entity.pipelineStack,
      targetPainWallet: entity.targetPainWallet,
      tags: entity.tags,
      founder: entity.founder,
      country: entity.country,
      sector: entity.sector,
      scale: entity.scale,
      fullFinancialEntity: entity, // 完全な元データも保持
    };

    const bundleKey = `datasets/ds.business.research-bundles.derived/v1/2026/09/10/run_baseline_13_verified_${entity.id}.json`;
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: bundleKey,
        Body: Buffer.from(JSON.stringify(bundle, null, 2), 'utf8'),
        ContentType: 'application/json; charset=utf-8',
      })
    );
    console.log(`  -> Uploaded research bundle to ${bundleKey}`);
  }

  console.log('=== All 13 Baseline Entities & Bundles successfully ingested to R2 Lake! ===');
}

main().catch((err) => {
  console.error('Failed to ingest baseline to R2:', err);
  process.exit(1);
});
