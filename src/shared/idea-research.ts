import type { SectorCategory, SynthesizedIdea } from './terminal';

/**
 * 「自分のアイデアを調べる」で API と画面が共有する型と入力規則。
 * サーバー専用の処理（カタログ検索・AI 呼び出し）は src/lib/idea-research に置く。
 */

/** アイデア文の長さ（前後の空白を除いた文字数）。 */
export const IDEA_MIN_LENGTH = 10;
export const IDEA_MAX_LENGTH = 1000;

/** success = 売上が確認できた / failure = 撤退・破綻の記録がある / unknown = どちらも確認できていない */
export type IdeaResearchOutcome = 'success' | 'failure' | 'unknown';

export type IdeaResearchUnavailableReason = 'LOGIN_REQUIRED' | 'NOT_CONFIGURED' | 'FAILED';

export interface IdeaResearchCase {
  id: string;
  name: string;
  tagline: string;
  sector: SectorCategory;
  outcome: IdeaResearchOutcome;
  /** 売上が確認できている事例だけ、台帳の表示ラベルをそのまま入れる。未確認は null。 */
  monthlyRevenueLabel: string | null;
  score: number;
}

export interface IdeaResearchResponse {
  cases: IdeaResearchCase[];
  ai: SynthesizedIdea | null;
  aiUnavailableReason?: IdeaResearchUnavailableReason;
}

export type IdeaInputCheck =
  | { ok: true; idea: string }
  | { ok: false; reason: 'TOO_SHORT' | 'TOO_LONG' };

/** 前後の空白を除いて、10〜1000文字（サロゲートペアは1文字）かを調べる。 */
export function checkIdeaInput(raw: string): IdeaInputCheck {
  const idea = raw.trim();
  const length = Array.from(idea).length;
  if (length < IDEA_MIN_LENGTH) return { ok: false, reason: 'TOO_SHORT' };
  if (length > IDEA_MAX_LENGTH) return { ok: false, reason: 'TOO_LONG' };
  return { ok: true, idea };
}

// ---- 画面側で使う応答の読み取り（サーバーが検証済みでも、型を仮定して読まない） ----

const SECTORS: Record<SectorCategory, true> = {
  AI_AUTOMATION: true,
  NICHE_SAAS: true,
  MONOPOLY_MFG: true,
  CONTENT_MEDIA: true,
  PHYSICAL_ASSET: true,
  FINTECH_INFRA: true,
  LOCAL_SERVICES: true,
  UNKNOWN: true,
};
const OUTCOMES: Record<IdeaResearchOutcome, true> = { success: true, failure: true, unknown: true };
const REASONS: Record<IdeaResearchUnavailableReason, true> = { LOGIN_REQUIRED: true, NOT_CONFIGURED: true, FAILED: true };
const DIMENSIONS: Record<SynthesizedIdea['dimension'], true> = {
  SAVANNA_INSTINCT: true,
  META_ARCHITECT: true,
  CONTRARIAN_BLINDSPOT: true,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isKey<T extends string>(table: Record<T, true>, value: unknown): value is T {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(table, value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function readCase(value: unknown): IdeaResearchCase {
  if (
    !isRecord(value)
    || typeof value.id !== 'string' || !value.id
    || typeof value.name !== 'string'
    || typeof value.tagline !== 'string'
    || !isKey(SECTORS, value.sector)
    || !isKey(OUTCOMES, value.outcome)
    || !(value.monthlyRevenueLabel === null || typeof value.monthlyRevenueLabel === 'string')
    || typeof value.score !== 'number' || !Number.isFinite(value.score)
  ) throw new Error('Invalid idea research case');
  return {
    id: value.id,
    name: value.name,
    tagline: value.tagline,
    sector: value.sector,
    outcome: value.outcome,
    monthlyRevenueLabel: value.monthlyRevenueLabel,
    score: value.score,
  };
}

function readIdea(value: unknown): SynthesizedIdea {
  if (
    !isRecord(value)
    || typeof value.id !== 'string' || !value.id
    || !isKey(DIMENSIONS, value.dimension)
    || typeof value.dimensionLabel !== 'string'
    || typeof value.title !== 'string'
    || typeof value.targetPainWallet !== 'string'
    || typeof value.structuralArbitrage !== 'string'
    || typeof value.projectedMonthlyProfitJpy !== 'number' || !Number.isFinite(value.projectedMonthlyProfitJpy)
    || typeof value.operatingMargin !== 'number' || !Number.isFinite(value.operatingMargin)
    || !Array.isArray(value.requiredTools)
    || !isStringArray(value.first100TractionPlaybook)
    || !isStringArray(value.sourceEntityIds)
    || typeof value.userNoteInspiration !== 'string'
  ) throw new Error('Invalid idea research summary');
  const requiredTools = value.requiredTools.map((tool: unknown) => {
    if (!isRecord(tool) || typeof tool.name !== 'string' || typeof tool.purpose !== 'string'
      || typeof tool.monthlyCostJpy !== 'number' || !Number.isFinite(tool.monthlyCostJpy)) {
      throw new Error('Invalid idea research tool');
    }
    return { name: tool.name, monthlyCostJpy: tool.monthlyCostJpy, purpose: tool.purpose };
  });
  return {
    id: value.id,
    dimension: value.dimension,
    dimensionLabel: value.dimensionLabel,
    title: value.title,
    targetPainWallet: value.targetPainWallet,
    structuralArbitrage: value.structuralArbitrage,
    projectedMonthlyProfitJpy: value.projectedMonthlyProfitJpy,
    operatingMargin: value.operatingMargin,
    requiredTools,
    first100TractionPlaybook: value.first100TractionPlaybook,
    sourceEntityIds: value.sourceEntityIds,
    userNoteInspiration: value.userNoteInspiration,
  };
}

/** /api/idea-research の応答を読み取る。形が違えば例外にし、画面は「応答を確認できません」を出す。 */
export function parseIdeaResearchResponse(value: unknown): IdeaResearchResponse {
  if (!isRecord(value) || !Array.isArray(value.cases)) throw new Error('Invalid idea research response');
  const cases = value.cases.map(readCase);
  const ai = value.ai === null || value.ai === undefined ? null : readIdea(value.ai);
  const reason = value.aiUnavailableReason;
  if (ai) return { cases, ai };
  return { cases, ai: null, aiUnavailableReason: isKey(REASONS, reason) ? reason : 'FAILED' };
}
