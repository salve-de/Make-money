
import { describe, expect, it } from "vitest";
import type { FinancialEntity } from "@/shared/terminal";
import { deriveDiscoveryDataset } from "./discovery-model";

function makeEntity(
  id: string,
  options: {
    insight?: string;
    architecture?: string;
    profit?: number;
    revenue?: number;
    capital?: number;
    team?: number;
    hours?: number;
    viability?: "ACTIVE_PLAYBOOK" | "HISTORICAL_WINDOW";
  } = {},
): FinancialEntity {
  return {
    id,
    ticker: id.toUpperCase(),
    name: "Case " + id,
    tagline: "検証用事例",
    sector: "NICHE_SAAS",
    scale: "SOLO",
    founder: "Founder",
    country: "JP",
    url: "https://example.com/" + id,
    verifiedBadge: true,
    growthRateYoY: 0,
    architecturePattern: options.architecture || "サブスク型SaaS",
    pipelineStack: "Next.js",
    targetPainWallet: "毎月発生する面倒な作業",
    tags: [],
    pnl: {
      monthlyRevenue: options.revenue ?? 2_000_000,
      cogs: 200_000,
      grossProfit: 1_800_000,
      grossMargin: 90,
      operatingExpenses: {
        serverAndApi: 50_000,
        advertising: 0,
        subcontracting: 0,
        toolsAndSaaS: 20_000,
        other: 30_000,
      },
      operatingProfit: options.profit ?? 1_700_000,
      operatingMargin: 85,
      estimatedAnnualNetProfit: 20_400_000,
      isRevenueUnconfirmed: false,
      isOperatingProfitUnconfirmed: false,
      isMarginUnconfirmed: false,
    },
    operations: {
      teamSize: options.team ?? 1,
      initialTeamSize: options.team ?? 1,
      currentTeamSize: options.team ?? 1,
      weeklyHours: options.hours ?? 8,
      initialCapitalRequired: options.capital ?? 30_000,
      automationLevel: 80,
      isTeamSizeUnconfirmed: false,
      isWeeklyHoursUnconfirmed: false,
      isCapitalUnconfirmed: false,
      isAutomationUnconfirmed: false,
      primaryChannels: ["direct"],
      toolStack: [],
    },
    strategy: {
      blindspot: "既存手作業が高コスト",
      moatType: "PROCESS_POWER",
      moatDescription: "処理を自動化し、注文増加に人件費が比例しない",
      secretInsight: options.insight || "高額な人力作業を自動化して原価差を利益に変えた",
      initialTraction: ["最初の顧客へ直接提案"],
      actionPlaybook: ["需要確認"],
    },
    essence: {
      whatItDoes: "業務自動化",
      targetCustomer: "毎月同じ作業に支払う企業",
      painRelief: "人手で繰り返す作業を減らす",
    },
    temporal: {
      foundedYear: 2025,
      initialTractionPeriod: "2025",
      dataSnapshotPeriod: "2026",
      viabilityStatus: options.viability || "ACTIVE_PLAYBOOK",
      eraContext: "AI APIの低価格化",
      currentViabilityAnalysis: "2026年時点でも同型の提供が確認される",
      viabilityLabel: options.viability === "HISTORICAL_WINDOW" ? "当時限定" : "現在も有効",
    },
  };
}

describe("discovery model", () => {
  it("keeps source count while deriving a compact discovery surface", () => {
    const dataset = deriveDiscoveryDataset(
      [makeEntity("a"), makeEntity("b"), makeEntity("c")],
      2,
    );

    expect(dataset.sourceCount).toBe(3);
    expect(dataset.visibleCount).toBe(2);
    expect(dataset.cases).toHaveLength(2);
  });

  it("separates critical insight from descriptive operating facts", () => {
    const dataset = deriveDiscoveryDataset([
      makeEntity("a", {
        insight: "客が既に払っていた高額作業を自動化し、原価差を取った",
        team: 1,
        capital: 10_000,
        hours: 5,
      }),
    ]);

    const item = dataset.cases[0];
    expect(item.criticalInsight).toContain("原価差");
    expect(item.descriptors).toEqual(
      expect.arrayContaining([
        { label: "体制", value: "1人" },
        { label: "週稼働", value: "5時間" },
      ]),
    );
  });

  it("counts similar mechanisms without pretending to know a success probability", () => {
    const dataset = deriveDiscoveryDataset([
      makeEntity("a", { architecture: "月額サブスク SaaS" }),
      makeEntity("b", { architecture: "継続課金 subscription" }),
      makeEntity("c", { architecture: "直販 D2C" }),
    ]);

    const recurring = dataset.cases.find((item) => item.id === "a");
    expect(recurring?.mechanism.label).toBe("継続課金で積み上げる");
    expect(recurring?.mechanismCount).toBe(2);
  });

  it("marks current and low-friction conditions from confirmed fields only", () => {
    const current = deriveDiscoveryDataset([
      makeEntity("a", {
        capital: 50_000,
        team: 1,
        hours: 6,
        viability: "ACTIVE_PLAYBOOK",
      }),
    ]).cases[0];

    expect(current.lowCapital).toBe(true);
    expect(current.isSolo).toBe(true);
    expect(current.lowWork).toBe(true);
    expect(current.isCurrent).toBe(true);
  });
});
