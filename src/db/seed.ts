import { db, businesses, businessIdeas } from "./index";
import { BUSINESS_DATA } from "../data/businesses";
import { BUSINESS_IDEAS } from "../data/ideasData";

async function seed() {
  if (!db) {
    console.error("DATABASE_URL is not set. Please provide a valid Neon connection string.");
    process.exit(1);
  }

  console.log("Seeding data into Neon PostgreSQL...");

  // 1. 実在企業・高収益ビジネス台帳の投入
  for (const b of BUSINESS_DATA) {
    try {
      await db
        .insert(businesses)
        .values({
          id: b.id,
          name: b.title,
          founder: b.founderName,
          category: b.businessModel,
          scale: b.teamSize === 1 ? "solo" : b.teamSize <= 5 ? "micro" : "mid",
          teamSize: b.teamSize === 1 ? "完全1人" : `${b.teamSize}人体制`,
          monthlyRevenue: b.monthlyRevenueJpy,
          monthlyProfit: b.monthlyProfitJpy,
          profitMargin: Math.round(b.profitMarginPercent),
          annualRevenue: `¥${Math.round((b.monthlyRevenueJpy * 12) / 100000000)}億円`,
          moatType: b.primaryAcquisitionChannel,
          summary: b.summary,
          financials: {
            grossMargin: b.profitMarginPercent,
            operatingMargin: b.profitMarginPercent,
            cogs: b.financialBreakdown?.serverAndApiCost,
            infrastructureCost: b.financialBreakdown?.serverAndApiCost,
            marketingCost: b.financialBreakdown?.advertisingCost,
          },
          tools: b.tools?.map((t) => ({
            name: t.name,
            category: t.category,
            monthlyCost: t.monthlyCostJpy,
          })),
          initialTraction: {
            first100UsersMethod: b.first100UsersStrategy,
            keyChannel: b.primaryAcquisitionChannel,
            pitfalls: "初期の模倣品ラッシュと推論コストの急増",
          },
          verified: true,
        })
        .onConflictDoNothing();
      console.log(`- Seeded business: ${b.title}`);
    } catch (e) {
      console.warn(`Failed to seed business ${b.id}:`, e);
    }
  }

  // 2. 実践ビジネス機会台帳の投入
  for (const idea of BUSINESS_IDEAS) {
    try {
      await db
        .insert(businessIdeas)
        .values({
          slug: idea.id,
          title: idea.title,
          targetIndustry: idea.targetMarket,
          potentialMonthlyProfit: idea.estimatedMonthlyProfit,
          initialCapital: idea.initialCapital,
          difficulty: idea.difficulty,
          timeToFirstCashDays: 14,
          structuralArbitrage: idea.glitchOrTrap,
          actionSteps: [idea.actionableSteps],
          recommendedTools: idea.requiredTools,
          isProOnly: false,
        })
        .onConflictDoNothing();
      console.log(`- Seeded idea: ${idea.title}`);
    } catch (e) {
      console.warn(`Failed to seed idea ${idea.title}:`, e);
    }
  }

  console.log("Seeding finished successfully.");
}

seed().catch(console.error);
