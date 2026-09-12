import { describe, it, expect } from "vitest";
import { evaluateEntityCuration } from "./curation";
import type { FinancialEntity } from "@/shared/terminal";

describe("evaluateEntityCuration", () => {
  it("rejects blacklisted Failory pitch deck articles", () => {
    const candidate: Partial<FinancialEntity> = {
      id: "ent_failory_123",
      name: "Accounting Pitch Decks",
      url: "https://www.failory.com/pitch-deck/accounting",
      tagline: "Accounting pitch decks collection",
      sector: "NICHE_SAAS",
    };

    const result = evaluateEntityCuration(candidate);
    expect(result.status).toBe("REJECTED");
    expect(result.reasons[0]).toContain("Blacklisted");
  });

  it("rejects repository candidates", () => {
    const candidate: Partial<FinancialEntity> = {
      id: "ent_repository_foo_bar",
      name: "foo/bar",
      url: "https://github.com/foo/bar",
      tagline: "A test github repository",
      sector: "NICHE_SAAS",
    };

    const result = evaluateEntityCuration(candidate);
    expect(result.status).toBe("REJECTED");
    expect(result.reasons[0]).toMatch(/Blacklisted|Repository candidate/);
  });

  it("puts incomplete entities with missing financial provenance into REVIEW", () => {
    const candidate: Partial<FinancialEntity> = {
      id: "ent_incomplete_startup",
      name: "Mystery Corp",
      url: "https://mystery-automation-corp.io",
      tagline: "We do mystery AI automation things",
      sector: "AI_AUTOMATION",
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
          other: 0,
        },
        operatingProfit: 0,
        operatingMargin: 0,
        estimatedAnnualNetProfit: 0,
        financialStatus: "UNAVAILABLE",
      },
    };

    const result = evaluateEntityCuration(candidate);
    expect(result.status).toBe("REVIEW");
    expect(result.reasons).toContain("Financial data lacks provenance or estimation formula");
  });

  it("accepts verified or properly estimated companies", () => {
    const candidate: Partial<FinancialEntity> = {
      id: "ent_keyence_test",
      name: "Keyence Corporation",
      url: "https://www.keyence.co.jp",
      tagline: "超高収益センサ・直販即日出荷モデル",
      sector: "MONOPOLY_MFG",
      pnl: {
        monthlyRevenue: 80000000000,
        cogs: 14400000000,
        grossProfit: 65600000000,
        grossMargin: 82,
        operatingExpenses: {
          serverAndApi: 1000000000,
          advertising: 3000000000,
          subcontracting: 2000000000,
          toolsAndSaaS: 1000000000,
          other: 15000000000,
        },
        operatingProfit: 43600000000,
        operatingMargin: 54.5,
        estimatedAnnualNetProfit: 30000000000,
        financialStatus: "VERIFIED",
        sourceDoc: "EDINET 有価証券報告書 2025年3月期",
      },
    };

    const result = evaluateEntityCuration(candidate);
    expect(result.status).toBe("ACCEPTED");
    expect(result.reasons).toEqual(["All curation gates passed"]);
  });
});
