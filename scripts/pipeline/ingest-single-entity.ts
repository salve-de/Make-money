import { buildCompleteEntity, RawEntityInput } from './build-complete-entity';
import { ingestVerifiedEntities } from './real-ingest-pipeline';

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log('Usage: pnpm tsx scripts/pipeline/ingest-single-entity.ts --name <Name> --sector <Sector> --rev <AnnualRevenue> --opm <OperatingMarginPct> ...');
    process.exit(0);
  }

  const parsed: Record<string, string> = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace(/^--/, '');
    const val = args[i + 1];
    parsed[key] = val;
  }

  const rawInput: RawEntityInput = {
    name: parsed.name || 'Sample Venture',
    tagline: parsed.tagline || '単一機能に特化して高収益を実現するモデル',
    sector: (parsed.sector as RawEntityInput['sector']) || 'NICHE_SAAS',
    scale: (parsed.scale as RawEntityInput['scale']) || 'SOLO',
    annualRevenueRaw: Number(parsed.rev || 50000000),
    grossMarginPct: Number(parsed.gross || 85),
    operatingMarginPct: Number(parsed.opm || 30),
    currency: (parsed.cur as RawEntityInput['currency']) || 'USD',
    founder: parsed.founder || '非公開創業者',
    url: parsed.url || 'https://example.com',
    snapshotYear: Number(parsed.year || new Date().getFullYear()),
    revenueSourceNote: parsed.source || '公式公表データ'
  };

  console.log(`Building complete entity for: ${rawInput.name}...`);
  const entity = buildCompleteEntity(rawInput);
  await ingestVerifiedEntities([entity], 'cli-single-ingest');
}

main().catch(err => {
  console.error('Ingest error:', err);
  process.exit(1);
});
