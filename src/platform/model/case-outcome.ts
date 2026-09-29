import type { FinancialEntity } from '@/shared/terminal';

export type CaseOutcome = 'success' | 'failure' | 'unknown';

type OutcomeInput = Pick<FinancialEntity, 'pnl' | 'tags' | 'opportunityJudgment' | 'growthRateYoY' | 'isGrowthUnconfirmed'>;

const FAILURE_TAG = /失敗|撤退|破綻|倒産|破産|閉鎖|地雷|爆死/;

/** 売上が記録（本人申告・報道・一次資料・推定のいずれか）として確認できるか。未確認や0は含めない。 */
export function hasRecordedRevenue(entity: Pick<FinancialEntity, 'pnl'>): boolean {
  const { pnl } = entity;
  return !pnl.isRevenueUnconfirmed
    && pnl.financialStatus !== 'UNAVAILABLE'
    && Number.isFinite(pnl.monthlyRevenue)
    && pnl.monthlyRevenue > 0;
}

/** 撤退・破綻などの失敗として記録された事例か。 */
export function isFailureCase(entity: OutcomeInput): boolean {
  return entity.pnl.financialStatus === 'POST_MORTEM'
    || entity.opportunityJudgment?.verdict === 'HAZARD_REJECT'
    || (entity.tags ?? []).some((tag) => FAILURE_TAG.test(tag));
}

/** 失敗の記録があれば failure、売上の記録があれば success、どちらでもなければ unknown。 */
export function caseOutcome(entity: OutcomeInput): CaseOutcome {
  if (isFailureCase(entity)) return 'failure';
  if (hasRecordedRevenue(entity)) return 'success';
  return 'unknown';
}

export const CASE_OUTCOME_LABEL: Record<CaseOutcome, string> = {
  success: '売上の記録あり',
  failure: '失敗・撤退の記録',
  unknown: '成否は未確認',
};
