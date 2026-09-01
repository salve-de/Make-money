export type EvidenceRank = "A" | "B" | "C" | "D";
export type OpportunityStatus = "ENTER" | "VALIDATE" | "WATCH" | "AVOID";
export type SaveKind = "opportunity" | "product" | "signal" | "demand";

export interface Evidence {
  id: string;
  sourceName: string;
  sourceType: string;
  claim: string;
  url: string;
  checkedAt: string;
  rank: EvidenceRank;
}

export interface ScoreBreakdown {
  evidence: number;
  momentum: number;
  demand: number;
  addressability: number;
  competition: number;
}

export interface Opportunity {
  id: string;
  slug: string;
  title: string;
  kicker: string;
  summary: string;
  amountLabel: string;
  amountKind: string;
  score: number;
  scoreLabel: string;
  status: OpportunityStatus;
  horizon: string;
  categories: string[];
  geography: string;
  teamSize: string;
  minBudget: string;
  buildTime: string;
  evidenceRank: EvidenceRank;
  evidenceCount: number;
  freshnessLabel: string;
  whyNow: string;
  buyer: string;
  unmetNeed: string;
  entryPaths: string[];
  risks: string[];
  nextChecks: string[];
  relatedProductSlugs: string[];
  reactions: {
    interesting: number;
    profitable: number;
    buildable: number;
    want: number;
  };
  scoreBreakdown: ScoreBreakdown;
  demo: boolean;
  featured?: boolean;
}

export interface MoneySignal {
  id: string;
  slug: string;
  title: string;
  summary: string;
  amountLabel: string;
  amountKind: string;
  direction: "in" | "out" | "up" | "down";
  observedAt: string;
  sourceLabel: string;
  evidenceRank: EvidenceRank;
  categories: string[];
  relatedOpportunitySlug?: string;
  demo: boolean;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  monogram: string;
  url: string;
  tagline: string;
  description: string;
  targetCustomer: string;
  problem: string;
  pricing: string;
  stage: string;
  verification: string;
  evidenceRank: EvidenceRank;
  intents: string[];
  categories: string[];
  geography: string;
  relatedOpportunitySlugs: string[];
  stats: {
    saves: number;
    wants: number;
    outboundClicks: number;
  };
  demo: boolean;
  sponsored?: boolean;
}

export interface DemandGap {
  id: string;
  slug: string;
  title: string;
  problem: string;
  audience: string;
  currentWorkaround: string;
  willingnessToPay: string;
  wantCount: number;
  payCount: number;
  existingProducts: number;
  opportunitySlug: string;
  categories: string[];
  evidenceRank: EvidenceRank;
  demo: boolean;
}

export interface SavedItem {
  kind: SaveKind;
  id: string;
  savedAt: string;
}

export interface SubmissionPayload {
  url: string;
  name: string;
  tagline: string;
  targetCustomer: string;
  problem: string;
  pricing: string;
  intent: string;
  evidenceUrl?: string;
  contactEmail: string;
}
