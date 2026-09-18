export const EXECUTION_STEP_IDS = ['FIND', 'BUILD', 'LIST', 'DISTRIBUTE', 'SELL', 'EARN'] as const;
export const MAX_EXECUTION_NOTES_LENGTH = 20_000;
const EXECUTION_STORAGE_ROOT = 'makemoney.execution.';
const EXECUTION_CLAIM_ROOT = 'makemoney.execution.claim.';

export type ExecutionStepId = (typeof EXECUTION_STEP_IDS)[number];

export interface ExecutionProject {
  entityId: string;
  sourceName: string;
  offerName: string;
  targetCustomer: string;
  targetPriceJpy: number;
  firstDollarTargetJpy: number;
  completedSteps: ExecutionStepId[];
  buildUrl: string;
  launchUrl: string;
  checkoutUrl: string;
  revenueJpy: number;
  notes: string;
  updatedAt?: string;
}

export interface ExecutionProjectInput extends Omit<ExecutionProject, 'updatedAt'> {
  updatedAt?: string;
}

export function isExecutionStepId(value: unknown): value is ExecutionStepId {
  return typeof value === 'string' && EXECUTION_STEP_IDS.includes(value as ExecutionStepId);
}

export function executionProgress(project: Pick<ExecutionProject, 'completedSteps'>): number {
  const unique = new Set(project.completedSteps.filter(isExecutionStepId));
  return Math.round((unique.size / EXECUTION_STEP_IDS.length) * 100);
}

export function firstIncompleteStep(project: Pick<ExecutionProject, 'completedSteps'>): ExecutionStepId | null {
  const completed = new Set(project.completedSteps.filter(isExecutionStepId));
  return EXECUTION_STEP_IDS.find((step) => !completed.has(step)) ?? null;
}

export function normalizeExecutionProject(value: unknown): ExecutionProject | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (typeof row.entityId !== 'string' || !row.entityId.trim() || row.entityId.length > 200) return null;
  if (typeof row.sourceName !== 'string' || !row.sourceName.trim() || row.sourceName.length > 300) return null;
  if (typeof row.offerName !== 'string' || row.offerName.length > 300) return null;
  if (typeof row.targetCustomer !== 'string' || row.targetCustomer.length > 2000) return null;
  if (!isMoney(row.targetPriceJpy) || !isMoney(row.firstDollarTargetJpy) || !isMoney(row.revenueJpy)) return null;
  if (!Array.isArray(row.completedSteps) || row.completedSteps.some((step) => !isExecutionStepId(step))) return null;
  if (!isUrlField(row.buildUrl) || !isUrlField(row.launchUrl) || !isUrlField(row.checkoutUrl)) return null;
  if (typeof row.notes !== 'string' || row.notes.length > MAX_EXECUTION_NOTES_LENGTH) return null;
  if (row.updatedAt !== undefined && typeof row.updatedAt !== 'string') return null;

  return {
    entityId: row.entityId.trim(),
    sourceName: row.sourceName.trim(),
    offerName: row.offerName,
    targetCustomer: row.targetCustomer,
    targetPriceJpy: row.targetPriceJpy,
    firstDollarTargetJpy: row.firstDollarTargetJpy,
    completedSteps: Array.from(new Set(row.completedSteps)),
    buildUrl: row.buildUrl,
    launchUrl: row.launchUrl,
    checkoutUrl: row.checkoutUrl,
    revenueJpy: row.revenueJpy,
    notes: row.notes,
    updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : undefined,
  };
}

function isMoney(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= 1_000_000_000_000;
}

function isUrlField(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 2048) return false;
  if (!value.trim()) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

export function executionStoragePrefix(userId: string | null | undefined): string {
  const scope = userId ? 'user.' + encodeURIComponent(userId) : 'anonymous';
  return EXECUTION_STORAGE_ROOT + scope + '.';
}

export function executionStorageKey(entityId: string, userId: string | null | undefined): string {
  return executionStoragePrefix(userId) + encodeURIComponent(entityId);
}

export function executionPendingClaimKey(entityId: string): string {
  return EXECUTION_CLAIM_ROOT + encodeURIComponent(entityId);
}
