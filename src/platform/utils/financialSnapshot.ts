import { inspectFinancialIntegrity } from '@/shared/financial-integrity';
import type { FinancialEntity } from '../types/terminal';

export type SnapshotEntity = Pick<FinancialEntity, 'id' | 'name' | 'pnl'>;

/** Use the same record as the ledger; never maintain a second set of promotional figures. */
export function financialSnapshot(entity: SnapshotEntity) {
  const { pnl } = entity;
  const integrity = inspectFinancialIntegrity(pnl);
  const needsReview = integrity.profitConflict || integrity.grossConflict || integrity.marginConflict;
  const hasUnconfirmedValues = pnl.isRevenueUnconfirmed || pnl.isOperatingProfitUnconfirmed || pnl.isMarginUnconfirmed;
  const status = needsReview
    ? '数値の照合待ち'
    : pnl.financialStatus === 'UNAVAILABLE'
      ? '非公開'
      : hasUnconfirmedValues
        ? '一部未確認'
        : pnl.financialStatus === 'VERIFIED'
          ? '一次資料'
          : pnl.financialStatus === 'REPORTED'
            ? '報道・取材'
            : pnl.financialStatus === 'ESTIMATED'
              ? '推定'
              : pnl.financialStatus === 'POST_MORTEM'
                ? '事後資料'
                : '未確認';
  return {
    revenue: pnl.financialStatus === 'UNAVAILABLE' || pnl.isRevenueUnconfirmed ? '未確認' : `¥${pnl.monthlyRevenue.toLocaleString('ja-JP')}`,
    margin: pnl.financialStatus === 'UNAVAILABLE' || pnl.isMarginUnconfirmed || pnl.monthlyRevenue <= 0 ? '未確認' : `${pnl.operatingMargin.toFixed(1)}%`,
    status,
  };
}
