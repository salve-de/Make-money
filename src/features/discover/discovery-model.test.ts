
import { describe, expect, it } from "vitest";
import type { FinancialEntity } from "@/shared/terminal";
import { baremetrics, block } from "@/shared/__fixtures__/reader-samples";
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
    initialTeam?: number;
    hours?: number;
    scale?: FinancialEntity['scale'];
    financialStatus?: FinancialEntity['pnl']['financialStatus'];
    snapshotPeriod?: string;
    viability?: "ACTIVE_PLAYBOOK" | "HISTORICAL_WINDOW";
  } = {},
): FinancialEntity {
  return {
    id,
    ticker: id.toUpperCase(),
    name: "Case " + id,
    tagline: "検証用事例",
    sector: "NICHE_SAAS",
    scale: options.scale || "SOLO",
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
      financialStatus: options.financialStatus,
      dataSnapshotPeriod: options.snapshotPeriod,
      isRevenueUnconfirmed: false,
      isOperatingProfitUnconfirmed: false,
      isMarginUnconfirmed: false,
    },
    operations: {
      teamSize: options.team ?? 1,
      initialTeamSize: options.initialTeam ?? options.team ?? 1,
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
    expect(dataset.visibleCount).toBeGreaterThan(0);
    expect(dataset.visibleCount).toBeLessThanOrEqual(3);
    expect(dataset.cases).toHaveLength(dataset.visibleCount);
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

  it("does not invent a revenue mechanism or a sector without a sourced basis", () => {
    const dataset = deriveDiscoveryDataset([makeEntity("a", { architecture: "月額サブスク SaaS" })]);
    const item = dataset.cases[0] as unknown as Record<string, unknown>;
    expect(item.mechanism).toBeUndefined();
    expect(item.related).toBeUndefined();
    expect(item.sector).toBe("");
    const withBasis = deriveDiscoveryDataset([
      { ...makeEntity("b", {}), sectorBasis: { source: "SEC_SIC", note: "SIC 7372" } },
    ]);
    expect(withBasis.cases[0].sector).toBe("ソフトウェア");
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

  it("does not classify an enterprise placeholder as a one-person, low-capital start", () => {
    const item = deriveDiscoveryDataset([
      makeEntity("enterprise", {
        scale: "ENTERPRISE",
        team: 16_000,
        initialTeam: 1,
        capital: 10_000,
        hours: 8,
      }),
    ]).cases[0];

    expect(item.startLine).not.toContain("1人開始");
    expect(item.isSolo).toBe(false);
    expect(item.lowCapital).toBe(false);
    expect(item.lowWork).toBe(false);
  });

  it("picks the list result from reader.metrics and names it by measure", () => {
    const exit = { ...makeEntity("exit"), reader: baremetrics };
    const item = deriveDiscoveryDataset([exit]).cases[0];
    expect(item.resultLabel).toBe("売却額");
    expect(item.resultValue).toBe("$4M");
    expect(item.resultMetricId).toBe("m1");
    expect(item.summaryText).toBe("サブスク課金の指標を見せる分析ツール。");
    expect(item.resultEvidenceLabel).not.toBe("推定");
  });

  it("prefers a filed annual revenue and never labels a filed value as estimated", () => {
    const item = deriveDiscoveryDataset([{ ...makeEntity("blk"), reader: block }]).cases[0];
    expect(item.resultLabel).toBe("売上");
    expect(item.resultValue).toBe("$24B");
    expect(item.resultEvidenceLabel).toBe("提出書類");
    expect(item.resultPeriod).toBe("FY2025");
  });

  it("shows unconfirmed without a reader instead of reading the pnl text", () => {
    const item = deriveDiscoveryDataset([makeEntity("bare", { financialStatus: "POST_MORTEM" })]).cases[0];
    expect(item.resultValue).toBe("未確認");
    expect(item.summaryFactId).toBeNull();
    expect(item.resultEvidenceLabel).toBe("");
  });

  it("leaves the start line and the sector empty when nothing is sourced", () => {
    const item = deriveDiscoveryDataset([makeEntity("none", {})]).cases[0];
    expect(item.startLine).not.toContain("未確認");
    const guessed = { ...makeEntity("g", {}), sectorBasis: { source: "SOURCED_DESCRIPTION" as const, note: "主要説明文の語: 講座" } };
    expect(deriveDiscoveryDataset([guessed]).cases[0].sector).toBe("");
    const estate = { ...makeEntity("e", {}), sector: "PHYSICAL_ASSET" as const, sectorBasis: { source: "SEC_SIC" as const, note: "SIC 6512" } };
    expect(deriveDiscoveryDataset([estate]).cases[0].sector).toBe("物販・不動産");
  });
});
